import type { ContentLocale, Localized } from '~/types/systems'

/**
 * Resolves content written in several locales (data files) to the active locale, and formats numbers for it.
 * UI wording goes through `t()`; content goes through `tl()`.
 */
export function useLocalized() {
  const { locale } = useI18n()
  const tl = (value: string | Localized): string =>
    typeof value === 'string' ? value : value[locale.value as ContentLocale]
  /** Locale-aware number: "1 234,5" in French, "1,234.5" in English. */
  const num = (value: number, maxDigits = 2): string =>
    new Intl.NumberFormat(locale.value, { maximumFractionDigits: maxDigits }).format(value)
  return { tl, num, locale }
}
