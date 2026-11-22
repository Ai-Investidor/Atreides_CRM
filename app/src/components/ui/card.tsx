import { cn } from "@/lib/utils";

/** Superfície branca com borda fina. Bloco básico de qualquer tela. */
export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-card border border-borda bg-superficie shadow-card", className)}
      {...props}
    />
  );
}

/** Cabeçalho do card: título à esquerda, ações à direita. */
export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 border-b border-divisoria px-5 py-4", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-[15px] font-semibold tracking-[-0.01em] text-texto", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mt-0.5 text-[13px] text-texto-3", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-end gap-2 border-t border-divisoria px-5 py-3", className)}
      {...props}
    />
  );
}
