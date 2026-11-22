import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { Assinatura } from "@/components/assinatura";
import { CitacaoDigitada } from "@/components/citacao-digitada";
import { Meandro } from "@/components/meandro";
import { SeletorIdioma } from "@/components/seletor-idioma";
import { Simbolo } from "@/components/simbolo";
import { sortearCitacao } from "@/lib/citacoes";
import { BotaoGoogle } from "./botao-google";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("login");
  const tApp = await getTranslations("app");
  const { erro } = await searchParams;
  const ano = new Date().getFullYear();
  const locale = await getLocale();

  // Uma citação diferente a cada visita (nunca a mesma da última vez).
  const ultima = (await cookies()).get("atreides_ultima_citacao")?.value;
  const citacao = sortearCitacao(ultima);
  const obra = t(citacao.obra);

  return (
    <main className="flex min-h-screen flex-col lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      {/* ── Marca ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-marinho text-osso">
        {/* Marca d'água: o símbolo em escala monumental, recortado pela borda. */}
        <Simbolo
          tamanho="min(78vh, 760px)"
          corPilares="#F3EFE6"
          corPedra="#B8925A"
          className="pointer-events-none absolute -bottom-[14%] -right-[26%] -z-10 hidden opacity-[0.028] lg:block"
        />
        {/* Linhas finas de grade, como juntas de pedra. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 hidden opacity-[0.06] lg:block"
          style={{
            backgroundImage:
              "linear-gradient(to right, #F3EFE6 1px, transparent 1px), linear-gradient(to bottom, #F3EFE6 1px, transparent 1px)",
            backgroundSize: "120px 120px",
            maskImage: "linear-gradient(to bottom right, black 10%, transparent 70%)",
          }}
        />

        <div className="flex h-full flex-col justify-between gap-16 px-6 py-7 sm:px-12 lg:px-16 lg:py-14">
          <Assinatura tagline={tApp("tagline")} />

          <div className="hidden max-w-[34rem] lg:block">
            <p className="mb-8 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-latao">
              <span className="h-px w-10 bg-latao" aria-hidden="true" />
              <span lang="grc" className="normal-case tracking-[0.3em]">ΑΤΡΕΙΔΗΣ</span>
              <span aria-hidden="true">·</span>
              {t("overline")}
            </p>
            <CitacaoDigitada
              key={citacao.id}
              id={citacao.id}
              texto={locale === "en" ? citacao.en : citacao.pt}
              grego={citacao.grego}
              autor={t("quoteAuthor")}
              referencia={`${obra} ${citacao.canto}, ${citacao.versos}`}
            />
          </div>

          <div className="hidden flex-col gap-5 lg:flex">
            <Meandro className="opacity-60" />
            <p className="text-xs text-nevoa">© {ano} Atreides · AI Invest</p>
          </div>
        </div>
      </section>

      {/* ── Acesso ────────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col bg-osso px-6 py-7 sm:px-12 lg:px-14 lg:py-14">
        <div className="flex justify-end">
          <SeletorIdioma />
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[380px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5A4A2E]">{t("eyebrow")}</p>
            <h1 className="mt-4 font-titulo text-[2rem] font-bold leading-tight tracking-[-0.02em]">{t("title")}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-texto-2">{t("subtitle")}</p>

            {erro ? (
              <div role="alert" className="mt-8 flex gap-3 rounded-marca border border-[#E8C9C2] bg-erro-fundo px-4 py-3 text-sm text-erro">
                <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
                </svg>
                <span className="font-medium">{t("error")}</span>
              </div>
            ) : null}

            <div className="mt-8">
              <BotaoGoogle rotulo={t("google")} rotuloCarregando={t("loading")} />
            </div>

            <div className="mt-8 flex gap-3 border-t border-borda pt-6 text-[13px] leading-relaxed text-texto-2">
              <svg className="mt-0.5 size-4 shrink-0 text-marinho" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <p>{t("security")}</p>
            </div>
          </div>
        </div>

        <p className="mx-auto w-full max-w-[380px] text-center text-xs text-texto-2 lg:text-left">{t("help")}</p>
      </section>
    </main>
  );
}
