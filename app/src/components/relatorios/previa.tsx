"use client";

import { useLocale, useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { GraficoEvolucao } from "@/components/carteira/grafico-evolucao";
import type { DadosRelatorio } from "@/lib/relatorios/regras";
import { formatarData, formatarMoeda, formatarPct } from "@/lib/formatos";
import { cn } from "@/lib/utils";

/** Prévia do relatório na tela, com os mesmos números do PDF. */
export function PreviaRelatorio({ d }: { d: DadosRelatorio }) {
  const t = useTranslations("relatorios.previa");
  const tc = useTranslations("carteira.classes");
  const locale = useLocale();
  const kpis = [
    { r: t("patrimonioInicial"), v: formatarMoeda(d.inicio.valor, locale), x: d.inicio.data ? formatarData(d.inicio.data, locale) : t("semFoto") },
    { r: t("patrimonioFinal"), v: formatarMoeda(d.fim.valor, locale), x: d.fim.data ? formatarData(d.fim.data, locale) : t("semFoto") },
    { r: t("aportes"), v: formatarMoeda(d.aportes, locale) },
    { r: t("resgates"), v: formatarMoeda(d.resgates, locale) },
    { r: t("resultado"), v: formatarMoeda(d.variacao, locale), x: t("resultadoDica") },
    { r: t("rentabilidade"), v: formatarPct(d.rentabilidadePeriodo, locale, { sinal: true, casas: 2 }), x: t("noPeriodo") },
  ];
  const rent = [
    { r: t("noPeriodo"), c: d.rentabilidadePeriodo, cdi: d.indices.periodo.cdi, ipca: d.indices.periodo.ipca },
    ...(d.marcoZero ? [{ r: t("desdeInicio", { data: formatarData(d.marcoZero.data, locale) }), c: d.rentabilidadeAcumulada, cdi: d.indices.acumulado.cdi, ipca: d.indices.acumulado.ipca }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {d.avisos.map((a) => (
        <Alert key={a} tom={a === "semFotos" ? "erro" : "atencao"} titulo={t(`avisos.${a}Titulo`)}>
          {t(`avisos.${a}`)}
        </Alert>
      ))}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6" aria-label={t("resumo")}>
        {kpis.map((k) => (
          <div key={k.r} className="rounded-card border border-borda bg-superficie p-4 shadow-card">
            <p className="text-[13px] font-medium text-texto-2">{k.r}</p>
            <p className="mt-2 text-[1.3rem] font-semibold leading-none text-texto">{k.v}</p>
            {k.x ? <p className="mt-2 text-xs text-texto-3">{k.x}</p> : null}
          </div>
        ))}
      </section>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>{t("rentTitulo")}</CardTitle>
              <CardDescription>{t("rentDescricao", { fonte: d.indices.fonte })}</CardDescription>
            </div>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>{t("periodo")}</TH>
                <TH className="text-right">{t("carteira")}</TH>
                <TH className="text-right">CDI</TH>
                <TH className="text-right">IPCA</TH>
              </tr>
            </THead>
            <TBody>
              {rent.map((l) => (
                <TR key={l.r}>
                  <TD>{l.r}</TD>
                  <TD className={cn("numero text-right font-semibold", (l.c ?? 0) >= 0 ? "text-ok" : "text-erro")}>{formatarPct(l.c, locale, { sinal: true, casas: 2 })}</TD>
                  <TD className="numero text-right">{formatarPct(l.cdi, locale, { casas: 2 })}</TD>
                  <TD className="numero text-right">{formatarPct(l.ipca, locale, { casas: 2 })}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("evolucaoTitulo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoEvolucao pontos={d.evolucao.map((p) => ({ data: p.data, total: p.valor, investido: null }))} />
          </CardContent>
        </Card>
      </div>
      {d.alocacao.length ? (
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>{t("alocTitulo")}</CardTitle>
              <CardDescription>{d.alocacao.some((a) => a.alvo !== null) ? t("alocDescricao", { limite: d.limiteDesvio }) : t("alocSemAlvo")}</CardDescription>
            </div>
          </CardHeader>
          <Table>
            <THead>
              <tr>
                <TH>{t("classe")}</TH>
                <TH className="text-right">{t("atual")}</TH>
                <TH className="text-right">{t("alvo")}</TH>
                <TH className="text-right">{t("desvio")}</TH>
              </tr>
            </THead>
            <TBody>
              {d.alocacao.map((a) => (
                <TR key={a.classe}>
                  <TD>{tc(a.classe)}</TD>
                  <TD className="numero text-right font-semibold">{formatarPct(a.pct, locale)}</TD>
                  <TD className="numero text-right text-texto-2">{a.alvo !== null ? formatarPct(a.alvo, locale) : "—"}</TD>
                  <TD className={cn("numero text-right", a.alerta ? "font-medium text-atencao" : "text-texto-2")}>
                    {a.alerta ? <TriangleAlert className="mr-1 inline size-3.5" aria-hidden="true" /> : null}
                    {a.desvio !== null ? formatarPct(a.desvio, locale, { sinal: true }).replace("%", " p.p.") : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
