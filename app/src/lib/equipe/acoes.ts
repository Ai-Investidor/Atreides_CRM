"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";
import { esquemaConvite } from "./regras";

/** Códigos traduzidos na tela em equipe.erros.<código>. */
export type ResultadoEquipe = { ok: true } | { ok: false; erros?: Record<string, string>; mensagem?: string };

async function exigirAdmin() {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "sessao" as const };
  if (sessao.perfil.role !== "admin") return { erro: "permissao" as const };
  return { sessao };
}

/** Cria o convite. O banco normaliza o e-mail, grava quem convidou e audita. */
export async function convidarConsultor(dados: Record<string, unknown>): Promise<ResultadoEquipe> {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return { ok: false, mensagem: acesso.erro };

  const v = esquemaConvite.safeParse(dados);
  if (!v.success) {
    const erros: Record<string, string> = {};
    for (const i of v.error.issues) erros[String(i.path[0])] ??= i.message;
    return { ok: false, erros };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({ ...v.data, role: "consultant" });
  if (error) {
    if (error.hint === "already_member") return { ok: false, erros: { email: "jaMembro" } };
    if (error.code === "23505") return { ok: false, erros: { email: "jaConvidado" } };
    return { ok: false, mensagem: "salvar" };
  }

  revalidatePath("/configuracoes/equipe");
  return { ok: true };
}

/** Cancela um convite ainda não aceito. */
export async function cancelarConvite(email: string): Promise<ResultadoEquipe> {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return { ok: false, mensagem: acesso.erro };

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").delete().eq("email", email).is("accepted_at", null);
  if (error) return { ok: false, mensagem: "salvar" };

  revalidatePath("/configuracoes/equipe");
  return { ok: true };
}
