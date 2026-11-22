"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/form";
import { criarNota, excluirNota, fixarNota } from "@/lib/clientes/acoes";
import type { FichaCliente } from "@/lib/clientes/consultas";
import { formatarDataHora } from "@/lib/formatos";
import { cn } from "@/lib/utils";

type Props = { notas: FichaCliente["notas"]; clienteId: string; usuarioId: string; admin: boolean; limite?: number; somenteLeitura?: boolean };

/** Anotações rápidas; fixadas aparecem no topo (ex.: "não ligar antes das 10h"). */
export function Anotacoes({ notas, clienteId, usuarioId, admin, limite, somenteLeitura }: Props) {
  const t = useTranslations("clientes.notas");
  const locale = useLocale();
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [fixar, setFixar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const visiveis = limite ? notas.slice(0, limite) : notas;

  function executar(fn: () => ReturnType<typeof criarNota>, limpar = false) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setErro(r.mensagem ?? Object.values(r.erros ?? {})[0] ?? "salvar");
      if (limpar) {
        setTexto("");
        setFixar(false);
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("titulo")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!somenteLeitura ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              executar(() => criarNota(clienteId, texto, fixar), true);
            }}
          >
            <Textarea
              className="min-h-20"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t("placeholder")}
              aria-label={t("nova")}
              maxLength={5000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  executar(() => criarNota(clienteId, texto, fixar), true);
                }
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-texto-2">
                <input type="checkbox" checked={fixar} onChange={(e) => setFixar(e.target.checked)} className="size-4 accent-[var(--color-marinho)]" />
                {t("fixarNoTopo")}
              </label>
              <Button type="submit" size="sm" carregando={pendente} disabled={!texto.trim()}>
                {t("salvar")}
              </Button>
            </div>
            {erro ? <Alert tom="erro">{t(`erros.${erro}`)}</Alert> : null}
          </form>
        ) : null}

        {visiveis.length === 0 ? (
          <p className="text-sm text-texto-3">{t("vazio")}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visiveis.map((n) => {
              const meu = n.created_by === usuarioId || admin;
              return (
                <li key={n.id} className={cn("group rounded-marca border px-3.5 py-3", n.pinned ? "border-latao/50 bg-latao-claro/50" : "border-borda bg-superficie-2")}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-texto">
                      {n.pinned ? <Pin className="mr-1.5 inline size-3.5 -translate-y-px text-latao-escuro" aria-label={t("fixada")} /> : null}
                      {n.body}
                    </p>
                    {meu && !somenteLeitura ? (
                      <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <Button variant="ghost" size="icon-sm" aria-label={n.pinned ? t("desafixar") : t("fixar")} onClick={() => executar(() => fixarNota(n.id, !n.pinned))}>
                          {n.pinned ? <PinOff /> : <Pin />}
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={t("excluir")} onClick={() => window.confirm(t("excluirConfirma")) && executar(() => excluirNota(n.id))}>
                          <Trash2 />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs text-texto-3">
                    {formatarDataHora(n.created_at, locale)}
                    {n.autor?.full_name ? ` · ${n.autor.full_name}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
