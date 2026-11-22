"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCheck, Download, FilePlus2, Mail, MessageCircle, Save, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/form";
import { aprovarRelatorio, excluirRascunho, linkPdf, marcarEnviado, novaVersao, salvarComentario } from "@/lib/relatorios/acoes";
import { formatarData, formatarDataHora, linkWhatsApp } from "@/lib/formatos";

type Props = {
  id: string;
  status: "draft" | "approved" | "superseded";
  comentario: string;
  cliente: { id: string; nome: string; telefone: string | null; email: string | null };
  periodo: { inicio: string; fim: string };
  aprovadoEm: string | null;
  aprovadoPor: string | null;
  enviadoEm: string | null;
  canais: string[];
  bloqueado: boolean;
};

/** Comentário, aprovação, PDF e envio do relatório (Documentação/08). */
export function EditorRelatorio(p: Props) {
  const t = useTranslations("relatorios.editor");
  const locale = useLocale();
  const router = useRouter();
  const [texto, setTexto] = useState(p.comentario);
  const [salvo, setSalvo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [canais, setCanais] = useState<("whatsapp" | "email")[]>([]);
  const [pendente, iniciar] = useTransition();
  const periodo = `${formatarData(p.periodo.inicio, locale)} – ${formatarData(p.periodo.fim, locale)}`;
  const primeiroNome = p.cliente.nome.split(" ")[0];
  const mensagem = t("mensagem", { nome: primeiroNome, periodo });

  function executar(fn: () => Promise<{ ok: boolean; mensagem?: string; id?: string; dados?: string }>, depois?: (r: { id?: string; dados?: string }) => void) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setErro(("mensagem" in r && r.mensagem) || "salvar");
      if (depois) depois(r);
      else router.refresh();
    });
  }

  function baixar() {
    const janela = window.open("", "_blank");
    executar(() => linkPdf(p.id), (r) => {
      if (r.dados && janela) janela.location.href = r.dados;
      else janela?.close();
    });
  }

  if (p.status === "draft") {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("comentarioTitulo")}</CardTitle>
            <CardDescription>{t("comentarioDescricao")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {erro ? <Alert tom="erro">{t(`erros.${erro}`)}</Alert> : null}
          <Textarea
            className="min-h-48"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setSalvo(false);
            }}
            placeholder={t("comentarioPlaceholder")}
            aria-label={t("comentarioTitulo")}
            maxLength={10000}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" className="text-erro hover:text-erro" disabled={pendente} onClick={() => window.confirm(t("excluirConfirma")) && executar(() => excluirRascunho(p.id), () => router.push(`/clientes/${p.cliente.id}?aba=relatorios`))}>
              <Trash2 />
              {t("excluir")}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled={salvo || pendente} onClick={() => executar(() => salvarComentario(p.id, texto), () => (setSalvo(true), router.refresh()))}>
                <Save />
                {salvo ? t("salvo") : t("salvar")}
              </Button>
              <Button carregando={pendente} disabled={!texto.trim() || p.bloqueado} onClick={() => window.confirm(t("aprovarConfirma")) && executar(() => aprovarRelatorio(p.id, texto))}>
                <ShieldCheck />
                {t("aprovar")}
              </Button>
            </div>
          </div>
          <p className="text-xs text-texto-3">{p.bloqueado ? t("bloqueado") : t("aprovarDica")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("comentarioTitulo")}</CardTitle>
            <CardDescription>{p.aprovadoEm ? t("aprovadoPor", { nome: p.aprovadoPor ?? "—", data: formatarDataHora(p.aprovadoEm, locale) }) : null}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line rounded-card border-l-2 border-latao bg-superficie-2 p-4 text-sm leading-relaxed text-texto">{p.comentario}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("envioTitulo")}</CardTitle>
            <CardDescription>{p.enviadoEm ? t("enviadoEm", { data: formatarDataHora(p.enviadoEm, locale), canais: p.canais.map((c) => t(`canais.${c}`)).join(" + ") }) : t("envioDescricao")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {erro ? <Alert tom="erro">{t(`erros.${erro}`)}</Alert> : null}
          {p.status === "superseded" ? <Alert tom="info">{t("substituido")}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={baixar} disabled={pendente}>
              <Download />
              {t("baixar")}
            </Button>
            {p.cliente.telefone ? (
              <Button asChild variant="secondary">
                <a href={`${linkWhatsApp(p.cliente.telefone)}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle />
                  WhatsApp
                </a>
              </Button>
            ) : null}
            {p.cliente.email ? (
              <Button asChild variant="secondary">
                <a href={`mailto:${p.cliente.email}?subject=${encodeURIComponent(t("assunto", { periodo }))}&body=${encodeURIComponent(mensagem)}`}>
                  <Mail />
                  {t("email")}
                </a>
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-texto-3">{t("anexarDica")}</p>
          {p.status === "approved" && !p.enviadoEm ? (
            <div className="flex flex-wrap items-center gap-4 rounded-marca border border-borda bg-superficie-2 p-3">
              {(["whatsapp", "email"] as const).map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--color-marinho)]" checked={canais.includes(c)} onChange={(e) => setCanais((x) => (e.target.checked ? [...x, c] : x.filter((y) => y !== c)))} />
                  {t(`canais.${c}`)}
                </label>
              ))}
              <Button size="sm" className="ml-auto" disabled={!canais.length} carregando={pendente} onClick={() => executar(() => marcarEnviado(p.id, canais))}>
                <CheckCheck />
                {t("marcarEnviado")}
              </Button>
            </div>
          ) : null}
          {p.status === "approved" ? (
            <Button variant="ghost" className="self-start" disabled={pendente} onClick={() => window.confirm(t("novaVersaoConfirma")) && executar(() => novaVersao(p.id), (r) => router.push(`/relatorios/${r.id}`))}>
              <FilePlus2 />
              {t("novaVersao")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
