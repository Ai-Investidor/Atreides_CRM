-- =====================================================================
-- 0011 · Diagnóstico (Documentação/14)
--
-- Dicionário (documentos em PT → banco em EN):
--   diagnóstico → diagnoses; versões → diagnosis_versions
--   texto (markdown) → content_md; despesa mensal → monthly_expense;
--   idade pretendida para se aposentar → retirement_age
--
-- Regras:
--   • Um diagnóstico por lead e por cliente; nasce no lead e passa ao cliente na conversão.
--   • Cada salvamento guarda a versão anterior (texto e campos), com data e autor.
--   • Salvar com texto conclui a etapa "diagnosis" do processo do cliente.
--   • Lead excluído sem ter virado cliente leva o diagnóstico junto.
--   • Acompanha o cliente na transferência de workspace.
-- =====================================================================

alter type public.client_event_type add value if not exists 'diagnosis_updated';

create table public.diagnoses (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete restrict,
  lead_id          uuid unique references public.leads (id) on delete set null,
  client_id        uuid unique references public.clients (id) on delete cascade,
  content_md       text not null default '' check (char_length(content_md) <= 100000),
  monthly_expense  numeric(14, 2) check (monthly_expense >= 0),
  retirement_age   smallint check (retirement_age between 30 and 100),
  version          int not null default 1,
  created_by       uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint diagnoses_owner check (lead_id is not null or client_id is not null)
);
comment on table public.diagnoses is 'Diagnóstico do lead/cliente em markdown (objetivos, dores, sonhos, planejamento, aposentadoria).';
create index diagnoses_workspace_idx on public.diagnoses (workspace_id);
create index diagnoses_created_by_idx on public.diagnoses (created_by);
create index diagnoses_updated_by_idx on public.diagnoses (updated_by);

create table public.diagnosis_versions (
  id               uuid primary key default gen_random_uuid(),
  diagnosis_id     uuid not null references public.diagnoses (id) on delete cascade,
  version          int not null,
  content_md       text not null,
  monthly_expense  numeric(14, 2),
  retirement_age   smallint,
  saved_by         uuid references public.profiles (id) on delete set null,
  saved_at         timestamptz not null,
  unique (diagnosis_id, version)
);
comment on table public.diagnosis_versions is 'Versões anteriores do diagnóstico. Gravadas só pelo banco; não mudam.';
create index diagnosis_versions_saved_by_idx on public.diagnosis_versions (saved_by);

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

create function private.diagnoses_before_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ws  uuid;
begin
  if tg_op = 'INSERT' then
    if new.client_id is not null then
      select workspace_id into v_ws from public.clients where id = new.client_id;
    else
      select workspace_id into v_ws from public.leads where id = new.lead_id;
    end if;
    if v_ws is null then
      raise exception 'Lead ou cliente inexistente.' using errcode = '23514', hint = 'diagnosis_owner';
    end if;
    new.workspace_id := v_ws;
    new.created_by := coalesce(v_uid, new.created_by);
    new.updated_by := coalesce(v_uid, new.created_by);
    new.version := 1;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  new.id := old.id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  -- Lead só some (exclusão do lead); cliente só é ligado uma vez (conversão).
  new.lead_id := case when new.lead_id is null then null else old.lead_id end;
  new.client_id := coalesce(old.client_id, new.client_id);
  if current_setting('atreides.transfer', true) is distinct from 'on' then
    new.workspace_id := old.workspace_id;
  end if;

  if (new.content_md, new.monthly_expense, new.retirement_age)
     is distinct from (old.content_md, old.monthly_expense, old.retirement_age) then
    insert into public.diagnosis_versions (diagnosis_id, version, content_md, monthly_expense, retirement_age, saved_by, saved_at)
    values (old.id, old.version, old.content_md, old.monthly_expense, old.retirement_age, old.updated_by, old.updated_at);
    new.version := old.version + 1;
    new.updated_by := v_uid;
    new.updated_at := now();
  else
    new.version := old.version;
    new.updated_by := old.updated_by;
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

create trigger diagnoses_before_write
  before insert or update on public.diagnoses
  for each row execute function private.diagnoses_before_write();

create function private.diagnoses_after_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.client_id is null then
    return new;
  end if;
  if tg_op = 'INSERT' or new.version <> old.version then
    perform private.client_event(new.client_id, 'diagnosis_updated', null, jsonb_build_object('version', new.version));
    if nullif(trim(new.content_md), '') is not null then
      perform private.complete_process_step(new.client_id, 'diagnosis');
    end if;
  end if;
  return new;
end;
$$;

create trigger diagnoses_after_write
  after insert or update on public.diagnoses
  for each row execute function private.diagnoses_after_write();

create trigger diagnoses_audit_other after insert or update on public.diagnoses
  for each row execute function private.audit_other_workspace();

-- Conversão do lead: o diagnóstico passa para o cliente e conclui a etapa do onboarding.
-- (Nome em ordem alfabética depois de clients_after_write, que cria o processo.)
create function private.clients_diagnosis_link()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_diag public.diagnoses;
begin
  if new.lead_id is null then
    return new;
  end if;
  update public.diagnoses set client_id = new.id
   where lead_id = new.lead_id and client_id is null
  returning * into v_diag;
  if v_diag.id is not null then
    perform private.client_event(new.id, 'diagnosis_updated', null, jsonb_build_object('version', v_diag.version, 'from_lead', true));
    if nullif(trim(v_diag.content_md), '') is not null then
      perform private.complete_process_step(new.id, 'diagnosis');
    end if;
  end if;
  return new;
end;
$$;

create trigger clients_diagnosis_link
  after insert on public.clients
  for each row execute function private.clients_diagnosis_link();

-- Lead excluído sem ter virado cliente leva o diagnóstico junto.
create function private.leads_delete_diagnosis()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.diagnoses where lead_id = old.id and client_id is null;
  return old;
end;
$$;

create trigger leads_delete_diagnosis
  before delete on public.leads
  for each row execute function private.leads_delete_diagnosis();

-- Etapas do processo: o diagnóstico deixa de ser só "financeiro".
update public.process_template_steps set title = 'Concluir o diagnóstico'
 where code = 'diagnosis' and template_id = (select id from public.process_templates where code = 'onboarding');
update public.process_template_steps set title = 'Fazer o diagnóstico'
 where code = 'diagnosis' and template_id = (select id from public.process_templates where code = 'migration');
update public.tasks set title = replace(title, 'diagnóstico financeiro', 'diagnóstico')
 where status = 'open' and title like '%diagnóstico financeiro%';

-- Transferência de cliente: o diagnóstico vai junto.
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
  update public.diagnoses set workspace_id = p_workspace where client_id = p_client;
  perform set_config('atreides.transfer', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.diagnoses enable row level security;
alter table public.diagnosis_versions enable row level security;

create policy "diagnoses: membros leem" on public.diagnoses for select to authenticated using ((select private.is_active_member()));
create policy "diagnoses: membros criam" on public.diagnoses for insert to authenticated with check ((select private.is_active_member()));
create policy "diagnoses: membros editam" on public.diagnoses for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));
create policy "diagnoses: admin exclui" on public.diagnoses for delete to authenticated using ((select private.is_admin()));

create policy "diagnosis_versions: membros leem" on public.diagnosis_versions for select to authenticated using ((select private.is_active_member()));
