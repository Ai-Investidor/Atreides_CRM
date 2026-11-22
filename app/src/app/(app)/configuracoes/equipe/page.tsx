import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Convidar } from "@/components/equipe/convidar";
import { ListaConvites, ListaMembros } from "@/components/equipe/lista-equipe";
import { Page, PageHeader } from "@/components/ui/layout";
import { listarEquipe } from "@/lib/equipe/consultas";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Equipe" };

/** Administração › Equipe (Documentação/02). Só o admin abre; o banco também recusa os demais. */
export default async function EquipePage() {
  const [t, sessao] = await Promise.all([getTranslations("equipe"), obterSessao()]);
  if (!sessao) redirect("/login");
  if (sessao.perfil.role !== "admin") redirect("/painel");

  const { membros, pendentes } = await listarEquipe();

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader sobretitulo={t("sobretitulo")} titulo={t("titulo")} descricao={t("descricao")} acoes={<Convidar />} />
      <ListaConvites pendentes={pendentes} />
      <ListaMembros membros={membros} euId={sessao.perfil.id} />
    </Page>
  );
}
