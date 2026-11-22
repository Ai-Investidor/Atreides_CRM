"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { diasEntre, formatarData, hojeISO } from "@/lib/formatos";

/** Prazo da tarefa com texto (nunca só cor): "Atrasada há 2 dias", "Hoje", "Amanhã", "24/11". */
export function EtiquetaPrazo({ prazo, aberta = true, compacto }: { prazo: string | null; aberta?: boolean; compacto?: boolean }) {
  const t = useTranslations("tarefas.prazo");
  const locale = useLocale();
  if (!prazo) return null;
  const dias = diasEntre(hojeISO(), prazo);
  const data = formatarData(prazo, locale, { year: dias > 300 || dias < -300 ? "numeric" : undefined });

  if (!aberta) return <span className="numero text-xs text-texto-3">{data}</span>;
  if (dias < 0)
    return (
      <Badge tom="erro">
        <CalendarClock className="size-3" aria-hidden="true" />
        {compacto ? t("atrasadaCurta", { dias: -dias }) : t("atrasada", { dias: -dias })}
      </Badge>
    );
  if (dias === 0)
    return (
      <Badge tom="atencao">
        <CalendarClock className="size-3" aria-hidden="true" />
        {t("hoje")}
      </Badge>
    );
  return (
    <Badge tom="neutro">
      <CalendarClock className="size-3" aria-hidden="true" />
      {dias === 1 ? t("amanha") : data}
    </Badge>
  );
}
