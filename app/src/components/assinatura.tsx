import { Simbolo } from "./simbolo";

type AssinaturaProps = {
  tagline: string;
  /** "negativo" sobre marinho, "claro" sobre osso/branco. */
  variante?: "negativo" | "claro";
  tamanho?: "sm" | "md";
};

/** Assinatura horizontal: símbolo + ATREIDES + tagline. */
export function Assinatura({ tagline, variante = "negativo", tamanho = "md" }: AssinaturaProps) {
  const escuro = variante === "negativo";
  const grande = tamanho === "md";

  return (
    <div className="flex items-center gap-3.5">
      <Simbolo variante={variante} tamanho={grande ? 40 : 32} />
      <div className="flex flex-col gap-1">
        <span
          className={`font-titulo font-bold leading-none tracking-[0.16em] ${grande ? "text-xl" : "text-base"} ${escuro ? "text-osso" : "text-marinho"}`}
        >
          ATREIDES
        </span>
        <span
          className={`text-[9px] font-medium uppercase leading-none tracking-[0.32em] ${escuro ? "text-latao" : "text-[#5A4A2E]"}`}
        >
          {tagline}
        </span>
      </div>
    </div>
  );
}
