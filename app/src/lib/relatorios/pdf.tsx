import path from "node:path";
import { Document, Font, G, Image, Line, Page, Path, Polyline, Rect, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { DadosRelatorio } from "./regras";

/**
 * PDF do relatório (Documentação/08), no padrão da marca (identidade/design-guide.md):
 * capa marinho, miolo osso/branco, latão só como acento; Schibsted Grotesk nos títulos e Inter no texto.
 */

const DIR = path.join(process.cwd(), "assets", "pdf");
let fontesProntas = false;
function registrarFontes() {
  if (fontesProntas) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(DIR, "inter-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(DIR, "inter-latin-500-normal.woff"), fontWeight: 500 },
      { src: path.join(DIR, "inter-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(DIR, "inter-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Schibsted",
    fonts: [
      { src: path.join(DIR, "schibsted-grotesk-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(DIR, "schibsted-grotesk-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontesProntas = true;
}

const COR = {
  marinho: "#0E1A2B",
  marinho2: "#16263B",
  latao: "#B8925A",
  lataoEscuro: "#8A6A3A",
  osso: "#F3EFE6",
  fundo: "#FBFAF7",
  borda: "#E6E1D6",
  divisoria: "#EFEBE3",
  texto: "#0E1A2B",
  texto2: "#4A5566",
  texto3: "#6B7584",
  ok: "#1F5A3E",
  erro: "#8A2E22",
  atencao: "#6B4E1E",
};

const s = StyleSheet.create({
  capa: { backgroundColor: COR.marinho, color: COR.osso, padding: 56, fontFamily: "Inter" },
  pagina: { backgroundColor: "#FFFFFF", color: COR.texto, paddingTop: 64, paddingBottom: 64, paddingHorizontal: 48, fontFamily: "Inter", fontSize: 9.5 },
  cabecalho: { position: "absolute", top: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.6, borderBottomColor: COR.borda, paddingBottom: 8 },
  rodape: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: COR.texto3 },
  sobretitulo: { fontSize: 7.5, letterSpacing: 1.6, color: COR.lataoEscuro, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 },
  h2: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 15, color: COR.texto, marginBottom: 10 },
  secao: { marginBottom: 22 },
  cartao: { borderWidth: 0.6, borderColor: COR.borda, borderRadius: 6, padding: 12, backgroundColor: COR.fundo },
  rotulo: { fontSize: 8, color: COR.texto3, marginBottom: 3 },
  valor: { fontSize: 13, fontWeight: 600, color: COR.texto },
  pequeno: { fontSize: 7.5, color: COR.texto3, marginTop: 2 },
  linhaTabela: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COR.divisoria, paddingVertical: 5 },
  cabTabela: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: COR.borda, paddingBottom: 4, fontSize: 7.5, color: COR.texto3, textTransform: "uppercase", letterSpacing: 0.6 },
});

/** Símbolo "pedra angular" (identidade/simbolo.svg), viewBox 120. */
function Simbolo({ tamanho, cor, pedra }: { tamanho: number; cor: string; pedra: string }) {
  const p = [
    "M36,12 L47,12 L53,37 A13,13 0 0,0 47,48 L47,59 L22.9,59 Z",
    "M84,12 L73,12 L67,37 A13,13 0 0,1 73,48 L73,59 L97.1,59 Z",
    "M19,61 H50 V66 H19 Z",
    "M70,61 H101 V66 H70 Z",
    "M20.4,68 L46,68 L40,98 L12,98 Z",
    "M99.6,68 L74,68 L80,98 L108,98 Z",
    "M8,100 H46 V106 H8 Z",
    "M74,100 H112 V106 H74 Z",
  ];
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 120 120">
      <G fill={cor}>
        {p.map((d) => (
          <Path key={d} d={d} fill={cor} />
        ))}
      </G>
      <Path d="M50,12 L70,12 L64,34 L56,34 Z" fill={pedra} />
    </Svg>
  );
}

/** Faixa de meandro grego (identidade/meandro.svg), módulo 24×14. */
function Meandro({ largura, cor }: { largura: number; cor: string }) {
  const n = Math.floor(largura / 24);
  return (
    <Svg width={n * 24} height={14} viewBox={`0 0 ${n * 24} 14`}>
      <Path d={`M0,13 H${n * 24} M0,1 H${n * 24}`} stroke={cor} strokeWidth={1.6} fill="none" />
      {Array.from({ length: n }, (_, i) => (
        <Path key={i} d={`M${i * 24 + 3},13 V4 H${i * 24 + 15} V10 H${i * 24 + 8} V7 H${i * 24 + 11}`} stroke={cor} strokeWidth={1.6} fill="none" />
      ))}
    </Svg>
  );
}

type T = (chave: string, valores?: Record<string, string | number>) => string;
type Fmt = { moeda: (v: number | null) => string; compacta: (v: number) => string; pct: (v: number | null, sinal?: boolean, casas?: number) => string; data: (iso: string | null) => string; mes: (iso: string) => string };

/** Marcas limpas no eixo (ex.: 0, 50 mil, 100 mil…). */
function ticksLimpos(max: number) {
  if (max <= 0) return [0];
  const bruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? bruto;
  return Array.from({ length: Math.ceil(max / passo) + 1 }, (_, i) => i * passo);
}

/** Triângulo de alerta (a fonte não tem o caractere ▲). */
function Alerta() {
  return (
    <Svg width={7} height={7} viewBox="0 0 10 10" style={{ marginRight: 3 }}>
      <Path d="M5,0.5 L9.5,9.5 L0.5,9.5 Z" fill={COR.atencao} />
    </Svg>
  );
}

function Grafico({ pontos, fmt }: { pontos: { data: string; valor: number }[]; fmt: Fmt }) {
  const W = 500;
  const H = 150;
  const esq = 56;
  const base = 18;
  if (pontos.length < 2) return null;
  const ticks = ticksLimpos(Math.max(...pontos.map((p) => p.valor)) * 1.05);
  const max = ticks.at(-1)!;
  const x = (i: number) => esq + (i / (pontos.length - 1)) * (W - esq - 8);
  const y = (v: number) => 6 + (H - base - 6) * (1 - v / max);
  const linha = pontos.map((p, i) => `${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const area = `M${x(0)},${y(0)} L${pontos.map((p, i) => `${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" L")} L${x(pontos.length - 1)},${y(0)} Z`;
  const passo = Math.ceil(pontos.length / 6);
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {ticks.map((v) => (
        <G key={v}>
          <Line x1={esq} x2={W - 8} y1={y(v)} y2={y(v)} stroke={COR.divisoria} strokeWidth={0.8} />
          <Text x={esq - 6} y={y(v) + 2.5} style={{ fontSize: 6.5, fill: COR.texto3 }} textAnchor="end">
            {fmt.compacta(v)}
          </Text>
        </G>
      ))}
      <Path d={area} fill={COR.marinho} fillOpacity={0.07} />
      <Polyline points={linha} stroke={COR.marinho} strokeWidth={1.6} fill="none" />
      {pontos.map((p, i) =>
        i % passo === 0 || i === pontos.length - 1 ? (
          <Text key={p.data} x={x(i)} y={H - 4} style={{ fontSize: 6.5, fill: COR.texto3 }} textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}>
            {fmt.mes(p.data)}
          </Text>
        ) : null,
      )}
      <Rect x={x(pontos.length - 1) - 2.5} y={y(pontos.at(-1)!.valor) - 2.5} width={5} height={5} rx={2.5} fill={COR.marinho} />
    </Svg>
  );
}

function Cabecalho({ texto }: { texto: string }) {
  return (
    <View style={s.cabecalho} fixed>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Simbolo tamanho={14} cor={COR.marinho} pedra={COR.latao} />
        <Text style={{ fontFamily: "Schibsted", fontWeight: 700, fontSize: 8.5, letterSpacing: 2 }}>ATREIDES</Text>
      </View>
      <Text style={{ fontSize: 7.5, color: COR.texto3 }}>{texto}</Text>
    </View>
  );
}

function Rodape({ texto, pagina }: { texto: string; pagina: (atual: number, total: number) => string }) {
  return (
    <View style={s.rodape} fixed>
      <Text>{texto}</Text>
      <Text render={({ pageNumber, totalPages }) => pagina(pageNumber - 1, totalPages - 1)} />
    </View>
  );
}

function Relatorio({ d, comentario, aprovacao, t, tc, fmt }: { d: DadosRelatorio; comentario: string; aprovacao: { por: string; em: string }; t: T; tc: (c: string) => string; fmt: Fmt }) {
  const periodo = `${fmt.data(d.periodo.inicio)} – ${fmt.data(d.periodo.fim)}`;
  const kpis: { r: string; v: string; d?: string }[] = [
    { r: t("patrimonioInicial"), v: fmt.moeda(d.inicio.valor), d: d.inicio.data ? fmt.data(d.inicio.data) : t("semFoto") },
    { r: t("patrimonioFinal"), v: fmt.moeda(d.fim.valor), d: d.fim.data ? fmt.data(d.fim.data) : t("semFoto") },
    { r: t("aportes"), v: fmt.moeda(d.aportes) },
    { r: t("resgates"), v: fmt.moeda(d.resgates) },
    { r: t("resultado"), v: fmt.moeda(d.variacao), d: t("resultadoDica") },
    { r: t("rentabilidade"), v: fmt.pct(d.rentabilidadePeriodo, true), d: t("noPeriodo") },
  ];
  const linhasRent = [
    { r: t("noPeriodo"), c: d.rentabilidadePeriodo, cdi: d.indices.periodo.cdi, ipca: d.indices.periodo.ipca },
    ...(d.marcoZero ? [{ r: t("desdeInicio", { data: fmt.data(d.marcoZero.data) }), c: d.rentabilidadeAcumulada, cdi: d.indices.acumulado.cdi, ipca: d.indices.acumulado.ipca }] : []),
  ];
  const escala = Math.max(10, ...d.alocacao.map((a) => Math.max(a.pct, a.alvo ?? 0))) * 1.1;

  return (
    <Document title={t("tituloDoc", { cliente: d.cliente.nome, periodo })} author="Atreides" creator="Atreides">
      {/* Capa */}
      <Page size="A4" style={s.capa}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Simbolo tamanho={34} cor={COR.osso} pedra={COR.latao} />
          <Text style={{ fontFamily: "Schibsted", fontWeight: 700, fontSize: 16, letterSpacing: 3.2 }}>ATREIDES</Text>
        </View>
        <View style={{ marginTop: 230 }}>
          <Text style={{ fontSize: 9, letterSpacing: 2.4, color: COR.latao, textTransform: "uppercase", fontWeight: 600 }}>{t("capaSobre")}</Text>
          <Text style={{ fontFamily: "Schibsted", fontWeight: 700, fontSize: 34, marginTop: 10, lineHeight: 1.1 }}>{d.cliente.nome}</Text>
          <Text style={{ fontSize: 13, marginTop: 14, color: "#C9D0DA" }}>{periodo}</Text>
        </View>
        <View style={{ position: "absolute", left: 56, right: 56, bottom: 56 }}>
          <Meandro largura={483} cor={COR.latao} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14, fontSize: 8.5, color: "#A9B3C1" }}>
            <Text>{t("consultor", { nome: d.consultor })}</Text>
            <Text>{t("emitidoEm", { data: fmt.data(aprovacao.em.slice(0, 10)) })}</Text>
          </View>
        </View>
      </Page>

      {/* Miolo */}
      <Page size="A4" style={s.pagina} wrap>
        <Cabecalho texto={t("cabecalho", { cliente: d.cliente.nome, periodo })} />
        <Rodape texto={t("rodape")} pagina={(atual, total) => t("pagina", { atual, total })} />

        <View style={s.secao}>
          <Text style={s.sobretitulo}>{t("s1Sobre")}</Text>
          <Text style={s.h2}>{t("s1Titulo")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {kpis.map((k) => (
              <View key={k.r} style={[s.cartao, { width: "32%" }]}>
                <Text style={s.rotulo}>{k.r}</Text>
                <Text style={s.valor}>{k.v}</Text>
                {k.d ? <Text style={s.pequeno}>{k.d}</Text> : null}
              </View>
            ))}
          </View>
        </View>

        <View style={s.secao} wrap={false}>
          <Text style={s.sobretitulo}>{t("s2Sobre")}</Text>
          <Text style={s.h2}>{t("s2Titulo")}</Text>
          <View style={s.cabTabela}>
            <Text style={{ flex: 2 }}>{t("periodo")}</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>{t("carteira")}</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>CDI</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>IPCA</Text>
          </View>
          {linhasRent.map((l) => (
            <View key={l.r} style={s.linhaTabela}>
              <Text style={{ flex: 2 }}>{l.r}</Text>
              <Text style={{ flex: 1, textAlign: "right", fontWeight: 600 }}>{fmt.pct(l.c, true)}</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>{fmt.pct(l.cdi)}</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>{fmt.pct(l.ipca)}</Text>
            </View>
          ))}
          <Text style={s.pequeno}>{t("rentNota", { fonte: d.indices.fonte })}</Text>
        </View>

        {d.evolucao.length >= 2 ? (
          <View style={s.secao} wrap={false}>
            <Text style={s.sobretitulo}>{t("s3Sobre")}</Text>
            <Text style={s.h2}>{t("s3Titulo")}</Text>
            <Grafico pontos={d.evolucao} fmt={fmt} />
          </View>
        ) : null}

        {d.alocacao.length ? (
          <View style={s.secao} wrap={false}>
            <Text style={s.sobretitulo}>{t("s4Sobre")}</Text>
            <Text style={s.h2}>{t("s4Titulo")}</Text>
            {d.alocacao.map((a) => (
              <View key={a.classe} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ width: 118, fontSize: 8.5 }}>{tc(a.classe)}</Text>
                <Svg width={190} height={10}>
                  <Rect x={0} y={3} width={190} height={4} rx={2} fill={COR.divisoria} />
                  <Rect x={0} y={2} width={(a.pct / escala) * 190} height={6} rx={2} fill={COR.marinho} />
                  {a.alvo !== null ? <Rect x={(a.alvo / escala) * 190 - 0.8} y={0} width={1.6} height={10} fill={COR.lataoEscuro} /> : null}
                </Svg>
                <Text style={{ width: 46, textAlign: "right", fontWeight: 600, fontSize: 8.5 }}>{fmt.pct(a.pct, false, 1)}</Text>
                <Text style={{ width: 64, textAlign: "right", fontSize: 8, color: COR.texto3 }}>{a.alvo !== null ? t("alvo", { pct: fmt.pct(a.alvo, false, 1) }) : ""}</Text>
                <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
                  {a.alerta ? <Alerta /> : null}
                  <Text style={{ fontSize: 8, color: a.alerta ? COR.atencao : COR.texto3, fontWeight: a.alerta ? 600 : 400 }}>
                    {a.desvio !== null ? fmt.pct(a.desvio, true, 1).replace("%", " p.p.") : ""}
                  </Text>
                </View>
              </View>
            ))}
            <Text style={s.pequeno}>{d.alocacao.some((a) => a.alvo !== null) ? t("alocNota", { limite: d.limiteDesvio }) : t("alocSemAlvo")}</Text>
          </View>
        ) : null}

        {d.posicoes.length ? (
          <View style={s.secao}>
            <Text style={s.sobretitulo}>{t("s5Sobre")}</Text>
            <Text style={s.h2}>{t("s5Titulo")}</Text>
            <View style={s.cabTabela}>
              <Text style={{ flex: 3 }}>{t("ativo")}</Text>
              <Text style={{ flex: 2 }}>{t("classe")}</Text>
              <Text style={{ flex: 1.4, textAlign: "right" }}>{t("valor")}</Text>
              <Text style={{ flex: 1, textAlign: "right" }}>%</Text>
            </View>
            {d.posicoes.slice(0, 12).map((p) => (
              <View key={p.nome} style={s.linhaTabela} wrap={false}>
                <Text style={{ flex: 3 }}>{p.nome}</Text>
                <Text style={{ flex: 2, color: COR.texto2 }}>{tc(p.classe)}</Text>
                <Text style={{ flex: 1.4, textAlign: "right" }}>{fmt.moeda(p.valor)}</Text>
                <Text style={{ flex: 1, textAlign: "right", color: COR.texto2 }}>{fmt.pct(p.pct, false, 1)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.secao} wrap={false}>
          <Text style={s.sobretitulo}>{t("s6Sobre")}</Text>
          <Text style={s.h2}>{t("s6Titulo")}</Text>
          <View style={[s.cartao, { backgroundColor: "#FFFFFF", borderLeftWidth: 2, borderLeftColor: COR.latao }]}>
            <Text style={{ fontSize: 10, lineHeight: 1.55, color: COR.texto }}>{comentario}</Text>
            <Text style={[s.pequeno, { marginTop: 8 }]}>{t("assinatura", { nome: aprovacao.por, data: fmt.data(aprovacao.em.slice(0, 10)) })}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 16, alignItems: "center", marginTop: 6 }} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não tem alt (PDF) */}
          <Image src={path.join(DIR, "selo.png")} style={{ width: 62, height: 62 }} />
          <Text style={{ flex: 1, fontSize: 7, lineHeight: 1.5, color: COR.texto3 }}>{t("avisoLegal")}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function gerarPdf(params: { dados: DadosRelatorio; comentario: string; aprovacao: { por: string; em: string }; t: T; tc: (c: string) => string; locale: string }) {
  registrarFontes();
  const { locale } = params;
  const moeda = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const compacta = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
  const fmt: Fmt = {
    moeda: (v) => (v === null || !Number.isFinite(v) ? "—" : moeda.format(v)),
    compacta: (v) => compacta.format(v),
    pct: (v, sinal, casas = 2) =>
      v === null || !Number.isFinite(v)
        ? "—"
        : `${sinal && v > 0 ? "+" : ""}${new Intl.NumberFormat(locale, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v)}%`,
    data: (iso) => (iso ? new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${iso}T12:00:00Z`)) : "—"),
    mes: (iso) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", year: "2-digit" }).format(new Date(`${iso}T12:00:00Z`)),
  };
  return renderToBuffer(<Relatorio d={params.dados} comentario={params.comentario} aprovacao={params.aprovacao} t={params.t} tc={params.tc} fmt={fmt} />);
}
