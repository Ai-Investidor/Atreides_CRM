"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Modo apresentação em tela cheia (diagnóstico e planejamento). Fecha com Esc. */
export function Apresentacao({ sobre, nome, aoFechar, children }: { sobre: string; nome: string; aoFechar: () => void; children: React.ReactNode }) {
  const t = useTranslations("editorMarkdown");
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botao.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", tecla);
    };
  }, [aoFechar]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${sobre} · ${nome}`} className="fixed inset-0 z-50 overflow-y-auto bg-superficie">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-divisoria bg-superficie/95 px-6 py-3 backdrop-blur">
        <span className="font-titulo text-sm font-bold tracking-[0.2em] text-texto">ATREIDES</span>
        <Button ref={botao} variant="ghost" size="sm" onClick={aoFechar}>
          <X />
          {t("fecharApresentacao")}
        </Button>
      </div>
      <article className="mx-auto max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-latao-escuro">{sobre}</p>
        <h1 className="mt-3 font-titulo text-4xl font-bold tracking-tight text-texto sm:text-5xl">{nome}</h1>
        <div className="mt-10 flex flex-col gap-10">{children}</div>
      </article>
    </div>
  );
}
