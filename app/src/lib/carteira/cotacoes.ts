import { createClient } from "@/lib/supabase/server";
import { mercado } from "@/lib/mercado";

const VALIDADE_MS = 15 * 60 * 1000;

/**
 * Garante cotações recentes para os ativos de bolsa informados (cache de 15 min no banco).
 * Se o provedor falhar, mantém o último dado salvo (com a data dele).
 */
export async function atualizarCotacoes(ativos: { id: string; ticker: string | null }[], forcar = false) {
  const listados = ativos.filter((a): a is { id: string; ticker: string } => !!a.ticker);
  if (!listados.length) return { falhou: false };
  const supabase = await createClient();
  const { data: cache } = await supabase.from("asset_quotes").select("asset_id, fetched_at").in("asset_id", listados.map((a) => a.id));
  const recentes = new Set((cache ?? []).filter((c) => Date.now() - Date.parse(c.fetched_at) < VALIDADE_MS).map((c) => c.asset_id));
  const pendentes = forcar ? listados : listados.filter((a) => !recentes.has(a.id));
  if (!pendentes.length) return { falhou: false };
  try {
    const cotacoes = await mercado.cotacoes(pendentes.map((a) => a.ticker));
    const porTicker = new Map(pendentes.map((a) => [a.ticker, a.id]));
    const linhas = cotacoes
      .filter((c) => porTicker.has(c.ticker))
      .map((c) => ({
        asset_id: porTicker.get(c.ticker)!,
        price: c.preco,
        change_pct: c.variacaoPct,
        currency: c.moeda,
        quoted_at: c.em,
        source: c.fonte,
        fetched_at: new Date().toISOString(),
      }));
    if (linhas.length) await supabase.from("asset_quotes").upsert(linhas);
    return { falhou: linhas.length < pendentes.length };
  } catch {
    return { falhou: true };
  }
}
