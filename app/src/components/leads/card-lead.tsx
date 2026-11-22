"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRightLeft, ExternalLink, MessageSquarePlus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { estaAberto, type Lead } from "@/lib/leads/regras";
import { cn } from "@/lib/utils";
import { useAcoesLead } from "./acoes-lead";
import { EtiquetaParado, SituacaoContato } from "./etiquetas";

type Props = {
  lead: Lead;
  arrastavel?: boolean;
  aoIniciarArraste?: (e: React.DragEvent, lead: Lead) => void;
};

/** Card do quadro do funil: nome, origem, celular, próximo contato e ações. */
export function CardLead({ lead, arrastavel, aoIniciarArraste }: Props) {
  const t = useTranslations("leads");
  const { registrarContato, mudarEtapa } = useAcoesLead();
  const aberto = estaAberto(lead.stage);

  return (
    <article
      draggable={arrastavel}
      onDragStart={(e) => aoIniciarArraste?.(e, lead)}
      className={cn(
        "group relative rounded-card border border-borda bg-superficie p-3.5 shadow-card transition-[border-color,box-shadow] hover:border-borda-forte",
        arrastavel && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${lead.id}`} className="min-w-0 after:absolute after:inset-0 after:content-['']">
          <h3 className="truncate text-sm font-semibold text-texto group-hover:underline group-hover:underline-offset-4">{lead.full_name}</h3>
          <p className="mt-0.5 truncate text-xs text-texto-3">
            {t(`origens.${lead.source}`)}
          </p>
        </Link>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative z-10 -mr-1.5 -mt-1 shrink-0" aria-label={t("acoes.maisAcoes", { nome: lead.full_name })}>
              <MoreHorizontal />
            </Button>
          </MenuTrigger>
          <MenuContent align="end">
            {aberto ? (
              <MenuItem onSelect={() => registrarContato(lead)}>
                <MessageSquarePlus />
                {t("acoes.registrarContato")}
              </MenuItem>
            ) : null}
            <MenuItem onSelect={() => mudarEtapa(lead)}>
              <ArrowRightLeft />
              {t("acoes.mudarEtapa")}
            </MenuItem>
            <MenuSeparator />
            <MenuItem asChild>
              <Link href={`/leads/${lead.id}`}>
                <ExternalLink />
                {t("acoes.abrir")}
              </Link>
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {aberto ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <SituacaoContato lead={lead} compacto />
          <EtiquetaParado lead={lead} compacto />
        </div>
      ) : null}
      {aberto && lead.next_contact_note ? <p className="mt-2 line-clamp-2 text-xs text-texto-2">{lead.next_contact_note}</p> : null}
      {lead.stage === "lost" && lead.lost_reason ? (
        <p className="mt-2 text-xs text-texto-3">{t(`motivos.${lead.lost_reason}`)}</p>
      ) : null}
    </article>
  );
}
