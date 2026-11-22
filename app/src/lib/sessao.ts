import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

/** Cookie com o workspace que o usuário está visitando (Documentação/02). */
export const WORKSPACE_COOKIE = "atreides_workspace";

export type Perfil = Pick<Tables<"profiles">, "id" | "full_name" | "email" | "role" | "locale">;
export type Workspace = Pick<Tables<"workspaces">, "id" | "name" | "owner_id">;

export type Sessao = {
  perfil: Perfil;
  workspaces: Workspace[];
  /** Workspace aberto agora (o próprio, por padrão). */
  atual: Workspace;
  /** true quando o usuário está no workspace de outro consultor. */
  emWorkspaceAlheio: boolean;
};

/**
 * Lê usuário, perfil e workspaces uma vez por requisição.
 * Retorna null se não houver login ou se o perfil estiver desativado.
 */
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;

  const [{ data: perfil }, { data: workspaces }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, locale, active").eq("id", uid).maybeSingle(),
    supabase.from("workspaces").select("id, name, owner_id").order("name"),
  ]);

  if (!perfil || !perfil.active || !workspaces?.length) return null;

  const escolhido = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const proprio = workspaces.find((w) => w.owner_id === uid);
  const atual = workspaces.find((w) => w.id === escolhido) ?? proprio ?? workspaces[0];

  return {
    perfil: { id: perfil.id, full_name: perfil.full_name, email: perfil.email, role: perfil.role, locale: perfil.locale },
    workspaces,
    atual,
    emWorkspaceAlheio: atual.owner_id !== uid,
  };
});
