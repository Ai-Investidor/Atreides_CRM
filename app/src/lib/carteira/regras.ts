import { z } from "zod";
import type { Enums, Tables } from "@/lib/supabase/database.types";

/** Regras e cálculos da carteira (Documentação/06). Usado na tela e no servidor. */

export type ClasseAtivo = Enums<"asset_class">;
export type Ativo = Tables<"assets">;
export type Lancamento = Tables<"portfolio_transactions">;
export type Saldo = Tables<"portfolio_valuations">;
export type Fotografia = Tables<"portfolio_snapshots">;
export type CotacaoCache = Tables<"asset_quotes">;

export const CLASSES = [
  "cash", "inflation", "prefixed", "multimarket", "br_equities", "reits", "international", "alternatives", "pension",
] as const satisfies readonly ClasseAtivo[];

export const TIPOS_LANCAMENTO = ["buy", "sell", "deposit", "withdrawal"] as const satisfies readonly Enums<"transaction_type">[];

/** Classe sugerida pelo tipo do ativo encontrado na busca (o consultor pode trocar). */
export function classeSugerida(tipo: "acao" | "fii" | "etf" | "bdr" | "outro"): ClasseAtivo {
  return tipo === "fii" ? "reits" : tipo === "bdr" ? "international" : "br_equities";
}

export type Posicao = {
  ativo: Pick<Ativo, "id" | "ticker" | "name" | "asset_class" | "kind">;
  quantidade: number | null;
  precoMedio: number | null;
  investido: number;
  valor: number;
  preco: number | null;
  /** Data da cotação (bolsa) ou do saldo informado (manual). */
  referencia: string | null;
  /** true quando o valor não tem cotação/saldo e usa o custo. */
  estimado: boolean;
  resultado: number;
  resultadoPct: number | null;
  pctCarteira: number;
};

const arred = (v: number) => Math.round(v * 100) / 100;

/** Calcula posições a partir dos lançamentos, saldos informados e cotações em cache. */
export function calcularPosicoes(
  ativos: Map<string, Pick<Ativo, "id" | "ticker" | "name" | "asset_class" | "kind">>,
  lancamentos: Pick<Lancamento, "asset_id" | "type" | "trade_date" | "quantity" | "amount" | "created_at">[],
  saldos: Pick<Saldo, "asset_id" | "ref_date" | "value" | "created_at">[],
  cotacoes: Map<string, Pick<CotacaoCache, "price" | "quoted_at">>,
): Posicao[] {
  const porAtivo = new Map<string, typeof lancamentos>();
  for (const l of [...lancamentos].sort((a, b) => a.trade_date.localeCompare(b.trade_date) || a.created_at.localeCompare(b.created_at))) {
    porAtivo.set(l.asset_id, [...(porAtivo.get(l.asset_id) ?? []), l]);
  }
  const ultimoSaldo = new Map<string, (typeof saldos)[number]>();
  for (const s of saldos) {
    const atual = ultimoSaldo.get(s.asset_id);
    if (!atual || s.ref_date > atual.ref_date || (s.ref_date === atual.ref_date && s.created_at > atual.created_at)) ultimoSaldo.set(s.asset_id, s);
  }

  const posicoes: Omit<Posicao, "pctCarteira">[] = [];
  for (const [id, lista] of porAtivo) {
    const ativo = ativos.get(id);
    if (!ativo) continue;
    if (ativo.kind === "listed") {
      let qtd = 0;
      let custo = 0;
      for (const l of lista) {
        const q = Number(l.quantity ?? 0);
        if (l.type === "buy") {
          qtd += q;
          custo += Number(l.amount);
        } else if (l.type === "sell" && qtd > 0) {
          const medio = custo / qtd;
          const vendida = Math.min(q, qtd);
          custo -= medio * vendida;
          qtd -= vendida;
        }
      }
      if (qtd <= 1e-9) continue;
      const cot = cotacoes.get(id);
      const preco = cot ? Number(cot.price) : null;
      const valor = preco !== null ? qtd * preco : custo;
      posicoes.push({
        ativo,
        quantidade: qtd,
        precoMedio: custo / qtd,
        investido: arred(custo),
        valor: arred(valor),
        preco,
        referencia: cot?.quoted_at ?? null,
        estimado: preco === null,
        resultado: arred(valor - custo),
        resultadoPct: custo > 0 ? ((valor - custo) / custo) * 100 : null,
      });
    } else {
      let investido = 0;
      for (const l of lista) investido += l.type === "deposit" || l.type === "buy" ? Number(l.amount) : -Number(l.amount);
      const s = ultimoSaldo.get(id);
      // Saldo informado + aplicações/resgates depois da data do saldo.
      const depois = s ? lista.filter((l) => l.trade_date > s.ref_date).reduce((t, l) => t + (l.type === "deposit" || l.type === "buy" ? 1 : -1) * Number(l.amount), 0) : 0;
      const valor = s ? Number(s.value) + depois : investido;
      if (valor <= 0.005 && investido <= 0.005) continue;
      posicoes.push({
        ativo,
        quantidade: null,
        precoMedio: null,
        investido: arred(investido),
        valor: arred(valor),
        preco: null,
        referencia: s?.ref_date ?? null,
        estimado: !s,
        resultado: arred(valor - investido),
        resultadoPct: investido > 0 ? ((valor - investido) / investido) * 100 : null,
      });
    }
  }
  // Ativos manuais que só têm saldo (sem lançamento) também entram.
  for (const [id, s] of ultimoSaldo) {
    if (porAtivo.has(id) || Number(s.value) <= 0) continue;
    const ativo = ativos.get(id);
    if (!ativo) continue;
    posicoes.push({ ativo, quantidade: null, precoMedio: null, investido: 0, valor: arred(Number(s.value)), preco: null, referencia: s.ref_date, estimado: false, resultado: arred(Number(s.value)), resultadoPct: null });
  }

  const total = posicoes.reduce((t, p) => t + p.valor, 0);
  return posicoes
    .map((p) => ({ ...p, pctCarteira: total > 0 ? (p.valor / total) * 100 : 0 }))
    .sort((a, b) => CLASSES.indexOf(a.ativo.asset_class) - CLASSES.indexOf(b.ativo.asset_class) || b.valor - a.valor);
}

export type Resumo = {
  total: number;
  investido: number;
  resultado: number;
  resultadoPct: number | null;
  porClasse: { classe: ClasseAtivo; valor: number; pct: number; alvo: number | null; desvio: number | null; alerta: boolean }[];
  maiorDesvio: number;
};

/** Totais, alocação por classe e desvios em relação ao alvo. */
export function resumir(posicoes: Posicao[], alvos: Map<ClasseAtivo, number>, limite: number): Resumo {
  const total = posicoes.reduce((t, p) => t + p.valor, 0);
  const investido = posicoes.reduce((t, p) => t + p.investido, 0);
  const temAlvo = alvos.size > 0;
  const porClasse = CLASSES.map((classe) => {
    const valor = posicoes.filter((p) => p.ativo.asset_class === classe).reduce((t, p) => t + p.valor, 0);
    const pct = total > 0 ? (valor / total) * 100 : 0;
    const alvo = temAlvo ? (alvos.get(classe) ?? 0) : null;
    const desvio = alvo !== null ? pct - alvo : null;
    return { classe, valor: arred(valor), pct, alvo, desvio, alerta: desvio !== null && total > 0 && Math.abs(desvio) > limite };
  }).filter((c) => c.valor > 0 || (c.alvo ?? 0) > 0);
  return {
    total: arred(total),
    investido: arred(investido),
    resultado: arred(total - investido),
    resultadoPct: investido > 0 ? ((total - investido) / investido) * 100 : null,
    porClasse,
    maiorDesvio: porClasse.reduce((m, c) => Math.max(m, Math.abs(c.desvio ?? 0)), 0),
  };
}

/** Aportes líquidos (entradas − saídas) com data posterior a `desde`. */
export function fluxoDesde(lancamentos: Pick<Lancamento, "type" | "trade_date" | "amount">[], desde: string) {
  return lancamentos
    .filter((l) => l.trade_date > desde)
    .reduce((t, l) => t + (l.type === "buy" || l.type === "deposit" ? 1 : -1) * Number(l.amount), 0);
}

/** Variação do patrimônio entre a fotografia e agora, descontados aportes e resgates (Documentação/06). */
export function variacaoDesde(atual: number, foto: Pick<Fotografia, "total_value" | "ref_date"> | null, lancamentos: Pick<Lancamento, "type" | "trade_date" | "amount">[]) {
  if (!foto || Number(foto.total_value) <= 0) return null;
  const fluxo = fluxoDesde(lancamentos, foto.ref_date);
  const base = Number(foto.total_value);
  return { valor: arred(atual - base - fluxo), pct: ((atual - base - fluxo) / base) * 100, fluxo: arred(fluxo) };
}

/** Carteira desatualizada: mais de 35 dias sem fotografia (mensal) ou 9 dias (semanal). */
export function desatualizada(ultimaFoto: string | null, frequencia: Enums<"portfolio_frequency">, hoje: string) {
  if (!ultimaFoto) return true;
  const dias = (Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${ultimaFoto}T12:00:00Z`)) / 86_400_000;
  return dias > (frequencia === "weekly" ? 9 : 35);
}

const numero = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v),
  z.number({ message: "numero" }).finite("numero"),
);

export const esquemaLancamento = z
  .object({
    asset_id: z.uuid("ativo"),
    type: z.enum(TIPOS_LANCAMENTO, { message: "tipo" }),
    trade_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data"),
    quantity: numero.pipe(z.number().positive("quantidade")).nullable().optional(),
    unit_price: numero.pipe(z.number().min(0, "preco")).nullable().optional(),
    amount: numero.pipe(z.number().positive("valor")).nullable().optional(),
    institution: z.string().trim().max(120).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "buy" || v.type === "sell") {
      if (!v.quantity) ctx.addIssue({ code: "custom", path: ["quantity"], message: "quantidade" });
      if (v.unit_price === null || v.unit_price === undefined) ctx.addIssue({ code: "custom", path: ["unit_price"], message: "preco" });
    } else if (!v.amount) ctx.addIssue({ code: "custom", path: ["amount"], message: "valor" });
  });

export const esquemaSaldo = z.object({
  asset_id: z.uuid("ativo"),
  ref_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data"),
  value: numero.pipe(z.number().min(0, "valor")),
});

export const esquemaItemAporte = z.object({
  asset_id: z.uuid("ativo"),
  quantity: numero.pipe(z.number().positive("quantidade")),
  unit_price: numero.pipe(z.number().min(0, "preco")),
});
