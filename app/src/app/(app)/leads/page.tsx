import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlarmClock, CalendarCheck, Target, Trophy } from "lucide-react";
import { AcoesLeadProvider } from "@/components/leads/acoes-lead";
import { NovoLead } from "@/components/leads/novo-lead";
import { Quadro } from "@/components/leads/quadro";
import { Retornos } from "@/components/leads/retornos";
import { Page, PageHeader, StatCard } from "@/components/ui/layout";
import { hojeISO } from "@/lib/formatos";
import { listarLeads } from "@/lib/leads/consultas";
import { estaAberto, situacaoContato } from "@/lib/leads/regras";
import { obterSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const [t, sessao, params] = await Promise.all([getTranslations("leads"), obterSessao(), searchParams]);
  if (!sessao) redirect("/login");

  const visao = params.visao === "retornos" ? "retornos" : "quadro";
  const leads = await listarLeads(sessao.atual.id);
  const hoje = hojeISO();

  const abertos = leads.filter((l) => estaAberto(l.stage));
  const retornos = abertos
    .filter((l) => {
      const s = situacaoContato(l, hoje).tipo;
      return s === "hoje" || s === "atrasado";
    })
    .sort((a, b) => (a.next_contact_on ?? "").localeCompare(b.next_contact_on ?? ""));
  const atrasados = retornos.filter((l) => situacaoContato(l, hoje).tipo === "atrasado").length;
  const ganhos = leads.filter((l) => l.stage === "won").length;

  const abas = [
    { id: "quadro", rotulo: t("visoes.quadro"), contagem: abertos.length },
    { id: "retornos", rotulo: t("visoes.retornos"), contagem: retornos.length },
  ];

  return (
    <AcoesLeadProvider>
      <Page className="flex flex-col gap-6">
        <PageHeader
          sobretitulo={t("sobretitulo")}
          titulo={t("titulo")}
          descricao={t("descricao")}
          acoes={<NovoLead abertoInicial={params.novo === "1"} />}
        />

        <section aria-label={t("indicadores")} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard destaque rotulo={t("stats.abertos")} valor={String(abertos.length)} Icone={Target} detalhe={t("stats.abertosDetalhe")} />
          <StatCard rotulo={t("stats.retornosHoje")} valor={String(retornos.length - atrasados)} Icone={CalendarCheck} detalhe={t("stats.retornosHojeDetalhe")} />
          <StatCard rotulo={t("stats.atrasados")} valor={String(atrasados)} Icone={AlarmClock} detalhe={t("stats.atrasadosDetalhe")} />
          <StatCard rotulo={t("stats.ganhos")} valor={String(ganhos)} Icone={Trophy} detalhe={t("stats.ganhosDetalhe")} />
        </section>

        <nav aria-label={t("visoes.label")} className="flex gap-1 border-b border-borda">
          {abas.map((aba) => {
            const ativa = visao === aba.id;
            return (
              <Link
                key={aba.id}
                href={aba.id === "quadro" ? "/leads" : "/leads?visao=retornos"}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
                  ativa ? "border-marinho text-texto" : "border-transparent text-texto-3 hover:text-texto",
                )}
              >
                {aba.rotulo}
                <span
                  className={cn(
                    "numero rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    aba.id === "retornos" && atrasados > 0 ? "bg-erro-fundo text-erro" : "bg-divisoria text-texto-2",
                  )}
                >
                  {aba.contagem}
                </span>
              </Link>
            );
          })}
        </nav>

        {visao === "quadro" ? <Quadro leads={leads} /> : <Retornos leads={retornos} />}
      </Page>
    </AcoesLeadProvider>
  );
}
