import { getLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { trocarIdioma } from "@/lib/idioma";

const ROTULO: Record<string, string> = { "pt-BR": "PT", en: "EN" };

/** Alternador PT | EN. */
export async function SeletorIdioma() {
  const atual = await getLocale();
  const t = await getTranslations("idioma");

  return (
    <form action={trocarIdioma} className="flex items-center rounded-marca border border-borda bg-white p-0.5 text-xs font-semibold">
      <span className="sr-only">{t("label")}</span>
      {locales.map((locale) => {
        const ativo = locale === atual;
        return (
          <button
            key={locale}
            type="submit"
            name="locale"
            value={locale}
            aria-pressed={ativo}
            aria-label={t(locale)}
            className={`min-h-8 min-w-10 rounded-[3px] px-2.5 tracking-wider transition-colors ${ativo ? "bg-marinho text-osso" : "text-texto-2 hover:text-marinho"}`}
          >
            {ROTULO[locale]}
          </button>
        );
      })}
    </form>
  );
}
