-- =====================================================================
-- 0004 · Agenda e reuniões, etapa 1 (Documentação/07)
--
-- Dicionário (documentos em PT → banco em EN):
--   reunioes        → meetings
--   conexoes_google → private.google_connections (fora da API)
--
-- Regras:
--   • Reunião pertence a um workspace; pode ser ligada a um lead do mesmo
--     workspace ou a nada (reunião interna/outra).
--   • O evento fica sempre na agenda do dono do workspace
--     (calendar_owner_id é definido pelo banco).
--   • Quem criou é gravado pelo banco.
--   • Agendar reunião ligada a lead entra no histórico do lead.
--   • Edição em workspace alheio vai para a auditoria.
--   • Token do Google: guardado CRIPTOGRAFADO pelo servidor do Atreides
--     (a chave nunca chega ao banco nem ao navegador), em schema privado.
-- =====================================================================

create type public.meeting_type as enum (
  'diagnosis', 'onboarding', 'plan_presentation', 'periodic_review', 'follow_up', 'other'
);
create type public.meeting_format as enum ('meet', 'in_person');
create type public.meeting_status as enum ('scheduled', 'done', 'canceled');

alter type public.lead_contact_type add value if not exists 'meeting_scheduled';

-- ---------------------------------------------------------------------
-- Reuniões
-- ---------------------------------------------------------------------

create table public.meetings (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete restrict,
  lead_id            uuid references public.leads (id) on delete set null,
  title              text not null check (char_length(title) between 2 and 200),
  type               public.meeting_type not null default 'other',
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  format             public.meeting_format not null default 'meet',
  location           text check (char_length(location) <= 300),
  meet_url           text,
  attendees          text[] not null default '{}' check (cardinality(attendees) <= 50),
  description        text check (char_length(description) <= 5000),
  google_event_id    text unique,
  calendar_owner_id  uuid not null references public.profiles (id) on delete restrict,
  status             public.meeting_status not null default 'scheduled',
  created_by         uuid not null references public.profiles (id) on delete restrict,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint meetings_period check (ends_at > starts_at and ends_at - starts_at <= interval '12 hours')
);
comment on table public.meetings is 'Reuniões do Atreides, espelhadas no Google Calendar do dono do workspace.';

create index meetings_workspace_starts_idx on public.meetings (workspace_id, starts_at);
create index meetings_lead_id_idx on public.meetings (lead_id);
create index meetings_calendar_owner_idx on public.meetings (calendar_owner_id);
create index meetings_created_by_idx on public.meetings (created_by);

create function private.meetings_before_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    select owner_id into new.calendar_owner_id from public.workspaces where id = new.workspace_id;
  else
    new.workspace_id := old.workspace_id;
    new.created_by := old.created_by;
    new.calendar_owner_id := old.calendar_owner_id;
    new.updated_at := now();
  end if;

  if new.lead_id is not null and not exists (
    select 1 from public.leads where id = new.lead_id and workspace_id = new.workspace_id
  ) then
    raise exception 'O lead precisa ser do mesmo workspace da reunião.'
      using errcode = '23514', hint = 'lead_workspace';
  end if;

  new.attendees := coalesce(
    (select array_agg(distinct lower(trim(e))) from unnest(new.attendees) e where trim(e) <> ''),
    '{}'
  );
  return new;
end;
$$;

create trigger meetings_before_write
  before insert or update on public.meetings
  for each row execute function private.meetings_before_write();

create function private.meetings_after_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.lead_id is not null then
    insert into public.lead_contacts (lead_id, workspace_id, type, summary, created_by)
    values (
      new.lead_id, new.workspace_id, 'meeting_scheduled',
      new.title || ' · ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
      new.created_by
    );
  end if;
  return new;
end;
$$;

create trigger meetings_after_insert
  after insert on public.meetings
  for each row execute function private.meetings_after_insert();

create trigger meetings_audit_other_workspace
  after insert or update on public.meetings
  for each row execute function private.audit_other_workspace();

alter table public.meetings enable row level security;

create policy "meetings: membros ativos leem"
  on public.meetings for select to authenticated
  using ((select private.is_active_member()));

create policy "meetings: membros ativos criam"
  on public.meetings for insert to authenticated
  with check ((select private.is_active_member()));

create policy "meetings: membros ativos editam"
  on public.meetings for update to authenticated
  using ((select private.is_active_member()))
  with check ((select private.is_active_member()));

create policy "meetings: admin exclui"
  on public.meetings for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- Conexão com o Google (schema privado: não exposto pela API)
-- ---------------------------------------------------------------------

create table private.google_connections (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  google_email  text,
  token_cipher  text not null,
  connected_at  timestamptz not null default now()
);
comment on table private.google_connections is 'Token de atualização do Google, criptografado pelo servidor do Atreides.';

-- Salva/atualiza a conexão de quem está logado.
create function public.google_connection_save(p_google_email text, p_token_cipher text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_active_member() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  insert into private.google_connections (user_id, google_email, token_cipher)
  values ((select auth.uid()), lower(p_google_email), p_token_cipher)
  on conflict (user_id) do update
    set google_email = excluded.google_email,
        token_cipher = excluded.token_cipher,
        connected_at = now();
  insert into public.audit_log (user_id, action, table_name, record_id)
  values ((select auth.uid()), 'google_connected', 'google_connections', (select auth.uid())::text);
end;
$$;

-- Remove a conexão de quem está logado.
create function public.google_connection_delete()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from private.google_connections where user_id = (select auth.uid());
  insert into public.audit_log (user_id, action, table_name, record_id)
  values ((select auth.uid()), 'google_disconnected', 'google_connections', (select auth.uid())::text);
end;
$$;

-- Conexão do dono de um workspace (o token vem criptografado: só o servidor abre).
create function public.google_connection_for_workspace(p_workspace_id uuid)
returns table (owner_id uuid, owner_name text, owner_email text, google_email text, token_cipher text)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_active_member() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return query
    select w.owner_id, p.full_name, p.email, g.google_email, g.token_cipher
    from public.workspaces w
    join public.profiles p on p.id = w.owner_id
    left join private.google_connections g on g.user_id = w.owner_id
    where w.id = p_workspace_id;
end;
$$;

revoke execute on function public.google_connection_save(text, text) from public, anon;
revoke execute on function public.google_connection_delete() from public, anon;
revoke execute on function public.google_connection_for_workspace(uuid) from public, anon;
grant execute on function public.google_connection_save(text, text) to authenticated;
grant execute on function public.google_connection_delete() to authenticated;
grant execute on function public.google_connection_for_workspace(uuid) to authenticated;
