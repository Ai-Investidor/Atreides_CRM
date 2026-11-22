import { z } from "zod";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { ORIGENS } from "@/lib/leads/regras";
import { diasEntre, hojeISO } from "@/lib/formatos";

/** Regras de clientes (Documentação/03). Usado na tela e no servidor. */

export type Cliente = Tables<"clients">;
export type StatusCliente = Enums<"client_status">;
export type Perfil = Enums<"investor_profile">;
export type CategoriaDoc = Enums<"document_category">;
export type TipoEvento = Enums<"client_event_type">;

export const STATUS = ["onboarding", "active", "paused", "closed"] as const satisfies readonly StatusCliente[];
export const PERFIS = ["conservative", "moderate", "aggressive"] as const satisfies readonly Perfil[];
export const ESTADOS_CIVIS = ["single", "married", "stable_union", "divorced", "widowed"] as const satisfies readonly Enums<"marital_status">[];
export const PAPEIS = ["holder", "spouse", "dependent"] as const satisfies readonly Enums<"family_role">[];
export const CATEGORIAS = ["contract", "id_document", "proof_of_address", "lgpd_consent", "income_proof", "other"] as const satisfies readonly CategoriaDoc[];
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
  "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const TAMANHO_MAX_DOC = 20 * 1024 * 1024;
export const TIPOS_DOC = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

/** Valida CPF (dígitos verificadores). O banco confere de novo. */
export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** "52998224725" → "529.982.247-25" (formata enquanto digita). */
export function formatarCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/** CPF parcialmente oculto para listas: "***.982.247-**". */
export function cpfMascarado(cpf: string | null): string {
  if (!cpf) return "—";
  const f = formatarCPF(cpf);
  return `***${f.slice(3, 11)}-**`;
}

/** Situação do perfil de investidor: sem perfil, vencido, vencendo (30 dias) ou em dia. */
export function situacaoPerfil(c: Pick<Cliente, "investor_profile" | "profile_valid_until">, hoje = hojeISO()) {
  if (!c.investor_profile || !c.profile_valid_until) return { tipo: "sem" as const };
  const dias = diasEntre(hoje, c.profile_valid_until);
  if (dias < 0) return { tipo: "vencido" as const, dias: -dias };
  if (dias <= 30) return { tipo: "vencendo" as const, dias };
  return { tipo: "ok" as const, dias };
}

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();
const digitos = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : v);
const dataOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data")
  .or(z.literal(""))
  .transform((v) => v || null)
  .nullable()
  .optional();
const numeroOpcional = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v),
  z.number().min(0, "valor").max(1e13, "valor").nullable(),
);

/** Campos do cadastro. CPF, celular e e-mail obrigatórios, exceto para dependente. */
export const esquemaCliente = z
  .object({
    full_name: z.string().trim().min(2, "nome").max(200, "nome"),
    cpf: z.preprocess(digitos, z.string().refine((v) => v === "" || cpfValido(v), "cpf")).transform((v) => v || null).nullable().optional(),
    phone: z.preprocess(digitos, z.string().regex(/^(\d{10,11})?$/, "telefone")).transform((v) => v || null).nullable().optional(),
    email: z.string().trim().toLowerCase().email("email").or(z.literal("")).transform((v) => v || null).nullable().optional(),
    birth_date: dataOpcional,
    marital_status: z.enum(ESTADOS_CIVIS).nullable().optional().or(z.literal("").transform(() => null)),
    profession: texto(120),
    city: texto(120),
    state: z.enum(UFS).nullable().optional().or(z.literal("").transform(() => null)),
    source: z.enum(ORIGENS).nullable().optional().or(z.literal("").transform(() => null)),
    referred_by: texto(200),
    contract_start_on: dataOpcional,
    monthly_income: numeroOpcional.optional(),
    declared_net_worth: numeroOpcional.optional(),
    notes: texto(5000),
    family_role: z.enum(PAPEIS).nullable().optional(),
    report_frequency: z.enum(["monthly", "quarterly", "semiannual"]).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.family_role === "dependent") return;
    if (!v.cpf) ctx.addIssue({ code: "custom", path: ["cpf"], message: "cpfObrigatorio" });
    if (!v.phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "telefoneObrigatorio" });
    if (!v.email) ctx.addIssue({ code: "custom", path: ["email"], message: "emailObrigatorio" });
  });

export type DadosCliente = z.input<typeof esquemaCliente>;

/** Questionário de perfil (conteúdo vem da versão ativa no banco). */
export type Opcao = { id: string; text: string; points: number };
export type Questao = { id: string; dimension: string; text: string; options: Opcao[] };
export type VersaoQuestionario = {
  id: string;
  code: string;
  title: string;
  questions: Questao[];
  validated_at: string | null;
};
export const DIMENSOES = ["objetivos", "horizonte", "situacao_financeira", "conhecimento", "tolerancia_risco"] as const;
