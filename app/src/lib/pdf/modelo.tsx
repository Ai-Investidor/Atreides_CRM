import path from "node:path";
import type { ReactElement, ReactNode } from "react";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { Cabecalho, COR, DIR, MARGEM, Meandro, registrarFontes, Rodape, Simbolo } from "./marca";

/**
 * Modelo único dos PDFs para o cliente (Documentação/12, seção 7.1): diagnóstico, planejamento,
 * relatório e plano de aportes. Capa marinho → miolo (cabeçalho, rodapé, números-chave, seções)
 * → fecho (preparado por, selo, aviso). Cada documento escolhe os blocos e o texto; o estilo é este.
 * Sem lineHeight em lugar nenhum (ver marca.tsx).
 */

export type T = (chave: string, valores?: Record<string, string | number>) => string;

/** Textos comuns (namespace "pdf"); ver textos.ts. */
export type TextosModelo = {
  rodape: string;
  pagina: (atual: number, total: number) => string;
  consultor: (nome: string) => string;
  emitidoEm: (data: string) => string;
  preparadoPor: (nome: string, data: string) => string;
  citacao: { texto: string; fonte: string };
};

/** Largura útil do miolo (A4 = 595 pt). */
export const LARGURA = 595 - MARGEM * 2;

export const E = StyleSheet.create({
  capa: { backgroundColor: COR.marinho, color: COR.osso, padding: 56, fontFamily: "Inter" },
  pagina: { backgroundColor: "#FFFFFF", color: COR.texto, paddingTop: 64, paddingBottom: 64, paddingHorizontal: MARGEM, fontFamily: "Inter", fontSize: 10 },
  sobretitulo: { fontSize: 7.5, letterSpacing: 1.6, color: COR.lataoEscuro, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 },
  titulo: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 14, color: COR.texto, marginBottom: 9 },
  cartao: { borderWidth: 0.6, borderColor: COR.borda, borderRadius: 6, padding: 10, backgroundColor: COR.fundo },
  rotulo: { fontSize: 7.5, color: COR.texto3, marginBottom: 3 },
  valor: { fontSize: 12.5, fontWeight: 600, color: COR.texto },
  detalhe: { fontSize: 7.5, color: COR.texto3, marginTop: 3 },
  nota: { fontSize: 7.5, color: COR.texto3, marginTop: 5 },
  cabTabela: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: COR.borda, paddingBottom: 4, fontSize: 7, color: COR.texto3, textTransform: "uppercase", letterSpacing: 0.6 },
  linhaTabela: { flexDirection: "row", flexShrink: 0, borderBottomWidth: 0.5, borderBottomColor: COR.divisoria, paddingVertical: 5, fontSize: 9 },
  totalTabela: { flexDirection: "row", flexShrink: 0, borderTopWidth: 0.8, borderTopColor: COR.borda, paddingVertical: 6, fontSize: 9, fontWeight: 700 },
  caixa: { borderWidth: 0.6, borderColor: COR.borda, borderRadius: 6, padding: 12, backgroundColor: COR.fundo },
});

// ---------------------------------------------------------------- Documento

type PropsDocumento = {
  textos: TextosModelo;
  /** Título dos metadados do arquivo. */
  tituloDoc: string;
  capa: { sobre: string; titulo: string; contexto?: string | null };
  /** Texto à direita do cabeçalho do miolo ("Planejamento · Maria Souza"). */
  cabecalho: string;
  consultor: string | null;
  /** Data de emissão já formatada. */
  data: string;
  /** Aviso legal do tipo de documento. */
  aviso: string;
  /** false quando a assinatura já está no corpo (ex.: comentário assinado do relatório). */
  assinar?: boolean;
  children: ReactNode;
};

export function DocumentoAtreides(p: PropsDocumento) {
  const { textos } = p;
  return (
    <Document title={p.tituloDoc} author="Atreides" creator="Atreides" producer="Atreides">
      <Page size="A4" style={E.capa}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Simbolo tamanho={34} cor={COR.osso} pedra={COR.latao} />
          <Text style={{ fontFamily: "Schibsted", fontWeight: 700, fontSize: 16, letterSpacing: 3.2 }}>ATREIDES</Text>
        </View>
        <View style={{ marginTop: 210 }}>
          <Text style={{ fontSize: 9, letterSpacing: 2.4, color: COR.latao, textTransform: "uppercase", fontWeight: 600 }}>{p.capa.sobre}</Text>
          <Text style={{ fontFamily: "Schibsted", fontWeight: 700, fontSize: 34, marginTop: 10 }}>{p.capa.titulo}</Text>
          {p.capa.contexto ? <Text style={{ fontSize: 13, marginTop: 14, color: "#C9D0DA" }}>{p.capa.contexto}</Text> : null}
        </View>
        <View style={{ position: "absolute", left: 56, right: 56, bottom: 56 }}>
          <View style={{ marginBottom: 22, maxWidth: 330 }}>
            <Text style={{ fontFamily: "Schibsted", fontWeight: 600, fontSize: 10, color: "#C9D0DA" }}>“{textos.citacao.texto}”</Text>
            <Text style={{ fontSize: 6.5, letterSpacing: 1.4, color: COR.latao, textTransform: "uppercase", marginTop: 6 }}>{textos.citacao.fonte}</Text>
          </View>
          <Meandro largura={483} cor={COR.latao} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14, fontSize: 8.5, color: "#A9B3C1" }}>
            <Text>{p.consultor ? textos.consultor(p.consultor) : ""}</Text>
            <Text>{textos.emitidoEm(p.data)}</Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={E.pagina} wrap>
        <Cabecalho texto={p.cabecalho} />
        <Rodape texto={textos.rodape} pagina={textos.pagina} />
        {p.children}
        <Fecho preparadoPor={p.assinar !== false && p.consultor ? textos.preparadoPor(p.consultor, p.data) : null} aviso={p.aviso} />
      </Page>
    </Document>
  );
}

/** Preparado por + selo + aviso, sempre juntos no fim. */
function Fecho({ preparadoPor, aviso }: { preparadoPor: string | null; aviso: string }) {
  return (
    <View style={{ marginTop: 24, paddingTop: 14, borderTopWidth: 0.6, borderTopColor: COR.borda }} wrap={false}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não tem alt (PDF) */}
        <Image src={path.join(DIR, "selo.png")} style={{ width: 50, height: 50 }} />
        <View style={{ flex: 1 }}>
          {preparadoPor ? <Text style={{ fontSize: 8.5, fontWeight: 600, color: COR.texto, marginBottom: 4 }}>{preparadoPor}</Text> : null}
          <Text style={{ fontSize: 7, color: COR.texto3 }}>{aviso}</Text>
        </View>
      </View>
    </View>
  );
}

export async function gerarPdfAtreides(documento: ReactElement) {
  registrarFontes();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- renderToBuffer espera ReactElement<DocumentProps>
  return renderToBuffer(documento as any);
}

// ---------------------------------------------------------------- Blocos

export type NumeroChave = { rotulo: string; valor: string; detalhe?: string | null; destaque?: boolean };

/** Faixa de números-chave (abertura do miolo). Até 4 por linha; o destaque leva o filete de latão. */
export function NumerosChave({ itens, colunas }: { itens: NumeroChave[]; colunas?: number }) {
  if (!itens.length) return null;
  const n = colunas ?? Math.min(4, itens.length);
  const gap = 8;
  const largura = (LARGURA - gap * (n - 1)) / n;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap, marginBottom: 6 }} wrap={false}>
      {itens.map((c) => (
        <View key={c.rotulo} style={[E.cartao, { width: largura }]}>
          {c.destaque ? <View style={{ width: 22, height: 2.5, backgroundColor: COR.latao, marginBottom: 6 }} /> : null}
          <Text style={E.rotulo}>{c.rotulo}</Text>
          <Text style={E.valor}>{c.valor}</Text>
          {c.detalhe ? <Text style={E.detalhe}>{c.detalhe}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Seção: sobretítulo + título. "inteira" não deixa a seção quebrar entre páginas. */
function CabecalhoSecao({ sobre, titulo }: { sobre?: string; titulo: string }) {
  return (
    <View>
      {sobre ? <Text style={E.sobretitulo}>{sobre}</Text> : null}
      <Text style={E.titulo}>{titulo}</Text>
    </View>
  );
}

export function Secao({ sobre, titulo, inteira, children }: { sobre?: string; titulo: string; inteira?: boolean; children: ReactNode }) {
  return (
    <View style={{ marginTop: 20 }} wrap={!inteira}>
      <View minPresenceAhead={70}>
        <CabecalhoSecao sobre={sobre} titulo={titulo} />
      </View>
      {children}
    </View>
  );
}

/**
 * Seção com tabela. Até 15 linhas a seção não quebra (vai inteira para a próxima página se não
 * couber); acima disso, quebra entre linhas, com o cabeçalho das colunas preso à primeira linha.
 */
export function SecaoTabela({ sobre, titulo, nota, ...tabela }: { sobre?: string; titulo: string; nota?: string | null } & PropsTabela) {
  const curta = tabela.linhas.length <= 15;
  return (
    <View style={{ marginTop: 20 }} wrap={!curta}>
      <View minPresenceAhead={70}>
        <CabecalhoSecao sobre={sobre} titulo={titulo} />
      </View>
      <Tabela {...tabela} />
      {nota ? <Nota>{nota}</Nota> : null}
    </View>
  );
}

export type Celula = string | { texto: string; forte?: boolean; suave?: boolean; detalhe?: string | null };
export type Coluna = { titulo: string; flex: number; direita?: boolean };

function TextoCelula({ c, col }: { c: Celula; col: Coluna }) {
  const v = typeof c === "string" ? { texto: c } : c;
  return (
    <View style={{ flex: col.flex, paddingRight: col.direita ? 0 : 6, paddingLeft: col.direita ? 6 : 0 }}>
      <Text style={{ textAlign: col.direita ? "right" : "left", fontWeight: v.forte ? 600 : 400, color: v.suave ? COR.texto2 : COR.texto }}>{v.texto}</Text>
      {v.detalhe ? <Text style={{ fontSize: 7, color: COR.texto3, marginTop: 1.5, textAlign: col.direita ? "right" : "left" }}>{v.detalhe}</Text> : null}
    </View>
  );
}

/** Tabela do modelo: cabeçalho em caixa alta pequena, linhas finas, números à direita e total opcional. */
type PropsTabela = { colunas: Coluna[]; linhas: Celula[][]; total?: Celula[] };

export function Tabela({ colunas, linhas, total }: PropsTabela) {
  return (
    <View>
      {/* O cabeçalho nunca fica sozinho no fim da página: vai junto com a primeira linha.
          flexShrink 0: sem isso o react-pdf espreme o bloco no fim da página em vez de quebrar. */}
      <View wrap={false} style={{ flexShrink: 0 }}>
        <View style={E.cabTabela}>
          {colunas.map((c, i) => (
            <Text key={i} style={{ flex: c.flex, textAlign: c.direita ? "right" : "left", paddingRight: c.direita ? 0 : 6, paddingLeft: c.direita ? 6 : 0 }}>
              {c.titulo}
            </Text>
          ))}
        </View>
        {linhas[0] ? (
          <View style={E.linhaTabela}>
            {linhas[0].map((c, j) => (
              <TextoCelula key={j} c={c} col={colunas[j]} />
            ))}
          </View>
        ) : null}
      </View>
      {linhas.slice(1).map((l, i) => (
        <View key={i} style={E.linhaTabela} wrap={false}>
          {l.map((c, j) => (
            <TextoCelula key={j} c={c} col={colunas[j]} />
          ))}
        </View>
      ))}
      {total ? (
        <View style={E.totalTabela} wrap={false}>
          {total.map((c, j) => (
            <TextoCelula key={j} c={typeof c === "string" ? { texto: c, forte: true } : { ...c, forte: true }} col={colunas[j]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Texto pequeno de contexto embaixo de um número ou tabela. */
export function Nota({ children }: { children: ReactNode }) {
  return <Text style={E.nota}>{children}</Text>;
}

/** Comentário do consultor: caixa branca com filete de latão à esquerda. */
export function Comentario({ texto, assinatura }: { texto: string; assinatura?: string | null }) {
  return (
    <View style={[E.caixa, { backgroundColor: "#FFFFFF", borderLeftWidth: 2, borderLeftColor: COR.latao }]}>
      <Text style={{ fontSize: 9.5, color: COR.texto }}>{texto}</Text>
      {assinatura ? <Text style={[E.nota, { marginTop: 8 }]}>{assinatura}</Text> : null}
    </View>
  );
}

/** Barra horizontal fina de proporção (0–100), marinho sobre a divisória; "alvo" marca o alvo em latão. Sem largura, ocupa a linha. */
export function Barra({ pct, largura, alvo }: { pct: number; largura?: number; alvo?: number | null }) {
  const p = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
  return (
    <View style={{ width: largura ?? "100%", height: 8 }}>
      <View style={{ position: "absolute", left: 0, top: 2.5, width: "100%", height: 3, borderRadius: 2, backgroundColor: COR.divisoria }} />
      <View style={{ position: "absolute", left: 0, top: 2, width: p(pct), height: 4, borderRadius: 2, backgroundColor: COR.marinho }} />
      {alvo !== null && alvo !== undefined ? <View style={{ position: "absolute", left: p(alvo), marginLeft: -0.8, top: 0, width: 1.6, height: 8, backgroundColor: COR.lataoEscuro }} /> : null}
    </View>
  );
}
