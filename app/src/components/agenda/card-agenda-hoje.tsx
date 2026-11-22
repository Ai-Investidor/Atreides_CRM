import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, CalendarDays, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import type { ReuniaoComLead } from "@/lib/agenda/consultas";
import { intervaloHoras } from "@/lib/formatos";

/** Card "Agenda de hoje" do painel: reuniões do Atreides no dia, com atalho para o Meet. */
export async function CardAgendaHoje({ reunioes }: { reunioes: ReuniaoComLead[] }) {
  const t = await getTranslations("painel.agenda");
  const ta = await getTranslations("agenda");

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("titulo")}</CardTitle>
          <CardDescription>{t("descricao")}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/agenda">
            {t("verAgenda")}
            <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      {reunioes.length === 0 ? (
        <CardContent>
          <EmptyState Icone={CalendarDays} titulo={t("vazioTitulo")} descricao={t("vazioDescricao")} />
        </CardContent>
      ) : (
        <ul className="divide-y divide-divisoria">
          {reunioes.map((r) => (
            <li key={r.id} className="flex items-center gap-4 px-5 py-3">
              <span className="numero w-24 shrink-0 text-sm font-semibold text-texto">{intervaloHoras(r.starts_at, r.ends_at)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-texto">{r.title}</p>
                <p className="truncate text-xs text-texto-3">
                  {ta(`tipos.${r.type}`)}
                  {r.cliente ? ` · ${r.cliente.full_name}` : r.lead ? ` · ${r.lead.full_name}` : ""}
                </p>
              </div>
              {r.meet_url ? (
                <Button asChild size="sm" variant="secondary">
                  <a href={r.meet_url} target="_blank" rel="noopener noreferrer">
                    <Video />
                    {t("entrarMeet")}
                  </a>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
