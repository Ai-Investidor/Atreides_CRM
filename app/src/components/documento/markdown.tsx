"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Markdown do diagnóstico (14) e do planejamento (05) na tela. Sem HTML: o react-markdown não executa
 * HTML colado no texto. Tamanho "apresentacao" para mostrar ao cliente em tela cheia.
 */
export function Markdown({ texto, tamanho = "normal", className }: { texto: string; tamanho?: "normal" | "apresentacao"; className?: string }) {
  const g = tamanho === "apresentacao";
  const componentes: Components = {
    h1: ({ children }) => <h1 className={cn("font-titulo font-bold tracking-tight text-texto", g ? "mt-10 mb-4 text-4xl" : "mt-6 mb-3 text-2xl")}>{children}</h1>,
    h2: ({ children }) => (
      <h2 className={cn("border-b border-divisoria font-titulo font-bold tracking-tight text-texto", g ? "mt-12 mb-4 pb-2 text-3xl" : "mt-6 mb-2 pb-1.5 text-lg")}>{children}</h2>
    ),
    h3: ({ children }) => <h3 className={cn("font-titulo font-semibold text-texto", g ? "mt-8 mb-3 text-2xl" : "mt-4 mb-1.5 text-base")}>{children}</h3>,
    p: ({ children }) => <p className={cn("text-texto", g ? "mb-5 text-xl leading-relaxed" : "mb-3 text-sm leading-relaxed")}>{children}</p>,
    ul: ({ children }) => <ul className={cn("list-disc pl-6 marker:text-latao", g ? "mb-5 space-y-2 text-xl" : "mb-3 space-y-1 text-sm")}>{children}</ul>,
    ol: ({ children }) => <ol className={cn("list-decimal pl-6 marker:text-texto-3", g ? "mb-5 space-y-2 text-xl" : "mb-3 space-y-1 text-sm")}>{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed text-texto">{children}</li>,
    blockquote: ({ children }) => <blockquote className={cn("border-l-2 border-latao pl-4 text-texto-2", g ? "my-6 text-xl" : "my-3")}>{children}</blockquote>,
    hr: () => <hr className="my-6 border-divisoria" />,
    em: ({ children }) => <em className="text-texto-2">{children}</em>,
    strong: ({ children }) => <strong className="font-semibold text-texto">{children}</strong>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-marinho underline underline-offset-2">
        {children}
      </a>
    ),
    code: ({ children }) => <code className="rounded bg-superficie-2 px-1 py-0.5 text-[0.9em]">{children}</code>,
    table: ({ children }) => (
      <div className="mb-4 overflow-x-auto">
        <table className={cn("w-full border-collapse", g ? "text-lg" : "text-sm")}>{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-borda px-2 py-1.5 text-left font-medium text-texto-2">{children}</th>,
    td: ({ children }) => <td className="border-b border-divisoria px-2 py-1.5">{children}</td>,
  };
  return (
    <div className={cn("max-w-none [&>*:first-child]:mt-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentes}>
        {texto}
      </ReactMarkdown>
    </div>
  );
}
