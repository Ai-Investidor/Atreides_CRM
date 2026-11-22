"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, SelectItem } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { criarCliente, type ResultadoCliente } from "@/lib/clientes/acoes";
import { formatarCPF, UFS } from "@/lib/clientes/regras";
import { ORIGENS, type Origem } from "@/lib/leads/regras";
import { formatarTelefone, soDigitos } from "@/lib/formatos";
import { cn } from "@/lib/utils";

export type LeadParaConverter = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  source: Origem;
  referred_by: string | null;
};

type Props = {
  abertoInicial?: boolean;
  /** Botão que abre o painel. Padrão: "Novo cliente". */
  gatilho?: (abrir: () => void) => React.ReactNode;
  /** Conversão: dados do lead já preenchidos e o lead vinculado ao cliente. */
  lead?: LeadParaConverter | null;
  /** Novo dependente de um núcleo familiar (CPF, celular e e-mail opcionais). */
  nucleo?: { id: string; nome: string } | null;
  /** URL para limpar ao fechar (ex.: tirar ?novo=1). */
  urlAoFechar?: string;
  /** Avisado quando o painel fecha sem salvar. */
  aoFechar?: () => void;
};

/** Cadastro de cliente em painel lateral (Documentação/03). */
export function NovoCliente({ abertoInicial = false, gatilho, lead, nucleo, urlAoFechar, aoFechar }: Props) {
  const t = useTranslations("clientes");
  const router = useRouter();
  const [aberto, setAberto] = useState(abertoInicial);
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoCliente | null>(null);
  const dependente = !!nucleo;

  const vazio = () => ({
    full_name: lead?.full_name ?? "",
    cpf: "",
    phone: lead ? formatarTelefone(lead.phone) : "",
    email: lead?.email ?? "",
    source: (lead?.source ?? "referral") as Origem,
    referred_by: lead?.referred_by ?? "",
    city: "",
    state: "",
    birth_date: "",
    contract_start_on: "",
    migrado: false,
    aceite: false,
    papel: "dependent" as "dependent" | "spouse",
  });
  const [form, setForm] = useState(vazio);
  const set = <K extends keyof ReturnType<typeof vazio>>(k: K, v: ReturnType<typeof vazio>[K]) => setForm((f) => ({ ...f, [k]: v }));
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (c: string) => (erros[c] ? t(`erros.${erros[c]}`) : undefined);

  function fechar(v: boolean) {
    setAberto(v);
    if (!v) {
      setForm(vazio());
      setResultado(null);
      if (urlAoFechar) router.replace(urlAoFechar);
      aoFechar?.();
    }
  }

  function salvar() {
    iniciar(async () => {
      const { migrado, aceite, papel, ...dados } = form;
      const r = await criarCliente(
        { ...dados, cpf: soDigitos(dados.cpf), phone: soDigitos(dados.phone) },
        {
          migrado: !lead && !dependente && migrado,
          aceiteLgpd: aceite,
          leadId: lead?.id ?? null,
          nucleo: nucleo ? { id: nucleo.id, papel } : null,
        },
      );
      setResultado(r);
      if (r.ok && r.id) {
        setAberto(false);
        router.push(`/clientes/${r.id}`);
      }
    });
  }

  const titulo = lead ? t("novo.tituloConverter") : dependente ? t("novo.tituloDependente", { nucleo: nucleo!.nome }) : t("novo.titulo");
  const descricao = lead ? t("novo.descricaoConverter") : dependente ? t("novo.descricaoDependente") : t("novo.descricao");

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      {gatilho ? (
        gatilho(() => setAberto(true))
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus />
          {t("novoCliente")}
        </Button>
      )}
      <DialogContent posicao="lateral" titulo={titulo} descricao={descricao}>
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
                <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => router.push(`/clientes/${(resultado as { duplicado: { id: string } }).duplicado.id}`)}>
                  {t("novo.verExistente")}
                </Button>
              </Alert>
            ) : null}
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}

            {dependente ? (
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-medium text-texto">{t("campos.papel")}</legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup">
                  {(["dependent", "spouse"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={form.papel === p}
                      onClick={() => set("papel", p)}
                      className={cn(
                        "h-10 rounded-marca border text-sm font-medium transition-colors",
                        form.papel === p ? "border-marinho bg-marinho text-osso" : "border-borda-forte bg-superficie text-texto-2 hover:border-marinho",
                      )}
                    >
                      {t(`papeis.${p}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <Field rotulo={t("campos.nome")} obrigatorio erro={erro("full_name")}>
              {(p) => <Input {...p} autoFocus autoComplete="off" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />}
            </Field>
            <Field rotulo={t("campos.cpf")} obrigatorio={!(dependente && form.papel === "dependent")} erro={erro("cpf")}>
              {(p) => (
                <Input {...p} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set("cpf", formatarCPF(e.target.value))} />
              )}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field rotulo={t("campos.celular")} obrigatorio={!(dependente && form.papel === "dependent")} erro={erro("phone")}>
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
              <Field rotulo={t("campos.email")} obrigatorio={!(dependente && form.papel === "dependent")} erro={erro("email")}>
                {(p) => <Input {...p} type="email" autoComplete="off" value={form.email} onChange={(e) => set("email", e.target.value)} />}
              </Field>
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Field rotulo={t("campos.cidade")}>{(p) => <Input {...p} value={form.city} onChange={(e) => set("city", e.target.value)} />}</Field>
              <Field rotulo={t("campos.uf")}>
                {(p) => (
                  <Select {...p} value={form.state} onValueChange={(v) => set("state", v)} placeholder="—">
                    {UFS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            {!dependente ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field rotulo={t("campos.origem")}>
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
                  <Field rotulo={t("campos.inicioContrato")} erro={erro("contract_start_on")}>
                    {(p) => <Input {...p} type="date" value={form.contract_start_on} onChange={(e) => set("contract_start_on", e.target.value)} />}
                  </Field>
                </div>
                {form.source === "referral" ? (
                  <Field rotulo={t("campos.indicadoPor")}>{(p) => <Input {...p} value={form.referred_by} onChange={(e) => set("referred_by", e.target.value)} />}</Field>
                ) : null}
              </>
            ) : null}

            <div className="flex flex-col gap-3 rounded-card border border-borda bg-superficie-2 p-4">
              <Caixa marcada={form.aceite} aoMudar={(v) => set("aceite", v)} rotulo={t("novo.aceite")} dica={t("novo.aceiteDica")} />
              {!lead && !dependente ? (
                <Caixa marcada={form.migrado} aoMudar={(v) => set("migrado", v)} rotulo={t("novo.migrado")} dica={t("novo.migradoDica")} />
              ) : null}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
            <Button type="button" variant="ghost" onClick={() => fechar(false)}>
              {t("acoes.cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {lead ? t("novo.converter") : t("novo.salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Caixa({ marcada, aoMudar, rotulo, dica }: { marcada: boolean; aoMudar: (v: boolean) => void; rotulo: string; dica: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={marcada} onChange={(e) => aoMudar(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-marinho)]" />
      <span>
        <span className="block text-[13px] font-medium text-texto">{rotulo}</span>
        <span className="block text-xs text-texto-3">{dica}</span>
      </span>
    </label>
  );
}
