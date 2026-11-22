"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { moverEtapa } from "@/lib/leads/acoes";
import { ETAPAS, estaAberto, type Etapa, type Lead } from "@/lib/leads/regras";
import { cn } from "@/lib/utils";
import { useAcoesLead } from "./acoes-lead";
import { CardLead } from "./card-lead";

const COR_COLUNA: Record<Etapa, string> = {
  new: "bg-info",
  contacted: "bg-texto-3",
  diagnosis: "bg-latao",
  proposal: "bg-atencao",
  won: "bg-ok",
  lost: "bg-erro",
};

/**
 * Quadro do funil (kanban). Arrastar o card muda a etapa.
 * Ir para "Perdido" ou reabrir um lead encerrado abre o diálogo, que pede
 * motivo ou próximo contato. Sem mouse: menu ⋯ do card › Mudar etapa.
 */
export function Quadro({ leads }: { leads: Lead[] }) {
  const t = useTranslations("leads");
  const router = useRouter();
  const { mudarEtapa } = useAcoesLead();
  const [, iniciar] = useTransition();
  const [sobre, setSobre] = useState<Etapa | null>(null);
  const [otimistas, aplicar] = useOptimistic(leads, (atual, mov: { id: string; stage: Etapa }) =>
    atual.map((l) => (l.id === mov.id ? { ...l, stage: mov.stage } : l)),
  );

  function soltar(e: React.DragEvent, destino: Etapa) {
    e.preventDefault();
    setSobre(null);
    const id = e.dataTransfer.getData("text/lead");
    const lead = otimistas.find((l) => l.id === id);
    if (!lead || lead.stage === destino) return;

    if (destino === "lost" || (estaAberto(destino) && !estaAberto(lead.stage))) {
      mudarEtapa(lead, destino);
      return;
    }
    iniciar(async () => {
      aplicar({ id, stage: destino });
      await moverEtapa({ lead_id: id, stage: destino });
      router.refresh();
    });
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div className="grid min-w-[1180px] grid-cols-6 gap-3">
        {ETAPAS.map((etapa) => {
          const daEtapa = otimistas.filter((l) => l.stage === etapa);
          return (
            <section
              key={etapa}
              aria-label={t(`etapas.${etapa}`)}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(etapa);
              }}
              onDragLeave={() => setSobre((s) => (s === etapa ? null : s))}
              onDrop={(e) => soltar(e, etapa)}
              className={cn(
                "flex min-h-[420px] flex-col rounded-card border border-transparent bg-divisoria/60 p-2 transition-colors",
                sobre === etapa && "border-dashed border-borda-forte bg-latao-claro/60",
                !estaAberto(etapa) && "bg-divisoria/35",
              )}
            >
              <header className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-texto">
                  <span className={cn("size-2 rounded-full", COR_COLUNA[etapa])} aria-hidden="true" />
                  {t(`etapas.${etapa}`)}
                </h2>
                <span className="numero rounded-full bg-superficie px-2 py-0.5 text-xs font-medium text-texto-2 shadow-card">{daEtapa.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {daEtapa.map((lead) => (
                  <CardLead
                    key={lead.id}
                    lead={lead}
                    arrastavel
                    aoIniciarArraste={(e, l) => {
                      e.dataTransfer.setData("text/lead", l.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  />
                ))}
                {daEtapa.length === 0 ? (
                  <p className="rounded-marca border border-dashed border-borda-forte/70 px-3 py-6 text-center text-xs text-texto-3">
                    {t("quadro.colunaVazia")}
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
