"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { buscarDuplicado } from "./consultas";
import { esquemaContato, esquemaEtapa, esquemaNovoLead, estaAberto } from "./regras";

/**
 * Resultado padrão das ações: `erros` traz o campo → código do erro
 * (traduzido na tela em leads.erros.<código>).
 */
export type ResultadoAcao =
  | { ok: true; id?: string }
  | { ok: false; erros?: Record<string, string>; mensagem?: string; duplicado?: { id: string; nome: string } };

function errosDe(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: Record<string, string> = {};
  for (const i of issues) {
    const campo = String(i.path[0] ?? "geral");
    erros[campo] ??= i.message;
  }
  return erros;
}

function revalidar(id?: string) {
  revalidatePath("/leads");
  revalidatePath("/painel");
  if (id) revalidatePath(`/leads/${id}`);
}

/** Cadastro rápido de lead no workspace aberto. */
export async function criarLead(dados: Record<string, unknown>, ignorarDuplicado = false): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };

  const v = esquemaNovoLead.safeParse(dados);
  if (!v.success) return { ok: false, erros: errosDe(v.error.issues) };

  if (!ignorarDuplicado) {
    const dup = await buscarDuplicado(v.data.phone);
    if (dup) return { ok: false, duplicado: { id: dup.id, nome: dup.full_name } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...v.data, workspace_id: sessao.atual.id, created_by: sessao.perfil.id })
    .select("id")
    .single();

  if (error) return { ok: false, mensagem: "salvar" };
  revalidar(data.id);
  return { ok: true, id: data.id };
}

/** Registra um contato e marca o próximo. */
export async function registrarContato(dados: Record<string, unknown>): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };

  const v = esquemaContato.safeParse(dados);
  if (!v.success) return { ok: false, erros: errosDe(v.error.issues) };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("id, workspace_id, stage").eq("id", v.data.lead_id).maybeSingle();
  if (!lead) return { ok: false, mensagem: "naoEncontrado" };
  if (!estaAberto(lead.stage)) return { ok: false, mensagem: "encerrado" };

  const { error: e1 } = await supabase.from("lead_contacts").insert({
    lead_id: lead.id,
    workspace_id: lead.workspace_id,
    type: v.data.type,
    summary: v.data.summary,
    created_by: sessao.perfil.id,
  });
  if (e1) return { ok: false, mensagem: "salvar" };

  const { error: e2 } = await supabase
    .from("leads")
    .update({ next_contact_on: v.data.next_contact_on, next_contact_note: v.data.next_contact_note ?? null })
    .eq("id", lead.id);
  if (e2) return { ok: false, mensagem: "salvar" };

  revalidar(lead.id);
  return { ok: true, id: lead.id };
}

/** Muda a etapa. Perdido exige motivo; voltar para etapa aberta exige próximo contato. */
export async function moverEtapa(dados: Record<string, unknown>): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };

  const v = esquemaEtapa.safeParse(dados);
  if (!v.success) return { ok: false, erros: errosDe(v.error.issues) };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("id, stage, next_contact_on").eq("id", v.data.lead_id).maybeSingle();
  if (!lead) return { ok: false, mensagem: "naoEncontrado" };
  if (lead.stage === v.data.stage) return { ok: true, id: lead.id };

  const reabrindo = estaAberto(v.data.stage) && !estaAberto(lead.stage);
  if (reabrindo && !v.data.next_contact_on) return { ok: false, erros: { next_contact_on: "data" } };

  const { error } = await supabase
    .from("leads")
    .update({
      stage: v.data.stage,
      ...(v.data.next_contact_on ? { next_contact_on: v.data.next_contact_on } : {}),
      ...(v.data.stage === "lost" ? { lost_reason: v.data.lost_reason, lost_note: v.data.lost_note ?? null } : {}),
    })
    .eq("id", lead.id);

  if (error) return { ok: false, mensagem: "salvar" };
  revalidar(lead.id);
  return { ok: true, id: lead.id };
}

/** Edita os dados cadastrais do lead. */
export async function editarLead(id: string, dados: Record<string, unknown>): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };

  const v = esquemaNovoLead
    .pick({ full_name: true, phone: true, email: true, source: true, referred_by: true, notes: true })
    .safeParse(dados);
  if (!v.success) return { ok: false, erros: errosDe(v.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(v.data).eq("id", id);
  if (error) return { ok: false, mensagem: "salvar" };
  revalidar(id);
  return { ok: true, id };
}
