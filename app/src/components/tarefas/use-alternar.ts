"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { concluirTarefa } from "@/lib/tarefas/acoes";
import type { TarefaCompleta } from "@/lib/tarefas/regras";

/**
 * Concluir/reabrir com resposta imediata na tela (o servidor confirma depois)
 * e "Desfazer" para a última tarefa concluída.
 */
export function useAlternarTarefas(tarefas: TarefaCompleta[]) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [ultima, setUltima] = useState<TarefaCompleta | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [otimistas, aplicar] = useOptimistic(tarefas, (atual, m: { id: string; feita: boolean }) =>
    atual.map((t) => (t.id === m.id ? { ...t, status: m.feita ? ("done" as const) : ("open" as const), completed_at: m.feita ? new Date().toISOString() : null } : t)),
  );

  function alternar(t: TarefaCompleta) {
    const feita = t.status === "open";
    setFalhou(false);
    iniciar(async () => {
      aplicar({ id: t.id, feita });
      const r = await concluirTarefa(t.id, feita);
      if (!r.ok) setFalhou(true);
      setUltima(feita && r.ok ? t : null);
      router.refresh();
    });
  }

  function desfazer() {
    if (!ultima) return;
    const t = ultima;
    setUltima(null);
    iniciar(async () => {
      aplicar({ id: t.id, feita: false });
      await concluirTarefa(t.id, false);
      router.refresh();
    });
  }

  return { tarefas: otimistas, alternar, ultima, desfazer, falhou, fecharAviso: () => setUltima(null) };
}
