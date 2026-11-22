import { z } from "zod";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { diasEntre } from "@/lib/formatos";

/** Regras das tarefas (Documentação/09, etapa 1). Usado na tela e no servidor. */

export type Tarefa = Tables<"tasks">;
export type StatusTarefa = Enums<"task_status">;

export type TarefaCompleta = Tarefa & {
  responsavel: { id: string; full_name: string } | null;
  lead: { id: string; full_name: string } | null;
  cliente: { id: string; full_name: string } | null;
  workspace: { id: string; name: string } | null;
};

export type Membro = { id: string; full_name: string };

export const VISOES = ["minhas", "workspace", "equipe"] as const;
export type Visao = (typeof VISOES)[number];

export const GRUPOS = ["atrasadas", "hoje", "proximos", "depois", "semPrazo"] as const;
export type Grupo = (typeof GRUPOS)[number];

/** Grupo de uma tarefa aberta pelo prazo (Atrasadas, Hoje, Próximos 7 dias, Depois, Sem prazo). */
export function grupoDe(t: Pick<Tarefa, "due_on">, hoje: string): Grupo {
  if (!t.due_on) return "semPrazo";
  const d = diasEntre(hoje, t.due_on);
  if (d < 0) return "atrasadas";
  if (d === 0) return "hoje";
  if (d <= 7) return "proximos";
  return "depois";
}

/** Ordem dentro do grupo: prazo mais próximo primeiro; sem prazo, as mais novas primeiro. */
export function ordenar(a: Tarefa, b: Tarefa) {
  if (a.due_on && b.due_on && a.due_on !== b.due_on) return a.due_on.localeCompare(b.due_on);
  return b.created_at.localeCompare(a.created_at);
}

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "prazo")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const esquemaTarefa = z.object({
  title: z.string().trim().min(2, "titulo").max(200, "titulo"),
  description: z.string().trim().max(5000).nullable().optional(),
  due_on: data,
  assignee_id: z.uuid("responsavel").optional(),
  lead_id: z.uuid().nullable().optional(),
  client_id: z.uuid().nullable().optional(),
});
