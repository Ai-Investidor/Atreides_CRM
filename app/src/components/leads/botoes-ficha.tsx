"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightLeft, CalendarPlus, MessageSquarePlus, MoreHorizontal, Pencil, UserCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/overlay";
import { estaAberto, type Lead } from "@/lib/leads/regras";
import { useAcoesLead } from "./acoes-lead";
import { EditarLead } from "./editar-lead";
import { NovoCliente } from "@/components/clientes/novo-cliente";

/** Ações do cabeçalho da ficha do lead. */
export function BotoesFicha({ lead }: { lead: Lead }) {
  const t = useTranslations("leads");
  const { registrarContato, mudarEtapa } = useAcoesLead();
  const [editando, setEditando] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const aberto = estaAberto(lead.stage);

  return (
    <>
      {lead.client_id ? (
        <Button asChild>
          <Link href={`/clientes/${lead.client_id}`}>
            <UserRound />
            {t("acoes.verCliente")}
          </Link>
        </Button>
      ) : lead.stage === "won" ? (
        <Button onClick={() => setConvertendo(true)}>
          <UserCheck />
          {t("acoes.converter")}
        </Button>
      ) : null}
      <Button variant="secondary" onClick={() => mudarEtapa(lead)}>
        <ArrowRightLeft />
        {t("acoes.mudarEtapa")}
      </Button>
      {aberto ? (
        <Button onClick={() => registrarContato(lead)}>
          <MessageSquarePlus />
          {t("acoes.registrarContato")}
        </Button>
      ) : null}
      <Menu>
        <MenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label={t("acoes.maisAcoes", { nome: lead.full_name })}>
            <MoreHorizontal />
          </Button>
        </MenuTrigger>
        <MenuContent align="end" className="w-60">
          {aberto ? (
            <MenuItem asChild>
              <Link href={`/agenda?novo=1&lead=${lead.id}`}>
                <CalendarPlus />
                {t("acoes.agendarReuniao")}
              </Link>
            </MenuItem>
          ) : null}
          <MenuItem onSelect={() => setEditando(true)}>
            <Pencil />
            {t("acoes.editar")}
          </MenuItem>
          {!lead.client_id && lead.stage !== "won" ? (
            <>
              <MenuSeparator />
              <MenuItem onSelect={() => setConvertendo(true)}>
                <UserCheck />
                {t("acoes.converter")}
              </MenuItem>
            </>
          ) : null}
        </MenuContent>
      </Menu>
      {editando ? <EditarLead lead={lead} aberto aoMudar={setEditando} /> : null}
      {convertendo ? (
        <NovoCliente
          abertoInicial
          gatilho={() => null}
          lead={{ id: lead.id, full_name: lead.full_name, phone: lead.phone, email: lead.email, source: lead.source, referred_by: lead.referred_by }}
          aoFechar={() => setConvertendo(false)}
        />
      ) : null}
    </>
  );
}
