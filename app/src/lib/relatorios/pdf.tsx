import { G, Line, Path, Polyline, Rect, Svg, Text, View } from "@react-pdf/renderer";
import { COR } from "@/lib/pdf/marca";
import { formatosPdf, type FormatosPdf } from "@/lib/pdf/formatos";
import { Barra, Comentario, DocumentoAtreides, gerarPdfAtreides, LARGURA, Nota, NumerosChave, Secao, SecaoTabela, Tabela, type T, type TextosModelo } from "@/lib/pdf/modelo";
import type { DadosRelatorio } from "./regras";

/**
 * PDF do relatório de acompanhamento (Documentação/08), no modelo único (Documentação/12, seção 7.1):
 * o período em números, rentabilidade × CDI e IPCA, evolução, alocação × alvo, posições e o
 * comentário assinado do consultor.
 */

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

function Grafico({ pontos, fmt }: { pontos: { data: string; valor: number }[]; fmt: FormatosPdf }) {
  const W = LARGURA;
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
        (i % passo === 0 && pontos.length - 1 - i >= passo) || i === pontos.length - 1 ? (
          <Text key={p.data} x={x(i)} y={H - 4} style={{ fontSize: 6.5, fill: COR.texto3 }} textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"}>
            {fmt.mesCurto(p.data)}
          </Text>
        ) : null,
      )}
      <Rect x={x(pontos.length - 1) - 2.5} y={y(pontos.at(-1)!.valor) - 2.5} width={5} height={5} rx={2.5} fill={COR.marinho} />
    </Svg>
  );
}

type Params = { dados: DadosRelatorio; comentario: string; aprovacao: { por: string; em: string }; t: T; tc: (c: string) => string; locale: string; textos: TextosModelo };

export async function gerarPdf({ dados: d, comentario, aprovacao, t, tc, locale, textos }: Params) {
  const fmt = formatosPdf(locale);
  const periodo = `${fmt.data(d.periodo.inicio)} – ${fmt.data(d.periodo.fim)}`;
  const emitido = fmt.dataHora(aprovacao.em);
  const pct = (v: number | null, sinal = false, casas = 2) => fmt.pct(v, casas, sinal);
  const linhasRent = [
    { r: t("noPeriodo"), c: d.rentabilidadePeriodo, cdi: d.indices.periodo.cdi, ipca: d.indices.periodo.ipca },
    ...(d.marcoZero ? [{ r: t("desdeInicio", { data: fmt.data(d.marcoZero.data) }), c: d.rentabilidadeAcumulada, cdi: d.indices.acumulado.cdi, ipca: d.indices.acumulado.ipca }] : []),
  ];
  const escala = Math.max(10, ...d.alocacao.map((a) => Math.max(a.pct, a.alvo ?? 0))) * 1.1;
  const rel = (v: number) => (v / escala) * 100;

  return gerarPdfAtreides(
    <DocumentoAtreides
      textos={textos}
      tituloDoc={t("tituloDoc", { cliente: d.cliente.nome, periodo })}
      capa={{ sobre: t("capaSobre"), titulo: d.cliente.nome, contexto: periodo }}
      cabecalho={t("cabecalho", { cliente: d.cliente.nome, periodo })}
      consultor={d.consultor}
      data={emitido}
      aviso={t("avisoLegal")}
      assinar={false}
    >
      <NumerosChave
        colunas={3}
        itens={[
          { rotulo: t("patrimonioFinal"), valor: fmt.moeda(d.fim.valor), detalhe: d.fim.data ? fmt.data(d.fim.data) : t("semFoto"), destaque: true },
          { rotulo: t("patrimonioInicial"), valor: fmt.moeda(d.inicio.valor), detalhe: d.inicio.data ? fmt.data(d.inicio.data) : t("semFoto") },
          { rotulo: t("rentabilidade"), valor: pct(d.rentabilidadePeriodo, true), detalhe: t("noPeriodo") },
          { rotulo: t("aportes"), valor: fmt.moeda(d.aportes) },
          { rotulo: t("resgates"), valor: fmt.moeda(d.resgates) },
          { rotulo: t("resultado"), valor: fmt.moeda(d.variacao), detalhe: t("resultadoDica") },
        ]}
      />

      <Secao sobre={t("s2Sobre")} titulo={t("s2Titulo")} inteira>
        <Tabela
          colunas={[
            { titulo: t("periodo"), flex: 2 },
            { titulo: t("carteira"), flex: 1, direita: true },
            { titulo: "CDI", flex: 1, direita: true },
            { titulo: "IPCA", flex: 1, direita: true },
          ]}
          linhas={linhasRent.map((l) => [l.r, { texto: pct(l.c, true), forte: true }, pct(l.cdi), pct(l.ipca)])}
        />
        <Nota>{t("rentNota", { fonte: d.indices.fonte })}</Nota>
      </Secao>

      {d.evolucao.length >= 2 ? (
        <Secao sobre={t("s3Sobre")} titulo={t("s3Titulo")} inteira>
          <Grafico pontos={d.evolucao} fmt={fmt} />
        </Secao>
      ) : null}

      {d.alocacao.length ? (
        <Secao sobre={t("s4Sobre")} titulo={t("s4Titulo")} inteira>
          {d.alocacao.map((a) => (
            <View key={a.classe} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, fontSize: 8.5 }}>
              <Text style={{ width: 118 }}>{tc(a.classe)}</Text>
              <View style={{ width: 170, flexDirection: "row" }}>
                <Barra pct={rel(a.pct)} alvo={a.alvo !== null ? rel(a.alvo) : null} largura={170} />
              </View>
              <Text style={{ width: 46, textAlign: "right", fontWeight: 600 }}>{pct(a.pct, false, 1)}</Text>
              <Text style={{ width: 64, textAlign: "right", fontSize: 8, color: COR.texto3 }}>{a.alvo !== null ? t("alvo", { pct: pct(a.alvo, false, 1) }) : ""}</Text>
              <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
                {a.alerta ? <Alerta /> : null}
                <Text style={{ fontSize: 8, color: a.alerta ? COR.atencao : COR.texto3, fontWeight: a.alerta ? 600 : 400 }}>{a.desvio !== null ? pct(a.desvio, true, 1).replace("%", " p.p.") : ""}</Text>
              </View>
            </View>
          ))}
          <Nota>{d.alocacao.some((a) => a.alvo !== null) ? t("alocNota", { limite: d.limiteDesvio }) : t("alocSemAlvo")}</Nota>
        </Secao>
      ) : null}

      {d.posicoes.length ? (
        <SecaoTabela
          sobre={t("s5Sobre")}
          titulo={t("s5Titulo")}
          colunas={[
            { titulo: t("ativo"), flex: 3 },
            { titulo: t("classe"), flex: 2 },
            { titulo: t("valor"), flex: 1.4, direita: true },
            { titulo: "%", flex: 1, direita: true },
          ]}
          linhas={d.posicoes.slice(0, 12).map((p) => [p.nome, { texto: tc(p.classe), suave: true }, fmt.moeda(p.valor), { texto: pct(p.pct, false, 1), suave: true }])}
        />
      ) : null}

      <Secao sobre={t("s6Sobre")} titulo={t("s6Titulo")} inteira>
        <Comentario texto={comentario} assinatura={t("assinatura", { nome: aprovacao.por, data: emitido })} />
      </Secao>
    </DocumentoAtreides>,
  );
}
