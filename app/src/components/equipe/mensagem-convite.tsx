"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { nome: string | null; email: string };

/**
 * Texto pronto do convite: link do Atreides + instrução de entrar com Google usando o e-mail convidado.
 * O link vem do endereço aberto no navegador; por isso o texto só é usado em cliques ou em telas abertas por clique.
 */
export function useMensagemConvite({ nome, email }: Props) {
  const t = useTranslations("equipe.mensagem");
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/login`;
  const primeiroNome = nome?.split(" ")[0] ?? "";
  return {
    assunto: t("assunto"),
    texto: t("texto", { nome: primeiroNome, link, email }),
  };
}

/** Botões "Copiar mensagem" e "Abrir no e-mail". */
/** `compacto`: em telas estreitas mostra só o ícone (o nome do botão fica para o leitor de tela). */
export function BotoesConvite({ nome, email, tamanho = "sm", compacto }: Props & { tamanho?: "sm" | "md"; compacto?: boolean }) {
  const t = useTranslations("equipe.acoes");
  const { assunto, texto } = useMensagemConvite({ nome, email });
  const [copiado, setCopiado] = useState(false);
  const rotulo = (texto: string) => (compacto ? <span className="sr-only sm:not-sr-only">{texto}</span> : texto);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <>
      <Button type="button" size={tamanho} variant="secondary" onClick={copiar} aria-live="polite">
        {copiado ? <Check /> : <Copy />}
        {rotulo(copiado ? t("copiado") : t("copiar"))}
      </Button>
      <Button
        type="button"
        size={tamanho}
        variant="ghost"
        onClick={() => {
          window.location.href = `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`;
        }}
      >
        <Mail />
        {rotulo(t("email"))}
      </Button>
    </>
  );
}
