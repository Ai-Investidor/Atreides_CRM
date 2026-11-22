"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Camera, ChartPie, CircleCheck, Download, FileUp, Landmark, MoreHorizontal, Plus, RefreshCw, Settings2, ShoppingCart, Trash2, TriangleAlert, Wallet, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlay";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { atualizarCotacoesCliente, cancelarAporte, excluirLancamento } from "@/lib/carteira/acoes";
import type { DadosCarteira } from "@/lib/carteira/consultas";
import { CLASSES } from "@/lib/carteira/regras";
import { formatarData, formatarDataHora, formatarMoeda, formatarNumero, formatarPct } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { Alocacao } from "./alocacao";
import { ExecutarAporte, FormAporte, FormConfig, FormFotografia, FormLancamento, FormSaldo } from "./formularios";
import { GraficoEvolucao, type PontoEvolucao } from "./grafico-evolucao";
import { ImportarLancamentos } from "./importar-lancamentos";

type Dialogo = "lancar" | "saldo" | "aporte" | "foto" | "config" | "importar" | { executar: string } | null;

type Props = { dados: DadosCarteira; usuarioId: string; admin: boolean; somenteLeitura?: boolean; hoje: string };

/** Aba Carteira: dashboard financeiro e de investimentos do cliente (Documentação/06). */
export function PainelCarteira({ dados, usuarioId, admin, somenteLeitura, hoje }: Props) {
  const t = useTranslations("carteira");
  const locale = useLocale();
  const router = useRouter();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const { cliente, resumo, posicoes, evolucao, marcoZero, ultimaFoto, variacao } = dados;
  const vazia = posicoes.length === 0;
  const fechar = () => setDialogo(null);

  const pontos: PontoEvolucao[] = [
    ...evolucao.map((f) => ({ data: f.ref_date, total: Number(f.total_value), investido: Number(f.invested_total) })),
    ...(!vazia && (!ultimaFoto || ultimaFoto.ref_date < hoje) ? [{ data: hoje, total: resumo.total, investido: resumo.investido, hoje: true }] : []),
  ];
  const manuais = new Map<string, { id: string; nome: string }>();
  for (const l of dados.lancamentos) if (l.ativo?.kind === "manual") manuais.set(l.ativo.id, { id: l.ativo.id, nome: l.ativo.name });
  for (const s of dados.saldos) if (s.ativo) manuais.set(s.ativo.id, { id: s.ativo.id, nome: s.ativo.name });
  const desdeInicio = marcoZero && Number(marcoZero.total_value) > 0 ? ((resumo.total - Number(marcoZero.total_value)) / Number(marcoZero.total_value)) * 100 : null;
  const cotacaoMaisRecente = posicoes.filter((p) => p.ativo.kind === "listed" && p.referencia).map((p) => p.referencia!).sort().at(-1);

  function acao(fn: () => Promise<{ ok: boolean; mensagem?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) setErro(r.mensagem ?? "salvar");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-texto-3">
          <Badge tom="neutro">{t(`frequencias.${cliente.portfolio_frequency}`)}</Badge>
          {ultimaFoto ? <span>{t("ultimaFoto", { data: formatarData(ultimaFoto.ref_date, locale) })}</span> : <span>{t("semFoto")}</span>}
          {dados.desatualizada && !vazia ? (
            <Badge tom="atencao">
              <TriangleAlert className="size-3" aria-hidden="true" />
              {t("desatualizada")}
            </Badge>
          ) : null}
          {cotacaoMaisRecente ? <span>· {t("cotacoesEm", { hora: formatarDataHora(cotacaoMaisRecente, locale) })}</span> : null}
        </div>
        {!somenteLeitura ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialogo("lancar")}>
              <Plus />
              {t("acoes.lancar")}
            </Button>
            <Button variant="secondary" onClick={() => setDialogo("aporte")}>
              <ShoppingCart />
              {t("acoes.aporte")}
            </Button>
            <Button variant="secondary" onClick={() => setDialogo("foto")} disabled={vazia}>
              <Camera />
              {t("acoes.foto")}
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label={t("acoes.mais")}>
                  <MoreHorizontal />
                </Button>
              </MenuTrigger>
              <MenuContent align="end" className="w-64">
                <MenuItem onSelect={() => setDialogo("saldo")}>
                  <Landmark />
                  {t("acoes.saldo")}
                </MenuItem>
                <MenuItem onSelect={() => setDialogo("importar")}>
                  <FileUp />
                  {t("acoes.importar")}
                </MenuItem>
                <MenuItem onSelect={() => acao(() => atualizarCotacoesCliente(cliente.id))} disabled={pendente}>
                  <RefreshCw />
                  {t("acoes.cotacoes")}
                </MenuItem>
                <MenuItem onSelect={() => setDialogo("config")}>
                  <Settings2 />
                  {t("acoes.config")}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        ) : null}
      </div>

      {erro ? <Alert tom="erro">{t(`erros.${erro}`)}</Alert> : null}
      {dados.falhaCotacao ? <Alert tom="atencao">{t("falhaCotacao")}</Alert> : null}

      {vazia ? (
        <Card>
          <EmptyState Icone={Wallet} titulo={t("vazio.titulo")} descricao={t("vazio.descricao")} />
        </Card>
      ) : (
        <>
          {/* Indicadores */}
          <section aria-label={t("indicadores")} className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-5">
            <Indicador destaque rotulo={t("kpi.patrimonio")} valor={formatarMoeda(resumo.total, locale)} detalhe={t("kpi.patrimonioDetalhe", { ativos: posicoes.length })} />
            <Indicador rotulo={t("kpi.investido")} valor={formatarMoeda(resumo.investido, locale)} detalhe={t("kpi.investidoDetalhe")} />
            <Indicador
              rotulo={t("kpi.resultado")}
              valor={formatarMoeda(resumo.resultado, locale)}
              detalhe={formatarPct(resumo.resultadoPct, locale, { sinal: true })}
              tom={resumo.resultado >= 0 ? "ok" : "erro"}
            />
            <Indicador
              rotulo={t("kpi.variacao")}
              valor={variacao ? formatarPct(variacao.pct, locale, { sinal: true }) : "—"}
              detalhe={variacao ? t("kpi.variacaoDetalhe", { data: formatarData(ultimaFoto!.ref_date, locale), fluxo: formatarMoeda(variacao.fluxo, locale) }) : t("kpi.semFotoDetalhe")}
              tom={variacao ? (variacao.valor >= 0 ? "ok" : "erro") : undefined}
            />
            <Indicador
              rotulo={t("kpi.desvio")}
              valor={Object.keys(dados.alvos).length ? formatarPct(resumo.maiorDesvio, locale).replace("%", " p.p.") : "—"}
              detalhe={Object.keys(dados.alvos).length ? t("kpi.desvioDetalhe", { limite: formatarNumero(Number(cliente.deviation_limit), locale) }) : t("kpi.semAlvo")}
              tom={resumo.porClasse.some((c) => c.alerta) ? "atencao" : undefined}
            />
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>{t("evolucao.titulo")}</CardTitle>
                  <CardDescription>{t("evolucao.descricao")}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <GraficoEvolucao pontos={pontos} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{t("marco.titulo")}</CardTitle>
                  <CardDescription>{marcoZero ? t("marco.descricao", { data: formatarData(marcoZero.ref_date, locale) }) : t("marco.semFoto")}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3 text-sm">
                  <Linha rotulo={t("marco.patrimonioInicial")} valor={marcoZero ? formatarMoeda(Number(marcoZero.total_value), locale) : "—"} />
                  <Linha rotulo={t("marco.patrimonioHoje")} valor={formatarMoeda(resumo.total, locale)} />
                  <Linha rotulo={t("marco.evolucao")} valor={formatarPct(desdeInicio, locale, { sinal: true })} dica={t("marco.evolucaoDica")} />
                  {dados.indicesDesdeInicio ? (
                    <>
                      <Linha rotulo={t("marco.cdi")} valor={formatarPct(dados.indicesDesdeInicio.cdi, locale, { casas: 2 })} />
                      <Linha rotulo={t("marco.ipca")} valor={formatarPct(dados.indicesDesdeInicio.ipca, locale, { casas: 2 })} dica={t("marco.indicesFonte")} />
                    </>
                  ) : null}
                  <div className="my-1 border-t border-divisoria" />
                  <Linha rotulo={t("marco.renda")} valor={cliente.monthly_income ? formatarMoeda(Number(cliente.monthly_income), locale) : "—"} dica={t("marco.rendaFonte")} />
                  <Linha rotulo={t("marco.despesa")} valor={dados.despesaMensal !== null ? formatarMoeda(dados.despesaMensal, locale) : "—"} dica={t("marco.despesaFonte")} />
                </dl>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Alocacao clienteId={cliente.id} resumo={resumo} alvos={dados.alvos} limite={Number(cliente.deviation_limit)} somenteLeitura={somenteLeitura} alvoDoPlanejamento={dados.alvoDoPlanejamento} />
            <Aportes dados={dados} somenteLeitura={somenteLeitura} aoExecutar={(id) => setDialogo({ executar: id })} aoCancelar={(id) => acao(() => cancelarAporte(cliente.id, id))} />
          </div>

          <Posicoes dados={dados} />
        </>
      )}

      <Lancamentos dados={dados} usuarioId={usuarioId} admin={admin} somenteLeitura={somenteLeitura} aoExcluir={(id) => window.confirm(t("lancamentos.excluirConfirma")) && acao(() => excluirLancamento(id))} />

      {dialogo === "lancar" ? <FormLancamento clienteId={cliente.id} aoFechar={fechar} /> : null}
      {dialogo === "saldo" ? <FormSaldo clienteId={cliente.id} ativos={[...manuais.values()]} aoFechar={fechar} /> : null}
      {dialogo === "aporte" ? <FormAporte clienteId={cliente.id} frequencia={cliente.portfolio_frequency} aoFechar={fechar} /> : null}
      {dialogo === "foto" ? <FormFotografia clienteId={cliente.id} aoFechar={fechar} /> : null}
      {dialogo === "config" ? <FormConfig clienteId={cliente.id} frequencia={cliente.portfolio_frequency} limite={Number(cliente.deviation_limit)} aoFechar={fechar} /> : null}
      {dialogo === "importar" ? <ImportarLancamentos clienteId={cliente.id} aoFechar={fechar} /> : null}
      {dialogo && typeof dialogo === "object" ? <ExecutarAporte clienteId={cliente.id} aporteId={dialogo.executar} aoFechar={fechar} /> : null}
    </div>
  );
}

function Indicador({ rotulo, valor, detalhe, destaque, tom }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean; tom?: "ok" | "erro" | "atencao" }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-borda bg-superficie p-4 shadow-card">
      {destaque ? <span className="absolute inset-x-0 top-0 h-0.5 bg-latao" aria-hidden="true" /> : null}
      <p className="text-[13px] font-medium text-texto-2">{rotulo}</p>
      <p className={cn("mt-2 font-semibold leading-none tracking-[-0.02em] text-texto", destaque ? "text-[1.75rem]" : "text-[1.35rem]")}>{valor}</p>
      {detalhe ? (
        <p className={cn("mt-2 text-xs", tom === "ok" ? "text-ok" : tom === "erro" ? "text-erro" : tom === "atencao" ? "text-atencao" : "text-texto-3")}>{detalhe}</p>
      ) : null}
    </div>
  );
}

function Linha({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-texto-3">
        {rotulo}
        {dica ? <span className="block text-[11px] text-texto-3/80">{dica}</span> : null}
      </dt>
      <dd className="numero font-semibold text-texto">{valor}</dd>
    </div>
  );
}

function Posicoes({ dados }: { dados: DadosCarteira }) {
  const t = useTranslations("carteira.posicoes");
  const tc = useTranslations("carteira.classes");
  const locale = useLocale();
  const grupos = CLASSES.map((c) => ({ classe: c, itens: dados.posicoes.filter((p) => p.ativo.asset_class === c) })).filter((g) => g.itens.length);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{t("descricao")}</CardDescription>
        </div>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <TH>{t("ativo")}</TH>
            <TH className="hidden text-right md:table-cell">{t("quantidade")}</TH>
            <TH className="hidden text-right lg:table-cell">{t("precoMedio")}</TH>
            <TH className="hidden text-right md:table-cell">{t("cotacao")}</TH>
            <TH className="text-right">{t("valor")}</TH>
            <TH className="hidden text-right sm:table-cell">{t("resultado")}</TH>
            <TH className="hidden text-right lg:table-cell">{t("pct")}</TH>
          </tr>
        </THead>
        <TBody>
          {grupos.map((g) => {
            const total = g.itens.reduce((s, p) => s + p.valor, 0);
            return (
              <FragmentoGrupo key={g.classe} titulo={tc(g.classe)} total={formatarMoeda(total, locale)}>
                {g.itens.map((p) => (
                  <TR key={p.ativo.id}>
                    <TD>
                      <p className="font-medium">{p.ativo.ticker ?? p.ativo.name}</p>
                      {p.ativo.ticker ? <p className="max-w-56 truncate text-xs text-texto-3">{p.ativo.name}</p> : null}
                    </TD>
                    <TD className="numero hidden text-right md:table-cell">{p.quantidade !== null ? formatarNumero(p.quantidade, locale, 4) : "—"}</TD>
                    <TD className="numero hidden text-right lg:table-cell">{p.precoMedio !== null ? formatarMoeda(p.precoMedio, locale, false) : "—"}</TD>
                    <TD className="hidden text-right md:table-cell">
                      {p.preco !== null ? <span className="numero">{formatarMoeda(p.preco, locale, false)}</span> : null}
                      <p className="text-[11px] text-texto-3">
                        {p.estimado ? t("semReferencia") : p.referencia ? (p.ativo.kind === "listed" ? formatarDataHora(p.referencia, locale) : t("saldoEm", { data: formatarData(p.referencia, locale) })) : ""}
                      </p>
                    </TD>
                    <TD className="numero text-right font-semibold">{formatarMoeda(p.valor, locale)}</TD>
                    <TD className={cn("numero hidden text-right sm:table-cell", p.resultado >= 0 ? "text-ok" : "text-erro")}>
                      {formatarMoeda(p.resultado, locale)}
                      <span className="block text-[11px]">{formatarPct(p.resultadoPct, locale, { sinal: true })}</span>
                    </TD>
                    <TD className="numero hidden text-right text-texto-2 lg:table-cell">{formatarPct(p.pctCarteira, locale)}</TD>
                  </TR>
                ))}
              </FragmentoGrupo>
            );
          })}
        </TBody>
      </Table>
    </Card>
  );
}

function FragmentoGrupo({ titulo, total, children }: { titulo: string; total: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-b border-divisoria bg-superficie-2">
        <td colSpan={7} className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-texto-3">
          <span className="flex justify-between">
            {titulo}
            <span className="numero normal-case tracking-normal text-texto-2">{total}</span>
          </span>
        </td>
      </tr>
      {children}
    </>
  );
}

function Aportes({ dados, somenteLeitura, aoExecutar, aoCancelar }: { dados: DadosCarteira; somenteLeitura?: boolean; aoExecutar: (id: string) => void; aoCancelar: (id: string) => void }) {
  const t = useTranslations("carteira.aportes");
  const locale = useLocale();
  const precoAtual = (assetId: string) => {
    const c = dados.cotacoes[assetId];
    return c ? Number(c.price) : null;
  };
  const lista = dados.aportes.filter((a) => a.status !== "canceled").slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{t("descricao")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!lista.length ? (
          <EmptyState compacto Icone={ChartPie} titulo={t("vazioTitulo")} descricao={t("vazioDescricao")} />
        ) : (
          <ul className="flex flex-col gap-3">
            {lista.map((a) => {
              const pago = (a.itens ?? []).reduce((s, i) => s + Number(i.amount), 0);
              const hoje = (a.itens ?? []).reduce((s, i) => {
                const p = precoAtual(i.asset_id);
                return p === null ? null : s === null ? null : s + p * Number(i.quantity);
              }, 0 as number | null);
              const executado = a.status === "executed";
              const varPct = executado && hoje !== null && pago > 0 ? ((hoje - pago) / pago) * 100 : null;
              return (
                <li key={a.id} className="rounded-marca border border-borda p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-texto">
                        {t(a.period_kind === "monthly" ? "periodoMes" : "periodoSemana", { data: formatarData(a.period_start, locale, a.period_kind === "monthly" ? { day: undefined } : {}) })}
                      </p>
                      <p className="text-xs text-texto-3">
                        {executado ? t("executadoEm", { data: formatarData(a.executed_on ?? a.period_start, locale) }) : t("planejado")} · {t("ativos", { n: (a.itens ?? []).length })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon-sm" variant="ghost" asChild>
                        <a href={`/api/aportes/${a.id}/pdf`} aria-label={t("baixarPdf")} title={t("baixarPdf")}>
                          <Download />
                        </a>
                      </Button>
                      {executado ? (
                        <Badge tom="ok">
                          <CircleCheck className="size-3" aria-hidden="true" />
                          {t("executado")}
                        </Badge>
                      ) : !somenteLeitura ? (
                        <>
                          <Button size="sm" onClick={() => aoExecutar(a.id)}>
                            {t("executar")}
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label={t("cancelar")} onClick={() => window.confirm(t("cancelarConfirma")) && aoCancelar(a.id)}>
                            <X />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-2">
                    {(a.itens ?? []).map((i) => (
                      <li key={i.id} className="numero">
                        <span className="font-semibold text-texto">{i.ativo?.ticker ?? i.ativo?.name}</span> {formatarNumero(Number(i.quantity), locale, 4)} × {formatarMoeda(Number(i.unit_price), locale, false)}
                      </li>
                    ))}
                  </ul>
                  <p className="numero mt-2 flex flex-wrap gap-x-3 text-xs text-texto-3">
                    <span>
                      {executado ? t("pago") : t("previsto")}: <span className="font-semibold text-texto">{formatarMoeda(pago, locale, false)}</span>
                    </span>
                    {executado && hoje !== null ? (
                      <span>
                        {t("valeHoje")}: <span className="font-semibold text-texto">{formatarMoeda(hoje, locale, false)}</span>{" "}
                        <span className={varPct !== null && varPct >= 0 ? "text-ok" : "text-erro"}>({formatarPct(varPct, locale, { sinal: true })})</span>
                      </span>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Lancamentos({ dados, usuarioId, admin, somenteLeitura, aoExcluir }: { dados: DadosCarteira; usuarioId: string; admin: boolean; somenteLeitura?: boolean; aoExcluir: (id: string) => void }) {
  const t = useTranslations("carteira.lancamentos");
  const locale = useLocale();
  const [todos, setTodos] = useState(false);
  const lista = todos ? dados.lancamentos : dados.lancamentos.slice(0, 10);
  if (!dados.lancamentos.length) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{t("descricao", { total: dados.lancamentos.length })}</CardDescription>
        </div>
      </CardHeader>
      <Table>
        <THead>
          <tr>
            <TH>{t("data")}</TH>
            <TH>{t("ativo")}</TH>
            <TH className="hidden md:table-cell">{t("detalhe")}</TH>
            <TH className="text-right">{t("valor")}</TH>
            <TH className="hidden lg:table-cell">{t("instituicao")}</TH>
            <TH className="text-right">
              <span className="sr-only">{t("acoes")}</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {lista.map((l) => (
            <TR key={l.id}>
              <TD className="numero whitespace-nowrap">{formatarData(l.trade_date, locale)}</TD>
              <TD>
                <p className="font-medium">{l.ativo?.ticker ?? l.ativo?.name}</p>
                <p className="text-xs text-texto-3">
                  {t(`tipos.${l.type}`)}
                  {l.contribution_id ? ` · ${t("doAporte")}` : ""}
                </p>
              </TD>
              <TD className="numero hidden text-texto-2 md:table-cell">{l.quantity !== null ? `${formatarNumero(Number(l.quantity), locale, 4)} × ${formatarMoeda(Number(l.unit_price), locale, false)}` : "—"}</TD>
              <TD className={cn("numero text-right font-medium", l.type === "sell" || l.type === "withdrawal" ? "text-texto-2" : "text-texto")}>
                {l.type === "sell" || l.type === "withdrawal" ? "−" : ""}
                {formatarMoeda(Number(l.amount), locale, false)}
              </TD>
              <TD className="hidden text-texto-2 lg:table-cell">{l.institution ?? "—"}</TD>
              <TD className="text-right">
                {!somenteLeitura && (l.created_by === usuarioId || admin) ? (
                  <Button variant="ghost" size="icon-sm" aria-label={t("excluir")} onClick={() => aoExcluir(l.id)}>
                    <Trash2 />
                  </Button>
                ) : null}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {dados.lancamentos.length > 10 ? (
        <div className="border-t border-divisoria px-5 py-3">
          <Button variant="ghost" size="sm" onClick={() => setTodos((v) => !v)}>
            {todos ? t("verMenos") : t("verTodos", { total: dados.lancamentos.length })}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
