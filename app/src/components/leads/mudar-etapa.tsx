"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Select, SelectItem, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { moverEtapa, type ResultadoAcao } from "@/lib/leads/acoes";
import { ETAPAS, MOTIVOS_PERDA, estaAberto, type Etapa, type MotivoPerda } from "@/lib/leads/regras";
import { hojeISO, somarDias } from "@/lib/formatos";
import { CampoDataContato } from "./campo-data";

type Props = {
  lead: { id: string; full_name: string; stage: Etapa };
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  /** Etapa já escolhida (ex.: ao arrastar o card para "Perdido"). */
  etapaInicial?: Etapa;
};

/**
 * Mudar etapa. Perdido pede motivo; reabrir pede próximo contato.
 * Quem usa deve trocar a `key` ao abrir, para o formulário começar limpo.
 */
export function MudarEtapa({ lead, aberto, aoMudar, etapaInicial }: Props) {
  const t = useTranslations("leads");
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoAcao | null>(null);
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial ?? lead.stage);
  const [motivo, setMotivo] = useState<MotivoPerda | "">("");
  const [nota, setNota] = useState("");
  const [data, setData] = useState(somarDias(hojeISO(), 1));

  const reabrindo = estaAberto(etapa) && !estaAberto(lead.stage);
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (c: string) => (erros[c] ? t(`erros.${erros[c]}`) : undefined);

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent titulo={t("etapa.titulo")} descricao={lead.full_name}>
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await moverEtapa({
                lead_id: lead.id,
                stage: etapa,
                ...(reabrindo ? { next_contact_on: data } : {}),
                ...(etapa === "lost" ? { lost_reason: motivo || undefined, lost_note: nota } : {}),
              });
              setResultado(r);
              if (r.ok) {
                aoMudar(false);
                router.refresh();
              }
            });
          }}
        >
          <div className="flex flex-col gap-4 px-5 py-5">
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}
            <Field rotulo={t("etapa.novaEtapa")}>
              {(p) => (
                <Select {...p} value={etapa} onValueChange={(v) => setEtapa(v as Etapa)}>
                  {ETAPAS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {t(`etapas.${e}`)}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </Field>

            {etapa === "won" ? <Alert tom="info">{t("etapa.ganhoAviso")}</Alert> : null}

            {etapa === "lost" ? (
              <>
                <Field rotulo={t("etapa.motivo")} obrigatorio erro={erro("lost_reason")}>
                  {(p) => (
                    <Select {...p} placeholder={t("etapa.motivoPlaceholder")} value={motivo} onValueChange={(v) => setMotivo(v as MotivoPerda)}>
                      {MOTIVOS_PERDA.map((m) => (
                        <SelectItem key={m} value={m}>
                          {t(`motivos.${m}`)}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field rotulo={t("etapa.detalhe")}>
                  {(p) => <Textarea {...p} className="min-h-20" value={nota} onChange={(e) => setNota(e.target.value)} />}
                </Field>
              </>
            ) : null}

            {reabrindo ? (
              <Field rotulo={t("campos.proximoContato")} obrigatorio erro={erro("next_contact_on")} dica={t("etapa.reabrirDica")}>
                {(p) => <CampoDataContato {...p} valor={data} aoMudar={setData} />}
              </Field>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
            <Button type="button" variant="ghost" onClick={() => aoMudar(false)}>
              {t("acoes.cancelar")}
            </Button>
            <Button type="submit" variant={etapa === "lost" ? "danger" : "primary"} carregando={pendente} disabled={etapa === lead.stage}>
              {etapa === "lost" ? t("etapa.marcarPerdido") : t("etapa.salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
