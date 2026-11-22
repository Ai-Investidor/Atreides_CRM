import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/formatos";

/**
 * Índices de referência pela API pública do Banco Central (SGS).
 * CDI: série 12 (% ao dia útil). IPCA: série 433 (% no mês, data = 1º dia do mês).
 * Copiados para o banco (benchmark_rates) para não depender da API a cada tela.
 */
const SERIES = { cdi: 12, ipca: 433 } as const;
export type Serie = keyof typeof SERIES;

const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const iso = (dmY: string) => `${dmY.slice(6, 10)}-${dmY.slice(3, 5)}-${dmY.slice(0, 2)}`;

/** Garante no banco os valores da série entre as datas (busca só o que falta no fim). */
async function garantir(serie: Serie, inicio: string, fim: string) {
  const supabase = await createClient();
  const { data: ultimo } = await supabase.from("benchmark_rates").select("ref_date").eq("series", serie).order("ref_date", { ascending: false }).limit(1).maybeSingle();
  const { data: primeiro } = await supabase.from("benchmark_rates").select("ref_date").eq("series", serie).order("ref_date").limit(1).maybeSingle();
  const hoje = hojeISO();
  const precisaInicio = !primeiro || primeiro.ref_date > inicio;
  // Atualiza o fim no máximo uma vez por dia (o último dado do BC costuma ser de ontem).
  const precisaFim = !ultimo || (ultimo.ref_date < fim && ultimo.ref_date < hoje);
  if (!precisaInicio && !precisaFim) return { falhou: false };
  const de = precisaInicio ? inicio : ultimo!.ref_date;
  try {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SERIES[serie]}/dados?formato=json&dataInicial=${br(de)}&dataFinal=${br(hoje)}`;
    const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!r.ok) return { falhou: true };
    const lista = (await r.json()) as { data: string; valor: string }[];
    const linhas = lista.map((x) => ({ series: serie, ref_date: iso(x.data), value: Number(x.valor) })).filter((x) => Number.isFinite(x.value));
    for (let i = 0; i < linhas.length; i += 1000) await supabase.from("benchmark_rates").upsert(linhas.slice(i, i + 1000));
    return { falhou: false };
  } catch {
    return { falhou: true };
  }
}

export type Acumulado = { cdi: number | null; ipca: number | null; ate: { cdi: string | null; ipca: string | null }; falhou: boolean };

/**
 * Variação acumulada (%) de CDI e IPCA no período (inclusive).
 * IPCA é mensal: entra todo mês cujo 1º dia cai no período; se o mês do fim ainda não saiu, vai até o último divulgado.
 */
export async function acumulado(inicio: string, fim: string): Promise<Acumulado> {
  const inicioMes = `${inicio.slice(0, 7)}-01`;
  const [g1, g2] = await Promise.all([garantir("cdi", inicio, fim), garantir("ipca", inicioMes, fim)]);
  const supabase = await createClient();
  const [cdi, ipca] = await Promise.all([
    supabase.from("benchmark_rates").select("ref_date, value").eq("series", "cdi").gt("ref_date", inicio).lte("ref_date", fim).order("ref_date"),
    supabase.from("benchmark_rates").select("ref_date, value").eq("series", "ipca").gte("ref_date", inicio.slice(8) === "01" ? inicioMes : nextMonth(inicioMes)).lte("ref_date", fim).order("ref_date"),
  ]);
  const comp = (l: { value: number }[] | null) => (l && l.length ? (l.reduce((p, x) => p * (1 + Number(x.value) / 100), 1) - 1) * 100 : null);
  return {
    cdi: comp(cdi.data),
    ipca: comp(ipca.data),
    ate: { cdi: cdi.data?.at(-1)?.ref_date ?? null, ipca: ipca.data?.at(-1)?.ref_date ?? null },
    falhou: g1.falhou || g2.falhou,
  };
}

function nextMonth(primeiroDia: string) {
  const [a, m] = primeiroDia.split("-").map(Number);
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
}
