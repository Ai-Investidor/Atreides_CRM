import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Agenda } from "@/components/agenda/agenda";
import { Page } from "@/components/ui/layout";
import { obterConexao } from "@/lib/agenda/conexao";
import { leadsParaVinculo } from "@/lib/agenda/consultas";
import { clientesParaVinculo } from "@/lib/clientes/consultas";
import { obterSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Agenda" };

/** Agenda do workspace aberto (Documentação/07, etapa 1). */
export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const [sessao, params] = await Promise.all([obterSessao(), searchParams]);
  if (!sessao) redirect("/login");

  const [conexao, leads, clientes] = await Promise.all([
    obterConexao(sessao.atual.id, sessao.perfil.id),
    leadsParaVinculo(sessao.atual.id),
    clientesParaVinculo(sessao.atual.id),
  ]);

  const leadParam = typeof params.lead === "string" ? params.lead : null;
  const clienteParam = typeof params.cliente === "string" ? params.cliente : null;
  const novaInicial =
    params.novo === "1"
      ? {
          leadId: leads.some((l) => l.id === leadParam) ? leadParam : null,
          clienteId: clientes.some((c) => c.id === clienteParam) ? clienteParam : null,
        }
      : null;
  const google = params.google === "conectado" || params.google === "erro" ? params.google : null;

  return (
    <Page>
      <Agenda
        situacaoInicial={conexao?.situacao ?? null}
        leads={leads}
        clientes={clientes}
        emailUsuario={sessao.perfil.email}
        novaInicial={novaInicial}
        retornoGoogle={google}
      />
    </Page>
  );
}
