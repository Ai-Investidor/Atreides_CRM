"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/form";
import { hojeISO, somarDias } from "@/lib/formatos";
import { cn } from "@/lib/utils";

type CampoDataProps = {
  valor: string;
  aoMudar: (v: string) => void;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  /** Rótulo do atalho que limpa a data (ex.: "Sem prazo"). Sem ele, a data é obrigatória. */
  rotuloSemData?: string;
  /** Aceita datas passadas (ex.: editar uma tarefa já atrasada). */
  permitirPassado?: boolean;
};

/** Data com atalhos (Hoje, Amanhã, +3 dias, +1 semana). Usado no próximo contato do lead e no prazo da tarefa. */
export function CampoDataContato({ valor, aoMudar, rotuloSemData, permitirPassado, ...props }: CampoDataProps) {
  const t = useTranslations("leads.atalhosData");
  const hoje = hojeISO();
  const atalhos = [
    { rotulo: t("hoje"), data: hoje },
    { rotulo: t("amanha"), data: somarDias(hoje, 1) },
    { rotulo: t("tresDias"), data: somarDias(hoje, 3) },
    { rotulo: t("semana"), data: somarDias(hoje, 7) },
    ...(rotuloSemData ? [{ rotulo: rotuloSemData, data: "" }] : []),
  ];

  return (
    <div className="flex flex-col gap-2">
      <Input type="date" min={permitirPassado ? undefined : hoje} value={valor} onChange={(e) => aoMudar(e.target.value)} {...props} />
      <div className="flex flex-wrap gap-1.5">
        {atalhos.map((a) => (
          <button
            key={a.rotulo}
            type="button"
            onClick={() => aoMudar(a.data)}
            aria-pressed={valor === a.data}
            className={cn(
              "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
              valor === a.data
                ? "border-marinho bg-marinho text-osso"
                : "border-borda bg-superficie text-texto-2 hover:border-borda-forte hover:text-texto",
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
