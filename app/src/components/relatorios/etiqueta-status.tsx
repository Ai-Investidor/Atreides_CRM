"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export function EtiquetaRelatorio({ status, enviado }: { status: "draft" | "approved" | "superseded"; enviado?: boolean }) {
  const t = useTranslations("relatorios.status");
  if (status === "approved" && enviado) return <Badge tom="ok" ponto>{t("enviado")}</Badge>;
  return (
    <Badge tom={status === "approved" ? "info" : status === "draft" ? "atencao" : "neutro"} ponto>
      {t(status)}
    </Badge>
  );
}
