"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Compass, Pencil, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { salvarAlvos } from "@/lib/carteira/acoes";
import { CLASSES, type ClasseAtivo, type Resumo } from "@/lib/carteira/regras";
import { formatarMoeda, formatarPct } from "@/lib/formatos";
import { cn } from "@/lib/utils";

type Props = { clienteId: string; resumo: Resumo; alvos: Partial<Record<ClasseAtivo, number>>; limite: number; somenteLeitura?: boolean; alvoDoPlanejamento?: boolean };

/** Alocação atual × alvo por classe: barra da atual e marcador do alvo; desvio com ícone e texto. */
export function Alocacao({ clienteId, resumo, alvos, limite, somenteLeitura, alvoDoPlanejamento }: Props) {
  const t = useTranslations("carteira.alocacao");
  const tc = useTranslations("carteira.classes");
  const locale = useLocale();
  const [editando, setEditando] = useState(false);
  const temAlvo = Object.keys(alvos).length > 0;
  // Escala pelo maior valor (atual ou alvo), sempre a partir de zero.
  const escala = Math.max(10, ...resumo.porClasse.map((c) => Math.max(c.pct, c.alvo ?? 0))) * 1.1;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{temAlvo ? t("descricao", { limite: formatarPct(limite, locale, { casas: 0 }).replace("%", "") }) : t("semAlvo")}</CardDescription>
        </div>
        {alvoDoPlanejamento ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/clientes/${clienteId}?aba=planejamento`}>
              <Compass />
              {t("alvoNoPlanejamento")}
            </Link>
          </Button>
        ) : !somenteLeitura ? (
          <Button variant="ghost" size="sm" onClick={() => setEditando(true)}>
            <Pencil />
            {temAlvo ? t("editarAlvo") : t("definirAlvo")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {resumo.porClasse.length === 0 ? (
          <p className="text-sm text-texto-3">{t("vazio")}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {resumo.porClasse.map((c) => (
              <li key={c.classe} className="grid grid-cols-[minmax(7rem,10rem)_1fr] items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(8rem,11rem)_1fr_16rem]">
                <span className="truncate text-[13px] font-medium text-texto">{tc(c.classe)}</span>
                <div className="relative h-5" aria-hidden="true">
                  <div className="absolute inset-y-1.5 left-0 right-0 rounded-full bg-divisoria" />
                  <div className="absolute inset-y-1 left-0 rounded-r-[4px] bg-marinho" style={{ width: `${(c.pct / escala) * 100}%` }} />
                  {c.alvo !== null ? <div className="absolute inset-y-0 w-0.5 rounded-full bg-latao-escuro" style={{ left: `calc(${(c.alvo / escala) * 100}% - 1px)` }} /> : null}
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-x-2 text-xs sm:col-span-1 sm:justify-end">
                  <span className="numero font-semibold text-texto">{formatarPct(c.pct, locale)}</span>
                  {c.alvo !== null ? <span className="numero text-texto-3">{t("alvo", { pct: formatarPct(c.alvo, locale) })}</span> : null}
                  <span className="numero text-texto-3">· {formatarMoeda(c.valor, locale)}</span>
                  {c.alerta && c.desvio !== null ? (
                    <span className="numero inline-flex items-center gap-1 font-medium text-atencao">
                      <TriangleAlert className="size-3.5" aria-hidden="true" />
                      {t("desvio", { pp: formatarPct(c.desvio, locale, { sinal: true }).replace("%", "") })}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {temAlvo ? (
          <p className="mt-4 flex items-center gap-4 text-[11px] text-texto-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-marinho" aria-hidden="true" />
              {t("legendaAtual")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded-full bg-latao-escuro" aria-hidden="true" />
              {t("legendaAlvo")}
            </span>
          </p>
        ) : null}
      </CardContent>
      {editando ? <EditarAlvos clienteId={clienteId} alvos={alvos} aoFechar={() => setEditando(false)} /> : null}
    </Card>
  );
}

function EditarAlvos({ clienteId, alvos, aoFechar }: { clienteId: string; alvos: Partial<Record<ClasseAtivo, number>>; aoFechar: () => void }) {
  const t = useTranslations("carteira.alocacao");
  const tc = useTranslations("carteira.classes");
  const te = useTranslations("carteira.erros");
  const locale = useLocale();
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(Object.fromEntries(CLASSES.map((c) => [c, alvos[c] ? String(alvos[c]).replace(".", ",") : ""])));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const num = (v: string) => Number((v || "0").replace(",", "."));
  const soma = CLASSES.reduce((s, c) => s + (Number.isFinite(num(valores[c])) ? num(valores[c]) : 0), 0);

  function salvar(limpar = false) {
    iniciar(async () => {
      const r = await salvarAlvos(clienteId, limpar ? {} : Object.fromEntries(CLASSES.map((c) => [c, num(valores[c])])));
      if (!r.ok) return setErro(r.mensagem ?? "salvar");
      aoFechar();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent posicao="lateral" titulo={t("editarTitulo")} descricao={t("editarDescricao")}>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
            {erro ? <Alert tom="erro">{te(erro)}</Alert> : null}
            {CLASSES.map((c) => (
              <label key={c} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-texto">{tc(c)}</span>
                <span className="flex items-center gap-1.5">
                  <Input className="h-9 w-24 text-right" inputMode="decimal" value={valores[c]} onChange={(e) => setValores((v) => ({ ...v, [c]: e.target.value.replace(/[^\d,.]/g, "") }))} aria-label={tc(c)} />
                  <span className="text-texto-3">%</span>
                </span>
              </label>
            ))}
            <p className={cn("numero mt-2 text-right text-sm font-semibold", Math.abs(soma - 100) < 0.01 ? "text-ok" : "text-atencao")}>
              {t("soma", { pct: formatarPct(soma, locale) })}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-divisoria px-5 py-3">
            <Button variant="ghost" onClick={() => salvar(true)} disabled={pendente}>
              {t("removerAlvo")}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={aoFechar}>
                {t("cancelar")}
              </Button>
              <Button carregando={pendente} disabled={Math.abs(soma - 100) > 0.01} onClick={() => salvar()}>
                {t("salvar")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
