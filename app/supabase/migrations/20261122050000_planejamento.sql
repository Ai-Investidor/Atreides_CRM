-- =====================================================================
-- 0012 · Planejamento (Documentação/05)
--
-- Dicionário (documentos em PT → banco em EN):
--   planejamento → plans; alocação → plan_allocations; objetivos → plan_goals;
--   versões → plan_versions; aporte mensal → monthly_contribution;
--   CDI/IPCA de referência → cdi_ref / ipca_ref (% ao ano)
--   premissa: % do CDI → cdi_pct; IPCA + x% → ipca_plus; prefixado → prefixed
--
-- Regras:
--   • Um planejamento por cliente; salvar passa por public.plan_save (tudo ou nada).
--   • Alocação soma 100%; premissa por classe escrita pelo consultor (sem número pronto).
--   • Cada salvamento guarda a versão anterior completa (snapshot).
--   • Salvar atualiza o alvo da carteira; com planejamento, a carteira não edita o alvo.
--   • Tarefa "Revisar planejamento" 6 meses depois do último salvamento.
-- =====================================================================

alter type public.client_event_type add value if not exists 'plan_updated';
create type public.plan_premise as enum ('cdi_pct', 'ipca_plus', 'prefixed');

create table public.plans (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces (id) on delete restrict,
  client_id             uuid not null unique references public.clients (id) on delete cascade,
  content_md            text not null default '' check (char_length(content_md) <= 100000),
  monthly_contribution  numeric(14, 2) check (monthly_contribution >= 0),
  cdi_ref               numeric(6, 3) check (cdi_ref between 0 and 100),
  ipca_ref              numeric(6, 3) check (ipca_ref between 0 and 100),
  version               int not null default 1,
  created_by            uuid not null references public.profiles (id) on delete restrict,
  updated_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.plans is 'Planejamento do cliente: texto em markdown, aporte, referências de CDI/IPCA. Gravado só por public.plan_save.';
create index plans_workspace_idx on public.plans (workspace_id);
create index plans_created_by_idx on public.plans (created_by);
create index plans_updated_by_idx on public.plans (updated_by);

create table public.plan_allocations (
  plan_id        uuid not null references public.plans (id) on delete cascade,
  asset_class    public.asset_class not null,
  target_pct     numeric(5, 2) not null check (target_pct between 0 and 100),
  premise_kind   public.plan_premise,
  premise_value  numeric(7, 3),
  primary key (plan_id, asset_class),
  constraint plan_allocations_premise check ((premise_kind is null) = (premise_value is null)),
  constraint plan_allocations_premise_range check (
    premise_kind is null
    or (premise_kind = 'cdi_pct' and premise_value between 0 and 300)
    or (premise_kind in ('ipca_plus', 'prefixed') and premise_value between -20 and 100))
);
comment on table public.plan_allocations is 'Alocação alvo do planejamento por classe, com a premissa escrita pelo consultor.';

create table public.plan_goals (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.plans (id) on delete cascade,
  position      smallint not null,
  name          text not null check (char_length(name) between 1 and 120),
  target_value  numeric(14, 2) not null check (target_value > 0),
  target_date   date not null,
  saved_value   numeric(14, 2) not null default 0 check (saved_value >= 0)
);
comment on table public.plan_goals is 'Objetivos do planejamento (valores em reais de hoje).';
create index plan_goals_plan_idx on public.plan_goals (plan_id, position);

create table public.plan_versions (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.plans (id) on delete cascade,
  version    int not null,
  snapshot   jsonb not null,
  saved_by   uuid references public.profiles (id) on delete set null,
  saved_at   timestamptz not null,
  unique (plan_id, version)
);
comment on table public.plan_versions is 'Versões anteriores completas do planejamento. Gravadas só pelo banco.';
create index plan_versions_saved_by_idx on public.plan_versions (saved_by);

create trigger plans_audit_other after insert or update on public.plans
  for each row execute function private.audit_other_workspace();

-- ---------------------------------------------------------------------
-- Salvar (tudo ou nada)
-- ---------------------------------------------------------------------

create function public.plan_save(
  p_client uuid,
  p_content text,
  p_contribution numeric,
  p_cdi numeric,
  p_ipca numeric,
  p_allocations jsonb,
  p_goals jsonb
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_client public.clients;
  v_plan   public.plans;
  v_soma   numeric;
begin
  if not private.is_active_member() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select * into v_client from public.clients where id = p_client;
  if v_client.id is null then
    raise exception 'Cliente inexistente.' using errcode = '23514', hint = 'plan_client';
  end if;
  if v_client.status = 'closed' then
    raise exception 'Cliente encerrado.' using errcode = '23514', hint = 'plan_closed';
  end if;
  if jsonb_typeof(coalesce(p_allocations, '[]')) <> 'array' or jsonb_typeof(coalesce(p_goals, '[]')) <> 'array' then
    raise exception 'Formato inválido.' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_goals, '[]')) > 30 then
    raise exception 'Até 30 objetivos.' using errcode = '23514', hint = 'plan_goals_max';
  end if;
  select coalesce(sum((a->>'target_pct')::numeric), 0) into v_soma from jsonb_array_elements(coalesce(p_allocations, '[]')) a;
  if jsonb_array_length(coalesce(p_allocations, '[]')) > 0 and abs(v_soma - 100) > 0.01 then
    raise exception 'A alocação precisa somar 100%%.' using errcode = '23514', hint = 'plan_allocation_sum';
  end if;

  select * into v_plan from public.plans where client_id = p_client for update;
  if v_plan.id is null then
    insert into public.plans (workspace_id, client_id, content_md, monthly_contribution, cdi_ref, ipca_ref, version, created_by, updated_by)
    values (v_client.workspace_id, p_client, coalesce(p_content, ''), p_contribution, p_cdi, p_ipca, 1, v_uid, v_uid)
    returning * into v_plan;
  else
    insert into public.plan_versions (plan_id, version, snapshot, saved_by, saved_at)
    values (v_plan.id, v_plan.version, jsonb_build_object(
      'content_md', v_plan.content_md,
      'monthly_contribution', v_plan.monthly_contribution,
      'cdi_ref', v_plan.cdi_ref,
      'ipca_ref', v_plan.ipca_ref,
      'allocations', coalesce((select jsonb_agg(to_jsonb(a) - 'plan_id') from public.plan_allocations a where a.plan_id = v_plan.id), '[]'),
      'goals', coalesce((select jsonb_agg(to_jsonb(g) - 'plan_id' - 'id' order by g.position) from public.plan_goals g where g.plan_id = v_plan.id), '[]')
    ), v_plan.updated_by, v_plan.updated_at);
    update public.plans
       set content_md = coalesce(p_content, ''), monthly_contribution = p_contribution, cdi_ref = p_cdi, ipca_ref = p_ipca,
           version = v_plan.version + 1, updated_by = v_uid, updated_at = now()
     where id = v_plan.id
    returning * into v_plan;
    delete from public.plan_allocations where plan_id = v_plan.id;
    delete from public.plan_goals where plan_id = v_plan.id;
  end if;

  insert into public.plan_allocations (plan_id, asset_class, target_pct, premise_kind, premise_value)
  select v_plan.id, (a->>'asset_class')::public.asset_class, (a->>'target_pct')::numeric,
         nullif(a->>'premise_kind', '')::public.plan_premise, (a->>'premise_value')::numeric
  from jsonb_array_elements(coalesce(p_allocations, '[]')) a;

  insert into public.plan_goals (plan_id, position, name, target_value, target_date, saved_value)
  select v_plan.id, (g.ord - 1)::smallint, trim(g.val->>'name'), (g.val->>'target_value')::numeric,
         (g.val->>'target_date')::date, coalesce((g.val->>'saved_value')::numeric, 0)
  from jsonb_array_elements(coalesce(p_goals, '[]')) with ordinality as g(val, ord);

  -- Alvo da carteira = alocação do planejamento.
  perform set_config('atreides.plan_sync', 'on', true);
  delete from public.portfolio_targets where client_id = p_client;
  insert into public.portfolio_targets (client_id, asset_class, target_pct, updated_by)
  select p_client, asset_class, target_pct, v_uid from public.plan_allocations where plan_id = v_plan.id and target_pct > 0;
  perform set_config('atreides.plan_sync', 'off', true);

  perform private.client_event(p_client, 'plan_updated', null, jsonb_build_object('version', v_plan.version));
  perform private.complete_process_step(p_client, 'plan');
  update public.tasks set status = 'done' where system_key = 'plan_review:' || p_client and status = 'open';
  return v_plan.id;
end;
$$;

revoke execute on function public.plan_save(uuid, text, numeric, numeric, numeric, jsonb, jsonb) from public, anon;
grant execute on function public.plan_save(uuid, text, numeric, numeric, numeric, jsonb, jsonb) to authenticated;

-- Com planejamento salvo, o alvo da carteira só muda pelo planejamento.
create function private.portfolio_targets_guard()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_client uuid := coalesce(new.client_id, old.client_id);
begin
  if current_setting('atreides.plan_sync', true) is distinct from 'on'
     and exists (select 1 from public.clients where id = v_client)
     and exists (select 1 from public.plan_allocations a join public.plans p on p.id = a.plan_id where p.client_id = v_client) then
    raise exception 'O alvo da carteira vem do planejamento.' using errcode = '23514', hint = 'target_from_plan';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger portfolio_targets_guard
  before insert or update or delete on public.portfolio_targets
  for each row execute function private.portfolio_targets_guard();

-- Revisão: tarefa 15 dias antes de completar 6 meses do último salvamento.
create function private.create_plan_review_tasks()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.tasks (workspace_id, title, due_on, assignee_id, client_id, origin, created_by, system_key)
  select c.workspace_id, 'Revisar planejamento · ' || c.full_name, (p.updated_at + interval '6 months')::date,
         w.owner_id, c.id, 'system', w.owner_id, 'plan_review:' || c.id
  from public.plans p
  join public.clients c on c.id = p.client_id
  join public.workspaces w on w.id = c.workspace_id
  where c.status in ('onboarding', 'active')
    and current_date >= (p.updated_at + interval '6 months' - interval '15 days')::date
  on conflict (system_key) where status = 'open' and system_key is not null do nothing;
end;
$$;

select cron.schedule('atreides-revisao-planejamento', '15 11 * * *', $cron$select private.create_plan_review_tasks()$cron$);

-- Transferência de cliente: o planejamento vai junto.
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
  update public.plans set workspace_id = p_workspace where client_id = p_client;
  perform set_config('atreides.transfer', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------
-- RLS: leitura pelos membros; escrita só por public.plan_save.
-- ---------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.plan_allocations enable row level security;
alter table public.plan_goals enable row level security;
alter table public.plan_versions enable row level security;

create policy "plans: membros leem" on public.plans for select to authenticated using ((select private.is_active_member()));
create policy "plan_allocations: membros leem" on public.plan_allocations for select to authenticated using ((select private.is_active_member()));
create policy "plan_goals: membros leem" on public.plan_goals for select to authenticated using ((select private.is_active_member()));
create policy "plan_versions: membros leem" on public.plan_versions for select to authenticated using ((select private.is_active_member()));
