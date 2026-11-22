"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { esquemaTarefa } from "./regras";

/** Códigos traduzidos na tela em tarefas.erros.<código>. */
export type ResultadoTarefa = { ok: true; id?: string } | { ok: false; erros?: Record<string, string>; mensagem?: string };

function revalidar(leadId?: string | null, clienteId?: string | null) {
  revalidatePath("/tarefas");
  revalidatePath("/painel");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

function mensagemDoBanco(hint?: string) {
  if (hint === "assignee_inactive") return "responsavelInativo";
  if (hint === "lead_workspace") return "leadWorkspace";
  if (hint === "client_workspace") return "clienteWorkspace";
  if (hint === "process_pending") return "etapasPendentes";
  return "salvar";
}

function validar(dados: unknown) {
  const v = esquemaTarefa.safeParse(dados);
  if (v.success) return { dados: v.data };
  const erros: Record<string, string> = {};
  for (const i of v.error.issues) erros[String(i.path[0])] ??= i.message;
  return { erro: { ok: false, erros } as ResultadoTarefa };
}

/** Cria tarefa no workspace aberto. Responsável padrão: o dono do workspace. */
export async function criarTarefa(entrada: Record<string, unknown>): Promise<ResultadoTarefa> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };
  const v = validar(entrada);
  if ("erro" in v) return v.erro!;
  const d = v.dados!;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: sessao.atual.id,
      title: d.title,
      description: d.description || null,
      due_on: d.due_on ?? null,
      assignee_id: d.assignee_id ?? sessao.atual.owner_id,
      lead_id: d.lead_id ?? null,
      client_id: d.client_id ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, mensagem: mensagemDoBanco(error.hint) };
  revalidar(d.lead_id, d.client_id);
  return { ok: true, id: data.id };
}

/** Edita título, descrição, prazo, responsável e vínculo. */
export async function editarTarefa(id: string, entrada: Record<string, unknown>): Promise<ResultadoTarefa> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };
  const v = validar(entrada);
  if ("erro" in v) return v.erro!;
  const d = v.dados!;

  const supabase = await createClient();
  const { data: atual } = await supabase.from("tasks").select("lead_id, client_id, origin").eq("id", id).maybeSingle();
  if (!atual) return { ok: false, mensagem: "naoEncontrada" };
  const { error } = await supabase
    .from("tasks")
    .update({
      title: d.title,
      description: d.description || null,
      due_on: d.due_on ?? null,
      ...(d.assignee_id ? { assignee_id: d.assignee_id } : {}),
      lead_id: d.lead_id ?? null,
      // Tarefa de processo continua presa ao cliente do processo.
      ...(atual.origin === "manual" ? { client_id: d.client_id ?? null } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, mensagem: mensagemDoBanco(error.hint) };
  revalidar(d.lead_id ?? atual.lead_id, atual.client_id ?? d.client_id);
  return { ok: true, id };
}

/** Conclui ou reabre. Quem concluiu e quando são gravados pelo banco. */
export async function concluirTarefa(id: string, feita: boolean): Promise<ResultadoTarefa> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: feita ? "done" : "open" })
    .eq("id", id)
    .select("lead_id, client_id")
    .maybeSingle();
  if (error) return { ok: false, mensagem: mensagemDoBanco(error.hint) };
  if (!data) return { ok: false, mensagem: "naoEncontrada" };
  revalidar(data.lead_id, data.client_id);
  return { ok: true, id };
}

/** Exclui tarefa manual (o banco só deixa quem criou ou o admin). */
export async function excluirTarefa(id: string): Promise<ResultadoTarefa> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("lead_id, client_id");
  if (error) return { ok: false, mensagem: "salvar" };
  if (!data?.length) return { ok: false, mensagem: "semPermissaoExcluir" };
  revalidar(data[0].lead_id, data[0].client_id);
  return { ok: true };
}

/** "Não se aplica" (tarefas de processo e do sistema), com motivo obrigatório. */
export async function naoSeAplica(id: string, motivo: string): Promise<ResultadoTarefa> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };
  if (motivo.trim().length < 3) return { ok: false, erros: { motivo: "motivo" } };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "not_applicable", not_applicable_reason: motivo.trim().slice(0, 500) })
    .eq("id", id)
    .select("lead_id, client_id")
    .maybeSingle();
  if (error) return { ok: false, mensagem: mensagemDoBanco(error.hint) };
  if (!data) return { ok: false, mensagem: "naoEncontrada" };
  revalidar(data.lead_id, data.client_id);
  return { ok: true, id };
}
