-- =====================================================================
-- 0008 · Carteiras e acompanhamento (Documentação/06)
--
-- Dicionário (documentos em PT → banco em EN):
--   ativos → assets                    cotacoes (cache) → asset_quotes
--   lancamentos → portfolio_transactions
--   saldos (renda fixa/fundos) → portfolio_valuations
--   fotografias → portfolio_snapshots  alocacao_alvo → portfolio_targets
--   aportes → contributions (+ contribution_items)
--
-- Regras:
--   • Bolsa por lançamentos (compra/venda); renda fixa, fundos e previdência
--     por aplicação/resgate e saldo informado com data.
--   • Plano de aportes do período: executar vira compras ligadas ao aporte.
--   • Fotografia congela o patrimônio na data; a primeira é o Marco zero.
--   • Lançamentos e fotografias não são editados: corrigir = excluir (autor
--     ou admin) e lançar de novo, com auditoria.
--   • Frequência de acompanhamento por cliente (mensal ou semanal) com
--     tarefa automática "Atualizar carteiras".
-- =====================================================================

create type public.asset_class as enum (
  'cash', 'inflation', 'prefixed', 'multimarket', 'br_equities', 'reits', 'international', 'alternatives', 'pension'
);
create type public.asset_kind as enum ('listed', 'manual');
create type public.portfolio_frequency as enum ('monthly', 'weekly');
create type public.transaction_type as enum ('buy', 'sell', 'deposit', 'withdrawal');
create type public.contribution_status as enum ('planned', 'executed', 'canceled');

alter type public.client_event_type add value if not exists 'portfolio_snapshot';
alter type public.client_event_type add value if not exists 'contribution_executed';

alter table public.clients
  add column portfolio_frequency public.portfolio_frequency not null default 'monthly',
  add column deviation_limit numeric(5, 2) not null default 5 check (deviation_limit between 1 and 50);

-- ---------------------------------------------------------------------
-- Ativos (catálogo único da consultoria) e cotações em cache
-- ---------------------------------------------------------------------

create table public.assets (
  id           uuid primary key default gen_random_uuid(),
  ticker       text unique check (ticker is null or ticker ~ '^[A-Z0-9]{4,12}$'),
  name         text not null check (char_length(name) between 2 and 200),
  asset_class  public.asset_class not null,
  kind         public.asset_kind not null,
  issuer       text check (char_length(issuer) <= 200),
  created_by   uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at   timestamptz not null default now(),
  constraint assets_listed_needs_ticker check (kind = 'manual' or ticker is not null)
);
comment on table public.assets is 'Ativos usados nas carteiras. Bolsa (cotação automática) ou manual (renda fixa, fundos, previdência).';
create index assets_created_by_idx on public.assets (created_by);
create index assets_name_idx on public.assets (lower(name));

create table public.asset_quotes (
  asset_id    uuid primary key references public.assets (id) on delete cascade,
  price       numeric(20, 6) not null check (price >= 0),
  change_pct  numeric(10, 4),
  currency    text not null default 'BRL',
  quoted_at   timestamptz not null,
  source      text not null,
  fetched_at  timestamptz not null default now()
);
comment on table public.asset_quotes is 'Última cotação conhecida (cache do provedor de dados de mercado).';

-- ---------------------------------------------------------------------
-- Alocação alvo, lançamentos, saldos, fotografias
-- ---------------------------------------------------------------------

create table public.portfolio_targets (
  client_id    uuid not null references public.clients (id) on delete cascade,
  asset_class  public.asset_class not null,
  target_pct   numeric(5, 2) not null check (target_pct between 0 and 100),
  updated_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (client_id, asset_class)
);
create index portfolio_targets_updated_by_idx on public.portfolio_targets (updated_by);

create table public.contributions (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  period_kind   public.portfolio_frequency not null,
  period_start  date not null,
  status        public.contribution_status not null default 'planned',
  notes         text check (char_length(notes) <= 2000),
  executed_at   timestamptz,
  executed_on   date,
  created_by    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now()
);
comment on table public.contributions is 'Plano de aportes do período (mês ou semana).';
create index contributions_client_idx on public.contributions (client_id, period_start desc);
create index contributions_workspace_idx on public.contributions (workspace_id);
create index contributions_created_by_idx on public.contributions (created_by);

create table public.contribution_items (
  id               uuid primary key default gen_random_uuid(),
  contribution_id  uuid not null references public.contributions (id) on delete cascade,
  asset_id         uuid not null references public.assets (id) on delete restrict,
  quantity         numeric(20, 8) not null check (quantity > 0),
  unit_price       numeric(20, 6) not null check (unit_price >= 0),
  amount           numeric(16, 2) generated always as (round(quantity * unit_price, 2)) stored,
  created_at       timestamptz not null default now()
);
create index contribution_items_contribution_idx on public.contribution_items (contribution_id);
create index contribution_items_asset_idx on public.contribution_items (asset_id);

create table public.portfolio_transactions (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  workspace_id     uuid not null references public.workspaces (id) on delete restrict,
  asset_id         uuid not null references public.assets (id) on delete restrict,
  type             public.transaction_type not null,
  trade_date       date not null check (trade_date <= current_date + 1),
  quantity         numeric(20, 8) check (quantity is null or quantity > 0),
  unit_price       numeric(20, 6) check (unit_price is null or unit_price >= 0),
  amount           numeric(16, 2) not null check (amount > 0),
  institution      text check (char_length(institution) <= 120),
  contribution_id  uuid references public.contributions (id) on delete set null,
  notes            text check (char_length(notes) <= 1000),
  created_by       uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at       timestamptz not null default now(),
  constraint portfolio_transactions_trade_fields
    check (type in ('deposit', 'withdrawal') or (quantity is not null and unit_price is not null))
);
comment on table public.portfolio_transactions is 'Lançamentos da carteira: compras/vendas (bolsa) e aplicações/resgates (manuais).';
create index portfolio_transactions_client_idx on public.portfolio_transactions (client_id, trade_date);
create index portfolio_transactions_workspace_idx on public.portfolio_transactions (workspace_id);
create index portfolio_transactions_asset_idx on public.portfolio_transactions (asset_id);
create index portfolio_transactions_contribution_idx on public.portfolio_transactions (contribution_id);
create index portfolio_transactions_created_by_idx on public.portfolio_transactions (created_by);

create table public.portfolio_valuations (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete restrict,
  asset_id      uuid not null references public.assets (id) on delete restrict,
  ref_date      date not null check (ref_date <= current_date + 1),
  value         numeric(16, 2) not null check (value >= 0),
  created_by    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now()
);
comment on table public.portfolio_valuations is 'Saldo informado de ativos manuais (renda fixa, fundos, previdência) numa data.';
create index portfolio_valuations_client_idx on public.portfolio_valuations (client_id, asset_id, ref_date desc);
create index portfolio_valuations_workspace_idx on public.portfolio_valuations (workspace_id);
create index portfolio_valuations_asset_idx on public.portfolio_valuations (asset_id);
create index portfolio_valuations_created_by_idx on public.portfolio_valuations (created_by);

create table public.portfolio_snapshots (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  workspace_id    uuid not null references public.workspaces (id) on delete restrict,
  ref_date        date not null check (ref_date <= current_date + 1),
  total_value     numeric(16, 2) not null check (total_value >= 0),
  invested_total  numeric(16, 2) not null,
  by_class        jsonb not null default '{}',
  positions       jsonb not null default '[]',
  created_by      uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at      timestamptz not null default now()
);
comment on table public.portfolio_snapshots is 'Fotografia da carteira numa data. A primeira do cliente é o Marco zero.';
create index portfolio_snapshots_client_idx on public.portfolio_snapshots (client_id, ref_date, created_at);
create index portfolio_snapshots_workspace_idx on public.portfolio_snapshots (workspace_id);
create index portfolio_snapshots_created_by_idx on public.portfolio_snapshots (created_by);

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

-- Workspace sempre o do cliente; autor sempre quem está logado.
create function private.portfolio_row_defaults()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select workspace_id into new.workspace_id from public.clients where id = new.client_id;
  if new.workspace_id is null then
    raise exception 'Cliente inexistente.' using errcode = '23503';
  end if;
  new.created_by := coalesce((select auth.uid()), new.created_by);
  return new;
end;
$$;

create trigger portfolio_transactions_defaults before insert on public.portfolio_transactions
  for each row execute function private.portfolio_row_defaults();
create trigger portfolio_valuations_defaults before insert on public.portfolio_valuations
  for each row execute function private.portfolio_row_defaults();
create trigger portfolio_snapshots_defaults before insert on public.portfolio_snapshots
  for each row execute function private.portfolio_row_defaults();
create trigger contributions_defaults before insert on public.contributions
  for each row execute function private.portfolio_row_defaults();

-- Lançamento de aporte: o ativo e o cliente precisam bater com o aporte.
create function private.portfolio_transactions_check()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_kind public.asset_kind;
begin
  select kind into v_kind from public.assets where id = new.asset_id;
  if v_kind = 'listed' and new.type in ('deposit', 'withdrawal') then
    raise exception 'Ativo de bolsa usa compra e venda.' using errcode = '23514', hint = 'type_listed';
  end if;
  if v_kind = 'manual' and new.type in ('buy', 'sell') and new.quantity is null then
    raise exception 'Informe quantidade e preço.' using errcode = '23514', hint = 'type_manual';
  end if;
  if new.contribution_id is not null and not exists (
    select 1 from public.contributions where id = new.contribution_id and client_id = new.client_id
  ) then
    raise exception 'O aporte é de outro cliente.' using errcode = '23514', hint = 'contribution_client';
  end if;
  return new;
end;
$$;

create trigger portfolio_transactions_check before insert on public.portfolio_transactions
  for each row execute function private.portfolio_transactions_check();

-- Fotografia entra na linha do tempo do cliente.
create function private.portfolio_snapshots_event()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform private.client_event(new.client_id, 'portfolio_snapshot', null,
    jsonb_build_object('ref_date', new.ref_date, 'total', new.total_value,
                       'baseline', not exists (select 1 from public.portfolio_snapshots where client_id = new.client_id and id <> new.id)));
  return new;
end;
$$;

create trigger portfolio_snapshots_event after insert on public.portfolio_snapshots
  for each row execute function private.portfolio_snapshots_event();

-- Aporte: só muda de status; executado não volta a planejado.
create function private.contributions_before_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.client_id := old.client_id;
  new.workspace_id := old.workspace_id;
  new.created_by := old.created_by;
  if old.status = 'executed' and new.status <> 'executed' then
    raise exception 'Aporte executado não volta atrás.' using errcode = '23514', hint = 'contribution_executed';
  end if;
  if new.status = 'executed' and old.status <> 'executed' then
    new.executed_at := now();
    new.executed_on := coalesce(new.executed_on, current_date);
  end if;
  return new;
end;
$$;

create trigger contributions_before_update before update on public.contributions
  for each row execute function private.contributions_before_update();

-- Itens só se mexem enquanto o aporte está planejado.
create function private.contribution_items_guard()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce(new.contribution_id, old.contribution_id);
begin
  if exists (select 1 from public.contributions where id = v_id and status <> 'planned') then
    raise exception 'Aporte já executado ou cancelado.' using errcode = '23514', hint = 'contribution_locked';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger contribution_items_guard before insert or update or delete on public.contribution_items
  for each row execute function private.contribution_items_guard();

-- Executa o aporte: cada item vira uma compra na data informada (com as permissões de quem chama).
create function public.contribution_execute(p_contribution uuid, p_date date, p_institution text default null)
returns void
language plpgsql security invoker
set search_path = ''
as $$
declare
  v public.contributions;
begin
  select * into v from public.contributions where id = p_contribution for update;
  if not found then
    raise exception 'Aporte não encontrado.' using errcode = '23503';
  end if;
  if v.status <> 'planned' then
    raise exception 'Aporte já executado ou cancelado.' using errcode = '23514', hint = 'contribution_locked';
  end if;
  if not exists (select 1 from public.contribution_items where contribution_id = p_contribution) then
    raise exception 'Aporte sem itens.' using errcode = '23514', hint = 'contribution_empty';
  end if;

  insert into public.portfolio_transactions (client_id, workspace_id, asset_id, type, trade_date, quantity, unit_price, amount, institution, contribution_id)
  select v.client_id, v.workspace_id, i.asset_id, 'buy', p_date, i.quantity, i.unit_price, i.amount, nullif(trim(p_institution), ''), v.id
  from public.contribution_items i where i.contribution_id = p_contribution;

  update public.contributions set status = 'executed', executed_on = p_date where id = p_contribution;
  perform private.client_event(v.client_id, 'contribution_executed', null,
    jsonb_build_object('total', (select sum(amount) from public.contribution_items where contribution_id = p_contribution), 'date', p_date));
end;
$$;
revoke execute on function public.contribution_execute(uuid, date, text) from public, anon;
grant execute on function public.contribution_execute(uuid, date, text) to authenticated;

-- Exclusões de lançamentos, saldos e fotografias ficam na auditoria.
create function private.portfolio_audit_delete()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (user_id, workspace_id, action, table_name, record_id, before)
  values ((select auth.uid()), old.workspace_id, 'portfolio_deleted', tg_table_name, old.id::text, to_jsonb(old));
  return old;
end;
$$;

create trigger portfolio_transactions_audit_delete after delete on public.portfolio_transactions
  for each row execute function private.portfolio_audit_delete();
create trigger portfolio_valuations_audit_delete after delete on public.portfolio_valuations
  for each row execute function private.portfolio_audit_delete();
create trigger portfolio_snapshots_audit_delete after delete on public.portfolio_snapshots
  for each row execute function private.portfolio_audit_delete();

create trigger portfolio_transactions_audit_other after insert on public.portfolio_transactions
  for each row execute function private.audit_other_workspace();
create trigger portfolio_snapshots_audit_other after insert on public.portfolio_snapshots
  for each row execute function private.audit_other_workspace();

-- ---------------------------------------------------------------------
-- Tarefa automática "Atualizar carteiras" (mensal: dia 1; semanal: segunda)
-- ---------------------------------------------------------------------

create function private.create_portfolio_update_tasks(p_frequency public.portfolio_frequency)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_periodo text := case when p_frequency = 'monthly' then to_char(current_date, 'YYYY-MM') else to_char(current_date, 'IYYY-"S"IW') end;
begin
  insert into public.tasks (workspace_id, title, description, due_on, assignee_id, origin, created_by, system_key)
  select w.id,
         case when p_frequency = 'monthly' then 'Atualizar carteiras do mês' else 'Atualizar carteiras da semana' end
           || ' (' || count(c.id) || ')',
         string_agg(c.full_name, ', ' order by c.full_name),
         current_date + 3, w.owner_id, 'system', w.owner_id,
         'portfolio_update:' || p_frequency || ':' || w.id || ':' || v_periodo
  from public.workspaces w
  join public.clients c on c.workspace_id = w.id and c.status in ('onboarding', 'active') and c.portfolio_frequency = p_frequency
  group by w.id, w.owner_id
  on conflict (system_key) where status = 'open' and system_key is not null do nothing;
end;
$$;

select cron.schedule('atreides-carteiras-mensal', '0 11 1 * *', $cron$select private.create_portfolio_update_tasks('monthly')$cron$);
select cron.schedule('atreides-carteiras-semanal', '0 11 * * 1', $cron$select private.create_portfolio_update_tasks('weekly')$cron$);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.assets enable row level security;
alter table public.asset_quotes enable row level security;
alter table public.portfolio_targets enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_items enable row level security;
alter table public.portfolio_transactions enable row level security;
alter table public.portfolio_valuations enable row level security;
alter table public.portfolio_snapshots enable row level security;

create policy "assets: membros leem" on public.assets for select to authenticated using ((select private.is_active_member()));
create policy "assets: membros criam" on public.assets for insert to authenticated with check ((select private.is_active_member()));
create policy "assets: membros editam" on public.assets for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));

create policy "asset_quotes: membros leem" on public.asset_quotes for select to authenticated using ((select private.is_active_member()));
create policy "asset_quotes: membros gravam" on public.asset_quotes for insert to authenticated with check ((select private.is_active_member()));
create policy "asset_quotes: membros atualizam" on public.asset_quotes for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));

create policy "portfolio_targets: membros leem" on public.portfolio_targets for select to authenticated using ((select private.is_active_member()));
create policy "portfolio_targets: membros gravam" on public.portfolio_targets for insert to authenticated with check ((select private.is_active_member()));
create policy "portfolio_targets: membros editam" on public.portfolio_targets for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));
create policy "portfolio_targets: membros removem" on public.portfolio_targets for delete to authenticated using ((select private.is_active_member()));

create policy "contributions: membros leem" on public.contributions for select to authenticated using ((select private.is_active_member()));
create policy "contributions: membros criam" on public.contributions for insert to authenticated with check ((select private.is_active_member()));
create policy "contributions: membros editam" on public.contributions for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));
create policy "contributions: autor ou admin exclui planejado" on public.contributions for delete to authenticated
  using ((select private.is_active_member()) and status = 'planned' and (created_by = (select auth.uid()) or (select private.is_admin())));

create policy "contribution_items: membros leem" on public.contribution_items for select to authenticated using ((select private.is_active_member()));
create policy "contribution_items: membros gravam" on public.contribution_items for insert to authenticated with check ((select private.is_active_member()));
create policy "contribution_items: membros editam" on public.contribution_items for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));
create policy "contribution_items: membros removem" on public.contribution_items for delete to authenticated using ((select private.is_active_member()));

create policy "portfolio_transactions: membros leem" on public.portfolio_transactions for select to authenticated using ((select private.is_active_member()));
create policy "portfolio_transactions: membros lançam" on public.portfolio_transactions for insert to authenticated with check ((select private.is_active_member()));
create policy "portfolio_transactions: autor ou admin exclui" on public.portfolio_transactions for delete to authenticated
  using ((select private.is_active_member()) and (created_by = (select auth.uid()) or (select private.is_admin())));

create policy "portfolio_valuations: membros leem" on public.portfolio_valuations for select to authenticated using ((select private.is_active_member()));
create policy "portfolio_valuations: membros informam" on public.portfolio_valuations for insert to authenticated with check ((select private.is_active_member()));
create policy "portfolio_valuations: autor ou admin exclui" on public.portfolio_valuations for delete to authenticated
  using ((select private.is_active_member()) and (created_by = (select auth.uid()) or (select private.is_admin())));

create policy "portfolio_snapshots: membros leem" on public.portfolio_snapshots for select to authenticated using ((select private.is_active_member()));
create policy "portfolio_snapshots: membros registram" on public.portfolio_snapshots for insert to authenticated with check ((select private.is_active_member()));
create policy "portfolio_snapshots: admin exclui" on public.portfolio_snapshots for delete to authenticated using ((select private.is_admin()));
