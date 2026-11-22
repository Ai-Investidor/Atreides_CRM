import { redirect } from "next/navigation";
import { AvisoWorkspace } from "@/components/app/aviso-workspace";
import { BarraSuperior } from "@/components/app/barra-superior";
import { MenuLateral } from "@/components/app/menu-lateral";
import { obterSessao } from "@/lib/sessao";

/** Estrutura das telas internas: menu lateral marinho fixo + barra superior + conteúdo. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const sessao = await obterSessao();

  // O proxy já exige login; aqui barramos perfil inexistente ou desativado.
  if (!sessao) redirect("/login?erro=1");

  const proprio = sessao.workspaces.find((w) => w.owner_id === sessao.perfil.id);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <MenuLateral sessao={sessao} />
      </aside>
      <div className="flex min-h-screen flex-col">
        <BarraSuperior sessao={sessao} />
        {sessao.emWorkspaceAlheio ? <AvisoWorkspace nomeWorkspace={sessao.atual.name} idProprio={proprio?.id} /> : null}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
