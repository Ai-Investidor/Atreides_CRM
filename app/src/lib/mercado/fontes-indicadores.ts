import type { PerfilAtivo, ResultadoBusca } from "./provedor";

/**
 * Fontes gratuitas de indicadores (Documentação/13), consultadas em cadeia por indicador.
 * Cada fonte devolve só o que tem; o que faltar fica para a próxima.
 */

export type Indicadores = PerfilAtivo["indicadores"];

export interface FonteIndicadores {
  readonly nome: string;
  /** A fonte pode ser chamada agora (chave presente, sem pausa por cota ou falha). */
  disponivel(): boolean;
  buscar(ticker: string, tipo: ResultadoBusca["tipo"], precoAtual: number | null): Promise<Partial<Indicadores> | null>;
}

/** Cota do dia esgotada: a fonte volta no dia seguinte (as duas zeram à meia-noite UTC). */
export class ErroCota extends Error {}

/** Controla as pausas de uma fonte depois de cota esgotada ou falha. */
export function pausas() {
  let ate = 0;
  return {
    ativa: () => Date.now() < ate,
    porCota() {
      const amanha = new Date();
      amanha.setUTCHours(24, 0, 0, 0);
      ate = amanha.getTime();
    },
    porFalha() {
      ate = Date.now() + 3600_000;
    },
  };
}

export const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const divide = (a: number | null, b: number | null) => (a !== null && b !== null && b !== 0 ? a / b : null);

/** Campos que a cadeia tenta preencher, por tipo de ativo. */
export function camposDoTipo(tipo: ResultadoBusca["tipo"]): Array<keyof Indicadores> {
  if (tipo === "fii") return ["pvp", "dy", "valorPatrimonialCota"];
  if (tipo === "acao") return ["pl", "pvp", "evEbitda", "dy", "roe", "margemLiquida", "dividaPatrimonio", "valorPatrimonialCota"];
  return [];
}

export async function getJson(url: string, headers: Record<string, string>): Promise<{ status: number; corpo: unknown }> {
  const resp = await fetch(url, { headers: { Accept: "application/json", ...headers }, cache: "no-store", signal: AbortSignal.timeout(12_000) });
  const corpo = await resp.json().catch(() => null);
  return { status: resp.status, corpo };
}
