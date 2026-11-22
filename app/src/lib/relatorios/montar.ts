import { createClient } from "@/lib/supabase/server";
import { acumulado } from "@/lib/indices/bcb";
import { CLASSES, type ClasseAtivo } from "@/lib/carteira/regras";
import type { DadosRelatorio } from "./regras";

type FotoPos = { nome?: string; ticker?: string | null; classe: ClasseAtivo; valor: number };

/** Monta os números do relatório a partir das fotografias, lançamentos, alvo e índices do período. */
export async function montarDados(clienteId: string, inicio: string, fim: string, consultor: string): Promise<DadosRelatorio | null> {
  const supabase = await createClient();
  const [cli, fotos, lanc, alvos] = await Promise.all([
    supabase.from("clients").select("full_name, investor_profile, deviation_limit").eq("id", clienteId).maybeSingle(),
    supabase.from("portfolio_snapshots").select("ref_date, total_value, by_class, positions, created_at").eq("client_id", clienteId).lte("ref_date", fim).order("ref_date").order("created_at"),
    supabase.from("portfolio_transactions").select("type, trade_date, amount").eq("client_id", clienteId).lte("trade_date", fim),
    supabase.from("portfolio_targets").select("asset_class, target_pct").eq("client_id", clienteId),
  ]);
  if (!cli.data) return null;

  // Última fotografia de cada data.
  const porData = new Map<string, NonNullable<typeof fotos.data>[number]>();
  for (const f of fotos.data ?? []) porData.set(f.ref_date, f);
  const lista = [...porData.values()];
  const avisos: DadosRelatorio["avisos"] = [];
  if (!lista.length) avisos.push("semFotos");

  // Início: última fotografia até a data de início; se não houver, a primeira dentro do período.
  const antes = lista.filter((f) => f.ref_date <= inicio).at(-1);
  const dentro = lista.filter((f) => f.ref_date >= inicio && f.ref_date <= fim);
  const fotoIni = antes ?? dentro[0] ?? null;
  const fotoFim = dentro.at(-1) ?? null;
  if (lista.length && !antes) avisos.push("semFotoInicio");
  if (lista.length && !fotoFim) avisos.push("semFotoFim");

  const fluxos = (de: string, ate: string) => {
    let entradas = 0;
    let saidas = 0;
    for (const l of lanc.data ?? []) {
      if (l.trade_date <= de || l.trade_date > ate) continue;
      if (l.type === "buy" || l.type === "deposit") entradas += Number(l.amount);
      else saidas += Number(l.amount);
    }
    return { entradas, saidas };
  };

  const vIni = fotoIni ? Number(fotoIni.total_value) : null;
  const vFim = fotoFim ? Number(fotoFim.total_value) : null;
  const { entradas, saidas } = fotoIni && fotoFim ? fluxos(fotoIni.ref_date, fotoFim.ref_date) : { entradas: 0, saidas: 0 };
  const variacao = vIni !== null && vFim !== null ? vFim - vIni - (entradas - saidas) : null;
  const rentPeriodo = variacao !== null && vIni ? (variacao / vIni) * 100 : null;

  const marco = lista[0] ?? null;
  let rentAcum: number | null = null;
  if (marco && fotoFim && Number(marco.total_value) > 0) {
    const f = fluxos(marco.ref_date, fotoFim.ref_date);
    rentAcum = ((Number(fotoFim.total_value) - Number(marco.total_value) - (f.entradas - f.saidas)) / Number(marco.total_value)) * 100;
  }

  const [idxPeriodo, idxAcum] = await Promise.all([
    fotoIni && fotoFim ? acumulado(fotoIni.ref_date, fotoFim.ref_date) : acumulado(inicio, fim),
    marco && fotoFim ? acumulado(marco.ref_date, fotoFim.ref_date) : Promise.resolve(null),
  ]);

  const mapaAlvo = new Map((alvos.data ?? []).map((a) => [a.asset_class as ClasseAtivo, Number(a.target_pct)]));
  const porClasse = (fotoFim?.by_class ?? {}) as Record<string, number>;
  const totalFim = vFim ?? 0;
  const limite = Number(cli.data.deviation_limit);
  const alocacao = CLASSES.map((classe) => {
    const valor = Number(porClasse[classe] ?? 0);
    const pct = totalFim > 0 ? (valor / totalFim) * 100 : 0;
    const alvo = mapaAlvo.size ? (mapaAlvo.get(classe) ?? 0) : null;
    const desvio = alvo !== null ? pct - alvo : null;
    return { classe, pct, alvo, desvio, alerta: desvio !== null && Math.abs(desvio) > limite };
  }).filter((c) => c.pct > 0 || (c.alvo ?? 0) > 0);

  const posicoes = ((fotoFim?.positions ?? []) as FotoPos[])
    .map((p) => ({ nome: p.ticker ? `${p.ticker} · ${p.nome ?? ""}`.trim() : (p.nome ?? ""), classe: p.classe, valor: Number(p.valor), pct: totalFim > 0 ? (Number(p.valor) / totalFim) * 100 : 0 }))
    .sort((a, b) => b.valor - a.valor);

  return {
    geradoEm: new Date().toISOString(),
    cliente: { nome: cli.data.full_name, perfil: cli.data.investor_profile },
    consultor,
    periodo: { inicio, fim },
    inicio: { data: fotoIni?.ref_date ?? null, valor: vIni },
    fim: { data: fotoFim?.ref_date ?? null, valor: vFim },
    aportes: Math.round(entradas * 100) / 100,
    resgates: Math.round(saidas * 100) / 100,
    variacao: variacao !== null ? Math.round(variacao * 100) / 100 : null,
    rentabilidadePeriodo: rentPeriodo,
    rentabilidadeAcumulada: rentAcum,
    marcoZero: marco ? { data: marco.ref_date, valor: Number(marco.total_value) } : null,
    indices: {
      periodo: { cdi: idxPeriodo.cdi, ipca: idxPeriodo.ipca },
      acumulado: { cdi: idxAcum?.cdi ?? null, ipca: idxAcum?.ipca ?? null },
      fonte: "Banco Central do Brasil (SGS)",
    },
    evolucao: lista.filter((f) => f.ref_date <= fim).map((f) => ({ data: f.ref_date, valor: Number(f.total_value) })),
    alocacao,
    limiteDesvio: limite,
    posicoes,
    avisos,
  };
}
