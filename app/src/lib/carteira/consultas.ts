import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/formatos";
import { atualizarCotacoes } from "./cotacoes";
import { acumulado } from "@/lib/indices/bcb";
import { calcularPosicoes, desatualizada, resumir, variacaoDesde, type Ativo, type ClasseAtivo } from "./regras";

type AtivoBase = Pick<Ativo, "id" | "ticker" | "name" | "asset_class" | "kind">;

/** Tudo o que o dashboard da carteira de um cliente precisa. */
export async function carteiraDoCliente(clienteId: string) {
  const supabase = await createClient();
  const [cli, lanc, saldos, fotos, alvos, aportes, diag, plano] = await Promise.all([
    supabase.from("clients").select("id, full_name, workspace_id, portfolio_frequency, deviation_limit, monthly_income, contract_start_on, status").eq("id", clienteId).maybeSingle(),
    supabase
      .from("portfolio_transactions")
      .select("*, ativo:assets(id, ticker, name, asset_class, kind), autor:profiles!portfolio_transactions_created_by_fkey(full_name)")
      .eq("client_id", clienteId)
      .order("trade_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("portfolio_valuations").select("*, ativo:assets(id, ticker, name, asset_class, kind)").eq("client_id", clienteId).order("ref_date", { ascending: false }),
    supabase.from("portfolio_snapshots").select("id, ref_date, total_value, invested_total, by_class, created_at").eq("client_id", clienteId).order("ref_date").order("created_at"),
    supabase.from("portfolio_targets").select("asset_class, target_pct").eq("client_id", clienteId),
    supabase
      .from("contributions")
      .select("*, itens:contribution_items(id, asset_id, quantity, unit_price, amount, ativo:assets(id, ticker, name, asset_class, kind))")
      .eq("client_id", clienteId)
      .order("period_start", { ascending: false })
      .limit(24),
    supabase.from("diagnoses").select("monthly_expense").eq("client_id", clienteId).maybeSingle(),
    supabase.from("plans").select("id").eq("client_id", clienteId).maybeSingle(),
  ]);
  if (!cli.data) return null;

  const ativos = new Map<string, AtivoBase>();
  for (const l of lanc.data ?? []) if (l.ativo) ativos.set(l.ativo.id, l.ativo);
  for (const s of saldos.data ?? []) if (s.ativo) ativos.set(s.ativo.id, s.ativo);
  for (const a of aportes.data ?? []) for (const i of a.itens ?? []) if (i.ativo) ativos.set(i.ativo.id, i.ativo);

  const { falhou } = await atualizarCotacoes([...ativos.values()].filter((a) => a.kind === "listed"));
  const { data: cot } = ativos.size
    ? await supabase.from("asset_quotes").select("*").in("asset_id", [...ativos.keys()])
    : { data: [] as never[] };
  const cotacoes = new Map((cot ?? []).map((c) => [c.asset_id, c]));

  const posicoes = calcularPosicoes(ativos, lanc.data ?? [], saldos.data ?? [], cotacoes);
  const mapaAlvos = new Map((alvos.data ?? []).map((a) => [a.asset_class as ClasseAtivo, Number(a.target_pct)]));
  const resumo = resumir(posicoes, mapaAlvos, Number(cli.data.deviation_limit));
  const listaFotos = fotos.data ?? [];
  // Última fotografia por data (uma correção na mesma data substitui a anterior).
  const porData = new Map<string, (typeof listaFotos)[number]>();
  for (const f of listaFotos) porData.set(f.ref_date, f);
  const evolucao = [...porData.values()];
  const ultima = evolucao.at(-1) ?? null;
  const hoje = hojeISO();
  const indicesDesdeInicio = evolucao[0] && evolucao[0].ref_date < hoje ? await acumulado(evolucao[0].ref_date, hoje) : null;

  return {
    indicesDesdeInicio,
    cliente: cli.data,
    posicoes,
    resumo,
    alvos: Object.fromEntries(mapaAlvos) as Partial<Record<ClasseAtivo, number>>,
    lancamentos: lanc.data ?? [],
    saldos: saldos.data ?? [],
    evolucao,
    marcoZero: evolucao[0] ?? null,
    /** Com planejamento salvo, o alvo vem dele e não é editado na carteira (Documentação/05). */
    alvoDoPlanejamento: !!plano.data,
    /** Despesa mensal registrada no Diagnóstico (Documentação/14). */
    despesaMensal: diag.data?.monthly_expense === null || diag.data?.monthly_expense === undefined ? null : Number(diag.data.monthly_expense),
    ultimaFoto: ultima,
    variacao: variacaoDesde(resumo.total, ultima, lanc.data ?? []),
    desatualizada: desatualizada(ultima?.ref_date ?? null, cli.data.portfolio_frequency, hoje),
    aportes: aportes.data ?? [],
    cotacoes: Object.fromEntries(cotacoes),
    falhaCotacao: falhou,
  };
}

export type DadosCarteira = NonNullable<Awaited<ReturnType<typeof carteiraDoCliente>>>;

/** Visão geral das carteiras do workspace (Documentação/06). */
export async function visaoGeralCarteiras(workspaceId: string) {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, full_name, status, portfolio_frequency, deviation_limit")
    .eq("workspace_id", workspaceId)
    .neq("status", "closed")
    .order("full_name");
  const ids = (clientes ?? []).map((c) => c.id);
  if (!ids.length) return { linhas: [], falhaCotacao: false };

  const [lanc, saldos, fotos, alvos] = await Promise.all([
    supabase.from("portfolio_transactions").select("client_id, asset_id, type, trade_date, quantity, amount, created_at, ativo:assets(id, ticker, name, asset_class, kind)").in("client_id", ids),
    supabase.from("portfolio_valuations").select("client_id, asset_id, ref_date, value, created_at, ativo:assets(id, ticker, name, asset_class, kind)").in("client_id", ids),
    supabase.from("portfolio_snapshots").select("client_id, ref_date, total_value").in("client_id", ids).order("ref_date"),
    supabase.from("portfolio_targets").select("client_id, asset_class, target_pct").in("client_id", ids),
  ]);
  const ativos = new Map<string, AtivoBase>();
  for (const l of [...(lanc.data ?? []), ...(saldos.data ?? [])]) if (l.ativo) ativos.set(l.ativo.id, l.ativo);
  const { falhou } = await atualizarCotacoes([...ativos.values()].filter((a) => a.kind === "listed"));
  const { data: cot } = ativos.size ? await supabase.from("asset_quotes").select("*").in("asset_id", [...ativos.keys()]) : { data: [] as never[] };
  const cotacoes = new Map((cot ?? []).map((c) => [c.asset_id, c]));
  const hoje = hojeISO();

  const linhas = (clientes ?? []).map((c) => {
    const l = (lanc.data ?? []).filter((x) => x.client_id === c.id);
    const s = (saldos.data ?? []).filter((x) => x.client_id === c.id);
    const f = (fotos.data ?? []).filter((x) => x.client_id === c.id);
    const mapa = new Map((alvos.data ?? []).filter((a) => a.client_id === c.id).map((a) => [a.asset_class as ClasseAtivo, Number(a.target_pct)]));
    const resumo = resumir(calcularPosicoes(ativos, l, s, cotacoes), mapa, Number(c.deviation_limit));
    const ultima = f.at(-1) ?? null;
    return {
      cliente: c,
      total: resumo.total,
      resultadoPct: resumo.resultadoPct,
      variacao: variacaoDesde(resumo.total, ultima, l),
      maiorDesvio: mapa.size ? resumo.maiorDesvio : null,
      alerta: resumo.porClasse.some((x) => x.alerta),
      ultimaFoto: ultima?.ref_date ?? null,
      desatualizada: desatualizada(ultima?.ref_date ?? null, c.portfolio_frequency, hoje),
      vazia: !l.length && !s.length,
    };
  });
  return { linhas, falhaCotacao: falhou };
}
