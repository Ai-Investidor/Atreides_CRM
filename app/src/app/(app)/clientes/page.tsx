import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { FileUp, ShieldAlert, ShieldQuestion, UserRoundCheck, Users, Workflow } from "lucide-react";
import { EtiquetaPerfil, EtiquetaStatus } from "@/components/clientes/etiquetas";
import { FiltrosClientes } from "@/components/clientes/filtros";
import { NovoCliente } from "@/components/clientes/novo-cliente";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Page, PageHeader, StatCard } from "@/components/ui/layout";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { indicadoresClientes, listarClientes } from "@/lib/clientes/consultas";
import { cpfMascarado, PERFIS, STATUS, type Perfil, type StatusCliente } from "@/lib/clientes/regras";
import { formatarMoeda, formatarTelefone } from "@/lib/formatos";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Clientes" };

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);

/** Lista de clientes do workspace (Documentação/03). */
export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const [t, locale, sessao, params] = await Promise.all([getTranslations("clientes"), getLocale(), obterSessao(), searchParams]);
  if (!sessao) redirect("/login");

  const status = texto(params.status);
  const perfil = texto(params.perfil);
  const filtro = {
    workspaceId: sessao.atual.id,
    busca: texto(params.q),
    status: STATUS.includes(status as StatusCliente) ? (status as StatusCliente) : null,
    perfil: perfil === "sem" ? ("sem" as const) : PERFIS.includes(perfil as Perfil) ? (perfil as Perfil) : null,
    revisao: params.revisao === "vencida" ? ("vencida" as const) : null,
  };
  const [clientes, ind] = await Promise.all([listarClientes(filtro), indicadoresClientes(sessao.atual.id)]);
  const filtrando = !!(filtro.busca || filtro.status || filtro.perfil || filtro.revisao);

  return (
    <Page className="flex flex-col gap-6">
      <PageHeader
        sobretitulo={t("sobretitulo")}
        titulo={t("titulo")}
        descricao={t("descricao")}
        acoes={
          <>
            <Button asChild variant="secondary">
              <Link href="/clientes/importar">
                <FileUp />
                {t("importar")}
              </Link>
            </Button>
            <NovoCliente abertoInicial={params.novo === "1"} urlAoFechar={params.novo === "1" ? "/clientes" : undefined} />
          </>
        }
      />

      <section aria-label={t("indicadores")} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard destaque rotulo={t("stats.ativos")} valor={String(ind.ativos)} Icone={UserRoundCheck} detalhe={t("stats.ativosDetalhe")} />
        <StatCard rotulo={t("stats.onboarding")} valor={String(ind.onboarding)} Icone={Workflow} detalhe={t("stats.onboardingDetalhe")} />
        <StatCard rotulo={t("stats.semPerfil")} valor={String(ind.semPerfil)} Icone={ShieldQuestion} detalhe={t("stats.semPerfilDetalhe")} />
        <StatCard rotulo={t("stats.perfilVencendo")} valor={String(ind.perfilVencendo)} Icone={ShieldAlert} detalhe={t("stats.perfilVencendoDetalhe")} />
      </section>

      <FiltrosClientes />

      {clientes.length === 0 ? (
        <Card>
          <EmptyState
            Icone={Users}
            titulo={filtrando ? t("vazio.filtroTitulo") : t("vazio.titulo")}
            descricao={filtrando ? t("vazio.filtroDescricao") : t("vazio.descricao")}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <THead>
              <tr>
                <TH>{t("lista.cliente")}</TH>
                <TH className="hidden md:table-cell">{t("lista.contato")}</TH>
                <TH>{t("lista.perfil")}</TH>
                <TH className="hidden lg:table-cell">{t("lista.patrimonio")}</TH>
                <TH className="hidden sm:table-cell">{t("lista.status")}</TH>
              </tr>
            </THead>
            <TBody>
              {clientes.map((c) => (
                <TR key={c.id} className="relative">
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar nome={c.full_name} tamanho="sm" />
                      <div className="min-w-0">
                        <Link href={`/clientes/${c.id}`} className="font-medium after:absolute after:inset-0 after:content-[''] hover:underline hover:underline-offset-4">
                          {c.full_name}
                        </Link>
                        <p className="numero flex items-center gap-1.5 text-xs text-texto-3">
                          {cpfMascarado(c.cpf)}
                          {c.migrated ? <Badge tom="neutro" className="px-1.5 py-0 text-[10px]">{t("migrado")}</Badge> : null}
                          {c.family_role === "dependent" ? <Badge tom="neutro" className="px-1.5 py-0 text-[10px]">{t("papeis.dependent")}</Badge> : null}
                        </p>
                      </div>
                    </div>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <p className="numero text-sm text-texto-2">{c.phone ? formatarTelefone(c.phone) : "—"}</p>
                    <p className="truncate text-xs text-texto-3">{c.email ?? ""}</p>
                  </TD>
                  <TD>
                    <EtiquetaPerfil cliente={c} compacto />
                  </TD>
                  <TD className="numero hidden text-texto-2 lg:table-cell">{formatarMoeda(c.declared_net_worth, locale)}</TD>
                  <TD className="hidden sm:table-cell">
                    <EtiquetaStatus status={c.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </Page>
  );
}
