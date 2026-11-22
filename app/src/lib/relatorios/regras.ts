import type { Enums } from "@/lib/supabase/database.types";
import type { ClasseAtivo } from "@/lib/carteira/regras";

/** Regras dos relatórios (Documentação/08). */

export type Frequencia = Enums<"report_frequency">;
export const FREQUENCIAS = ["monthly", "quarterly", "semiannual"] as const satisfies readonly Frequencia[];

const MESES: Record<Frequencia, number> = { monthly: 1, quarterly: 3, semiannual: 6 };

const fimDoMes = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);

/** Último período fechado antes de `hoje` para a frequência (ex.: mensal em 21/11 → 01/10 a 31/10). */
export function ultimoPeriodo(freq: Frequencia, hoje: string): { inicio: string; fim: string } {
  const [a, m] = hoje.split("-").map(Number);
  const n = MESES[freq];
  // Mês (1-12) em que termina o último período fechado.
  let mesFim = m - 1;
  let anoFim = a;
  if (mesFim === 0) {
    mesFim = 12;
    anoFim -= 1;
  }
  while (mesFim % n !== 0) {
    mesFim -= 1;
    if (mesFim === 0) {
      mesFim = 12;
      anoFim -= 1;
    }
  }
  const mesIni = mesFim - n + 1;
  return { inicio: `${anoFim}-${String(mesIni).padStart(2, "0")}-01`, fim: fimDoMes(anoFim, mesFim) };
}

/** Números congelados no relatório aprovado (e calculados na prévia do rascunho). */
export type DadosRelatorio = {
  geradoEm: string;
  cliente: { nome: string; perfil: string | null };
  consultor: string;
  periodo: { inicio: string; fim: string };
  inicio: { data: string | null; valor: number | null };
  fim: { data: string | null; valor: number | null };
  aportes: number;
  resgates: number;
  variacao: number | null;
  rentabilidadePeriodo: number | null;
  rentabilidadeAcumulada: number | null;
  marcoZero: { data: string; valor: number } | null;
  indices: {
    periodo: { cdi: number | null; ipca: number | null };
    acumulado: { cdi: number | null; ipca: number | null };
    fonte: string;
  };
  evolucao: { data: string; valor: number }[];
  alocacao: { classe: ClasseAtivo; pct: number; alvo: number | null; desvio: number | null; alerta: boolean }[];
  limiteDesvio: number;
  posicoes: { nome: string; classe: ClasseAtivo; valor: number; pct: number }[];
  avisos: ("semFotoInicio" | "semFotoFim" | "semFotos")[];
};
