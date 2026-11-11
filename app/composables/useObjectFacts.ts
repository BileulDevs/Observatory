import type { ObjectFact } from '~/types/objects'
import type { FactRow } from './useFacts'

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** Values from a million up to (not including) a trillion read better in words; beyond, in powers of ten. */
const WORDS_FROM = 1e6
const SCIENTIFIC_FROM = 1e12

/**
 * Formats catalogue-object facts for the active locale: units, large numbers in words ("4,3 millions de M☉"),
 * powers of ten for the huge ones, uncertainty markers and caveats. Labels come from i18n.
 */
export function useObjectFacts() {
  const { t } = useI18n()
  const { tl, num } = useLocalized()

  function scientific(v: number, digits = 2): string {
    const exp = Math.floor(Math.log10(Math.abs(v)))
    const mantissa = v / 10 ** exp
    const sup = String(exp).split('').map((c) => (c === '-' ? '⁻' : SUPERSCRIPT[Number(c)])).join('')
    return `${num(mantissa, digits)} × 10${sup}`
  }

  /** Default precision: more digits for small values. */
  function autoDigits(v: number): number {
    const a = Math.abs(v)
    return a < 10 ? 2 : a < 100 ? 1 : 0
  }

  function value(f: Extract<ObjectFact, { value: number }>): string {
    let text: string
    let words = false
    if (f.sci || Math.abs(f.value) >= SCIENTIFIC_FROM) {
      text = scientific(f.value, f.digits ?? 2)
    } else if (Math.abs(f.value) >= WORDS_FROM) {
      const billions = Math.abs(f.value) >= 1e9
      const n = f.value / (billions ? 1e9 : 1e6)
      text = `${num(n, f.digits ?? autoDigits(n))} ${t(billions ? 'objects.big.billion' : 'objects.big.million', Math.round(n))}`
      words = true
    } else {
      text = num(f.value, f.digits ?? autoDigits(f.value))
    }
    if (f.unit) {
      // French says "4,3 millions de M☉"; English needs no joining word.
      const joined = words && t('objects.big.of') ? `${text} ${t('objects.big.of')}` : text
      text = t(`objects.units.${f.unit}`, { v: joined })
    }
    if (f.qualifier) text = `${f.qualifier} ${text}`
    if (f.note) text += ` (${tl(f.note)})`
    return text
  }

  function rows(facts: ObjectFact[]): FactRow[] {
    return facts.map((f) => {
      const label = t(`objects.facts.${f.key}`)
      if ('text' in f) return { label, value: tl(f.text) }
      return { label: f.derived ? `${label} (${t('objects.derived')})` : label, value: value(f) }
    })
  }

  return { rows }
}
