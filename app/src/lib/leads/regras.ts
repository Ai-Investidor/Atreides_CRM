import { z } from "zod";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { diasEntre, hojeISO, soDigitos, dataDoInstante } from "@/lib/formatos";

export type Lead = Tables<"leads">;
export type ContatoLead = Tables<"lead_contacts">;
export type Etapa = Enums<"lead_stage">;
export type Origem = Enums<"lead_source">;
export type MotivoPerda = Enums<"lead_lost_reason">;
export type TipoContato = Enums<"lead_contact_type">;

/** Etapas do funil, na ordem (Documentação/04). */
export const ETAPAS: Etapa[] = ["new", "contacted", "diagnosis", "proposal", "won", "lost"];
export const ETAPAS_ABERTAS: Etapa[] = ["new", "contacted", "diagnosis", "proposal"];
export const ORIGENS: Origem[] = ["instagram", "active_prospecting", "referral", "ai_invest", "other"];
export const MOTIVOS_PERDA: MotivoPerda[] = ["price", "no_fit", "no_response", "competitor", "other"];
/** Tipos que o consultor registra (os demais são automáticos). */
export const TIPOS_CONTATO = ["whatsapp", "call", "meeting", "email", "note"] as const satisfies readonly TipoContato[];

/** Lead sem contato registrado há mais de 7 dias fica destacado (Documentação/04). */
export const DIAS_PARADO = 7;

export function estaAberto(etapa: Etapa) {
  return ETAPAS_ABERTAS.includes(etapa);
}

/** Situação do próximo contato em relação a hoje. */
export function situacaoContato(lead: Pick<Lead, "next_contact_on" | "stage">, hoje = hojeISO()) {
  if (!estaAberto(lead.stage) || !lead.next_contact_on) return { tipo: "nenhum" as const, dias: 0 };
  const dias = diasEntre(hoje, lead.next_contact_on);
  if (dias < 0) return { tipo: "atrasado" as const, dias: -dias };
  if (dias === 0) return { tipo: "hoje" as const, dias: 0 };
  return { tipo: "futuro" as const, dias };
}

/** Dias desde o último contato registrado (ou desde o cadastro). */
export function diasSemContato(lead: Pick<Lead, "last_contact_at" | "created_at">, hoje = hojeISO()) {
  return diasEntre(dataDoInstante(lead.last_contact_at ?? lead.created_at), hoje);
}

export function estaParado(lead: Pick<Lead, "last_contact_at" | "created_at" | "stage">, hoje = hojeISO()) {
  return estaAberto(lead.stage) && diasSemContato(lead, hoje) > DIAS_PARADO;
}

/* ── Validação dos formulários (mesmas regras do banco) ───────── */

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data");
const textoOpcional = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const esquemaNovoLead = z.object({
  full_name: z.string().trim().min(2, "nome"),
  phone: z
    .string()
    .transform(soDigitos)
    .refine((v) => v.length === 10 || v.length === 11, "telefone"),
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .nullable()
    .optional()
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "email"),
  source: z.enum(ORIGENS as [Origem, ...Origem[]], { message: "origem" }),
  referred_by: textoOpcional,
  notes: textoOpcional,
  next_contact_on: dataISO,
  next_contact_note: textoOpcional,
});

export const esquemaContato = z.object({
  lead_id: z.uuid(),
  type: z.enum(TIPOS_CONTATO, { message: "tipo" }),
  summary: z.string().trim().min(2, "resumo").max(2000),
  next_contact_on: dataISO,
  next_contact_note: textoOpcional,
});

export const esquemaEtapa = z
  .object({
    lead_id: z.uuid(),
    stage: z.enum(ETAPAS as [Etapa, ...Etapa[]]),
    next_contact_on: dataISO.optional(),
    lost_reason: z.enum(MOTIVOS_PERDA as [MotivoPerda, ...MotivoPerda[]]).optional(),
    lost_note: textoOpcional,
  })
  .refine((v) => v.stage !== "lost" || !!v.lost_reason, { message: "motivo", path: ["lost_reason"] });
