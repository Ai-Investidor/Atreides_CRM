"use client";

import { useEffect, useState } from "react";

type CitacaoDigitadaProps = {
  /** Id da citação; fica salvo para a próxima visita sortear outra. */
  id: string;
  texto: string;
  grego: string;
  autor: string;
  referencia: string;
  /** Milissegundos por caractere. */
  velocidade?: number;
};

/**
 * Citação com efeito de digitação. O texto completo fica reservado (invisível)
 * para a página não "pular", e leitores de tela recebem a frase inteira de uma vez.
 * Quem prefere menos movimento vê o texto pronto.
 */
export function CitacaoDigitada({ id, texto, grego, autor, referencia, velocidade = 32 }: CitacaoDigitadaProps) {
  const [escritos, setEscritos] = useState(0);
  const concluido = escritos >= texto.length;

  useEffect(() => {
    document.cookie = `atreides_ultima_citacao=${id}; path=/login; max-age=31536000; samesite=lax`;
  }, [id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timer = setTimeout(() => setEscritos(texto.length), 0);
      return () => clearTimeout(timer);
    }
    let atual = 0;
    const proximo = () => {
      atual += 1;
      setEscritos(atual);
      if (atual < texto.length) {
        // Pequena pausa após pontuação, como quem lê em voz alta.
        const pausa = /[,.:;—]/.test(texto[atual - 1]) ? velocidade * 9 : velocidade;
        timer = setTimeout(proximo, pausa);
      }
    };
    timer = setTimeout(proximo, 500);
    return () => clearTimeout(timer);
  }, [texto, velocidade]);

  return (
    <figure>
      <blockquote className="font-titulo text-[2rem] font-medium leading-[1.25] tracking-[-0.01em] text-osso xl:text-[2.35rem]">
        <span className="sr-only">{texto}</span>
        <span aria-hidden="true" className="grid">
          {/* Reserva o espaço do texto completo. */}
          <span className="invisible col-start-1 row-start-1">{texto}</span>
          <span className="col-start-1 row-start-1">
            {texto.slice(0, escritos)}
            <span
              className={`ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] bg-latao ${concluido ? "animate-[piscar_1.1s_steps(1)_infinite]" : ""}`}
            />
          </span>
        </span>
      </blockquote>

      <div className={`transition-all duration-700 ${concluido ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>
        <p lang="grc" className="mt-6 text-[15px] italic leading-relaxed text-nevoa">
          {grego}
        </p>
        <figcaption className="mt-2 text-sm text-nevoa">
          — <span className="font-semibold text-osso">{autor}</span>, {referencia}
        </figcaption>
      </div>
    </figure>
  );
}
