"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { esquemaPlanejamento } from "./regras";

/** Códigos traduzidos na tela em planejamento.erros.<código>. */
export type ResultadoPlanejamento =
  | { ok: true; id?: string; dados?: unknown }
  | { ok: false; erros?: Record<string, string>; mensagem?: string };

const MAPA: Record<string, string> = {
  plan_allocation_sum: "soma100",
  plan_goals_max: "objetivosMax",
  plan_closed: "encerrado",
  plan_client: "naoEncontrado",
};

/** Salva o planejamento (tudo ou nada, no banco). A versão anterior fica guardada. */
export async function salvarPlanejamento(clienteId: string, entrada: Record<string, unknown>): Promise<ResultadoPlanejamento> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  const v = esquemaPlanejamento.safeParse(entrada);
  if (!v.success) {
    const erros: Record<string, string> = {};
    for (const i of v.error.issues) {
      const chave = i.path.length > 1 ? `${String(i.path[0])}.${String(i.path[1])}` : String(i.path[0] ?? "geral");
      erros[chave] ??= i.message;
    }
    return { ok: false, erros };
  }
  const d = v.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("plan_save", {
    p_client: clienteId,
    p_content: d.content_md,
    p_contribution: d.monthly_contribution,
    p_cdi: d.cdi_ref,
    p_ipca: d.ipca_ref,
    p_allocations: d.allocations.filter((a) => a.target_pct > 0),
    p_goals: d.goals,
  });
  if (error) return { ok: false, mensagem: (error.hint && MAPA[error.hint]) || (error.code === "42501" ? "permissao" : "salvar") };
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/carteiras");
  return { ok: true, id: data };
}

/** Versão anterior completa (para consultar o histórico). */
export async function versaoDoPlanejamento(versaoId: string): Promise<ResultadoPlanejamento> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data } = await supabase.from("plan_versions").select("snapshot").eq("id", versaoId).maybeSingle();
  if (!data) return { ok: false, mensagem: "naoEncontrado" };
  return { ok: true, dados: data.snapshot };
}
