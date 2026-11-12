/** Languages the site is written in. The first is the default (and the language of the static HTML). */
export const SUPPORTED_LOCALES = ['en', 'fr'] as const
export type SiteLocale = (typeof SUPPORTED_LOCALES)[number]

/** Where the visitor's explicit language choice is kept between visits. */
export const LOCALE_STORAGE_KEY = 'observatory:lang'

/**
 * The language to show: a valid saved choice wins; otherwise the first browser language we support
 * (matched on its primary subtag, so "fr-CA" gives French); otherwise English.
 */
export function pickLocale(saved: string | null, browser: readonly string[]): SiteLocale {
  const supported = (v: string): v is SiteLocale => (SUPPORTED_LOCALES as readonly string[]).includes(v)
  if (saved && supported(saved)) return saved
  for (const tag of browser) {
    const primary = tag.toLowerCase().split('-')[0] ?? ''
    if (supported(primary)) return primary
  }
  return SUPPORTED_LOCALES[0]
}
