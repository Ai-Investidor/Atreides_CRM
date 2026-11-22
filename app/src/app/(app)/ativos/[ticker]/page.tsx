import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { AcoesAtivo } from "@/components/ativos/acoes-ativo";
import { GraficoPreco } from "@/components/ativos/grafico-preco";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Page } from "@/components/ui/layout";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { estaNaLista, historicoDoAtivo, perfilDoAtivo, proventosDoAtivo, usoNoWorkspace } from "@/lib/ativos/consultas";
import { classeSugerida } from "@/lib/carteira/regras";
import { clientesParaVinculo } from "@/lib/clientes/consultas";
import { formatarData, formatarDataHora, formatarMoeda, formatarMoedaCompacta, formatarNumero, formatarPct, hojeISO } from "@/lib/formatos";
import { obterSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/ativos/[ticker]">): Promise<Metadata> {
  return { title: (await params).ticker.toUpperCase() };
}

/** Página do ativo: cotação, gráfico, indicadores, proventos e uso no Atreides (Documentação/13). */
export default async function AtivoPage({ params }: PageProps<"/ativos/[ticker]">) {
  const ticker = (await params).ticker.toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(ticker)) notFound();
  const [t, locale, sessao] = await Promise.all([getTranslations("ativos"), getLocale(), obterSessao()]);
  if (!sessao) redirect("/login");

  const [perfil, historico, proventos, uso, naLista, clientes] = await Promise.all([
    perfilDoAtivo(ticker),
    historicoDoAtivo(ticker),
    proventosDoAtivo(ticker),
    usoNoWorkspace(ticker, sessao.atual.id),
    estaNaLista(ticker),
    clientesParaVinculo(sessao.atual.id),
  ]);
  const p = perfil.dado;
  if (!p && perfil.falhou) {
    return (
      <Page className="flex flex-col gap-6">
        <Voltar rotulo={t("titulo")} />
        <Alert tom="erro" titulo={t("indisponivelTitulo", { ticker })}>{t("indisponivelTexto")}</Alert>
      </Page>
    );
  }
  if (!p) notFound();

  const hoje = hojeISO();
  const fii = p.tipo === "fii";
  const ind = p.indicadores;
  const n = (v: number | null, casas = 2) => (v === null ? null : formatarNumero(v, locale, casas));
  const pct = (v: number | null) => (v === null ? null : formatarPct(v, locale, { casas: 2 }));
  const blocos: { titulo: string; itens: { r: string; v: string | null }[] }[] = fii
    ? [
        { titulo: t("blocos.valuation"), itens: [{ r: "P/VP", v: n(ind.pvp) }, { r: "DY (12m)", v: pct(ind.dy) }, { r: t("ind.vpCota"), v: ind.valorPatrimonialCota !== null ? formatarMoeda(ind.valorPatrimonialCota, locale, false) : null }] },
        { titulo: t("blocos.liquidez"), itens: [{ r: t("ind.volume"), v: ind.volumeMedio !== null ? formatarNumero(ind.volumeMedio, locale, 0) : null }, { r: t("ind.valorMercado"), v: ind.valorMercado !== null ? formatarMoedaCompacta(ind.valorMercado, locale) : null }] },
      ]
    : [
        { titulo: t("blocos.valuation"), itens: [{ r: "P/L", v: n(ind.pl) }, { r: "P/VP", v: n(ind.pvp) }, { r: "EV/EBITDA", v: n(ind.evEbitda) }, { r: "DY (12m)", v: pct(ind.dy) }] },
        { titulo: t("blocos.rentabilidade"), itens: [{ r: "ROE", v: pct(ind.roe) }, { r: t("ind.margem"), v: pct(ind.margemLiquida) }] },
        { titulo: t("blocos.endividamento"), itens: [{ r: t("ind.divPat"), v: ind.dividaPatrimonio !== null ? formatarPct(ind.dividaPatrimonio, locale, { casas: 1 }) : null }] },
        { titulo: t("blocos.liquidez"), itens: [{ r: t("ind.volume"), v: ind.volumeMedio !== null ? formatarNumero(ind.volumeMedio, locale, 0) : null }, { r: t("ind.valorMercado"), v: ind.valorMercado !== null ? formatarMoedaCompacta(ind.valorMercado, locale) : null }] },
      ];
  const provs = [...(proventos.dado ?? [])].sort((a, b) => b.data.localeCompare(a.data));
  const umAno = new Date(Date.parse(`${hoje}T12:00:00Z`) - 365 * 864e5).toISOString().slice(0, 10);
  // Proventos anunciados e ainda não pagos aparecem na tabela, mas não entram no total.
  const total12m = provs.filter((x) => x.data >= umAno && x.data <= hoje).reduce((s, x) => s + x.valor, 0);

  return (
    <Page className="flex max-w-none flex-col gap-6 2xl:px-12">
      <Voltar rotulo={t("titulo")} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-titulo text-[2rem] font-bold leading-none tracking-[-0.02em] text-texto">{ticker}</h1>
            <Badge tom="neutro">{t(`tipos.${p.tipo}`)}</Badge>
            {p.setor ? <Badge tom="marca">{p.setor}</Badge> : null}
          </div>
          <p className="mt-1.5 text-[15px] text-texto-2">{p.nome}</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="numero text-[1.75rem] font-semibold text-texto">{p.preco !== null ? formatarMoeda(p.preco, locale, false) : "—"}</span>
            {p.variacaoPct !== null ? (
              <span className={cn("numero text-sm font-semibold", p.variacaoPct >= 0 ? "text-ok" : "text-erro")}>{formatarPct(p.variacaoPct, locale, { sinal: true, casas: 2 })}</span>
            ) : null}
            <span className="text-xs text-texto-3">{t("fonte", { fonte: perfil.fonte ?? "", hora: p.em ? formatarDataHora(p.em, locale) : perfil.em ? formatarDataHora(perfil.em, locale) : "—" })}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AcoesAtivo ativo={{ id: null, ticker, nome: p.nome, classe: classeSugerida(p.tipo), tipo: "bolsa", novo: true }} naLista={naLista} clientes={clientes.map((c) => ({ id: c.id, full_name: c.full_name }))} />
        </div>
      </header>
      {perfil.falhou ? <Alert tom="atencao">{t("cacheAviso", { data: perfil.em ? formatarDataHora(perfil.em, locale) : "—" })}</Alert> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("grafico.titulo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoPreco pontos={historico.dado ?? []} hoje={hoje} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t("indicadores")}</CardTitle>
              <CardDescription>{t("indicadoresDescricao")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {blocos.map((b) => (
              <div key={b.titulo}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-texto-3">{b.titulo}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {b.itens.map((i) => (
                    <div key={i.r}>
                      <dt className="text-xs text-texto-3">{i.r}</dt>
                      <dd className={cn("numero text-sm font-semibold", i.v === null ? "font-normal text-texto-3" : "text-texto")}>{i.v ?? t("indisponivel")}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>{t("proventos.titulo")}</CardTitle>
              <CardDescription>{provs.length ? t("proventos.descricao", { total: formatarMoeda(total12m, locale, false) }) : t("proventos.vazio")}</CardDescription>
            </div>
          </CardHeader>
          {provs.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>{t("proventos.data")}</TH>
                  <TH className="text-right">{t("proventos.valor")}</TH>
                </tr>
              </THead>
              <TBody>
                {provs.slice(0, 12).map((x) => (
                  <TR key={x.data + x.valor}>
                    <TD className="numero">
                      {formatarData(x.data, locale)}
                      {x.data > hoje ? <span className="ml-2 text-xs text-texto-3">{t("proventos.aPagar")}</span> : null}
                    </TD>
                    <TD className="numero text-right">{formatarMoeda(x.valor, locale, false)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : null}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>{t("uso.titulo")}</CardTitle>
              <CardDescription>{uso.length ? t("uso.descricao", { total: uso.length }) : t("uso.vazio")}</CardDescription>
            </div>
          </CardHeader>
          {uso.length ? (
            <Table>
              <THead>
                <tr>
                  <TH>{t("uso.cliente")}</TH>
                  <TH className="text-right">{t("uso.quantidade")}</TH>
                  <TH className="text-right">{t("uso.valor")}</TH>
                </tr>
              </THead>
              <TBody>
                {uso.map((c) => (
                  <TR key={c.id} className="relative">
                    <TD>
                      <Link href={`/clientes/${c.id}?aba=carteira`} className="font-medium after:absolute after:inset-0 after:content-[''] hover:underline">
                        {c.nome}
                      </Link>
                    </TD>
                    <TD className="numero text-right">{formatarNumero(c.quantidade, locale, 4)}</TD>
                    <TD className="numero text-right">{p.preco !== null ? formatarMoeda(c.quantidade * p.preco, locale) : "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : null}
        </Card>
      </div>
      <p className="text-xs text-texto-3">{t("aviso")}</p>
    </Page>
  );
}

function Voltar({ rotulo }: { rotulo: string }) {
  return (
    <Link href="/ativos" className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-texto-3 hover:text-texto">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {rotulo}
    </Link>
  );
}
