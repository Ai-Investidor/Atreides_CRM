import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ClipboardX } from "lucide-react";
import { Questionario } from "@/components/clientes/questionario";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Page, PageHeader } from "@/components/ui/layout";
import { createClient } from "@/lib/supabase/server";
import { versaoAtiva } from "@/lib/clientes/consultas";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Questionário de perfil" };

/** Aplicar o questionário de perfil (Documentação/03). */
export default async function QuestionarioPage({ params }: PageProps<"/clientes/[id]/questionario">) {
  const { id } = await params;
  const [t, sessao] = await Promise.all([getTranslations("clientes.questionario"), obterSessao()]);
  if (!sessao) redirect("/login");
  const supabase = await createClient();
  const [{ data: cliente }, versao] = await Promise.all([supabase.from("clients").select("id, full_name, status").eq("id", id).maybeSingle(), versaoAtiva()]);
  if (!cliente) notFound();
  if (cliente.status === "closed") redirect(`/clientes/${id}?aba=perfil`);

  return (
    <Page className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href={`/clientes/${id}?aba=perfil`} className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-texto-3 hover:text-texto">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {cliente.full_name}
      </Link>
      <PageHeader sobretitulo={t("sobretitulo")} titulo={t("titulo")} descricao={t("descricao", { nome: cliente.full_name })} />
      {versao ? (
        <Questionario versao={versao} clienteId={id} />
      ) : (
        <Card>
          <EmptyState Icone={ClipboardX} titulo={t("semVersaoTitulo")} descricao={t("semVersaoDescricao")} />
        </Card>
      )}
    </Page>
  );
}
