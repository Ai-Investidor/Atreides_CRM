import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  Mail,
  MessageCircle,
  NotebookPen,
  Phone,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AcoesLeadProvider } from "@/components/leads/acoes-lead";
import { BotoesFicha } from "@/components/leads/botoes-ficha";
import { EtiquetaEtapa, EtiquetaParado, SituacaoContato } from "@/components/leads/etiquetas";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Page } from "@/components/ui/layout";
import { formatarData, formatarDataHora, formatarTelefone, linkWhatsApp } from "@/lib/formatos";
import { obterLead } from "@/lib/leads/consultas";
import { estaAberto, type TipoContato } from "@/lib/leads/regras";
import { obterSessao } from "@/lib/sessao";
import { CardTarefas } from "@/components/tarefas/card-tarefas";
import { CardDiagnostico } from "@/components/diagnostico/card-diagnostico";
import { obterDiagnostico } from "@/lib/diagnostico/consultas";
import { membrosAtivos, tarefasDoLead } from "@/lib/tarefas/consultas";

export const metadata: Metadata = { title: "Lead" };

const ICONE_HISTORICO: Record<TipoContato, LucideIcon> = {
  whatsapp: MessageCircle,
  call: Phone,
  meeting: Users,
  email: Mail,
  note: NotebookPen,
  stage_change: ArrowRightLeft,
  created: Sparkles,
  meeting_scheduled: CalendarPlus,
  task_done: CircleCheck,
};

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const [t, locale, sessao, dados] = await Promise.all([getTranslations("leads"), getLocale(), obterSessao(), obterLead(id)]);
  if (!sessao) redirect("/login");
  if (!dados) notFound();

  const { lead, historico } = dados;
  const [tarefas, membros, diagnostico] = await Promise.all([tarefasDoLead(lead.id), membrosAtivos(), obterDiagnostico({ tipo: "lead", id: lead.id })]);
  const workspace = sessao.workspaces.find((w) => w.id === lead.workspace_id);
  const aberto = estaAberto(lead.stage);

  const linhas: { rotulo: string; valor: React.ReactNode }[] = [
    {
      rotulo: t("campos.celular"),
      valor: (
        <a href={linkWhatsApp(lead.phone)} target="_blank" rel="noopener noreferrer" className="numero inline-flex items-center gap-1.5 hover:underline">
          {formatarTelefone(lead.phone)}
          <MessageCircle className="size-3.5 text-ok" aria-label="WhatsApp" />
        </a>
      ),
    },
    { rotulo: t("campos.email"), valor: lead.email ? <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a> : "—" },
    { rotulo: t("campos.origem"), valor: t(`origens.${lead.source}`) },
    { rotulo: t("campos.indicadoPor"), valor: lead.referred_by ?? "—" },
    { rotulo: t("ficha.workspace"), valor: workspace?.name ?? "—" },
    { rotulo: t("ficha.cadastradoEm"), valor: formatarDataHora(lead.created_at, locale) },
  ];

  return (
    <AcoesLeadProvider>
      <Page className="flex flex-col gap-6">
        <Link href="/leads" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-texto-2 hover:text-texto">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("ficha.voltar")}
        </Link>

        {/* Cabeçalho */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar nome={lead.full_name} tamanho="lg" />
            <div className="min-w-0">
              <h1 className="truncate font-titulo text-[1.75rem] font-bold leading-tight tracking-[-0.02em]">{lead.full_name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <EtiquetaEtapa etapa={lead.stage} />
                <SituacaoContato lead={lead} />
                <EtiquetaParado lead={lead} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BotoesFicha lead={lead} />
          </div>
        </header>

        {lead.stage === "lost" ? (
          <Alert tom="erro" titulo={t("ficha.perdidoTitulo", { motivo: lead.lost_reason ? t(`motivos.${lead.lost_reason}`) : "" })}>
            {lead.lost_note ?? t("ficha.perdidoSemDetalhe")}
          </Alert>
        ) : null}
        {lead.stage === "won" ? <Alert tom="ok" titulo={t("ficha.ganhoTitulo")}>{t("ficha.ganhoTexto")}</Alert> : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="flex flex-col gap-6 xl:col-span-2">
          <CardDiagnostico alvo={{ tipo: "lead", id: lead.id }} dados={diagnostico} nome={lead.full_name} podeEditar={aberto && !lead.client_id} />

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle>{t("ficha.historico")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-divisoria">
                {historico.map((h) => {
                  const Icone = ICONE_HISTORICO[h.type];
                  const automatico = h.type === "stage_change" || h.type === "created" || h.type === "meeting_scheduled" || h.type === "task_done";
                  return (
                    <li key={h.id} className="relative flex gap-4">
                      <span
                        className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border ${automatico ? "border-borda bg-superficie-2 text-texto-3" : "border-marinho bg-marinho text-osso"}`}
                      >
                        <Icone className="size-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-sm text-texto">
                          {h.type === "created"
                            ? t("historico.criado")
                            : h.type === "stage_change"
                              ? t("historico.etapa", { de: t(`etapas.${h.from_stage!}`), para: t(`etapas.${h.to_stage!}`) })
                              : <span className="font-medium">{t(`tipos.${h.type}`)}</span>}
                        </p>
                        {h.summary ? <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-texto-2">{h.summary}</p> : null}
                        <p className="mt-1 text-xs text-texto-3">
                          {formatarDataHora(h.created_at, locale)}
                          {h.autor?.full_name ? ` · ${h.autor.full_name}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
          </div>

          {/* Lateral */}
          <div className="flex flex-col gap-6">
            {aberto || tarefas.length ? (
              <CardTarefas
                modo="lead"
                vinculo={{ id: lead.id, full_name: lead.full_name }}
                tarefas={tarefas}
                contexto={{
                  usuarioId: sessao.perfil.id,
                  admin: sessao.perfil.role === "admin",
                  membros,
                  leads: [{ id: lead.id, full_name: lead.full_name }],
                  responsavelPadrao: workspace?.owner_id ?? sessao.perfil.id,
                }}
              />
            ) : null}
            {aberto ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("campos.proximoContato")}</CardTitle>
                  <SituacaoContato lead={lead} />
                </CardHeader>
                <CardContent className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 size-5 shrink-0 text-texto-3" aria-hidden="true" />
                  <div>
                    <p className="numero text-sm font-semibold">{lead.next_contact_on ? formatarData(lead.next_contact_on, locale, { weekday: "long" }) : "—"}</p>
                    <p className="mt-0.5 text-sm text-texto-2">{lead.next_contact_note ?? t("ficha.semDescricao")}</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>{t("ficha.dados")}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3 text-sm">
                  {linhas.map((l) => (
                    <div key={l.rotulo} className="flex items-start justify-between gap-4">
                      <dt className="text-texto-3">{l.rotulo}</dt>
                      <dd className="min-w-0 truncate text-right text-texto">{l.valor}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {lead.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("campos.observacoes")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-texto-2">{lead.notes}</p>
                </CardContent>
              </Card>
            ) : null}

            <Button asChild variant="secondary" className="w-full">
              <a href={linkWhatsApp(lead.phone)} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                {t("ficha.abrirWhatsapp")}
              </a>
            </Button>
          </div>
        </div>
      </Page>
    </AcoesLeadProvider>
  );
}
