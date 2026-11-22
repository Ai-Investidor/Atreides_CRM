"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/sessao";

/** Troca o workspace aberto. O RLS garante que só workspaces visíveis ao usuário existem. */
export async function trocarWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select("id").eq("id", workspaceId).maybeSingle();
  if (!data) return;

  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/", "layout");
}
