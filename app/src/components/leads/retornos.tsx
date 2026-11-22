"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MessageCircle, MessageSquarePlus, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatarTelefone, linkWhatsApp } from "@/lib/formatos";
import type { Lead } from "@/lib/leads/regras";
import { useAcoesLead } from "./acoes-lead";
import { EtiquetaEtapa, SituacaoContato } from "./etiquetas";

/** "Retornos de hoje": leads com contato para hoje ou atrasado, os mais atrasados primeiro. */
export function Retornos({ leads }: { leads: Lead[] }) {
  const t = useTranslations("leads");
  const { registrarContato } = useAcoesLead();

  if (leads.length === 0) {
    return (
      <Card>
        <EmptyState Icone={PhoneCall} titulo={t("retornos.vazioTitulo")} descricao={t("retornos.vazioDescricao")} />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <THead>
          <tr>
            <TH>{t("retornos.lead")}</TH>
            <TH>{t("retornos.quando")}</TH>
            <TH className="hidden md:table-cell">{t("retornos.oQueFazer")}</TH>
            <TH className="hidden lg:table-cell">{t("retornos.etapa")}</TH>
            <TH className="text-right">
              <span className="sr-only">{t("retornos.acoes")}</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {leads.map((lead) => (
            <TR key={lead.id}>
              <TD>
                <Link href={`/leads/${lead.id}`} className="font-medium hover:underline hover:underline-offset-4">
                  {lead.full_name}
                </Link>
                <p className="numero text-xs text-texto-3">{formatarTelefone(lead.phone)}</p>
              </TD>
              <TD>
                <SituacaoContato lead={lead} />
              </TD>
              <TD className="hidden max-w-xs truncate text-texto-2 md:table-cell">{lead.next_contact_note ?? "—"}</TD>
              <TD className="hidden lg:table-cell">
                <EtiquetaEtapa etapa={lead.stage} />
              </TD>
              <TD>
                <div className="flex justify-end gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <a href={linkWhatsApp(lead.phone)} target="_blank" rel="noopener noreferrer" aria-label={t("acoes.whatsappDe", { nome: lead.full_name })}>
                      <MessageCircle />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  </Button>
                  <Button size="sm" onClick={() => registrarContato(lead)}>
                    <MessageSquarePlus />
                    <span className="hidden sm:inline">{t("acoes.registrar")}</span>
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
