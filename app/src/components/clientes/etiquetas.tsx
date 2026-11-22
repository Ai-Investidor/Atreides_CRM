"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Cliente, StatusCliente } from "@/lib/clientes/regras";

const TOM_STATUS: Record<StatusCliente, "info" | "ok" | "atencao" | "neutro"> = {
  onboarding: "info",
  active: "ok",
  paused: "atencao",
  closed: "neutro",
};

export function EtiquetaStatus({ status }: { status: StatusCliente }) {
  const t = useTranslations("clientes.status");
  return (
    <Badge tom={TOM_STATUS[status]} ponto>
      {t(status)}
    </Badge>
  );
}

/** Perfil de investidor informado pela corretora (sempre com texto). */
export function EtiquetaPerfil({ cliente }: { cliente: Pick<Cliente, "investor_profile">; compacto?: boolean }) {
  const t = useTranslations("clientes.perfil");
  if (!cliente.investor_profile)
    return (
      <Badge tom="neutro">
        <ShieldQuestion className="size-3" aria-hidden="true" />
        {t("sem")}
      </Badge>
    );
  return (
    <Badge tom="marca">
      <ShieldCheck className="size-3" aria-hidden="true" />
      {t(`perfis.${cliente.investor_profile}`)}
    </Badge>
  );
}
