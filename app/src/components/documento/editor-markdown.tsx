"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bold, Eye, FileUp, Heading2, Heading3, Italic, List, ListOrdered, PenLine, Quote, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Dica } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

/**
 * Editor de markdown do diagnóstico (14) e do planejamento (05): barra de formatação, envio de
 * .md/.txt e visualização ao lado. "lateral" mostra outro conteúdo no lugar da visualização
 * (ex.: o diagnóstico enquanto se escreve o planejamento).
 */

export const EXTENSOES_TEXTO = [".md", ".markdown", ".txt"];
export const TAMANHO_MAX_TEXTO_ARQUIVO = 1024 * 1024;

type Acao = "titulo" | "subtitulo" | "negrito" | "italico" | "lista" | "listaNumerada" | "citacao";
const BARRA: { acao: Acao; Icone: LucideIcon }[] = [
  { acao: "titulo", Icone: Heading2 },
  { acao: "subtitulo", Icone: Heading3 },
  { acao: "negrito", Icone: Bold },
  { acao: "italico", Icone: Italic },
  { acao: "lista", Icone: List },
  { acao: "listaNumerada", Icone: ListOrdered },
  { acao: "citacao", Icone: Quote },
];

/** Aplica a formatação no trecho selecionado (ou nas linhas da seleção). */
function formatar(texto: string, inicio: number, fim: number, acao: Acao): { texto: string; inicio: number; fim: number } {
  const envolver = (marca: string, exemplo: string) => {
    const meio = texto.slice(inicio, fim) || exemplo;
    const novo = texto.slice(0, inicio) + marca + meio + marca + texto.slice(fim);
    return { texto: novo, inicio: inicio + marca.length, fim: inicio + marca.length + meio.length };
  };
  if (acao === "negrito") return envolver("**", "negrito");
  if (acao === "italico") return envolver("_", "itálico");

  const ini = texto.lastIndexOf("\n", inicio - 1) + 1;
  const fimLinha = texto.indexOf("\n", fim);
  const fimBloco = fimLinha === -1 ? texto.length : fimLinha;
  const linhas = texto.slice(ini, fimBloco).split("\n");
  const prefixo = (i: number) => ({ titulo: "## ", subtitulo: "### ", lista: "- ", listaNumerada: `${i + 1}. `, citacao: "> " })[acao as Exclude<Acao, "negrito" | "italico">];
  const bloco = linhas.map((l, i) => prefixo(i) + l.replace(/^(#{1,6} |- |\d+\. |> )/, "")).join("\n");
  return { texto: texto.slice(0, ini) + bloco + texto.slice(fimBloco), inicio: ini, fim: ini + bloco.length };
}

type Props = {
  valor: string;
  aoMudar: (v: string) => void;
  /** Texto do modelo: subir arquivo por cima dele não pede confirmação. */
  modelo: string;
  lateral?: { rotulo: string; conteudo: React.ReactNode };
};

export function EditorMarkdown({ valor, aoMudar, modelo, lateral }: Props) {
  const t = useTranslations("editorMarkdown");
  const area = useRef<HTMLTextAreaElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const [aba, setAba] = useState<"escrever" | "visualizar" | "lateral">("escrever");
  const [direita, setDireita] = useState<"visualizar" | "lateral">("visualizar");
  const [erro, setErro] = useState<string | null>(null);

  function aplicar(acao: Acao) {
    const el = area.current;
    if (!el) return;
    const r = formatar(valor, el.selectionStart, el.selectionEnd, acao);
    aoMudar(r.texto);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.inicio, r.fim);
    });
  }

  async function carregar(f: File | undefined) {
    if (arquivo.current) arquivo.current.value = "";
    if (!f) return;
    setErro(null);
    if (!EXTENSOES_TEXTO.some((e) => f.name.toLowerCase().endsWith(e))) return setErro("arquivoTipo");
    if (f.size > TAMANHO_MAX_TEXTO_ARQUIVO) return setErro("arquivoGrande");
    try {
      const conteudo = (await f.text()).replace(/\r\n/g, "\n");
      const temAlgo = valor.trim() !== "" && valor.trim() !== modelo.trim();
      if (temAlgo && !window.confirm(t("substituirConfirma"))) return;
      aoMudar(conteudo);
      setAba("escrever");
    } catch {
      setErro("leitura");
    }
  }

  const abas = (["escrever", "visualizar", ...(lateral ? (["lateral"] as const) : [])] as const).map((a) => ({
    a,
    rotulo: a === "escrever" ? t("abaEscrever") : a === "visualizar" ? t("abaVisualizar") : lateral!.rotulo,
  }));
  const previa = valor.trim() ? <Markdown texto={valor} /> : <p className="text-sm text-texto-3">{t("semTexto")}</p>;
  const painelDireito = lateral && direita === "lateral" ? lateral.conteudo : previa;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-marca border border-borda bg-superficie-2 p-1 xl:hidden" role="tablist">
          {abas.map(({ a, rotulo }) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm", aba === a ? "bg-superficie font-medium text-texto shadow-sm" : "text-texto-2 hover:text-texto")}
            >
              {a === "escrever" ? <PenLine className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
              {rotulo}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {BARRA.map(({ acao, Icone }) => (
            <Dica key={acao} texto={t(`barra.${acao}`)}>
              <Button type="button" variant="ghost" size="sm" aria-label={t(`barra.${acao}`)} onClick={() => aplicar(acao)} className="px-2">
                <Icone />
              </Button>
            </Dica>
          ))}
          <span className="mx-1 h-5 w-px bg-divisoria" aria-hidden="true" />
          <input ref={arquivo} type="file" accept={EXTENSOES_TEXTO.join(",")} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void carregar(e.target.files?.[0])} />
          <Dica texto={t("subirDica")}>
            <Button type="button" variant="secondary" size="sm" onClick={() => arquivo.current?.click()}>
              <FileUp />
              {t("subirArquivo")}
            </Button>
          </Dica>
        </div>
      </div>
      {erro ? (
        <p className="text-xs font-medium text-erro" role="alert">
          {t(`erros.${erro}`)}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cn(aba !== "escrever" && "hidden", "xl:block")}>
          <Textarea ref={area} aria-label={t("abaEscrever")} value={valor} onChange={(e) => aoMudar(e.target.value)} spellCheck className="min-h-[28rem] resize-y font-mono text-[13px] leading-relaxed" />
        </div>
        {/* Telas menores: visualização ou lateral pelas abas. */}
        <div className={cn(aba === "escrever" && "hidden", "min-h-[28rem] rounded-marca border border-borda bg-superficie-2/40 px-5 py-4 xl:hidden")}>
          {aba === "lateral" && lateral ? lateral.conteudo : previa}
        </div>
        {/* Tela larga: escolhe entre visualização e lateral. */}
        <div className="hidden min-h-[28rem] flex-col rounded-marca border border-borda bg-superficie-2/40 xl:flex">
          {lateral ? (
            <div className="flex gap-1 border-b border-divisoria px-3 py-2" role="tablist">
              {(["visualizar", "lateral"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={direita === d}
                  onClick={() => setDireita(d)}
                  className={cn("rounded px-2.5 py-1 text-xs", direita === d ? "bg-superficie font-medium text-texto shadow-sm" : "text-texto-2 hover:text-texto")}
                >
                  {d === "visualizar" ? t("abaVisualizar") : lateral.rotulo}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex-1 overflow-y-auto px-5 py-4">{painelDireito}</div>
        </div>
      </div>
    </div>
  );
}
