import { createClient } from "@/lib/supabase/server";
import { hojeISO, somarDias } from "@/lib/formatos";
import type { CategoriaDoc, Cliente, Perfil, StatusCliente, TipoEvento, VersaoQuestionario } from "./regras";

export type FiltroClientes = {
  workspaceId: string;
  busca?: string | null;
  status?: StatusCliente | "abertos" | null;
  perfil?: Perfil | "sem" | null;
  revisao?: "vencida" | null;
};

/** Lista do workspace. Padrão: sem os encerrados. Busca por nome, CPF, e-mail ou celular. */
export async function listarClientes(f: FiltroClientes) {
  const supabase = await createClient();
  let q = supabase
    .from("clients")
    .select("id, full_name, cpf, phone, email, status, investor_profile, profile_valid_until, declared_net_worth, migrated, family_role, city, state")
    .eq("workspace_id", f.workspaceId);

  if (!f.status || f.status === "abertos") q = q.neq("status", "closed");
  else q = q.eq("status", f.status);
  if (f.perfil === "sem") q = q.is("investor_profile", null);
  else if (f.perfil) q = q.eq("investor_profile", f.perfil);
  if (f.revisao === "vencida") q = q.lt("profile_valid_until", hojeISO());

  const termo = f.busca?.trim();
  if (termo) {
    const limpo = termo.replace(/[%,()]/g, " ").trim();
    const digitos = termo.replace(/\D/g, "");
    const partes = [`full_name.ilike.%${limpo}%`, `email.ilike.%${limpo}%`];
    if (digitos.length >= 3) partes.push(`cpf.ilike.%${digitos}%`, `phone.ilike.%${digitos}%`);
    q = q.or(partes.join(","));
  }

  const { data } = await q.order("full_name").limit(500);
  return data ?? [];
}

export type ItemLista = Awaited<ReturnType<typeof listarClientes>>[number];

/** Indicadores da lista. */
export async function indicadoresClientes(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("status, profile_valid_until, investor_profile").eq("workspace_id", workspaceId).neq("status", "closed");
  const lista = data ?? [];
  const hoje = hojeISO();
  const limite = somarDias(hoje, 30);
  return {
    ativos: lista.filter((c) => c.status === "active").length,
    onboarding: lista.filter((c) => c.status === "onboarding").length,
    semPerfil: lista.filter((c) => !c.investor_profile).length,
    perfilVencendo: lista.filter((c) => c.profile_valid_until && c.profile_valid_until <= limite).length,
  };
}

export async function contarAtivos(workspaceId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active");
  return count ?? 0;
}

export async function existeMigrado() {
  const supabase = await createClient();
  const { count } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("migrated", true);
  return (count ?? 0) > 0;
}

/** Cliente com o mesmo CPF (em qualquer workspace). */
export async function buscarPorCpf(cpf: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, full_name").eq("cpf", cpf).maybeSingle();
  return data;
}

export type EventoLinha = {
  id: string;
  origem: "cliente" | "lead";
  tipo: TipoEvento | `lead_${string}`;
  resumo: string | null;
  meta: Record<string, unknown>;
  autor: string | null;
  em: string;
};

/** Ficha completa do cliente. */
export async function obterCliente(id: string) {
  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!cliente) return null;

  const [eventos, notas, docs, respostas, processos, familia, reunioes, contatosLead, workspace, nucleo] = await Promise.all([
    supabase.from("client_events").select("*, autor:profiles!client_events_created_by_fkey(full_name)").eq("client_id", id).order("created_at", { ascending: false }).limit(300),
    supabase.from("client_notes").select("*, autor:profiles!client_notes_created_by_fkey(full_name)").eq("client_id", id).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("client_documents").select("*, autor:profiles!client_documents_uploaded_by_fkey(full_name)").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("suitability_responses").select("*, versao:suitability_versions(code, validated_at), autor:profiles!suitability_responses_created_by_fkey(full_name)").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("processes").select("*, modelo:process_templates(code, name)").eq("client_id", id).order("started_at", { ascending: false }),
    cliente.family_id
      ? supabase.from("clients").select("id, full_name, family_role, declared_net_worth, investor_profile, status").eq("family_id", cliente.family_id).order("full_name")
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("meetings").select("id, title, starts_at, ends_at, meet_url, status, type").eq("client_id", id).neq("status", "canceled").order("starts_at"),
    cliente.lead_id
      ? supabase.from("lead_contacts").select("*, autor:profiles!lead_contacts_created_by_fkey(full_name)").eq("lead_id", cliente.lead_id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("workspaces").select("id, name, owner_id").eq("id", cliente.workspace_id).maybeSingle(),
    supabase.from("families").select("id, name").eq("id", cliente.family_id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
  ]);

  const processoAtual = (processos.data ?? []).find((p) => p.status === "running") ?? (processos.data ?? [])[0] ?? null;
  const etapas = processoAtual
    ? (
        await supabase
          .from("tasks")
          .select("id, title, status, due_on, not_applicable_reason, etapa:process_template_steps(position, code, is_final)")
          .eq("process_id", processoAtual.id)
      ).data ?? []
    : [];
  etapas.sort((a, b) => (a.etapa?.position ?? 0) - (b.etapa?.position ?? 0));

  const linha: EventoLinha[] = [
    ...(eventos.data ?? []).map((e) => ({
      id: `c${e.id}`,
      origem: "cliente" as const,
      tipo: e.type,
      resumo: e.summary,
      meta: (e.metadata ?? {}) as Record<string, unknown>,
      autor: e.autor?.full_name ?? null,
      em: e.created_at,
    })),
    ...(contatosLead.data ?? []).map((c) => ({
      id: `l${c.id}`,
      origem: "lead" as const,
      tipo: `lead_${c.type}` as const,
      resumo: c.summary,
      meta: { from: c.from_stage, to: c.to_stage } as Record<string, unknown>,
      autor: c.autor?.full_name ?? null,
      em: c.created_at,
    })),
  ].sort((a, b) => b.em.localeCompare(a.em));

  return {
    cliente: cliente as Cliente,
    workspace: workspace.data,
    linha,
    notas: notas.data ?? [],
    documentos: docs.data ?? [],
    questionarios: respostas.data ?? [],
    processo: processoAtual,
    etapas,
    familia: { nucleo: nucleo.data, membros: familia.data ?? [] },
    reunioes: reunioes.data ?? [],
  };
}

export type FichaCliente = NonNullable<Awaited<ReturnType<typeof obterCliente>>>;

/** Categorias obrigatórias (Configurações › Clientes). */
export async function documentosObrigatorios(): Promise<CategoriaDoc[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("document_requirements").select("category").eq("required", true);
  return (data ?? []).map((d) => d.category);
}

export async function requisitosDocumentos() {
  const supabase = await createClient();
  const { data } = await supabase.from("document_requirements").select("*");
  return data ?? [];
}

/** Versão ativa do questionário de perfil. */
export async function versaoAtiva(): Promise<VersaoQuestionario | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("suitability_versions").select("id, code, title, questions, validated_at").eq("active", true).maybeSingle();
  return (data as VersaoQuestionario | null) ?? null;
}

export async function todasVersoes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suitability_versions")
    .select("id, code, title, active, validated_at, validador:profiles!suitability_versions_validated_by_fkey(full_name)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Núcleos familiares do workspace (para vincular). */
export async function nucleosDoWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("families").select("id, name").eq("workspace_id", workspaceId).order("name");
  return data ?? [];
}

/** Clientes não encerrados do workspace, para vincular em reunião e tarefa. */
export async function clientesParaVinculo(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, full_name, email").eq("workspace_id", workspaceId).neq("status", "closed").order("full_name");
  return data ?? [];
}

/** CPFs que já existem (para a prévia da importação). */
export async function cpfsExistentes(cpfs: string[]) {
  if (!cpfs.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("cpf").in("cpf", cpfs);
  return (data ?? []).map((d) => d.cpf as string);
}
