"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, SelectItem, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { criarLead, type ResultadoAcao } from "@/lib/leads/acoes";
import { ORIGENS, type Origem } from "@/lib/leads/regras";
import { formatarTelefone, hojeISO, soDigitos } from "@/lib/formatos";
import { CampoDataContato } from "./campo-data";

type Props = {
  /** Abre já aberto (ex.: vindo do botão "Novo" da barra superior). */
  abertoInicial?: boolean;
  /** Botão que abre o cadastro. Padrão: "Novo lead". */
  gatilho?: (abrir: () => void) => React.ReactNode;
};

/** Cadastro rápido de lead em painel lateral (Documentação/04: menos de 15 segundos). */
export function NovoLead({ abertoInicial = false, gatilho }: Props) {
  const t = useTranslations("leads");
  const router = useRouter();
  const [aberto, setAberto] = useState(abertoInicial);
  const [pendente, iniciar] = useTransition();
  const [maisDetalhes, setMaisDetalhes] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAcao | null>(null);

  const vazio = {
    full_name: "",
    phone: "",
    source: "instagram" as Origem,
    next_contact_on: hojeISO(),
    next_contact_note: t("novo.primeiroContato"),
    email: "",
    referred_by: "",
    notes: "",
  };
  const [form, setForm] = useState(vazio);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (campo: string) => (erros[campo] ? t(`erros.${erros[campo]}`) : undefined);

  function fechar(v: boolean) {
    setAberto(v);
    if (!v) {
      setForm(vazio);
      setResultado(null);
      setMaisDetalhes(false);
      // Limpa o ?novo=1 da URL, se houver.
      if (abertoInicial) router.replace("/leads");
    }
  }

  function salvar(ignorarDuplicado = false) {
    iniciar(async () => {
      const r = await criarLead({ ...form, phone: soDigitos(form.phone) }, ignorarDuplicado);
      setResultado(r);
      if (r.ok) {
        fechar(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      {gatilho ? (
        gatilho(() => setAberto(true))
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus />
          {t("novoLead")}
        </Button>
      )}
      <DialogContent posicao="lateral" titulo={t("novo.titulo")} descricao={t("novo.descricao")}>
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {resultado && !resultado.ok && resultado.duplicado ? (
              <Alert tom="atencao" titulo={t("novo.duplicadoTitulo")}>
                <p>{t("novo.duplicadoTexto", { nome: resultado.duplicado.nome })}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => router.push(`/leads/${(resultado as { duplicado: { id: string } }).duplicado.id}`)}>
                    {t("novo.verExistente")}
                  </Button>
                  <Button type="button" size="sm" carregando={pendente} onClick={() => salvar(true)}>
                    {t("novo.cadastrarMesmoAssim")}
                  </Button>
                </div>
              </Alert>
            ) : null}
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}

            <Field rotulo={t("campos.nome")} obrigatorio erro={erro("full_name")}>
              {(p) => <Input {...p} autoFocus autoComplete="off" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />}
            </Field>
            <Field rotulo={t("campos.celular")} obrigatorio dica={t("campos.celularDica")} erro={erro("phone")}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(e) => set("phone", formatarTelefone(soDigitos(e.target.value).slice(0, 11)))}
                />
              )}
            </Field>
            <Field rotulo={t("campos.origem")} obrigatorio erro={erro("source")}>
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

            <div className="rounded-card border border-borda bg-superficie-2 p-4">
              <p className="mb-3 text-[13px] font-semibold text-texto">{t("campos.proximoContato")}</p>
              <div className="flex flex-col gap-3">
                <Field rotulo={t("campos.quando")} obrigatorio erro={erro("next_contact_on")}>
                  {(p) => <CampoDataContato {...p} valor={form.next_contact_on} aoMudar={(v) => set("next_contact_on", v)} />}
                </Field>
                <Field rotulo={t("campos.oQueFazer")}>
                  {(p) => <Input {...p} value={form.next_contact_note} onChange={(e) => set("next_contact_note", e.target.value)} />}
                </Field>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMaisDetalhes((v) => !v)}
              aria-expanded={maisDetalhes}
              className="flex items-center gap-1.5 self-start text-[13px] font-medium text-texto-2 hover:text-texto"
            >
              <ChevronDown className={`size-4 transition-transform ${maisDetalhes ? "rotate-180" : ""}`} aria-hidden="true" />
              {t("novo.maisDetalhes")}
            </button>
            {maisDetalhes ? (
              <div className="flex flex-col gap-4">
                <Field rotulo={t("campos.email")} erro={erro("email")}>
                  {(p) => <Input {...p} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />}
                </Field>
                <Field rotulo={t("campos.indicadoPor")}>
                  {(p) => <Input {...p} value={form.referred_by} onChange={(e) => set("referred_by", e.target.value)} />}
                </Field>
                <Field rotulo={t("campos.observacoes")}>
                  {(p) => <Textarea {...p} value={form.notes} onChange={(e) => set("notes", e.target.value)} />}
                </Field>
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
            <Button type="button" variant="ghost" onClick={() => fechar(false)}>
              {t("acoes.cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("novo.salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
