type SimboloProps = {
  /** "claro" = pilares marinho (fundo claro); "negativo" = pilares osso (fundo marinho). */
  variante?: "claro" | "negativo";
  tamanho?: number | string;
  titulo?: string;
  className?: string;
  /** Sobrescreve as cores (ex.: marca d'água). */
  corPilares?: string;
  corPedra?: string;
};

/** Símbolo "pedra angular" da Atreides (identidade/simbolo.svg). */
export function Simbolo({
  variante = "negativo",
  tamanho = 32,
  titulo,
  className,
  corPilares,
  corPedra = "#B8925A",
}: SimboloProps) {
  const pilares = corPilares ?? (variante === "negativo" ? "#F3EFE6" : "#0E1A2B");

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 120 120"
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <g fill={pilares}>
        <path d="M36,12 L47,12 L53,37 A13,13 0 0,0 47,48 L47,59 L22.9,59 Z" />
        <path d="M84,12 L73,12 L67,37 A13,13 0 0,1 73,48 L73,59 L97.1,59 Z" />
        <path d="M19,61 H50 V66 H19 Z" />
        <path d="M70,61 H101 V66 H70 Z" />
        <path d="M20.4,68 L46,68 L40,98 L12,98 Z" />
        <path d="M99.6,68 L74,68 L80,98 L108,98 Z" />
        <path d="M8,100 H46 V106 H8 Z" />
        <path d="M74,100 H112 V106 H74 Z" />
      </g>
      <path d="M50,12 L70,12 L64,34 L56,34 Z" fill={corPedra} />
    </svg>
  );
}
