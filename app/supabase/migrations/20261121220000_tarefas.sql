-- =====================================================================
-- 0005 · Tarefas, etapa 1 (Documentação/09)
--
-- Dicionário (documentos em PT → banco em EN):
--   tarefas → tasks
--   status: aberta | concluida | nao_se_aplica → open | done | not_applicable
--   origem: manual | processo | reuniao | sistema → manual | process | meeting | system
--
-- Regras:
--   • Tarefa pertence a um workspace; responsável é alguém ativo da equipe.
--   • Lead vinculado precisa ser do mesmo workspace.
--   • Concluir grava quando e quem; reabrir limpa.
--   • "Não se aplica" exige motivo.
--   • Tarefa de lead concluída entra no histórico do lead.
--   • Excluir: só tarefa manual, por quem criou ou pelo admin.
--   • Edição em workspace alheio vai para a auditoria.
-- =====================================================================

create type public.task_status as enum ('open', 'done', 'not_applicable');
create type public.task_origin as enum ('manual', 'process', 'meeting', 'system');

alter type public.lead_contact_type add value if not exists 'task_done';

create table public.tasks (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references public.workspaces (id) on delete restrict,
  title                  text not null check (char_length(title) between 2 and 200),
  description            text check (char_length(description) <= 5000),
  due_on                 date,
  assignee_id            uuid not null references public.profiles (id) on delete restrict,
  lead_id                uuid references public.leads (id) on delete set null,
  origin                 public.task_origin not null default 'manual',
  status                 public.task_status not null default 'open',
  not_applicable_reason  text check (char_length(not_applicable_reason) <= 500),
  completed_at           timestamptz,
  completed_by           uuid references public.profiles (id) on delete set null,
  created_by             uuid not null references public.profiles (id) on delete restrict,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint tasks_not_applicable_needs_reason
    check (status <> 'not_applicable' or nullif(trim(not_applicable_reason), '') is not null)
);
comment on table public.tasks is 'Tarefas da consultoria (manuais nesta etapa; processos e automáticas na etapa 2).';

create index tasks_workspace_status_due_idx on public.tasks (workspace_id, status, due_on);
create index tasks_assignee_status_idx on public.tasks (assignee_id, status);
create index tasks_lead_id_idx on public.tasks (lead_id);
create index tasks_created_by_idx on public.tasks (created_by);
create index tasks_completed_by_idx on public.tasks (completed_by);

create function private.tasks_before_write()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(v_uid, new.created_by);
    new.completed_at := null;
    new.completed_by := null;
    if new.status = 'done' then
      new.completed_at := now();
      new.completed_by := new.created_by;
    end if;
  else
    new.workspace_id := old.workspace_id;
    new.created_by := old.created_by;
    new.origin := old.origin;
    new.updated_at := now();
    if new.status is distinct from old.status then
      if new.status = 'done' then
        new.completed_at := now();
        new.completed_by := v_uid;
      else
        new.completed_at := null;
        new.completed_by := null;
      end if;
    else
      new.completed_at := old.completed_at;
      new.completed_by := old.completed_by;
    end if;
  end if;

  if new.status <> 'not_applicable' then
    new.not_applicable_reason := null;
  end if;

  if not exists (select 1 from public.profiles where id = new.assignee_id and active) then
    raise exception 'O responsável precisa ser alguém ativo da equipe.'
      using errcode = '23514', hint = 'assignee_inactive';
  end if;

  if new.lead_id is not null and not exists (
    select 1 from public.leads where id = new.lead_id and workspace_id = new.workspace_id
  ) then
    raise exception 'O lead precisa ser do mesmo workspace da tarefa.'
      using errcode = '23514', hint = 'lead_workspace';
  end if;

  return new;
end;
$$;

create trigger tasks_before_write
  before insert or update on public.tasks
  for each row execute function private.tasks_before_write();

-- Tarefa de lead concluída entra no histórico do lead.
create function private.tasks_after_done()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.lead_id is not null and new.status = 'done'
     and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    insert into public.lead_contacts (lead_id, workspace_id, type, summary, created_by)
    values (new.lead_id, new.workspace_id, 'task_done', new.title, coalesce(new.completed_by, new.created_by));
  end if;
  return new;
end;
$$;

create trigger tasks_after_done
  after insert or update on public.tasks
  for each row execute function private.tasks_after_done();

create trigger tasks_audit_other_workspace
  after insert or update on public.tasks
  for each row execute function private.audit_other_workspace();

alter table public.tasks enable row level security;

create policy "tasks: membros ativos leem"
  on public.tasks for select to authenticated
  using ((select private.is_active_member()));

create policy "tasks: membros ativos criam"
  on public.tasks for insert to authenticated
  with check ((select private.is_active_member()) and origin = 'manual');

create policy "tasks: membros ativos editam"
  on public.tasks for update to authenticated
  using ((select private.is_active_member()))
  with check ((select private.is_active_member()));

create policy "tasks: excluir manual (autor ou admin)"
  on public.tasks for delete to authenticated
  using (
    origin = 'manual'
    and (select private.is_active_member())
    and (created_by = (select auth.uid()) or (select private.is_admin()))
  );
