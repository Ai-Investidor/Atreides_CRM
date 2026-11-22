import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { FileText, ListTodo } from "lucide-react";
import { EtiquetaRelatorio } from "@/components/relatorios/etiqueta-status";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Page, PageHeader } from "@/components/ui/layout";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { relatoriosDoWorkspace, relatoriosPendentes } from "@/lib/relatorios/consultas";
import { formatarData } from "@/lib/formatos";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Relatórios" };

/** Relatórios do workspace: a gerar (tarefas da periodicidade) e recentes (Documentação/08). */
export default async function RelatoriosPage() {
  const [t, locale, sessao] = await Promise.all([getTranslations("relatorios"), getLocale(), obterSessao()]);
  if (!sessao) redirect("/login");
  const [lista, pendentes] = await Promise.all([relatoriosDoWorkspace(sessao.atual.id), relatoriosPendentes(sessao.atual.id)]);

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader sobretitulo={t("geral.sobretitulo")} titulo={t("geral.titulo")} descricao={t("geral.descricao")} />

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>{t("geral.pendentesTitulo")}</CardTitle>
            <CardDescription>{t("geral.pendentesDescricao")}</CardDescription>
          </div>
        </CardHeader>
        {!pendentes.length ? (
          <EmptyState compacto Icone={ListTodo} titulo={t("geral.pendentesVazio")} descricao={t("geral.pendentesVazioDescricao")} />
        ) : (
          <ul className="divide-y divide-divisoria border-t border-divisoria">
            {pendentes.map((p) => (
              <li key={p.id}>
                <Link href={p.cliente ? `/clientes/${p.cliente.id}?aba=relatorios` : "/tarefas"} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-superficie-2">
                  <span className="font-medium">{p.cliente?.full_name ?? p.title}</span>
                  <span className="numero text-xs text-texto-3">{p.due_on ? t("geral.prazo", { data: formatarData(p.due_on, locale) }) : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t("geral.recentes")}</CardTitle>
        </CardHeader>
        {!lista.length ? (
          <EmptyState compacto Icone={FileText} titulo={t("geral.vazioTitulo")} descricao={t("geral.vazioDescricao")} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{t("geral.cliente")}</TH>
                <TH>{t("geral.periodo")}</TH>
                <TH className="hidden sm:table-cell">{t("geral.situacao")}</TH>
                <TH className="hidden md:table-cell">{t("geral.aprovado")}</TH>
              </tr>
            </THead>
            <TBody>
              {lista.map((r) => (
                <TR key={r.id} className="relative">
                  <TD>
                    <Link href={`/relatorios/${r.id}`} className="font-medium after:absolute after:inset-0 after:content-[''] hover:underline">
                      {r.cliente?.full_name}
                    </Link>
                  </TD>
                  <TD className="numero text-texto-2">
                    {formatarData(r.period_start, locale)} – {formatarData(r.period_end, locale)}
                    {r.version > 1 ? <span className="ml-1 text-xs text-texto-3">· v{r.version}</span> : null}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    <EtiquetaRelatorio status={r.status} enviado={!!r.sent_at} />
                  </TD>
                  <TD className="numero hidden text-texto-2 md:table-cell">{r.approved_at ? formatarData(r.approved_at.slice(0, 10), locale) : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </Page>
  );
}
