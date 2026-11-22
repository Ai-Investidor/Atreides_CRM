import { getTranslations } from "next-intl/server";
import type { TextosModelo } from "./modelo";

/** Textos comuns a todos os PDFs para o cliente (namespace "pdf" das mensagens). */
export async function textosModelo(locale = "pt-BR"): Promise<TextosModelo> {
  const t = await getTranslations({ locale, namespace: "pdf" });
  return {
    rodape: t("rodape"),
    pagina: (atual, total) => t("pagina", { atual, total }),
    consultor: (nome) => t("consultor", { nome }),
    emitidoEm: (data) => t("emitidoEm", { data }),
    preparadoPor: (nome, data) => t("preparadoPor", { nome, data }),
    citacao: { texto: t("citacao.texto"), fonte: t("citacao.fonte") },
  };
}
