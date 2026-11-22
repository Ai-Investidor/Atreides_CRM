-- =====================================================================
-- 0001 · Acesso e permissões (Documentação/02 e 11)
--
-- Dicionário (documentos em PT → banco em EN):
--   usuarios  → profiles      workspaces → workspaces
--   convites  → invitations   auditoria  → audit_log
--   papel: admin | consultor  → user_role: admin | consultant
--
-- Regras:
--   • Só entra quem foi convidado (invitations). Conta Google sem convite
--     é recusada no momento do cadastro.
--   • Cada usuário ganha o próprio workspace ao entrar pela primeira vez.
--   • Um único admin (o Gabriel).
--   • Permissões no banco (RLS); usuário desativado não lê nada.
-- =====================================================================

create schema if not exists private;
grant usage on schema private to authenticated;

create type public.user_role as enum ('admin', 'consultant');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table public.invitations (
  email        text primary key check (email = lower(email)),
  full_name    text,
  role         public.user_role not null default 'consultant',
  invited_by   uuid references auth.users (id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
comment on table public.invitations is 'Convites: só e-mails convidados conseguem criar conta.';

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '',
  role        public.user_role not null default 'consultant',
  locale      text not null default 'pt-BR' check (locale in ('pt-BR', 'en')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Usuários do Atreides (equipe da consultoria).';

-- Um único admin no sistema.
create unique index profiles_single_admin on public.profiles (role) where role = 'admin';

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references public.profiles (id) on delete restrict,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.workspaces is 'Espaço de trabalho de cada consultor (clientes, leads, tarefas).';

create table public.audit_log (
  id            bigint generated always as identity primary key,
  user_id       uuid references public.profiles (id) on delete set null,
  workspace_id  uuid references public.workspaces (id) on delete set null,
  action        text not null,
  table_name    text,
  record_id     text,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now()
);
comment on table public.audit_log is 'Auditoria de ações sensíveis. Só o admin lê.';

create index audit_log_user_id_idx on public.audit_log (user_id);
create index audit_log_workspace_id_idx on public.audit_log (workspace_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index invitations_invited_by_idx on public.invitations (invited_by);

-- ---------------------------------------------------------------------
-- Funções auxiliares (schema private: não expostas pela API)
-- ---------------------------------------------------------------------

create function private.is_active_member()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active
  );
$$;

create function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active and role = 'admin'
  );
$$;

grant execute on function private.is_active_member() to authenticated;
grant execute on function private.is_admin() to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Novo usuário: só com convite; cria perfil e workspace
-- ---------------------------------------------------------------------

create function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  inv     public.invitations;
  v_name  text;
begin
  select * into inv from public.invitations where email = lower(new.email);

  if not found then
    raise exception 'Conta não convidada para o Atreides: %', new.email
      using errcode = '42501';
  end if;

  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(inv.full_name, ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, role)
  values (new.id, lower(new.email), v_name, inv.role);

  insert into public.workspaces (owner_id, name)
  values (new.id, v_name);

  update public.invitations set accepted_at = now() where email = inv.email;

  insert into public.audit_log (user_id, action, table_name, record_id)
  values (new.id, 'user_joined', 'profiles', new.id::text);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------
-- Proteção do perfil: só o admin muda papel, status ou e-mail
-- ---------------------------------------------------------------------

create function private.guard_profile_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role
      or new.active is distinct from old.active
      or new.email is distinct from old.email)
     and not private.is_admin() then
    raise exception 'Somente o admin pode alterar papel, status ou e-mail.'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role or new.active is distinct from old.active then
    insert into public.audit_log (user_id, action, table_name, record_id, before, after)
    values (
      (select auth.uid()),
      'profile_access_changed',
      'profiles',
      new.id::text,
      jsonb_build_object('role', old.role, 'active', old.active),
      jsonb_build_object('role', new.role, 'active', new.active)
    );
  end if;

  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function private.guard_profile_update();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.invitations enable row level security;
alter table public.profiles    enable row level security;
alter table public.workspaces  enable row level security;
alter table public.audit_log   enable row level security;

-- profiles: a equipe ativa se enxerga; cada um edita o próprio perfil; admin edita todos.
create policy "profiles: membros ativos leem"
  on public.profiles for select to authenticated
  using ((select private.is_active_member()));

create policy "profiles: editar o próprio ou admin"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- workspaces: membros ativos navegam por todos (Documentação/02); só o admin renomeia.
create policy "workspaces: membros ativos leem"
  on public.workspaces for select to authenticated
  using ((select private.is_active_member()));

create policy "workspaces: admin edita"
  on public.workspaces for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- invitations: só o admin.
create policy "invitations: admin gerencia"
  on public.invitations for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- audit_log: só o admin lê; gravação apenas por funções do banco.
create policy "audit_log: admin lê"
  on public.audit_log for select to authenticated
  using ((select private.is_admin()));
