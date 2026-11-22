/** Faixa de meandro grego em latão. Só em login, capas e rodapés (Documentação/12). */
export function Meandro({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="100%" height="14" aria-hidden="true">
      <defs>
        <pattern id="meandro-atreides" width="24" height="14" patternUnits="userSpaceOnUse">
          <path
            d="M0,13 H24 M0,1 H24 M3,13 V4 H15 V10 H8 V7 H11"
            fill="none"
            stroke="#B8925A"
            strokeWidth="1.6"
            strokeLinecap="square"
          />
        </pattern>
      </defs>
      <rect width="100%" height="14" fill="url(#meandro-atreides)" />
    </svg>
  );
}
