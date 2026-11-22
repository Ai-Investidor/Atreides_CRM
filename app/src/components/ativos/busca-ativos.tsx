"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buscarAtivos, type OpcaoAtivo } from "@/lib/carteira/acoes";

/** Busca de ativos da B3 por ticker ou nome; cada resultado abre a página do ativo. */
export function BuscaAtivos() {
  const t = useTranslations("ativos.busca");
  const tc = useTranslations("carteira.classes");
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoAtivo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [falha, setFalha] = useState(false);
  const ultima = useRef(0);

  useEffect(() => {
    if (termo.trim().length < 2) return;
    const id = ++ultima.current;
    const timer = setTimeout(async () => {
      setBuscando(true);
      const r = await buscarAtivos(termo);
      if (id !== ultima.current) return;
      setOpcoes(r.opcoes.filter((o) => o.tipo === "bolsa" && o.ticker));
      setFalha(r.falhaProvedor);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [termo]);

  const mostrar = termo.trim().length >= 2;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-12 items-center gap-3 rounded-card border border-borda-forte bg-superficie px-4 shadow-card focus-within:border-marinho focus-within:ring-3 focus-within:ring-marinho/10">
        {buscando ? <Loader2 className="size-5 animate-spin text-texto-3" aria-hidden="true" /> : <Search className="size-5 text-texto-3" aria-hidden="true" />}
        <input
          autoFocus
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-texto outline-none placeholder:text-texto-3"
        />
      </div>
      {mostrar && opcoes.length ? (
        <ul className="overflow-hidden rounded-card border border-borda bg-superficie shadow-card">
          {opcoes.map((o) => (
            <li key={o.ticker} className="border-b border-divisoria last:border-0">
              <Link href={`/ativos/${o.ticker}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-superficie-2">
                <span className="min-w-0">
                  <span className="font-semibold text-texto">{o.ticker}</span>
                  <span className="ml-3 truncate text-sm text-texto-2">{o.nome}</span>
                </span>
                <Badge tom="neutro">{tc(o.classe)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {mostrar && !buscando && !opcoes.length ? <p className="text-sm text-texto-3">{t("nada")}</p> : null}
      {falha ? <p className="text-sm text-atencao">{t("falha")}</p> : null}
    </div>
  );
}
