"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { instanteDe } from "@/lib/formatos";
import {
  atualizarEvento,
  cancelarEvento,
  criarEvento,
  ErroGoogle,
  remarcarEvento,
  type DadosEvento,
} from "@/lib/google/calendar";
import { obterConexao } from "./conexao";
import { esquemaReuniao } from "./regras";

/** Códigos traduzidos na tela em agenda.erros.<código>. */
export type ResultadoAgenda =
  | { ok: true; id?: string; meetUrl?: string | null }
  | { ok: false; erros?: Record<string, string>; mensagem?: string };

const MSG_GOOGLE = {
  configuracao: "googleConfiguracao",
  revogado: "googleRevogado",
  permissao: "googlePermissao",
  falha: "googleFalha",
} as const;

function erroGoogle(e: unknown): ResultadoAgenda {
  if (e instanceof ErroGoogle) return { ok: false, mensagem: MSG_GOOGLE[e.codigo] };
  return { ok: false, mensagem: "googleFalha" };
}

function revalidar(leadId?: string | null, clienteId?: string | null) {
  revalidatePath("/agenda");
  revalidatePath("/painel");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

/** Sessão + conexão com o Google do dono do workspace aberto. */
async function contexto() {
  const sessao = await obterSessao();
  if (!sessao) return { erro: { ok: false, mensagem: "sessao" } as ResultadoAgenda };
  const conexao = await obterConexao(sessao.atual.id, sessao.perfil.id);
  if (!conexao) return { erro: { ok: false, mensagem: "salvar" } as ResultadoAgenda };
  const estado = conexao.situacao.estado;
  if (estado !== "conectado" || !conexao.token) {
    const mensagem = estado === "configuracao" ? "googleConfiguracao" : estado === "revogado" ? "googleRevogado" : "googleDesconectado";
    return { erro: { ok: false, mensagem } as ResultadoAgenda };
  }
  return { sessao, conexao, token: conexao.token };
}

function validar(dados: unknown) {
  const v = esquemaReuniao.safeParse(dados);
  if (!v.success) {
    const erros: Record<string, string> = {};
    for (const i of v.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erro: { ok: false, erros } as ResultadoAgenda };
  }
  const inicio = instanteDe(v.data.data, v.data.hora);
  const fim = new Date(Date.parse(inicio) + v.data.duracao * 60_000).toISOString();
  return { dados: v.data, inicio, fim };
}

/**
 * Participantes do convite: os e-mails informados e, se quem agenda não é o dono da agenda,
 * também quem agendou. O dono não entra (ele é o organizador).
 */
function participantes(lista: string[], emailDono: string, emailAutor: string) {
  const todos = new Set(lista.map((e) => e.toLowerCase()));
  if (emailAutor.toLowerCase() !== emailDono.toLowerCase()) todos.add(emailAutor.toLowerCase());
  todos.delete(emailDono.toLowerCase());
  return [...todos];
}

/** Agenda a reunião: cria o evento no Google (com Meet e convites) e grava no Atreides. */
export async function criarReuniao(entrada: Record<string, unknown>): Promise<ResultadoAgenda> {
  const v = validar(entrada);
  if ("erro" in v) return v.erro!;
  const c = await contexto();
  if ("erro" in c) return c.erro!;
  const { sessao, conexao, token } = c;
  const { dados, inicio, fim } = v;

  const id = randomUUID();
  const lista = participantes(dados.attendees, conexao.ownerEmail, sessao.perfil.email);
  const evento: DadosEvento = {
    idAtreides: id,
    titulo: dados.title,
    descricao: dados.description,
    inicio,
    fim,
    participantes: lista,
    meet: dados.format === "meet",
    local: dados.location,
  };

  let criado;
  try {
    criado = await criarEvento(token, evento);
  } catch (e) {
    return erroGoogle(e);
  }
  if (!criado) return { ok: false, mensagem: "googleFalha" };

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").insert({
    id,
    workspace_id: sessao.atual.id,
    lead_id: dados.lead_id ?? null,
    client_id: dados.client_id ?? null,
    calendar_owner_id: conexao.ownerId,
    title: dados.title,
    type: dados.type,
    starts_at: inicio,
    ends_at: fim,
    format: dados.format,
    location: dados.format === "in_person" ? dados.location || null : null,
    meet_url: criado.hangoutLink ?? null,
    attendees: lista,
    description: dados.description || null,
    google_event_id: criado.id,
  });

  if (error) {
    // Desfaz no Google sem avisar ninguém: a reunião não chegou a existir no Atreides.
    await cancelarEvento(token, criado.id, false).catch(() => null);
    return { ok: false, mensagem: error.hint === "lead_workspace" ? "leadWorkspace" : error.hint === "client_workspace" ? "clienteWorkspace" : "salvar" };
  }

  revalidar(dados.lead_id, dados.client_id);
  return { ok: true, id, meetUrl: criado.hangoutLink ?? null };
}

async function carregar(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Edita a reunião e atualiza o evento no Google (os participantes recebem a atualização). */
export async function editarReuniao(id: string, entrada: Record<string, unknown>): Promise<ResultadoAgenda> {
  const v = validar(entrada);
  if ("erro" in v) return v.erro!;
  const c = await contexto();
  if ("erro" in c) return c.erro!;
  const { sessao, conexao, token } = c;
  const { dados, inicio, fim } = v;

  const atual = await carregar(id);
  if (!atual || atual.workspace_id !== sessao.atual.id) return { ok: false, mensagem: "naoEncontrada" };
  if (atual.status !== "scheduled") return { ok: false, mensagem: "encerrada" };

  const lista = participantes(dados.attendees, conexao.ownerEmail, sessao.perfil.email);
  const meet = dados.format === "meet";
  const evento: DadosEvento = { idAtreides: id, titulo: dados.title, descricao: dados.description, inicio, fim, participantes: lista, meet, local: dados.location };

  let resposta;
  try {
    resposta = atual.google_event_id
      ? await atualizarEvento(token, atual.google_event_id, evento, meet && !atual.meet_url)
      : await criarEvento(token, evento);
  } catch (e) {
    return erroGoogle(e);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({
      lead_id: dados.lead_id ?? null,
      client_id: dados.client_id ?? null,
      title: dados.title,
      type: dados.type,
      starts_at: inicio,
      ends_at: fim,
      format: dados.format,
      location: meet ? null : dados.location || null,
      meet_url: meet ? resposta?.hangoutLink ?? atual.meet_url : null,
      attendees: lista,
      description: dados.description || null,
      google_event_id: resposta?.id ?? atual.google_event_id,
    })
    .eq("id", id);
  if (error) return { ok: false, mensagem: error.hint === "lead_workspace" ? "leadWorkspace" : error.hint === "client_workspace" ? "clienteWorkspace" : "salvar" };

  revalidar(dados.lead_id ?? atual.lead_id, dados.client_id ?? atual.client_id);
  return { ok: true, id, meetUrl: meet ? resposta?.hangoutLink ?? atual.meet_url : null };
}

/** Remarca (arrastar ou esticar na agenda). */
export async function remarcarReuniao(id: string, inicio: string, fim: string): Promise<ResultadoAgenda> {
  const i = Date.parse(inicio);
  const f = Date.parse(fim);
  if (Number.isNaN(i) || Number.isNaN(f) || f <= i || f - i > 12 * 3_600_000) return { ok: false, mensagem: "periodo" };

  const c = await contexto();
  if ("erro" in c) return c.erro!;
  const atual = await carregar(id);
  if (!atual || atual.workspace_id !== c.sessao.atual.id) return { ok: false, mensagem: "naoEncontrada" };
  if (atual.status !== "scheduled") return { ok: false, mensagem: "encerrada" };

  const iniISO = new Date(i).toISOString();
  const fimISO = new Date(f).toISOString();
  try {
    if (atual.google_event_id) await remarcarEvento(c.token, atual.google_event_id, iniISO, fimISO);
  } catch (e) {
    return erroGoogle(e);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update({ starts_at: iniISO, ends_at: fimISO }).eq("id", id);
  if (error) return { ok: false, mensagem: "salvar" };
  revalidar(atual.lead_id);
  return { ok: true, id };
}

/** Cancela: remove do Google (avisando os participantes) e marca como cancelada no Atreides. */
export async function cancelarReuniao(id: string): Promise<ResultadoAgenda> {
  const c = await contexto();
  if ("erro" in c) return c.erro!;
  const atual = await carregar(id);
  if (!atual || atual.workspace_id !== c.sessao.atual.id) return { ok: false, mensagem: "naoEncontrada" };
  if (atual.status === "canceled") return { ok: true, id };

  try {
    if (atual.google_event_id) await cancelarEvento(c.token, atual.google_event_id);
  } catch (e) {
    return erroGoogle(e);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update({ status: "canceled" }).eq("id", id);
  if (error) return { ok: false, mensagem: "salvar" };
  revalidar(atual.lead_id);
  return { ok: true, id };
}

/** Desconecta o Google Agenda de quem está logado. */
export async function desconectarGoogle(): Promise<ResultadoAgenda> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("google_connection_delete");
  if (error) return { ok: false, mensagem: "salvar" };
  revalidar();
  return { ok: true };
}
