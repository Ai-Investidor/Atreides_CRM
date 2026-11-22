"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Select, SelectItem } from "@/components/ui/form";
import { criarTarefa } from "@/lib/tarefas/acoes";
import { GRUPOS, grupoDe, ordenar, type Grupo, type TarefaCompleta, type Visao } from "@/lib/tarefas/regras";
import { hojeISO, somarDias } from "@/lib/formatos";
import { cn } from "@/lib/utils";
import { LinhaTarefa } from "./linha-tarefa";
import { PainelTarefa, type ContextoTarefa } from "./painel-tarefa";
import { useAlternarTarefas } from "./use-alternar";

type Props = {
  tarefas: TarefaCompleta[];
  visao: Visao;
  contexto: ContextoTarefa;
  consultorId?: string | null;
};

const PRAZOS_RAPIDOS = ["semPrazo", "hoje", "amanha", "semana"] as const;

/** Lista de tarefas agrupada por prazo, com criação rápida e concluir em um clique (Documentação/09). */
export function ListaTarefas({ tarefas, visao, contexto, consultorId }: Props) {
  const t = useTranslations("tarefas");
  const router = useRouter();
  const { tarefas: lista, alternar, ultima, desfazer, falhou, fecharAviso } = useAlternarTarefas(tarefas);
  const [painel, setPainel] = useState<{ chave: number; tarefa: TarefaCompleta | null } | null>(null);
  const [verConcluidas, setVerConcluidas] = useState(false);

  const hoje = hojeISO();
  const abertas = lista.filter((x) => x.status === "open");
  const concluidas = lista
    .filter((x) => x.status !== "open")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const porGrupo = new Map<Grupo, TarefaCompleta[]>(GRUPOS.map((g) => [g, []]));
  for (const x of abertas) porGrupo.get(grupoDe(x, hoje))!.push(x);
  for (const g of porGrupo.values()) g.sort(ordenar);

  const abrir = (tarefa: TarefaCompleta | null) => setPainel({ chave: Date.now(), tarefa });

  return (
    <div className="flex flex-col gap-5">
      {visao === "equipe" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium text-texto-2">{t("consultor")}</span>
          <Select
            value={consultorId ?? "todos"}
            onValueChange={(v) => router.push(v === "todos" ? "/tarefas?visao=equipe" : `/tarefas?visao=equipe&consultor=${v}`)}
            className="w-60"
            aria-label={t("consultor")}
          >
            <SelectItem value="todos">{t("todosConsultores")}</SelectItem>
            {contexto.membros.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </Select>
        </div>
      ) : (
        <CriacaoRapida responsavel={visao === "minhas" ? contexto.usuarioId : contexto.responsavelPadrao} />
      )}

      {ultima ? (
        <Alert tom="ok">
          <div className="flex items-center justify-between gap-4">
            <span>{t("concluida")}</span>
            <div className="flex gap-3">
              <button type="button" onClick={desfazer} className="text-xs font-semibold underline-offset-4 hover:underline">
                {t("desfazer")}
              </button>
              <button type="button" onClick={fecharAviso} className="text-xs font-medium text-texto-3 hover:text-texto">
                OK
              </button>
            </div>
          </div>
        </Alert>
      ) : null}
      {falhou ? <Alert tom="erro">{t("erros.salvar")}</Alert> : null}

      {abertas.length === 0 ? (
        <Card>
          <EmptyState Icone={ListChecks} titulo={t("vazioTitulo")} descricao={visao === "equipe" ? t("vazioEquipe") : t("vazioDescricao")} />
        </Card>
      ) : (
        GRUPOS.map((g) => {
          const itens = porGrupo.get(g)!;
          if (!itens.length) return null;
          return (
            <section key={g} aria-labelledby={`grupo-${g}`}>
              <h2 id={`grupo-${g}`} className={cn("mb-2 flex items-center gap-2 text-[13px] font-semibold", g === "atrasadas" ? "text-erro" : "text-texto-2")}>
                {t(`grupos.${g}`)}
                <span className={cn("numero rounded-full px-1.5 py-0.5 text-[11px]", g === "atrasadas" ? "bg-erro-fundo" : "bg-divisoria")}>{itens.length}</span>
              </h2>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-divisoria">
                  {itens.map((x) => (
                    <LinhaTarefa key={x.id} tarefa={x} usuarioId={contexto.usuarioId} aoAlternar={alternar} aoAbrir={abrir} mostrarWorkspace={visao === "equipe"} />
                  ))}
                </ul>
              </Card>
            </section>
          );
        })
      )}

      {concluidas.length ? (
        <section>
          <button
            type="button"
            onClick={() => setVerConcluidas((v) => !v)}
            aria-expanded={verConcluidas}
            className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-texto-3 hover:text-texto"
          >
            <ChevronDown className={cn("size-4 transition-transform", verConcluidas && "rotate-180")} aria-hidden="true" />
            {t("concluidasRecentes", { total: concluidas.length })}
          </button>
          {verConcluidas ? (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-divisoria">
                {concluidas.map((x) => (
                  <LinhaTarefa key={x.id} tarefa={x} usuarioId={contexto.usuarioId} aoAlternar={alternar} aoAbrir={abrir} mostrarWorkspace={visao === "equipe"} />
                ))}
              </ul>
            </Card>
          ) : null}
        </section>
      ) : null}

      {painel ? (
        <PainelTarefa key={painel.chave} aberto aoMudar={(v) => !v && setPainel(null)} tarefa={painel.tarefa} contexto={contexto} />
      ) : null}
    </div>
  );
}

/** Campo "Nova tarefa…" no topo: título + prazo rápido, Enter salva. */
function CriacaoRapida({ responsavel }: { responsavel: string }) {
  const t = useTranslations("tarefas");
  const ta = useTranslations("leads.atalhosData");
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState<(typeof PRAZOS_RAPIDOS)[number]>("semPrazo");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = useRef<HTMLInputElement>(null);

  const rotulo = { semPrazo: t("prazo.semPrazo"), hoje: ta("hoje"), amanha: ta("amanha"), semana: ta("semana") };
  const dataDe = (p: typeof prazo) => {
    const h = hojeISO();
    return p === "hoje" ? h : p === "amanha" ? somarDias(h, 1) : p === "semana" ? somarDias(h, 7) : null;
  };

  function salvar() {
    if (titulo.trim().length < 2) return setErro(t("erros.titulo"));
    iniciar(async () => {
      const r = await criarTarefa({ title: titulo, due_on: dataDe(prazo), assignee_id: responsavel });
      if (!r.ok) return setErro(t(`erros.${r.mensagem ?? r.erros?.title ?? "salvar"}`));
      setTitulo("");
      setErro(null);
      router.refresh();
      campo.current?.focus();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
        className="flex flex-col gap-2 rounded-card border border-borda bg-superficie p-2 shadow-card focus-within:border-marinho sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <Plus className="size-4 shrink-0 text-texto-3" aria-hidden="true" />
          <input
            ref={campo}
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              setErro(null);
            }}
            placeholder={t("rapida")}
            aria-label={t("rapidaRotulo")}
            aria-invalid={erro ? true : undefined}
            maxLength={200}
            className="h-9 min-w-0 flex-1 bg-transparent text-sm text-texto outline-none placeholder:text-texto-3"
          />
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label={t("prazoRapido")} className="flex flex-wrap gap-1">
            {PRAZOS_RAPIDOS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={prazo === p}
                onClick={() => setPrazo(p)}
                className={cn(
                  "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  prazo === p ? "border-marinho bg-marinho text-osso" : "border-borda bg-superficie text-texto-2 hover:border-borda-forte hover:text-texto",
                )}
              >
                {rotulo[p]}
              </button>
            ))}
          </div>
          <Button type="submit" size="sm" carregando={pendente}>
            {t("novaTarefa")}
          </Button>
        </div>
      </form>
      {erro ? <p className="px-1 text-xs font-medium text-erro">{erro}</p> : null}
    </div>
  );
}
