export const locales = ["pt-BR", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt-BR";

/** Cookie que guarda o idioma escolhido pelo usuário. */
export const LOCALE_COOKIE = "atreides_locale";

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
