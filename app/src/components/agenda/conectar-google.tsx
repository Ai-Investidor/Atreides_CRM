"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarSync } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const ESCOPO = "https://www.googleapis.com/auth/calendar.events";

/** Pede ao Google permissão para ler e criar eventos na agenda de quem está logado. */
export function ConectarGoogle({ email, rotulo, variant = "primary" }: { email: string; rotulo?: string; variant?: "primary" | "secondary" }) {
  const t = useTranslations("agenda.google");
  const [carregando, setCarregando] = useState(false);

  async function conectar() {
    setCarregando(true);
    // Marca que este retorno do Google é a conexão da agenda (lido em /auth/callback).
    document.cookie = "atreides_conectar_google=1; path=/; max-age=600; samesite=lax";
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: ESCOPO,
        queryParams: { access_type: "offline", prompt: "consent", login_hint: email, include_granted_scopes: "true" },
      },
    });
    if (error) setCarregando(false);
  }

  return (
    <Button variant={variant} onClick={conectar} carregando={carregando}>
      <CalendarSync />
      {rotulo ?? t("conectar")}
    </Button>
  );
}
