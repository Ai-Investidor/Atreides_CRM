-- =====================================================================
-- 0009 · Pesquisa de ativos (Documentação/13) e Relatórios (Documentação/08)
--
-- Dicionário (documentos em PT → banco em EN):
--   cache de dados de mercado → market_cache
--   lista de acompanhamento → watchlist_items
--   índices (CDI, IPCA) → benchmark_rates
--   relatorios → reports
--
-- Regras:
--   • Cache de mercado e índices gravados pelo servidor do Atreides; a tela
--     sempre mostra a data do dado.
--   • Lista de acompanhamento é pessoal (cada consultor vê a sua).
--   • Relatório aprovado não muda: comentário obrigatório para aprovar;
--     nova versão do mesmo período marca a anterior como substituída.
--   • Aprovação e envio entram na linha do tempo do cliente.
--   • Tarefa "Gerar relatório" na periodicidade de cada cliente.
-- =====================================================================

create type public.report_frequency as enum ('monthly', 'quarterly', 'semiannual');
create type public.report_status as enum ('draft', 'approved', 'superseded');

alter type public.client_event_type add value if not exists 'report_approved';
alter type public.client_event_type add value if not exists 'report_sent';

alter table public.clients add column report_frequency public.report_frequency not null default 'monthly';

-- ---------------------------------------------------------------------
-- Dados de mercado em cache e lista de acompanhamento
-- ---------------------------------------------------------------------

create table public.market_cache (
  ticker      text not null check (ticker ~ '^[A-Z0-9]{4,12}$'),
  kind        text not null check (kind in ('perfil', 'historico', 'proventos')),
  data        jsonb not null,
  source      text not null,
  fetched_at  timestamptz not null default now(),
  primary key (ticker, kind)
);
comment on table public.market_cache is 'Cache de indicadores, histórico de preços e proventos por ticker.';

create table public.watchlist_items (
  user_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  ticker    text not null check (ticker ~ '^[A-Z0-9]{4,12}$'),
  name      text not null check (char_length(name) between 1 and 200),
  added_at  timestamptz not null default now(),
  primary key (user_id, ticker)
);
comment on table public.watchlist_items is 'Lista de acompanhamento de ativos de cada consultor.';

-- ---------------------------------------------------------------------
-- Índices de referência (Banco Central / SGS)
-- ---------------------------------------------------------------------

create table public.benchmark_rates (
  series    text not null check (series in ('cdi', 'ipca')),
  ref_date  date not null,
  value     numeric(12, 8) not null,
  primary key (series, ref_date)
);
comment on table public.benchmark_rates is 'CDI (% ao dia, série SGS 12) e IPCA (% no mês, série SGS 433), copiados do Banco Central.';

-- ---------------------------------------------------------------------
-- Relatórios
-- ---------------------------------------------------------------------

create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  workspace_id   uuid not null references public.workspaces (id) on delete restrict,
  period_start   date not null,
  period_end     date not null,
  status         public.report_status not null default 'draft',
  version        int not null default 1,
  comment        text check (char_length(comment) <= 10000),
  data           jsonb,
  pdf_path       text unique,
  approved_by    uuid references public.profiles (id) on delete set null,
  approved_at    timestamptz,
  sent_at        timestamptz,
  sent_channels  text[] not null default '{}',
  sent_by        uuid references public.profiles (id) on delete set null,
  created_by     uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint reports_period check (period_end >= period_start),
  constraint reports_approved_needs_comment
    check (status = 'draft' or (nullif(trim(comment), '') is not null and data is not null and approved_at is not null))
);
comment on table public.reports is 'Relatórios periódicos do cliente. Aprovado não muda; nova versão substitui a anterior.';
create index reports_client_idx on public.reports (client_id, period_end desc);
create index reports_workspace_idx on public.reports (workspace_id);
create index reports_created_by_idx on public.reports (created_by);
create index reports_approved_by_idx on public.reports (approved_by);
create index reports_sent_by_idx on public.reports (sent_by);

create function private.reports_before_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    select workspace_id into new.workspace_id from public.clients where id = new.client_id;
    new.created_by := coalesce(v_uid, new.created_by);
    new.status := 'draft';
    new.approved_at := null;
    new.approved_by := null;
    new.sent_at := null;
    new.sent_channels := '{}';
    new.version := coalesce((select max(version) from public.reports
                             where client_id = new.client_id and period_start = new.period_start and period_end = new.period_end), 0) + 1;
    return new;
  end if;

  new.client_id := old.client_id;
  new.workspace_id := old.workspace_id;
  new.created_by := old.created_by;
  new.version := old.version;
  new.updated_at := now();

  if old.status <> 'draft' then
    -- Aprovado: só registra envio ou passa a substituído.
    if (new.comment, new.data, new.period_start, new.period_end, new.pdf_path, new.approved_at, new.approved_by)
       is distinct from (old.comment, old.data, old.period_start, old.period_end, old.pdf_path, old.approved_at, old.approved_by)
       or (new.status = 'draft') or (old.status = 'superseded' and new.status <> 'superseded') then
      raise exception 'Relatório aprovado não muda. Gere uma nova versão.' using errcode = '23514', hint = 'report_locked';
    end if;
    if new.sent_at is distinct from old.sent_at and new.sent_at is not null then
      new.sent_by := v_uid;
    end if;
    return new;
  end if;

  if new.status = 'approved' then
    new.approved_at := now();
    new.approved_by := v_uid;
  elsif new.status = 'superseded' then
    raise exception 'Rascunho não pode ser substituído.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger reports_before_write
  before insert or update on public.reports
  for each row execute function private.reports_before_write();

create function private.reports_after_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status = 'draft' then
    -- Versões anteriores aprovadas do mesmo período passam a substituídas.
    update public.reports set status = 'superseded'
     where client_id = new.client_id and period_start = new.period_start and period_end = new.period_end
       and id <> new.id and status = 'approved';
    perform private.client_event(new.client_id, 'report_approved', null,
      jsonb_build_object('report_id', new.id, 'inicio', new.period_start, 'fim', new.period_end, 'versao', new.version));
    -- Conclui a tarefa automática do período, se houver.
    update public.tasks set status = 'done'
     where system_key = 'report:' || new.client_id || ':' || new.period_end and status = 'open';
  end if;
  if new.sent_at is not null and old.sent_at is null then
    perform private.client_event(new.client_id, 'report_sent', null,
      jsonb_build_object('report_id', new.id, 'canais', new.sent_channels, 'inicio', new.period_start, 'fim', new.period_end));
  end if;
  return new;
end;
$$;

create trigger reports_after_update
  after update on public.reports
  for each row execute function private.reports_after_update();

create trigger reports_audit_other after insert or update on public.reports
  for each row execute function private.audit_other_workspace();

-- Tarefa "Gerar relatório" no dia seguinte ao fim do período de cada cliente.
create function private.create_report_tasks()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_fim date := current_date - 1;
  v_mes int := extract(month from current_date)::int;
begin
  if extract(day from current_date) <> 1 then
    return;
  end if;
  insert into public.tasks (workspace_id, title, due_on, assignee_id, client_id, origin, created_by, system_key)
  select c.workspace_id,
         'Gerar relatório · ' || c.full_name,
         current_date + 5, w.owner_id, c.id, 'system', w.owner_id,
         'report:' || c.id || ':' || v_fim
  from public.clients c
  join public.workspaces w on w.id = c.workspace_id
  where c.status in ('onboarding', 'active')
    and (c.report_frequency = 'monthly'
         or (c.report_frequency = 'quarterly' and v_mes in (1, 4, 7, 10))
         or (c.report_frequency = 'semiannual' and v_mes in (1, 7)))
  on conflict (system_key) where status = 'open' and system_key is not null do nothing;
end;
$$;

select cron.schedule('atreides-relatorios', '0 11 1 * *', $cron$select private.create_report_tasks()$cron$);

-- ---------------------------------------------------------------------
-- RLS e armazenamento
-- ---------------------------------------------------------------------

alter table public.market_cache enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.benchmark_rates enable row level security;
alter table public.reports enable row level security;

create policy "market_cache: membros leem" on public.market_cache for select to authenticated using ((select private.is_active_member()));
create policy "market_cache: membros gravam" on public.market_cache for insert to authenticated with check ((select private.is_active_member()));
create policy "market_cache: membros atualizam" on public.market_cache for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));

create policy "watchlist: dono lê" on public.watchlist_items for select to authenticated using (user_id = (select auth.uid()) and (select private.is_active_member()));
create policy "watchlist: dono adiciona" on public.watchlist_items for insert to authenticated with check (user_id = (select auth.uid()) and (select private.is_active_member()));
create policy "watchlist: dono remove" on public.watchlist_items for delete to authenticated using (user_id = (select auth.uid()));

create policy "benchmark_rates: membros leem" on public.benchmark_rates for select to authenticated using ((select private.is_active_member()));
create policy "benchmark_rates: membros gravam" on public.benchmark_rates for insert to authenticated with check ((select private.is_active_member()));
create policy "benchmark_rates: membros atualizam" on public.benchmark_rates for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));

create policy "reports: membros leem" on public.reports for select to authenticated using ((select private.is_active_member()));
create policy "reports: membros criam" on public.reports for insert to authenticated with check ((select private.is_active_member()));
create policy "reports: membros editam" on public.reports for update to authenticated using ((select private.is_active_member())) with check ((select private.is_active_member()));
create policy "reports: autor ou admin exclui rascunho" on public.reports for delete to authenticated
  using ((select private.is_active_member()) and status = 'draft' and (created_by = (select auth.uid()) or (select private.is_admin())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-reports', 'client-reports', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "client-reports: membros leem" on storage.objects for select to authenticated
  using (bucket_id = 'client-reports' and (select private.is_active_member()));
create policy "client-reports: membros gravam" on storage.objects for insert to authenticated
  with check (bucket_id = 'client-reports' and (select private.is_active_member()));
