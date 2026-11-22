"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BotaoGoogleProps = { rotulo: string; rotuloCarregando: string };

/** Botão no padrão visual do Google (fundo branco, logotipo oficial). */
export function BotaoGoogle({ rotulo, rotuloCarregando }: BotaoGoogleProps) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setCarregando(false);
      router.push("/login?erro=1");
    }
  }

  return (
    <button
      type="button"
      onClick={entrar}
      disabled={carregando}
      aria-busy={carregando}
      className="group flex h-12 w-full items-center justify-center gap-3 rounded-marca border border-[#C9C0AE] bg-white px-5 text-[15px] font-semibold text-marinho transition-colors hover:border-marinho hover:bg-[#FBFAF7] disabled:cursor-wait disabled:opacity-70"
    >
      {carregando ? (
        <svg className="size-[18px] animate-spin text-marinho" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
      )}
      {carregando ? rotuloCarregando : rotulo}
    </button>
  );
}
