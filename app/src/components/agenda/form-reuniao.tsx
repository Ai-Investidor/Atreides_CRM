"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, SelectGroup, SelectItem, SelectSeparator, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { criarReuniao, editarReuniao, type ResultadoAgenda } from "@/lib/agenda/acoes";
import { DURACAO_PADRAO, DURACOES, FORMATOS, TIPOS_REUNIAO, type FormatoReuniao, type Reuniao, type TipoReuniao } from "@/lib/agenda/regras";
import { dataDoInstante, hojeISO, horaDoInstante } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { CampoParticipantes } from "./campo-participantes";

export type LeadVinculo = { id: string; full_name: string; email: string | null };
export type Inicial = { data?: string; hora?: string; duracao?: number; leadId?: string | null; clienteId?: string | null };

type Props = {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  /** Reunião em edição; sem ela, é uma nova reunião. */
  reuniao?: Reuniao | null;
  inicial?: Inicial;
  leads: LeadVinculo[];
  /** Clientes do workspace, para vincular. */
  clientes?: LeadVinculo[];
  /** Nome do dono da agenda (onde o evento é criado). */
  dono: string;
  aoSalvar: (r: Extract<ResultadoAgenda, { ok: true }>, tipo: "criada" | "editada") => void;
};

const SEM_VINCULO = "nenhum";

/** Próximo horário "redondo" (de 30 em 30 min) a partir de agora, em São Paulo. */
function proximaHora(): string {
  const [h, m] = horaDoInstante(new Date()).split(":").map(Number);
  const total = Math.min(h * 60 + m + (30 - (m % 30)), 23 * 60 + 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function somarMinutos(hora: string, min: number) {
  const [h, m] = hora.split(":").map(Number);
  const t = (h * 60 + m + min) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Cadastro e edição de reunião em painel lateral (Documentação/07). */
export function FormReuniao({ aberto, aoMudar, reuniao, inicial, leads, clientes = [], dono, aoSalvar }: Props) {
  const t = useTranslations("agenda");
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAgenda | null>(null);

  const editando = !!reuniao;
  const [form, setForm] = useState(() => {
    if (reuniao) {
      return {
        title: reuniao.title,
        type: reuniao.type as TipoReuniao,
        lead_id: reuniao.client_id ? `cliente:${reuniao.client_id}` : reuniao.lead_id ? `lead:${reuniao.lead_id}` : SEM_VINCULO,
        data: dataDoInstante(reuniao.starts_at),
        hora: horaDoInstante(reuniao.starts_at),
        duracao: Math.round((Date.parse(reuniao.ends_at) - Date.parse(reuniao.starts_at)) / 60_000),
        format: reuniao.format as FormatoReuniao,
        location: reuniao.location ?? "",
        attendees: reuniao.attendees,
        description: reuniao.description ?? "",
      };
    }
    const cliente = clientes.find((c) => c.id === inicial?.clienteId);
    const lead = cliente ? undefined : leads.find((l) => l.id === inicial?.leadId);
    const alvo = cliente ?? lead;
    const tipo: TipoReuniao = cliente ? "follow_up" : lead ? "diagnosis" : "other";
    return {
      title: alvo ? `${t(`tipos.${tipo}`)} · ${alvo.full_name}` : "",
      type: tipo,
      lead_id: cliente ? `cliente:${cliente.id}` : lead ? `lead:${lead.id}` : SEM_VINCULO,
      data: inicial?.data ?? hojeISO(),
      hora: inicial?.hora ?? proximaHora(),
      duracao: inicial?.duracao ?? DURACAO_PADRAO,
      format: "meet" as FormatoReuniao,
      location: "",
      attendees: alvo?.email ? [alvo.email.toLowerCase()] : ([] as string[]),
      description: "",
    };
  });
  // O título acompanha tipo + lead até a pessoa escrever um título próprio.
  const [tituloManual, setTituloManual] = useState(editando);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const pessoa = (chave: string) => {
    const [tipo, id] = chave.split(":");
    return (tipo === "cliente" ? clientes : tipo === "lead" ? leads : []).find((x) => x.id === id) ?? null;
  };
  const leadAtual = pessoa(form.lead_id);

  function tituloAuto(tipo: TipoReuniao, leadId: string) {
    if (tituloManual) return;
    const lead = pessoa(leadId);
    set("title", lead ? `${t(`tipos.${tipo}`)} · ${lead.full_name}` : tipo === "other" ? "" : t(`tipos.${tipo}`));
  }

  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (campo: string) => (erros[campo] ? t(`erros.${erros[campo]}`) : undefined);

  const rotuloDuracao = (min: number) =>
    min < 60 ? t("form.minutos", { n: min }) : min % 60 === 0 ? t("form.horas", { n: min / 60 }) : t("form.horasMinutos", { h: Math.floor(min / 60), m: min % 60 });
  const duracoes = DURACOES.includes(form.duracao as (typeof DURACOES)[number]) ? [...DURACOES] : [...DURACOES, form.duracao].sort((a, b) => a - b);

  function salvar() {
    iniciar(async () => {
      const [tipoV, idV] = form.lead_id === SEM_VINCULO ? [null, null] : form.lead_id.split(":");
      const dados = { ...form, lead_id: tipoV === "lead" ? idV : null, client_id: tipoV === "cliente" ? idV : null };
      const r = editando ? await editarReuniao(reuniao!.id, dados) : await criarReuniao(dados);
      setResultado(r);
      if (r.ok) {
        aoMudar(false);
        aoSalvar(r, editando ? "editada" : "criada");
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent
        posicao="lateral"
        titulo={editando ? t("form.tituloEditar") : t("form.tituloNova")}
        descricao={editando ? t("form.descricaoEditar") : t("form.descricaoNova", { dono })}
      >
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}

            <div className="grid grid-cols-2 gap-3">
              <Field rotulo={t("form.tipo")} obrigatorio erro={erro("type")}>
                {(p) => (
                  <Select
                    {...p}
                    value={form.type}
                    onValueChange={(v) => {
                      set("type", v as TipoReuniao);
                      tituloAuto(v as TipoReuniao, form.lead_id);
                    }}
                  >
                    {TIPOS_REUNIAO.map((x) => (
                      <SelectItem key={x} value={x}>
                        {t(`tipos.${x}`)}
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </Field>
              <Field rotulo={t("form.vinculo")}>
                {(p) => (
                  <Select
                    {...p}
                    value={form.lead_id}
                    onValueChange={(v) => {
                      set("lead_id", v);
                      tituloAuto(form.type, v);
                    }}
                  >
                    <SelectItem value={SEM_VINCULO}>{t("form.semVinculo")}</SelectItem>
                    {clientes.length ? (
                      <>
                        <SelectSeparator />
                        <SelectGroup rotulo={t("form.clientes")}>
                          {clientes.map((c) => (
                            <SelectItem key={c.id} value={`cliente:${c.id}`}>
                              {c.full_name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    ) : null}
                    {leads.length ? (
                      <>
                        <SelectSeparator />
                        <SelectGroup rotulo={t("form.leads")}>
                          {leads.map((l) => (
                            <SelectItem key={l.id} value={`lead:${l.id}`}>
                              {l.full_name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    ) : null}
                  </Select>
                )}
              </Field>
            </div>

            <Field rotulo={t("form.titulo")} obrigatorio erro={erro("title")}>
              {(p) => (
                <Input
                  {...p}
                  autoComplete="off"
                  value={form.title}
                  onChange={(e) => {
                    setTituloManual(true);
                    set("title", e.target.value);
                  }}
                />
              )}
            </Field>

            <div className="grid grid-cols-[1.3fr_1fr] gap-3">
              <Field rotulo={t("form.data")} obrigatorio erro={erro("data")}>
                {(p) => <Input {...p} type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />}
              </Field>
              <Field rotulo={t("form.hora")} obrigatorio erro={erro("hora")}>
                {(p) => <Input {...p} type="time" step={300} value={form.hora} onChange={(e) => set("hora", e.target.value)} />}
              </Field>
            </div>
            <Field rotulo={t("form.duracao")} obrigatorio erro={erro("duracao")} dica={/^\d{2}:\d{2}$/.test(form.hora) ? t("form.termina", { hora: somarMinutos(form.hora, form.duracao) }) : undefined}>
              {(p) => (
                <Select {...p} value={String(form.duracao)} onValueChange={(v) => set("duracao", Number(v))}>
                  {duracoes.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {rotuloDuracao(d)}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-[13px] font-medium text-texto">{t("form.formato")}</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {FORMATOS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={form.format === f}
                    onClick={() => set("format", f)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-marca border text-sm font-medium transition-colors",
                      form.format === f ? "border-marinho bg-marinho text-osso" : "border-borda-forte bg-superficie text-texto-2 hover:border-marinho hover:text-texto",
                    )}
                  >
                    {f === "meet" ? <Video className="size-4" aria-hidden="true" /> : null}
                    {t(`formatos.${f}`)}
                  </button>
                ))}
              </div>
              {form.format === "meet" ? <p className="text-xs text-texto-3">{t("form.meetAuto")}</p> : null}
            </fieldset>
            {form.format === "in_person" ? (
              <Field rotulo={t("form.local")}>
                {(p) => <Input {...p} value={form.location} onChange={(e) => set("location", e.target.value)} />}
              </Field>
            ) : null}

            <Field rotulo={t("form.participantes")} dica={t("form.participantesDica")} erro={erro("attendees")}>
              {(p) => <CampoParticipantes {...p} valor={form.attendees} aoMudar={(v) => set("attendees", v)} sugestao={leadAtual?.email} />}
            </Field>

            <Field rotulo={t("form.descricao")} dica={t("form.descricaoDica")}>
              {(p) => <Textarea {...p} value={form.description} onChange={(e) => set("description", e.target.value)} />}
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
            <Button type="button" variant="ghost" onClick={() => aoMudar(false)}>
              {t("form.cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {editando ? t("form.salvarEdicao") : t("form.salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
