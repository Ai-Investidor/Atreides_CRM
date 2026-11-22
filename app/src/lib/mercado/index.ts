import { brapi, brapiConfigurada, ErroPlano, NOME_BRAPI } from "./brapi";
import { bolsai } from "./bolsai";
import { dadosB3 } from "./dadosb3";
import { camposDoTipo, type FonteIndicadores, type Indicadores } from "./fontes-indicadores";
import { yahoo } from "./yahoo";
import type { Cotacao, PerfilAtivo, PontoPreco, Provento, ResultadoBusca } from "./provedor";

/**
 * Camada de dados de mercado usada pelo sistema (Documentação/13).
 *
 * Com BRAPI_TOKEN configurado, a brapi.dev é a fonte principal de busca, cotações, perfil,
 * histórico e proventos; o Yahoo Finance é a reserva para o que o plano não libera e para
 * falhas. Indicadores seguem a cadeia gratuita Dados B3 → bolsai → Yahoo, por indicador.
 * Cada dado volta com a fonte de onde veio, que a tela mostra.
 */

export type ComFonte<T> = { dado: T; fonte: string };

const usaBrapi = brapiConfigurada();

/** Ordem das fontes gratuitas de indicadores (Documentação/13). */
const FONTES_INDICADORES: FonteIndicadores[] = [dadosB3, bolsai];

/** Zera os indicadores que a cadeia vai buscar (mantém volume e valor de mercado da base). */
function vazios(tipo: PerfilAtivo["tipo"]): Partial<Indicadores> {
  return Object.fromEntries(camposDoTipo(tipo).map((c) => [c, null]));
}

async function comReserva<T>(principal: () => Promise<T>, reserva: () => Promise<T>, fonte: string): Promise<ComFonte<T>> {
  if (!usaBrapi) return { dado: await reserva(), fonte: yahoo.nome };
  try {
    return { dado: await principal(), fonte };
  } catch (e) {
    if (!(e instanceof ErroPlano)) console.warn(`[mercado] brapi falhou, usando ${yahoo.nome}:`, e instanceof Error ? e.message : e);
    return { dado: await reserva(), fonte: yahoo.nome };
  }
}

export const mercado = {
  nome: usaBrapi ? NOME_BRAPI : yahoo.nome,

  async buscar(termo: string): Promise<ResultadoBusca[]> {
    return (await comReserva(() => brapi.buscar(termo), () => yahoo.buscar(termo), NOME_BRAPI)).dado;
  },

  /** Cotações. O que a brapi não devolver é buscado no Yahoo. */
  async cotacoes(tickers: string[]): Promise<Cotacao[]> {
    if (!tickers.length) return [];
    let lista: Cotacao[] = [];
    if (usaBrapi) {
      try {
        lista = await brapi.cotacoes(tickers);
      } catch (e) {
        if (!(e instanceof ErroPlano)) console.warn("[mercado] cotações da brapi falharam:", e instanceof Error ? e.message : e);
      }
    }
    const achados = new Set(lista.map((c) => c.ticker));
    const faltam = tickers.filter((t) => !achados.has(t));
    if (faltam.length) lista = lista.concat(await yahoo.cotacoes(faltam));
    return lista;
  },

  /**
   * Perfil e indicadores. Nome, setor e cotação vêm da brapi (ou do Yahoo). Os indicadores
   * seguem a cadeia por indicador: brapi (se o plano liberar) → Dados B3 → bolsai → Yahoo.
   */
  async perfil(ticker: string): Promise<ComFonte<PerfilAtivo> | null> {
    let base: PerfilAtivo | null = null;
    let fonteBase = yahoo.nome;
    let completo = false;
    if (usaBrapi) {
      try {
        const r = await brapi.perfil(ticker);
        if (r) {
          base = r.perfil;
          fonteBase = NOME_BRAPI;
          completo = !r.faltaIndicadores;
        }
      } catch (e) {
        console.warn("[mercado] perfil da brapi falhou:", e instanceof Error ? e.message : e);
      }
    }
    let reservaYahoo: PerfilAtivo | null | undefined;
    if (!base) {
      reservaYahoo = await yahoo.perfil(ticker);
      if (!reservaYahoo) return null;
      // O Yahoo só cede nome, setor e cotação aqui; os indicadores passam pela cadeia.
      base = { ...reservaYahoo, indicadores: { ...reservaYahoo.indicadores, ...vazios(reservaYahoo.tipo) } };
    }
    if (completo) return { dado: base, fonte: NOME_BRAPI };

    const indicadores = { ...base.indicadores };
    const campos = camposDoTipo(base.tipo);
    const faltam = () => campos.filter((c) => indicadores[c] === null);
    const usadas: string[] = [];
    const preencher = (parcial: Partial<Indicadores> | null | undefined, nome: string) => {
      if (!parcial) return;
      let usou = false;
      for (const k of Object.keys(parcial) as Array<keyof Indicadores>) {
        const v = parcial[k];
        if (indicadores[k] === null && typeof v === "number" && Number.isFinite(v)) {
          indicadores[k] = v;
          if (campos.includes(k)) usou = true;
        }
      }
      if (usou) usadas.push(nome);
    };
    if (fonteBase === NOME_BRAPI && campos.some((c) => base.indicadores[c] !== null)) usadas.push(NOME_BRAPI);

    for (const fonte of FONTES_INDICADORES) {
      if (!faltam().length) break;
      if (!fonte.disponivel()) continue;
      try {
        preencher(await fonte.buscar(ticker, base.tipo, base.preco), fonte.nome);
      } catch (e) {
        console.warn(`[mercado] ${fonte.nome} falhou, seguindo para a próxima fonte:`, e instanceof Error ? e.message : e);
      }
    }
    if (faltam().length) {
      if (reservaYahoo === undefined) reservaYahoo = await yahoo.perfil(ticker).catch(() => null);
      preencher(reservaYahoo?.indicadores, yahoo.nome);
    }

    const fonte = usadas.length ? `${fonteBase} · indicadores: ${usadas.join(", ")}` : fonteBase;
    return { dado: { ...base, indicadores }, fonte };
  },

  /** Histórico diário de 5 anos. */
  historico(ticker: string, desde: Date): Promise<ComFonte<PontoPreco[]>> {
    return comReserva(() => brapi.historico(ticker), () => yahoo.historico(ticker, desde), NOME_BRAPI);
  },

  /** Proventos pagos desde a data. */
  proventos(ticker: string, desde: Date): Promise<ComFonte<Provento[]>> {
    return comReserva(() => brapi.proventos(ticker, desde), () => yahoo.proventos(ticker, desde), NOME_BRAPI);
  },
};

export type { Cotacao, PerfilAtivo, PontoPreco, Provento, ResultadoBusca } from "./provedor";
