"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, SelectItem, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { configurarCarteira, cotacaoAtual, criarAporte, executarAporte, garantirAtivo, informarSaldo, lancar, registrarFotografia, type OpcaoAtivo, type ResultadoCarteira } from "@/lib/carteira/acoes";
import { formatarDataHora, formatarMoeda, hojeISO } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { SeletorAtivo } from "./seletor-ativo";

const num = (v: string) => Number((v || "").replace(/\./g, "").replace(",", "."));
const limpaNum = (v: string) => v.replace(/[^\d,.]/g, "");

function Rodape({ pendente, aoCancelar, rotulo }: { pendente: boolean; aoCancelar: () => void; rotulo: string }) {
  const t = useTranslations("carteira.form");
  return (
    <div className="flex justify-end gap-2 border-t border-divisoria px-5 py-3">
      <Button type="button" variant="ghost" onClick={aoCancelar}>
        {t("cancelar")}
      </Button>
      <Button type="submit" carregando={pendente}>
        {rotulo}
      </Button>
    </div>
  );
}

function useEnvio(aoFechar: () => void) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoCarteira | null>(null);
  function enviar(fn: () => Promise<ResultadoCarteira>) {
    iniciar(async () => {
      const r = await fn();
      setResultado(r);
      if (r.ok) {
        aoFechar();
        router.refresh();
      }
    });
  }
  return { pendente, resultado, enviar, setResultado };
}

/** Lançamento: compra/venda (bolsa) ou aplicação/resgate (renda fixa, fundos, previdência). */
export function FormLancamento({ clienteId, aoFechar, ativoInicial }: { clienteId: string; aoFechar: () => void; ativoInicial?: OpcaoAtivo | null }) {
  const t = useTranslations("carteira.form");
  const te = useTranslations("carteira.erros");
  const locale = useLocale();
  const { pendente, resultado, enviar, setResultado } = useEnvio(aoFechar);
  const [ativo, setAtivo] = useState<OpcaoAtivo | null>(ativoInicial ?? null);
  const [cot, setCot] = useState<{ preco: number; em: string; fonte: string } | null>(null);
  const [form, setForm] = useState({ type: "buy", trade_date: hojeISO(), quantity: "", unit_price: "", amount: "", institution: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (k: string) => (erros[k] ? te(erros[k]) : undefined);
  const bolsa = ativo?.tipo === "bolsa";
  const negociacao = form.type === "buy" || form.type === "sell";
  const total = negociacao ? num(form.quantity) * num(form.unit_price) : num(form.amount);

  async function escolher(o: OpcaoAtivo | null) {
    setAtivo(o);
    setCot(null);
    if (!o) return;
    set("type", o.tipo === "bolsa" ? "buy" : "deposit");
    if (o.tipo === "bolsa" && o.ticker) {
      const c = await cotacaoAtual(o.ticker);
      setCot(c);
      if (c) set("unit_price", String(c.preco).replace(".", ","));
    }
  }

  // Vindo da página do ativo: já busca a cotação para o preço.
  useEffect(() => {
    if (!ativoInicial?.ticker) return;
    let ativoMontado = true;
    void cotacaoAtual(ativoInicial.ticker).then((c) => {
      if (!ativoMontado || !c) return;
      setCot(c);
      setForm((f) => ({ ...f, unit_price: f.unit_price || String(c.preco).replace(".", ",") }));
    });
    return () => {
      ativoMontado = false;
    };
  }, [ativoInicial]);

  function salvar() {
    if (!ativo) return setResultado({ ok: false, erros: { asset_id: "ativo" } });
    enviar(async () => {
      const a = await garantirAtivo(ativo);
      if (!a.ok || !a.id) return a.ok ? { ok: false, mensagem: "salvar" } : a;
      return lancar(clienteId, {
        asset_id: a.id,
        type: form.type,
        trade_date: form.trade_date,
        quantity: negociacao ? form.quantity : null,
        unit_price: negociacao ? form.unit_price : null,
        amount: negociacao ? null : form.amount,
        institution: form.institution,
      });
    });
  }

  const tipos = bolsa ? (["buy", "sell"] as const) : (["deposit", "withdrawal"] as const);
  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent posicao="lateral" titulo={t("lancamentoTitulo")} descricao={t("lancamentoDescricao")}>
        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={(e) => (e.preventDefault(), salvar())}>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{te(resultado.mensagem)}</Alert> : null}
            <Field rotulo={t("ativo")} obrigatorio erro={erro("asset_id")}>
              {() => <SeletorAtivo valor={ativo} aoMudar={escolher} />}
            </Field>
            {ativo ? (
              <>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("tipo")}>
                  {tipos.map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      role="radio"
                      aria-checked={form.type === tp}
                      onClick={() => set("type", tp)}
                      className={cn(
                        "h-10 rounded-marca border text-sm font-medium transition-colors",
                        form.type === tp ? "border-marinho bg-marinho text-osso" : "border-borda-forte bg-superficie text-texto-2 hover:border-marinho",
                      )}
                    >
                      {t(`tipos.${tp}`)}
                    </button>
                  ))}
                </div>
                <Field rotulo={t("data")} obrigatorio erro={erro("trade_date")}>
                  {(p) => <Input {...p} type="date" max={hojeISO()} value={form.trade_date} onChange={(e) => set("trade_date", e.target.value)} />}
                </Field>
                {negociacao ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Field rotulo={t("quantidade")} obrigatorio erro={erro("quantity")}>
                      {(p) => <Input {...p} inputMode="decimal" value={form.quantity} onChange={(e) => set("quantity", limpaNum(e.target.value))} />}
                    </Field>
                    <Field rotulo={t("preco")} obrigatorio erro={erro("unit_price")} dica={cot ? t("cotacaoDica", { fonte: cot.fonte, hora: formatarDataHora(cot.em, locale) }) : undefined}>
                      {(p) => <Input {...p} inputMode="decimal" value={form.unit_price} onChange={(e) => set("unit_price", limpaNum(e.target.value))} />}
                    </Field>
                  </div>
                ) : (
                  <Field rotulo={t("valor")} obrigatorio erro={erro("amount")}>
                    {(p) => <Input {...p} inputMode="decimal" value={form.amount} onChange={(e) => set("amount", limpaNum(e.target.value))} />}
                  </Field>
                )}
                <Field rotulo={t("instituicao")}>
                  {(p) => <Input {...p} placeholder="XP, Rico, BTG…" value={form.institution} onChange={(e) => set("institution", e.target.value)} />}
                </Field>
                <p className="numero rounded-marca bg-superficie-2 px-3 py-2 text-sm text-texto-2">
                  {t("total")}: <span className="font-semibold text-texto">{formatarMoeda(Number.isFinite(total) ? total : 0, locale, false)}</span>
                </p>
              </>
            ) : null}
          </div>
          <Rodape pendente={pendente} aoCancelar={aoFechar} rotulo={t("lancar")} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Saldo atual de um ativo manual numa data. */
export function FormSaldo({ clienteId, ativos, aoFechar }: { clienteId: string; ativos: { id: string; nome: string }[]; aoFechar: () => void }) {
  const t = useTranslations("carteira.form");
  const te = useTranslations("carteira.erros");
  const { pendente, resultado, enviar } = useEnvio(aoFechar);
  const [form, setForm] = useState({ asset_id: ativos[0]?.id ?? "", ref_date: hojeISO(), value: "" });
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent posicao="lateral" titulo={t("saldoTitulo")} descricao={t("saldoDescricao")}>
        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={(e) => (e.preventDefault(), enviar(() => informarSaldo(clienteId, form)))}>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{te(resultado.mensagem)}</Alert> : null}
            {!ativos.length ? <Alert tom="info">{t("saldoSemAtivos")}</Alert> : null}
            <Field rotulo={t("ativo")} obrigatorio>
              {(p) => (
                <Select {...p} value={form.asset_id} onValueChange={(v) => setForm((f) => ({ ...f, asset_id: v }))}>
                  {ativos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </Field>
            <Field rotulo={t("dataSaldo")} obrigatorio erro={erros.ref_date ? te(erros.ref_date) : undefined}>
              {(p) => <Input {...p} type="date" max={hojeISO()} value={form.ref_date} onChange={(e) => setForm((f) => ({ ...f, ref_date: e.target.value }))} />}
            </Field>
            <Field rotulo={t("saldo")} obrigatorio erro={erros.value ? te(erros.value) : undefined} dica={t("saldoDica")}>
              {(p) => <Input {...p} inputMode="decimal" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: limpaNum(e.target.value) }))} />}
            </Field>
          </div>
          <Rodape pendente={pendente} aoCancelar={aoFechar} rotulo={t("salvarSaldo")} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ItemForm = { chave: number; ativo: OpcaoAtivo | null; quantidade: string; preco: string };
let seq = 0;
const novoItem = (): ItemForm => ({ chave: ++seq, ativo: null, quantidade: "", preco: "" });

/** Plano de aportes do período: ticker (nome vem sozinho), preço por ação, quantidade e total. */
export function FormAporte({ clienteId, frequencia, aoFechar }: { clienteId: string; frequencia: "monthly" | "weekly"; aoFechar: () => void }) {
  const t = useTranslations("carteira.form");
  const te = useTranslations("carteira.erros");
  const locale = useLocale();
  const { pendente, resultado, enviar } = useEnvio(aoFechar);
  const hoje = hojeISO();
  const [tipo, setTipo] = useState(frequencia);
  const [inicio, setInicio] = useState(frequencia === "monthly" ? `${hoje.slice(0, 7)}-01` : hoje);
  const [notas, setNotas] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([novoItem()]);
  const total = itens.reduce((s, i) => s + (num(i.quantidade) * num(i.preco) || 0), 0);
  const mudar = (chave: number, campo: Partial<ItemForm>) => setItens((l) => l.map((i) => (i.chave === chave ? { ...i, ...campo } : i)));

  async function escolher(chave: number, o: OpcaoAtivo | null) {
    mudar(chave, { ativo: o });
    if (o?.ticker) {
      const c = await cotacaoAtual(o.ticker);
      if (c) mudar(chave, { ativo: o, preco: String(c.preco).replace(".", ",") });
    }
  }

  function salvar() {
    enviar(async () => {
      const prontos = itens.filter((i) => i.ativo);
      if (!prontos.length) return { ok: false, mensagem: "aporteVazio" };
      const ids: { asset_id: string; quantity: string; unit_price: string }[] = [];
      for (const i of prontos) {
        const a = await garantirAtivo(i.ativo!);
        if (!a.ok || !a.id) return a.ok ? { ok: false, mensagem: "salvar" } : a;
        ids.push({ asset_id: a.id, quantity: i.quantidade, unit_price: i.preco });
      }
      return criarAporte(clienteId, { tipo, inicio, notas }, ids);
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent posicao="lateral" titulo={t("aporteTitulo")} descricao={t("aporteDescricao")} className="max-w-2xl">
        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={(e) => (e.preventDefault(), salvar())}>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {resultado && !resultado.ok ? <Alert tom="erro">{te(resultado.mensagem ?? Object.values(resultado.erros ?? {})[0] ?? "salvar")}</Alert> : null}
            <div className="grid grid-cols-2 gap-3">
              <Field rotulo={t("periodo")}>
                {(p) => (
                  <Select {...p} value={tipo} onValueChange={(v) => setTipo(v as "monthly" | "weekly")}>
                    <SelectItem value="monthly">{t("mensal")}</SelectItem>
                    <SelectItem value="weekly">{t("semanal")}</SelectItem>
                  </Select>
                )}
              </Field>
              <Field rotulo={t("inicioPeriodo")}>{(p) => <Input {...p} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />}</Field>
            </div>

            <div className="flex flex-col gap-3">
              {itens.map((i, idx) => (
                <div key={i.chave} className="flex flex-col gap-3 rounded-card border border-borda p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-texto-3">{t("item", { n: idx + 1 })}</span>
                    {itens.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t("removerItem")} onClick={() => setItens((l) => l.filter((x) => x.chave !== i.chave))}>
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                  <SeletorAtivo valor={i.ativo} aoMudar={(o) => escolher(i.chave, o)} somenteBolsa permitirManual={false} />
                  <div className="grid grid-cols-3 gap-2">
                    <Field rotulo={t("preco")}>{(p) => <Input {...p} inputMode="decimal" value={i.preco} onChange={(e) => mudar(i.chave, { preco: limpaNum(e.target.value) })} />}</Field>
                    <Field rotulo={t("quantidade")}>{(p) => <Input {...p} inputMode="decimal" value={i.quantidade} onChange={(e) => mudar(i.chave, { quantidade: limpaNum(e.target.value) })} />}</Field>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-texto">{t("soma")}</span>
                      <span className="numero flex h-10 items-center rounded-marca bg-superficie-2 px-3 text-sm font-semibold">
                        {formatarMoeda(num(i.quantidade) * num(i.preco) || 0, locale, false)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" className="self-start" onClick={() => setItens((l) => [...l, novoItem()])}>
                <Plus />
                {t("adicionarItem")}
              </Button>
            </div>
            <Field rotulo={t("notas")}>{(p) => <Textarea {...p} className="min-h-16" value={notas} onChange={(e) => setNotas(e.target.value)} />}</Field>
            <p className="numero rounded-marca bg-superficie-2 px-3 py-2 text-sm text-texto-2">
              {t("totalAporte")}: <span className="font-semibold text-texto">{formatarMoeda(total, locale, false)}</span>
            </p>
          </div>
          <Rodape pendente={pendente} aoCancelar={aoFechar} rotulo={t("salvarAporte")} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Executar aporte: data da compra e instituição. */
export function ExecutarAporte({ clienteId, aporteId, aoFechar }: { clienteId: string; aporteId: string; aoFechar: () => void }) {
  const t = useTranslations("carteira.form");
  const te = useTranslations("carteira.erros");
  const { pendente, resultado, enviar } = useEnvio(aoFechar);
  const [data, setData] = useState(hojeISO());
  const [inst, setInst] = useState("");
  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent titulo={t("executarTitulo")} descricao={t("executarDescricao")}>
        <form className="flex flex-col gap-4 px-5 py-4" onSubmit={(e) => (e.preventDefault(), enviar(() => executarAporte(clienteId, aporteId, data, inst)))}>
          {resultado && !resultado.ok ? <Alert tom="erro">{te(resultado.mensagem ?? Object.values(resultado.erros ?? {})[0] ?? "salvar")}</Alert> : null}
          <Field rotulo={t("dataCompra")} obrigatorio>{(p) => <Input {...p} type="date" max={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />}</Field>
          <Field rotulo={t("instituicao")}>{(p) => <Input {...p} placeholder="XP, Rico, BTG…" value={inst} onChange={(e) => setInst(e.target.value)} />}</Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar}>
              {t("cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("executar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Fotografia (data) e configuração (frequência e limite de desvio). */
export function FormFotografia({ clienteId, aoFechar }: { clienteId: string; aoFechar: () => void }) {
  const t = useTranslations("carteira.form");
  const te = useTranslations("carteira.erros");
  const { pendente, resultado, enviar } = useEnvio(aoFechar);
  const [data, setData] = useState(hojeISO());
  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent titulo={t("fotoTitulo")} descricao={t("fotoDescricao")}>
        <form className="flex flex-col gap-4 px-5 py-4" onSubmit={(e) => (e.preventDefault(), enviar(() => registrarFotografia(clienteId, data)))}>
          {resultado && !resultado.ok ? <Alert tom="erro">{te(resultado.mensagem ?? Object.values(resultado.erros ?? {})[0] ?? "salvar")}</Alert> : null}
          <Field rotulo={t("dataFoto")} obrigatorio>{(p) => <Input {...p} type="date" max={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />}</Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar}>
              {t("cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("registrarFoto")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FormConfig({ clienteId, frequencia, limite, aoFechar }: { clienteId: string; frequencia: "monthly" | "weekly"; limite: number; aoFechar: () => void }) {
  const t = useTranslations("carteira.form");
  const te = useTranslations("carteira.erros");
  const { pendente, resultado, enviar } = useEnvio(aoFechar);
  const [freq, setFreq] = useState(frequencia);
  const [lim, setLim] = useState(String(limite).replace(".", ","));
  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent titulo={t("configTitulo")} descricao={t("configDescricao")}>
        <form className="flex flex-col gap-4 px-5 py-4" onSubmit={(e) => (e.preventDefault(), enviar(() => configurarCarteira(clienteId, freq, num(lim))))}>
          {resultado && !resultado.ok ? <Alert tom="erro">{te(resultado.mensagem ?? "salvar")}</Alert> : null}
          <Field rotulo={t("frequencia")}>
            {(p) => (
              <Select {...p} value={freq} onValueChange={(v) => setFreq(v as "monthly" | "weekly")}>
                <SelectItem value="monthly">{t("mensal")}</SelectItem>
                <SelectItem value="weekly">{t("semanal")}</SelectItem>
              </Select>
            )}
          </Field>
          <Field rotulo={t("limiteDesvio")} dica={t("limiteDica")}>{(p) => <Input {...p} inputMode="decimal" value={lim} onChange={(e) => setLim(limpaNum(e.target.value))} />}</Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar}>
              {t("cancelar")}
            </Button>
            <Button type="submit" carregando={pendente}>
              {t("salvar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

