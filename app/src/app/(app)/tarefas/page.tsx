import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ListaTarefas } from "@/components/tarefas/lista-tarefas";
import { Page, PageHeader } from "@/components/ui/layout";
import { leadsParaVinculo } from "@/lib/agenda/consultas";
import { clientesParaVinculo } from "@/lib/clientes/consultas";
import { obterSessao } from "@/lib/sessao";
import { listarTarefas, membrosAtivos } from "@/lib/tarefas/consultas";
import { VISOES, type Visao } from "@/lib/tarefas/regras";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tarefas" };

/** Tarefas (Documentação/09, etapa 1). */
export default async function TarefasPage({ searchParams }: PageProps<"/tarefas">) {
  const [t, sessao, params] = await Promise.all([getTranslations("tarefas"), obterSessao(), searchParams]);
  if (!sessao) redirect("/login");

  const admin = sessao.perfil.role === "admin";
  const pedida = (typeof params.visao === "string" ? params.visao : "minhas") as Visao;
  const visao: Visao = VISOES.includes(pedida) && (pedida !== "equipe" || admin) ? pedida : "minhas";
  const consultorId = visao === "equipe" && typeof params.consultor === "string" ? params.consultor : null;

  const [tarefas, membros, leads, clientes] = await Promise.all([
    listarTarefas({ visao, workspaceId: sessao.atual.id, usuarioId: sessao.perfil.id, consultorId }),
    membrosAtivos(),
    leadsParaVinculo(sessao.atual.id),
    clientesParaVinculo(sessao.atual.id),
  ]);

  const abas = VISOES.filter((v) => v !== "equipe" || admin);

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader sobretitulo={t("sobretitulo")} titulo={t("titulo")} descricao={t("descricao")} />

      <nav aria-label={t("visoes.label")} className="flex gap-1 border-b border-borda">
        {abas.map((v) => (
          <Link
            key={v}
            href={v === "minhas" ? "/tarefas" : `/tarefas?visao=${v}`}
            aria-current={visao === v ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors",
              visao === v ? "border-marinho text-texto" : "border-transparent text-texto-3 hover:text-texto",
            )}
          >
            {t(`visoes.${v}`)}
          </Link>
        ))}
      </nav>

      <ListaTarefas
        key={`${visao}-${consultorId ?? ""}`}
        tarefas={tarefas}
        visao={visao}
        consultorId={consultorId}
        contexto={{
          usuarioId: sessao.perfil.id,
          admin,
          membros,
          leads: leads.map((l) => ({ id: l.id, full_name: l.full_name })),
          clientes: clientes.map((c) => ({ id: c.id, full_name: c.full_name })),
          responsavelPadrao: sessao.atual.owner_id,
        }}
      />
    </Page>
  );
}
