"use client";

import { useTranslations } from "next-intl";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { situacaoPerfil, type Cliente, type StatusCliente } from "@/lib/clientes/regras";

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

/** Perfil de investidor com a situação da validade (sempre com texto). */
export function EtiquetaPerfil({ cliente, compacto }: { cliente: Pick<Cliente, "investor_profile" | "profile_valid_until">; compacto?: boolean }) {
  const t = useTranslations("clientes.perfil");
  const s = situacaoPerfil(cliente);
  if (s.tipo === "sem")
    return (
      <Badge tom="neutro">
        <ShieldQuestion className="size-3" aria-hidden="true" />
        {t("sem")}
      </Badge>
    );
  const nome = t(`perfis.${cliente.investor_profile!}`);
  if (s.tipo === "vencido")
    return (
      <Badge tom="erro">
        <ShieldAlert className="size-3" aria-hidden="true" />
        {compacto ? `${nome} · ${t("vencidoCurto")}` : t("vencido", { perfil: nome })}
      </Badge>
    );
  if (s.tipo === "vencendo")
    return (
      <Badge tom="atencao">
        <ShieldAlert className="size-3" aria-hidden="true" />
        {compacto ? `${nome} · ${t("vencendoCurto", { dias: s.dias })}` : t("vencendo", { perfil: nome, dias: s.dias })}
      </Badge>
    );
  return (
    <Badge tom="marca">
      <ShieldCheck className="size-3" aria-hidden="true" />
      {nome}
    </Badge>
  );
}
