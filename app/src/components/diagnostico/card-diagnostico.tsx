"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Download, Eye, History, PenLine, Presentation, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { salvarDiagnostico, textoDaVersao, type ResultadoDiagnostico } from "@/lib/diagnostico/acoes";
import type { DadosDiagnosticoTela } from "@/lib/diagnostico/consultas";
import { MODELO_DIAGNOSTICO, type Alvo } from "@/lib/diagnostico/regras";
import { formatarDataHora, formatarMoeda } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { Apresentacao } from "@/components/documento/apresentacao";
import { EditorMarkdown } from "@/components/documento/editor-markdown";
import { Markdown } from "@/components/documento/markdown";

type Props = { alvo: Alvo; dados: DadosDiagnosticoTela | null; nome: string; podeEditar: boolean };

/** Diagnóstico do lead ou do cliente (Documentação/14): leitura, edição em markdown, apresentação e PDF. */
export function CardDiagnostico({ alvo, dados, nome, podeEditar }: Props) {
  const t = useTranslations("diagnostico");
  const locale = useLocale();
  const [editando, setEditando] = useState(false);
  const [apresentando, setApresentando] = useState(false);
  const [historico, setHistorico] = useState(false);
  const d = dados?.diagnostico ?? null;
  const temTexto = !!d && d.content_md.trim() !== "";

  if (editando) return <Editor alvo={alvo} dados={dados} aoFechar={() => setEditando(false)} />;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{alvo.tipo === "lead" ? t("descricaoLead") : t("descricao")}</CardDescription>
        </div>
        {d ? (
          <div className="flex flex-wrap gap-2">
            {temTexto ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setApresentando(true)}>
                  <Presentation />
                  {t("apresentar")}
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <a href={`/api/diagnostico/${d.id}/pdf`}>
                    <Download />
                    {t("baixarPdf")}
                  </a>
                </Button>
              </>
            ) : null}
            {dados!.versoes.length ? (
              <Button variant="ghost" size="sm" onClick={() => setHistorico(true)}>
                <History />
                {t("historico")}
              </Button>
            ) : null}
            {podeEditar ? (
              <Button size="sm" onClick={() => setEditando(true)}>
                <PenLine />
                {t("editar")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {!d ? (
          <EmptyState
            compacto
            Icone={Stethoscope}
            titulo={t("vazioTitulo")}
            descricao={t("vazioDescricao")}
            acao={
              podeEditar ? (
                <Button onClick={() => setEditando(true)}>
                  <PenLine />
                  {t("escrever")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            <Numeros despesa={d.monthly_expense} idade={d.retirement_age} />
            {temTexto ? <Markdown texto={d.content_md} /> : <p className="text-sm text-texto-3">{t("semTexto")}</p>}
            <p className="text-xs text-texto-3">
              {t("versaoAtual", { versao: d.version, data: formatarDataHora(d.updated_at, locale), nome: d.autor?.full_name ?? "—" })}
            </p>
          </div>
        )}
      </CardContent>
      {apresentando && d ? (
        <Apresentacao sobre={t("apresentacao.sobre")} nome={nome} aoFechar={() => setApresentando(false)}>
          <Numeros despesa={d.monthly_expense} idade={d.retirement_age} grande />
          <Markdown texto={d.content_md} tamanho="apresentacao" />
        </Apresentacao>
      ) : null}
      {dados ? <Historico aberto={historico} aoMudar={setHistorico} versoes={dados.versoes} /> : null}
    </Card>
  );
}

function Numeros({ despesa, idade, grande }: { despesa: number | null; idade: number | null; grande?: boolean }) {
  const t = useTranslations("diagnostico");
  const locale = useLocale();
  if (despesa === null && idade === null) return null;
  const itens = [
    despesa !== null ? { r: t("despesa"), v: formatarMoeda(Number(despesa), locale, false) } : null,
    idade !== null ? { r: t("aposentadoria"), v: t("anos", { idade }) } : null,
  ].filter((i): i is { r: string; v: string } => i !== null);
  return (
    <dl className={cn("grid gap-3", grande ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
      {itens.map((i) => (
        <div key={i.r} className="rounded-marca border border-borda bg-superficie-2 px-3.5 py-3">
          <dt className={cn("text-texto-3", grande ? "text-sm" : "text-xs")}>{i.r}</dt>
          <dd className={cn("numero font-semibold text-texto", grande ? "mt-1 text-3xl" : "mt-0.5 text-lg")}>{i.v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------- Edição

const paraCampo = (n: number | null) => (n === null ? "" : String(Number(n).toFixed(2)).replace(".", ","));

function Editor({ alvo, dados, aoFechar }: { alvo: Alvo; dados: DadosDiagnosticoTela | null; aoFechar: () => void }) {
  const t = useTranslations("diagnostico");
  const router = useRouter();
  const d = dados?.diagnostico ?? null;
  const [texto, setTexto] = useState(d ? d.content_md : MODELO_DIAGNOSTICO);
  const [despesa, setDespesa] = useState(paraCampo(d?.monthly_expense ?? null));
  const [idade, setIdade] = useState(d?.retirement_age ? String(d.retirement_age) : "");
  const [resultado, setResultado] = useState<ResultadoDiagnostico | null>(null);
  const [pendente, iniciar] = useTransition();
  const erro = (c: string) => (resultado && !resultado.ok && resultado.erros?.[c] ? t(`erros.${resultado.erros[c]}`) : undefined);

  function salvar() {
    setResultado(null);
    iniciar(async () => {
      const r = await salvarDiagnostico(alvo, { content_md: texto, monthly_expense: despesa, retirement_age: idade });
      setResultado(r);
      if (r.ok) {
        aoFechar();
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{t("markdownDica")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}
          {erro("content_md") ? <Alert tom="erro">{erro("content_md")}</Alert> : null}
          <EditorMarkdown valor={texto} aoMudar={setTexto} modelo={MODELO_DIAGNOSTICO} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <Field rotulo={t("despesa")} erro={erro("monthly_expense")} dica={t("despesaDica")}>
              {(p) => <Input {...p} inputMode="decimal" placeholder="0,00" value={despesa} onChange={(e) => setDespesa(e.target.value.replace(/[^\d.,]/g, ""))} />}
            </Field>
            <Field rotulo={t("aposentadoria")} erro={erro("retirement_age")} dica={t("aposentadoriaDica")}>
              {(p) => <Input {...p} inputMode="numeric" maxLength={3} value={idade} onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))} />}
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-divisoria pt-4">
            <Button type="button" variant="ghost" onClick={aoFechar}>
              {t("cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("salvar")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- Histórico

function Historico({ aberto, aoMudar, versoes }: { aberto: boolean; aoMudar: (v: boolean) => void; versoes: DadosDiagnosticoTela["versoes"] }) {
  const t = useTranslations("diagnostico.versoes");
  const te = useTranslations("diagnostico.erros");
  const locale = useLocale();
  const [vista, setVista] = useState<{ versao: number; texto: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function ver(id: string, versao: number) {
    setErro(null);
    iniciar(async () => {
      const r = await textoDaVersao(id);
      if (r.ok) setVista({ versao, texto: r.dados ?? "" });
      else setErro(r.mensagem ?? "salvar");
    });
  }

  return (
    <>
      <Dialog open={aberto} onOpenChange={aoMudar}>
        <DialogContent titulo={t("titulo")} descricao={t("descricao")}>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-5 py-4">
            {erro ? <Alert tom="erro">{te(erro)}</Alert> : null}
            {!versoes.length ? <p className="text-sm text-texto-3">{t("vazio")}</p> : null}
            {versoes.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-marca border border-borda px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-texto">{t("versao", { versao: v.version })}</p>
                  <p className="text-xs text-texto-3">{t("salvaEm", { data: formatarDataHora(v.saved_at, locale), nome: v.autor?.full_name ?? "—" })}</p>
                </div>
                <Button type="button" variant="secondary" size="sm" carregando={pendente} onClick={() => ver(v.id, v.version)}>
                  <Eye />
                  {t("ver")}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!vista} onOpenChange={(v) => !v && setVista(null)}>
        <DialogContent titulo={vista ? t("versao", { versao: vista.versao }) : ""} className="max-w-3xl">
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{vista ? <Markdown texto={vista.texto} /> : null}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
