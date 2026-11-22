"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, FileUp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { importarLancamentos, type LinhaLancamento } from "@/lib/carteira/acoes";
import { CLASSES, type ClasseAtivo } from "@/lib/carteira/regras";

type Linha = LinhaLancamento & { erros: string[] };

const MODELO =
  "data;ticker;nome;classe;tipo;quantidade;preco;valor;instituicao\n" +
  "15/10/2026;PETR4;;Ações Brasil;compra;100;38,50;;XP\n" +
  "15/10/2026;HGLG11;;Fundos Imobiliários;compra;10;160,00;;XP\n" +
  "01/10/2026;;CDB Banco X 110% CDI;Pós-fixado / Caixa;aplicação;;;10000,00;Rico\n";

const sem = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const COL: Record<string, keyof LinhaLancamento> = { data: "data", ticker: "ticker", codigo: "ticker", ativo: "nome", nome: "nome", classe: "classe", tipo: "tipo", quantidade: "quantidade", qtd: "quantidade", preco: "preco", "preco medio": "preco", valor: "valor", total: "valor", instituicao: "instituicao", corretora: "instituicao" };
const TIPOS: Record<string, LinhaLancamento["tipo"]> = { compra: "buy", c: "buy", buy: "buy", venda: "sell", v: "sell", sell: "sell", aplicacao: "deposit", aporte: "deposit", deposito: "deposit", deposit: "deposit", resgate: "withdrawal", retirada: "withdrawal", withdrawal: "withdrawal" };
const CLASSE_TXT: Record<string, ClasseAtivo> = {
  "pos-fixado / caixa": "cash", "pos-fixado": "cash", caixa: "cash", inflacao: "inflation", prefixado: "prefixed", multimercado: "multimarket",
  "acoes brasil": "br_equities", acoes: "br_equities", "fundos imobiliarios": "reits", fii: "reits", fiis: "reits",
  "internacional / bdr's": "international", internacional: "international", bdr: "international", "alternativos / cripto": "alternatives", cripto: "alternatives", alternativos: "alternatives", previdencia: "pension",
};
const n = (v: string) => (v.trim() ? Number(v.replace(/\./g, "").replace(",", ".")) : null);
function dataIso(v: string) {
  const s = v.trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}
function csv(texto: string) {
  const limpo = texto.replace(/^﻿/, "");
  const sep = (limpo.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) >= 1 ? ";" : ",";
  return limpo.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim()));
}

/** Importa lançamentos da carteira (modelo do Atreides), com prévia e erros linha a linha. */
export function ImportarLancamentos({ clienteId, aoFechar }: { clienteId: string; aoFechar: () => void }) {
  const t = useTranslations("carteira.importar");
  const tc = useTranslations("carteira.classes");
  const te = useTranslations("carteira.erros");
  const router = useRouter();
  const arquivo = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erroArq, setErroArq] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ criados: number; falhas: { linha: number; erro: string }[] } | null>(null);
  const [pendente, iniciar] = useTransition();
  const validas = (linhas ?? []).filter((l) => !l.erros.length);

  async function ler(f: File) {
    setErroArq(null);
    setResultado(null);
    const tab = csv(await f.text());
    const cab = (tab[0] ?? []).map((c) => COL[sem(c)]);
    if (tab.length < 2 || !cab.includes("data") || !cab.includes("tipo")) return setErroArq("colunas");
    setLinhas(
      tab.slice(1, 1001).map((cols, i) => {
        const o: Record<string, string> = {};
        cab.forEach((k, j) => k && (o[k] = cols[j] ?? ""));
        const ticker = (o.ticker ?? "").toUpperCase().replace(/\.SA$/, "");
        const l: Linha = {
          linha: i + 2,
          data: dataIso(o.data ?? ""),
          ticker,
          nome: o.nome ?? "",
          classe: CLASSE_TXT[sem(o.classe ?? "")] ?? (CLASSES.includes(o.classe as ClasseAtivo) ? (o.classe as ClasseAtivo) : ticker ? (ticker.endsWith("11") ? "reits" : /3[459]$/.test(ticker) ? "international" : "br_equities") : "cash"),
          tipo: TIPOS[sem(o.tipo ?? "")] ?? ("" as LinhaLancamento["tipo"]),
          quantidade: n(o.quantidade ?? ""),
          preco: n(o.preco ?? ""),
          valor: n(o.valor ?? ""),
          instituicao: o.instituicao ?? "",
          erros: [],
        };
        if (!l.data) l.erros.push("data");
        if (!l.tipo) l.erros.push("tipo");
        if (!l.ticker && l.nome.length < 2) l.erros.push("ativo");
        if (l.ticker && !/^[A-Z0-9]{4,12}$/.test(l.ticker)) l.erros.push("ticker");
        const negociacao = l.tipo === "buy" || l.tipo === "sell";
        if (negociacao && !(l.quantidade && l.quantidade > 0 && l.preco !== null && l.preco >= 0)) l.erros.push("quantidadePreco");
        if (!negociacao && l.tipo && !(l.valor && l.valor > 0)) l.erros.push("valor");
        return l;
      }),
    );
  }

  function importar() {
    iniciar(async () => {
      const r = await importarLancamentos(clienteId, validas.map(({ erros: _e, ...l }) => (void _e, l)));
      setResultado({ criados: r.criados, falhas: r.falhas });
      setLinhas(null);
      router.refresh();
    });
  }

  function modelo() {
    const url = URL.createObjectURL(new Blob([`﻿${MODELO}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-lancamentos-carteira.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent posicao="lateral" titulo={t("titulo")} descricao={t("descricao")} className="max-w-3xl">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <p className="text-sm text-texto-2">{t("colunas")}</p>
          <div className="flex flex-wrap gap-2">
            <input ref={arquivo} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => (e.target.files?.[0] && void ler(e.target.files[0]), (e.target.value = ""))} />
            <Button onClick={() => arquivo.current?.click()}>
              <FileUp />
              {t("escolher")}
            </Button>
            <Button variant="ghost" onClick={modelo}>
              <Download />
              {t("modelo")}
            </Button>
          </div>
          {erroArq ? <Alert tom="erro">{t(`errosArquivo.${erroArq}`)}</Alert> : null}
          {resultado ? (
            <Alert tom={resultado.falhas.length ? "atencao" : "ok"} titulo={t("concluido", { criados: resultado.criados })}>
              {resultado.falhas.length ? (
                <ul className="list-disc pl-4">
                  {resultado.falhas.map((f) => (
                    <li key={f.linha}>{t("falha", { linha: f.linha, erro: te.has(f.erro) ? te(f.erro) : f.erro })}</li>
                  ))}
                </ul>
              ) : null}
            </Alert>
          ) : null}
          {linhas ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-texto-2">{t("resumo", { validas: validas.length, total: linhas.length })}</p>
                <Button carregando={pendente} disabled={!validas.length} onClick={importar}>
                  {t("importar", { total: validas.length })}
                </Button>
              </div>
              <div className="overflow-hidden rounded-card border border-borda">
                <Table>
                  <THead>
                    <tr>
                      <TH className="w-14">{t("linha")}</TH>
                      <TH>{t("ativo")}</TH>
                      <TH className="hidden sm:table-cell">{t("lancamento")}</TH>
                      <TH>{t("situacao")}</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {linhas.map((l) => (
                      <TR key={l.linha}>
                        <TD className="numero text-texto-3">{l.linha}</TD>
                        <TD>
                          <p className="font-medium">{l.ticker || l.nome || "—"}</p>
                          <p className="text-xs text-texto-3">{tc(l.classe)}</p>
                        </TD>
                        <TD className="numero hidden text-xs text-texto-2 sm:table-cell">
                          {l.data} · {l.tipo ? t(`tipos.${l.tipo}`) : "—"} · {l.quantidade ?? ""} {l.preco !== null ? `× ${l.preco}` : ""} {l.valor !== null ? `= ${l.valor}` : ""}
                        </TD>
                        <TD>
                          {l.erros.length ? (
                            <div className="flex flex-wrap gap-1">
                              {l.erros.map((e) => (
                                <Badge key={e} tom="erro">
                                  <TriangleAlert className="size-3" aria-hidden="true" />
                                  {t(`erros.${e}`)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge tom="ok">
                              <CheckCircle2 className="size-3" aria-hidden="true" />
                              {t("pronta")}
                            </Badge>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
