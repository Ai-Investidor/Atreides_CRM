"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, Target, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { TarefaCompleta } from "@/lib/tarefas/regras";
import { cn } from "@/lib/utils";
import { EtiquetaPrazo } from "./etiqueta-prazo";

type Props = {
  tarefa: TarefaCompleta;
  usuarioId: string;
  aoAlternar: (t: TarefaCompleta) => void;
  aoAbrir?: (t: TarefaCompleta) => void;
  /** Mostra o workspace (visão Equipe do admin). */
  mostrarWorkspace?: boolean;
  /** Esconde o vínculo com o lead (ex.: dentro da própria ficha do lead). */
  semLead?: boolean;
  /** Esconde o vínculo com o cliente (dentro da ficha do cliente). */
  semCliente?: boolean;
};

/** Linha de tarefa: concluir em um clique, título, vínculo, responsável e prazo. */
export function LinhaTarefa({ tarefa, usuarioId, aoAlternar, aoAbrir, mostrarWorkspace, semLead, semCliente }: Props) {
  const t = useTranslations("tarefas");
  const feita = tarefa.status !== "open";
  const cliente = !semCliente ? tarefa.cliente : null;
  const outro = tarefa.responsavel && tarefa.responsavel.id !== usuarioId;

  return (
    <li className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-superficie-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={feita}
        aria-label={feita ? t("reabrir", { titulo: tarefa.title }) : t("concluir", { titulo: tarefa.title })}
        onClick={() => aoAlternar(tarefa)}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
          feita ? "border-ok bg-ok text-white" : "border-borda-forte bg-superficie hover:border-marinho",
        )}
      >
        {feita ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => aoAbrir?.(tarefa)}
          disabled={!aoAbrir}
          className={cn(
            "block max-w-full truncate text-left text-sm font-medium",
            feita ? "text-texto-3 line-through" : "text-texto",
            aoAbrir && "hover:underline hover:underline-offset-4",
          )}
        >
          {tarefa.title}
        </button>
        {tarefa.status === "not_applicable" ? <span className="text-[11px] font-medium text-texto-3">{t("naoAplica")}</span> : null}
        {(!semLead && tarefa.lead) || cliente || (mostrarWorkspace && tarefa.workspace) || tarefa.description ? (
          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-texto-3">
            {!semLead && tarefa.lead ? (
              <Link href={`/leads/${tarefa.lead.id}`} className="inline-flex items-center gap-1 hover:text-texto hover:underline">
                <Target className="size-3" aria-hidden="true" />
                {tarefa.lead.full_name}
              </Link>
            ) : null}
            {cliente ? (
              <Link href={`/clientes/${cliente.id}`} className="inline-flex items-center gap-1 hover:text-texto hover:underline">
                <UserRound className="size-3" aria-hidden="true" />
                {cliente.full_name}
              </Link>
            ) : null}
            {mostrarWorkspace && tarefa.workspace ? <span>{tarefa.workspace.name}</span> : null}
            {tarefa.description ? <span className="truncate">{tarefa.description}</span> : null}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <EtiquetaPrazo prazo={tarefa.due_on} aberta={!feita} compacto />
        {outro ? (
          <span title={tarefa.responsavel!.full_name}>
            <Avatar nome={tarefa.responsavel!.full_name} tamanho="sm" />
          </span>
        ) : null}
      </div>
    </li>
  );
}
