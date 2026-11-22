"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  id?: string;
  valor: string[];
  aoMudar: (v: string[]) => void;
  /** E-mail sugerido (ex.: o do lead vinculado), oferecido com um clique. */
  sugestao?: string | null;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/** Lista de e-mails em "fichas": digita, tecla Enter (ou vírgula) e o e-mail entra na lista. */
export function CampoParticipantes({ id, valor, aoMudar, sugestao, ...aria }: Props) {
  const t = useTranslations("agenda");
  const [texto, setTexto] = useState("");
  const [invalido, setInvalido] = useState(false);

  function adicionar(bruto: string) {
    const emails = bruto
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.length) return true;
    const ruins = emails.filter((e) => !EMAIL.test(e));
    const bons = emails.filter((e) => EMAIL.test(e) && !valor.includes(e));
    if (bons.length) aoMudar([...valor, ...bons]);
    setInvalido(ruins.length > 0);
    setTexto(ruins.join(", "));
    return ruins.length === 0;
  }

  const mostrarSugestao = sugestao && !valor.includes(sugestao.toLowerCase());

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-marca border bg-superficie px-2 py-1.5 transition-colors focus-within:border-marinho focus-within:ring-2 focus-within:ring-latao/40",
          invalido || aria["aria-invalid"] ? "border-erro" : "border-borda-forte",
        )}
      >
        {valor.map((e) => (
          <span key={e} className="inline-flex max-w-full items-center gap-1 rounded-full bg-divisoria py-0.5 pl-2.5 pr-1 text-xs text-texto">
            <span className="truncate">{e}</span>
            <button
              type="button"
              onClick={() => aoMudar(valor.filter((x) => x !== e))}
              aria-label={t("form.remover", { email: e })}
              className="flex size-5 items-center justify-center rounded-full text-texto-3 hover:bg-borda hover:text-texto"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={texto}
          placeholder={valor.length ? "" : t("form.participantesPlaceholder")}
          onChange={(e) => {
            setInvalido(false);
            const v = e.target.value;
            if (/[,;\s]$/.test(v)) adicionar(v);
            else setTexto(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar(texto);
            } else if (e.key === "Backspace" && !texto && valor.length) {
              aoMudar(valor.slice(0, -1));
            }
          }}
          onBlur={() => adicionar(texto)}
          onPaste={(e) => {
            e.preventDefault();
            adicionar(`${texto} ${e.clipboardData.getData("text")}`);
          }}
          className="min-w-40 flex-1 bg-transparent px-1 py-0.5 text-sm text-texto outline-none placeholder:text-texto-3"
          {...aria}
        />
      </div>
      {invalido ? <p className="text-xs text-erro">{t("erros.participanteInvalido")}</p> : null}
      {mostrarSugestao ? (
        <button
          type="button"
          onClick={() => aoMudar([...valor, sugestao!.toLowerCase()])}
          className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-latao-escuro hover:underline"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("form.sugestaoLead", { email: sugestao })}
        </button>
      ) : null}
    </div>
  );
}
