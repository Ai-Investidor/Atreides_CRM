import YahooFinance from "yahoo-finance2";
import type { MarketDataProvider, PerfilAtivo, ResultadoBusca } from "./provedor";

/**
 * Adaptador do Yahoo Finance (não oficial; ver os limites em Documentação/13).
 * Ativos da B3 usam o sufixo ".SA". Ignora mercado fracionário e opções (PETR4F, PETR4Q…).
 */
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const TICKER_B3 = /^[A-Z]{4}\d{1,2}$/;

const limparNome = (n: string | undefined, t: string) => (n ?? t).replace(/\s+/g, " ").trim();

function tipoDe(ticker: string, quoteType?: string): ResultadoBusca["tipo"] {
  if (quoteType === "ETF") return "etf";
  if (/(34|35|39)$/.test(ticker)) return "bdr";
  if (ticker.endsWith("11")) return "fii";
  if (quoteType === "EQUITY") return "acao";
  return "outro";
}

export const yahoo: MarketDataProvider = {
  nome: "Yahoo Finance",

  async buscar(termo) {
    const r = await yf.search(termo, { quotesCount: 15, newsCount: 0 });
    const vistos = new Set<string>();
    const lista: ResultadoBusca[] = [];
    for (const q of r.quotes) {
      const simbolo = "symbol" in q ? String(q.symbol) : "";
      if (!simbolo.endsWith(".SA")) continue;
      const ticker = simbolo.slice(0, -3);
      if (!TICKER_B3.test(ticker) || vistos.has(ticker)) continue;
      vistos.add(ticker);
      const nome = "shortname" in q ? (q.shortname as string | undefined) : undefined;
      const longo = "longname" in q ? (q.longname as string | undefined) : undefined;
      lista.push({ ticker, nome: limparNome(longo ?? nome, ticker), tipo: tipoDe(ticker, "quoteType" in q ? String(q.quoteType) : undefined) });
    }
    return lista.slice(0, 8);
  },

  async cotacoes(tickers) {
    if (!tickers.length) return [];
    const resp = await yf.quote(tickers.map((t) => `${t}.SA`));
    const lista = Array.isArray(resp) ? resp : [resp];
    return lista
      .filter((q) => typeof q.regularMarketPrice === "number")
      .map((q) => ({
        ticker: String(q.symbol).replace(/\.SA$/, ""),
        preco: q.regularMarketPrice as number,
        variacaoPct: typeof q.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : null,
        moeda: q.currency ?? "BRL",
        em: (q.regularMarketTime instanceof Date ? q.regularMarketTime : new Date()).toISOString(),
        fonte: "Yahoo Finance",
      }));
  },

  async perfil(ticker) {
    const q = await yf.quoteSummary(`${ticker}.SA`, { modules: ["price", "summaryDetail", "defaultKeyStatistics", "financialData", "assetProfile"] });
    if (!q?.price) return null;
    const sd = q.summaryDetail;
    const ks = q.defaultKeyStatistics;
    const fd = q.financialData;
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const dy = n(sd?.dividendYield) ?? (n(sd?.trailingAnnualDividendYield) || null);
    const perfil: PerfilAtivo = {
      ticker,
      nome: limparNome(q.price.longName ?? q.price.shortName ?? undefined, ticker),
      setor: q.assetProfile?.sector ?? null,
      industria: q.assetProfile?.industry ?? null,
      tipo: tipoDe(ticker, q.price.quoteType),
      preco: n(q.price.regularMarketPrice),
      variacaoPct: n(q.price.regularMarketChangePercent) !== null ? n(q.price.regularMarketChangePercent)! * 100 : null,
      moeda: q.price.currency ?? "BRL",
      em: q.price.regularMarketTime instanceof Date ? q.price.regularMarketTime.toISOString() : null,
      indicadores: {
        pl: n(sd?.trailingPE),
        pvp: n(ks?.priceToBook),
        evEbitda: n(ks?.enterpriseToEbitda),
        dy: dy !== null ? dy * 100 : null,
        roe: n(fd?.returnOnEquity) !== null ? n(fd?.returnOnEquity)! * 100 : null,
        margemLiquida: n(fd?.profitMargins) !== null ? n(fd?.profitMargins)! * 100 : null,
        // O Yahoo entrega em % (21,3); o sistema usa múltiplo (0,213), como as outras fontes.
        dividaPatrimonio: n(fd?.debtToEquity) !== null ? n(fd?.debtToEquity)! / 100 : null,
        volumeMedio: n(sd?.averageDailyVolume10Day) ?? n(sd?.averageVolume),
        valorMercado: n(sd?.marketCap),
        valorPatrimonialCota: n(ks?.bookValue),
      },
    };
    return perfil;
  },

  async historico(ticker, desde) {
    const r = await yf.chart(`${ticker}.SA`, { period1: desde, interval: "1d" });
    return r.quotes
      .filter((q) => typeof q.close === "number")
      .map((q) => ({ data: q.date.toISOString().slice(0, 10), fechamento: q.close as number }));
  },

  async proventos(ticker, desde) {
    const r = await yf.chart(`${ticker}.SA`, { period1: desde, interval: "1mo", events: "div" });
    return (r.events?.dividends ?? []).map((d) => ({ data: d.date.toISOString().slice(0, 10), valor: d.amount }));
  },
};
