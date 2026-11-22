import { Comentario, DocumentoAtreides, gerarPdfAtreides, Nota, NumerosChave, Secao, SecaoTabela, Tabela, type Celula, type T, type TextosModelo } from "@/lib/pdf/modelo";

/**
 * PDF do plano de aportes do período (Documentação/06), no modelo único (Documentação/12, seção 7.1):
 * números-chave, compras do período, distribuição por classe (carteira hoje, depois do aporte e alvo)
 * e observações. Recebe tudo já formatado.
 */

export type ParamsPdfAporte = {
  nome: string;
  consultor: string | null;
  emitidoEm: string;
  /** "Aporte de março de 2027" / "Aporte da semana de 10/03/2027" */
  periodo: string;
  executado: boolean;
  numeros: { rotulo: string; valor: string; detalhe?: string | null }[];
  compras: { ticker: string; nome: string | null; classe: string; quantidade: string; preco: string; valor: string; pct: string }[];
  total: string;
  classes: { classe: string; aporte: string; hoje: string; depois: string | null; alvo: string }[];
  temAlvo: boolean;
  notas: string | null;
  t: T;
  textos: TextosModelo;
};

export async function gerarPdfAporte(p: ParamsPdfAporte) {
  const { t } = p;
  const colsClasse = [
    { titulo: t("colClasse"), flex: 2.2 },
    { titulo: t("colNesteAporte"), flex: 1.6, direita: true },
    { titulo: t("colHoje"), flex: 1.2, direita: true },
    ...(p.executado ? [] : [{ titulo: t("colDepois"), flex: 1.4, direita: true }]),
    ...(p.temAlvo ? [{ titulo: t("colAlvo"), flex: 1, direita: true }] : []),
  ];
  return gerarPdfAtreides(
    <DocumentoAtreides
      textos={p.textos}
      tituloDoc={t("tituloDoc", { nome: p.nome, periodo: p.periodo })}
      capa={{ sobre: t("capaSobre"), titulo: p.nome, contexto: p.periodo }}
      cabecalho={t("cabecalho", { nome: p.nome, periodo: p.periodo })}
      consultor={p.consultor}
      data={p.emitidoEm}
      aviso={t("aviso")}
    >
      <NumerosChave itens={p.numeros.map((n, i) => ({ ...n, destaque: i === 0 }))} />

      <SecaoTabela
        sobre={t("comprasSobre")}
        titulo={t("compras")}
        colunas={[
          { titulo: t("colAtivo"), flex: 2.6 },
          { titulo: t("colClasse"), flex: 1.7 },
          { titulo: t("colQuantidade"), flex: 1, direita: true },
          { titulo: t("colPreco"), flex: 1.3, direita: true },
          { titulo: t("colValor"), flex: 1.4, direita: true },
          { titulo: t("colPct"), flex: 0.8, direita: true },
        ]}
        linhas={p.compras.map((c) => [{ texto: c.ticker, forte: true, detalhe: c.nome }, { texto: c.classe, suave: true }, c.quantidade, c.preco, { texto: c.valor, forte: true }, { texto: c.pct, suave: true }])}
        total={[t("total"), "", "", "", p.total, "100%"]}
        nota={t(p.executado ? "notaPrecoExecutado" : "notaPreco")}
      />

      {p.classes.length ? (
        <Secao sobre={t("classesSobre")} titulo={t("classes")} inteira>
          <Tabela
            colunas={colsClasse}
            linhas={p.classes.map((c) => {
              const l: Celula[] = [c.classe, { texto: c.aporte, forte: true }, { texto: c.hoje, suave: true }];
              if (!p.executado) l.push({ texto: c.depois ?? "—", forte: true });
              if (p.temAlvo) l.push({ texto: c.alvo, suave: true });
              return l;
            })}
          />
          <Nota>{t(p.executado ? "notaClassesExecutado" : "notaClasses")}</Nota>
        </Secao>
      ) : null}

      {p.notas ? (
        <Secao sobre={t("notasSobre")} titulo={t("notas")} inteira>
          <Comentario texto={p.notas} />
        </Secao>
      ) : null}
    </DocumentoAtreides>,
  );
}
