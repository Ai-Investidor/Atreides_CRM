/**
 * Tipos dos dados de mercado (Documentação/13). As telas e ações nunca chamam um
 * provedor direto: usam `mercado` (index.ts), que escolhe brapi.dev ou Yahoo Finance.
 */

export type ResultadoBusca = {
  /** Ticker da B3, sem sufixo (ex.: PETR4). */
  ticker: string;
  nome: string;
  tipo: "acao" | "fii" | "etf" | "bdr" | "outro";
};

export type Cotacao = {
  ticker: string;
  preco: number;
  variacaoPct: number | null;
  moeda: string;
  /** Horário da cotação informado pelo provedor. */
  em: string;
  fonte: string;
};

/** Indicadores do ativo. Campo ausente no provedor = null (a tela mostra "indisponível"). */
export type PerfilAtivo = {
  ticker: string;
  nome: string;
  setor: string | null;
  industria: string | null;
  tipo: ResultadoBusca["tipo"];
  preco: number | null;
  variacaoPct: number | null;
  moeda: string;
  em: string | null;
  indicadores: {
    pl: number | null;
    pvp: number | null;
    evEbitda: number | null;
    dy: number | null;
    roe: number | null;
    margemLiquida: number | null;
    dividaPatrimonio: number | null;
    volumeMedio: number | null;
    valorMercado: number | null;
    valorPatrimonialCota: number | null;
  };
};

export type PontoPreco = { data: string; fechamento: number };
export type Provento = { data: string; valor: number };

export interface MarketDataProvider {
  readonly nome: string;
  buscar(termo: string): Promise<ResultadoBusca[]>;
  cotacoes(tickers: string[]): Promise<Cotacao[]>;
  perfil(ticker: string): Promise<PerfilAtivo | null>;
  /** Histórico diário de fechamento desde a data (até ~5 anos). */
  historico(ticker: string, desde: Date): Promise<PontoPreco[]>;
  /** Proventos pagos desde a data. */
  proventos(ticker: string, desde: Date): Promise<Provento[]>;
}
