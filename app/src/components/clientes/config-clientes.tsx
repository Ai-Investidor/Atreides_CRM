"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { alternarObrigatorio, validarVersao } from "@/lib/clientes/acoes";
import { CATEGORIAS, type CategoriaDoc } from "@/lib/clientes/regras";
import { formatarDataHora } from "@/lib/formatos";

type Props = {
  requisitos: { category: CategoriaDoc; required: boolean }[];
  versoes: { id: string; code: string; title: string; active: boolean; validated_at: string | null; validador: { full_name: string } | null }[];
};

/** Configurações › Clientes (admin): documentos obrigatórios e validação do questionário. */
export function ConfigClientes({ requisitos, versoes }: Props) {
  const t = useTranslations("clientes.config");
  const tc = useTranslations("clientes.documentos");
  const locale = useLocale();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState(false);
  const mapa = new Map(requisitos.map((r) => [r.category, r.required]));

  function executar(fn: () => Promise<{ ok: boolean }>) {
    setErro(false);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setErro(true);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("documentosTitulo")}</CardTitle>
            <CardDescription>{t("documentosDescricao")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {erro ? <Alert tom="erro">{t("erro")}</Alert> : null}
          {CATEGORIAS.map((c) => (
            <label key={c} className="flex cursor-pointer items-center justify-between gap-3 rounded-marca border border-borda px-3.5 py-2.5 text-sm">
              {tc(`categorias.${c}`)}
              <input
                type="checkbox"
                role="switch"
                checked={mapa.get(c) ?? false}
                disabled={pendente}
                onChange={(e) => executar(() => alternarObrigatorio(c, e.target.checked))}
                className="size-4 accent-[var(--color-marinho)]"
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("questionarioTitulo")}</CardTitle>
            <CardDescription>{t("questionarioDescricao")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {versoes.map((v) => (
            <div key={v.id} className="flex flex-col gap-2 rounded-marca border border-borda px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{v.title}</span>
                {v.active ? <Badge tom="marca">{t("ativa")}</Badge> : null}
              </div>
              {v.validated_at ? (
                <p className="flex items-center gap-1.5 text-xs text-ok">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  {t("validadaEm", { data: formatarDataHora(v.validated_at, locale), nome: v.validador?.full_name ?? "—" })}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-atencao">{t("naoValidada")}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    carregando={pendente}
                    onClick={() => window.confirm(t("validarConfirma")) && executar(() => validarVersao(v.id))}
                  >
                    <BadgeCheck />
                    {t("validar")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
