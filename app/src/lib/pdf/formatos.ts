/** Formatação de números e datas dos PDFs para o cliente (Documentação/12, seção 7.1). */

export type FormatosPdf = ReturnType<typeof formatosPdf>;

export function formatosPdf(locale = "pt-BR") {
  const moeda0 = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const moeda2 = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" });
  const compacta = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
  const dia = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return {
    /** R$ sem centavos (padrão) ou com centavos. Nulo ou inválido vira "—". */
    moeda: (v: number | null | undefined, centavos = false) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : (centavos ? moeda2 : moeda0).format(v)),
    compacta: (v: number) => compacta.format(v),
    numero: (v: number, casas = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: casas }).format(v),
    pct: (v: number | null | undefined, casas = 2, sinal = false) =>
      v === null || v === undefined || !Number.isFinite(v)
        ? "—"
        : `${sinal && v > 0 ? "+" : ""}${new Intl.NumberFormat(locale, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v)}%`,
    /** dd/mm/aaaa a partir de uma data ISO (sem fuso). */
    data: (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(dia(iso)) : "—"),
    /** dd/mm/aaaa de um instante (timestamp), no horário de Brasília. */
    dataHora: (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso)),
    /** "mar. de 2027" */
    mesAno: (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", year: "numeric" }).format(dia(iso)),
    /** "março de 2027" */
    mesAnoLongo: (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(dia(iso)),
    /** "mar. 27" (eixo de gráfico) */
    mesCurto: (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", year: "2-digit" }).format(dia(iso)),
  };
}

/** Nome de arquivo seguro: "diagnostico-maria-souza.pdf". */
export function nomeArquivoPdf(prefixo: string, nome: string) {
  const base = nome.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "atreides";
  return `${prefixo}-${base}.pdf`;
}

/** Resposta HTTP de download do PDF (nunca em cache). */
export function respostaPdf(pdf: Buffer, arquivo: string) {
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${arquivo}"`, "Cache-Control": "private, no-store" },
  });
}
