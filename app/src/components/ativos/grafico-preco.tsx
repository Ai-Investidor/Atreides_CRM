"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatarData, formatarMoeda } from "@/lib/formatos";
import { cn } from "@/lib/utils";

type Ponto = { data: string; fechamento: number };
const PERIODOS = [
  { chave: "1m", dias: 31 },
  { chave: "6m", dias: 183 },
  { chave: "1a", dias: 366 },
  { chave: "5a", dias: 5 * 366 },
] as const;
const ALTURA = 260;
const M = { topo: 12, dir: 16, base: 26, esq: 64 };

/** Gráfico de preço (série única, eixo ajustado à faixa do período), com linha-guia e dica. */
export function GraficoPreco({ pontos, hoje }: { pontos: Ponto[]; hoje: string }) {
  const t = useTranslations("ativos.grafico");
  const locale = useLocale();
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["chave"]>("1a");
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dias = PERIODOS.find((p) => p.chave === periodo)!.dias;
  const corte = new Date(Date.parse(`${hoje}T12:00:00Z`) - dias * 864e5).toISOString().slice(0, 10);
  const serie = pontos.filter((p) => p.data >= corte);
  const variacao = serie.length >= 2 ? ((serie.at(-1)!.fechamento - serie[0].fechamento) / serie[0].fechamento) * 100 : null;

  const corpo = () => {
    if (serie.length < 2) return <p className="py-16 text-center text-sm text-texto-3">{t("semDados")}</p>;
    const min = Math.min(...serie.map((p) => p.fechamento));
    const max = Math.max(...serie.map((p) => p.fechamento));
    const folga = (max - min) * 0.08 || max * 0.02;
    const lo = Math.max(0, min - folga);
    const hi = max + folga;
    const w = largura - M.esq - M.dir;
    const h = ALTURA - M.topo - M.base;
    const x = (i: number) => M.esq + (i / (serie.length - 1)) * w;
    const y = (v: number) => M.topo + h - ((v - lo) / (hi - lo)) * h;
    const linha = serie.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.fechamento).toFixed(1)}`).join(" ");
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * (hi - lo));
    const rotulos = [0, Math.floor(serie.length / 3), Math.floor((2 * serie.length) / 3), serie.length - 1];
    const sel = ativo !== null ? serie[ativo] : null;
    return (
      <div className="relative">
        <svg width={largura} height={ALTURA} role="img" aria-label={t("aria", { periodo: t(`periodos.${periodo}`) })} className="block">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.esq} x2={largura - M.dir} y1={y(v)} y2={y(v)} stroke="var(--color-divisoria)" strokeWidth={1} />
              <text x={M.esq - 10} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-texto-3 text-[11px] tabular-nums">
                {formatarMoeda(v, locale, v >= 100 ? true : false)}
              </text>
            </g>
          ))}
          <path d={linha} fill="none" stroke="var(--color-marinho)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {rotulos.map((i, k) => (
            <text key={i} x={x(i)} y={ALTURA - 8} textAnchor={k === 0 ? "start" : k === rotulos.length - 1 ? "end" : "middle"} className="fill-texto-3 text-[11px]">
              {formatarData(serie[i].data, locale, { day: dias > 200 ? undefined : "2-digit", year: "2-digit" })}
            </text>
          ))}
          {sel && ativo !== null ? <line x1={x(ativo)} x2={x(ativo)} y1={M.topo} y2={M.topo + h} stroke="var(--color-borda-forte)" strokeWidth={1} /> : null}
          <circle cx={x(ativo ?? serie.length - 1)} cy={y((sel ?? serie.at(-1)!).fechamento)} r={4.5} fill="var(--color-marinho)" stroke="var(--color-superficie)" strokeWidth={2} />
          <rect
            x={M.esq}
            y={M.topo}
            width={w}
            height={h}
            fill="transparent"
            tabIndex={0}
            aria-label={t("explorar")}
            className="outline-none"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setAtivo(Math.min(serie.length - 1, Math.max(0, Math.round(((e.clientX - r.left) / r.width) * (serie.length - 1)))));
            }}
            onPointerLeave={() => setAtivo(null)}
            onFocus={() => setAtivo(serie.length - 1)}
            onBlur={() => setAtivo(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setAtivo((a) => Math.max(0, (a ?? serie.length - 1) - 1));
              if (e.key === "ArrowRight") setAtivo((a) => Math.min(serie.length - 1, (a ?? 0) + 1));
            }}
          />
        </svg>
        {sel && ativo !== null ? (
          <div role="status" className="pointer-events-none absolute top-1 z-10 rounded-marca border border-borda bg-superficie px-3 py-2 text-xs shadow-elevado" style={{ left: Math.min(Math.max(x(ativo) - 70, 0), largura - 150) }}>
            <p className="text-texto-3">{formatarData(sel.data, locale)}</p>
            <p className="numero mt-0.5 text-sm font-semibold text-texto">{formatarMoeda(sel.fechamento, locale, false)}</p>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div ref={caixa} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("periodo")} className="flex rounded-marca border border-borda bg-superficie-2 p-0.5">
          {PERIODOS.map((p) => (
            <button
              key={p.chave}
              type="button"
              role="tab"
              aria-selected={periodo === p.chave}
              onClick={() => setPeriodo(p.chave)}
              className={cn("h-8 rounded-[6px] px-3 text-[13px] font-medium", periodo === p.chave ? "bg-superficie text-texto shadow-card" : "text-texto-3 hover:text-texto")}
            >
              {t(`periodos.${p.chave}`)}
            </button>
          ))}
        </div>
        {variacao !== null ? (
          <span className={cn("numero text-sm font-semibold", variacao >= 0 ? "text-ok" : "text-erro")}>
            {t("variacao", { pct: `${variacao > 0 ? "+" : ""}${variacao.toLocaleString(locale, { maximumFractionDigits: 1 })}%` })}
          </span>
        ) : null}
      </div>
      {corpo()}
    </div>
  );
}
