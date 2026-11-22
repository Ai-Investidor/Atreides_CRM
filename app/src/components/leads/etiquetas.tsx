"use client";

import { useTranslations } from "next-intl";
import { Clock, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatarData } from "@/lib/formatos";
import { estaParado, situacaoContato, type Etapa, type Lead } from "@/lib/leads/regras";
import { useLocale } from "next-intl";

const TOM_ETAPA: Record<Etapa, "info" | "neutro" | "marca" | "atencao" | "ok" | "erro"> = {
  new: "info",
  contacted: "neutro",
  diagnosis: "marca",
  proposal: "atencao",
  won: "ok",
  lost: "erro",
};

export function EtiquetaEtapa({ etapa }: { etapa: Etapa }) {
  const t = useTranslations("leads.etapas");
  return (
    <Badge tom={TOM_ETAPA[etapa]} ponto>
      {t(etapa)}
    </Badge>
  );
}

/** "Atrasado há 2 dias" · "Hoje" · "24/11" — sempre com texto, nunca só cor. */
export function SituacaoContato({ lead, compacto }: { lead: Pick<Lead, "next_contact_on" | "stage">; compacto?: boolean }) {
  const t = useTranslations("leads.situacao");
  const locale = useLocale();
  const s = situacaoContato(lead);
  if (s.tipo === "nenhum") return null;
  if (s.tipo === "atrasado")
    return (
      <Badge tom="erro">
        <Clock className="size-3" aria-hidden="true" />
        {compacto ? t("atrasadoCurto", { dias: s.dias }) : t("atrasado", { dias: s.dias })}
      </Badge>
    );
  if (s.tipo === "hoje")
    return (
      <Badge tom="atencao">
        <Clock className="size-3" aria-hidden="true" />
        {t("hoje")}
      </Badge>
    );
  return (
    <Badge tom="neutro">
      <Clock className="size-3" aria-hidden="true" />
      {formatarData(lead.next_contact_on!, locale, { year: undefined })}
    </Badge>
  );
}

export function EtiquetaParado({ lead, compacto }: { lead: Pick<Lead, "last_contact_at" | "created_at" | "stage">; compacto?: boolean }) {
  const t = useTranslations("leads.situacao");
  if (!estaParado(lead)) return null;
  return (
    <Badge tom="atencao" title={t("parado")}>
      <Hourglass className="size-3" aria-hidden="true" />
      {compacto ? t("paradoCurto") : t("parado")}
    </Badge>
  );
}
