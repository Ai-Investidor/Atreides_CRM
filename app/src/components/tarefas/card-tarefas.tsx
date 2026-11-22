"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import type { TarefaCompleta } from "@/lib/tarefas/regras";
import { LinhaTarefa } from "./linha-tarefa";
import { PainelTarefa, type ContextoTarefa } from "./painel-tarefa";
import { useAlternarTarefas } from "./use-alternar";

type Props = {
  tarefas: TarefaCompleta[];
  contexto: ContextoTarefa;
  /** "lead"/"cliente": card da ficha (com "Nova tarefa" já vinculada). "painel": tarefas de hoje. */
  modo: "lead" | "cliente" | "painel";
  vinculo?: { id: string; full_name: string };
};

/** Card de tarefas reaproveitado na ficha do lead e no painel. */
export function CardTarefas({ tarefas, contexto, modo, vinculo }: Props) {
  const t = useTranslations("tarefas");
  const { tarefas: lista, alternar } = useAlternarTarefas(tarefas);
  const [painel, setPainel] = useState<{ chave: number; tarefa: TarefaCompleta | null } | null>(null);
  const abertas = lista.filter((x) => x.status === "open");
  const visiveis = modo === "painel" ? abertas.slice(0, 6) : abertas;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{modo === "painel" ? t("painel.titulo") : t("lead.titulo")}</CardTitle>
          {modo === "painel" ? <CardDescription>{t("painel.descricao")}</CardDescription> : null}
        </div>
        {modo !== "painel" ? (
          <Button variant="ghost" size="sm" onClick={() => setPainel({ chave: Date.now(), tarefa: null })}>
            <Plus />
            {t("lead.nova")}
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link href="/tarefas">
              {t("painel.verTodas")}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </CardHeader>
      {visiveis.length === 0 ? (
        <CardContent>
          {modo !== "painel" ? (
            <p className="text-sm text-texto-3">{modo === "cliente" ? t("lead.vazioCliente") : t("lead.vazio")}</p>
          ) : (
            <EmptyState compacto Icone={ListChecks} titulo={t("painel.vazioTitulo")} descricao={t("painel.vazioDescricao")} />
          )}
        </CardContent>
      ) : (
        <ul className="divide-y divide-divisoria border-t border-divisoria">
          {visiveis.map((x) => (
            <LinhaTarefa
              key={x.id}
              tarefa={x}
              usuarioId={contexto.usuarioId}
              aoAlternar={alternar}
              aoAbrir={(tarefa) => setPainel({ chave: Date.now(), tarefa })}
              semLead={modo === "lead"}
              semCliente={modo === "cliente"}
            />
          ))}
        </ul>
      )}
      {painel ? (
        <PainelTarefa
          key={painel.chave}
          aberto
          aoMudar={(v) => !v && setPainel(null)}
          tarefa={painel.tarefa}
          vinculoFixo={modo !== "painel" && !painel.tarefa && vinculo ? { tipo: modo, ...vinculo } : null}
          contexto={contexto}
        />
      ) : null}
    </Card>
  );
}
