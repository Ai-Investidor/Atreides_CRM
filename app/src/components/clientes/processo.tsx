"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ban, CheckCircle2, Circle, Flag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FichaCliente } from "@/lib/clientes/consultas";
import { cn } from "@/lib/utils";

/** Processo em andamento (onboarding ou migração) com barra de progresso e etapas. */
export function CardProcesso({ processo, etapas }: { processo: FichaCliente["processo"]; etapas: FichaCliente["etapas"] }) {
  const t = useTranslations("clientes.processo");
  if (!processo || !etapas.length) return null;
  const fechadas = etapas.filter((e) => e.status !== "open").length;
  const pct = Math.round((fechadas / etapas.length) * 100);
  const codigo = processo.modelo?.code ?? "onboarding";

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t(`nomes.${codigo}`)}</CardTitle>
          <CardDescription>
            {processo.status === "done" ? t("concluido") : processo.status === "canceled" ? t("cancelado") : t("progresso", { feitas: fechadas, total: etapas.length })}
          </CardDescription>
        </div>
        <span className="numero text-sm font-semibold text-texto">{pct}%</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-2 overflow-hidden rounded-full bg-divisoria" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("barra")}>
          <div className="h-full rounded-full bg-latao transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <ol className="flex flex-col gap-2">
          {etapas.map((e) => {
            const Icone = e.status === "done" ? CheckCircle2 : e.status === "not_applicable" ? Ban : e.etapa?.is_final ? Flag : Circle;
            return (
              <li key={e.id} className="flex items-start gap-2.5 text-sm">
                <Icone
                  className={cn("mt-0.5 size-4 shrink-0", e.status === "done" ? "text-ok" : e.status === "not_applicable" ? "text-texto-3" : "text-borda-forte")}
                  aria-hidden="true"
                />
                <span className={cn(e.status !== "open" ? "text-texto-3" : "text-texto", e.status === "not_applicable" && "line-through")}>
                  {e.title.split(" · ")[0]}
                  <span className="sr-only"> · {t(`situacao.${e.status}`)}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <Link href="/tarefas" className="text-[13px] font-medium text-latao-escuro hover:underline">
          {t("verTarefas")}
        </Link>
      </CardContent>
    </Card>
  );
}
