"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatarData, formatarMoeda, formatarMoedaCompacta } from "@/lib/formatos";

export type PontoEvolucao = { data: string; total: number; investido: number | null; hoje?: boolean };

const ALTURA = 240;
const M = { topo: 16, dir: 24, base: 28, esq: 72 };

function ticksLimpos(max: number) {
  if (max <= 0) return [0];
  const passoBruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= passoBruto) ?? passoBruto;
  return Array.from({ length: Math.ceil(max / passo) + 1 }, (_, i) => i * passo);
}

/**
 * Evolução patrimonial (fotografias + hoje). Série única: sem legenda, o título diz o que é.
 * Linha 2px, área a ~10%, ponto final com anel; linha-guia e dica ao passar o mouse (dataviz).
 */
export function GraficoEvolucao({ pontos }: { pontos: PontoEvolucao[] }) {
  const t = useTranslations("carteira.evolucao");
  const locale = useLocale();
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (pontos.length < 2) {
    return <p className="py-10 text-center text-sm text-texto-3">{t("poucosPontos")}</p>;
  }

  const ticks = ticksLimpos(Math.max(...pontos.map((p) => p.total)) * 1.08);
  const maxY = ticks.at(-1)!;
  const w = largura - M.esq - M.dir;
  const h = ALTURA - M.topo - M.base;
  const x = (i: number) => M.esq + (pontos.length === 1 ? w / 2 : (i / (pontos.length - 1)) * w);
  const y = (v: number) => M.topo + h - (v / maxY) * h;
  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(pontos.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const rotulo = (p: PontoEvolucao) => (p.hoje ? t("hoje") : formatarData(p.data, locale, { year: "2-digit" }));
  const mostrarRotulo = (i: number) => i === 0 || i === pontos.length - 1 || pontos.length <= 8 || i % Math.ceil(pontos.length / 6) === 0;

  function mover(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - 0) / r.width) * (pontos.length - 1));
    setAtivo(Math.min(pontos.length - 1, Math.max(0, i)));
  }

  const sel = ativo !== null ? pontos[ativo] : null;
  return (
    <div ref={caixa} className="relative">
      <svg width={largura} height={ALTURA} role="img" aria-label={t("aria", { pontos: pontos.length })} className="block">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.esq} x2={largura - M.dir} y1={y(v)} y2={y(v)} stroke="var(--color-divisoria)" strokeWidth={1} />
            <text x={M.esq - 10} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-texto-3 text-[11px] tabular-nums">
              {formatarMoedaCompacta(v, locale)}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--color-marinho)" fillOpacity={0.08} />
        <path d={linha} fill="none" stroke="var(--color-marinho)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) =>
          mostrarRotulo(i) ? (
            <text key={p.data + i} x={x(i)} y={ALTURA - 8} textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"} className="fill-texto-3 text-[11px]">
              {rotulo(p)}
            </text>
          ) : null,
        )}
        {sel !== null && ativo !== null ? (
          <line x1={x(ativo)} x2={x(ativo)} y1={M.topo} y2={y(0)} stroke="var(--color-borda-forte)" strokeWidth={1} />
        ) : null}
        <circle
          cx={x(ativo ?? pontos.length - 1)}
          cy={y((sel ?? pontos.at(-1)!).total)}
          r={4.5}
          fill="var(--color-marinho)"
          stroke="var(--color-superficie)"
          strokeWidth={2}
        />
        <rect
          x={M.esq}
          y={M.topo}
          width={w}
          height={h}
          fill="transparent"
          tabIndex={0}
          aria-label={t("explorar")}
          onPointerMove={mover}
          onPointerLeave={() => setAtivo(null)}
          onFocus={() => setAtivo(pontos.length - 1)}
          onBlur={() => setAtivo(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setAtivo((a) => Math.max(0, (a ?? pontos.length - 1) - 1));
            if (e.key === "ArrowRight") setAtivo((a) => Math.min(pontos.length - 1, (a ?? 0) + 1));
          }}
          className="outline-none"
        />
      </svg>
      {sel && ativo !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-marca border border-borda bg-superficie px-3 py-2 text-xs shadow-elevado"
          style={{ left: Math.min(Math.max(x(ativo) - 80, 0), largura - 180) }}
        >
          <p className="text-texto-3">{sel.hoje ? t("hojeCompleto") : formatarData(sel.data, locale)}</p>
          <p className="numero mt-0.5 flex items-center gap-2 text-sm font-semibold text-texto">
            <span className="h-0.5 w-3 rounded-full bg-marinho" aria-hidden="true" />
            {formatarMoeda(sel.total, locale)}
          </p>
          {sel.investido !== null ? <p className="numero mt-0.5 text-texto-3">{t("investido", { valor: formatarMoeda(sel.investido, locale) })}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
