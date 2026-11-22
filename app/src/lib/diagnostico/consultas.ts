import { createClient } from "@/lib/supabase/server";
import type { Alvo } from "./regras";

/** Diagnóstico do lead ou do cliente, com autores e a lista de versões anteriores. */
export async function obterDiagnostico(alvo: Alvo) {
  const supabase = await createClient();
  const coluna = alvo.tipo === "lead" ? "lead_id" : "client_id";
  const { data: diag } = await supabase
    .from("diagnoses")
    .select("*, autor:profiles!diagnoses_updated_by_fkey(full_name)")
    .eq(coluna, alvo.id)
    .maybeSingle();
  if (!diag) return null;
  const { data: versoes } = await supabase
    .from("diagnosis_versions")
    .select("id, version, saved_at, autor:profiles!diagnosis_versions_saved_by_fkey(full_name)")
    .eq("diagnosis_id", diag.id)
    .order("version", { ascending: false });
  return { diagnostico: diag, versoes: versoes ?? [] };
}

export type DadosDiagnosticoTela = NonNullable<Awaited<ReturnType<typeof obterDiagnostico>>>;

/** Despesa mensal do diagnóstico do cliente (card Marco zero da carteira). */
export async function despesaMensalDoCliente(clienteId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("diagnoses").select("monthly_expense").eq("client_id", clienteId).maybeSingle();
  return data?.monthly_expense === null || data?.monthly_expense === undefined ? null : Number(data.monthly_expense);
}
