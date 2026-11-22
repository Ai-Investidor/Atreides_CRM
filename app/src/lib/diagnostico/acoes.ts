"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { esquemaDiagnostico, type Alvo } from "./regras";

/** Códigos traduzidos na tela em diagnostico.erros.<código>. */
export type ResultadoDiagnostico = { ok: true; id?: string; dados?: string } | { ok: false; erros?: Record<string, string>; mensagem?: string };

function revalidar(alvo: Alvo) {
  revalidatePath(alvo.tipo === "lead" ? `/leads/${alvo.id}` : `/clientes/${alvo.id}`);
  if (alvo.tipo === "cliente") revalidatePath("/carteiras");
}

/** Salva o diagnóstico (cria na primeira vez). A versão anterior é guardada pelo banco. */
export async function salvarDiagnostico(alvo: Alvo, entrada: Record<string, unknown>): Promise<ResultadoDiagnostico> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  const v = esquemaDiagnostico.safeParse(entrada);
  if (!v.success) {
    const erros: Record<string, string> = {};
    for (const i of v.error.issues) erros[String(i.path[0] ?? "geral")] ??= i.message;
    return { ok: false, erros };
  }
  const supabase = await createClient();
  const coluna = alvo.tipo === "lead" ? "lead_id" : "client_id";
  const { data: existente } = await supabase.from("diagnoses").select("id").eq(coluna, alvo.id).maybeSingle();
  const dados = { content_md: v.data.content_md, monthly_expense: v.data.monthly_expense, retirement_age: v.data.retirement_age };
  const { data, error } = existente
    ? await supabase.from("diagnoses").update(dados).eq("id", existente.id).select("id").single()
    : await supabase.from("diagnoses").insert({ ...dados, [coluna]: alvo.id }).select("id").single();
  if (error) return { ok: false, mensagem: error.code === "42501" ? "permissao" : "salvar" };
  revalidar(alvo);
  return { ok: true, id: data.id };
}

/** Texto de uma versão anterior (para consultar o histórico). */
export async function textoDaVersao(versaoId: string): Promise<ResultadoDiagnostico> {
  if (!(await obterSessao())) return { ok: false, mensagem: "sessao" };
  const supabase = await createClient();
  const { data } = await supabase.from("diagnosis_versions").select("content_md").eq("id", versaoId).maybeSingle();
  if (!data) return { ok: false, mensagem: "naoEncontrado" };
  return { ok: true, dados: data.content_md };
}
