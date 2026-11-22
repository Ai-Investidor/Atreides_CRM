import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, Compass, Mail, MessageCircle, Stethoscope, Video } from "lucide-react";
import { AbaDados } from "@/components/clientes/aba-dados";
import { AbaDocumentos } from "@/components/clientes/aba-documentos";
import { AbaPerfil } from "@/components/clientes/aba-perfil";
import { Anotacoes } from "@/components/clientes/anotacoes";
import { CabecalhoCliente } from "@/components/clientes/cabecalho-cliente";
import { EtiquetaPerfil } from "@/components/clientes/etiquetas";
import { LinhaTempo } from "@/components/clientes/linha-tempo";
import { CardProcesso } from "@/components/clientes/processo";
import { CardTarefas } from "@/components/tarefas/card-tarefas";
import { PainelCarteira } from "@/components/carteira/painel-carteira";
import { carteiraDoCliente } from "@/lib/carteira/consultas";
import { RelatoriosDoCliente } from "@/components/relatorios/lista-cliente";
import { relatoriosDoCliente } from "@/lib/relatorios/consultas";
import { ultimoPeriodo } from "@/lib/relatorios/regras";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Page } from "@/components/ui/layout";
import { documentosObrigatorios, nucleosDoWorkspace, obterCliente } from "@/lib/clientes/consultas";
import { cpfMascarado } from "@/lib/clientes/regras";
import { formatarData, formatarMoeda, formatarTelefone, hojeISO, intervaloHoras, linkWhatsApp } from "@/lib/formatos";
import { obterSessao } from "@/lib/sessao";
import { membrosAtivos, tarefasDoCliente } from "@/lib/tarefas/consultas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cliente" };

/** Reuniões que ainda não terminaram (fora do render, por pureza). */
function futuras<T extends { ends_at: string }>(lista: T[]) {
  const agora = Date.now();
  return lista.filter((r) => Date.parse(r.ends_at) > agora);
}

const ABAS = ["resumo", "linha", "perfil", "diagnostico", "planejamento", "carteira", "relatorios", "documentos", "dados"] as const;
type Aba = (typeof ABAS)[number];

/** Ficha do cliente (Documentação/03). */
export default async function ClientePage({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [t, locale, sessao, ficha] = await Promise.all([getTranslations("clientes"), getLocale(), obterSessao(), obterCliente(id)]);
  if (!sessao) redirect("/login");
  if (!ficha) notFound();

  const aba: Aba = ABAS.includes(sp.aba as Aba) ? (sp.aba as Aba) : "resumo";
  const admin = sessao.perfil.role === "admin";
  const { cliente } = ficha;
  const encerrado = cliente.status === "closed";

  const [tarefas, membros, obrigatorios, nucleos, carteira, relatorios] = await Promise.all([
    aba === "resumo" ? tarefasDoCliente(cliente.id) : Promise.resolve([]),
    aba === "resumo" ? membrosAtivos() : Promise.resolve([]),
    aba === "documentos" ? documentosObrigatorios() : Promise.resolve([]),
    aba === "dados" ? nucleosDoWorkspace(cliente.workspace_id) : Promise.resolve([]),
    aba === "carteira" ? carteiraDoCliente(cliente.id) : Promise.resolve(null),
    aba === "relatorios" ? relatoriosDoCliente(cliente.id) : Promise.resolve([]),
  ]);

  const proximas = futuras(ficha.reunioes).slice(0, 3);

  return (
    <Page className="flex max-w-none flex-col gap-6 2xl:px-12">
      <CabecalhoCliente
        cliente={cliente}
        workspaceNome={ficha.workspace?.name ?? ""}
        admin={admin}
        workspaces={sessao.workspaces.map((w) => ({ id: w.id, name: w.name }))}
      />

      <nav aria-label={t("abas.label")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1 border-b border-borda">
          {ABAS.map((a) => (
            <Link
              key={a}
              href={a === "resumo" ? `/clientes/${cliente.id}` : `/clientes/${cliente.id}?aba=${a}`}
              aria-current={aba === a ? "page" : undefined}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                aba === a ? "border-marinho text-texto" : "border-transparent text-texto-3 hover:text-texto",
              )}
            >
              {t(`abas.${a}`)}
            </Link>
          ))}
        </div>
      </nav>

      {aba === "resumo" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="flex flex-col gap-6 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("resumo.dados")}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Item rotulo={t("campos.celular")}>
                    {cliente.phone ? (
                      <a href={linkWhatsApp(cliente.phone)} target="_blank" rel="noopener noreferrer" className="numero inline-flex items-center gap-1.5 hover:underline">
                        {formatarTelefone(cliente.phone)}
                        <MessageCircle className="size-3.5 text-ok" aria-label="WhatsApp" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </Item>
                  <Item rotulo={t("campos.email")}>
                    {cliente.email ? (
                      <a href={`mailto:${cliente.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                        {cliente.email}
                        <Mail className="size-3.5 text-texto-3" aria-hidden="true" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </Item>
                  <Item rotulo={t("campos.cpf")}>
                    <span className="numero">{cpfMascarado(cliente.cpf)}</span>
                  </Item>
                  <Item rotulo={t("campos.cidade")}>{[cliente.city, cliente.state].filter(Boolean).join(" / ") || "—"}</Item>
                  <Item rotulo={t("campos.inicioContrato")}>{cliente.contract_start_on ? formatarData(cliente.contract_start_on, locale) : "—"}</Item>
                  <Item rotulo={t("campos.origem")}>{cliente.source ? t(`origens.${cliente.source}`) : "—"}</Item>
                </dl>
                {cliente.lead_id ? (
                  <p className="mt-4 text-xs text-texto-3">
                    {t("resumo.vindoDeLead")}{" "}
                    <Link href={`/leads/${cliente.lead_id}`} className="font-medium text-latao-escuro hover:underline">
                      {t("resumo.verLead")}
                    </Link>
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Anotacoes notas={ficha.notas} clienteId={cliente.id} usuarioId={sessao.perfil.id} admin={admin} limite={5} somenteLeitura={encerrado} />

            {!encerrado ? (
              <CardTarefas
                modo="cliente"
                vinculo={{ id: cliente.id, full_name: cliente.full_name }}
                tarefas={tarefas}
                contexto={{
                  usuarioId: sessao.perfil.id,
                  admin,
                  membros,
                  leads: [],
                  clientes: [{ id: cliente.id, full_name: cliente.full_name }],
                  responsavelPadrao: ficha.workspace?.owner_id ?? sessao.perfil.id,
                }}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <CardProcesso processo={ficha.processo} etapas={ficha.etapas} />

            <Card>
              <CardHeader>
                <CardTitle>{t("resumo.perfilPatrimonio")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <EtiquetaPerfil cliente={cliente} />
                <dl className="flex flex-col gap-2">
                  <Item rotulo={t("campos.patrimonio")} linha>
                    <span className="numero">{formatarMoeda(cliente.declared_net_worth, locale)}</span>
                  </Item>
                  <Item rotulo={t("resumo.sobConsultoria")} linha>
                    <span className="text-texto-3">{t("resumo.aguardandoCarteira")}</span>
                  </Item>
                  <Item rotulo={t("campos.renda")} linha>
                    <span className="numero">{formatarMoeda(cliente.monthly_income, locale)}</span>
                  </Item>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("resumo.proximasReunioes")}</CardTitle>
                {!encerrado ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/agenda?novo=1&cliente=${cliente.id}`}>{t("acoes.agendar")}</Link>
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {proximas.length === 0 ? (
                  <p className="text-sm text-texto-3">{t("resumo.semReunioes")}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {proximas.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.title}</p>
                          <p className="numero flex items-center gap-1.5 text-xs text-texto-3">
                            <CalendarClock className="size-3" aria-hidden="true" />
                            {formatarData(r.starts_at.slice(0, 10), locale, { weekday: "short" })} · {intervaloHoras(r.starts_at, r.ends_at)}
                          </p>
                        </div>
                        {r.meet_url ? (
                          <Button asChild size="sm" variant="secondary">
                            <a href={r.meet_url} target="_blank" rel="noopener noreferrer">
                              <Video />
                              Meet
                            </a>
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {aba === "linha" ? <LinhaTempo eventos={ficha.linha} /> : null}
      {aba === "perfil" ? <AbaPerfil ficha={ficha} podeAplicar={!encerrado} /> : null}
      {aba === "documentos" ? <AbaDocumentos ficha={ficha} obrigatorios={obrigatorios} admin={admin} somenteLeitura={encerrado} /> : null}
      {aba === "dados" ? <AbaDados ficha={ficha} nucleos={nucleos} somenteLeitura={encerrado} /> : null}
      {aba === "carteira" && carteira ? (
        <PainelCarteira dados={carteira} usuarioId={sessao.perfil.id} admin={admin} somenteLeitura={encerrado} hoje={hojeISO()} />
      ) : null}
      {aba === "relatorios" ? (
        <RelatoriosDoCliente
          clienteId={cliente.id}
          lista={relatorios}
          sugestao={ultimoPeriodo(cliente.report_frequency, hojeISO())}
          frequencia={cliente.report_frequency}
          somenteLeitura={encerrado}
        />
      ) : null}
      {aba === "diagnostico" || aba === "planejamento" ? (
        <Card>
          <EmptyState
            Icone={aba === "diagnostico" ? Stethoscope : Compass}
            titulo={t(`emBreve.${aba}.titulo`)}
            descricao={t(`emBreve.${aba}.descricao`)}
          />
        </Card>
      ) : null}
    </Page>
  );
}

function Item({ rotulo, children, linha }: { rotulo: string; children: React.ReactNode; linha?: boolean }) {
  return (
    <div className={linha ? "flex items-center justify-between gap-3" : ""}>
      <dt className="text-xs text-texto-3">{rotulo}</dt>
      <dd className={cn("min-w-0 truncate text-texto", !linha && "mt-0.5")}>{children}</dd>
    </div>
  );
}
