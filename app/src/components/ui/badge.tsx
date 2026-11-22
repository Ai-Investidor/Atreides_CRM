import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tom: {
        neutro: "bg-divisoria text-texto-2",
        ok: "bg-ok-fundo text-ok",
        atencao: "bg-atencao-fundo text-atencao",
        erro: "bg-erro-fundo text-erro",
        info: "bg-info-fundo text-info",
        marca: "bg-latao-claro text-latao-escuro",
        escuro: "bg-marinho text-osso",
      },
    },
    defaultVariants: { tom: "neutro" },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Mostra um ponto colorido antes do texto (status). */
    ponto?: boolean;
  };

/** Etiqueta de status ou categoria. O texto sempre explica o status — nunca só a cor. */
export function Badge({ className, tom, ponto, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tom }), className)} {...props}>
      {ponto ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
