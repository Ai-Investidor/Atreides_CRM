import { createClient } from "@/lib/supabase/server";

const CAMPOS = "id, client_id, period_start, period_end, status, version, comment, data, pdf_path, approved_at, sent_at, sent_channels, created_at, aprovador:profiles!reports_approved_by_fkey(full_name), autor:profiles!reports_created_by_fkey(full_name)";

export async function relatoriosDoCliente(clienteId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("reports").select(CAMPOS).eq("client_id", clienteId).order("period_end", { ascending: false }).order("version", { ascending: false });
  return data ?? [];
}

export async function obterRelatorio(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(`${CAMPOS}, cliente:clients(id, full_name, phone, email, workspace_id, status, report_frequency)`)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export type Relatorio = NonNullable<Awaited<ReturnType<typeof obterRelatorio>>>;

/** Relatórios do workspace (página Relatórios). */
export async function relatoriosDoWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(`${CAMPOS}, cliente:clients(id, full_name)`)
    .eq("workspace_id", workspaceId)
    .neq("status", "superseded")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

/** Tarefas "Gerar relatório" abertas do workspace (relatórios a fazer). */
export async function relatoriosPendentes(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, due_on, system_key, cliente:clients(id, full_name, report_frequency)")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .like("system_key", "report:%")
    .order("due_on");
  return data ?? [];
}
