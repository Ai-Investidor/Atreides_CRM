"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Etapa, Lead } from "@/lib/leads/regras";
import { MudarEtapa } from "./mudar-etapa";
import { RegistrarContato } from "./registrar-contato";

type LeadMinimo = Pick<Lead, "id" | "full_name" | "stage">;

type Ctx = {
  registrarContato: (lead: LeadMinimo) => void;
  mudarEtapa: (lead: LeadMinimo, etapaInicial?: Etapa) => void;
};

const AcoesCtx = createContext<Ctx | null>(null);

/**
 * Provedor único dos diálogos de lead (registrar contato, mudar etapa).
 * Qualquer card, linha ou botão dentro dele abre o diálogo certo.
 */
export function AcoesLeadProvider({ children }: { children: React.ReactNode }) {
  const [contato, setContato] = useState<LeadMinimo | null>(null);
  const [etapa, setEtapa] = useState<{ lead: LeadMinimo; inicial?: Etapa; chave: number } | null>(null);

  const registrarContato = useCallback((lead: LeadMinimo) => setContato(lead), []);
  const mudarEtapa = useCallback((lead: LeadMinimo, inicial?: Etapa) => setEtapa({ lead, inicial, chave: Date.now() }), []);

  return (
    <AcoesCtx.Provider value={{ registrarContato, mudarEtapa }}>
      {children}
      {contato ? (
        <RegistrarContato key={contato.id} lead={contato} aberto aoMudar={(v) => !v && setContato(null)} />
      ) : null}
      {etapa ? (
        <MudarEtapa key={etapa.chave} lead={etapa.lead} etapaInicial={etapa.inicial} aberto aoMudar={(v) => !v && setEtapa(null)} />
      ) : null}
    </AcoesCtx.Provider>
  );
}

export function useAcoesLead() {
  const ctx = useContext(AcoesCtx);
  if (!ctx) throw new Error("useAcoesLead precisa estar dentro de <AcoesLeadProvider>");
  return ctx;
}
