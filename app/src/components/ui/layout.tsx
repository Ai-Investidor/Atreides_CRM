import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Contêiner padrão de página: largura máxima e respiro lateral. */
export function Page({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8", className)} {...props} />;
}

type PageHeaderProps = {
  titulo: string;
  /** Linha pequena acima do título (data, módulo, contexto). */
  sobretitulo?: string;
  descricao?: string;
  /** Botões à direita. O principal fica por último. */
  acoes?: React.ReactNode;
  className?: string;
};

/** Cabeçalho de página: sobretítulo, título, descrição e ações. */
export function PageHeader({ titulo, sobretitulo, descricao, acoes, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {sobretitulo ? (
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-latao-escuro">{sobretitulo}</p>
        ) : null}
        <h1 className="font-titulo text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-texto sm:text-[2rem]">
          {titulo}
        </h1>
        {descricao ? <p className="mt-1.5 max-w-2xl text-[15px] text-texto-2">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </header>
  );
}

type StatCardProps = {
  rotulo: string;
  valor: string;
  Icone: LucideIcon;
  /** Contexto abaixo do número (variação, data de referência, observação). */
  detalhe?: string;
  /** Destaca o indicador mais importante do bloco com o filete de latão. */
  destaque?: boolean;
  className?: string;
};

/** Indicador numérico. Todo número mostra contexto ou data de referência. */
export function StatCard({ rotulo, valor, Icone, detalhe, destaque, className }: StatCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-card border border-borda bg-superficie p-5 shadow-card", className)}>
      {destaque ? <span className="absolute inset-x-0 top-0 h-0.5 bg-latao" aria-hidden="true" /> : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-texto-2">{rotulo}</p>
        <span className="flex size-8 items-center justify-center rounded-marca bg-superficie-2 text-texto-3 ring-1 ring-divisoria">
          <Icone className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="numero mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.025em] text-texto">{valor}</p>
      {detalhe ? <p className="mt-2 text-xs text-texto-3">{detalhe}</p> : null}
    </div>
  );
}
