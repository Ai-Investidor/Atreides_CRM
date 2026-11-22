import { DocumentoAtreides, gerarPdfAtreides, NumerosChave, type T, type TextosModelo } from "@/lib/pdf/modelo";
import { MarkdownPdf } from "@/lib/pdf/markdown";

/**
 * PDF do diagnóstico (Documentação/14), no modelo único (Documentação/12, seção 7.1): números-chave
 * (despesa, aposentadoria) e o texto em markdown do consultor. Nunca mostra o perfil de investidor.
 */

type Params = {
  markdown: string;
  nome: string;
  consultor: string | null;
  atualizadoEm: string;
  despesa: string | null;
  aposentadoria: string | null;
  t: T;
  textos: TextosModelo;
};

export async function gerarPdfDiagnostico(p: Params) {
  const { t } = p;
  const numeros = [
    ...(p.despesa ? [{ rotulo: t("despesa"), valor: p.despesa, destaque: true }] : []),
    ...(p.aposentadoria ? [{ rotulo: t("aposentadoria"), valor: p.aposentadoria }] : []),
  ];
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
      <NumerosChave itens={numeros} colunas={numeros.length ? 2 : undefined} />
      <MarkdownPdf markdown={p.markdown} />
    </DocumentoAtreides>,
  );
}
