import type { Cotacao, PerfilAtivo, PontoPreco, Provento, ResultadoBusca } from "./provedor";

/**
 * Adaptador da brapi.dev (API v2, Documentação/13). Só roda no servidor: a chave
 * (BRAPI_TOKEN, sem prefixo NEXT_PUBLIC_) nunca vai para o navegador.
 *
 * O que o plano contratado não libera responde com erro de plano (ErroPlano); a camada
 * em `index.ts` usa o Yahoo Finance como reserva nesses casos. Requisições bloqueadas
 * pelo plano não gastam cota, mas ficam memorizadas por 1 hora para não repetir.
 */

const BASE = "https://brapi.dev/api";
export const NOME_BRAPI = "brapi.dev";

export class ErroPlano extends Error {
  constructor(readonly recurso: string, mensagem: string) {
    super(mensagem);
  }
}

type Plano = { nome: string; ativosPorRequisicao: number; simultaneas: number };
const PLANOS: Record<string, Omit<Plano, "nome">> = {
  free: { ativosPorRequisicao: 1, simultaneas: 1 },
  startup: { ativosPorRequisicao: 10, simultaneas: 4 },
  pro: { ativosPorRequisicao: 20, simultaneas: 16 },
};
const HORA = 3600_000;
const ERROS_DE_PLANO = new Set(["MODULES_NOT_AVAILABLE", "FEATURE_NOT_AVAILABLE", "INVALID_RANGE", "QUOTES_PER_REQUEST_EXCEEDED"]);

let plano: { valor: Plano; em: number } | null = null;
const bloqueados = new Map<string, number>();
const tipos = new Map<string, ResultadoBusca["tipo"]>();

export const brapiConfigurada = () => Boolean(process.env.BRAPI_TOKEN);

// ---------------------------------------------------------------------------
// Fila: respeita o limite de requisições simultâneas do plano (conta inteira).
// ---------------------------------------------------------------------------
let ativas = 0;
const espera: Array<() => void> = [];
async function naFila<T>(limite: number, f: () => Promise<T>): Promise<T> {
  while (ativas >= limite) await new Promise<void>((r) => espera.push(r));
  ativas++;
  try {
    return await f();
  } finally {
    ativas--;
    espera.shift()?.();
  }
}

async function chamar<T>(caminho: string, params: Record<string, string>, recurso: string): Promise<T> {
  const ate = bloqueados.get(recurso);
  if (ate && ate > Date.now()) throw new ErroPlano(recurso, "Recurso fora do plano da brapi (memorizado).");
  const { simultaneas } = await planoAtual();
  const url = `${BASE}${caminho}?${new URLSearchParams(params)}`;
  const resp = await naFila(simultaneas, () =>
    fetch(url, { headers: { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` }, cache: "no-store", signal: AbortSignal.timeout(12_000) }),
  );
  const corpo = (await resp.json().catch(() => null)) as { error?: boolean; code?: string; message?: string } | null;
  if (resp.ok && corpo && !corpo.error) return corpo as T;
  if (corpo?.code && ERROS_DE_PLANO.has(corpo.code)) {
    bloqueados.set(recurso, Date.now() + HORA);
    throw new ErroPlano(recurso, corpo.message ?? corpo.code);
  }
  if (resp.status === 404) return { results: [] } as T;
  throw new Error(`brapi ${resp.status}${corpo?.code ? ` ${corpo.code}` : ""}`);
}

/** Plano da conta (a consulta de uso não gasta cota). Na dúvida, assume o Gratuito. */
async function planoAtual(): Promise<Plano> {
  if (plano && Date.now() - plano.em < HORA) return plano.valor;
  let nome = "free";
  try {
    const r = await fetch(`${BASE}/v2/user/usage`, { headers: { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    const j = (await r.json()) as { usage?: { planName?: string } };
    if (j.usage?.planName && PLANOS[j.usage.planName]) nome = j.usage.planName;
  } catch {
    /* mantém o Gratuito */
  }
  plano = { valor: { nome, ...PLANOS[nome] }, em: Date.now() };
  return plano.valor;
}

// ---------------------------------------------------------------------------
// Conversões
// ---------------------------------------------------------------------------
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
/** A brapi entrega rentabilidades e margens como fração (0,12 = 12%). */
const pct = (v: unknown) => (num(v) !== null ? num(v)! * 100 : null);
const dia = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
const limparNome = (n: string | null | undefined, t: string) => (n ?? t).replace(/\s+/g, " ").trim();

function tipoDe(subType: string | null | undefined, ticker: string): ResultadoBusca["tipo"] {
  switch (subType) {
    case "stock":
    case "unit":
      return "acao";
    case "fii":
      return "fii";
    case "etf":
      return "etf";
    case "bdr":
      return "bdr";
    case null:
    case undefined:
      if (/(34|35|39)$/.test(ticker)) return "bdr";
      return ticker.endsWith("11") ? "fii" : "acao";
    default:
      return "outro";
  }
}

type Serie<D> = { results: Array<{ requestedSymbol: string; symbol: string; data: D | null }> };
type ItemTicker = {
  symbol: string;
  name: string;
  longName: string | null;
  subType: string | null;
  sector: string | null;
  subsector: string | null;
  isActive: boolean;
  quote: { lastPrice: number | null; changePercent: number | null; volume: number | null; marketCap: number | null } | null;
};
type DadosCotacao = {
  shortName: string;
  longName: string | null;
  currency: string;
  regularMarketPrice: number | null;
  regularMarketChangePercent: number | null;
  regularMarketTime: string | null;
  regularMarketVolume: number | null;
  marketCap: number | null;
};

const TICKER_B3 = /^[A-Z]{4}\d{1,2}$/;
const SEGMENTO_FII: Record<string, string> = { papel: "FII de papel", tijolo: "FII de tijolo", hibrido: "FII híbrido", fof: "Fundo de fundos" };

async function tickers(termo: string, limite: number) {
  const r = await chamar<{ results: ItemTicker[] }>("/v2/tickers", { search: termo, limit: String(limite) }, "tickers");
  return r.results.filter((i) => i.isActive && TICKER_B3.test(i.symbol));
}

function lotes<T>(lista: T[], tamanho: number) {
  const saida: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) saida.push(lista.slice(i, i + tamanho));
  return saida;
}

// ---------------------------------------------------------------------------
// Adaptador
// ---------------------------------------------------------------------------
export const brapi = {
  nome: NOME_BRAPI,

  async buscar(termo: string): Promise<ResultadoBusca[]> {
    const lista = await tickers(termo, 12);
    return lista.slice(0, 8).map((i) => ({ ticker: i.symbol, nome: limparNome(i.longName ?? i.name, i.symbol), tipo: tipoDe(i.subType, i.symbol) }));
  },

  /** Cotações em lotes do tamanho que o plano permite. Ticker sem cotação fica de fora. */
  async cotacoes(lista: string[]): Promise<Cotacao[]> {
    if (!lista.length) return [];
    const { ativosPorRequisicao } = await planoAtual();
    const respostas = await Promise.all(
      lotes(lista, ativosPorRequisicao).map((lote) => chamar<Serie<DadosCotacao>>("/v2/stocks/quote", { symbols: lote.join(",") }, "quote")),
    );
    return respostas.flatMap((r) =>
      r.results
        .filter((x) => x.data && num(x.data.regularMarketPrice) !== null)
        .map((x) => ({
          ticker: x.requestedSymbol,
          preco: x.data!.regularMarketPrice!,
          variacaoPct: num(x.data!.regularMarketChangePercent),
          moeda: x.data!.currency ?? "BRL",
          em: x.data!.regularMarketTime ?? new Date().toISOString(),
          fonte: NOME_BRAPI,
        })),
    );
  },

  /**
   * Perfil e indicadores. `faltaIndicadores` = o plano não liberou os indicadores
   * (a camada de cima completa com a reserva).
   */
  async perfil(ticker: string): Promise<{ perfil: PerfilAtivo; faltaIndicadores: boolean } | null> {
    const [cat] = (await tickers(ticker, 5)).filter((i) => i.symbol === ticker);
    const cot = (await chamar<Serie<DadosCotacao>>("/v2/stocks/quote", { symbols: ticker }, "quote")).results[0]?.data;
    if (!cot && !cat) return null;
    const tipo = tipoDe(cat?.subType, ticker);
    tipos.set(ticker, tipo);

    // O catálogo traz setor em inglês; o setor em português vem do perfil (ações) ou dos indicadores (FIIs).
    let setor: string | null = null;
    let industria: string | null = null;
    if (tipo === "acao" || tipo === "bdr") {
      try {
        const p = (await chamar<Serie<{ sector?: string; industry?: string }>>("/v2/stocks/profile", { symbols: ticker }, "profile")).results[0]?.data;
        setor = p?.sector ?? null;
        industria = p?.industry ?? null;
      } catch {
        /* setor do catálogo */
      }
    }

    const ind: PerfilAtivo["indicadores"] = {
      pl: null,
      pvp: null,
      evEbitda: null,
      dy: null,
      roe: null,
      margemLiquida: null,
      dividaPatrimonio: null,
      volumeMedio: num(cot?.regularMarketVolume) ?? num(cat?.quote?.volume),
      valorMercado: num(cot?.marketCap) ?? num(cat?.quote?.marketCap),
      valorPatrimonialCota: null,
    };
    let faltaIndicadores = false;

    if (tipo === "fii") {
      try {
        const f = (await chamar<{ fiis: Array<Record<string, unknown>> }>("/v2/fii/indicators", { symbols: ticker }, "fii")).fiis[0];
        if (f) {
          ind.pvp = num(f.priceToNav);
          ind.dy = pct(f.dividendYield12m);
          ind.valorPatrimonialCota = num(f.navPerShare);
          ind.valorMercado ??= num(f.price) !== null && num(f.sharesOutstanding) !== null ? num(f.price)! * num(f.sharesOutstanding)! : null;
          setor = typeof f.segmentType === "string" ? (SEGMENTO_FII[f.segmentType] ?? f.segmentType) : null;
          industria = typeof f.segmentoAtuacao === "string" ? f.segmentoAtuacao : null;
        }
      } catch (e) {
        if (!(e instanceof ErroPlano)) throw e;
        faltaIndicadores = true;
      }
    } else if (tipo === "acao" || tipo === "bdr") {
      try {
        const s = (await chamar<Serie<Record<string, unknown>>>("/v2/stocks/statistics", { symbols: ticker }, "statistics")).results[0]?.data ?? {};
        ind.pl = num(s.trailingPE);
        ind.pvp = num(s.priceToBook);
        ind.evEbitda = num(s.enterpriseToEbitda);
        ind.dy = pct(s.dividendYield);
        ind.margemLiquida = pct(s.profitMargins);
        ind.valorMercado = num(s.marketCap) ?? ind.valorMercado;
        ind.valorPatrimonialCota = num(s.bookValue);
      } catch (e) {
        if (!(e instanceof ErroPlano)) throw e;
        faltaIndicadores = true;
      }
      try {
        const d = (await chamar<Serie<Record<string, unknown>>>("/v2/stocks/financial-data", { symbols: ticker }, "financial-data")).results[0]?.data ?? {};
        ind.roe = pct(d.returnOnEquity);
        ind.margemLiquida ??= pct(d.profitMargins);
        ind.dividaPatrimonio = num(d.debtToEquity);
      } catch (e) {
        if (!(e instanceof ErroPlano)) throw e;
        faltaIndicadores = true;
      }
    }

    return {
      perfil: {
        ticker,
        nome: limparNome(cat?.longName ?? cot?.longName ?? cat?.name ?? cot?.shortName, ticker),
        setor,
        industria,
        tipo,
        preco: num(cot?.regularMarketPrice) ?? num(cat?.quote?.lastPrice),
        variacaoPct: num(cot?.regularMarketChangePercent) ?? num(cat?.quote?.changePercent),
        moeda: cot?.currency ?? "BRL",
        em: cot?.regularMarketTime ?? null,
        indicadores: ind,
      },
      faltaIndicadores,
    };
  },

  /** Fechamentos diários de até 5 anos. Plano que não libera 5 anos responde ErroPlano. */
  async historico(ticker: string): Promise<PontoPreco[]> {
    const r = await chamar<Serie<{ historicalDataPrice: Array<{ date: number; close: number | null }> }>>(
      "/v2/stocks/historical",
      { symbols: ticker, range: "5y", interval: "1d", sortOrder: "asc" },
      "historico-5y",
    );
    return (r.results[0]?.data?.historicalDataPrice ?? [])
      .filter((p) => num(p.close) !== null)
      .map((p) => ({ data: dia(p.date), fechamento: p.close! }));
  },

  /** Tipo do ativo pelo catálogo da brapi (a busca não gasta cota). Distingue FII de unit. */
  async tipo(ticker: string): Promise<ResultadoBusca["tipo"]> {
    const memo = tipos.get(ticker);
    if (memo) return memo;
    const [cat] = (await tickers(ticker, 5)).filter((i) => i.symbol === ticker);
    const tipo = tipoDe(cat?.subType, ticker);
    tipos.set(ticker, tipo);
    return tipo;
  },

  /** Proventos pagos em dinheiro desde a data (dividendos, JCP e rendimentos de FII), pelo valor efetivamente pago. */
  async proventos(ticker: string, desde: Date): Promise<Provento[]> {
    const tipo = await brapi.tipo(ticker);
    const inicio = desde.toISOString().slice(0, 10);
    type Item = { paymentDate?: string | null; lastDatePrior?: string | null; rate?: number | null; rawRate?: number | null };
    let itens: Item[];
    if (tipo === "fii") {
      itens = (await chamar<{ dividends: Item[] }>("/v2/fii/dividends", { symbols: ticker, startDate: inicio, sortOrder: "asc" }, "fii")).dividends;
    } else {
      const r = await chamar<Serie<{ cashDividends?: Item[] }>>("/v2/stocks/dividends", { symbols: ticker, startDate: inicio, sortOrder: "asc" }, "dividendos");
      itens = r.results[0]?.data?.cashDividends ?? [];
    }
    return itens
      .map((i) => ({ data: (i.paymentDate ?? i.lastDatePrior ?? "").slice(0, 10), valor: num(i.rawRate) ?? num(i.rate) }))
      .filter((i): i is Provento => Boolean(i.data) && i.valor !== null && i.valor > 0)
      .sort((a, b) => a.data.localeCompare(b.data));
  },
};
