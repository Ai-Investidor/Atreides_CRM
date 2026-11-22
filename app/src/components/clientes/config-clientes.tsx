"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { alternarObrigatorio } from "@/lib/clientes/acoes";
import { CATEGORIAS, type CategoriaDoc } from "@/lib/clientes/regras";

type Props = {
  requisitos: { category: CategoriaDoc; required: boolean }[];
};

/** Configurações › Clientes (admin): documentos obrigatórios. */
export function ConfigClientes({ requisitos }: Props) {
  const t = useTranslations("clientes.config");
  const tc = useTranslations("clientes.documentos");
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

    </div>
  );
}
