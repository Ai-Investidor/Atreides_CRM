"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Compass, Download, Eye, History, PenLine, Plus, Presentation, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, SelectItem } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Apresentacao } from "@/components/documento/apresentacao";
import { EditorMarkdown } from "@/components/documento/editor-markdown";
import { Markdown } from "@/components/documento/markdown";
import { EtiquetaPerfil } from "@/components/clientes/etiquetas";
import type { Perfil } from "@/lib/clientes/regras";
import { CLASSES, type ClasseAtivo } from "@/lib/carteira/regras";
import { formatarData, formatarDataHora, formatarMoeda, formatarPct } from "@/lib/formatos";
import { salvarPlanejamento, versaoDoPlanejamento, type ResultadoPlanejamento } from "@/lib/planejamento/acoes";
import type { DadosPlanejamentoTela } from "@/lib/planejamento/consultas";
import {
  aporteNecessario,
  dataDaIdade,
  GRUPO_DA_CLASSE,
  GRUPOS,
  mesesAte,
  MODELO_PLANEJAMENTO,
  patrimonioFuturo,
  PREMISSAS,
  taxaDaCarteira,
  totaisPorGrupo,
  type LinhaAlocacao,
  type Objetivo,
  type Premissa,
  type TaxaCarteira,
} from "@/lib/planejamento/regras";
import { cn } from "@/lib/utils";

type Props = { clienteId: string; dados: DadosPlanejamentoTela; hoje: string; podeEditar: boolean };

/** Planejamento do cliente (Documentação/05): leitura, edição, apresentação, PDF e histórico. */
export function CardPlanejamento({ clienteId, dados, hoje, podeEditar }: Props) {
  const t = useTranslations("planejamento");
  const locale = useLocale();
  const [editando, setEditando] = useState(false);
  const [apresentando, setApresentando] = useState(false);
  const [historico, setHistorico] = useState(false);
  const p = dados.plano;

  if (editando) return <Editor clienteId={clienteId} dados={dados} hoje={hoje} aoFechar={() => setEditando(false)} />;

  const taxa = taxaDaCarteira(dados.alocacao, num(p?.cdi_ref), num(p?.ipca_ref));
  const nome = dados.cliente?.full_name ?? "";

  return (
    <div className="flex flex-col gap-6">
      {!dados.diagnostico ? <Alert tom="atencao">{t("semDiagnostico")}</Alert> : null}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("titulo")}</CardTitle>
            <CardDescription>{t("descricao")}</CardDescription>
          </div>
          {p ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setApresentando(true)}>
                <Presentation />
                {t("apresentar")}
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <a href={`/api/planejamento/${p.id}/pdf`}>
                  <Download />
                  {t("baixarPdf")}
                </a>
              </Button>
              {dados.versoes.length ? (
                <Button variant="ghost" size="sm" onClick={() => setHistorico(true)}>
                  <History />
                  {t("historico")}
                </Button>
              ) : null}
              {podeEditar ? (
                <Button size="sm" onClick={() => setEditando(true)}>
                  <PenLine />
                  {t("editar")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {!p ? (
            <EmptyState
              compacto
              Icone={Compass}
              titulo={t("vazioTitulo")}
              descricao={t("vazioDescricao")}
              acao={
                podeEditar ? (
                  <Button onClick={() => setEditando(true)}>
                    <PenLine />
                    {t("escrever")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-6">
              <Resumo aporte={num(p.monthly_contribution)} taxa={taxa} alocacao={dados.alocacao} perfil={dados.cliente?.investor_profile ?? null} />
              <Aviso />
              {p.content_md.trim() ? <Markdown texto={p.content_md} /> : <p className="text-sm text-texto-3">{t("semTexto")}</p>}
              <Objetivos objetivos={dados.objetivos} taxa={taxa} hoje={hoje} />
              <Alocacao alocacao={dados.alocacao} />
              <Aposentadoria dados={dados} taxa={taxa} aporte={num(p.monthly_contribution)} hoje={hoje} />
              <p className="text-xs text-texto-3">
                {t("versaoAtual", { versao: p.version, data: formatarDataHora(p.updated_at, locale), nome: p.autor?.full_name ?? "—" })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {apresentando && p ? (
        <Apresentacao sobre={t("titulo")} nome={nome} aoFechar={() => setApresentando(false)}>
          <Resumo aporte={num(p.monthly_contribution)} taxa={taxa} alocacao={dados.alocacao} perfil={null} grande />
          <Markdown texto={p.content_md} tamanho="apresentacao" />
          <Objetivos objetivos={dados.objetivos} taxa={taxa} hoje={hoje} grande />
          <Alocacao alocacao={dados.alocacao} grande />
          <Aposentadoria dados={dados} taxa={taxa} aporte={num(p.monthly_contribution)} hoje={hoje} grande />
          <Aviso />
        </Apresentacao>
      ) : null}
      <Historico aberto={historico} aoMudar={setHistorico} versoes={dados.versoes} />
    </div>
  );
}

const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));
const lerNumero = (v: string) => (v.trim() === "" ? null : Number(v.replace(/\./g, "").replace(",", ".")));
const paraCampo = (n: number | null | undefined, casas = 2) => (n === null || n === undefined ? "" : Number(n).toFixed(casas).replace(".", ","));

function Aviso() {
  const t = useTranslations("planejamento");
  return <Alert tom="info">{t("aviso")}</Alert>;
}

/** Texto da rentabilidade simulada: "IPCA + 4,10% ao ano · 107% do CDI". */
function useTextoTaxa() {
  const t = useTranslations("planejamento");
  const locale = useLocale();
  return (taxa: TaxaCarteira) =>
    taxa.ok
      ? t("taxaCarteira", {
          real: formatarPct(taxa.real * 100, locale, { casas: 2 }),
          cdi: taxa.pctCdi === null ? "—" : formatarPct(taxa.pctCdi, locale, { casas: 0 }),
        })
      : t(`taxaIndisponivel.${taxa.motivo}`);
}

function Resumo({ aporte, taxa, alocacao, perfil, grande }: { aporte: number | null; taxa: TaxaCarteira; alocacao: LinhaAlocacao[]; perfil: Perfil | null; grande?: boolean }) {
  const t = useTranslations("planejamento");
  const locale = useLocale();
  const textoTaxa = useTextoTaxa();
  const g = totaisPorGrupo(alocacao);
  const itens: { r: string; v: React.ReactNode; d?: string }[] = [
    { r: t("aporteMensal"), v: aporte === null ? "—" : formatarMoeda(aporte, locale, false) },
    { r: t("rentabilidade"), v: textoTaxa(taxa), d: t("rentabilidadeDica") },
    { r: t("proporcao"), v: alocacao.length ? `${t("grupos.rfCurto")} ${formatarPct(g.rf, locale, { casas: 0 })} · ${t("grupos.rvCurto")} ${formatarPct(g.rv, locale, { casas: 0 })}${g.outros ? ` · ${t("grupos.outrosCurto")} ${formatarPct(g.outros, locale, { casas: 0 })}` : ""}` : "—" },
  ];
  return (
    <dl className={cn("grid gap-3", grande ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4")}>
      {itens.map((i) => (
        <div key={i.r} className="rounded-marca border border-borda bg-superficie-2 px-3.5 py-3">
          <dt className={cn("text-texto-3", grande ? "text-sm" : "text-xs")}>{i.r}</dt>
          <dd className={cn("font-semibold text-texto", grande ? "mt-1 text-2xl" : "mt-0.5 text-base")}>{i.v}</dd>
          {i.d && !grande ? <p className="mt-1 text-[11px] text-texto-3">{i.d}</p> : null}
        </div>
      ))}
      {perfil !== null && !grande ? (
        <div className="rounded-marca border border-borda bg-superficie-2 px-3.5 py-3">
          <dt className="text-xs text-texto-3">{t("perfil")}</dt>
          <dd className="mt-1">
            <EtiquetaPerfil cliente={{ investor_profile: perfil }} />
          </dd>
          <p className="mt-1 text-[11px] text-texto-3">{t("perfilDica")}</p>
        </div>
      ) : null}
    </dl>
  );
}

function Objetivos({ objetivos, taxa, hoje, grande }: { objetivos: Objetivo[]; taxa: TaxaCarteira; hoje: string; grande?: boolean }) {
  const t = useTranslations("planejamento");
  const locale = useLocale();
  if (!objetivos.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className={cn("font-titulo font-semibold text-texto", grande ? "text-2xl" : "text-base")}>{t("objetivos.titulo")}</h3>
      <div className="overflow-x-auto rounded-marca border border-borda">
        <Table className={grande ? "text-base" : undefined}>
          <THead>
            <tr>
              <TH>{t("objetivos.nome")}</TH>
              <TH className="text-right">{t("objetivos.valor")}</TH>
              <TH>{t("objetivos.prazo")}</TH>
              <TH className="text-right">{t("objetivos.guardado")}</TH>
              <TH className="text-right">{t("objetivos.aporte")}</TH>
            </tr>
          </THead>
          <TBody>
            {objetivos.map((o, i) => {
              const a = taxa.ok ? aporteNecessario(o, taxa.real, hoje) : null;
              return (
                <TR key={i}>
                  <TD className="font-medium">{o.name}</TD>
                  <TD className="numero text-right">{formatarMoeda(o.target_value, locale)}</TD>
                  <TD className="numero">{formatarData(o.target_date, locale, { month: "short", year: "numeric" })}</TD>
                  <TD className="numero text-right text-texto-2">{formatarMoeda(o.saved_value, locale)}</TD>
                  <TD className="numero text-right font-medium">
                    {!a ? "—" : a.tipo === "aporte" ? `${formatarMoeda(a.valor, locale)}${t("objetivos.porMes")}` : t(a.tipo === "coberto" ? "objetivos.coberto" : "objetivos.prazoVencido")}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>
      <p className="text-xs text-texto-3">{t("objetivos.nota")}</p>
    </section>
  );
}

function Alocacao({ alocacao, grande }: { alocacao: LinhaAlocacao[]; grande?: boolean }) {
  const t = useTranslations("planejamento");
  const tc = useTranslations("carteira.classes");
  const locale = useLocale();
  if (!alocacao.length) return null;
  const g = totaisPorGrupo(alocacao);
  return (
    <section className="flex flex-col gap-3">
      <h3 className={cn("font-titulo font-semibold text-texto", grande ? "text-2xl" : "text-base")}>{t("alocacao.titulo")}</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {GRUPOS.filter((gr) => g[gr] > 0 || gr !== "outros").map((gr) => {
          const linhas = alocacao.filter((l) => GRUPO_DA_CLASSE[l.asset_class] === gr).sort((a, b) => CLASSES.indexOf(a.asset_class) - CLASSES.indexOf(b.asset_class));
          return (
            <div key={gr} className="rounded-marca border border-borda px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className={cn("font-medium text-texto", grande ? "text-lg" : "text-sm")}>{t(`grupos.${gr}`)}</p>
                <p className={cn("numero font-semibold text-texto", grande ? "text-2xl" : "text-lg")}>{formatarPct(g[gr], locale, { casas: 0 })}</p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-superficie-2">
                <div className="h-1.5 rounded-full bg-marinho" style={{ width: `${Math.min(100, g[gr])}%` }} />
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {linhas.length ? (
                  linhas.map((l) => (
                    <li key={l.asset_class} className={cn("flex items-baseline justify-between gap-2", grande ? "text-base" : "text-sm")}>
                      <span className="text-texto-2">
                        {tc(l.asset_class)}
                        {l.premise_kind ? <span className="ml-1.5 text-xs text-texto-3">· {textoPremissa(t, l.premise_kind, l.premise_value!, locale)}</span> : null}
                      </span>
                      <span className="numero text-texto">{formatarPct(l.target_pct, locale, { casas: l.target_pct % 1 ? 1 : 0 })}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-texto-3">{t("alocacao.nenhuma")}</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function textoPremissa(t: ReturnType<typeof useTranslations>, kind: Premissa, valor: number, locale: string) {
  const v = formatarPct(valor, locale, { casas: valor % 1 ? 2 : 0 });
  return t(`premissas.texto.${kind}`, { valor: v });
}

function Aposentadoria({ dados, taxa, aporte, hoje, grande }: { dados: DadosPlanejamentoTela; taxa: TaxaCarteira; aporte: number | null; hoje: string; grande?: boolean }) {
  const t = useTranslations("planejamento.aposentadoria");
  const locale = useLocale();
  const idade = dados.diagnostico?.retirement_age ?? null;
  const nascimento = dados.cliente?.birth_date ?? null;
  let corpo: React.ReactNode;
  if (!idade) corpo = t("semIdade");
  else if (!nascimento) corpo = t("semNascimento");
  else if (!taxa.ok) corpo = t("semTaxa");
  else {
    const alvo = dataDaIdade(nascimento, idade);
    const meses = mesesAte(hoje, alvo);
    if (meses === 0) corpo = t("idadePassou", { idade });
    else {
      const inicial = dados.patrimonioAtual?.valor ?? 0;
      const valor = patrimonioFuturo(inicial, aporte ?? 0, taxa.real, meses);
      corpo = (
        <>
          <p className={cn("numero font-semibold text-texto", grande ? "text-4xl" : "text-2xl")}>{formatarMoeda(valor, locale)}</p>
          <p className={cn("mt-1 text-texto-2", grande ? "text-lg" : "text-sm")}>
            {t("resultado", {
              idade,
              data: formatarData(alvo, locale, { month: "short", year: "numeric" }),
              aporte: formatarMoeda(aporte ?? 0, locale),
              inicial: formatarMoeda(inicial, locale),
            })}
          </p>
          <p className="mt-1 text-xs text-texto-3">
            {dados.patrimonioAtual ? t("fonteInicial", { data: formatarData(dados.patrimonioAtual.data, locale) }) : t("semFotografia")}
          </p>
        </>
      );
    }
  }
  return (
    <section className="flex flex-col gap-2">
      <h3 className={cn("font-titulo font-semibold text-texto", grande ? "text-2xl" : "text-base")}>{t("titulo")}</h3>
      <div className="rounded-marca border border-borda bg-superficie-2 px-4 py-3">{typeof corpo === "string" ? <p className="text-sm text-texto-3">{corpo}</p> : corpo}</div>
    </section>
  );
}

// ---------------------------------------------------------------- Edição

type LinhaForm = { pct: string; kind: Premissa | ""; valor: string };
type ObjetivoForm = Objetivo & { chave: string; valorTxt: string; guardadoTxt: string };

function Editor({ clienteId, dados, hoje, aoFechar }: { clienteId: string; dados: DadosPlanejamentoTela; hoje: string; aoFechar: () => void }) {
  const t = useTranslations("planejamento");
  const tc = useTranslations("carteira.classes");
  const locale = useLocale();
  const router = useRouter();
  const p = dados.plano;
  const [texto, setTexto] = useState(p ? p.content_md : MODELO_PLANEJAMENTO);
  const [aporte, setAporte] = useState(paraCampo(num(p?.monthly_contribution)));
  const [cdi, setCdi] = useState(paraCampo(num(p?.cdi_ref) ?? dados.referenciaBcb.cdi));
  const [ipca, setIpca] = useState(paraCampo(num(p?.ipca_ref) ?? dados.referenciaBcb.ipca));
  const [linhas, setLinhas] = useState<Record<ClasseAtivo, LinhaForm>>(
    () =>
      Object.fromEntries(
        CLASSES.map((c) => {
          const l = dados.alocacao.find((a) => a.asset_class === c);
          return [c, { pct: l ? paraCampo(l.target_pct).replace(/,00$/, "") : "", kind: l?.premise_kind ?? "", valor: l?.premise_value !== null && l?.premise_value !== undefined ? paraCampo(l.premise_value).replace(/,00$/, "") : "" }];
        }),
      ) as Record<ClasseAtivo, LinhaForm>,
  );
  const [objetivos, setObjetivos] = useState<ObjetivoForm[]>(() =>
    dados.objetivos.map((o, i) => ({ ...o, chave: `o${i}`, valorTxt: paraCampo(o.target_value), guardadoTxt: paraCampo(o.saved_value) })),
  );
  const [resultado, setResultado] = useState<ResultadoPlanejamento | null>(null);
  const [pendente, iniciar] = useTransition();

  const alocacao: LinhaAlocacao[] = CLASSES.map((c) => ({
    asset_class: c,
    target_pct: lerNumero(linhas[c].pct) ?? 0,
    premise_kind: linhas[c].kind || null,
    premise_value: linhas[c].kind ? lerNumero(linhas[c].valor) : null,
  }));
  const soma = alocacao.reduce((s, l) => s + l.target_pct, 0);
  const g = totaisPorGrupo(alocacao);
  const taxa = taxaDaCarteira(alocacao, lerNumero(cdi), lerNumero(ipca));
  const textoTaxa = useTextoTaxa();
  const objetivosNum: Objetivo[] = objetivos.map((o) => ({ name: o.name, target_value: lerNumero(o.valorTxt) ?? 0, target_date: o.target_date, saved_value: lerNumero(o.guardadoTxt) ?? 0 }));

  const mudarLinha = (c: ClasseAtivo, campo: keyof LinhaForm, v: string) => setLinhas((l) => ({ ...l, [c]: { ...l[c], [campo]: v } }));
  const mudarObjetivo = (chave: string, campo: keyof ObjetivoForm, v: string) => setObjetivos((l) => l.map((o) => (o.chave === chave ? { ...o, [campo]: v } : o)));

  function salvar() {
    setResultado(null);
    iniciar(async () => {
      const r = await salvarPlanejamento(clienteId, {
        content_md: texto,
        monthly_contribution: aporte,
        cdi_ref: cdi,
        ipca_ref: ipca,
        allocations: alocacao.filter((l) => l.target_pct > 0 || l.premise_kind).map((l) => ({ ...l, premise_value: l.premise_kind ? linhas[l.asset_class].valor : null })),
        goals: objetivos.map((o) => ({ name: o.name, target_value: o.valorTxt, target_date: o.target_date, saved_value: o.guardadoTxt })),
      });
      setResultado(r);
      if (r.ok) {
        aoFechar();
        router.refresh();
      }
    });
  }

  const erros = resultado && !resultado.ok ? [...new Set([...(resultado.mensagem ? [resultado.mensagem] : []), ...Object.values(resultado.erros ?? {})])] : [];
  const diag = dados.diagnostico;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{t("editarDica")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          {erros.length ? (
            <Alert tom="erro">
              <ul className="list-disc pl-4">
                {erros.map((e) => (
                  <li key={e}>{t(`erros.${e}`)}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <EditorMarkdown
            valor={texto}
            aoMudar={setTexto}
            modelo={MODELO_PLANEJAMENTO}
            lateral={{
              rotulo: t("verDiagnostico"),
              conteudo: diag?.content_md.trim() ? <Markdown texto={diag.content_md} /> : <p className="text-sm text-texto-3">{t("semDiagnosticoCurto")}</p>,
            }}
          />

          {/* Aporte e referências */}
          <section className="flex flex-col gap-3">
            <h3 className="font-titulo text-base font-semibold text-texto">{t("secaoPremissas")}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:max-w-3xl">
              <Field rotulo={t("aporteMensal")} dica={t("aporteDica")}>
                {(f) => <Input {...f} inputMode="decimal" placeholder="0,00" value={aporte} onChange={(e) => setAporte(e.target.value.replace(/[^\d.,]/g, ""))} />}
              </Field>
              <Field rotulo={t("cdiRef")} dica={dados.referenciaBcb.cdi !== null ? t("refBcb", { valor: formatarPct(dados.referenciaBcb.cdi, locale, { casas: 2 }) }) : t("refBcbIndisponivel")}>
                {(f) => <Input {...f} inputMode="decimal" value={cdi} onChange={(e) => setCdi(e.target.value.replace(/[^\d.,]/g, ""))} />}
              </Field>
              <Field rotulo={t("ipcaRef")} dica={dados.referenciaBcb.ipca !== null ? t("refBcb", { valor: formatarPct(dados.referenciaBcb.ipca, locale, { casas: 2 }) }) : t("refBcbIndisponivel")}>
                {(f) => <Input {...f} inputMode="decimal" value={ipca} onChange={(e) => setIpca(e.target.value.replace(/[^\d.,]/g, ""))} />}
              </Field>
            </div>
          </section>

          {/* Alocação */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-titulo text-base font-semibold text-texto">{t("alocacao.titulo")}</h3>
                <p className="text-xs text-texto-3">{t("alocacao.dica")}</p>
              </div>
              {dados.cliente?.investor_profile ? (
                <div className="flex items-center gap-2 text-xs text-texto-3">
                  {t("perfil")}: <EtiquetaPerfil cliente={{ investor_profile: dados.cliente.investor_profile }} />
                </div>
              ) : null}
            </div>
            <div className="overflow-x-auto rounded-marca border border-borda">
              <Table>
                <THead>
                  <tr>
                    <TH>{t("alocacao.classe")}</TH>
                    <TH className="w-28">{t("alocacao.percentual")}</TH>
                    <TH className="w-44">{t("premissas.tipo")}</TH>
                    <TH className="w-28">{t("premissas.valor")}</TH>
                  </tr>
                </THead>
                <TBody>
                  {CLASSES.map((c) => (
                    <TR key={c}>
                      <TD>
                        <span className="text-texto">{tc(c)}</span>
                        <span className="ml-2 text-xs text-texto-3">{t(`grupos.${GRUPO_DA_CLASSE[c]}Curto`)}</span>
                      </TD>
                      <TD>
                        <Input aria-label={`${t("alocacao.percentual")} · ${tc(c)}`} inputMode="decimal" placeholder="0" value={linhas[c].pct} onChange={(e) => mudarLinha(c, "pct", e.target.value.replace(/[^\d.,]/g, ""))} className="h-8 text-[13px]" />
                      </TD>
                      <TD>
                        <Select tamanho="sm" aria-label={`${t("premissas.tipo")} · ${tc(c)}`} value={linhas[c].kind || "nenhuma"} onValueChange={(v) => mudarLinha(c, "kind", v === "nenhuma" ? "" : v)}>
                          <SelectItem value="nenhuma">{t("premissas.nenhuma")}</SelectItem>
                          {PREMISSAS.map((k) => (
                            <SelectItem key={k} value={k}>
                              {t(`premissas.rotulo.${k}`)}
                            </SelectItem>
                          ))}
                        </Select>
                      </TD>
                      <TD>
                        <Input aria-label={`${t("premissas.valor")} · ${tc(c)}`} inputMode="decimal" disabled={!linhas[c].kind} placeholder={linhas[c].kind === "cdi_pct" ? "100" : "0"} value={linhas[c].valor} onChange={(e) => mudarLinha(c, "valor", e.target.value.replace(/[^\d.,-]/g, ""))} className="h-8 text-[13px]" />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className={cn("numero font-medium", Math.abs(soma - 100) <= 0.01 ? "text-ok" : "text-atencao")}>
                {t("alocacao.total", { total: formatarPct(soma, locale, { casas: soma % 1 ? 2 : 0 }) })}
              </span>
              {GRUPOS.map((gr) => (
                <span key={gr} className="numero text-texto-2">
                  {t(`grupos.${gr}Curto`)} {formatarPct(g[gr], locale, { casas: g[gr] % 1 ? 1 : 0 })}
                </span>
              ))}
              <span className="text-texto">
                {t("rentabilidade")}: <strong className="font-semibold">{textoTaxa(taxa)}</strong>
              </span>
            </div>
          </section>

          {/* Objetivos */}
          <section className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="font-titulo text-base font-semibold text-texto">{t("objetivos.titulo")}</h3>
                <p className="text-xs text-texto-3">{t("objetivos.dica")}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={objetivos.length >= 30}
                onClick={() => setObjetivos((l) => [...l, { chave: crypto.randomUUID(), name: "", target_value: 0, target_date: "", saved_value: 0, valorTxt: "", guardadoTxt: "" }])}
              >
                <Plus />
                {t("objetivos.adicionar")}
              </Button>
            </div>
            {objetivos.length ? (
              <div className="flex flex-col gap-3">
                {objetivos.map((o, i) => {
                  const a = taxa.ok && o.target_date && objetivosNum[i].target_value > 0 ? aporteNecessario(objetivosNum[i], taxa.real, hoje) : null;
                  return (
                    <div key={o.chave} className="grid grid-cols-1 items-end gap-3 rounded-marca border border-borda px-3 py-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1.2fr_auto]">
                      <Field rotulo={t("objetivos.nome")}>{(f) => <Input {...f} maxLength={120} value={o.name} onChange={(e) => mudarObjetivo(o.chave, "name", e.target.value)} />}</Field>
                      <Field rotulo={t("objetivos.valor")}>{(f) => <Input {...f} inputMode="decimal" placeholder="0,00" value={o.valorTxt} onChange={(e) => mudarObjetivo(o.chave, "valorTxt", e.target.value.replace(/[^\d.,]/g, ""))} />}</Field>
                      <Field rotulo={t("objetivos.prazo")}>{(f) => <Input {...f} type="date" min={hoje} value={o.target_date} onChange={(e) => mudarObjetivo(o.chave, "target_date", e.target.value)} />}</Field>
                      <Field rotulo={t("objetivos.guardado")}>{(f) => <Input {...f} inputMode="decimal" placeholder="0,00" value={o.guardadoTxt} onChange={(e) => mudarObjetivo(o.chave, "guardadoTxt", e.target.value.replace(/[^\d.,]/g, ""))} />}</Field>
                      <div className="pb-2 text-sm">
                        <p className="text-xs text-texto-3">{t("objetivos.aporte")}</p>
                        <p className="numero font-medium text-texto">{!a ? "—" : a.tipo === "aporte" ? `${formatarMoeda(a.valor, locale)}${t("objetivos.porMes")}` : t(a.tipo === "coberto" ? "objetivos.coberto" : "objetivos.prazoVencido")}</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" aria-label={t("objetivos.remover")} onClick={() => setObjetivos((l) => l.filter((x) => x.chave !== o.chave))} className="mb-1 text-erro hover:text-erro">
                        <Trash2 />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-texto-3">{t("objetivos.vazio")}</p>
            )}
          </section>

          <Aviso />

          <div className="flex justify-end gap-2 border-t border-divisoria pt-4">
            <Button type="button" variant="ghost" onClick={aoFechar}>
              {t("cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("salvar")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- Histórico

type Snapshot = { content_md: string; monthly_contribution: number | null; allocations: LinhaAlocacao[]; goals: Objetivo[] };

function Historico({ aberto, aoMudar, versoes }: { aberto: boolean; aoMudar: (v: boolean) => void; versoes: DadosPlanejamentoTela["versoes"] }) {
  const t = useTranslations("planejamento.versoes");
  const te = useTranslations("planejamento.erros");
  const locale = useLocale();
  const [vista, setVista] = useState<{ versao: number; snap: Snapshot } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function ver(id: string, versao: number) {
    setErro(null);
    iniciar(async () => {
      const r = await versaoDoPlanejamento(id);
      if (r.ok) setVista({ versao, snap: r.dados as Snapshot });
      else setErro(r.mensagem ?? "salvar");
    });
  }

  return (
    <>
      <Dialog open={aberto} onOpenChange={aoMudar}>
        <DialogContent titulo={t("titulo")} descricao={t("descricao")}>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-5 py-4">
            {erro ? <Alert tom="erro">{te(erro)}</Alert> : null}
            {versoes.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-marca border border-borda px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-texto">{t("versao", { versao: v.version })}</p>
                  <p className="text-xs text-texto-3">{t("salvaEm", { data: formatarDataHora(v.saved_at, locale), nome: v.autor?.full_name ?? "—" })}</p>
                </div>
                <Button type="button" variant="secondary" size="sm" carregando={pendente} onClick={() => ver(v.id, v.version)}>
                  <Eye />
                  {t("ver")}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!vista} onOpenChange={(v) => !v && setVista(null)}>
        <DialogContent titulo={vista ? t("versao", { versao: vista.versao }) : ""} className="max-w-3xl">
          <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-6 py-5">
            {vista ? (
              <>
                <Markdown texto={vista.snap.content_md} />
                <Alocacao alocacao={(vista.snap.allocations ?? []).map((a) => ({ ...a, target_pct: Number(a.target_pct), premise_value: a.premise_value === null ? null : Number(a.premise_value) }))} />
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
