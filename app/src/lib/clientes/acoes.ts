"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { buscarPorCpf } from "./consultas";
import { CATEGORIAS, esquemaCliente, PAPEIS, TAMANHO_MAX_DOC, TIPOS_DOC, type CategoriaDoc, type StatusCliente } from "./regras";

/** Códigos traduzidos na tela em clientes.erros.<código>. */
export type ResultadoCliente =
  | { ok: true; id?: string; dados?: string }
  | { ok: false; erros?: Record<string, string>; mensagem?: string; duplicado?: { id: string; nome: string }; data?: string };

const BUCKET = "client-documents";

function revalidar(id?: string | null) {
  revalidatePath("/clientes");
  revalidatePath("/painel");
  revalidatePath("/tarefas");
  if (id) revalidatePath(`/clientes/${id}`);
}

function errosZod(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: Record<string, string> = {};
  for (const i of issues) erros[String(i.path[0] ?? "geral")] ??= i.message;
  return erros;
}

function mensagemBanco(e: { code?: string; hint?: string; message?: string } | null): string {
  if (!e) return "salvar";
  if (e.hint?.startsWith("retention")) return "retencao";
  const mapa: Record<string, string> = {
    lead_invalid: "leadInvalido",
    family_workspace: "nucleoWorkspace",
    closed_final: "encerradoFinal",
    transfer_admin: "permissao",
    incomplete: "questionarioIncompleto",
    client_workspace: "clienteWorkspace",
    process_pending: "etapasPendentes",
  };
  if (e.hint && mapa[e.hint]) return mapa[e.hint];
  if (e.code === "42501") return "permissao";
  return "salvar";
}

async function exigirSessao(admin = false) {
  const sessao = await obterSessao();
  if (!sessao) return { erro: { ok: false, mensagem: "sessao" } as ResultadoCliente };
  if (admin && sessao.perfil.role !== "admin") return { erro: { ok: false, mensagem: "permissao" } as ResultadoCliente };
  return { sessao };
}

type OpcoesNovo = {
  migrado?: boolean;
  aceiteLgpd?: boolean;
  leadId?: string | null;
  nucleo?: { id: string; papel: (typeof PAPEIS)[number] } | null;
};

/** Cadastra cliente no workspace aberto. Dispara o onboarding (ou a migração) no banco. */
export async function criarCliente(entrada: Record<string, unknown>, opcoes: OpcoesNovo = {}): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const papel = opcoes.nucleo?.papel ?? null;
  const v = esquemaCliente.safeParse({ ...entrada, family_role: papel });
  if (!v.success) return { ok: false, erros: errosZod(v.error.issues) };

  if (v.data.cpf) {
    const dup = await buscarPorCpf(v.data.cpf);
    if (dup) return { ok: false, erros: { cpf: "cpfDuplicado" }, duplicado: { id: dup.id, nome: dup.full_name } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...v.data,
      workspace_id: s.sessao.atual.id,
      migrated: !!opcoes.migrado,
      lgpd_consent_at: opcoes.aceiteLgpd ? new Date().toISOString() : null,
      lead_id: opcoes.leadId ?? null,
      family_id: opcoes.nucleo?.id ?? null,
      family_role: papel,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, erros: { cpf: "cpfDuplicado" } };
    return { ok: false, mensagem: mensagemBanco(error) };
  }
  revalidar(data.id);
  if (opcoes.leadId) revalidatePath(`/leads/${opcoes.leadId}`);
  return { ok: true, id: data.id };
}

/** Edita o cadastro (aba Dados). */
export async function editarCliente(id: string, entrada: Record<string, unknown>): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { data: atual } = await supabase.from("clients").select("family_role").eq("id", id).maybeSingle();
  if (!atual) return { ok: false, mensagem: "naoEncontrado" };
  const v = esquemaCliente.safeParse({ ...entrada, family_role: atual.family_role });
  if (!v.success) return { ok: false, erros: errosZod(v.error.issues) };
  if (v.data.cpf) {
    const dup = await buscarPorCpf(v.data.cpf);
    if (dup && dup.id !== id) return { ok: false, erros: { cpf: "cpfDuplicado" }, duplicado: { id: dup.id, nome: dup.full_name } };
  }
  const { family_role: _papel, ...dados } = v.data;
  void _papel;
  const { error } = await supabase.from("clients").update(dados).eq("id", id);
  if (error) return { ok: false, mensagem: error.code === "23505" ? "cpfDuplicado" : mensagemBanco(error) };
  revalidar(id);
  return { ok: true, id };
}

/** Pausar, reativar ou encerrar (encerrar exige motivo; o banco grava a retenção de 5 anos). */
export async function mudarStatus(id: string, status: StatusCliente, motivo?: string): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  if (status === "closed" && !motivo?.trim()) return { ok: false, erros: { motivo: "motivo" } };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ status, ...(status === "closed" ? { closing_reason: motivo!.trim(), closed_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(id);
  return { ok: true, id };
}

/** Registra o aceite de tratamento de dados (LGPD). Conclui a etapa do processo, se houver. */
export async function registrarAceite(id: string): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ lgpd_consent_at: new Date().toISOString() }).eq("id", id).is("lgpd_consent_at", null);
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(id);
  return { ok: true, id };
}

/** Transfere para outro workspace (só admin). Move tarefas, processos e histórico junto. */
export async function transferirCliente(id: string, workspaceId: string): Promise<ResultadoCliente> {
  const s = await exigirSessao(true);
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { error } = await supabase.rpc("client_transfer", { p_client: id, p_workspace: workspaceId });
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(id);
  return { ok: true, id };
}

/** Exportação LGPD (só admin): todos os dados do cliente em JSON. Fica na auditoria. */
export async function exportarCliente(id: string): Promise<ResultadoCliente> {
  const s = await exigirSessao(true);
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const [cliente, notas, docs, questionarios, eventos, tarefas, reunioes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("client_notes").select("body, pinned, created_at").eq("client_id", id),
    supabase.from("client_documents").select("category, file_name, size_bytes, mime_type, created_at").eq("client_id", id),
    supabase.from("suitability_responses").select("answers, score, profile, valid_until, validated_version, created_at").eq("client_id", id),
    supabase.from("client_events").select("type, summary, metadata, created_at").eq("client_id", id),
    supabase.from("tasks").select("title, status, due_on, completed_at, created_at").eq("client_id", id),
    supabase.from("meetings").select("title, type, starts_at, ends_at, format, status").eq("client_id", id),
  ]);
  if (!cliente.data) return { ok: false, mensagem: "naoEncontrado" };
  const { error } = await supabase.rpc("client_export_audit", { p_client: id });
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  const pacote = {
    exportado_em: new Date().toISOString(),
    cliente: cliente.data,
    anotacoes: notas.data ?? [],
    documentos: docs.data ?? [],
    questionarios_de_perfil: questionarios.data ?? [],
    linha_do_tempo: eventos.data ?? [],
    tarefas: tarefas.data ?? [],
    reunioes: reunioes.data ?? [],
  };
  return { ok: true, id, dados: JSON.stringify(pacote, null, 2) };
}

/** Exclusão LGPD (só admin). O banco recusa enquanto houver registros dentro da retenção da CVM. */
export async function excluirCliente(id: string): Promise<ResultadoCliente> {
  const s = await exigirSessao(true);
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { data: docs } = await supabase.from("client_documents").select("storage_path").eq("client_id", id);
  const { data, error } = await supabase.from("clients").delete().eq("id", id).select("id");
  if (error) {
    const data = error.hint?.startsWith("retention:") ? error.hint.slice("retention:".length) || undefined : undefined;
    return { ok: false, mensagem: mensagemBanco(error), data };
  }
  if (!data?.length) return { ok: false, mensagem: "naoEncontrado" };
  const caminhos = (docs ?? []).map((d) => d.storage_path);
  if (caminhos.length) await supabase.storage.from(BUCKET).remove(caminhos);
  revalidar();
  return { ok: true };
}

// ---------------------------------------------------------------- Anotações

export async function criarNota(clienteId: string, texto: string, fixada = false): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const corpo = texto.trim();
  if (!corpo) return { ok: false, erros: { body: "nota" } };
  if (corpo.length > 5000) return { ok: false, erros: { body: "notaLonga" } };
  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").insert({ client_id: clienteId, body: corpo, pinned: fixada });
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true };
}

export async function fixarNota(id: string, fixada: boolean): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { data, error } = await supabase.from("client_notes").update({ pinned: fixada }).eq("id", id).select("client_id");
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  if (!data?.length) return { ok: false, mensagem: "permissao" };
  revalidar(data[0].client_id);
  return { ok: true };
}

export async function excluirNota(id: string): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { data, error } = await supabase.from("client_notes").delete().eq("id", id).select("client_id");
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  if (!data?.length) return { ok: false, mensagem: "permissao" };
  revalidar(data[0].client_id);
  return { ok: true };
}

// ---------------------------------------------------------------- Documentos

/** Registra o documento depois que o navegador enviou o arquivo ao armazenamento privado. */
export async function registrarDocumento(d: {
  clienteId: string;
  categoria: CategoriaDoc;
  nome: string;
  caminho: string;
  tamanho: number;
  tipo: string;
}): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  if (!CATEGORIAS.includes(d.categoria)) return { ok: false, mensagem: "categoria" };
  if (d.tamanho > TAMANHO_MAX_DOC) return { ok: false, mensagem: "arquivoGrande" };
  if (!TIPOS_DOC.includes(d.tipo)) return { ok: false, mensagem: "arquivoTipo" };
  if (!d.caminho.includes(`/${d.clienteId}/`)) return { ok: false, mensagem: "salvar" };
  const supabase = await createClient();
  const { error } = await supabase.from("client_documents").insert({
    client_id: d.clienteId,
    category: d.categoria,
    file_name: d.nome.slice(0, 255),
    storage_path: d.caminho,
    size_bytes: d.tamanho,
    mime_type: d.tipo,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([d.caminho]);
    return { ok: false, mensagem: mensagemBanco(error) };
  }
  revalidar(d.clienteId);
  return { ok: true };
}

/** Link temporário (5 minutos) para abrir o documento. */
export async function linkDocumento(id: string): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("client_documents").select("storage_path, file_name").eq("id", id).maybeSingle();
  if (!doc) return { ok: false, mensagem: "naoEncontrado" };
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300);
  if (error || !data) return { ok: false, mensagem: "salvar" };
  return { ok: true, dados: data.signedUrl };
}

/** Exclui documento (só admin). */
export async function excluirDocumento(id: string): Promise<ResultadoCliente> {
  const s = await exigirSessao(true);
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { data, error } = await supabase.from("client_documents").delete().eq("id", id).select("client_id, storage_path");
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  if (!data?.length) return { ok: false, mensagem: "naoEncontrado" };
  await supabase.storage.from(BUCKET).remove([data[0].storage_path]);
  revalidar(data[0].client_id);
  return { ok: true };
}

/** Liga/desliga uma categoria como obrigatória (só admin). */
export async function alternarObrigatorio(categoria: CategoriaDoc, obrigatorio: boolean): Promise<ResultadoCliente> {
  const s = await exigirSessao(true);
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { error } = await supabase.from("document_requirements").update({ required: obrigatorio }).eq("category", categoria);
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidatePath("/configuracoes/clientes");
  revalidatePath("/clientes", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- Questionário de perfil

/** Aplica o questionário. Pontuação e perfil são calculados pelo banco. */
export async function aplicarQuestionario(clienteId: string, versaoId: string, respostas: Record<string, string>): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suitability_responses")
    .insert({ client_id: clienteId, version_id: versaoId, answers: respostas })
    .select("id")
    .single();
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true, id: data.id };
}

/** Marca a versão do questionário como validada pelo compliance (só admin). */
export async function validarVersao(id: string): Promise<ResultadoCliente> {
  const s = await exigirSessao(true);
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { error } = await supabase
    .from("suitability_versions")
    .update({ validated_at: new Date().toISOString(), validated_by: s.sessao.perfil.id })
    .eq("id", id)
    .is("validated_at", null);
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidatePath("/configuracoes/clientes");
  return { ok: true };
}

// ---------------------------------------------------------------- Núcleo familiar

/** Cria um núcleo familiar e coloca o cliente nele. */
export async function criarNucleo(clienteId: string, nome: string, papel: (typeof PAPEIS)[number]): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  if (nome.trim().length < 2) return { ok: false, erros: { nome: "nucleoNome" } };
  const supabase = await createClient();
  const { data: cli } = await supabase.from("clients").select("workspace_id").eq("id", clienteId).maybeSingle();
  if (!cli) return { ok: false, mensagem: "naoEncontrado" };
  const { data: fam, error } = await supabase.from("families").insert({ workspace_id: cli.workspace_id, name: nome.trim() }).select("id").single();
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  return vincularNucleo(clienteId, fam.id, papel);
}

/** Coloca o cliente num núcleo existente (ou tira, com familyId nulo). */
export async function vincularNucleo(clienteId: string, familyId: string | null, papel: (typeof PAPEIS)[number] | null): Promise<ResultadoCliente> {
  const s = await exigirSessao();
  if ("erro" in s) return s.erro!;
  const supabase = await createClient();
  const { data: atual } = await supabase.from("clients").select("cpf, phone, email").eq("id", clienteId).maybeSingle();
  if (!atual) return { ok: false, mensagem: "naoEncontrado" };
  // Sair do núcleo exige ter os contatos obrigatórios de quem não é dependente.
  if ((!familyId || papel !== "dependent") && (!atual.cpf || !atual.phone || !atual.email)) return { ok: false, mensagem: "contatosObrigatorios" };
  const { error } = await supabase
    .from("clients")
    .update({ family_id: familyId, family_role: familyId ? papel : null })
    .eq("id", clienteId);
  if (error) return { ok: false, mensagem: mensagemBanco(error) };
  revalidar(clienteId);
  return { ok: true, id: clienteId };
}

// ---------------------------------------------------------------- Importação (migração do Erick)

export type LinhaImportacao = {
  linha: number;
  full_name: string;
  cpf: string;
  phone: string;
  email: string;
  city?: string;
  state?: string;
  birth_date?: string;
  contract_start_on?: string;
  aceite_lgpd?: boolean;
};

export type ResultadoImportacao = { ok: boolean; mensagem?: string; criados: number; falhas: { linha: number; erro: string }[] };

/** Importa clientes migrados (entram Ativos e disparam o processo de migração). */
export async function importarClientes(linhas: LinhaImportacao[]): Promise<ResultadoImportacao> {
  const s = await exigirSessao();
  if ("erro" in s) return { ok: false, mensagem: "sessao", criados: 0, falhas: [] };
  if (linhas.length > 500) return { ok: false, mensagem: "importacaoGrande", criados: 0, falhas: [] };
  let criados = 0;
  const falhas: { linha: number; erro: string }[] = [];
  for (const l of linhas) {
    const r = await criarCliente(
      {
        full_name: l.full_name,
        cpf: l.cpf,
        phone: l.phone,
        email: l.email,
        city: l.city ?? "",
        state: l.state ?? "",
        birth_date: l.birth_date ?? "",
        contract_start_on: l.contract_start_on ?? "",
      },
      { migrado: true, aceiteLgpd: l.aceite_lgpd },
    );
    if (r.ok) criados++;
    else falhas.push({ linha: l.linha, erro: r.erros ? Object.values(r.erros)[0] : r.mensagem ?? "salvar" });
  }
  revalidar();
  return { ok: true, criados, falhas };
}

/** CPFs da planilha que já existem no Atreides (prévia da importação). */
export async function verificarCpfs(cpfs: string[]): Promise<string[]> {
  const s = await exigirSessao();
  if ("erro" in s) return [];
  const { cpfsExistentes } = await import("./consultas");
  return cpfsExistentes(cpfs.slice(0, 500));
}
