import { createClient } from "@/lib/supabase/server";
import type { Convite, Membro } from "./regras";

/** Equipe (admin primeiro, depois por nome) e convites ainda não aceitos. RLS: convites só o admin lê. */
export async function listarEquipe(): Promise<{ membros: Membro[]; pendentes: Convite[] }> {
  const supabase = await createClient();
  const [{ data: membros }, { data: pendentes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, active, created_at").order("role").order("full_name"),
    supabase.from("invitations").select("email, full_name, created_at").is("accepted_at", null).order("created_at", { ascending: false }),
  ]);
  return { membros: membros ?? [], pendentes: pendentes ?? [] };
}
