-- =====================================================================
-- 0003 · Convites de equipe (Documentação/02 › Fluxo de convite)
--
-- Regras:
--   • Só o admin convida (policy já existente em invitations).
--   • E-mail sempre minúsculo e sem espaços; quem convidou é gravado
--     pelo banco (não confia no que vem da tela).
--   • Não convida quem já faz parte da equipe.
--   • Não convida outro admin (o admin é único).
--   • Convite aceito não pode ser apagado (fica como registro).
--   • Criar e cancelar convite vai para a auditoria.
-- =====================================================================

create function private.invitations_before_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.email := lower(trim(new.email));
  new.full_name := nullif(trim(new.full_name), '');
  new.invited_by := (select auth.uid());
  new.accepted_at := null;

  if exists (select 1 from public.profiles where email = new.email) then
    raise exception 'Este e-mail já faz parte da equipe.'
      using errcode = '23505', hint = 'already_member';
  end if;

  if new.role = 'admin' and exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'O Atreides tem um único admin.'
      using errcode = '42501', hint = 'single_admin';
  end if;

  return new;
end;
$$;

create trigger invitations_before_insert
  before insert on public.invitations
  for each row execute function private.invitations_before_insert();

create function private.invitations_before_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.accepted_at is not null then
    raise exception 'Convite já aceito não pode ser apagado.'
      using errcode = '42501', hint = 'accepted';
  end if;
  return old;
end;
$$;

create trigger invitations_before_delete
  before delete on public.invitations
  for each row execute function private.invitations_before_delete();

create function private.invitations_audit()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, action, table_name, record_id, after)
    values ((select auth.uid()), 'invitation_created', 'invitations', new.email,
            jsonb_build_object('full_name', new.full_name, 'role', new.role));
    return new;
  else
    insert into public.audit_log (user_id, action, table_name, record_id, before)
    values ((select auth.uid()), 'invitation_canceled', 'invitations', old.email,
            jsonb_build_object('full_name', old.full_name, 'role', old.role));
    return old;
  end if;
end;
$$;

create trigger invitations_audit
  after insert or delete on public.invitations
  for each row execute function private.invitations_audit();
