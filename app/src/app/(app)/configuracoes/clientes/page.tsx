import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConfigClientes } from "@/components/clientes/config-clientes";
import { Page, PageHeader } from "@/components/ui/layout";
import { requisitosDocumentos, todasVersoes } from "@/lib/clientes/consultas";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Configurações de clientes" };

/** Administração › Clientes: documentos obrigatórios e questionário (Documentação/03). */
export default async function ConfigClientesPage() {
  const [t, sessao] = await Promise.all([getTranslations("clientes.config"), obterSessao()]);
  if (!sessao) redirect("/login");
  if (sessao.perfil.role !== "admin") redirect("/painel");
  const [requisitos, versoes] = await Promise.all([requisitosDocumentos(), todasVersoes()]);
  return (
    <Page className="flex flex-col gap-6">
      <PageHeader sobretitulo={t("sobretitulo")} titulo={t("titulo")} descricao={t("descricao")} />
      <ConfigClientes requisitos={requisitos} versoes={versoes} />
    </Page>
  );
}
