import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BriefcaseBusiness, Clock, TriangleAlert, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Page, PageHeader, StatCard } from "@/components/ui/layout";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { visaoGeralCarteiras } from "@/lib/carteira/consultas";
import { formatarData, formatarMoeda, formatarPct } from "@/lib/formatos";
import { obterSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Carteiras" };

/** Visão geral das carteiras do workspace (Documentação/06). */
export default async function CarteirasPage({ searchParams }: PageProps<"/carteiras">) {
  const [t, locale, sessao, params] = await Promise.all([getTranslations("carteira.geral"), getLocale(), obterSessao(), searchParams]);
  if (!sessao) redirect("/login");
  const { linhas, falhaCotacao } = await visaoGeralCarteiras(sessao.atual.id);
  const soDesatualizadas = params.filtro === "desatualizadas";
  const comCarteira = linhas.filter((l) => !l.vazia);
  const visiveis = soDesatualizadas ? linhas.filter((l) => l.desatualizada && !l.vazia) : linhas;
  const total = comCarteira.reduce((s, l) => s + l.total, 0);

  return (
    <Page className="flex max-w-none flex-col gap-6 2xl:px-12">
      <PageHeader sobretitulo={t("sobretitulo")} titulo={t("titulo")} descricao={t("descricao")} />
      {falhaCotacao ? <Alert tom="atencao">{t("falhaCotacao")}</Alert> : null}

      <section aria-label={t("indicadores")} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard destaque rotulo={t("stats.patrimonio")} valor={formatarMoeda(total, locale)} Icone={Wallet} detalhe={t("stats.patrimonioDetalhe", { clientes: comCarteira.length })} />
        <StatCard rotulo={t("stats.comCarteira")} valor={`${comCarteira.length}/${linhas.length}`} Icone={BriefcaseBusiness} detalhe={t("stats.comCarteiraDetalhe")} />
        <StatCard rotulo={t("stats.desatualizadas")} valor={String(comCarteira.filter((l) => l.desatualizada).length)} Icone={Clock} detalhe={t("stats.desatualizadasDetalhe")} />
        <StatCard rotulo={t("stats.desvio")} valor={String(comCarteira.filter((l) => l.alerta).length)} Icone={TriangleAlert} detalhe={t("stats.desvioDetalhe")} />
      </section>

      <nav aria-label={t("filtro")} className="flex gap-1 border-b border-borda">
        {[
          { id: "todas", href: "/carteiras", rotulo: t("todas") },
          { id: "desatualizadas", href: "/carteiras?filtro=desatualizadas", rotulo: t("soDesatualizadas") },
        ].map((a) => {
          const ativa = (a.id === "desatualizadas") === soDesatualizadas;
          return (
            <Link
              key={a.id}
              href={a.href}
              aria-current={ativa ? "page" : undefined}
              className={cn("-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium", ativa ? "border-marinho text-texto" : "border-transparent text-texto-3 hover:text-texto")}
            >
              {a.rotulo}
            </Link>
          );
        })}
      </nav>

      {!visiveis.length ? (
        <Card>
          <EmptyState Icone={Wallet} titulo={t("vazioTitulo")} descricao={soDesatualizadas ? t("vazioDesatualizadas") : t("vazioDescricao")} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <tr>
                <TH>{t("cliente")}</TH>
                <TH className="text-right">{t("patrimonio")}</TH>
                <TH className="hidden text-right md:table-cell">{t("resultado")}</TH>
                <TH className="hidden text-right md:table-cell">{t("variacao")}</TH>
                <TH className="hidden text-right lg:table-cell">{t("desvio")}</TH>
                <TH className="hidden sm:table-cell">{t("atualizacao")}</TH>
              </tr>
            </THead>
            <TBody>
              {visiveis.map((l) => (
                <TR key={l.cliente.id} className="relative">
                  <TD>
                    <Link href={`/clientes/${l.cliente.id}?aba=carteira`} className="font-medium after:absolute after:inset-0 after:content-[''] hover:underline hover:underline-offset-4">
                      {l.cliente.full_name}
                    </Link>
                    <p className="text-xs text-texto-3">{t(`frequencias.${l.cliente.portfolio_frequency}`)}</p>
                  </TD>
                  <TD className="numero text-right font-semibold">{l.vazia ? <span className="font-normal text-texto-3">{t("semCarteira")}</span> : formatarMoeda(l.total, locale)}</TD>
                  <TD className={cn("numero hidden text-right md:table-cell", (l.resultadoPct ?? 0) >= 0 ? "text-ok" : "text-erro")}>{l.vazia ? "—" : formatarPct(l.resultadoPct, locale, { sinal: true })}</TD>
                  <TD className={cn("numero hidden text-right md:table-cell", (l.variacao?.pct ?? 0) >= 0 ? "text-ok" : "text-erro")}>{l.variacao ? formatarPct(l.variacao.pct, locale, { sinal: true }) : "—"}</TD>
                  <TD className="numero hidden text-right lg:table-cell">
                    {l.maiorDesvio === null ? "—" : (
                      <span className={l.alerta ? "inline-flex items-center gap-1 font-medium text-atencao" : "text-texto-2"}>
                        {l.alerta ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : null}
                        {formatarPct(l.maiorDesvio, locale).replace("%", " p.p.")}
                      </span>
                    )}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    {l.vazia ? null : l.desatualizada ? (
                      <Badge tom="atencao">
                        <Clock className="size-3" aria-hidden="true" />
                        {l.ultimaFoto ? t("desatualizadaDesde", { data: formatarData(l.ultimaFoto, locale) }) : t("nuncaFotografada")}
                      </Badge>
                    ) : (
                      <span className="numero text-sm text-texto-2">{formatarData(l.ultimaFoto!, locale)}</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </Page>
  );
}
