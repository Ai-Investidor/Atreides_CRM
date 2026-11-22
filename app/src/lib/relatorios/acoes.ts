"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { textosModelo } from "@/lib/pdf/textos";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import type { Json } from "@/lib/supabase/database.types";
import { montarDados } from "./montar";
import type { DadosRelatorio } from "./regras";

export type ResultadoRelatorio = { ok: true; id?: string; dados?: string } | { ok: false; mensagem: string };

const BUCKET = "client-reports";

function revalidar(clienteId: string, id?: string) {
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/relatorios");
  if (id) revalidatePath(`/relatorios/${id}`);
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Cria o rascunho do relatório para o período. */
export async function criarRascunho(clienteId: string, inicio: string, fim: string): Promise<ResultadoRelatorio> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  if (!DATA.test(inicio) || !DATA.test(fim) || fim < inicio) return { ok: false, mensagem: "periodo" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").insert({ client_id: clienteId, period_start: inicio, period_end: fim }).select("id").single();
  if (error) return { ok: false, mensagem: "salvar" };
  revalidar(clienteId, data.id);
  return { ok: true, id: data.id };
}

/** Salva o comentário do rascunho. */
export async function salvarComentario(id: string, comentario: string): Promise<ResultadoRelatorio> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  if (comentario.length > 10000) return { ok: false, mensagem: "comentarioLongo" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").update({ comment: comentario }).eq("id", id).eq("status", "draft").select("client_id");
  if (error) return { ok: false, mensagem: error.hint === "report_locked" ? "travado" : "salvar" };
  if (!data?.length) return { ok: false, mensagem: "travado" };
  revalidar(data[0].client_id, id);
  return { ok: true };
}

/** Aprova: congela os números, gera o PDF e guarda no armazenamento privado. Comentário obrigatório. */
export async function aprovarRelatorio(id: string, comentario: string): Promise<ResultadoRelatorio> {
  const sessao = await obterSessao();
  if (!sessao) return { ok: false, mensagem: "sessao" };
  const texto = comentario.trim();
  if (!texto) return { ok: false, mensagem: "comentarioObrigatorio" };
  const supabase = await createClient();
  const { data: rel } = await supabase.from("reports").select("id, client_id, workspace_id, period_start, period_end, status, version").eq("id", id).maybeSingle();
  if (!rel) return { ok: false, mensagem: "naoEncontrado" };
  if (rel.status !== "draft") return { ok: false, mensagem: "travado" };

  const dados = await montarDados(rel.client_id, rel.period_start, rel.period_end, sessao.perfil.full_name);
  if (!dados) return { ok: false, mensagem: "naoEncontrado" };
  if (dados.avisos.includes("semFotos")) return { ok: false, mensagem: "semFotos" };

  const t = await getTranslations({ locale: "pt-BR", namespace: "relatorios.pdf" });
  const tc = await getTranslations({ locale: "pt-BR", namespace: "carteira.classes" });
  let pdf: Buffer;
  try {
    const { gerarPdf } = await import("./pdf");
    pdf = await gerarPdf({
      dados,
      comentario: texto,
      aprovacao: { por: sessao.perfil.full_name, em: new Date().toISOString() },
      t: (k, v) => t(k, v),
      tc: (c) => tc(c),
      locale: "pt-BR",
      textos: await textosModelo("pt-BR"),
    });
  } catch {
    return { ok: false, mensagem: "pdf" };
  }
  const caminho = `${rel.workspace_id}/${rel.client_id}/${rel.id}-v${rel.version}.pdf`;
  const { error: eUp } = await supabase.storage.from(BUCKET).upload(caminho, pdf, { contentType: "application/pdf", upsert: true });
  if (eUp) return { ok: false, mensagem: "pdf" };

  const { error } = await supabase
    .from("reports")
    .update({ status: "approved", comment: texto, data: dados as unknown as Json, pdf_path: caminho })
    .eq("id", id)
    .eq("status", "draft");
  if (error) return { ok: false, mensagem: "salvar" };
  revalidar(rel.client_id, id);
  return { ok: true, id };
}

/** Link temporário (5 min) para baixar o PDF. */
export async function linkPdf(id: string): Promise<ResultadoRelatorio> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data: rel } = await supabase.from("reports").select("pdf_path").eq("id", id).maybeSingle();
  if (!rel?.pdf_path) return { ok: false, mensagem: "naoEncontrado" };
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(rel.pdf_path, 300, { download: true });
  if (error || !data) return { ok: false, mensagem: "salvar" };
  return { ok: true, dados: data.signedUrl };
}

/** Registra o envio (canais usados). */
export async function marcarEnviado(id: string, canais: ("whatsapp" | "email")[]): Promise<ResultadoRelatorio> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  const validos = canais.filter((c) => c === "whatsapp" || c === "email");
  if (!validos.length) return { ok: false, mensagem: "canal" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .update({ sent_at: new Date().toISOString(), sent_channels: validos })
    .eq("id", id)
    .eq("status", "approved")
    .is("sent_at", null)
    .select("client_id");
  if (error) return { ok: false, mensagem: "salvar" };
  if (!data?.length) return { ok: false, mensagem: "naoEnviavel" };
  revalidar(data[0].client_id, id);
  return { ok: true };
}

/** Nova versão do mesmo período (rascunho com o comentário anterior). A aprovada será substituída ao aprovar a nova. */
export async function novaVersao(id: string): Promise<ResultadoRelatorio> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data: rel } = await supabase.from("reports").select("client_id, period_start, period_end, comment, status").eq("id", id).maybeSingle();
  if (!rel) return { ok: false, mensagem: "naoEncontrado" };
  const { data, error } = await supabase
    .from("reports")
    .insert({ client_id: rel.client_id, period_start: rel.period_start, period_end: rel.period_end, comment: rel.comment })
    .select("id")
    .single();
  if (error) return { ok: false, mensagem: "salvar" };
  revalidar(rel.client_id, data.id);
  return { ok: true, id: data.id };
}

export async function excluirRascunho(id: string): Promise<ResultadoRelatorio> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").delete().eq("id", id).eq("status", "draft").select("client_id");
  if (error) return { ok: false, mensagem: "salvar" };
  if (!data?.length) return { ok: false, mensagem: "permissao" };
  revalidar(data[0].client_id);
  return { ok: true };
}

/** Prévia: números calculados agora (rascunho) ou os congelados (aprovado). */
export async function previa(id: string): Promise<DadosRelatorio | null> {
  const sessao = await obterSessao();
  if (!sessao) return null;
  const supabase = await createClient();
  const { data: rel } = await supabase.from("reports").select("client_id, period_start, period_end, status, data").eq("id", id).maybeSingle();
  if (!rel) return null;
  if (rel.status !== "draft" && rel.data) return rel.data as unknown as DadosRelatorio;
  return montarDados(rel.client_id, rel.period_start, rel.period_end, sessao.perfil.full_name);
}
