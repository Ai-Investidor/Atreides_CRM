"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { aplicarQuestionario } from "@/lib/clientes/acoes";
import { DIMENSOES, type VersaoQuestionario } from "@/lib/clientes/regras";
import { cn } from "@/lib/utils";

/** Questionário de perfil do investidor (suitability), preenchido com o cliente na reunião. */
export function Questionario({ versao, clienteId }: { versao: VersaoQuestionario; clienteId: string }) {
  const t = useTranslations("clientes.questionario");
  const router = useRouter();
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const total = versao.questions.length;
  const feitas = Object.keys(respostas).length;
  const pct = Math.round((feitas / total) * 100);

  function enviar() {
    if (feitas < total) {
      const primeira = versao.questions.find((q) => !respostas[q.id]);
      document.getElementById(`q-${primeira?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return setErro("incompleto");
    }
    iniciar(async () => {
      const r = await aplicarQuestionario(clienteId, versao.id, respostas);
      if (!r.ok) return setErro(r.mensagem ?? "salvar");
      router.push(`/clientes/${clienteId}?aba=perfil`);
      router.refresh();
    });
  }

  // Numeração na ordem em que as perguntas aparecem (agrupadas por dimensão).
  const ordem = DIMENSOES.flatMap((d) => versao.questions.filter((q) => q.dimension === d));
  const numeroDe = new Map(ordem.map((q, i) => [q.id, i + 1]));
  return (
    <div className="flex flex-col gap-6">
      {!versao.validated_at ? <Alert tom="atencao" titulo={t("rascunhoTitulo")}>{t("rascunhoTexto")}</Alert> : null}

      <div className="sticky top-16 z-20 -mx-4 border-b border-borda bg-fundo/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:px-5">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-texto">{t("respondidas", { feitas, total })}</span>
          <span className="numero text-texto-3">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-divisoria" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("progresso")}>
          <div className="h-full rounded-full bg-latao transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {DIMENSOES.map((d) => {
        const questoes = versao.questions.filter((q) => q.dimension === d);
        if (!questoes.length) return null;
        return (
          <section key={d} aria-labelledby={`dim-${d}`} className="flex flex-col gap-4">
            <h2 id={`dim-${d}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-latao-escuro">
              {t(`dimensoes.${d}`)}
            </h2>
            {questoes.map((q) => {
              const numero = numeroDe.get(q.id);
              return (
                <Card key={q.id} id={`q-${q.id}`}>
                  <CardContent className="pt-5">
                    <fieldset>
                      <legend className="mb-3 text-[15px] font-semibold text-texto">
                        <span className="numero mr-2 text-texto-3">{numero}.</span>
                        {q.text}
                      </legend>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
                        {q.options.map((o) => {
                          const marcada = respostas[q.id] === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              role="radio"
                              aria-checked={marcada}
                              onClick={() => {
                                setErro(null);
                                setRespostas((r) => ({ ...r, [q.id]: o.id }));
                              }}
                              className={cn(
                                "flex items-start gap-3 rounded-marca border px-3.5 py-3 text-left text-sm transition-colors",
                                marcada ? "border-marinho bg-marinho text-osso" : "border-borda bg-superficie text-texto hover:border-borda-forte",
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                                  marcada ? "border-latao bg-latao text-marinho" : "border-borda-forte",
                                )}
                                aria-hidden="true"
                              >
                                {marcada ? <Check className="size-3" strokeWidth={3} /> : null}
                              </span>
                              {o.text}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        );
      })}

      {erro ? <Alert tom="erro">{t(`erros.${erro}`)}</Alert> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()}>
          {t("cancelar")}
        </Button>
        <Button carregando={pendente} onClick={enviar}>
          {t("concluir")}
        </Button>
      </div>
    </div>
  );
}
