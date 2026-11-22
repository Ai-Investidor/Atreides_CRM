"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, FileText, PenLine, RefreshCw, ShieldCheck, ShieldPlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, SelectItem, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { createClient } from "@/lib/supabase/client";
import { linkDocumento, registrarDocumento, registrarPerfil, type ResultadoCliente } from "@/lib/clientes/acoes";
import type { FichaCliente } from "@/lib/clientes/consultas";
import { CORRETORAS, PERFIS, TAMANHO_MAX_DOC, TIPOS_DOC, type Perfil } from "@/lib/clientes/regras";
import { formatarDataHora } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { EtiquetaPerfil } from "./etiquetas";

/**
 * Aba Perfil: perfil de investidor definido pela corretora (Documentação/03).
 * O Atreides não diagnostica o perfil; só registra para usar no planejamento.
 */
export function AbaPerfil({ ficha, podeEditar }: { ficha: FichaCliente; podeEditar: boolean }) {
  const t = useTranslations("clientes.perfil");
  const te = useTranslations("clientes");
  const locale = useLocale();
  const [aberto, setAberto] = useState(false);
  const [erroLink, setErroLink] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const { cliente, perfil } = ficha;

  function abrirComprovante(id: string) {
    // Abre a aba antes da resposta para o navegador não bloquear a janela.
    const janela = window.open("", "_blank");
    iniciar(async () => {
      const r = await linkDocumento(id);
      if (r.ok && r.dados && janela) janela.location.href = r.dados;
      else {
        janela?.close();
        setErroLink(r.ok ? "salvar" : (r.mensagem ?? "salvar"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("atual")}</CardTitle>
          <CardDescription>{t("descricao")}</CardDescription>
        </div>
        {podeEditar ? (
          <Button onClick={() => setAberto(true)} variant={cliente.investor_profile ? "secondary" : "primary"}>
            {cliente.investor_profile ? <PenLine /> : <ShieldPlus />}
            {cliente.investor_profile ? t("atualizar") : t("registrar")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {erroLink ? <Alert tom="erro">{te(`erros.${erroLink}`)}</Alert> : null}
        {!cliente.investor_profile ? (
          <EmptyState compacto Icone={ShieldCheck} titulo={t("semTitulo")} descricao={t("semDescricao")} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <EtiquetaPerfil cliente={cliente} />
              <span className="text-sm text-texto-2">{cliente.profile_broker}</span>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-texto-3">{t("registradoEm")}</dt>
                <dd className="numero">{cliente.profile_recorded_at ? formatarDataHora(cliente.profile_recorded_at, locale) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-3">{t("registradoPor")}</dt>
                <dd>{perfil.registradoPor ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-3">{t("comprovante")}</dt>
                <dd>
                  {perfil.comprovante ? (
                    <button type="button" className="inline-flex items-center gap-1 text-marinho underline-offset-2 hover:underline" onClick={() => abrirComprovante(perfil.comprovante!.id)}>
                      {t("abrirComprovante")}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="text-texto-3">{t("semComprovante")}</span>
                  )}
                </dd>
              </div>
            </dl>
            {cliente.profile_note ? (
              <div className="text-sm">
                <p className="text-xs text-texto-3">{t("observacao")}</p>
                <p className="whitespace-pre-line text-texto">{cliente.profile_note}</p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
      {podeEditar ? <FormPerfil ficha={ficha} aberto={aberto} aoMudar={setAberto} /> : null}
    </Card>
  );
}

function FormPerfil({ ficha, aberto, aoMudar }: { ficha: FichaCliente; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const t = useTranslations("clientes.perfil");
  const te = useTranslations("clientes");
  const router = useRouter();
  const { cliente, perfil } = ficha;
  const [valor, setValor] = useState<Perfil | "">(cliente.investor_profile ?? "");
  const [corretora, setCorretora] = useState(cliente.profile_broker ?? "");
  const [observacao, setObservacao] = useState(cliente.profile_note ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoCliente | null>(null);
  const [pendente, iniciar] = useTransition();
  const erro = (c: string) => (resultado && !resultado.ok && resultado.erros?.[c] ? te(`erros.${resultado.erros[c]}`) : undefined);

  function salvar() {
    setResultado(null);
    if (arquivo && arquivo.size > TAMANHO_MAX_DOC) return setResultado({ ok: false, mensagem: "arquivoGrande" });
    if (arquivo && !TIPOS_DOC.includes(arquivo.type)) return setResultado({ ok: false, mensagem: "arquivoTipo" });
    iniciar(async () => {
      let documentoId: string | undefined;
      if (arquivo) {
        const nomeSeguro = arquivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-120);
        const caminho = `${cliente.workspace_id}/${cliente.id}/${crypto.randomUUID()}-${nomeSeguro}`;
        const { error } = await createClient().storage.from("client-documents").upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
        if (error) return setResultado({ ok: false, mensagem: "envio" });
        const doc = await registrarDocumento({ clienteId: cliente.id, categoria: "broker_profile", nome: arquivo.name, caminho, tamanho: arquivo.size, tipo: arquivo.type });
        if (!doc.ok || !doc.id) return setResultado(doc.ok ? { ok: false, mensagem: "salvar" } : doc);
        documentoId = doc.id;
      }
      const r = await registrarPerfil(cliente.id, { investor_profile: valor || undefined, profile_broker: corretora, profile_note: observacao }, documentoId);
      setResultado(r);
      if (r.ok) {
        setArquivo(null);
        aoMudar(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent titulo={t("dialogoTitulo")} descricao={t("dialogoDescricao")}>
        <form
          className="flex flex-col gap-4 px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{te(`erros.${resultado.mensagem}`)}</Alert> : null}
          <Field rotulo={t("campoPerfil")} obrigatorio erro={erro("investor_profile")} dica={t("escala")}>
            {(p) => (
              <Select {...p} value={valor || undefined} onValueChange={(v) => setValor(v as Perfil)} placeholder={t("escolher")}>
                {PERFIS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`perfis.${v}`)}
                  </SelectItem>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo={t("corretora")} obrigatorio erro={erro("profile_broker")} dica={t("corretoraDica")}>
            {(p) => (
              <>
                <Input {...p} list="corretoras-sugeridas" autoComplete="off" maxLength={80} value={corretora} onChange={(e) => setCorretora(e.target.value)} />
                <datalist id="corretoras-sugeridas">
                  {CORRETORAS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field rotulo={t("observacao")} erro={erro("profile_note")} dica={t("observacaoDica")}>
            {(p) => <Textarea {...p} className="min-h-20" maxLength={1000} value={observacao} onChange={(e) => setObservacao(e.target.value)} />}
          </Field>
          <CampoComprovante arquivo={arquivo} atual={perfil.comprovante?.file_name ?? null} aoEscolher={setArquivo} />
          <div className="flex justify-end gap-2 border-t border-divisoria pt-4">
            <Button type="button" variant="ghost" onClick={() => aoMudar(false)}>
              {t("cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function tamanhoLegivel(b: number) {
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Comprovante do perfil: área para arrastar ou escolher o arquivo, com nome, tamanho e ações.
 * Tamanho e formato são conferidos na escolha; o envio acontece ao salvar o perfil.
 */
function CampoComprovante({ arquivo, atual, aoEscolher }: { arquivo: File | null; atual: string | null; aoEscolher: (f: File | null) => void }) {
  const t = useTranslations("clientes.perfil");
  const te = useTranslations("clientes.erros");
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function escolher(f: File | undefined) {
    if (entrada.current) entrada.current.value = "";
    if (!f) return;
    if (f.size > TAMANHO_MAX_DOC) return setErro("arquivoGrande");
    if (!TIPOS_DOC.includes(f.type)) return setErro("arquivoTipo");
    setErro(null);
    aoEscolher(f);
  }
  const abrirSeletor = () => entrada.current?.click();

  const cartao = (nome: string, detalhe: string, acoes: React.ReactNode, destaque: boolean) => (
    <div className={cn("flex items-center gap-3 rounded-marca border px-3 py-2.5", destaque ? "border-marinho/30 bg-marinho/5" : "border-borda bg-superficie")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-marca bg-marinho/10 text-marinho">
        <FileText className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-texto" title={nome}>
          {nome}
        </p>
        <p className="text-xs text-texto-3">{detalhe}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">{acoes}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-texto" id={`${id}-rotulo`}>
        {t("comprovante")} <span className="font-normal text-texto-3">· {t("opcional")}</span>
      </span>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept={TIPOS_DOC.join(",")}
        className="sr-only"
        aria-labelledby={`${id}-rotulo`}
        onChange={(e) => escolher(e.target.files?.[0])}
      />

      {arquivo ? (
        cartao(
          arquivo.name,
          `${tamanhoLegivel(arquivo.size)} · ${t("enviadoAoSalvar")}`,
          <>
            <Button type="button" size="sm" variant="ghost" onClick={abrirSeletor}>
              <RefreshCw />
              {t("trocar")}
            </Button>
            <Button type="button" size="sm" variant="ghost" aria-label={t("remover")} onClick={() => aoEscolher(null)}>
              <X />
            </Button>
          </>,
          true,
        )
      ) : atual ? (
        cartao(
          atual,
          t("arquivoAtual"),
          <Button type="button" size="sm" variant="secondary" onClick={abrirSeletor}>
            <Upload />
            {t("substituir")}
          </Button>,
          false,
        )
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            escolher(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-marca border border-dashed px-4 py-5 text-center transition-colors",
            arrastando ? "border-marinho bg-marinho/5" : "border-borda bg-superficie-2/50",
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-marinho/10 text-marinho">
            <Upload className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm text-texto-2">{t("arraste")}</p>
          <Button type="button" size="sm" variant="secondary" onClick={abrirSeletor}>
            {t("escolherArquivo")}
          </Button>
        </div>
      )}

      {erro ? (
        <p className="text-xs font-medium text-erro" role="alert">
          {te(erro)}
        </p>
      ) : (
        <p className="text-xs text-texto-3">{t("formatos")}</p>
      )}
    </div>
  );
}
