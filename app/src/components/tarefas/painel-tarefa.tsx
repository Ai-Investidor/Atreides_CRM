"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Ban, CircleCheck, RotateCcw, Trash2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, SelectGroup, SelectItem, SelectSeparator, Textarea } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { CampoDataContato } from "@/components/leads/campo-data";
import { concluirTarefa, criarTarefa, editarTarefa, excluirTarefa, naoSeAplica, type ResultadoTarefa } from "@/lib/tarefas/acoes";
import type { Membro, TarefaCompleta } from "@/lib/tarefas/regras";
import { formatarDataHora } from "@/lib/formatos";

const SEM_VINCULO = "nenhum";

type Pessoa = { id: string; full_name: string };

/** Vínculo da tarefa: um lead, um cliente ou nada. */
export type Vinculo = { tipo: "lead" | "cliente"; id: string; full_name: string };

export type ContextoTarefa = {
  usuarioId: string;
  admin: boolean;
  membros: Membro[];
  /** Leads abertos do workspace aberto, para vincular. */
  leads: Pessoa[];
  /** Clientes do workspace aberto, para vincular. */
  clientes?: Pessoa[];
  /** Responsável sugerido em tarefa nova (dono do workspace). */
  responsavelPadrao: string;
};

type Props = {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  tarefa?: TarefaCompleta | null;
  /** Tarefa nova já vinculada (ficha do lead ou do cliente). */
  vinculoFixo?: Vinculo | null;
  contexto: ContextoTarefa;
};

function chaveDe(v: { tipo: "lead" | "cliente"; id: string } | null | undefined) {
  return v ? `${v.tipo}:${v.id}` : SEM_VINCULO;
}

/** Painel lateral para criar ou editar tarefa (Documentação/09). */
export function PainelTarefa({ aberto, aoMudar, tarefa, vinculoFixo, contexto }: Props) {
  const t = useTranslations("tarefas");
  const locale = useLocale();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoTarefa | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [naoAplica, setNaoAplica] = useState<string | null>(null);

  const editando = !!tarefa;
  const doSistema = editando && tarefa!.origin !== "manual";
  const vinculoAtual: Vinculo | null = tarefa?.cliente
    ? { tipo: "cliente", ...tarefa.cliente }
    : tarefa?.lead
      ? { tipo: "lead", ...tarefa.lead }
      : (vinculoFixo ?? null);

  const [form, setForm] = useState({
    title: tarefa?.title ?? "",
    description: tarefa?.description ?? "",
    due_on: tarefa?.due_on ?? "",
    assignee_id: tarefa?.assignee_id ?? contexto.responsavelPadrao,
    vinculo: chaveDe(vinculoAtual),
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const erros = resultado && !resultado.ok ? resultado.erros ?? {} : {};
  const erro = (c: string) => (erros[c] ? t(`erros.${erros[c]}`) : undefined);

  // O vínculo atual continua na lista mesmo que o lead/cliente não esteja mais aberto.
  const leads = [...contexto.leads];
  const clientes = [...(contexto.clientes ?? [])];
  if (vinculoAtual?.tipo === "lead" && !leads.some((l) => l.id === vinculoAtual.id)) leads.unshift(vinculoAtual);
  if (vinculoAtual?.tipo === "cliente" && !clientes.some((c) => c.id === vinculoAtual.id)) clientes.unshift(vinculoAtual);

  const podeExcluir = editando && tarefa!.origin === "manual" && (tarefa!.created_by === contexto.usuarioId || contexto.admin);
  const fechada = tarefa ? tarefa.status !== "open" : false;

  function executar(acao: () => Promise<ResultadoTarefa>) {
    iniciar(async () => {
      const r = await acao();
      setResultado(r);
      if (r.ok) {
        aoMudar(false);
        router.refresh();
      }
    });
  }

  function salvar() {
    const [tipo, id] = form.vinculo === SEM_VINCULO ? [null, null] : form.vinculo.split(":");
    const dados = {
      title: form.title,
      description: form.description,
      due_on: form.due_on,
      assignee_id: form.assignee_id,
      lead_id: tipo === "lead" ? id : null,
      client_id: tipo === "cliente" ? id : null,
    };
    executar(() => (editando ? editarTarefa(tarefa!.id, dados) : criarTarefa(dados)));
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent
        posicao="lateral"
        titulo={editando ? t("form.tituloEditar") : t("form.tituloNova")}
        descricao={editando ? undefined : t("form.descricaoNova")}
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
            {doSistema ? (
              <Alert tom="info">
                <span className="inline-flex items-center gap-1.5">
                  <Workflow className="size-3.5" aria-hidden="true" />
                  {t(`origens.${tarefa!.origin}`)}
                </span>
              </Alert>
            ) : null}
            {tarefa?.status === "done" && tarefa.completed_at ? (
              <Alert tom="ok">
                {t("form.concluidaEm", {
                  data: formatarDataHora(tarefa.completed_at, locale),
                  nome: contexto.membros.find((m) => m.id === tarefa.completed_by)?.full_name ?? "—",
                })}
              </Alert>
            ) : null}
            {tarefa?.status === "not_applicable" ? (
              <Alert tom="info" titulo={t("form.naoAplicaMarcada")}>
                {tarefa.not_applicable_reason}
              </Alert>
            ) : null}

            <Field rotulo={t("form.titulo")} obrigatorio erro={erro("title")}>
              {(p) => <Input {...p} autoFocus={!editando} autoComplete="off" value={form.title} onChange={(e) => set("title", e.target.value)} />}
            </Field>
            <Field rotulo={t("form.prazo")} erro={erro("due_on")}>
              {(p) => <CampoDataContato {...p} valor={form.due_on} aoMudar={(v) => set("due_on", v)} rotuloSemData={t("prazo.semPrazo")} permitirPassado={editando} />}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field rotulo={t("form.responsavel")} obrigatorio erro={erro("assignee_id")}>
                {(p) => (
                  <Select {...p} value={form.assignee_id} onValueChange={(v) => set("assignee_id", v)}>
                    {contexto.membros.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.id === contexto.usuarioId ? `${m.full_name} (${t("voce")})` : m.full_name}
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </Field>
              <Field rotulo={t("form.vinculo")}>
                {(p) => (
                  <Select {...p} value={form.vinculo} onValueChange={(v) => set("vinculo", v)} disabled={!!vinculoFixo || doSistema}>
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
            <Field rotulo={t("form.descricao")}>
              {(p) => <Textarea {...p} value={form.description} onChange={(e) => set("description", e.target.value)} />}
            </Field>

            {editando ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  carregando={pendente}
                  onClick={() => executar(() => concluirTarefa(tarefa!.id, fechada ? false : true))}
                >
                  {fechada ? <RotateCcw /> : <CircleCheck />}
                  {fechada ? t("form.reabrir") : t("form.marcarConcluida")}
                </Button>
                {doSistema && !fechada && naoAplica === null ? (
                  <Button type="button" variant="ghost" onClick={() => setNaoAplica("")}>
                    <Ban />
                    {t("form.naoAplica")}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {naoAplica !== null ? (
              <Alert tom="atencao" titulo={t("form.naoAplicaTitulo")}>
                <Textarea
                  className="mt-2 min-h-16"
                  value={naoAplica}
                  onChange={(e) => setNaoAplica(e.target.value)}
                  placeholder={t("form.naoAplicaMotivo")}
                  aria-label={t("form.naoAplicaMotivo")}
                />
                {erro("motivo") ? <p className="mt-1 text-xs font-medium text-erro">{erro("motivo")}</p> : null}
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" carregando={pendente} onClick={() => executar(() => naoSeAplica(tarefa!.id, naoAplica))}>
                    {t("form.naoAplicaConfirmar")}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setNaoAplica(null)}>
                    {t("form.cancelar")}
                  </Button>
                </div>
              </Alert>
            ) : null}

            {confirmarExclusao ? (
              <Alert tom="atencao" titulo={t("form.excluirConfirma")}>
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="danger" carregando={pendente} onClick={() => executar(() => excluirTarefa(tarefa!.id))}>
                    {t("form.excluir")}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmarExclusao(false)}>
                    {t("form.cancelar")}
                  </Button>
                </div>
              </Alert>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-divisoria px-5 py-3">
            {podeExcluir ? (
              <Button type="button" variant="ghost" className="text-erro hover:text-erro" onClick={() => setConfirmarExclusao(true)} disabled={confirmarExclusao}>
                <Trash2 />
                {t("form.excluir")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => aoMudar(false)}>
                {t("form.cancelar")}
              </Button>
              <Button type="submit" carregando={pendente}>
                {editando ? t("form.salvar") : t("form.criar")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
