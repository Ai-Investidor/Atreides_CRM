"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LogOut, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, SelectItem, Textarea } from "@/components/ui/form";
import { criarNucleo, editarCliente, registrarAceite, vincularNucleo, type ResultadoCliente } from "@/lib/clientes/acoes";
import type { FichaCliente } from "@/lib/clientes/consultas";
import { ESTADOS_CIVIS, formatarCPF, PAPEIS, UFS } from "@/lib/clientes/regras";
import { ORIGENS } from "@/lib/leads/regras";
import { formatarDataHora, formatarMoeda, formatarTelefone, soDigitos } from "@/lib/formatos";
import { NovoCliente } from "./novo-cliente";

type Props = { ficha: FichaCliente; nucleos: { id: string; name: string }[]; somenteLeitura?: boolean };

const num = (v: number | null) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

/** Aba Dados: cadastro completo, aceite LGPD e núcleo familiar. */
export function AbaDados({ ficha, nucleos, somenteLeitura }: Props) {
  const t = useTranslations("clientes");
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoCliente | null>(null);
  const [salvo, setSalvo] = useState(false);
  const c = ficha.cliente;
  const dependente = c.family_role === "dependent";

  const [form, setForm] = useState({
    full_name: c.full_name,
    cpf: c.cpf ? formatarCPF(c.cpf) : "",
    phone: c.phone ? formatarTelefone(c.phone) : "",
    email: c.email ?? "",
    birth_date: c.birth_date ?? "",
    marital_status: c.marital_status ?? "",
    profession: c.profession ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    source: c.source ?? "",
    referred_by: c.referred_by ?? "",
    contract_start_on: c.contract_start_on ?? "",
    monthly_income: num(c.monthly_income),
    declared_net_worth: num(c.declared_net_worth),
    notes: c.notes ?? "",
    report_frequency: c.report_frequency,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setSalvo(false);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (k: string) => (erros[k] ? t(`erros.${erros[k]}`) : undefined);
  const obrig = !dependente;

  function salvar() {
    iniciar(async () => {
      const r = await editarCliente(c.id, { ...form, cpf: soDigitos(form.cpf), phone: soDigitos(form.phone) });
      setResultado(r);
      if (r.ok) {
        setSalvo(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>{t("dados.titulo")}</CardTitle>
            <CardDescription>{t("dados.descricao")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              salvar();
            }}
          >
            {resultado && !resultado.ok && resultado.mensagem ? <Alert tom="erro">{t(`erros.${resultado.mensagem}`)}</Alert> : null}
            {salvo ? <Alert tom="ok">{t("dados.salvo")}</Alert> : null}

            <fieldset disabled={somenteLeitura} className="flex flex-col gap-5">
              <Secao titulo={t("dados.identificacao")}>
                <Field rotulo={t("campos.nome")} obrigatorio erro={erro("full_name")} className="sm:col-span-2">
                  {(p) => <Input {...p} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />}
                </Field>
                <Field rotulo={t("campos.cpf")} obrigatorio={obrig} erro={erro("cpf")}>
                  {(p) => <Input {...p} inputMode="numeric" value={form.cpf} onChange={(e) => set("cpf", formatarCPF(e.target.value))} />}
                </Field>
                <Field rotulo={t("campos.nascimento")} erro={erro("birth_date")}>
                  {(p) => <Input {...p} type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />}
                </Field>
                <Field rotulo={t("campos.estadoCivil")}>
                  {(p) => (
                    <Select {...p} value={form.marital_status} onValueChange={(v) => set("marital_status", v)} placeholder="—">
                      {ESTADOS_CIVIS.map((x) => (
                        <SelectItem key={x} value={x}>
                          {t(`estadosCivis.${x}`)}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field rotulo={t("campos.profissao")}>{(p) => <Input {...p} value={form.profession} onChange={(e) => set("profession", e.target.value)} />}</Field>
              </Secao>

              <Secao titulo={t("dados.contato")}>
                <Field rotulo={t("campos.celular")} obrigatorio={obrig} erro={erro("phone")}>
                  {(p) => <Input {...p} inputMode="tel" value={form.phone} onChange={(e) => set("phone", formatarTelefone(soDigitos(e.target.value).slice(0, 11)))} />}
                </Field>
                <Field rotulo={t("campos.email")} obrigatorio={obrig} erro={erro("email")}>
                  {(p) => <Input {...p} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />}
                </Field>
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
              </Secao>

              <Secao titulo={t("dados.relacao")}>
                <Field rotulo={t("campos.origem")}>
                  {(p) => (
                    <Select {...p} value={form.source} onValueChange={(v) => set("source", v)} placeholder="—">
                      {ORIGENS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {t(`origens.${o}`)}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field rotulo={t("campos.indicadoPor")}>{(p) => <Input {...p} value={form.referred_by} onChange={(e) => set("referred_by", e.target.value)} />}</Field>
                <Field rotulo={t("campos.inicioContrato")} erro={erro("contract_start_on")}>
                  {(p) => <Input {...p} type="date" value={form.contract_start_on} onChange={(e) => set("contract_start_on", e.target.value)} />}
                </Field>
                <Field rotulo={t("campos.periodicidadeRelatorio")}>
                  {(p) => (
                    <Select {...p} value={form.report_frequency} onValueChange={(v) => set("report_frequency", v as typeof form.report_frequency)}>
                      {(["monthly", "quarterly", "semiannual"] as const).map((f) => (
                        <SelectItem key={f} value={f}>
                          {t(`periodicidades.${f}`)}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </Field>
              </Secao>

              <Secao titulo={t("dados.financeiro")}>
                <Field rotulo={t("campos.renda")} erro={erro("monthly_income")} dica={t("dados.emReais")}>
                  {(p) => <Input {...p} inputMode="decimal" value={form.monthly_income} onChange={(e) => set("monthly_income", e.target.value.replace(/[^\d.,]/g, ""))} />}
                </Field>
                <Field rotulo={t("campos.patrimonio")} erro={erro("declared_net_worth")} dica={t("dados.emReais")}>
                  {(p) => <Input {...p} inputMode="decimal" value={form.declared_net_worth} onChange={(e) => set("declared_net_worth", e.target.value.replace(/[^\d.,]/g, ""))} />}
                </Field>
              </Secao>

              <Field rotulo={t("campos.observacoes")}>{(p) => <Textarea {...p} value={form.notes} onChange={(e) => set("notes", e.target.value)} />}</Field>
            </fieldset>

            {!somenteLeitura ? (
              <div className="flex justify-end">
                <Button type="submit" carregando={pendente}>
                  {t("dados.salvar")}
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Lgpd ficha={ficha} somenteLeitura={somenteLeitura} />
        <Nucleo ficha={ficha} nucleos={nucleos} somenteLeitura={somenteLeitura} />
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-texto-3">{titulo}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Lgpd({ ficha, somenteLeitura }: { ficha: FichaCliente; somenteLeitura?: boolean }) {
  const t = useTranslations("clientes.lgpd");
  const locale = useLocale();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const em = ficha.cliente.lgpd_consent_at;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("titulo")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {em ? (
          <p className="flex items-center gap-2 text-sm text-ok">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {t("registrado", { data: formatarDataHora(em, locale) })}
          </p>
        ) : (
          <>
            <p className="text-sm text-texto-2">{t("pendente")}</p>
            {!somenteLeitura ? (
              <Button
                variant="secondary"
                className="self-start"
                carregando={pendente}
                onClick={() =>
                  iniciar(async () => {
                    await registrarAceite(ficha.cliente.id);
                    router.refresh();
                  })
                }
              >
                <ShieldCheck />
                {t("registrar")}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Nucleo({ ficha, nucleos, somenteLeitura }: Props) {
  const t = useTranslations("clientes.nucleo");
  const tc = useTranslations("clientes");
  const locale = useLocale();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [modo, setModo] = useState<"criar" | "vincular" | null>(null);
  const [nome, setNome] = useState(`Família ${ficha.cliente.full_name.split(" ").slice(-1)[0]}`);
  const [papel, setPapel] = useState<(typeof PAPEIS)[number]>("holder");
  const [destino, setDestino] = useState(nucleos[0]?.id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const { nucleo, membros } = ficha.familia;
  const total = membros.reduce((s, m) => s + (m.declared_net_worth ?? 0), 0);

  function executar(fn: () => Promise<ResultadoCliente>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setErro(tc(`erros.${r.mensagem ?? Object.values(r.erros ?? {})[0] ?? "salvar"}`));
      setModo(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{nucleo ? nucleo.name : t("semNucleo")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erro ? <Alert tom="erro">{erro}</Alert> : null}
        {nucleo ? (
          <>
            <ul className="flex flex-col gap-2">
              {membros.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/clientes/${m.id}`} className="min-w-0 truncate font-medium hover:underline">
                    {m.full_name}
                  </Link>
                  <span className="shrink-0 text-xs text-texto-3">{m.family_role ? tc(`papeis.${m.family_role}`) : ""}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-divisoria pt-3 text-sm">
              <span className="text-texto-3">{t("patrimonioConsolidado")}</span>
              <span className="numero font-semibold">{formatarMoeda(total, locale)}</span>
            </div>
            {!somenteLeitura ? (
              <div className="flex flex-wrap gap-2">
                <NovoCliente
                  nucleo={{ id: nucleo.id, nome: nucleo.name }}
                  gatilho={(abrir) => (
                    <Button variant="secondary" size="sm" onClick={abrir}>
                      <UserPlus />
                      {t("adicionarMembro")}
                    </Button>
                  )}
                />
                <Button variant="ghost" size="sm" carregando={pendente} onClick={() => window.confirm(t("sairConfirma")) && executar(() => vincularNucleo(ficha.cliente.id, null, null))}>
                  <LogOut />
                  {t("sair")}
                </Button>
              </div>
            ) : null}
          </>
        ) : !somenteLeitura ? (
          modo === null ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setModo("criar")}>
                <Users />
                {t("criar")}
              </Button>
              {nucleos.length ? (
                <Button variant="ghost" size="sm" onClick={() => setModo("vincular")}>
                  {t("vincular")}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {modo === "criar" ? (
                <Field rotulo={t("nome")}>{(p) => <Input {...p} value={nome} onChange={(e) => setNome(e.target.value)} />}</Field>
              ) : (
                <Field rotulo={t("qual")}>
                  {(p) => (
                    <Select {...p} value={destino} onValueChange={setDestino}>
                      {nucleos.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
              <Field rotulo={tc("campos.papel")}>
                {(p) => (
                  <Select {...p} value={papel} onValueChange={(v) => setPapel(v as (typeof PAPEIS)[number])}>
                    {PAPEIS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {tc(`papeis.${x}`)}
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  carregando={pendente}
                  onClick={() => executar(() => (modo === "criar" ? criarNucleo(ficha.cliente.id, nome, papel) : vincularNucleo(ficha.cliente.id, destino, papel)))}
                >
                  {tc("acoes.salvar")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setModo(null)}>
                  {tc("acoes.cancelar")}
                </Button>
              </div>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
