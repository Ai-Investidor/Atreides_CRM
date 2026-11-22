import { Text, View } from "@react-pdf/renderer";
import { COR } from "@/lib/pdf/marca";
import { MarkdownPdf } from "@/lib/pdf/markdown";
import { Barra, DocumentoAtreides, E, gerarPdfAtreides, Nota, NumerosChave, Secao, SecaoTabela, type T, type TextosModelo } from "@/lib/pdf/modelo";

/**
 * PDF do planejamento (Documentação/05), no modelo único (Documentação/12, seção 7.1): números-chave,
 * texto do consultor, objetivos com aporte necessário, proporção da carteira e aposentadoria.
 * Recebe os números já calculados e formatados (mesmas funções da tela). Nunca mostra o perfil.
 */

export type ParamsPdfPlanejamento = {
  nome: string;
  consultor: string | null;
  atualizadoEm: string;
  markdown: string;
  resumo: { rotulo: string; valor: string }[];
  objetivos: { nome: string; valor: string; prazo: string; guardado: string; aporte: string }[];
  grupos: { nome: string; total: string; pct: number; classes: { nome: string; pct: string; premissa: string | null }[] }[];
  aposentadoria: { valor: string | null; texto: string; nota: string | null };
  t: T;
  textos: TextosModelo;
};

export async function gerarPdfPlanejamento(p: ParamsPdfPlanejamento) {
  const { t } = p;
  return gerarPdfAtreides(
    <DocumentoAtreides
      textos={p.textos}
      tituloDoc={t("tituloDoc", { nome: p.nome })}
      capa={{ sobre: t("capaSobre"), titulo: p.nome, contexto: t("capaFrase") }}
      cabecalho={t("cabecalho", { nome: p.nome })}
      consultor={p.consultor}
      data={p.atualizadoEm}
      aviso={t("aviso")}
    >
      <NumerosChave itens={p.resumo.map((r, i) => ({ ...r, destaque: i === 0 }))} />

      <MarkdownPdf markdown={p.markdown} />

      {p.objetivos.length ? (
        <SecaoTabela
          sobre={t("objetivosSobre")}
          titulo={t("objetivos")}
          colunas={[
            { titulo: t("colNome"), flex: 2.4 },
            { titulo: t("colValor"), flex: 1.3, direita: true },
            { titulo: t("colPrazo"), flex: 1.1, direita: true },
            { titulo: t("colGuardado"), flex: 1.3, direita: true },
            { titulo: t("colAporte"), flex: 1.6, direita: true },
          ]}
          linhas={p.objetivos.map((o) => [{ texto: o.nome, forte: true }, o.valor, { texto: o.prazo, suave: true }, { texto: o.guardado, suave: true }, { texto: o.aporte, forte: true }])}
          nota={t("notaObjetivos")}
        />
      ) : null}

      {p.grupos.length ? (
        <Secao sobre={t("alocacaoSobre")} titulo={t("alocacao")} inteira>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {p.grupos.map((g) => (
              <View key={g.nome} style={[E.cartao, { flex: 1, backgroundColor: "#FFFFFF" }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                  <Text style={{ fontWeight: 600 }}>{g.nome}</Text>
                  <Text style={{ fontWeight: 700 }}>{g.total}</Text>
                </View>
                <Barra pct={g.pct} />
                {g.classes.map((c) => (
                  <View key={c.nome} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, fontSize: 8.5 }}>
                    <Text style={{ color: COR.texto2, flex: 1 }}>
                      {c.nome}
                      {c.premissa ? <Text style={{ color: COR.texto3 }}> · {c.premissa}</Text> : null}
                    </Text>
                    <Text>{c.pct}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Secao>
      ) : null}

      <Secao sobre={t("aposentadoriaSobre")} titulo={t("aposentadoria")} inteira>
        <View style={E.caixa}>
          {p.aposentadoria.valor ? <Text style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{p.aposentadoria.valor}</Text> : null}
          <Text style={{ color: p.aposentadoria.valor ? COR.texto2 : COR.texto3, fontSize: 9.5 }}>{p.aposentadoria.texto}</Text>
          {p.aposentadoria.nota ? <Nota>{p.aposentadoria.nota}</Nota> : null}
        </View>
      </Secao>
    </DocumentoAtreides>,
  );
}
