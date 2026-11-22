"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { formatarTelefone } from "@/lib/formatos";
import type { Lead } from "@/lib/leads/regras";
import { SituacaoContato } from "./etiquetas";

/** Card "Retornos de leads" do painel: os 5 mais urgentes e o atalho para a lista completa. */
export function CardRetornos({ leads }: { leads: Lead[] }) {
  const t = useTranslations("painel.retornos");
  const visiveis = leads.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{t("descricao")}</CardDescription>
        </div>
        {leads.length > 0 ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/leads?visao=retornos">
              {t("verTodos", { total: leads.length })}
              <ArrowRight />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      {visiveis.length === 0 ? (
        <CardContent>
          <EmptyState Icone={PhoneCall} titulo={t("vazioTitulo")} descricao={t("vazioDescricao")} />
        </CardContent>
      ) : (
        <ul className="divide-y divide-divisoria">
          {visiveis.map((lead) => (
            <li key={lead.id}>
              <Link href={`/leads/${lead.id}`} className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-superficie-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-texto">{lead.full_name}</p>
                  <p className="truncate text-xs text-texto-3">
                    <span className="numero">{formatarTelefone(lead.phone)}</span>
                    {lead.next_contact_note ? ` · ${lead.next_contact_note}` : ""}
                  </p>
                </div>
                <SituacaoContato lead={lead} compacto />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
