import { createClient } from "@/lib/supabase/server";
import { hojeISO, somarDias } from "@/lib/formatos";
import type { Membro, TarefaCompleta, Visao } from "./regras";

const CAMPOS =
  "*, responsavel:profiles!tasks_assignee_id_fkey(id, full_name), lead:leads(id, full_name), cliente:clients(id, full_name), workspace:workspaces(id, name)";

type Filtro = { visao: Visao; workspaceId: string; usuarioId: string; consultorId?: string | null };

/** Tarefas abertas + concluídas nos últimos 7 dias, conforme a visão. */
export async function listarTarefas({ visao, workspaceId, usuarioId, consultorId }: Filtro): Promise<TarefaCompleta[]> {
  const supabase = await createClient();
  const limite = `${somarDias(hojeISO(), -7)}T00:00:00Z`;
  let q = supabase.from("tasks").select(CAMPOS).or(`status.eq.open,completed_at.gte.${limite}`);
  if (visao === "minhas") q = q.eq("workspace_id", workspaceId).eq("assignee_id", usuarioId);
  else if (visao === "workspace") q = q.eq("workspace_id", workspaceId);
  else if (consultorId) q = q.eq("assignee_id", consultorId);
  const { data } = await q.order("due_on", { ascending: true, nullsFirst: false }).limit(500);
  return (data as TarefaCompleta[] | null) ?? [];
}

/** Tarefas abertas de um lead (ficha do lead). */
export async function tarefasDoLead(leadId: string): Promise<TarefaCompleta[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select(CAMPOS).eq("lead_id", leadId).eq("status", "open").order("due_on", { nullsFirst: false });
  return (data as TarefaCompleta[] | null) ?? [];
}

/** Tarefas abertas de um cliente (ficha do cliente). */
export async function tarefasDoCliente(clienteId: string): Promise<TarefaCompleta[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select(CAMPOS).eq("client_id", clienteId).eq("status", "open").order("due_on", { nullsFirst: false });
  return (data as TarefaCompleta[] | null) ?? [];
}

/** Minhas tarefas atrasadas e de hoje no workspace (painel). */
export async function tarefasDeHoje(workspaceId: string, usuarioId: string): Promise<TarefaCompleta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(CAMPOS)
    .eq("workspace_id", workspaceId)
    .eq("assignee_id", usuarioId)
    .eq("status", "open")
    .lte("due_on", hojeISO())
    .order("due_on");
  return (data as TarefaCompleta[] | null) ?? [];
}

/** Pessoas ativas da equipe (para escolher o responsável). */
export async function membrosAtivos(): Promise<Membro[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name");
  return data ?? [];
}
