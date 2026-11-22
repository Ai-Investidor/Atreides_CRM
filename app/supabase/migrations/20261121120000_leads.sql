-- =====================================================================
-- 0002 · Leads e funil (Documentação/04)
--
-- Dicionário (documentos em PT → banco em EN):
--   leads → leads · lead_contatos → lead_contacts
--   etapa: novo, em contato, diagnóstico, proposta, ganho, perdido
--        → new, contacted, diagnosis, proposal, won, lost
--   origem: Instagram, prospecção ativa, indicação, AI Invest, outro
--        → instagram, active_prospecting, referral, ai_invest, other
--   motivo de perda: preço, sem perfil, sem retorno, outra consultoria, outro
--        → price, no_fit, no_response, competitor, other
--
-- Regras:
--   • Lead em etapa aberta sempre tem próximo contato (data).
--   • Lead perdido sempre tem motivo.
--   • Histórico de contatos é imutável (só admin apaga).
--   • Mudanças de etapa e cadastro entram no histórico automaticamente.
--   • Edição no workspace de outro consultor vai para a auditoria.
-- =====================================================================

create type public.lead_stage as enum ('new', 'contacted', 'diagnosis', 'proposal', 'won', 'lost');
create type public.lead_source as enum ('instagram', 'active_prospecting', 'referral', 'ai_invest', 'other');
create type public.lead_lost_reason as enum ('price', 'no_fit', 'no_response', 'competitor', 'other');
create type public.lead_contact_type as enum ('call', 'whatsapp', 'meeting', 'email', 'note', 'stage_change', 'created');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table public.leads (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete restrict,
  full_name          text not null check (length(btrim(full_name)) >= 2),
  phone              text not null check (phone ~ '^[0-9]{10,11}$'),
  email              text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source             public.lead_source not null,
  referred_by        text,
  notes              text,
  stage              public.lead_stage not null default 'new',
  stage_changed_at   timestamptz not null default now(),
  next_contact_on    date,
  next_contact_note  text,
  last_contact_at    timestamptz,
  lost_reason        public.lead_lost_reason,
  lost_note          text,
  client_id          uuid, -- preenchido na conversão (módulo Clientes)
  created_by         uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint leads_open_needs_next_contact
    check (stage in ('won', 'lost') or next_contact_on is not null),
  constraint leads_lost_needs_reason
    check (stage <> 'lost' or lost_reason is not null)
);
comment on table public.leads is 'Leads da consultoria, por workspace (Documentação/04).';

create index leads_workspace_stage_idx on public.leads (workspace_id, stage);
create index leads_workspace_next_contact_idx on public.leads (workspace_id, next_contact_on) where stage not in ('won', 'lost');
create index leads_phone_idx on public.leads (phone);
create index leads_created_by_idx on public.leads (created_by);

create table public.lead_contacts (
  id            bigint generated always as identity primary key,
  lead_id       uuid not null references public.leads (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  type          public.lead_contact_type not null,
  summary       text,
  from_stage    public.lead_stage,
  to_stage      public.lead_stage,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
comment on table public.lead_contacts is 'Histórico do lead: contatos registrados e eventos automáticos.';

create index lead_contacts_lead_idx on public.lead_contacts (lead_id, created_at desc);
create index lead_contacts_workspace_idx on public.lead_contacts (workspace_id);
create index lead_contacts_created_by_idx on public.lead_contacts (created_by);

-- ---------------------------------------------------------------------
-- Auditoria de edição em workspace alheio (Documentação/02)
-- ---------------------------------------------------------------------

create function private.audit_other_workspace()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_uid   uuid := (select auth.uid());
begin
  if v_uid is null then
    return new;
  end if;

  select owner_id into v_owner from public.workspaces where id = new.workspace_id;

  if v_owner is distinct from v_uid then
    insert into public.audit_log (user_id, workspace_id, action, table_name, record_id, after)
    values (
      v_uid,
      new.workspace_id,
      'edit_other_workspace',
      tg_table_name,
      coalesce(to_jsonb(new) ->> 'id', ''),
      jsonb_build_object('operation', lower(tg_op))
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Gatilhos de leads
-- ---------------------------------------------------------------------

create function private.leads_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.full_name := btrim(new.full_name);
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.stage is distinct from old.stage then
      new.stage_changed_at := now();
    end if;
  end if;

  -- Fora de "perdido", o motivo de perda não se aplica.
  if new.stage <> 'lost' then
    new.lost_reason := null;
    new.lost_note := null;
  end if;

  -- Etapas encerradas não têm próximo contato.
  if new.stage in ('won', 'lost') then
    new.next_contact_on := null;
    new.next_contact_note := null;
  end if;

  return new;
end;
$$;

create trigger leads_before_write
  before insert or update on public.leads
  for each row execute function private.leads_before_write();

create function private.leads_after_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_contacts (lead_id, workspace_id, type, to_stage, created_by)
    values (new.id, new.workspace_id, 'created', new.stage, new.created_by);
  elsif new.stage is distinct from old.stage then
    insert into public.lead_contacts (lead_id, workspace_id, type, summary, from_stage, to_stage, created_by)
    values (
      new.id, new.workspace_id, 'stage_change',
      case when new.stage = 'lost' then new.lost_note end,
      old.stage, new.stage, (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger leads_after_write
  after insert or update on public.leads
  for each row execute function private.leads_after_write();

create trigger leads_audit_other_workspace
  after insert or update on public.leads
  for each row execute function private.audit_other_workspace();

-- Contato registrado atualiza o "último contato" do lead.
create function private.lead_contacts_after_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.type in ('call', 'whatsapp', 'meeting', 'email', 'note') then
    update public.leads set last_contact_at = new.created_at where id = new.lead_id;
  end if;
  return new;
end;
$$;

create trigger lead_contacts_after_insert
  after insert on public.lead_contacts
  for each row execute function private.lead_contacts_after_insert();

create trigger lead_contacts_audit_other_workspace
  after insert on public.lead_contacts
  for each row when (new.type in ('call', 'whatsapp', 'meeting', 'email', 'note'))
  execute function private.audit_other_workspace();

-- ---------------------------------------------------------------------
-- RLS: membros ativos trabalham em qualquer workspace (Documentação/02)
-- ---------------------------------------------------------------------

alter table public.leads enable row level security;
alter table public.lead_contacts enable row level security;

create policy "leads: membros ativos leem"
  on public.leads for select to authenticated
  using ((select private.is_active_member()));

create policy "leads: membros ativos cadastram"
  on public.leads for insert to authenticated
  with check ((select private.is_active_member()) and created_by = (select auth.uid()));

create policy "leads: membros ativos editam"
  on public.leads for update to authenticated
  using ((select private.is_active_member()))
  with check ((select private.is_active_member()));

create policy "leads: admin exclui"
  on public.leads for delete to authenticated
  using ((select private.is_admin()));

create policy "lead_contacts: membros ativos leem"
  on public.lead_contacts for select to authenticated
  using ((select private.is_active_member()));

create policy "lead_contacts: membros ativos registram"
  on public.lead_contacts for insert to authenticated
  with check (
    (select private.is_active_member())
    and created_by = (select auth.uid())
    and type in ('call', 'whatsapp', 'meeting', 'email', 'note')
    and workspace_id = (select l.workspace_id from public.leads l where l.id = lead_id)
  );

create policy "lead_contacts: admin exclui"
  on public.lead_contacts for delete to authenticated
  using ((select private.is_admin()));
