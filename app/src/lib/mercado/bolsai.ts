import { ErroCota, getJson, num, pausas, type FonteIndicadores, type Indicadores } from "./fontes-indicadores";

/**
 * bolsai (usebolsai.com): indicadores calculados dos balanços da CVM (12 meses).
 * Exige BOLSAI_API_KEY (grátis, 200 consultas/dia, zera à meia-noite UTC).
 * Percentuais vêm em % (ROE 26,6); dívida/patrimônio vem como múltiplo (0,92).
 */

const BASE = "https://api.usebolsai.com/api/v1";
const pausa = pausas();

async function obter(caminho: string): Promise<Record<string, unknown> | null> {
  const { status, corpo } = await getJson(`${BASE}${caminho}`, { "X-API-Key": process.env.BOLSAI_API_KEY ?? "" });
  if (status === 429) throw new ErroCota("bolsai: cota do dia esgotada");
  if (status === 404) return null;
  if (status !== 200 || !corpo || typeof corpo !== "object") throw new Error(`bolsai ${status}`);
  return corpo as Record<string, unknown>;
}

export const bolsai: FonteIndicadores = {
  nome: "bolsai",
  disponivel: () => Boolean(process.env.BOLSAI_API_KEY) && !pausa.ativa(),

  async buscar(ticker, tipo) {
    try {
      if (tipo === "fii") {
        const f = await obter(`/fiis/${ticker}`);
        if (!f) return null;
        return {
          pvp: num(f.pvp),
          dy: num(f.dividend_yield_ttm) ?? num(f.dividend_yield_12m) ?? num(f.dividend_yield),
          valorPatrimonialCota: num(f.book_value_per_share),
        };
      }
      if (tipo !== "acao") return null;
      const f = await obter(`/fundamentals/${ticker}`);
      if (!f) return null;
      const saida: Partial<Indicadores> = {
        pl: num(f.pl),
        pvp: num(f.pvp),
        evEbitda: num(f.ev_ebitda),
        dy: num(f.dividend_yield),
        roe: num(f.roe),
        margemLiquida: num(f.net_margin),
        dividaPatrimonio: num(f.debt_equity),
        valorPatrimonialCota: num(f.vpa),
        valorMercado: num(f.market_cap),
      };
      return saida;
    } catch (e) {
      if (e instanceof ErroCota) pausa.porCota();
      else pausa.porFalha();
      throw e;
    }
  },
};
