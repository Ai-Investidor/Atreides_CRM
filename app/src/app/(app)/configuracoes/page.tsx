import { redirect } from "next/navigation";

/** Por enquanto Configurações tem só a Equipe. */
export default function ConfiguracoesPage() {
  redirect("/configuracoes/equipe");
}
