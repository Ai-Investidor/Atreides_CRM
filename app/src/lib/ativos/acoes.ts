"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/sessao";

/** Adiciona ou remove o ativo da lista de acompanhamento de quem está logado. */
export async function alternarLista(ticker: string, nome: string, adicionar: boolean): Promise<{ ok: boolean }> {
  if (!(await obterSessao())) return { ok: false };
  const t = ticker.toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(t)) return { ok: false };
  const supabase = await createClient();
  const { error } = adicionar
    ? await supabase.from("watchlist_items").upsert({ ticker: t, name: nome.slice(0, 200) || t })
    : await supabase.from("watchlist_items").delete().eq("ticker", t);
  revalidatePath("/ativos");
  revalidatePath(`/ativos/${t}`);
  return { ok: !error };
}
