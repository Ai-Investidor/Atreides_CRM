"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { FichaCliente } from "@/lib/clientes/consultas";
import { formatarData, formatarDataHora } from "@/lib/formatos";
import { EtiquetaPerfil } from "./etiquetas";

/** Aba Perfil: questionário atual e histórico (nada se apaga, exigência regulatória). */
export function AbaPerfil({ ficha, podeAplicar }: { ficha: FichaCliente; podeAplicar: boolean }) {
  const t = useTranslations("clientes.perfil");
  const locale = useLocale();
  const { cliente, questionarios } = ficha;
  const atual = questionarios[0];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("atual")}</CardTitle>
            <CardDescription>{t("descricao")}</CardDescription>
          </div>
          {podeAplicar ? (
            <Button asChild>
              <Link href={`/clientes/${cliente.id}/questionario`}>
                <ClipboardList />
                {atual ? t("aplicarNovo") : t("aplicar")}
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {!atual ? (
            <EmptyState compacto Icone={ShieldCheck} titulo={t("semTitulo")} descricao={t("semDescricao")} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <EtiquetaPerfil cliente={cliente} />
                <span className="numero text-sm text-texto-2">{t("pontuacao", { pontos: atual.score })}</span>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-texto-3">{t("aplicadoEm")}</dt>
                  <dd className="numero">{formatarDataHora(atual.created_at, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-3">{t("validoAte")}</dt>
                  <dd className="numero">{formatarData(atual.valid_until, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-texto-3">{t("aplicadoPor")}</dt>
                  <dd>{atual.autor?.full_name ?? "—"}</dd>
                </div>
              </dl>
              {!atual.validated_version ? <Alert tom="atencao">{t("versaoNaoValidada", { versao: atual.versao?.code ?? "" })}</Alert> : null}
            </div>
          )}
        </CardContent>
      </Card>

      {questionarios.length > 1 ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t("historico")}</CardTitle>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>{t("data")}</TH>
                <TH>{t("resultado")}</TH>
                <TH className="hidden sm:table-cell">{t("versao")}</TH>
                <TH className="hidden md:table-cell">{t("aplicadoPor")}</TH>
              </tr>
            </THead>
            <TBody>
              {questionarios.map((q) => (
                <TR key={q.id}>
                  <TD className="numero">{formatarData(q.created_at.slice(0, 10), locale)}</TD>
                  <TD>
                    {t(`perfis.${q.profile}`)} <span className="numero text-xs text-texto-3">· {q.score}</span>
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {q.versao?.code} {!q.validated_version ? <Badge tom="atencao" className="ml-1">{t("naoValidada")}</Badge> : null}
                  </TD>
                  <TD className="hidden text-texto-2 md:table-cell">{q.autor?.full_name ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
