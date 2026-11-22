"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MailQuestion, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cancelarConvite } from "@/lib/equipe/acoes";
import type { Convite, Membro } from "@/lib/equipe/regras";
import { dataDoInstante, formatarData } from "@/lib/formatos";
import { BotoesConvite } from "./mensagem-convite";

/** Membros da equipe: nome, papel, situação e data de entrada. */
export function ListaMembros({ membros, euId }: { membros: Membro[]; euId: string }) {
  const t = useTranslations("equipe");
  const tu = useTranslations("usuario.papel");
  const locale = useLocale();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>{t("membros.titulo")}</CardTitle>
          <CardDescription>{t("membros.descricao", { total: membros.length })}</CardDescription>
        </div>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <TH>{t("membros.pessoa")}</TH>
            <TH>{t("membros.papel")}</TH>
            <TH className="hidden sm:table-cell">{t("membros.situacao")}</TH>
            <TH className="hidden md:table-cell">{t("membros.desde")}</TH>
          </tr>
        </THead>
        <TBody>
          {membros.map((m) => (
            <TR key={m.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <Avatar nome={m.full_name || m.email} tamanho="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {m.full_name}
                      {m.id === euId ? <span className="ml-1.5 text-xs font-normal text-texto-3">{t("membros.voce")}</span> : null}
                    </p>
                    <p className="truncate text-xs text-texto-3">{m.email}</p>
                  </div>
                </div>
              </TD>
              <TD>
                <Badge tom={m.role === "admin" ? "escuro" : "neutro"}>{tu(m.role)}</Badge>
              </TD>
              <TD className="hidden sm:table-cell">
                <Badge tom={m.active ? "ok" : "neutro"} ponto>
                  {m.active ? t("membros.ativo") : t("membros.inativo")}
                </Badge>
              </TD>
              <TD className="numero hidden text-texto-2 md:table-cell">{formatarData(dataDoInstante(m.created_at), locale)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

/** Convites enviados que ainda não viraram login: reenviar a mensagem ou cancelar. */
export function ListaConvites({ pendentes }: { pendentes: Convite[] }) {
  const t = useTranslations("equipe");
  const locale = useLocale();
  const [cancelando, setCancelando] = useState<Convite | null>(null);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>{t("pendentes.titulo")}</CardTitle>
          <CardDescription>{t("pendentes.descricao")}</CardDescription>
        </div>
      </CardHeader>
      {pendentes.length === 0 ? (
        <EmptyState compacto Icone={MailQuestion} titulo={t("pendentes.vazioTitulo")} descricao={t("pendentes.vazioDescricao")} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t("membros.pessoa")}</TH>
              <TH className="hidden md:table-cell">{t("pendentes.enviadoEm")}</TH>
              <TH className="text-right">
                <span className="sr-only">{t("pendentes.acoes")}</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {pendentes.map((c) => (
              <TR key={c.email}>
                <TD className="max-w-0 sm:max-w-none">
                  <p className="truncate font-medium">{c.full_name ?? c.email}</p>
                  <p className="truncate text-xs text-texto-3">{c.email}</p>
                </TD>
                <TD className="numero hidden text-texto-2 md:table-cell">{formatarData(dataDoInstante(c.created_at), locale)}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <BotoesConvite nome={c.full_name} email={c.email} compacto />
                    <Button size="sm" variant="ghost" className="text-erro hover:text-erro" onClick={() => setCancelando(c)}>
                      <X />
                      <span className="sr-only sm:not-sr-only">{t("acoes.cancelarConvite")}</span>
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <ConfirmarCancelamento convite={cancelando} aoFechar={() => setCancelando(null)} />
    </Card>
  );
}

function ConfirmarCancelamento({ convite, aoFechar }: { convite: Convite | null; aoFechar: () => void }) {
  const t = useTranslations("equipe");
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [falhou, setFalhou] = useState(false);

  function confirmar() {
    if (!convite) return;
    iniciar(async () => {
      const r = await cancelarConvite(convite.email);
      if (!r.ok) return setFalhou(true);
      setFalhou(false);
      aoFechar();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={!!convite}
      onOpenChange={(v) => {
        if (!v) {
          setFalhou(false);
          aoFechar();
        }
      }}
    >
      <DialogContent titulo={t("cancelar.titulo")} descricao={t("cancelar.descricao", { email: convite?.email ?? "" })}>
        {falhou ? (
          <div className="px-5 pt-4">
            <Alert tom="erro">{t("erros.salvar")}</Alert>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 px-5 py-4">
          <Button variant="ghost" onClick={aoFechar}>
            {t("acoes.manter")}
          </Button>
          <Button variant="danger" carregando={pendente} onClick={confirmar}>
            {t("acoes.cancelarConvite")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
