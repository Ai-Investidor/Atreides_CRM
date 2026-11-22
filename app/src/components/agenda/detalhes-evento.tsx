"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Check, Copy, ExternalLink, MapPin, Pencil, Target, UserRound, Users, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { cancelarReuniao } from "@/lib/agenda/acoes";
import type { EventoAgenda } from "@/lib/agenda/regras";
import { dataDoInstante, formatarData, intervaloHoras } from "@/lib/formatos";

type Props = {
  evento: EventoAgenda | null;
  aoFechar: () => void;
  /** false quando o Google do dono não está conectado (não dá para editar nem cancelar). */
  podeEditar: boolean;
  aoEditar: (evento: EventoAgenda) => void;
  aoCancelada: () => void;
};

/** true se o instante já passou. */
function jaPassou(instante: string) {
  return Date.parse(instante) < Date.now();
}

function Linha({ Icone, rotulo, children }: { Icone: typeof CalendarClock; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icone className="mt-0.5 size-4 shrink-0 text-texto-3" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-texto-3">{rotulo}</p>
        <div className="mt-0.5 text-sm text-texto">{children}</div>
      </div>
    </div>
  );
}

/** Painel com os detalhes de um evento clicado na agenda. */
export function DetalhesEvento({ evento, aoFechar, podeEditar, aoEditar, aoCancelada }: Props) {
  const t = useTranslations("agenda");
  const locale = useLocale();
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!evento || evento.extendedProps.origem === "ocupado") return null;
  const props = evento.extendedProps;
  const quando = evento.allDay
    ? formatarData(evento.start.slice(0, 10), locale, { weekday: "long" })
    : `${formatarData(dataDoInstante(evento.start), locale, { weekday: "long" })} · ${intervaloHoras(evento.start, evento.end)}`;
  const meetUrl = props.origem === "atreides" ? props.reuniao.meet_url : props.meetUrl;

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  function cancelar() {
    if (props.origem !== "atreides") return;
    iniciar(async () => {
      const r = await cancelarReuniao(props.reuniao.id);
      if (!r.ok) return setErro(r.mensagem ?? "salvar");
      setConfirmando(false);
      aoFechar();
      aoCancelada();
    });
  }

  const fechar = (v: boolean) => {
    if (!v) {
      setErro(null);
      setConfirmando(false);
      aoFechar();
    }
  };

  const reuniao = props.origem === "atreides" ? props.reuniao : null;
  const passada = jaPassou(evento.end);

  return (
    <Dialog open onOpenChange={fechar}>
      <DialogContent posicao="lateral" titulo={evento.title || t("semTitulo")}>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            {erro ? <Alert tom="erro">{t(`erros.${erro}`)}</Alert> : null}

            {reuniao ? (
              <div className="flex flex-wrap gap-1.5">
                <Badge tom="escuro">{t(`tipos.${reuniao.type}`)}</Badge>
                <Badge tom="neutro">{t(`formatos.${reuniao.format}`)}</Badge>
              </div>
            ) : (
              <Badge tom="info" className="self-start">Google Agenda</Badge>
            )}

            <Linha Icone={CalendarClock} rotulo={t("detalhes.quando")}>
              <span className="numero first-letter:uppercase">{quando}</span>
              {passada ? <p className="mt-0.5 text-xs text-texto-3">{t("detalhes.passada")}</p> : null}
            </Linha>

            {meetUrl ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={meetUrl} target="_blank" rel="noopener noreferrer">
                    <Video />
                    {t("detalhes.entrarMeet")}
                  </a>
                </Button>
                <Button variant="secondary" onClick={() => copiar(meetUrl)} aria-live="polite">
                  {copiado ? <Check /> : <Copy />}
                  {copiado ? t("detalhes.copiado") : t("detalhes.copiarLink")}
                </Button>
              </div>
            ) : reuniao?.format === "meet" ? (
              <Alert tom="info">{t("detalhes.meetPendente")}</Alert>
            ) : null}

            {(reuniao?.location || (props.origem === "google" && props.local)) ? (
              <Linha Icone={MapPin} rotulo={t("detalhes.local")}>
                {reuniao?.location ?? (props.origem === "google" ? props.local : null)}
              </Linha>
            ) : null}

            {reuniao ? (
              <>
                {reuniao.client_id && props.origem === "atreides" && props.clienteNome ? (
                  <Linha Icone={UserRound} rotulo={t("detalhes.cliente")}>
                    <Link href={`/clientes/${reuniao.client_id}`} className="font-medium hover:underline hover:underline-offset-4">
                      {props.clienteNome}
                    </Link>
                  </Linha>
                ) : null}
                {reuniao.lead_id && props.origem === "atreides" && props.leadNome ? (
                  <Linha Icone={Target} rotulo={t("detalhes.lead")}>
                    <Link href={`/leads/${reuniao.lead_id}`} className="font-medium hover:underline hover:underline-offset-4">
                      {props.leadNome}
                    </Link>
                  </Linha>
                ) : null}
                <Linha Icone={Users} rotulo={t("detalhes.participantes")}>
                  {reuniao.attendees.length ? (
                    <ul className="flex flex-col gap-1">
                      {reuniao.attendees.map((e) => (
                        <li key={e} className="truncate">
                          {e}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-texto-3">{t("detalhes.semParticipantes")}</span>
                  )}
                </Linha>
                {reuniao.description ? (
                  <div>
                    <p className="mb-1 text-xs text-texto-3">{t("detalhes.descricao")}</p>
                    <p className="whitespace-pre-line rounded-card border border-borda bg-superficie-2 p-3 text-sm leading-relaxed text-texto-2">
                      {reuniao.description}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            {props.htmlLink ? (
              <Button asChild variant="ghost" className="self-start">
                <a href={props.htmlLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  {t("detalhes.abrirGoogle")}
                </a>
              </Button>
            ) : null}

            {confirmando ? (
              <Alert tom="atencao" titulo={t("cancelar.titulo")}>
                <p>{t("cancelar.descricao")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="danger" carregando={pendente} onClick={cancelar}>
                    {t("cancelar.confirmar")}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmando(false)}>
                    {t("cancelar.manter")}
                  </Button>
                </div>
              </Alert>
            ) : null}
          </div>

          {reuniao && reuniao.status === "scheduled" && podeEditar ? (
            <div className="flex justify-between gap-2 border-t border-divisoria px-5 py-3">
              <Button variant="ghost" className="text-erro hover:text-erro" onClick={() => setConfirmando(true)} disabled={confirmando}>
                <X />
                {t("detalhes.cancelarReuniao")}
              </Button>
              <Button variant="secondary" onClick={() => aoEditar(evento)}>
                <Pencil />
                {t("detalhes.editar")}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
