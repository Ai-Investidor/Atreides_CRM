import { z } from "zod";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { CLASSES, type ClasseAtivo } from "@/lib/carteira/regras";

/**
 * Regras do planejamento (Documentação/05). Usado na tela, no PDF e no servidor.
 * O sistema não traz rentabilidade pronta: as premissas são do consultor e todo número
 * calculado é uma simulação, em reais de hoje (acima da inflação).
 */

export type Plano = Tables<"plans">;
export type Premissa = Enums<"plan_premise">;
export const PREMISSAS = ["cdi_pct", "ipca_plus", "prefixed"] as const satisfies readonly Premissa[];

/** Grupos da proporção: renda fixa, renda variável e outros (multimercado, previdência). */
export type Grupo = "rf" | "rv" | "outros";
export const GRUPO_DA_CLASSE: Record<ClasseAtivo, Grupo> = {
  cash: "rf",
  inflation: "rf",
  prefixed: "rf",
  br_equities: "rv",
  reits: "rv",
  international: "rv",
  alternatives: "rv",
  multimarket: "outros",
  pension: "outros",
};
export const GRUPOS: Grupo[] = ["rf", "rv", "outros"];

/** Texto inicial de um planejamento novo (conteúdo do documento, em português pela consultoria). */
export const MODELO_PLANEJAMENTO = `## Metas e objetivos


## Estratégia


## Plano de ação


## Recomendações
`;

export type LinhaAlocacao = { asset_class: ClasseAtivo; target_pct: number; premise_kind: Premissa | null; premise_value: number | null };
export type Objetivo = { name: string; target_value: number; target_date: string; saved_value: number };

const numero = (v: unknown) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v);
const opcional = (min: number, max: number, erro: string) => z.preprocess(numero, z.number(erro).min(min, erro).max(max, erro).nullable());

export const esquemaPlanejamento = z
  .object({
    content_md: z.string().max(100_000, "textoLongo"),
    monthly_contribution: opcional(0, 1e10, "aporte"),
    cdi_ref: opcional(0, 100, "referencia"),
    ipca_ref: opcional(0, 100, "referencia"),
    allocations: z
      .array(
        z
          .object({
            asset_class: z.enum(CLASSES),
            target_pct: z.preprocess(numero, z.number("percentual").min(0, "percentual").max(100, "percentual")),
            premise_kind: z.enum(PREMISSAS).nullable(),
            premise_value: opcional(-20, 300, "premissa"),
          })
          .refine((a) => (a.premise_kind === null) === (a.premise_value === null), "premissaIncompleta")
          .refine((a) => a.premise_kind !== "cdi_pct" || a.premise_value === null || (a.premise_value >= 0 && a.premise_value <= 300), "premissa")
          .refine((a) => a.premise_kind === "cdi_pct" || a.premise_value === null || (a.premise_value >= -20 && a.premise_value <= 100), "premissa"),
      )
      .refine((l) => l.length === 0 || Math.abs(l.reduce((s, a) => s + a.target_pct, 0) - 100) <= 0.01, "soma100"),
    goals: z
      .array(
        z.object({
          name: z.string().trim().min(1, "objetivoNome").max(120, "objetivoNome"),
          target_value: z.preprocess(numero, z.number("objetivoValor").gt(0, "objetivoValor").max(1e11, "objetivoValor")),
          target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "objetivoPrazo"),
          saved_value: z.preprocess((v) => numero(v) ?? 0, z.number("objetivoGuardado").min(0, "objetivoGuardado").max(1e11, "objetivoGuardado")),
        }),
      )
      .max(30, "objetivosMax"),
  });
export type DadosPlanejamento = z.input<typeof esquemaPlanejamento>;

// ---------------------------------------------------------------- Simulação

/** Taxa nominal anual (fração) de uma classe a partir da premissa e das referências (em %). */
export function taxaNominal(kind: Premissa, valor: number, cdiPct: number, ipcaPct: number): number {
  if (kind === "cdi_pct") return (cdiPct / 100) * (valor / 100);
  if (kind === "ipca_plus") return (1 + ipcaPct / 100) * (1 + valor / 100) - 1;
  return valor / 100;
}

export type TaxaCarteira =
  | { ok: true; nominal: number; real: number; pctCdi: number | null }
  | { ok: false; motivo: "semAlocacao" | "semReferencias" | "premissasFaltando"; faltando?: ClasseAtivo[] };

/** Rentabilidade simulada da carteira: média das premissas pela proporção. */
export function taxaDaCarteira(linhas: LinhaAlocacao[], cdiPct: number | null, ipcaPct: number | null): TaxaCarteira {
  const ativas = linhas.filter((l) => l.target_pct > 0);
  if (!ativas.length) return { ok: false, motivo: "semAlocacao" };
  if (cdiPct === null || ipcaPct === null) return { ok: false, motivo: "semReferencias" };
  const faltando = ativas.filter((l) => l.premise_kind === null || l.premise_value === null).map((l) => l.asset_class);
  if (faltando.length) return { ok: false, motivo: "premissasFaltando", faltando };
  const total = ativas.reduce((s, l) => s + l.target_pct, 0);
  const nominal = ativas.reduce((s, l) => s + (l.target_pct / total) * taxaNominal(l.premise_kind!, l.premise_value!, cdiPct, ipcaPct), 0);
  return { ok: true, nominal, real: (1 + nominal) / (1 + ipcaPct / 100) - 1, pctCdi: cdiPct > 0 ? (nominal / (cdiPct / 100)) * 100 : null };
}

/** Totais por grupo (renda fixa, renda variável, outros), em %. */
export function totaisPorGrupo(linhas: LinhaAlocacao[]): Record<Grupo, number> {
  const t: Record<Grupo, number> = { rf: 0, rv: 0, outros: 0 };
  for (const l of linhas) t[GRUPO_DA_CLASSE[l.asset_class]] += l.target_pct;
  return t;
}

const taxaMensal = (realAnual: number) => Math.pow(1 + realAnual, 1 / 12) - 1;

/** Meses inteiros de hoje até a data (mínimo 0). */
export function mesesAte(hojeIso: string, dataIso: string): number {
  const [a1, m1, d1] = hojeIso.split("-").map(Number);
  const [a2, m2, d2] = dataIso.split("-").map(Number);
  return Math.max(0, (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}

/** Aporte mensal necessário para chegar ao objetivo (em reais de hoje). null = prazo vencido. */
export function aporteNecessario(o: Objetivo, realAnual: number, hojeIso: string): { tipo: "aporte"; valor: number } | { tipo: "coberto" } | { tipo: "prazo" } {
  const n = mesesAte(hojeIso, o.target_date);
  const i = taxaMensal(realAnual);
  const futuroGuardado = o.saved_value * Math.pow(1 + i, n);
  if (futuroGuardado >= o.target_value) return { tipo: "coberto" };
  if (n === 0) return { tipo: "prazo" };
  const falta = o.target_value - futuroGuardado;
  const valor = Math.abs(i) < 1e-12 ? falta / n : (falta * i) / (Math.pow(1 + i, n) - 1);
  return { tipo: "aporte", valor };
}

/** Patrimônio simulado depois de n meses, com aporte mensal (em reais de hoje). */
export function patrimonioFuturo(inicial: number, aporteMensal: number, realAnual: number, meses: number): number {
  const i = taxaMensal(realAnual);
  const f = Math.pow(1 + i, meses);
  return inicial * f + (Math.abs(i) < 1e-12 ? aporteMensal * meses : (aporteMensal * (f - 1)) / i);
}

/** Data em que o cliente completa a idade (AAAA-MM-DD), a partir da data de nascimento. */
export function dataDaIdade(nascimentoIso: string, idade: number): string {
  const [a, m, d] = nascimentoIso.split("-").map(Number);
  return `${a + idade}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

