import { z } from "zod";
import type { Tables } from "@/lib/supabase/database.types";

/** Regras do diagnóstico (Documentação/14). Usado na tela e no servidor. */

export type Diagnostico = Tables<"diagnoses">;
export type Alvo = { tipo: "lead" | "cliente"; id: string };

export const TAMANHO_MAX_TEXTO = 100_000;

/** Texto inicial de um diagnóstico novo (conteúdo do documento, escrito em português pela consultoria). */
export const MODELO_DIAGNOSTICO = `## Objetivos


## Dores


## Sonhos


## Planejamento
_Compras e projetos (carro, imóvel, viagem…), com valor e prazo._


## Aposentadoria
_Com quantos anos pretende se aposentar e com qual renda._
`;

const numeroOpcional = (min: number, max: number, erro: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v),
    z.number(erro).min(min, erro).max(max, erro).nullable(),
  );

export const esquemaDiagnostico = z.object({
  content_md: z.string().max(TAMANHO_MAX_TEXTO, "textoLongo"),
  monthly_expense: numeroOpcional(0, 1e10, "despesa"),
  retirement_age: numeroOpcional(30, 100, "idade").refine((v) => v === null || Number.isInteger(v), "idade"),
});
export type DadosDiagnostico = z.input<typeof esquemaDiagnostico>;

/** Texto vazio ou só com o modelo sem nada escrito. */
export function semConteudo(md: string) {
  return md.replace(/^#+ .*$/gm, "").replace(/^_.*_$/gm, "").trim() === "";
}
