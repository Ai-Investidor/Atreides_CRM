import { createClient } from "@/lib/supabase/server";
import { mercado, type ComFonte, type PerfilAtivo, type PontoPreco, type Provento } from "@/lib/mercado";
import type { Json } from "@/lib/supabase/database.types";

const VALIDADE = { perfil: 6 * 3600_000, historico: 12 * 3600_000, proventos: 12 * 3600_000 } as const;
type Tipo = keyof typeof VALIDADE;

/**
 * Dado salvo antes desta data é ignorado (o cálculo mudou). Atualizar quando a forma de
 * calcular um tipo de dado mudar, para a tela não mostrar números do cálculo antigo.
 * 22/11/2026: indicadores passaram a vir da cadeia Dados B3 → bolsai → Yahoo.
 */
const CALCULO_DESDE: Record<Tipo, number> = {
  perfil: Date.parse("2026-11-22T05:20:00Z"),
  historico: 0,
  proventos: Date.parse("2026-11-22T05:20:00Z"),
};

export type Dado<T> = { dado: T | null; em: string | null; fonte: string | null; falhou: boolean };

/** Lê do cache; se vencido, busca no provedor e grava. Se o provedor falhar, devolve o último dado salvo. */
async function comCache<T>(ticker: string, tipo: Tipo, buscar: () => Promise<ComFonte<T> | null>): Promise<Dado<T>> {
  const supabase = await createClient();
  const { data: cache } = await supabase.from("market_cache").select("data, source, fetched_at").eq("ticker", ticker).eq("kind", tipo).maybeSingle();
  const salvoEm = cache ? Date.parse(cache.fetched_at) : 0;
  if (cache && salvoEm >= CALCULO_DESDE[tipo] && Date.now() - salvoEm < VALIDADE[tipo]) {
    return { dado: cache.data as T, em: cache.fetched_at, fonte: cache.source, falhou: false };
  }
  try {
    const novo = await buscar();
    if (novo === null) return { dado: (cache?.data as T) ?? null, em: cache?.fetched_at ?? null, fonte: cache?.source ?? null, falhou: !cache };
    const agora = new Date().toISOString();
    await supabase.from("market_cache").upsert({ ticker, kind: tipo, data: novo.dado as unknown as Json, source: novo.fonte, fetched_at: agora });
    return { dado: novo.dado, em: agora, fonte: novo.fonte, falhou: false };
  } catch {
    return { dado: (cache?.data as T) ?? null, em: cache?.fetched_at ?? null, fonte: cache?.source ?? null, falhou: true };
  }
}

export function perfilDoAtivo(ticker: string) {
  return comCache<PerfilAtivo>(ticker, "perfil", () => mercado.perfil(ticker));
}

/** Histórico de 5 anos (a tela recorta 1M, 6M, 1A, 5A). */
export function historicoDoAtivo(ticker: string) {
  return comCache<PontoPreco[]>(ticker, "historico", () => mercado.historico(ticker, new Date(Date.now() - 5 * 365.25 * 864e5)));
}

/** Proventos dos últimos 5 anos. */
export function proventosDoAtivo(ticker: string) {
  return comCache<Provento[]>(ticker, "proventos", () => mercado.proventos(ticker, new Date(Date.now() - 5 * 365.25 * 864e5)));
}

/** Lista de acompanhamento de quem está logado, com a última cotação conhecida. */
export async function minhaLista() {
  const supabase = await createClient();
  const { data: itens } = await supabase.from("watchlist_items").select("ticker, name, added_at").order("ticker");
  const tickers = (itens ?? []).map((i) => i.ticker);
  if (!tickers.length) return { itens: [], falhou: false };
  let falhou = false;
  let cotacoes: Awaited<ReturnType<typeof mercado.cotacoes>> = [];
  try {
    cotacoes = await mercado.cotacoes(tickers);
  } catch {
    falhou = true;
  }
  const porTicker = new Map(cotacoes.map((c) => [c.ticker, c]));
  return { itens: (itens ?? []).map((i) => ({ ...i, cotacao: porTicker.get(i.ticker) ?? null })), falhou };
}

/** Clientes do workspace que têm o ativo (Uso no Atreides). */
export async function usoNoWorkspace(ticker: string, workspaceId: string) {
  const supabase = await createClient();
  const { data: ativo } = await supabase.from("assets").select("id").eq("ticker", ticker).maybeSingle();
  if (!ativo) return [];
  const { data } = await supabase
    .from("portfolio_transactions")
    .select("client_id, type, quantity, amount, cliente:clients(id, full_name, workspace_id, status)")
    .eq("asset_id", ativo.id)
    .eq("workspace_id", workspaceId);
  const porCliente = new Map<string, { id: string; nome: string; quantidade: number; custo: number }>();
  for (const l of data ?? []) {
    if (!l.cliente || l.cliente.status === "closed") continue;
    const atual = porCliente.get(l.client_id) ?? { id: l.cliente.id, nome: l.cliente.full_name, quantidade: 0, custo: 0 };
    const q = Number(l.quantity ?? 0);
    if (l.type === "buy") {
      atual.quantidade += q;
      atual.custo += Number(l.amount);
    } else if (l.type === "sell" && atual.quantidade > 0) {
      atual.custo -= (atual.custo / atual.quantidade) * Math.min(q, atual.quantidade);
      atual.quantidade -= Math.min(q, atual.quantidade);
    }
    porCliente.set(l.client_id, atual);
  }
  return [...porCliente.values()].filter((c) => c.quantidade > 1e-9).sort((a, b) => b.quantidade - a.quantidade);
}

export async function estaNaLista(ticker: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("watchlist_items").select("ticker", { count: "exact", head: true }).eq("ticker", ticker);
  return (count ?? 0) > 0;
}
