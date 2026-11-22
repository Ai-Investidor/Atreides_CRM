import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { decifrar } from "@/lib/google/cripto";
import { ErroGoogle, googleConfigurado, tokenDeAcesso } from "@/lib/google/calendar";
import type { SituacaoGoogle } from "./regras";

export type Conexao = {
  situacao: SituacaoGoogle;
  ownerId: string;
  ownerEmail: string;
  /** Token de acesso do Google do dono do workspace (só quando conectado). */
  token: string | null;
};

/**
 * Conexão com o Google do DONO do workspace (o evento sempre vai para a agenda dele).
 * O token chega cifrado do banco e só é aberto aqui, no servidor.
 */
export const obterConexao = cache(async (workspaceId: string, usuarioId: string): Promise<Conexao | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("google_connection_for_workspace", { p_workspace_id: workspaceId });
  const linha = data?.[0];
  if (!linha) return null;

  const base = { dono: linha.owner_name, proprio: linha.owner_id === usuarioId };
  const resultado = (situacao: SituacaoGoogle, token: string | null = null): Conexao => ({
    situacao,
    ownerId: linha.owner_id,
    ownerEmail: linha.owner_email,
    token,
  });

  if (!googleConfigurado()) return resultado({ estado: "configuracao", ...base });
  if (!linha.token_cipher) return resultado({ estado: "desconectado", ...base });

  try {
    const token = await tokenDeAcesso(decifrar(linha.token_cipher));
    return resultado({ estado: "conectado", email: linha.google_email, ...base }, token);
  } catch (e) {
    if (e instanceof ErroGoogle && e.codigo === "configuracao") return resultado({ estado: "configuracao", ...base });
    return resultado({ estado: "revogado", ...base });
  }
});
