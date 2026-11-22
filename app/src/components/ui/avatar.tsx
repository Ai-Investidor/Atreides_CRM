import { cn, iniciais } from "@/lib/utils";

type AvatarProps = {
  nome: string;
  tamanho?: "sm" | "md" | "lg";
  /** "claro" sobre superfícies claras, "escuro" sobre o marinho. */
  tom?: "claro" | "escuro";
  className?: string;
};

const TAMANHOS = { sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-12 text-sm" };

/** Avatar com iniciais. Usado para pessoas (equipe, clientes, leads). */
export function Avatar({ nome, tamanho = "md", tom = "claro", className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-wide",
        tom === "claro" ? "bg-latao-claro text-latao-escuro" : "bg-marinho-3 text-osso ring-1 ring-white/10",
        TAMANHOS[tamanho],
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
