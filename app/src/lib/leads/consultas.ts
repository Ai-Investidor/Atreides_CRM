import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/formatos";
import { ETAPAS_ABERTAS, type ContatoLead, type Lead } from "./regras";

/** Todos os leads do workspace (abertos e encerrados nos últimos 90 dias). */
export async function listarLeads(workspaceId: string): Promise<Lead[]> {
  const supabase = await createClient();
  const limite = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .or(`stage.in.(${ETAPAS_ABERTAS.join(",")}),stage_changed_at.gte.${limite}`)
    .order("next_contact_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Leads abertos com contato marcado para hoje ou atrasado. */
export async function listarRetornos(workspaceId: string): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("stage", ETAPAS_ABERTAS)
    .lte("next_contact_on", hojeISO())
    .order("next_contact_on", { ascending: true });
  if (error) throw error;
  return data;
}

export type ContatoComAutor = ContatoLead & { autor: { full_name: string } | null };

export async function obterLead(id: string): Promise<{ lead: Lead; historico: ContatoComAutor[] } | null> {
  const supabase = await createClient();
  const [{ data: lead }, { data: historico }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("lead_contacts")
      .select("*, autor:profiles!lead_contacts_created_by_fkey(full_name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!lead) return null;
  return { lead, historico: (historico ?? []) as ContatoComAutor[] };
}

/** Outro lead aberto com o mesmo celular (aviso de duplicidade). */
export async function buscarDuplicado(phone: string): Promise<Pick<Lead, "id" | "full_name" | "workspace_id"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, full_name, workspace_id")
    .eq("phone", phone)
    .in("stage", ETAPAS_ABERTAS)
    .limit(1)
    .maybeSingle();
  return data;
}

/** Quantidade de leads em aberto no workspace. */
export async function contarAbertos(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("stage", ETAPAS_ABERTAS);
  return count ?? 0;
}
