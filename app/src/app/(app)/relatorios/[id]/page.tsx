import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { EditorRelatorio } from "@/components/relatorios/editor-relatorio";
import { EtiquetaRelatorio } from "@/components/relatorios/etiqueta-status";
import { PreviaRelatorio } from "@/components/relatorios/previa";
import { Page } from "@/components/ui/layout";
import { previa } from "@/lib/relatorios/acoes";
import { obterRelatorio } from "@/lib/relatorios/consultas";
import { formatarData } from "@/lib/formatos";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Relatório" };

/** Relatório do cliente: prévia, comentário, aprovação e envio (Documentação/08). */
export default async function RelatorioPage({ params }: PageProps<"/relatorios/[id]">) {
  const { id } = await params;
  const [t, locale, sessao, rel] = await Promise.all([getTranslations("relatorios"), getLocale(), obterSessao(), obterRelatorio(id)]);
  if (!sessao) redirect("/login");
  if (!rel || !rel.cliente) notFound();
  const dados = await previa(id);
  if (!dados) notFound();

  return (
    <Page className="flex max-w-none flex-col gap-6 2xl:px-12">
      <Link href={`/clientes/${rel.cliente.id}?aba=relatorios`} className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-texto-3 hover:text-texto">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {rel.cliente.full_name}
      </Link>
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-latao-escuro">{t("sobretitulo")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-titulo text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-texto">
            {formatarData(rel.period_start, locale)} – {formatarData(rel.period_end, locale)}
          </h1>
          <EtiquetaRelatorio status={rel.status} enviado={!!rel.sent_at} />
          <span className="text-sm text-texto-3">{t("versao", { n: rel.version })}</span>
        </div>
        <p className="text-[15px] text-texto-2">{rel.status === "draft" ? t("descricaoRascunho") : t("descricaoAprovado")}</p>
      </header>

      <PreviaRelatorio d={dados} />

      <EditorRelatorio
        id={rel.id}
        status={rel.status}
        comentario={rel.comment ?? ""}
        cliente={{ id: rel.cliente.id, nome: rel.cliente.full_name, telefone: rel.cliente.phone, email: rel.cliente.email }}
        periodo={{ inicio: rel.period_start, fim: rel.period_end }}
        aprovadoEm={rel.approved_at}
        aprovadoPor={rel.aprovador?.full_name ?? null}
        enviadoEm={rel.sent_at}
        canais={rel.sent_channels}
        bloqueado={dados.avisos.includes("semFotos")}
      />
    </Page>
  );
}
