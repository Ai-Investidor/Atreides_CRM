-- =====================================================================
-- 0006 · Clientes (Documentação/03) + processos (Documentação/09, etapa 2)
--
-- Dicionário (documentos em PT → banco em EN):
--   clientes → clients            nucleos_familiares → families
--   anotacoes → client_notes      documentos → client_documents
--   documentos_obrigatorios → document_requirements
--   questionario_versoes → suitability_versions
--   questionarios → suitability_responses
--   linha_do_tempo → client_events
--   processos_modelo → process_templates (+ process_template_steps)
--   processos → processes
--
-- Regras principais:
--   • CPF válido e único (dependente pode ficar sem CPF, celular e e-mail).
--   • Novo cliente entra em Onboarding e inicia o processo de onboarding;
--     cliente migrado entra Ativo e inicia o processo de migração.
--   • Encerrar exige motivo e grava a retenção de 5 anos (CVM).
--   • Questionário é imutável; o perfil do cliente é atualizado pelo banco.
--   • Linha do tempo gravada pelo banco a partir das ações dos módulos.
--   • Exclusão só pelo admin e só fora do prazo de retenção.
-- =====================================================================

create extension if not exists pg_cron;

create type public.client_status as enum ('onboarding', 'active', 'paused', 'closed');
create type public.investor_profile as enum ('conservative', 'moderate', 'aggressive');
create type public.marital_status as enum ('single', 'married', 'stable_union', 'divorced', 'widowed');
create type public.family_role as enum ('holder', 'spouse', 'dependent');
create type public.document_category as enum ('contract', 'id_document', 'proof_of_address', 'lgpd_consent', 'income_proof', 'other');
create type public.process_status as enum ('running', 'done', 'canceled');
create type public.client_event_type as enum (
  'created', 'migrated', 'converted_from_lead', 'status_changed', 'transferred', 'data_updated',
  'note', 'document_uploaded', 'document_deleted', 'suitability', 'lgpd_consent',
  'task_done', 'meeting_scheduled', 'process_started', 'process_completed', 'family_changed'
);

-- ---------------------------------------------------------------------
-- CPF
-- ---------------------------------------------------------------------

create function private.cpf_is_valid(p text)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare
  d int[];
  s int;
  r int;
  i int;
begin
  if p is null or p !~ '^[0-9]{11}$' or p ~ '^(.)\1{10}$' then
    return false;
  end if;
  d := array(select substr(p, g, 1)::int from generate_series(1, 11) g);
  s := 0;
  for i in 1..9 loop s := s + d[i] * (11 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  if r <> d[10] then return false; end if;
  s := 0;
  for i in 1..10 loop s := s + d[i] * (12 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  return r = d[11];
end;
$$;

-- ---------------------------------------------------------------------
-- Núcleo familiar e clientes
-- ---------------------------------------------------------------------

create table public.families (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  name          text not null check (char_length(name) between 2 and 120),
  created_by    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now()
);
create index families_workspace_idx on public.families (workspace_id);
create index families_created_by_idx on public.families (created_by);

create table public.clients (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces (id) on delete restrict,
  full_name           text not null check (char_length(full_name) between 2 and 200),
  cpf                 text check (cpf is null or private.cpf_is_valid(cpf)),
  birth_date          date check (birth_date is null or birth_date between '1900-01-01' and current_date),
  marital_status      public.marital_status,
  profession          text check (char_length(profession) <= 120),
  phone               text check (phone is null or phone ~ '^[0-9]{10,11}$'),
  email               text check (email is null or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  city                text check (char_length(city) <= 120),
  state               text check (state is null or state ~ '^[A-Z]{2}$'),
  source              public.lead_source,
  referred_by         text check (char_length(referred_by) <= 200),
  contract_start_on   date,
  status              public.client_status not null default 'onboarding',
  family_id           uuid references public.families (id) on delete set null,
  family_role         public.family_role,
  monthly_income      numeric(14, 2) check (monthly_income >= 0),
  declared_net_worth  numeric(16, 2) check (declared_net_worth >= 0),
  lgpd_consent_at     timestamptz,
  investor_profile    public.investor_profile,
  profile_assessed_at timestamptz,
  profile_valid_until date,
  lead_id             uuid unique references public.leads (id) on delete set null,
  migrated            boolean not null default false,
  paused_at           timestamptz,
  closed_at           timestamptz,
  closing_reason      text check (char_length(closing_reason) <= 1000),
  retain_until        date,
  notes               text check (char_length(notes) <= 5000),
  created_by          uuid not null references public.profiles (id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint clients_contact_required
    check (family_role = 'dependent' or (cpf is not null and phone is not null and email is not null)),
  constraint clients_closed_needs_reason
    check (status <> 'closed' or (closed_at is not null and nullif(trim(closing_reason), '') is not null)),
  constraint clients_family_role_needs_family
    check ((family_id is null) = (family_role is null))
);
comment on table public.clients is 'Clientes da consultoria (ficha única).';

create unique index clients_cpf_key on public.clients (cpf) where cpf is not null;
create index clients_workspace_status_idx on public.clients (workspace_id, status);
create index clients_family_idx on public.clients (family_id);
create index clients_created_by_idx on public.clients (created_by);
create index clients_profile_valid_idx on public.clients (profile_valid_until) where status <> 'closed';

alter table public.leads
  add constraint leads_client_id_fkey foreign key (client_id) references public.clients (id) on delete set null;
create index leads_client_id_idx on public.leads (client_id);

-- ---------------------------------------------------------------------
-- Linha do tempo
-- ---------------------------------------------------------------------

create table public.client_events (
  id            bigint generated always as identity primary key,
  client_id     uuid not null references public.clients (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  type          public.client_event_type not null,
  summary       text,
  metadata      jsonb not null default '{}',
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
comment on table public.client_events is 'Linha do tempo do cliente. Gravada só pelo banco.';
create index client_events_client_idx on public.client_events (client_id, created_at desc);
create index client_events_workspace_idx on public.client_events (workspace_id);
create index client_events_created_by_idx on public.client_events (created_by);

create function private.client_event(p_client uuid, p_type public.client_event_type, p_summary text default null, p_meta jsonb default '{}')
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.client_events (client_id, workspace_id, type, summary, metadata, created_by)
  select c.id, c.workspace_id, p_type, p_summary, coalesce(p_meta, '{}'), (select auth.uid())
  from public.clients c where c.id = p_client;
end;
$$;

-- ---------------------------------------------------------------------
-- Processos (Documentação/09, etapa 2)
-- ---------------------------------------------------------------------

create table public.process_templates (
  id    uuid primary key default gen_random_uuid(),
  code  text not null unique,
  name  text not null
);

create table public.process_template_steps (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.process_templates (id) on delete cascade,
  position     int not null,
  code         text not null,
  title        text not null,
  is_final     boolean not null default false,
  unique (template_id, position),
  unique (template_id, code)
);

create table public.processes (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.process_templates (id) on delete restrict,
  client_id     uuid not null references public.clients (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  status        public.process_status not null default 'running',
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index processes_client_idx on public.processes (client_id);
create index processes_template_idx on public.processes (template_id);
create index processes_workspace_idx on public.processes (workspace_id);

alter table public.tasks
  add column client_id uuid references public.clients (id) on delete cascade,
  add column process_id uuid references public.processes (id) on delete cascade,
  add column process_step_id uuid references public.process_template_steps (id) on delete set null,
  add column system_key text;
create index tasks_client_id_idx on public.tasks (client_id);
create index tasks_process_id_idx on public.tasks (process_id);
create index tasks_process_step_id_idx on public.tasks (process_step_id);
create unique index tasks_system_key_open_key on public.tasks (system_key) where status = 'open' and system_key is not null;

insert into public.process_templates (code, name) values
  ('onboarding', 'Onboarding de cliente'),
  ('migration', 'Migração de cliente existente');

insert into public.process_template_steps (template_id, position, code, title, is_final)
select t.id, s.position, s.code, s.title, s.is_final
from public.process_templates t
join (values
  ('onboarding', 1, 'contract', 'Enviar e coletar contrato assinado', false),
  ('onboarding', 2, 'lgpd', 'Registrar aceite de tratamento de dados (LGPD)', false),
  ('onboarding', 3, 'documents', 'Coletar documentos', false),
  ('onboarding', 4, 'suitability', 'Aplicar questionário de perfil de investidor', false),
  ('onboarding', 5, 'onboarding_meeting', 'Reunião de onboarding: levantamento financeiro', false),
  ('onboarding', 6, 'diagnosis', 'Concluir o diagnóstico financeiro', false),
  ('onboarding', 7, 'portfolio', 'Registrar a carteira atual', false),
  ('onboarding', 8, 'plan', 'Montar planejamento', false),
  ('onboarding', 9, 'plan_meeting', 'Reunião de apresentação do planejamento', false),
  ('onboarding', 10, 'finish', 'Concluir onboarding (cliente vira Ativo)', true),
  ('migration', 1, 'review_data', 'Conferir cadastro e carteira importados', false),
  ('migration', 2, 'lgpd', 'Registrar aceite de tratamento de dados (LGPD)', false),
  ('migration', 3, 'suitability', 'Aplicar questionário de perfil de investidor', false),
  ('migration', 4, 'diagnosis', 'Fazer o diagnóstico financeiro', false),
  ('migration', 5, 'plan', 'Registrar o planejamento vigente no Atreides', false)
) as s(template_code, position, code, title, is_final) on s.template_code = t.code;

-- Inicia um processo: cria as tarefas de cada etapa para o dono do workspace.
create function private.start_process(p_client uuid, p_template_code text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_client public.clients;
  v_owner uuid;
  v_template uuid;
  v_process uuid;
begin
  select * into v_client from public.clients where id = p_client;
  select owner_id into v_owner from public.workspaces where id = v_client.workspace_id;
  select id into v_template from public.process_templates where code = p_template_code;

  insert into public.processes (template_id, client_id, workspace_id)
  values (v_template, p_client, v_client.workspace_id)
  returning id into v_process;

  insert into public.tasks (workspace_id, title, assignee_id, client_id, process_id, process_step_id, origin, created_by)
  select v_client.workspace_id, s.title || ' · ' || v_client.full_name, v_owner, p_client, v_process, s.id, 'process',
         coalesce((select auth.uid()), v_owner)
  from public.process_template_steps s
  where s.template_id = v_template
    -- Migração: sem tarefa de LGPD se o aceite já existe.
    and not (s.code = 'lgpd' and v_client.lgpd_consent_at is not null)
  order by s.position;

  perform private.client_event(p_client, 'process_started', null, jsonb_build_object('process', p_template_code));
  return v_process;
end;
$$;

-- Conclui sozinha a tarefa aberta de uma etapa (ex.: questionário aplicado).
create function private.complete_process_step(p_client uuid, p_step_code text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.tasks t set status = 'done'
  from public.process_template_steps s
  where t.process_step_id = s.id and s.code = p_step_code
    and t.client_id = p_client and t.status = 'open';
end;
$$;

-- ---------------------------------------------------------------------
-- Gatilhos de clientes
-- ---------------------------------------------------------------------

create function private.clients_before_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  new.state := nullif(upper(trim(new.state)), '');
  new.full_name := trim(new.full_name);

  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.status := case when new.migrated then 'active'::public.client_status else 'onboarding'::public.client_status end;
    new.investor_profile := null;
    new.profile_assessed_at := null;
    new.profile_valid_until := null;
    new.closed_at := null;
    new.retain_until := null;
  else
    new.updated_at := now();
    new.created_by := old.created_by;
    new.migrated := old.migrated;
    new.lead_id := coalesce(old.lead_id, new.lead_id);

    -- Transferência entre workspaces: só o admin.
    if new.workspace_id is distinct from old.workspace_id and not private.is_admin() then
      raise exception 'Só o admin transfere clientes entre workspaces.' using errcode = '42501', hint = 'transfer_admin';
    end if;

    -- Perfil só muda pelo questionário.
    if current_setting('atreides.profile_update', true) is distinct from 'on' then
      new.investor_profile := old.investor_profile;
      new.profile_assessed_at := old.profile_assessed_at;
      new.profile_valid_until := old.profile_valid_until;
    end if;

    if new.status is distinct from old.status then
      if old.status = 'closed' then
        raise exception 'Cliente encerrado não volta a ficar ativo.' using errcode = '23514', hint = 'closed_final';
      end if;
      if new.status = 'closed' then
        new.closed_at := now();
        new.retain_until := (now() + interval '5 years')::date;
      elsif new.status = 'paused' then
        new.paused_at := now();
      else
        new.paused_at := null;
      end if;
    end if;
    if new.status <> 'closed' then
      new.closed_at := null;
      new.closing_reason := null;
      new.retain_until := null;
    else
      new.closed_at := coalesce(new.closed_at, old.closed_at);
      new.retain_until := coalesce(new.retain_until, old.retain_until);
    end if;
  end if;

  if new.family_id is not null and not exists (
    select 1 from public.families where id = new.family_id and workspace_id = new.workspace_id
  ) then
    raise exception 'O núcleo familiar precisa ser do mesmo workspace.' using errcode = '23514', hint = 'family_workspace';
  end if;

  if new.lead_id is not null and tg_op = 'INSERT' and not exists (
    select 1 from public.leads where id = new.lead_id and workspace_id = new.workspace_id and client_id is null
  ) then
    raise exception 'Lead inválido ou já convertido.' using errcode = '23514', hint = 'lead_invalid';
  end if;

  return new;
end;
$$;

create trigger clients_before_write
  before insert or update on public.clients
  for each row execute function private.clients_before_write();

create function private.clients_after_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.lead_id is not null then
      update public.leads set client_id = new.id where id = new.lead_id;
      perform private.client_event(new.id, 'converted_from_lead', null, jsonb_build_object('lead_id', new.lead_id));
    end if;
    perform private.client_event(new.id, case when new.migrated then 'migrated'::public.client_event_type else 'created'::public.client_event_type end);
    if new.lgpd_consent_at is not null then
      perform private.client_event(new.id, 'lgpd_consent');
    end if;
    perform private.start_process(new.id, case when new.migrated then 'migration' else 'onboarding' end);
    return new;
  end if;

  if new.status is distinct from old.status then
    perform private.client_event(new.id, 'status_changed', new.closing_reason,
      jsonb_build_object('from', old.status, 'to', new.status));
    if new.status = 'closed' then
      update public.processes set status = 'canceled', completed_at = now() where client_id = new.id and status = 'running';
    end if;
  end if;
  if new.workspace_id is distinct from old.workspace_id then
    perform private.client_event(new.id, 'transferred', null,
      jsonb_build_object('from', old.workspace_id, 'to', new.workspace_id));
  end if;
  if new.lgpd_consent_at is not null and old.lgpd_consent_at is null then
    perform private.client_event(new.id, 'lgpd_consent');
    perform private.complete_process_step(new.id, 'lgpd');
  end if;
  if new.family_id is distinct from old.family_id or new.family_role is distinct from old.family_role then
    perform private.client_event(new.id, 'family_changed', null,
      jsonb_build_object('family_id', new.family_id, 'role', new.family_role));
  end if;
  if (new.full_name, new.cpf, new.birth_date, new.marital_status, new.profession, new.phone, new.email, new.city, new.state,
      new.source, new.referred_by, new.contract_start_on, new.monthly_income, new.declared_net_worth)
     is distinct from
     (old.full_name, old.cpf, old.birth_date, old.marital_status, old.profession, old.phone, old.email, old.city, old.state,
      old.source, old.referred_by, old.contract_start_on, old.monthly_income, old.declared_net_worth) then
    perform private.client_event(new.id, 'data_updated');
  end if;
  return new;
end;
$$;

create trigger clients_after_write
  after insert or update on public.clients
  for each row execute function private.clients_after_write();

create trigger clients_audit_other_workspace
  after insert or update on public.clients
  for each row execute function private.audit_other_workspace();

-- Exclusão (LGPD): fora do prazo de retenção da CVM. Fica na auditoria.
create function private.clients_before_delete()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if (exists (select 1 from public.suitability_responses where client_id = old.id)
      or exists (select 1 from public.client_documents where client_id = old.id)
      or exists (select 1 from public.meetings where client_id = old.id))
     and (old.retain_until is null or old.retain_until > current_date) then
    raise exception 'Registros dentro do prazo de retenção da CVM.'
      using errcode = '42501', hint = 'retention:' || coalesce(old.retain_until::text, '');
  end if;
  insert into public.audit_log (user_id, workspace_id, action, table_name, record_id)
  values ((select auth.uid()), old.workspace_id, 'client_deleted', 'clients', old.id::text);
  return old;
end;
$$;

-- ---------------------------------------------------------------------
-- Anotações
-- ---------------------------------------------------------------------

create table public.client_notes (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  body          text not null check (char_length(trim(body)) between 1 and 5000),
  pinned        boolean not null default false,
  created_by    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index client_notes_client_idx on public.client_notes (client_id, pinned desc, created_at desc);
create index client_notes_workspace_idx on public.client_notes (workspace_id);
create index client_notes_created_by_idx on public.client_notes (created_by);

create function private.client_notes_before_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select workspace_id into new.workspace_id from public.clients where id = new.client_id;
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
  else
    new.client_id := old.client_id;
    new.created_by := old.created_by;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger client_notes_before_write
  before insert or update on public.client_notes
  for each row execute function private.client_notes_before_write();

create function private.client_notes_after_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform private.client_event(new.client_id, 'note', left(new.body, 280));
  return new;
end;
$$;

create trigger client_notes_after_insert
  after insert on public.client_notes
  for each row execute function private.client_notes_after_insert();

-- ---------------------------------------------------------------------
-- Documentos
-- ---------------------------------------------------------------------

create table public.document_requirements (
  category  public.document_category primary key,
  required  boolean not null default false
);
insert into public.document_requirements (category, required) values
  ('contract', true), ('id_document', true), ('proof_of_address', true), ('lgpd_consent', true),
  ('income_proof', false), ('other', false);

create table public.client_documents (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  category      public.document_category not null,
  file_name     text not null check (char_length(file_name) between 1 and 255),
  storage_path  text not null unique,
  size_bytes    bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  mime_type     text not null,
  uploaded_by   uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now()
);
create index client_documents_client_idx on public.client_documents (client_id, category);
create index client_documents_workspace_idx on public.client_documents (workspace_id);
create index client_documents_uploaded_by_idx on public.client_documents (uploaded_by);

create function private.client_documents_before_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select workspace_id into new.workspace_id from public.clients where id = new.client_id;
  new.uploaded_by := coalesce((select auth.uid()), new.uploaded_by);
  return new;
end;
$$;

create trigger client_documents_before_insert
  before insert on public.client_documents
  for each row execute function private.client_documents_before_insert();

create function private.client_documents_after_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.client_event(new.client_id, 'document_uploaded', new.file_name, jsonb_build_object('category', new.category));
    -- Documento de aceite LGPD registra o aceite, se ainda não houver.
    if new.category = 'lgpd_consent' then
      update public.clients set lgpd_consent_at = now() where id = new.client_id and lgpd_consent_at is null;
    end if;
    return new;
  end if;
  perform private.client_event(old.client_id, 'document_deleted', old.file_name, jsonb_build_object('category', old.category));
  return old;
end;
$$;

create trigger client_documents_after_write
  after insert or delete on public.client_documents
  for each row execute function private.client_documents_after_write();

-- ---------------------------------------------------------------------
-- Questionário de perfil (suitability)
-- ---------------------------------------------------------------------

create table public.suitability_versions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  title         text not null,
  questions     jsonb not null,
  thresholds    jsonb not null,
  active        boolean not null default false,
  validated_at  timestamptz,
  validated_by  uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create unique index suitability_versions_one_active on public.suitability_versions (active) where active;
create index suitability_versions_validated_by_idx on public.suitability_versions (validated_by);

create table public.suitability_responses (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  version_id    uuid not null references public.suitability_versions (id) on delete restrict,
  answers       jsonb not null,
  score         int not null,
  profile       public.investor_profile not null,
  valid_until   date not null,
  validated_version boolean not null,
  created_by    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now()
);
comment on table public.suitability_responses is 'Questionários aplicados. Imutáveis (exigência regulatória).';
create index suitability_responses_client_idx on public.suitability_responses (client_id, created_at desc);
create index suitability_responses_workspace_idx on public.suitability_responses (workspace_id);
create index suitability_responses_version_idx on public.suitability_responses (version_id);
create index suitability_responses_created_by_idx on public.suitability_responses (created_by);

-- Calcula pontuação e perfil no banco a partir da versão (a tela não decide o resultado).
create function private.suitability_before_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v public.suitability_versions;
  q jsonb;
  escolha text;
  pontos int;
  total int := 0;
begin
  select * into v from public.suitability_versions where id = new.version_id;
  if not found then
    raise exception 'Versão do questionário inexistente.' using errcode = '23514';
  end if;

  for q in select * from jsonb_array_elements(v.questions) loop
    escolha := new.answers ->> (q ->> 'id');
    select (o ->> 'points')::int into pontos
    from jsonb_array_elements(q -> 'options') o where o ->> 'id' = escolha;
    if pontos is null then
      raise exception 'Questionário incompleto: %', q ->> 'id' using errcode = '23514', hint = 'incomplete';
    end if;
    total := total + pontos;
  end loop;

  select workspace_id into new.workspace_id from public.clients where id = new.client_id;
  new.score := total;
  new.profile := case
    when total >= (v.thresholds ->> 'aggressive')::int then 'aggressive'
    when total >= (v.thresholds ->> 'moderate')::int then 'moderate'
    else 'conservative' end;
  new.valid_until := (current_date + interval '24 months')::date;
  new.validated_version := v.validated_at is not null;
  new.created_by := coalesce((select auth.uid()), new.created_by);
  new.created_at := now();
  return new;
end;
$$;

create trigger suitability_before_insert
  before insert on public.suitability_responses
  for each row execute function private.suitability_before_insert();

create function private.suitability_after_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform set_config('atreides.profile_update', 'on', true);
  update public.clients
     set investor_profile = new.profile, profile_assessed_at = new.created_at, profile_valid_until = new.valid_until
   where id = new.client_id;
  perform set_config('atreides.profile_update', 'off', true);
  perform private.client_event(new.client_id, 'suitability', null,
    jsonb_build_object('profile', new.profile, 'score', new.score, 'validated_version', new.validated_version));
  perform private.complete_process_step(new.client_id, 'suitability');
  -- Fecha a tarefa automática de perfil vencendo, se houver.
  update public.tasks set status = 'done' where system_key = 'profile_expiry:' || new.client_id and status = 'open';
  return new;
end;
$$;

create trigger suitability_after_insert
  after insert on public.suitability_responses
  for each row execute function private.suitability_after_insert();

-- Primeira versão (rascunho, aguardando validação do compliance). Resolução CVM 30/2021:
-- objetivos, horizonte, situação financeira, conhecimento/experiência e tolerância a risco.
insert into public.suitability_versions (code, title, active, thresholds, questions) values (
  'v1', 'Questionário de perfil do investidor · versão 1 (rascunho)', true,
  '{"moderate": 21, "aggressive": 31}',
  '[
    {"id": "objetivo", "dimension": "objetivos", "text": "Qual é o seu principal objetivo ao investir?", "options": [
      {"id": "a", "text": "Preservar o patrimônio, sem perdas", "points": 1},
      {"id": "b", "text": "Gerar uma renda complementar estável", "points": 2},
      {"id": "c", "text": "Fazer o patrimônio crescer no longo prazo", "points": 3},
      {"id": "d", "text": "Buscar o maior ganho possível, aceitando oscilações fortes", "points": 4}]},
    {"id": "horizonte", "dimension": "horizonte", "text": "Por quanto tempo pretende manter a maior parte dos seus investimentos?", "options": [
      {"id": "a", "text": "Menos de 1 ano", "points": 1},
      {"id": "b", "text": "De 1 a 3 anos", "points": 2},
      {"id": "c", "text": "De 3 a 5 anos", "points": 3},
      {"id": "d", "text": "Mais de 5 anos", "points": 4}]},
    {"id": "liquidez", "dimension": "situacao_financeira", "text": "Que parte do seu patrimônio investido você pode precisar resgatar nos próximos 12 meses?", "options": [
      {"id": "a", "text": "Mais da metade", "points": 1},
      {"id": "b", "text": "Entre 20% e 50%", "points": 2},
      {"id": "c", "text": "Menos de 20%", "points": 3},
      {"id": "d", "text": "Nenhuma parte", "points": 4}]},
    {"id": "sobra", "dimension": "situacao_financeira", "text": "Comparando sua renda mensal com seus gastos, como está o seu mês?", "options": [
      {"id": "a", "text": "Os gastos são iguais ou maiores que a renda", "points": 1},
      {"id": "b", "text": "Sobra até 10% da renda", "points": 2},
      {"id": "c", "text": "Sobra entre 10% e 30% da renda", "points": 3},
      {"id": "d", "text": "Sobra mais de 30% da renda", "points": 4}]},
    {"id": "reserva", "dimension": "situacao_financeira", "text": "Você tem reserva de emergência?", "options": [
      {"id": "a", "text": "Não tenho", "points": 1},
      {"id": "b", "text": "Tenho, para menos de 3 meses de gastos", "points": 2},
      {"id": "c", "text": "Tenho, para 3 a 6 meses de gastos", "points": 3},
      {"id": "d", "text": "Tenho, para mais de 6 meses de gastos", "points": 4}]},
    {"id": "dividas", "dimension": "situacao_financeira", "text": "Quanto da sua renda mensal está comprometido com dívidas e financiamentos?", "options": [
      {"id": "a", "text": "Mais de 30%", "points": 1},
      {"id": "b", "text": "Entre 10% e 30%", "points": 2},
      {"id": "c", "text": "Menos de 10%", "points": 3},
      {"id": "d", "text": "Não tenho dívidas", "points": 4}]},
    {"id": "experiencia", "dimension": "conhecimento", "text": "Em quais investimentos você já aplicou?", "options": [
      {"id": "a", "text": "Só poupança, ou nunca investi", "points": 1},
      {"id": "b", "text": "Renda fixa (CDB, Tesouro Direto, LCI/LCA)", "points": 2},
      {"id": "c", "text": "Fundos, multimercados ou fundos imobiliários", "points": 3},
      {"id": "d", "text": "Ações, derivativos ou criptoativos", "points": 4}]},
    {"id": "conhecimento", "dimension": "conhecimento", "text": "Como você avalia seu conhecimento sobre o mercado financeiro?", "options": [
      {"id": "a", "text": "Nenhum", "points": 1},
      {"id": "b", "text": "Básico", "points": 2},
      {"id": "c", "text": "Intermediário", "points": 3},
      {"id": "d", "text": "Avançado ou atuo na área", "points": 4}]},
    {"id": "queda", "dimension": "tolerancia_risco", "text": "Se seus investimentos caíssem 15% em um mês, o que você faria?", "options": [
      {"id": "a", "text": "Resgataria tudo", "points": 1},
      {"id": "b", "text": "Resgataria uma parte", "points": 2},
      {"id": "c", "text": "Manteria e aguardaria a recuperação", "points": 3},
      {"id": "d", "text": "Aproveitaria para investir mais", "points": 4}]},
    {"id": "carteira", "dimension": "tolerancia_risco", "text": "Qual destas carteiras você escolheria? (ganho esperado em 12 meses e pior perda possível)", "options": [
      {"id": "a", "text": "Ganho de 6%, sem perda", "points": 1},
      {"id": "b", "text": "Ganho de 9%, perda de até 5%", "points": 2},
      {"id": "c", "text": "Ganho de 13%, perda de até 12%", "points": 3},
      {"id": "d", "text": "Ganho de 18%, perda de até 25%", "points": 4}]}
  ]'
);

-- ---------------------------------------------------------------------
-- Integração com tarefas, reuniões e auditoria
-- ---------------------------------------------------------------------

-- Tarefas: cliente do mesmo workspace; etapa final do processo só depois das outras;
-- processo concluído quando todas as tarefas fecham (onboarding → cliente Ativo).
create function private.tasks_client_rules()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_final boolean;
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients where id = new.client_id and workspace_id = new.workspace_id
  ) then
    raise exception 'O cliente precisa ser do mesmo workspace da tarefa.' using errcode = '23514', hint = 'client_workspace';
  end if;

  if tg_op = 'UPDATE' then
    new.client_id := coalesce(old.client_id, new.client_id);
    new.process_id := old.process_id;
    new.process_step_id := old.process_step_id;
    new.system_key := old.system_key;
    if new.process_id is not null and new.status = 'done' and old.status <> 'done' then
      select is_final into v_final from public.process_template_steps where id = new.process_step_id;
      if v_final and exists (
        select 1 from public.tasks where process_id = new.process_id and id <> new.id and status = 'open'
      ) then
        raise exception 'Conclua as outras etapas antes da etapa final.' using errcode = '23514', hint = 'process_pending';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_client_rules
  before insert or update on public.tasks
  for each row execute function private.tasks_client_rules();

create function private.tasks_after_client()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if new.client_id is not null and new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    perform private.client_event(new.client_id, 'task_done', new.title);
  end if;

  if new.process_id is not null and tg_op = 'UPDATE' and new.status is distinct from old.status
     and not exists (select 1 from public.tasks where process_id = new.process_id and status = 'open') then
    update public.processes set status = 'done', completed_at = now()
     where id = new.process_id and status = 'running'
     returning (select code from public.process_templates where id = template_id) into v_code;
    if v_code is not null then
      perform private.client_event(new.client_id, 'process_completed', null, jsonb_build_object('process', v_code));
      if v_code = 'onboarding' then
        update public.clients set status = 'active' where id = new.client_id and status = 'onboarding';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_after_client
  after insert or update on public.tasks
  for each row execute function private.tasks_after_client();

alter table public.meetings add column client_id uuid references public.clients (id) on delete set null;
create index meetings_client_id_idx on public.meetings (client_id);

create function private.meetings_client_rules()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients where id = new.client_id and workspace_id = new.workspace_id
  ) then
    raise exception 'O cliente precisa ser do mesmo workspace da reunião.' using errcode = '23514', hint = 'client_workspace';
  end if;
  return new;
end;
$$;

create trigger meetings_client_rules
  before insert or update on public.meetings
  for each row execute function private.meetings_client_rules();

create function private.meetings_client_event()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.client_id is not null and (tg_op = 'INSERT' or old.client_id is distinct from new.client_id) then
    perform private.client_event(new.client_id, 'meeting_scheduled',
      new.title || ' · ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'));
  end if;
  return new;
end;
$$;

create trigger meetings_client_event
  after insert or update on public.meetings
  for each row execute function private.meetings_client_event();

-- Precisa existir depois de suitability_responses, client_documents e meetings.client_id.
create trigger clients_before_delete
  before delete on public.clients
  for each row execute function private.clients_before_delete();

-- Exportação LGPD: registra na auditoria (só admin).
create function public.client_export_audit(p_client uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Só o admin exporta dados de clientes.' using errcode = '42501';
  end if;
  insert into public.audit_log (user_id, workspace_id, action, table_name, record_id)
  select (select auth.uid()), workspace_id, 'client_exported', 'clients', id::text from public.clients where id = p_client;
end;
$$;
revoke execute on function public.client_export_audit(uuid) from public, anon;
grant execute on function public.client_export_audit(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Perfil vencendo: rotina diária cria a tarefa 30 dias antes
-- ---------------------------------------------------------------------

create function private.create_profile_expiry_tasks()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.tasks (workspace_id, title, due_on, assignee_id, client_id, origin, created_by, system_key)
  select c.workspace_id, 'Atualizar questionário de perfil · ' || c.full_name, c.profile_valid_until, w.owner_id,
         c.id, 'system', w.owner_id, 'profile_expiry:' || c.id
  from public.clients c
  join public.workspaces w on w.id = c.workspace_id
  where c.status in ('onboarding', 'active')
    and c.profile_valid_until is not null
    and c.profile_valid_until <= current_date + 30
  on conflict (system_key) where status = 'open' and system_key is not null do nothing;
end;
$$;

select cron.schedule('atreides-perfil-vencendo', '0 11 * * *', $cron$select private.create_profile_expiry_tasks()$cron$);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.families enable row level security;
alter table public.clients enable row level security;
alter table public.client_events enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_documents enable row level security;
alter table public.document_requirements enable row level security;
alter table public.suitability_versions enable row level security;
alter table public.suitability_responses enable row level security;
alter table public.process_templates enable row level security;
alter table public.process_template_steps enable row level security;
alter table public.processes enable row level security;

create policy "families: membros leem" on public.families for select to authenticated using ((select private.is_active_member()));
create policy "families: membros criam" on public.families for insert to authenticated with check ((select private.is_active_member()));
create policy "families: membros editam" on public.families for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));

create policy "clients: membros leem" on public.clients for select to authenticated using ((select private.is_active_member()));
create policy "clients: membros criam" on public.clients for insert to authenticated with check ((select private.is_active_member()));
create policy "clients: membros editam" on public.clients for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));
create policy "clients: admin exclui" on public.clients for delete to authenticated using ((select private.is_admin()));

create policy "client_events: membros leem" on public.client_events for select to authenticated using ((select private.is_active_member()));

create policy "client_notes: membros leem" on public.client_notes for select to authenticated using ((select private.is_active_member()));
create policy "client_notes: membros criam" on public.client_notes for insert to authenticated with check ((select private.is_active_member()));
create policy "client_notes: autor ou admin edita" on public.client_notes for update to authenticated
  using ((select private.is_active_member()) and (created_by = (select auth.uid()) or (select private.is_admin())))
  with check ((select private.is_active_member()));
create policy "client_notes: autor ou admin exclui" on public.client_notes for delete to authenticated
  using ((select private.is_active_member()) and (created_by = (select auth.uid()) or (select private.is_admin())));

create policy "client_documents: membros leem" on public.client_documents for select to authenticated using ((select private.is_active_member()));
create policy "client_documents: membros enviam" on public.client_documents for insert to authenticated with check ((select private.is_active_member()));
create policy "client_documents: admin exclui" on public.client_documents for delete to authenticated using ((select private.is_admin()));

create policy "document_requirements: membros leem" on public.document_requirements for select to authenticated using ((select private.is_active_member()));
create policy "document_requirements: admin edita" on public.document_requirements for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "suitability_versions: membros leem" on public.suitability_versions for select to authenticated using ((select private.is_active_member()));
create policy "suitability_versions: admin valida" on public.suitability_versions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "suitability_responses: membros leem" on public.suitability_responses for select to authenticated using ((select private.is_active_member()));
create policy "suitability_responses: membros aplicam" on public.suitability_responses for insert to authenticated with check ((select private.is_active_member()));

create policy "process_templates: membros leem" on public.process_templates for select to authenticated using ((select private.is_active_member()));
create policy "process_template_steps: membros leem" on public.process_template_steps for select to authenticated using ((select private.is_active_member()));
create policy "processes: membros leem" on public.processes for select to authenticated using ((select private.is_active_member()));

-- ---------------------------------------------------------------------
-- Armazenamento privado de documentos
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-documents', 'client-documents', false, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "client-documents: membros leem" on storage.objects for select to authenticated
  using (bucket_id = 'client-documents' and (select private.is_active_member()));
create policy "client-documents: membros enviam" on storage.objects for insert to authenticated
  with check (bucket_id = 'client-documents' and (select private.is_active_member()));
create policy "client-documents: admin exclui" on storage.objects for delete to authenticated
  using (bucket_id = 'client-documents' and (select private.is_admin()));
