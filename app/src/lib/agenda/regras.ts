import { z } from "zod";
import type { Enums, Tables } from "@/lib/supabase/database.types";

/** Regras da agenda (Documentação/07, etapa 1). Usado na tela e no servidor. */

export type Reuniao = Tables<"meetings">;
export type TipoReuniao = Enums<"meeting_type">;
export type FormatoReuniao = Enums<"meeting_format">;

export const TIPOS_REUNIAO = [
  "diagnosis",
  "onboarding",
  "plan_presentation",
  "periodic_review",
  "follow_up",
  "other",
] as const satisfies readonly TipoReuniao[];

export const FORMATOS = ["meet", "in_person"] as const satisfies readonly FormatoReuniao[];

/** Durações oferecidas no agendamento, em minutos. */
export const DURACOES = [30, 45, 60, 90, 120] as const;
export const DURACAO_PADRAO = 60;

const email = z.string().trim().toLowerCase().email("participante");

export const esquemaReuniao = z.object({
  title: z.string().trim().min(2, "titulo").max(200, "titulo"),
  type: z.enum(TIPOS_REUNIAO, { message: "tipo" }),
  lead_id: z.uuid().nullable().optional(),
  client_id: z.uuid().nullable().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data"),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "hora"),
  duracao: z.coerce.number().int().min(15, "duracao").max(720, "duracao"),
  format: z.enum(FORMATOS, { message: "formato" }),
  location: z.string().trim().max(300).optional().nullable(),
  attendees: z.array(email).max(50, "participantes").default([]),
  description: z.string().trim().max(5000).optional().nullable(),
});

export type DadosReuniao = z.input<typeof esquemaReuniao>;

/** Evento como a tela da agenda recebe (FullCalendar + detalhes). */
export type EventoAgenda = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  editable: boolean;
  classNames: string[];
  extendedProps:
    | { origem: "atreides"; reuniao: Reuniao; leadNome: string | null; clienteNome: string | null; htmlLink: string | null }
    | { origem: "google"; htmlLink: string | null; local: string | null; meetUrl: string | null }
    | { origem: "ocupado" };
};

/** Situação da conexão com o Google do dono do workspace aberto. */
export type SituacaoGoogle =
  | { estado: "conectado"; email: string | null; dono: string; proprio: boolean }
  | { estado: "desconectado" | "revogado"; dono: string; proprio: boolean }
  | { estado: "configuracao"; dono: string; proprio: boolean };
