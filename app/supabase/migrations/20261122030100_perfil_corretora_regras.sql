-- =====================================================================
-- 0010 · Perfil de investidor informado pela corretora (Documentação/03) — parte 2
--
-- Remove o questionário de suitability (versões, respostas, validade e a rotina de perfil
-- vencendo) e cria o registro do perfil definido pela corretora, para uso no planejamento.
--
-- Dicionário (documentos em PT → banco em EN):
--   corretora → profile_broker; observação → profile_note;
--   comprovante → profile_document_id (client_documents, categoria broker_profile);
--   registrado em/por → profile_recorded_at / profile_recorded_by
--
-- Regras:
--   • Perfil registrado exige a corretora.
--   • Data e autor do registro são gravados pelo banco (não pelo navegador).
--   • O comprovante precisa ser um documento do próprio cliente.
--   • Registrar ou trocar o perfil entra na linha do tempo e conclui a etapa do processo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Remoção do questionário e da rotina de vencimento
-- ---------------------------------------------------------------------

select cron.unschedule('atreides-perfil-vencendo');
drop function if exists private.create_profile_expiry_tasks();

drop table if exists public.suitability_responses;
drop table if exists public.suitability_versions;
drop function if exists private.suitability_before_insert();
drop function if exists private.suitability_after_insert();

drop index if exists public.clients_profile_valid_idx;
alter table public.clients drop column if exists profile_valid_until;
alter table public.clients rename column profile_assessed_at to profile_recorded_at;

-- ---------------------------------------------------------------------
-- Registro do perfil da corretora
-- ---------------------------------------------------------------------

alter table public.clients
  add column profile_broker      text check (char_length(profile_broker) between 1 and 80),
  add column profile_note        text check (char_length(profile_note) <= 1000),
  add column profile_document_id uuid references public.client_documents (id) on delete set null,
  add column profile_recorded_by uuid references public.profiles (id) on delete set null;
comment on column public.clients.investor_profile is 'Perfil de investidor definido pela corretora (o Atreides não diagnostica).';
create index clients_profile_document_idx on public.clients (profile_document_id);
create index clients_profile_recorded_by_idx on public.clients (profile_recorded_by);

insert into public.document_requirements (category, required) values ('broker_profile', false)
on conflict (category) do nothing;

update public.process_template_steps set title = 'Registrar perfil de investidor da corretora' where code = 'suitability';
update public.tasks
   set title = replace(title, 'Aplicar questionário de perfil de investidor', 'Registrar perfil de investidor da corretora')
 where status = 'open' and title like 'Aplicar questionário de perfil de investidor%';

-- ---------------------------------------------------------------------
-- Gatilhos de clientes
-- ---------------------------------------------------------------------

create or replace function private.clients_before_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_mudou_perfil boolean;
begin
  new.email := nullif(lower(trim(new.email)), '');
  new.state := nullif(upper(trim(new.state)), '');
  new.full_name := trim(new.full_name);
  new.profile_broker := nullif(trim(new.profile_broker), '');
  new.profile_note := nullif(trim(new.profile_note), '');

  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.status := case when new.migrated then 'active'::public.client_status else 'onboarding'::public.client_status end;
    new.profile_document_id := null;
    v_mudou_perfil := new.investor_profile is not null;
    new.closed_at := null;
    new.retain_until := null;
  else
    new.updated_at := now();
    new.created_by := old.created_by;
    new.migrated := old.migrated;
    new.lead_id := coalesce(old.lead_id, new.lead_id);

    if new.workspace_id is distinct from old.workspace_id and not private.is_admin() then
      raise exception 'Só o admin transfere clientes entre workspaces.' using errcode = '42501', hint = 'transfer_admin';
    end if;

    v_mudou_perfil := (new.investor_profile, new.profile_broker, new.profile_note, new.profile_document_id)
                      is distinct from (old.investor_profile, old.profile_broker, old.profile_note, old.profile_document_id);

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

  -- Perfil da corretora: data e autor vêm do banco; sem perfil, os campos ligados ficam vazios.
  if new.investor_profile is null then
    new.profile_broker := null;
    new.profile_note := null;
    new.profile_document_id := null;
    new.profile_recorded_at := null;
    new.profile_recorded_by := null;
  elsif v_mudou_perfil then
    if new.profile_broker is null then
      raise exception 'Informe a corretora que definiu o perfil.' using errcode = '23514', hint = 'profile_broker_required';
    end if;
    if new.profile_document_id is not null and not exists (
      select 1 from public.client_documents where id = new.profile_document_id and client_id = new.id
    ) then
      raise exception 'O comprovante precisa ser um documento deste cliente.' using errcode = '23514', hint = 'profile_document';
    end if;
    new.profile_recorded_at := now();
    new.profile_recorded_by := (select auth.uid());
  else
    new.profile_recorded_at := old.profile_recorded_at;
    new.profile_recorded_by := old.profile_recorded_by;
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

create or replace function private.clients_after_write()
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
    if new.investor_profile is not null then
      perform private.client_event(new.id, 'profile_set', null,
        jsonb_build_object('profile', new.investor_profile, 'broker', new.profile_broker));
      perform private.complete_process_step(new.id, 'suitability');
    end if;
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
  if new.profile_recorded_at is distinct from old.profile_recorded_at and new.investor_profile is not null then
    perform private.client_event(new.id, 'profile_set', null,
      jsonb_build_object('profile', new.investor_profile, 'from', old.investor_profile, 'broker', new.profile_broker));
    perform private.complete_process_step(new.id, 'suitability');
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

-- Exclusão (LGPD): sem questionários, a retenção considera documentos e reuniões.
create or replace function private.clients_before_delete()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if (exists (select 1 from public.client_documents where client_id = old.id)
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

create or replace function public.client_transfer(p_client uuid, p_workspace uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if not private.is_admin() then
    raise exception 'Só o admin transfere clientes entre workspaces.' using errcode = '42501', hint = 'transfer_admin';
  end if;
  select owner_id into v_owner from public.workspaces where id = p_workspace;
  if v_owner is null then
    raise exception 'Workspace inexistente.' using errcode = '23514';
  end if;

  perform set_config('atreides.transfer', 'on', true);
  update public.clients set workspace_id = p_workspace, family_id = null, family_role = null where id = p_client;
  update public.tasks set workspace_id = p_workspace,
         assignee_id = case when status = 'open' then v_owner else assignee_id end,
         lead_id = null
   where client_id = p_client;
  update public.processes set workspace_id = p_workspace where client_id = p_client;
  update public.client_notes set workspace_id = p_workspace where client_id = p_client;
  update public.client_documents set workspace_id = p_workspace where client_id = p_client;
  update public.client_events set workspace_id = p_workspace where client_id = p_client;
  perform set_config('atreides.transfer', 'off', true);
end;
$$;
