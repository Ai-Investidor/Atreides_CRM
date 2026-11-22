"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRightLeft, CalendarPlus, Camera, FileCheck2, Send, ShoppingCart, CircleCheck, FileUp, FileX, Flag, History, MessageCircle, NotebookPen, PenLine,
  Phone, ShieldCheck,
  Compass, Stethoscope, Sparkles, Target, UserCheck, Users, Workflow, type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import type { EventoLinha } from "@/lib/clientes/consultas";
import { formatarDataHora } from "@/lib/formatos";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  created: Sparkles, migrated: Sparkles, converted_from_lead: UserCheck, status_changed: Flag, transferred: ArrowRightLeft,
  data_updated: PenLine, note: NotebookPen, document_uploaded: FileUp, document_deleted: FileX, suitability: ShieldCheck, profile_set: ShieldCheck, diagnosis_updated: Stethoscope, plan_updated: Compass,
  lgpd_consent: ShieldCheck, task_done: CircleCheck, meeting_scheduled: CalendarPlus, process_started: Workflow,
  process_completed: Workflow, family_changed: Users, portfolio_snapshot: Camera, contribution_executed: ShoppingCart, report_approved: FileCheck2, report_sent: Send,
  lead_created: Target, lead_stage_change: ArrowRightLeft, lead_whatsapp: MessageCircle, lead_call: Phone, lead_meeting: Users,
  lead_email: NotebookPen, lead_note: NotebookPen, lead_meeting_scheduled: CalendarPlus, lead_task_done: CircleCheck,
};

/** Linha do tempo: tudo o que aconteceu com o cliente, inclusive a fase de lead. */
export function LinhaTempo({ eventos }: { eventos: EventoLinha[] }) {
  const t = useTranslations("clientes.linha");
  const tc = useTranslations("clientes");
  const tl = useTranslations("leads");
  const locale = useLocale();

  if (!eventos.length) {
    return (
      <Card>
        <EmptyState Icone={History} titulo={t("vazioTitulo")} descricao={t("vazioDescricao")} />
      </Card>
    );
  }

  function titulo(e: EventoLinha): string {
    const m = e.meta;
    if (e.origem === "lead") {
      const tipo = e.tipo.slice(5);
      if (tipo === "stage_change" && m.from && m.to) return t("lead.etapa", { de: tl(`etapas.${m.from as string}`), para: tl(`etapas.${m.to as string}`) });
      if (tipo === "created") return t("lead.criado");
      return t("lead.prefixo", { tipo: tl(`tipos.${tipo}`) });
    }
    switch (e.tipo) {
      case "status_changed":
        return t("eventos.status_changed", { de: tc(`status.${m.from as string}`), para: tc(`status.${m.to as string}`) });
      case "plan_updated":
        return t("eventos.plan_updated", { versao: Number(m.version ?? 1) });
      case "diagnosis_updated":
        return t("eventos.diagnosis_updated", { versao: Number(m.version ?? 1) });
      case "profile_set":
        return t("eventos.profile_set", { perfil: tc(`perfil.perfis.${m.profile as string}`), corretora: (m.broker as string) ?? "—" });
      case "suitability":
        return t("eventos.suitability", { perfil: tc(`perfil.perfis.${m.profile as string}`), pontos: Number(m.score ?? 0) });
      case "process_started":
      case "process_completed":
        return t(`eventos.${e.tipo}`, { processo: tc(`processo.nomes.${(m.process as string) ?? "onboarding"}`) });
      case "document_uploaded":
      case "document_deleted":
        return t(`eventos.${e.tipo}`, { categoria: tc(`documentos.categorias.${m.category as string}`) });
      default:
        return t(`eventos.${e.tipo}`);
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <ol className="relative flex flex-col gap-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-divisoria">
          {eventos.map((e) => {
            const Icone = ICONES[e.tipo] ?? History;
            const doLead = e.origem === "lead";
            return (
              <li key={e.id} className="relative flex gap-4">
                <span
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                    doLead ? "border-borda bg-superficie-2 text-texto-3" : "border-marinho bg-marinho text-osso",
                  )}
                >
                  <Icone className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm font-medium text-texto">
                    {titulo(e)}
                    {doLead ? <span className="ml-2 text-[11px] font-normal text-texto-3">{t("faseLead")}</span> : null}
                  </p>
                  {e.resumo ? <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-texto-2">{e.resumo}</p> : null}
                  <p className="mt-1 text-xs text-texto-3">
                    {formatarDataHora(e.em, locale)}
                    {e.autor ? ` · ${e.autor}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
