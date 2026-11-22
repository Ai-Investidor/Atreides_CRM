"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, SelectItem, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { editarLead, type ResultadoAcao } from "@/lib/leads/acoes";
import { ORIGENS, type Lead, type Origem } from "@/lib/leads/regras";
import { formatarTelefone, soDigitos } from "@/lib/formatos";

/** Edição dos dados cadastrais do lead (painel lateral). */
export function EditarLead({ lead, aberto, aoMudar }: { lead: Lead; aberto: boolean; aoMudar: (v: boolean) => void }) {
  const t = useTranslations("leads");
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAcao | null>(null);
  const [form, setForm] = useState({
    full_name: lead.full_name,
    phone: formatarTelefone(lead.phone),
    email: lead.email ?? "",
    source: lead.source,
    referred_by: lead.referred_by ?? "",
    notes: lead.notes ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (c: string) => (erros[c] ? t(`erros.${erros[c]}`) : undefined);

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent posicao="lateral" titulo={t("editar.titulo")} descricao={lead.full_name}>
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await editarLead(lead.id, { ...form, phone: soDigitos(form.phone) });
              setResultado(r);
              if (r.ok) {
                aoMudar(false);
                router.refresh();
              }
            });
          }}
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}
            <Field rotulo={t("campos.nome")} obrigatorio erro={erro("full_name")}>
              {(p) => <Input {...p} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />}
            </Field>
            <Field rotulo={t("campos.celular")} obrigatorio erro={erro("phone")}>
              {(p) => (
                <Input {...p} inputMode="tel" value={form.phone} onChange={(e) => set("phone", formatarTelefone(soDigitos(e.target.value).slice(0, 11)))} />
              )}
            </Field>
            <Field rotulo={t("campos.email")} erro={erro("email")}>
              {(p) => <Input {...p} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />}
            </Field>
            <Field rotulo={t("campos.origem")} obrigatorio>
              {(p) => (
                <Select {...p} value={form.source} onValueChange={(v) => set("source", v as Origem)}>
                  {ORIGENS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {t(`origens.${o}`)}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </Field>
            <Field rotulo={t("campos.indicadoPor")}>
              {(p) => <Input {...p} value={form.referred_by} onChange={(e) => set("referred_by", e.target.value)} />}
            </Field>
            <Field rotulo={t("campos.observacoes")}>
              {(p) => <Textarea {...p} value={form.notes} onChange={(e) => set("notes", e.target.value)} />}
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
            <Button type="button" variant="ghost" onClick={() => aoMudar(false)}>
              {t("acoes.cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("editar.salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
