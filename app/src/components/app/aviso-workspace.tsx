"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trocarWorkspace } from "@/lib/workspace";

/** Faixa exibida quando o consultor está no workspace de um colega (Documentação/02). */
export function AvisoWorkspace({ nomeWorkspace, idProprio }: { nomeWorkspace: string; idProprio?: string }) {
  const t = useTranslations("workspace");
  const [pendente, iniciar] = useTransition();

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#E7D3AE] bg-atencao-fundo px-4 py-2 text-[13px] text-atencao sm:px-6 lg:px-10">
      <Eye className="size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">{t.rich("aviso", { nome: nomeWorkspace, b: (c) => <strong className="font-semibold">{c}</strong> })}</p>
      {idProprio ? (
        <Button variant="secondary" size="sm" carregando={pendente} onClick={() => iniciar(() => trocarWorkspace(idProprio))}>
          {t("voltar")}
        </Button>
      ) : null}
    </div>
  );
}
