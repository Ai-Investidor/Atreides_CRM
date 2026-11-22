import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-marca font-medium transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45 aria-busy:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Ação principal da tela. No máximo um por área. */
        primary: "bg-marinho text-osso shadow-card hover:bg-marinho-3",
        /** Ações secundárias. */
        secondary: "border border-borda bg-superficie text-texto shadow-card hover:border-borda-forte hover:bg-superficie-2",
        /** Ações de baixa ênfase, em barras e tabelas. */
        ghost: "text-texto-2 hover:bg-divisoria hover:text-texto",
        /** Ações destrutivas (excluir, encerrar). */
        danger: "bg-erro text-white shadow-card hover:bg-[#74261c]",
        /** Link com aparência de texto. */
        link: "h-auto px-0 text-texto underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza o filho (ex.: <Link>) com o visual do botão. */
    asChild?: boolean;
    carregando?: boolean;
  };

/**
 * Botão do design system. Variantes: primary, secondary, ghost, danger, link.
 * Tamanhos: sm (32px), md (40px), lg (44px), icon, icon-sm.
 * Botões só com ícone exigem `aria-label`.
 */
export function Button({ className, variant, size, asChild, carregando, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled}
      aria-disabled={carregando || undefined}
      aria-busy={carregando || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {carregando ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}
