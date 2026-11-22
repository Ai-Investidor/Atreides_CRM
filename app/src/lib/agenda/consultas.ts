import { createClient } from "@/lib/supabase/server";
import { hojeISO, instanteDe, somarDias } from "@/lib/formatos";
import type { Reuniao } from "./regras";

export type ReuniaoComLead = Reuniao & { lead: { id: string; full_name: string } | null; cliente: { id: string; full_name: string } | null };

/** Reuniões do workspace que cruzam o período (sem as canceladas). */
export async function listarReunioes(workspaceId: string, inicio: string, fim: string): Promise<ReuniaoComLead[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetings")
    .select("*, lead:leads(id, full_name), cliente:clients(id, full_name)")
    .eq("workspace_id", workspaceId)
    .neq("status", "canceled")
    .lt("starts_at", fim)
    .gt("ends_at", inicio)
    .order("starts_at");
  return (data as ReuniaoComLead[] | null) ?? [];
}

/** Reuniões de hoje (São Paulo) do workspace, para o painel. */
export function reunioesDeHoje(workspaceId: string) {
  const hoje = hojeISO();
  return listarReunioes(workspaceId, instanteDe(hoje, "00:00"), instanteDe(somarDias(hoje, 1), "00:00"));
}

/** Quantas reuniões o workspace tem nos próximos 7 dias. */
export async function contarProximos7Dias(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const agora = new Date().toISOString();
  const limite = instanteDe(somarDias(hojeISO(), 7), "00:00");
  const { count } = await supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "scheduled")
    .gte("starts_at", agora)
    .lt("starts_at", limite);
  return count ?? 0;
}

/** Leads abertos do workspace, para vincular à reunião. */
export async function leadsParaVinculo(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, full_name, email")
    .eq("workspace_id", workspaceId)
    .not("stage", "in", "(won,lost)")
    .order("full_name");
  return data ?? [];
}
