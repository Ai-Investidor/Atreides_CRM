import { Link, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Content, PhrasingContent, RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { COR } from "./marca";

/**
 * Markdown do consultor em componentes do PDF (diagnóstico 14, planejamento 05). Sem HTML.
 * Sem lineHeight: no react-pdf ele some com o rodapé (se na página) e deixa espaço sobrando
 * embaixo dos textos (se nos blocos); o espaçamento padrão da fonte basta.
 */

const s = StyleSheet.create({
  h1: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 18, color: COR.texto, marginTop: 14, marginBottom: 8 },
  h2: { fontFamily: "Schibsted", fontWeight: 700, fontSize: 14, color: COR.texto, marginTop: 12, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.6, borderBottomColor: COR.borda },
  h3: { fontFamily: "Schibsted", fontWeight: 600, fontSize: 12, color: COR.texto, marginTop: 10, marginBottom: 4 },
  p: { marginBottom: 7, color: COR.texto },
  item: { flexDirection: "row", marginBottom: 4 },
  textoItem: { color: COR.texto },
  marcador: { width: 14, color: COR.lataoEscuro },
  citacao: { borderLeftWidth: 2, borderLeftColor: COR.latao, paddingLeft: 10, marginBottom: 8, color: COR.texto2 },
  regua: { borderBottomWidth: 0.6, borderBottomColor: COR.borda, marginVertical: 10 },
  codigo: { backgroundColor: COR.fundo, borderWidth: 0.5, borderColor: COR.borda, borderRadius: 4, padding: 8, marginBottom: 8, fontSize: 9 },
  celula: { flex: 1, paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COR.divisoria },
});

/** Trechos dentro de um parágrafo (negrito, itálico, links…). */
function Inline({ nos }: { nos: PhrasingContent[] }) {
  return (
    <>
      {nos.map((n, i) => {
        switch (n.type) {
          case "text":
            return n.value;
          case "strong":
            return (
              <Text key={i} style={{ fontWeight: 700 }}>
                <Inline nos={n.children} />
              </Text>
            );
          case "emphasis":
            return (
              <Text key={i} style={{ color: COR.texto2 }}>
                <Inline nos={n.children} />
              </Text>
            );
          case "delete":
            return (
              <Text key={i} style={{ textDecoration: "line-through" }}>
                <Inline nos={n.children} />
              </Text>
            );
          case "inlineCode":
            return (
              <Text key={i} style={{ backgroundColor: COR.fundo }}>
                {n.value}
              </Text>
            );
          case "link":
            return (
              <Link key={i} src={n.url} style={{ color: COR.marinho2 }}>
                <Inline nos={n.children} />
              </Link>
            );
          case "break":
            return "\n";
          default:
            return "value" in n && typeof n.value === "string" ? n.value : null;
        }
      })}
    </>
  );
}

function Bloco({ no, nivel = 0 }: { no: RootContent | Content; nivel?: number }) {
  switch (no.type) {
    case "heading": {
      const estilo = no.depth === 1 ? s.h1 : no.depth === 2 ? s.h2 : s.h3;
      return (
        <Text style={estilo} minPresenceAhead={40}>
          <Inline nos={no.children} />
        </Text>
      );
    }
    case "paragraph":
      return (
        <Text style={s.p}>
          <Inline nos={no.children} />
        </Text>
      );
    case "list":
      return (
        <View style={{ marginBottom: 7, marginLeft: nivel * 12 }}>
          {no.children.map((item, i) => (
            <View key={i} style={s.item} wrap={false}>
              <Text style={s.marcador}>{no.ordered ? `${(no.start ?? 1) + i}.` : item.checked === true ? "☑" : item.checked === false ? "☐" : "•"}</Text>
              <View style={{ flex: 1 }}>
                {item.children.map((filho, j) =>
                  filho.type === "paragraph" ? (
                    <Text key={j} style={s.textoItem}>
                      <Inline nos={filho.children} />
                    </Text>
                  ) : (
                    <Bloco key={j} no={filho} nivel={nivel + 1} />
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      );
    case "blockquote":
      return (
        <View style={s.citacao}>
          {no.children.map((filho, i) => (
            <Bloco key={i} no={filho} nivel={nivel} />
          ))}
        </View>
      );
    case "thematicBreak":
      return <View style={s.regua} />;
    case "code":
      return <Text style={s.codigo}>{no.value}</Text>;
    case "table":
      return (
        <View style={{ marginBottom: 8 }}>
          {no.children.map((linha, i) => (
            <View key={i} style={{ flexDirection: "row" }} wrap={false}>
              {linha.children.map((celula, j) => (
                <Text key={j} style={[s.celula, i === 0 ? { fontWeight: 600, color: COR.texto2 } : {}]}>
                  <Inline nos={celula.children} />
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
}

/** Documento markdown inteiro (GFM: tabelas, listas de tarefas, tachado). */
export function MarkdownPdf({ markdown }: { markdown: string }) {
  const arvore = fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  return (
    <>
      {arvore.children.map((no, i) => (
        <Bloco key={i} no={no} />
      ))}
    </>
  );
}
