/** Fuso da consultoria: todas as datas "de calendário" são de São Paulo. */
export const FUSO = "America/Sao_Paulo";

/** Data de hoje em São Paulo, no formato AAAA-MM-DD (igual ao `date` do banco). */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Diferença em dias entre duas datas AAAA-MM-DD (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** Converte um instante (timestamptz) para a data de São Paulo. */
export function dataDoInstante(instante: string): string {
  return hojeISO(new Date(instante));
}

/** "2026-11-21" → "21/11/2026" (ou "11/21/2026" em inglês). */
export function formatarData(iso: string, locale: string, opcoes?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric", ...opcoes }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/** Instante → "21/11/2026 14:32". */
export function formatarDataHora(instante: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instante));
}

/** Mantém só os dígitos: "(11) 99999-8888" → "11999998888". */
export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** "11999998888" → "(11) 99999-8888"; "1133334444" → "(11) 3333-4444". */
export function formatarTelefone(digitos: string): string {
  const d = soDigitos(digitos);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos;
}

/** Link do WhatsApp para um celular brasileiro. */
export function linkWhatsApp(digitos: string): string {
  return `https://wa.me/55${soDigitos(digitos)}`;
}

/** Hora de São Paulo de um instante, "HH:MM". */
export function horaDoInstante(instante: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(instante));
}

/** Diferença (em minutos) entre o relógio de São Paulo e o UTC num dado instante. Ex.: −180. */
function deslocamentoFuso(instante: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  const comoUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((comoUTC - instante.getTime()) / 60_000);
}

/** Data (AAAA-MM-DD) + hora (HH:MM) no relógio de São Paulo → instante ISO em UTC. */
export function instanteDe(data: string, hora: string): string {
  const palpite = new Date(`${data}T${hora}:00Z`);
  return new Date(palpite.getTime() - deslocamentoFuso(palpite) * 60_000).toISOString();
}

/** "14:00" + "15:30" de um mesmo dia → "14:00–15:30". */
export function intervaloHoras(inicio: string, fim: string): string {
  return `${horaDoInstante(inicio)}–${horaDoInstante(fim)}`;
}

/** Valor em reais: "R$ 150.000,00" (sem centavos com `inteiro`). */
export function formatarMoeda(valor: number | null | undefined, locale: string, inteiro = true): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: inteiro ? 0 : 2,
    minimumFractionDigits: inteiro ? 0 : 2,
  }).format(valor);
}

/** 12.345 → "12,3%" (com sinal opcional: "+12,3%"). */
export function formatarPct(valor: number | null | undefined, locale: string, opcoes: { sinal?: boolean; casas?: number } = {}): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  const casas = opcoes.casas ?? 1;
  const txt = new Intl.NumberFormat(locale, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
  return `${opcoes.sinal && valor > 0 ? "+" : ""}${txt}%`;
}

/** Número com casas decimais do locale (quantidades, preços). */
export function formatarNumero(valor: number | null | undefined, locale: string, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: casas }).format(valor);
}

/** Valor compacto para eixos de gráfico: "R$ 120 mil", "R$ 1,2 mi". */
export function formatarMoedaCompacta(valor: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(valor);
}
