"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { mercado } from "@/lib/mercado";
import { hojeISO } from "@/lib/formatos";
import { carteiraDoCliente } from "./consultas";
import { atualizarCotacoes } from "./cotacoes";
import { CLASSES, classeSugerida, esquemaItemAporte, esquemaLancamento, esquemaSaldo, type ClasseAtivo } from "./regras";

/** Códigos traduzidos na tela em carteira.erros.<código>. */
export type ResultadoCarteira =
  | { ok: true; id?: string; dados?: unknown }
  | { ok: false; erros?: Record<string, string>; mensagem?: string };

function revalidar(clienteId: string) {
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/carteiras");
  revalidatePath("/painel");
}

function errosZod(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: Record<string, string> = {};
  for (const i of issues) erros[String(i.path[0] ?? "geral")] ??= i.message;
  return erros;
}

function mensagemBanco(e: { hint?: string; code?: string } | null) {
  const mapa: Record<string, string> = {
    type_listed: "tipoBolsa",
    contribution_locked: "aporteTravado",
    contribution_empty: "aporteVazio",
    contribution_client: "salvar",
    contribution_executed: "aporteTravado",
  };
  if (e?.hint && mapa[e.hint]) return mapa[e.hint];
  if (e?.code === "42501") return "permissao";
  return "salvar";
}

async function sessao() {
  const s = await obterSessao();
  return s;
}

export type OpcaoAtivo = {
  id: string | null;
  ticker: string | null;
  nome: string;
  classe: ClasseAtivo;
  tipo: "bolsa" | "manual";
  /** true quando veio do provedor e ainda não está no catálogo do Atreides. */
  novo: boolean;
};

/** Busca no catálogo do Atreides e, para tickers da B3, no provedor de mercado. */
export async function buscarAtivos(termo: string): Promise<{ opcoes: OpcaoAtivo[]; falhaProvedor: boolean }> {
  if (!(await sessao())) return { opcoes: [], falhaProvedor: false };
  const t = termo.trim();
  if (t.length < 2) return { opcoes: [], falhaProvedor: false };
  const supabase = await createClient();
  const limpo = t.replace(/[%,()]/g, " ");
  const { data } = await supabase
    .from("assets")
    .select("id, ticker, name, asset_class, kind")
    .or(`ticker.ilike.%${limpo.toUpperCase()}%,name.ilike.%${limpo}%`)
    .limit(8);
  const opcoes: OpcaoAtivo[] = (data ?? []).map((a) => ({ id: a.id, ticker: a.ticker, nome: a.name, classe: a.asset_class, tipo: a.kind === "listed" ? "bolsa" : "manual", novo: false }));
  let falhaProvedor = false;
  try {
    const externos = await mercado.buscar(t);
    for (const e of externos) {
      if (opcoes.some((o) => o.ticker === e.ticker)) continue;
      opcoes.push({ id: null, ticker: e.ticker, nome: e.nome, classe: classeSugerida(e.tipo), tipo: "bolsa", novo: true });
    }
  } catch {
    falhaProvedor = true;
  }
  return { opcoes: opcoes.slice(0, 12), falhaProvedor };
}

/** Cotação atual de um ticker (para preencher o preço no formulário). */
export async function cotacaoAtual(ticker: string): Promise<{ preco: number; em: string; fonte: string } | null> {
  if (!(await sessao())) return null;
  try {
    const [c] = await mercado.cotacoes([ticker.toUpperCase()]);
    return c ? { preco: c.preco, em: c.em, fonte: c.fonte } : null;
  } catch {
    return null;
  }
}

/** Devolve o id do ativo, cadastrando no catálogo se for novo. */
export async function garantirAtivo(op: { id?: string | null; ticker?: string | null; nome: string; classe: ClasseAtivo; tipo: "bolsa" | "manual" }): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  if (op.id) return { ok: true, id: op.id };
  if (!CLASSES.includes(op.classe)) return { ok: false, erros: { classe: "classe" } };
  if (op.nome.trim().length < 2) return { ok: false, erros: { nome: "nome" } };
  const supabase = await createClient();
  if (op.tipo === "bolsa") {
    const ticker = (op.ticker ?? "").toUpperCase().trim();
    if (!/^[A-Z0-9]{4,12}$/.test(ticker)) return { ok: false, erros: { ticker: "ticker" } };
    const { data: existente } = await supabase.from("assets").select("id").eq("ticker", ticker).maybeSingle();
    if (existente) return { ok: true, id: existente.id };
    const { data, error } = await supabase.from("assets").insert({ ticker, name: op.nome.trim(), asset_class: op.classe, kind: "listed" }).select("id").single();
    if (error) return { ok: false, mensagem: mensagemBanco(error) };
    return { ok: true, id: data.id };
  }
  const { data, error } = await supabase.from("assets").insert({ name: op.nome.trim(), asset_class: op.classe, kind: "manual" }).select("id").single();
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  return { ok: true, id: data.id };
}

/** Lança compra, venda, aplicação ou resgate. */
export async function lancar(clienteId: string, entrada: Record<string, unknown>): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  const v = esquemaLancamento.safeParse(entrada);
  if (!v.success) return { ok: false, erros: errosZod(v.error.issues) };
  const d = v.data;
  const negociacao = d.type === "buy" || d.type === "sell";
  const amount = negociacao ? Math.round(d.quantity! * d.unit_price! * 100) / 100 : d.amount!;
  if (amount <= 0) return { ok: false, erros: { amount: "valor" } };
  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_transactions").insert({
    client_id: clienteId,
    asset_id: d.asset_id,
    type: d.type,
    trade_date: d.trade_date,
    quantity: negociacao ? d.quantity : null,
    unit_price: negociacao ? d.unit_price : null,
    amount,
    institution: d.institution || null,
  });
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true };
}

export async function excluirLancamento(id: string): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("portfolio_transactions").delete().eq("id", id).select("client_id");
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  if (!data?.length) return { ok: false, mensagem: "permissao" };
  revalidar(data[0].client_id);
  return { ok: true };
}

/** Saldo atual de ativo manual (renda fixa, fundo, previdência) numa data. */
export async function informarSaldo(clienteId: string, entrada: Record<string, unknown>): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  const v = esquemaSaldo.safeParse(entrada);
  if (!v.success) return { ok: false, erros: errosZod(v.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_valuations").insert({ client_id: clienteId, ...v.data });
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true };
}

/** Fotografia: congela o patrimônio calculado agora na data informada. */
export async function registrarFotografia(clienteId: string, data: string = hojeISO()): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hojeISO()) return { ok: false, erros: { data: "data" } };
  const c = await carteiraDoCliente(clienteId);
  if (!c) return { ok: false, mensagem: "naoEncontrado" };
  if (!c.posicoes.length) return { ok: false, mensagem: "carteiraVazia" };
  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_snapshots").insert({
    client_id: clienteId,
    ref_date: data,
    total_value: c.resumo.total,
    invested_total: c.resumo.investido,
    by_class: Object.fromEntries(c.resumo.porClasse.map((x) => [x.classe, x.valor])),
    positions: c.posicoes.map((p) => ({ asset_id: p.ativo.id, ticker: p.ativo.ticker, nome: p.ativo.name, classe: p.ativo.asset_class, quantidade: p.quantidade, valor: p.valor, investido: p.investido })),
  });
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true };
}

/** Alocação alvo por classe (soma 100%), ou vazio para remover o alvo. */
export async function salvarAlvos(clienteId: string, alvos: Partial<Record<ClasseAtivo, number>>): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  const linhas = CLASSES.map((classe) => ({ classe, pct: Number(alvos[classe] ?? 0) })).filter((l) => l.pct > 0);
  if (linhas.some((l) => !Number.isFinite(l.pct) || l.pct < 0 || l.pct > 100)) return { ok: false, mensagem: "alvoInvalido" };
  const soma = linhas.reduce((t, l) => t + l.pct, 0);
  if (linhas.length && Math.abs(soma - 100) > 0.01) return { ok: false, mensagem: "alvoSoma" };
  const supabase = await createClient();
  const { error: e1 } = await supabase.from("portfolio_targets").delete().eq("client_id", clienteId);
  if (e1) return { ok: false, mensagem: mensagemBanco(e1) };
  if (linhas.length) {
    const { error } = await supabase.from("portfolio_targets").insert(linhas.map((l) => ({ client_id: clienteId, asset_class: l.classe, target_pct: l.pct })));
    if (error) return { ok: false, mensagem: mensagemBanco(error) };
  }
  revalidar(clienteId);
  return { ok: true };
}

/** Frequência de acompanhamento e limite de desvio do cliente. */
export async function configurarCarteira(clienteId: string, frequencia: "monthly" | "weekly", limite: number): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  if (!["monthly", "weekly"].includes(frequencia) || !(limite >= 1 && limite <= 50)) return { ok: false, mensagem: "salvar" };
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ portfolio_frequency: frequencia, deviation_limit: limite }).eq("id", clienteId);
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true };
}

/** Atualiza já as cotações dos ativos de bolsa do cliente. */
export async function atualizarCotacoesCliente(clienteId: string): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data } = await supabase.from("portfolio_transactions").select("ativo:assets(id, ticker, kind)").eq("client_id", clienteId);
  const ativos = new Map<string, { id: string; ticker: string | null }>();
  for (const l of data ?? []) if (l.ativo && l.ativo.kind === "listed") ativos.set(l.ativo.id, l.ativo);
  const { falhou } = await atualizarCotacoes([...ativos.values()], true);
  revalidar(clienteId);
  return falhou ? { ok: false, mensagem: "cotacao" } : { ok: true };
}

// ---------------------------------------------------------------- Aportes do período

/** Cria o plano de aportes do período com os itens (ativo, quantidade, preço). */
export async function criarAporte(
  clienteId: string,
  periodo: { tipo: "monthly" | "weekly"; inicio: string; notas?: string },
  itens: { asset_id: string; quantity: number | string; unit_price: number | string }[],
): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodo.inicio)) return { ok: false, erros: { inicio: "data" } };
  if (!itens.length) return { ok: false, mensagem: "aporteVazio" };
  const validos = [];
  for (const [i, item] of itens.entries()) {
    const v = esquemaItemAporte.safeParse(item);
    if (!v.success) return { ok: false, erros: { [`item${i}`]: v.error.issues[0]?.message ?? "valor" } };
    validos.push(v.data);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contributions")
    .insert({ client_id: clienteId, period_kind: periodo.tipo, period_start: periodo.inicio, notes: periodo.notas?.trim() || null })
    .select("id")
    .single();
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  const { error: e2 } = await supabase.from("contribution_items").insert(validos.map((v) => ({ contribution_id: data.id, ...v })));
  if (e2) {
    await supabase.from("contributions").delete().eq("id", data.id);
    return { ok: false, mensagem: mensagemBanco(e2) };
  }
  revalidar(clienteId);
  return { ok: true, id: data.id };
}

/** Executa: cada item vira uma compra na data informada. */
export async function executarAporte(clienteId: string, aporteId: string, data: string, instituicao?: string): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hojeISO()) return { ok: false, erros: { data: "data" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("contribution_execute", { p_contribution: aporteId, p_date: data, p_institution: instituicao ?? null });
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true };
}

export async function cancelarAporte(clienteId: string, aporteId: string): Promise<ResultadoCarteira> {
  if (!(await sessao())) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { error } = await supabase.from("contributions").update({ status: "canceled" }).eq("id", aporteId).eq("status", "planned");
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true };
}

// ---------------------------------------------------------------- Importação

export type LinhaLancamento = {
  linha: number;
  data: string;
  ticker: string;
  nome: string;
  classe: ClasseAtivo;
  tipo: "buy" | "sell" | "deposit" | "withdrawal";
  quantidade: number | null;
  preco: number | null;
  valor: number | null;
  instituicao: string;
};

/** Importa lançamentos (modelo do Atreides). Ativos novos entram no catálogo. */
export async function importarLancamentos(clienteId: string, linhas: LinhaLancamento[]) {
  if (!(await sessao())) return { ok: false, mensagem: "sessao", criados: 0, falhas: [] as { linha: number; erro: string }[] };
  if (linhas.length > 1000) return { ok: false, mensagem: "importacaoGrande", criados: 0, falhas: [] };
  const cacheAtivos = new Map<string, string>();
  let criados = 0;
  const falhas: { linha: number; erro: string }[] = [];
  for (const l of linhas) {
    const bolsa = !!l.ticker;
    const chave = bolsa ? l.ticker : `${l.nome}|${l.classe}`;
    let ativoId = cacheAtivos.get(chave);
    if (!ativoId) {
      if (!bolsa) {
        const supabase = await createClient();
        const { data } = await supabase.from("assets").select("id").eq("kind", "manual").eq("asset_class", l.classe).ilike("name", l.nome).limit(1).maybeSingle();
        ativoId = data?.id;
      }
      if (!ativoId) {
        const r = await garantirAtivo({ ticker: l.ticker || null, nome: l.nome || l.ticker, classe: l.classe, tipo: bolsa ? "bolsa" : "manual" });
        if (!r.ok || !r.id) {
          falhas.push({ linha: l.linha, erro: r.ok ? "salvar" : (r.mensagem ?? Object.values(r.erros ?? {})[0] ?? "salvar") });
          continue;
        }
        ativoId = r.id;
      }
      cacheAtivos.set(chave, ativoId);
    }
    const tipo = bolsa && (l.tipo === "deposit" || l.tipo === "withdrawal") ? (l.tipo === "deposit" ? "buy" : "sell") : l.tipo;
    const r = await lancar(clienteId, {
      asset_id: ativoId,
      type: tipo,
      trade_date: l.data,
      quantity: l.quantidade,
      unit_price: l.preco,
      amount: l.valor,
      institution: l.instituicao,
    });
    if (r.ok) criados++;
    else falhas.push({ linha: l.linha, erro: r.mensagem ?? Object.values(r.erros ?? {})[0] ?? "salvar" });
  }
  revalidar(clienteId);
  return { ok: true, criados, falhas };
}
