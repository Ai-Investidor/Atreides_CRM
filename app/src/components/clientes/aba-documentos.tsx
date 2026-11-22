"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed, ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Select, SelectItem } from "@/components/ui/form";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { excluirDocumento, linkDocumento, registrarDocumento } from "@/lib/clientes/acoes";
import type { FichaCliente } from "@/lib/clientes/consultas";
import { CATEGORIAS, TAMANHO_MAX_DOC, TIPOS_DOC, type CategoriaDoc } from "@/lib/clientes/regras";
import { formatarData } from "@/lib/formatos";

type Props = { ficha: FichaCliente; obrigatorios: CategoriaDoc[]; admin: boolean; somenteLeitura?: boolean };

function tamanhoLegivel(b: number) {
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/** Aba Documentos: checklist dos obrigatórios, envio e lista (armazenamento privado). */
export function AbaDocumentos({ ficha, obrigatorios, admin, somenteLeitura }: Props) {
  const t = useTranslations("clientes.documentos");
  const locale = useLocale();
  const router = useRouter();
  const arquivo = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<CategoriaDoc>(obrigatorios.find((c) => !ficha.documentos.some((d) => d.category === c)) ?? "other");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const { cliente, documentos } = ficha;
  const temCategoria = (c: CategoriaDoc) => documentos.some((d) => d.category === c);

  async function enviar(f: File) {
    setErro(null);
    if (f.size > TAMANHO_MAX_DOC) return setErro("arquivoGrande");
    if (!TIPOS_DOC.includes(f.type)) return setErro("arquivoTipo");
    setEnviando(true);
    const nomeSeguro = f.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-120);
    const caminho = `${cliente.workspace_id}/${cliente.id}/${crypto.randomUUID()}-${nomeSeguro}`;
    const { error } = await createClient().storage.from("client-documents").upload(caminho, f, { contentType: f.type, upsert: false });
    if (error) {
      setEnviando(false);
      return setErro("envio");
    }
    const r = await registrarDocumento({ clienteId: cliente.id, categoria, nome: f.name, caminho, tamanho: f.size, tipo: f.type });
    setEnviando(false);
    if (!r.ok) return setErro(r.mensagem ?? "salvar");
    if (arquivo.current) arquivo.current.value = "";
    router.refresh();
  }

  function abrir(id: string) {
    // Abre a aba antes da resposta para o navegador não bloquear a janela.
    const janela = window.open("", "_blank");
    iniciar(async () => {
      const r = await linkDocumento(id);
      if (r.ok && r.dados && janela) janela.location.href = r.dados;
      else {
        janela?.close();
        setErro(r.ok ? "salvar" : (r.mensagem ?? "salvar"));
      }
    });
  }

  function excluir(id: string) {
    if (!window.confirm(t("excluirConfirma"))) return;
    iniciar(async () => {
      const r = await excluirDocumento(id);
      if (!r.ok) return setErro(r.mensagem ?? "salvar");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t("obrigatorios")}</CardTitle>
              <CardDescription>{t("obrigatoriosDescricao", { feitos: obrigatorios.filter(temCategoria).length, total: obrigatorios.length })}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5">
              {obrigatorios.map((c) => {
                const ok = temCategoria(c);
                return (
                  <li key={c} className="flex items-center gap-2.5 text-sm">
                    {ok ? <CheckCircle2 className="size-4 text-ok" aria-hidden="true" /> : <CircleDashed className="size-4 text-texto-3" aria-hidden="true" />}
                    <span className={ok ? "text-texto" : "text-texto-2"}>{t(`categorias.${c}`)}</span>
                    <span className="sr-only">{ok ? t("recebido") : t("pendente")}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {!somenteLeitura ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>{t("enviar")}</CardTitle>
                <CardDescription>{t("enviarDescricao")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {erro ? <Alert tom="erro">{t(`erros.${erro}`)}</Alert> : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field rotulo={t("categoria")} className="sm:w-64">
                  {(p) => (
                    <Select {...p} value={categoria} onValueChange={(v) => setCategoria(v as CategoriaDoc)}>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`categorias.${c}`)}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </Field>
                <input
                  ref={arquivo}
                  type="file"
                  accept={TIPOS_DOC.join(",")}
                  className="sr-only"
                  id="arquivo-cliente"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void enviar(f);
                  }}
                />
                <Button type="button" carregando={enviando} onClick={() => arquivo.current?.click()}>
                  <Upload />
                  {t("escolherArquivo")}
                </Button>
              </div>
              <p className="text-xs text-texto-3">{t("formatos")}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t("arquivos", { total: documentos.length })}</CardTitle>
        </CardHeader>
        {documentos.length === 0 ? (
          <CardContent>
            <EmptyState compacto Icone={FileText} titulo={t("vazioTitulo")} descricao={t("vazioDescricao")} />
          </CardContent>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{t("arquivo")}</TH>
                <TH className="hidden sm:table-cell">{t("categoria")}</TH>
                <TH className="hidden md:table-cell">{t("enviadoEm")}</TH>
                <TH className="text-right">
                  <span className="sr-only">{t("acoes")}</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {documentos.map((d) => (
                <TR key={d.id}>
                  <TD>
                    <p className="max-w-xs truncate font-medium">{d.file_name}</p>
                    <p className="text-xs text-texto-3">
                      {tamanhoLegivel(d.size_bytes)}
                      {d.autor?.full_name ? ` · ${d.autor.full_name}` : ""}
                    </p>
                  </TD>
                  <TD className="hidden text-texto-2 sm:table-cell">{t(`categorias.${d.category}`)}</TD>
                  <TD className="numero hidden text-texto-2 md:table-cell">{formatarData(d.created_at.slice(0, 10), locale)}</TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button variant="secondary" size="sm" onClick={() => abrir(d.id)}>
                        <ExternalLink />
                        <span className="hidden sm:inline">{t("abrir")}</span>
                      </Button>
                      {admin && !somenteLeitura ? (
                        <Button variant="ghost" size="icon-sm" aria-label={t("excluir", { nome: d.file_name })} onClick={() => excluir(d.id)}>
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
