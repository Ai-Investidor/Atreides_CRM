"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, SelectItem } from "@/components/ui/form";
import { buscarAtivos, type OpcaoAtivo } from "@/lib/carteira/acoes";
import { CLASSES, type ClasseAtivo } from "@/lib/carteira/regras";

type Props = {
  valor: OpcaoAtivo | null;
  aoMudar: (v: OpcaoAtivo | null) => void;
  /** Permite cadastrar ativo manual (renda fixa, fundo, previdência). */
  permitirManual?: boolean;
  /** Restringe a ativos de bolsa (ex.: plano de aportes por ticker). */
  somenteBolsa?: boolean;
};

/** Busca de ativo por ticker ou nome (catálogo do Atreides + provedor de mercado). */
export function SeletorAtivo({ valor, aoMudar, permitirManual = true, somenteBolsa }: Props) {
  const t = useTranslations("carteira.seletor");
  const tc = useTranslations("carteira.classes");
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoAtivo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [falha, setFalha] = useState(false);
  const [manual, setManual] = useState<{ nome: string; classe: ClasseAtivo } | null>(null);
  const ultima = useRef(0);

  useEffect(() => {
    if (termo.trim().length < 2) return;
    const id = ++ultima.current;
    const timer = setTimeout(async () => {
      setBuscando(true);
      const r = await buscarAtivos(termo);
      if (id !== ultima.current) return;
      setOpcoes(somenteBolsa ? r.opcoes.filter((o) => o.tipo === "bolsa") : r.opcoes);
      setFalha(r.falhaProvedor);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [termo, somenteBolsa]);

  if (valor) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-marca border border-borda-forte bg-superficie-2 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-texto">
            {valor.ticker ? `${valor.ticker} · ` : ""}
            {valor.nome}
          </p>
          <p className="text-xs text-texto-3">
            {tc(valor.classe)} · {valor.tipo === "bolsa" ? t("bolsa") : t("manual")}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("trocar")} onClick={() => aoMudar(null)}>
          <X />
        </Button>
      </div>
    );
  }

  if (manual) {
    return (
      <div className="flex flex-col gap-3 rounded-marca border border-borda bg-superficie-2 p-3">
        <Field rotulo={t("nomeManual")} dica={t("nomeManualDica")}>
          {(p) => <Input {...p} autoFocus value={manual.nome} onChange={(e) => setManual({ ...manual, nome: e.target.value })} />}
        </Field>
        <Field rotulo={t("classe")}>
          {(p) => (
            <Select {...p} value={manual.classe} onValueChange={(v) => setManual({ ...manual, classe: v as ClasseAtivo })}>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {tc(c)}
                </SelectItem>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={manual.nome.trim().length < 2} onClick={() => aoMudar({ id: null, ticker: null, nome: manual.nome.trim(), classe: manual.classe, tipo: "manual", novo: true })}>
            {t("usar")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setManual(null)}>
            {t("voltarBusca")}
          </Button>
        </div>
      </div>
    );
  }

  const mostrar = termo.trim().length >= 2;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-10 items-center gap-2 rounded-marca border border-borda-forte bg-superficie px-3 focus-within:border-marinho focus-within:ring-3 focus-within:ring-marinho/10">
        {buscando ? <Loader2 className="size-4 animate-spin text-texto-3" aria-hidden="true" /> : <Search className="size-4 text-texto-3" aria-hidden="true" />}
        <input
          autoFocus
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-texto outline-none placeholder:text-texto-3"
        />
      </div>
      {mostrar && opcoes.length ? (
        <ul className="max-h-64 overflow-y-auto rounded-marca border border-borda bg-superficie" role="listbox" aria-label={t("resultados")}>
          {opcoes.map((o) => (
            <li key={`${o.id ?? ""}${o.ticker ?? o.nome}`}>
              <button type="button" role="option" aria-selected={false} onClick={() => aoMudar(o)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-superficie-2">
                <span className="min-w-0">
                  <span className="font-semibold text-texto">{o.ticker ?? ""}</span>
                  <span className="ml-2 truncate text-texto-2">{o.nome}</span>
                </span>
                <Badge tom={o.novo ? "neutro" : "marca"}>{o.novo ? t("doMercado") : tc(o.classe)}</Badge>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {mostrar && !buscando && !opcoes.length ? <p className="text-xs text-texto-3">{t("nada")}</p> : null}
      {falha ? <p className="text-xs text-atencao">{t("falhaProvedor")}</p> : null}
      {permitirManual && !somenteBolsa ? (
        <button type="button" onClick={() => setManual({ nome: termo, classe: "cash" })} className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-latao-escuro hover:underline">
          <Plus className="size-3.5" aria-hidden="true" />
          {t("cadastrarManual")}
        </button>
      ) : null}
    </div>
  );
}
