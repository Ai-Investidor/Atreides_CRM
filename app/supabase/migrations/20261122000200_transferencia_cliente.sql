-- =====================================================================
-- 0007 · Transferência de cliente entre workspaces (Documentação/02 e 03)
--   • Só o admin. Move cliente, tarefas, processos, anotações, documentos,
--     questionários e linha do tempo para o novo workspace; tarefas abertas
--     passam para o dono do novo workspace. Sai do núcleo familiar.
--   • Reuniões já marcadas continuam na agenda Google de quem as criou.
-- =====================================================================

-- Tarefas: o workspace só muda durante uma transferência.
create or replace function private.tasks_before_write()
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
    if current_setting('atreides.transfer', true) is distinct from 'on' then
      new.workspace_id := old.workspace_id;
    end if;
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

-- Reunião: a checagem de workspace só vale quando o vínculo com o cliente é criado ou trocado.
create or replace function private.meetings_client_rules()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.client_id is not null
     and (tg_op = 'INSERT' or new.client_id is distinct from old.client_id)
     and not exists (select 1 from public.clients where id = new.client_id and workspace_id = new.workspace_id) then
    raise exception 'O cliente precisa ser do mesmo workspace da reunião.' using errcode = '23514', hint = 'client_workspace';
  end if;
  return new;
end;
$$;

create function public.client_transfer(p_client uuid, p_workspace uuid)
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
  update public.suitability_responses set workspace_id = p_workspace where client_id = p_client;
  update public.client_events set workspace_id = p_workspace where client_id = p_client;
  perform set_config('atreides.transfer', 'off', true);
end;
$$;
revoke execute on function public.client_transfer(uuid, uuid) from public, anon;
grant execute on function public.client_transfer(uuid, uuid) to authenticated;
