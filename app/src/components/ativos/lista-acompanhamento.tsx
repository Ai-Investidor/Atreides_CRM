"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BookmarkX, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { alternarLista } from "@/lib/ativos/acoes";
import { formatarDataHora, formatarMoeda, formatarPct } from "@/lib/formatos";
import { cn } from "@/lib/utils";

type Item = { ticker: string; name: string; cotacao: { preco: number; variacaoPct: number | null; em: string; fonte: string } | null };

export function ListaAcompanhamento({ itens, falhou }: { itens: Item[]; falhou: boolean }) {
  const t = useTranslations("ativos.lista");
  const locale = useLocale();
  const router = useRouter();
  const [, iniciar] = useTransition();
  const em = itens.find((i) => i.cotacao)?.cotacao;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{falhou ? t("falha") : em ? t("descricao", { hora: formatarDataHora(em.em, locale), fonte: em.fonte }) : t("descricaoVazia")}</CardDescription>
        </div>
      </CardHeader>
      {!itens.length ? (
        <EmptyState compacto Icone={Star} titulo={t("vazioTitulo")} descricao={t("vazioDescricao")} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t("ativo")}</TH>
              <TH className="text-right">{t("cotacao")}</TH>
              <TH className="text-right">{t("dia")}</TH>
              <TH className="text-right">
                <span className="sr-only">{t("acoes")}</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {itens.map((i) => (
              <TR key={i.ticker} className="relative">
                <TD>
                  <Link href={`/ativos/${i.ticker}`} className="font-semibold after:absolute after:inset-0 after:content-[''] hover:underline">
                    {i.ticker}
                  </Link>
                  <p className="max-w-64 truncate text-xs text-texto-3">{i.name}</p>
                </TD>
                <TD className="numero text-right font-medium">{i.cotacao ? formatarMoeda(i.cotacao.preco, locale, false) : "—"}</TD>
                <TD className={cn("numero text-right", (i.cotacao?.variacaoPct ?? 0) >= 0 ? "text-ok" : "text-erro")}>{formatarPct(i.cotacao?.variacaoPct ?? null, locale, { sinal: true, casas: 2 })}</TD>
                <TD className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="relative z-10"
                    aria-label={t("remover", { ticker: i.ticker })}
                    onClick={() =>
                      iniciar(async () => {
                        await alternarLista(i.ticker, i.name, false);
                        router.refresh();
                      })
                    }
                  >
                    <BookmarkX />
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
