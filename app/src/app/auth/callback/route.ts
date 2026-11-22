import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { cifrar } from "@/lib/google/cripto";

/** Cookie marcado pelo botão "Conectar Google Agenda" antes de ir ao Google (Documentação/07). */
const COOKIE_CONECTAR = "atreides_conectar_google";

/**
 * Endereço que o navegador usou. Atrás do ngrok, request.url fica em localhost
 * (o Next só repassa o protocolo), e o login voltaria para a máquina local.
 */
function origemPublica(request: Request) {
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const nome = host?.split(":")[0]?.toLowerCase();
  const tunel =
    nome === "localhost" ||
    nome === "127.0.0.1" ||
    nome?.endsWith(".ngrok-free.dev") ||
    nome?.endsWith(".ngrok-free.app");
  if (host && tunel) return `${proto === "http" ? "http" : "https"}://${host}`;
  return new URL(request.url).origin;
}

/** Retorno do Google: troca o código pela sessão e, se for conexão da agenda, guarda o token cifrado. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = origemPublica(request);
  const code = searchParams.get("code");
  const jar = await cookies();
  const conectando = jar.get(COOKIE_CONECTAR)?.value === "1";
  if (conectando) jar.delete(COOKIE_CONECTAR);

  if (!code) return NextResponse.redirect(`${origin}${conectando ? "/agenda?google=erro" : "/login?erro=1"}`);

  const supabase = await createClient();
  const antes = conectando ? (await supabase.auth.getClaims()).data?.claims?.sub : null;
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(`${origin}${conectando ? "/agenda?google=erro" : "/login?erro=1"}`);

  if (!conectando) return NextResponse.redirect(`${origin}/painel`);

  // Escolheu outra conta Google na tela do Google: não mistura contas.
  if (antes && data.user.id !== antes) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?erro=1`);
  }

  const refresh = data.session.provider_refresh_token;
  if (!refresh) return NextResponse.redirect(`${origin}/agenda?google=erro`);

  try {
    const { error: e } = await supabase.rpc("google_connection_save", {
      p_google_email: data.user.email ?? "",
      p_token_cipher: cifrar(refresh),
    });
    if (e) throw e;
  } catch {
    return NextResponse.redirect(`${origin}/agenda?google=erro`);
  }
  return NextResponse.redirect(`${origin}/agenda?google=conectado`);
}
