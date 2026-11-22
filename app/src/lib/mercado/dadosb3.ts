import { divide, ErroCota, getJson, num, pausas, type FonteIndicadores, type Indicadores } from "./fontes-indicadores";

/**
 * Dados B3 (dadosb3.com): indicadores recalculados dos arquivos públicos da CVM e da B3.
 * Funciona sem chave (150 consultas/dia por endereço); com DADOSB3_API_KEY, 200/dia.
 * Os múltiplos dela usam o preço da data do balanço: aqui P/L, P/VP e DY são recalculados
 * com a cotação do dia.
 */

const BASE = "https://dadosb3.com";
const pausa = pausas();

type Multiplos = {
  valuation?: { preco?: number; vpa?: number; ev?: number; valor_de_mercado?: number; market_cap?: number; proventos_12m?: number; dy_12m?: number } | null;
  trimestrais?: Array<{ preco?: number; pvp?: number | null; pl_ttm?: number | null; lpa_ttm?: number | null }>;
};
type Indicador = { ano: number; nome: string; valor: number | null };
type Fii = {
  pvp?: Array<{ vp_cota?: number | null; pvp?: number | null }>;
  dy_12m?: { rendimento_12m?: number | null; dy_12m?: number | null } | null;
};

async function obter<T>(caminho: string): Promise<T | null> {
  const chave = process.env.DADOSB3_API_KEY;
  const { status, corpo } = await getJson(`${BASE}${caminho}`, chave ? { "X-API-Key": chave } : {});
  if (status === 429) throw new ErroCota("Dados B3: cota do dia esgotada");
  if (status === 404) return null;
  if (status !== 200 || !corpo || typeof corpo !== "object") throw new Error(`Dados B3 ${status}`);
  return corpo as T;
}

/** Valor mais recente de cada indicador anual (ROE, margem, EBITDA…). */
function ultimos(lista: Indicador[]) {
  const mapa = new Map<string, { ano: number; valor: number }>();
  for (const i of lista) {
    if (num(i.valor) === null) continue;
    const atual = mapa.get(i.nome);
    if (!atual || i.ano > atual.ano) mapa.set(i.nome, { ano: i.ano, valor: i.valor! });
  }
  return (nome: string) => mapa.get(nome)?.valor ?? null;
}

/** DY de 12 meses pelo preço do dia. Quando o bloco de múltiplos não traz os proventos, usa a rota de dividendos. */
async function dy(ticker: string, preco: number | null, proventos12m: number | null) {
  let proventos = proventos12m;
  if (proventos === null) {
    const d = await obter<{ dividend_yield_12m?: { proventos_12m?: number | null; valor?: number | null } | null }>(`/empresas/${ticker}/dividendos`);
    proventos = num(d?.dividend_yield_12m?.proventos_12m);
    if (proventos === null || preco === null) return num(d?.dividend_yield_12m?.valor) !== null ? num(d?.dividend_yield_12m?.valor)! * 100 : null;
  }
  return preco !== null && preco > 0 ? (proventos / preco) * 100 : null;
}

export const dadosB3: FonteIndicadores = {
  nome: "Dados B3",
  disponivel: () => !pausa.ativa(),

  async buscar(ticker, tipo, precoAtual) {
    try {
      if (tipo === "fii") {
        const f = await obter<Fii>(`/fiis/${ticker}`);
        if (!f) return null;
        const ultimo = [...(f.pvp ?? [])].reverse().find((p) => num(p.vp_cota) !== null);
        const vp = num(ultimo?.vp_cota);
        const rend = num(f.dy_12m?.rendimento_12m);
        return {
          valorPatrimonialCota: vp,
          pvp: precoAtual !== null ? divide(precoAtual, vp) : num(ultimo?.pvp),
          dy: precoAtual !== null && rend !== null ? (rend / precoAtual) * 100 : num(f.dy_12m?.dy_12m) !== null ? num(f.dy_12m?.dy_12m)! * 100 : null,
        };
      }
      if (tipo !== "acao") return null;

      const m = await obter<Multiplos>(`/empresas/${ticker}/multiplos`);
      if (!m) return null;
      const ind = await obter<{ indicadores?: Indicador[] }>(`/empresas/${ticker}/indicadores`);
      const anual = ultimos(ind?.indicadores ?? []);

      const v = m.valuation ?? {};
      const preco = precoAtual ?? num(v.preco);
      // Último trimestre com P/L de 12 meses e P/VP. Os múltiplos da Dados B3 usam o preço da
      // data do balanço e já tratam units (1 unit = várias ações): aqui só são atualizados pelo
      // preço do dia. Recalcular pelo LPA erraria em units.
      const tri = [...(m.trimestrais ?? [])].reverse().find((t) => num(t.pl_ttm) !== null || num(t.pvp) !== null);
      const fator = preco !== null ? divide(preco, num(tri?.preco)) : 1;
      const vpa = divide(num(tri?.preco), num(tri?.pvp)) ?? num(v.vpa);
      const ebitda = anual("ebitda");
      const roe = anual("roe");
      const margem = anual("margem_liquida");

      const saida: Partial<Indicadores> = {
        pl: num(tri?.pl_ttm) !== null && fator !== null ? num(tri?.pl_ttm)! * fator : null,
        pvp: num(tri?.pvp) !== null && fator !== null ? num(tri?.pvp)! * fator : null,
        evEbitda: ebitda !== null && ebitda > 0 ? divide(num(v.ev), ebitda) : null,
        dy: await dy(ticker, preco, num(v.proventos_12m)),
        roe: roe !== null ? roe * 100 : null,
        margemLiquida: margem !== null ? margem * 100 : null,
        valorPatrimonialCota: vpa,
        valorMercado: num(v.valor_de_mercado) ?? num(v.market_cap),
      };
      return saida;
    } catch (e) {
      if (e instanceof ErroCota) pausa.porCota();
      else pausa.porFalha();
      throw e;
    }
  },
};
