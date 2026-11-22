import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CalendarClock,
  Circle,
  CircleCheck,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Page, PageHeader, StatCard } from "@/components/ui/layout";
import { Simbolo } from "@/components/simbolo";
import { citacaoDoDia } from "@/lib/citacoes";
import { obterSessao } from "@/lib/sessao";
import { contarAbertos, listarRetornos } from "@/lib/leads/consultas";
import { CardRetornos } from "@/components/leads/card-retornos";
import { CardAgendaHoje } from "@/components/agenda/card-agenda-hoje";
import { contarProximos7Dias, reunioesDeHoje } from "@/lib/agenda/consultas";
import { CardTarefas } from "@/components/tarefas/card-tarefas";
import { membrosAtivos, tarefasDeHoje } from "@/lib/tarefas/consultas";
import { contarAtivos, existeMigrado } from "@/lib/clientes/consultas";

export const metadata: Metadata = { title: "Painel" };

const FUSO = "America/Sao_Paulo";

function saudacao(): "manha" | "tarde" | "noite" {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: FUSO }).format(new Date()));
  return hora < 12 ? "manha" : hora < 18 ? "tarde" : "noite";
}

function dataPorExtenso(locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: FUSO }).format(new Date());
}

export default async function PainelPage() {
  const [t, locale, sessao] = await Promise.all([getTranslations("painel"), getLocale(), obterSessao()]);
  const [leadsAbertos, retornos, reunioesHoje, reunioesSemana, tarefasHoje, membros, clientesAtivos, migrou] = sessao
    ? await Promise.all([
        contarAbertos(sessao.atual.id),
        listarRetornos(sessao.atual.id),
        reunioesDeHoje(sessao.atual.id),
        contarProximos7Dias(sessao.atual.id),
        tarefasDeHoje(sessao.atual.id, sessao.perfil.id),
        membrosAtivos(),
        contarAtivos(sessao.atual.id),
        existeMigrado(),
      ])
    : [0, [], [], 0, [], [], 0, false];
  const primeiroNome = sessao?.perfil.full_name.split(" ")[0] ?? "";
  const hoje = dataPorExtenso(locale);

  const citacao = citacaoDoDia();
  const tLogin = await getTranslations("login");

  const primeirosPassos = [
    { chave: "passoLogin", feito: true },
    { chave: "passoConsultores", feito: (sessao?.workspaces.length ?? 0) > 1 },
    { chave: "passoLead", feito: leadsAbertos > 0 },
    { chave: "passoMigracao", feito: migrou },
  ] as const;
  const feitos = primeirosPassos.filter((p) => p.feito).length;

  return (
    <Page className="flex flex-col gap-8">
      <PageHeader
        sobretitulo={hoje}
        titulo={t(`saudacao.${saudacao()}`, { nome: primeiroNome })}
        descricao={t("descricao")}
        acoes={
          <>
            <Button asChild variant="secondary">
              <Link href="/agenda?novo=1">
                <CalendarDays />
                {t("agendar")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/leads?novo=1">
                <Target />
                {t("novoLead")}
              </Link>
            </Button>
          </>
        }
      />

      {/* Indicadores */}
      <section aria-label={t("indicadores")} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard destaque rotulo={t("stats.patrimonio")} valor="—" Icone={Wallet} detalhe={t("stats.patrimonioDetalhe")} />
        <StatCard rotulo={t("stats.clientes")} valor={String(clientesAtivos)} Icone={Users} detalhe={t("stats.clientesDetalhe")} />
        <StatCard rotulo={t("stats.leads")} valor={String(leadsAbertos)} Icone={Target} detalhe={t("stats.leadsDetalhe", { retornos: retornos.length })} />
        <StatCard rotulo={t("stats.reunioes")} valor={String(reunioesHoje.length)} Icone={CalendarClock} detalhe={t("stats.reunioesDetalhe", { semana: reunioesSemana })} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Coluna principal */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          <CardAgendaHoje reunioes={reunioesHoje} />

          <CardRetornos leads={retornos} />

          {sessao ? (
            <CardTarefas
              modo="painel"
              tarefas={tarefasHoje}
              contexto={{
                usuarioId: sessao.perfil.id,
                admin: sessao.perfil.role === "admin",
                membros,
                leads: [],
                responsavelPadrao: sessao.atual.owner_id,
              }}
            />
          ) : null}
        </div>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t("passos.titulo")}</CardTitle>
                <CardDescription>{t("passos.progresso", { feitos, total: primeirosPassos.length })}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-divisoria" role="progressbar" aria-valuemin={0} aria-valuemax={primeirosPassos.length} aria-valuenow={feitos}>
                <div className="h-full rounded-full bg-marinho" style={{ width: `${(feitos / primeirosPassos.length) * 100}%` }} />
              </div>
              <ul className="flex flex-col gap-3">
                {primeirosPassos.map(({ chave, feito }) => (
                  <li key={chave} className="flex items-start gap-3 text-sm">
                    {feito ? (
                      <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-ok" aria-hidden="true" />
                    ) : (
                      <Circle className="mt-0.5 size-[18px] shrink-0 text-borda-forte" aria-hidden="true" />
                    )}
                    <span className={feito ? "text-texto-3 line-through decoration-borda-forte" : "text-texto"}>
                      {t(`passos.${chave}`)}
                      <span className="sr-only">{feito ? ` (${t("passos.feito")})` : ""}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t("atencao.titulo")}</CardTitle>
                <CardDescription>{t("atencao.descricao")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <EmptyState compacto Icone={AlertTriangle} titulo={t("atencao.vazioTitulo")} descricao={t("atencao.vazioDescricao")} />
            </CardContent>
          </Card>

          {/* Citação do dia */}
          <figure className="relative overflow-hidden rounded-card bg-marinho p-6 text-osso shadow-card">
            <Simbolo tamanho={180} corPilares="#F3EFE6" className="pointer-events-none absolute -bottom-10 -right-8 opacity-[0.05]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-latao">{t("citacaoDoDia")}</p>
            <blockquote className="mt-3 font-titulo text-lg font-medium leading-snug">
              {locale === "en" ? citacao.en : citacao.pt}
            </blockquote>
            <figcaption className="mt-3 text-xs text-nevoa">
              — {tLogin("quoteAuthor")}, {tLogin(citacao.obra)} {citacao.canto}, {citacao.versos}
            </figcaption>
          </figure>
        </div>
      </div>

      {/* Atalho para a referência de componentes (time de desenvolvimento) */}
      <p className="text-xs text-texto-3">
        <Link href="/componentes" className="inline-flex items-center gap-1 underline-offset-4 hover:text-texto hover:underline">
          <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
          {t("verComponentes")}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </p>
    </Page>
  );
}
