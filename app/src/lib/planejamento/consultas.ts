import { createClient } from "@/lib/supabase/server";
import { acumulado } from "@/lib/indices/bcb";
import { hojeISO, somarDias } from "@/lib/formatos";
import type { LinhaAlocacao, Objetivo } from "./regras";

/**
 * Planejamento do cliente com tudo o que a tela precisa (Documentação/05): plano, alocação,
 * objetivos, versões, diagnóstico (dores e aposentadoria), perfil, nascimento, última fotografia
 * da carteira e CDI/IPCA dos últimos 12 meses (Banco Central) como referência padrão.
 */
export async function obterPlanejamento(clienteId: string) {
  const supabase = await createClient();
  const hoje = hojeISO();
  const [plano, cliente, diag, foto, indices] = await Promise.all([
    supabase.from("plans").select("*, autor:profiles!plans_updated_by_fkey(full_name)").eq("client_id", clienteId).maybeSingle(),
    supabase.from("clients").select("id, full_name, birth_date, investor_profile").eq("id", clienteId).maybeSingle(),
    supabase.from("diagnoses").select("content_md, retirement_age, monthly_expense").eq("client_id", clienteId).maybeSingle(),
    supabase.from("portfolio_snapshots").select("ref_date, total_value").eq("client_id", clienteId).order("ref_date", { ascending: false }).limit(1).maybeSingle(),
    acumulado(somarDias(hoje, -365), hoje).catch(() => null),
  ]);

  let alocacao: LinhaAlocacao[] = [];
  let objetivos: Objetivo[] = [];
  let versoes: { id: string; version: number; saved_at: string; autor: { full_name: string } | null }[] = [];
  if (plano.data) {
    const [a, g, v] = await Promise.all([
      supabase.from("plan_allocations").select("asset_class, target_pct, premise_kind, premise_value").eq("plan_id", plano.data.id),
      supabase.from("plan_goals").select("name, target_value, target_date, saved_value").eq("plan_id", plano.data.id).order("position"),
      supabase
        .from("plan_versions")
        .select("id, version, saved_at, autor:profiles!plan_versions_saved_by_fkey(full_name)")
        .eq("plan_id", plano.data.id)
        .order("version", { ascending: false }),
    ]);
    alocacao = (a.data ?? []).map((l) => ({ ...l, target_pct: Number(l.target_pct), premise_value: l.premise_value === null ? null : Number(l.premise_value) }));
    objetivos = (g.data ?? []).map((o) => ({ ...o, target_value: Number(o.target_value), saved_value: Number(o.saved_value) }));
    versoes = v.data ?? [];
  }

  const arred = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);
  return {
    plano: plano.data,
    alocacao,
    objetivos,
    versoes,
    cliente: cliente.data,
    diagnostico: diag.data,
    patrimonioAtual: foto.data ? { valor: Number(foto.data.total_value), data: foto.data.ref_date } : null,
    /** Referência padrão (Banco Central, últimos 12 meses), usada quando o planejamento ainda não tem a sua. */
    referenciaBcb: { cdi: arred(indices?.cdi), ipca: arred(indices?.ipca), ate: indices?.ate ?? { cdi: null, ipca: null } },
  };
}

export type DadosPlanejamentoTela = Awaited<ReturnType<typeof obterPlanejamento>>;
