import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Importar } from "@/components/clientes/importar";
import { Page, PageHeader } from "@/components/ui/layout";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Importar clientes" };

/** Migração dos clientes existentes por planilha (Documentação/03). */
export default async function ImportarPage() {
  const [t, sessao] = await Promise.all([getTranslations("clientes.importar"), obterSessao()]);
  if (!sessao) redirect("/login");
  return (
    <Page className="flex flex-col gap-6">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-texto-3 hover:text-texto">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("voltar")}
      </Link>
      <PageHeader sobretitulo={t("sobretitulo")} titulo={t("titulo")} descricao={t("descricao", { workspace: sessao.atual.name })} />
      <Importar />
    </Page>
  );
}
