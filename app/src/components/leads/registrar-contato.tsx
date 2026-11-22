"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, MessageCircle, NotebookPen, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { registrarContato, type ResultadoAcao } from "@/lib/leads/acoes";
import { TIPOS_CONTATO } from "@/lib/leads/regras";
import { hojeISO, somarDias } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { CampoDataContato } from "./campo-data";

type Tipo = (typeof TIPOS_CONTATO)[number];
const ICONES: Record<Tipo, typeof Phone> = { whatsapp: MessageCircle, call: Phone, meeting: Users, email: Mail, note: NotebookPen };

type Props = {
  lead: { id: string; full_name: string };
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
};

/** Registrar contato: o que aconteceu + próximo contato (Documentação/04). */
export function RegistrarContato({ lead, aberto, aoMudar }: Props) {
  const t = useTranslations("leads");
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAcao | null>(null);
  const vazio = { type: "whatsapp" as Tipo, summary: "", next_contact_on: somarDias(hojeISO(), 3), next_contact_note: "" };
  const [form, setForm] = useState(vazio);
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (c: string) => (erros[c] ? t(`erros.${erros[c]}`) : undefined);

  function fechar(v: boolean) {
    aoMudar(v);
    if (!v) {
      setForm(vazio);
      setResultado(null);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent titulo={t("contato.titulo")} descricao={lead.full_name}>
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await registrarContato({ ...form, lead_id: lead.id });
              setResultado(r);
              if (r.ok) {
                fechar(false);
                router.refresh();
              }
            });
          }}
        >
          <div className="flex flex-col gap-4 px-5 py-5">
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}

            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-texto">{t("contato.como")}</legend>
              <div className="grid grid-cols-5 gap-1.5">
                {TIPOS_CONTATO.map((tipo) => {
                  const Icone = ICONES[tipo];
                  const ativo = form.type === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setForm((f) => ({ ...f, type: tipo }))}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-marca border px-1 py-2 text-[11.5px] font-medium transition-colors",
                        ativo ? "border-marinho bg-marinho text-osso" : "border-borda bg-superficie text-texto-2 hover:border-borda-forte",
                      )}
                    >
                      <Icone className="size-4" aria-hidden="true" />
                      {t(`tipos.${tipo}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Field rotulo={t("contato.oQueAconteceu")} obrigatorio erro={erro("summary")}>
              {(p) => (
                <Textarea
                  {...p}
                  autoFocus
                  className="min-h-20"
                  placeholder={t("contato.placeholder")}
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                />
              )}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field rotulo={t("campos.proximoContato")} obrigatorio erro={erro("next_contact_on")}>
                {(p) => <CampoDataContato {...p} valor={form.next_contact_on} aoMudar={(v) => setForm((f) => ({ ...f, next_contact_on: v }))} />}
              </Field>
              <Field rotulo={t("campos.oQueFazer")}>
                {(p) => <Input {...p} value={form.next_contact_note} onChange={(e) => setForm((f) => ({ ...f, next_contact_note: e.target.value }))} />}
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
            <Button type="button" variant="ghost" onClick={() => fechar(false)}>
              {t("acoes.cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("contato.salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
