"use client";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "./agenda.css";

import { useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import FullCalendar, { useCalendarController, type CalendarRef, type EventInput, type EventSourceFuncInfo } from "@fullcalendar/react";
import classicTheme from "@fullcalendar/react/themes/classic";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import listPlugin from "@fullcalendar/react/list";
import interactionPlugin from "@fullcalendar/react/interaction";
import ptBr from "@fullcalendar/react/locales/pt-br";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventoAgenda, SituacaoGoogle } from "@/lib/agenda/regras";
import { FUSO } from "@/lib/formatos";
import { cn } from "@/lib/utils";

export type Selecao = { inicio: Date; fim: Date; diaInteiro: boolean };

type Props = {
  podeAgendar: boolean;
  aoSelecionar: (s: Selecao) => void;
  aoClicar: (e: EventoAgenda) => void;
  aoRemarcar: (id: string, inicio: Date, fim: Date, desfazer: () => void) => void;
  aoCarregar: (r: { situacao: SituacaoGoogle | null; falhaGoogle: boolean }) => void;
  /** Recebe a função que recarrega os eventos (após criar, editar, cancelar). */
  registrarRecarga: (fn: () => void) => void;
};

/** Fora do componente: listas novas a cada render fazem o FullCalendar se reconfigurar. */
const PLUGINS = [classicTheme, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];

const VISOES = [
  { chave: "dia", tipo: "timeGridDay" },
  { chave: "semana", tipo: "timeGridWeek" },
  { chave: "mes", tipo: "dayGridMonth" },
  { chave: "lista", tipo: "listWeek" },
] as const;

/** Cores por origem do evento (paleta Fortaleza, Documentação/12). No v7: `color` + `contrastColor`. */
function estilo(e: EventoAgenda): Pick<EventInput, "color" | "contrastColor"> {
  switch (e.extendedProps.origem) {
    case "atreides":
      return { color: "#0e1a2b", contrastColor: "#f3efe6" };
    case "google":
      return { color: "#dbe7f5", contrastColor: "#1e4a7a" };
    default:
      return { color: "#e9e4d9", contrastColor: "#6b7584" };
  }
}

/** Agenda (FullCalendar v7) com barra de ferramentas própria. Só roda no navegador. */
export default function Calendario({ podeAgendar, aoSelecionar, aoClicar, aoRemarcar, aoCarregar, registrarRecarga }: Props) {
  const t = useTranslations("agenda");
  const locale = useLocale();
  const controller = useCalendarController();
  const ref = useRef<CalendarRef>(null);
  const porId = useRef(new Map<string, EventoAgenda>());
  const celular = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

  useEffect(() => {
    registrarRecarga(() => ref.current?.getApi().refetchEvents());
  }, [registrarRecarga]);

  // A fonte de eventos precisa ter identidade estável: se mudar a cada render, o FullCalendar
  // busca de novo, a resposta atualiza o estado da tela, que renderiza... e entra em loop.
  const atual = useRef({ t, podeAgendar, aoCarregar });
  useEffect(() => {
    atual.current = { t, podeAgendar, aoCarregar };
  });

  const carregarEventos = useCallback(async (info: EventSourceFuncInfo): Promise<EventInput[]> => {
    const r = await fetch(`/api/agenda/eventos?start=${encodeURIComponent(info.startStr)}&end=${encodeURIComponent(info.endStr)}`);
    if (!r.ok) throw new Error("agenda");
    const dados = (await r.json()) as { eventos: EventoAgenda[]; situacao: SituacaoGoogle | null; falhaGoogle: boolean };
    const { t: tr, podeAgendar: pode, aoCarregar: avisar } = atual.current;
    avisar({ situacao: dados.situacao, falhaGoogle: dados.falhaGoogle });
    porId.current = new Map(dados.eventos.map((e) => [e.id, e]));
    return dados.eventos.map((e) => ({
      id: e.id,
      title: e.extendedProps.origem === "ocupado" ? tr("ocupado") : e.title || tr("semTitulo"),
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      editable: e.editable && pode,
      className: e.classNames.join(" "),
      ...estilo(e),
    }));
  }, []);

  // Conectou ou desconectou: recarrega para liberar (ou travar) o arrastar.
  const primeiraVez = useRef(true);
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    ref.current?.getApi().refetchEvents();
  }, [podeAgendar]);

  const visaoAtual = controller.view?.type;

  return (
    <div className="agenda-atreides flex flex-col gap-4">
      {/* Barra de ferramentas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => controller.today()}>
            {t("hoje")}
          </Button>
          <div className="flex">
            <Button variant="ghost" size="icon-sm" onClick={() => controller.prev()} aria-label={t("anterior")}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => controller.next()} aria-label={t("proximo")}>
              <ChevronRight />
            </Button>
          </div>
          <h2 className="font-titulo text-lg font-semibold tracking-[-0.01em] text-texto first-letter:uppercase" aria-live="polite">
            {controller.view?.title}
          </h2>
        </div>
        <div role="tablist" aria-label={t("visoes.label")} className="flex self-start rounded-marca border border-borda bg-superficie-2 p-0.5">
          {VISOES.map((v) => (
            <button
              key={v.chave}
              type="button"
              role="tab"
              aria-selected={visaoAtual === v.tipo}
              onClick={() => controller.changeView(v.tipo)}
              className={cn(
                "h-8 rounded-[6px] px-3 text-[13px] font-medium transition-colors",
                visaoAtual === v.tipo ? "bg-superficie text-texto shadow-card" : "text-texto-3 hover:text-texto",
              )}
            >
              {t(`visoes.${v.chave}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-borda bg-superficie shadow-card">
        <FullCalendar
          ref={ref}
          controller={controller}
          plugins={PLUGINS}
          headerToolbar={false}
          initialView={celular ? "listWeek" : "timeGridWeek"}
          locale={locale === "pt-BR" ? ptBr : undefined}
          timeZone={FUSO}
          height={680}
          nowIndicator
          allDaySlot
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          scrollTime="08:00:00"
          dayMaxEvents
          selectable={podeAgendar}
          selectMirror
          eventStartEditable
          eventDurationEditable
          events={carregarEventos}
          select={(info) => {
            ref.current?.getApi().unselect();
            if (podeAgendar) aoSelecionar({ inicio: info.start, fim: info.end, diaInteiro: info.allDay });
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            const e = porId.current.get(info.event.id);
            if (e && e.extendedProps.origem !== "ocupado") aoClicar(e);
          }}
          eventDrop={(info) => {
            if (!info.event.start || !info.event.end) return info.revert();
            aoRemarcar(info.event.id, info.event.start, info.event.end, info.revert);
          }}
          eventResize={(info) => {
            if (!info.event.start || !info.event.end) return info.revert();
            aoRemarcar(info.event.id, info.event.start, info.event.end, info.revert);
          }}
        />
      </div>
    </div>
  );
}
