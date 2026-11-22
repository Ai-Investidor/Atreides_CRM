"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatarData } from "@/lib/formatos";
import { EtiquetaRelatorio } from "./etiqueta-status";
import { GerarRelatorio } from "./gerar-relatorio";

type Item = { id: string; period_start: string; period_end: string; status: "draft" | "approved" | "superseded"; version: number; approved_at: string | null; sent_at: string | null };

/** Aba Relatórios da ficha: histórico (substituídos marcados) e "Gerar relatório". */
export function RelatoriosDoCliente({ clienteId, lista, sugestao, frequencia, somenteLeitura }: { clienteId: string; lista: Item[]; sugestao: { inicio: string; fim: string }; frequencia: string; somenteLeitura?: boolean }) {
  const t = useTranslations("relatorios.cliente");
  const locale = useLocale();
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{t("descricao", { frequencia: t(`frequencias.${frequencia}`) })}</CardDescription>
        </div>
        {!somenteLeitura ? <GerarRelatorio clienteId={clienteId} inicio={sugestao.inicio} fim={sugestao.fim} /> : null}
      </CardHeader>
      {!lista.length ? (
        <EmptyState compacto Icone={FileText} titulo={t("vazioTitulo")} descricao={t("vazioDescricao")} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t("periodo")}</TH>
              <TH>{t("situacao")}</TH>
              <TH className="hidden sm:table-cell">{t("aprovado")}</TH>
              <TH className="hidden md:table-cell">{t("enviado")}</TH>
            </tr>
          </THead>
          <TBody>
            {lista.map((r) => (
              <TR key={r.id} className={r.status === "superseded" ? "relative opacity-60" : "relative"}>
                <TD>
                  <Link href={`/relatorios/${r.id}`} className="numero font-medium after:absolute after:inset-0 after:content-[''] hover:underline">
                    {formatarData(r.period_start, locale)} – {formatarData(r.period_end, locale)}
                  </Link>
                  <span className="ml-2 text-xs text-texto-3">v{r.version}</span>
                </TD>
                <TD>
                  <EtiquetaRelatorio status={r.status} enviado={!!r.sent_at} />
                </TD>
                <TD className="numero hidden text-texto-2 sm:table-cell">{r.approved_at ? formatarData(r.approved_at.slice(0, 10), locale) : "—"}</TD>
                <TD className="numero hidden text-texto-2 md:table-cell">{r.sent_at ? formatarData(r.sent_at.slice(0, 10), locale) : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
