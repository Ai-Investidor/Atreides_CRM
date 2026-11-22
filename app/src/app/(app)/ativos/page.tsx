import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BuscaAtivos } from "@/components/ativos/busca-ativos";
import { ListaAcompanhamento } from "@/components/ativos/lista-acompanhamento";
import { Page, PageHeader } from "@/components/ui/layout";
import { minhaLista } from "@/lib/ativos/consultas";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Ativos" };

/** Pesquisa de ativos (Documentação/13). */
export default async function AtivosPage() {
  const [t, sessao] = await Promise.all([getTranslations("ativos"), obterSessao()]);
  if (!sessao) redirect("/login");
  const { itens, falhou } = await minhaLista();
  return (
    <Page className="flex flex-col gap-6">
      <PageHeader sobretitulo={t("sobretitulo")} titulo={t("titulo")} descricao={t("descricao")} />
      <BuscaAtivos />
      <ListaAcompanhamento itens={itens} falhou={falhou} />
      <p className="text-xs text-texto-3">{t("aviso")}</p>
    </Page>
  );
}
