import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tom = "info" | "ok" | "atencao" | "erro";

const ALERTA: Record<Tom, { classe: string; Icone: LucideIcon }> = {
  info: { classe: "border-[#C9D9EC] bg-info-fundo text-info", Icone: Info },
  ok: { classe: "border-[#C6DDCF] bg-ok-fundo text-ok", Icone: CheckCircle2 },
  atencao: { classe: "border-[#E7D3AE] bg-atencao-fundo text-atencao", Icone: TriangleAlert },
  erro: { classe: "border-[#E8C9C2] bg-erro-fundo text-erro", Icone: AlertCircle },
};

type AlertProps = {
  tom?: Tom;
  titulo?: string;
  children: React.ReactNode;
  className?: string;
};

/** Mensagem contextual dentro da tela (erro de formulário, aviso, confirmação). */
export function Alert({ tom = "info", titulo, children, className }: AlertProps) {
  const { classe, Icone } = ALERTA[tom];
  return (
    <div role={tom === "erro" ? "alert" : "status"} className={cn("flex gap-3 rounded-marca border px-4 py-3 text-sm", classe, className)}>
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        {titulo ? <p className="font-semibold">{titulo}</p> : null}
        <div className={titulo ? "mt-0.5 opacity-90" : "font-medium"}>{children}</div>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  Icone: LucideIcon;
  titulo: string;
  descricao?: string;
  /** Ação principal (geralmente um <Button>). */
  acao?: React.ReactNode;
  compacto?: boolean;
  className?: string;
};

/** Estado vazio: ícone, explicação curta e o próximo passo. Nunca deixar uma área em branco. */
export function EmptyState({ Icone, titulo, descricao, acao, compacto, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", compacto ? "gap-2 py-5" : "gap-3 py-9", className)}>
      <span className="flex size-10 items-center justify-center rounded-full border border-borda bg-superficie-2 text-texto-3">
        <Icone className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="max-w-xs">
        <p className="text-sm font-semibold text-texto">{titulo}</p>
        {descricao ? <p className="mt-1 text-[13px] leading-relaxed text-texto-3">{descricao}</p> : null}
      </div>
      {acao ? <div className="mt-1">{acao}</div> : null}
    </div>
  );
}

/** Bloco de carregamento com a forma do conteúdo final. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-marca bg-divisoria", className)} />;
}

/** Tecla de atalho: <Kbd>⌘K</Kbd>. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border border-borda bg-superficie-2 px-1.5 font-sans text-[11px] font-medium text-texto-3", className)}>
      {children}
    </kbd>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-divisoria", className)} />;
}
