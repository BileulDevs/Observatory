import { STAR_NOTES } from '~/data/starNotes'
import type { ConstellationStar } from '~/types/constellations'
import type { ObjectFact } from '~/types/objects'
import type { Localized, Source } from '~/types/systems'
import { lightDepartureYear } from '~/utils/astro'

/** Everything the star sheet shows, from the catalogue entry and, for well-known stars, the hand-written note. */
export interface StarSheet {
  title: string
  aka: Localized | null
  facts: ObjectFact[]
  description: Localized
  source: Source | null
}

/**
 * Builds a star's sheet. Measured values from the notes are shown as such; values computed from the
 * catalogue (temperature from colour, radius from luminosity and temperature, main-sequence mass) are marked
 * "computed".
 */
export function useStarSheet() {
  const { t } = useI18n()
  const { num } = useLocalized()

  function sheet(s: ConstellationStar, constellation: Localized): StarSheet {
    const note = STAR_NOTES[s.hip]
    const facts: ObjectFact[] = [
      { key: 'designation', text: s.designation },
      { key: 'constellation', text: constellation },
    ]
    if (s.distLy !== null) {
      facts.push({ key: 'distance', value: s.distLy, unit: 'ly', digits: s.distLy < 100 ? 1 : 0 })
      const y = lightDepartureYear(s.distLy)
      facts.push({ key: 'lightLeft', text: y > 0 ? { fr: `vers ${y}`, en: `around ${y}` } : { fr: `vers ${-y} av. J.-C.`, en: `around ${-y} BC` } })
    } else {
      facts.push({ key: 'distance', text: { fr: 'inconnue (parallaxe trop faible)', en: 'unknown (parallax too small)' } })
    }
    facts.push({ key: 'magnitude', value: s.mag, digits: 2 })
    facts.push({ key: 'absoluteMagnitude', value: s.absmag, digits: 2 })
    const spect = note?.spect ?? s.spect
    if (spect) facts.push({ key: 'spectralType', text: spect })
    if (s.temp) facts.push({ key: 'surfaceTemperature', value: Math.round(s.temp / 10) * 10, unit: 'k', qualifier: '≈', derived: true })
    if (s.distLy !== null) facts.push({ key: 'luminosity', value: s.lum, unit: 'lsun', digits: s.lum < 10 ? 2 : 0 })
    if (note?.radius) facts.push({ key: 'radius', value: note.radius, unit: 'rsun', digits: note.radius < 10 ? 2 : 0 })
    else if (s.radius) facts.push({ key: 'radius', value: s.radius, unit: 'rsun', digits: s.radius < 10 ? 2 : 0, qualifier: '≈', derived: true })
    if (note?.mass) facts.push({ key: 'mass', value: note.mass, unit: 'msun', digits: 2 })
    else if (s.mass) facts.push({ key: 'mass', value: s.mass, unit: 'msun', digits: 2, qualifier: '≈', derived: true })
    return {
      title: s.name ?? s.designation,
      aka: note?.aka ?? null,
      facts,
      description: note?.description ?? generated(s, spect),
      source: note?.source ?? null,
    }
  }

  /**
   * A factual one-paragraph description from the catalogue values: kind of star (from the luminosity class and
   * temperature), how it compares with the Sun, and its distance.
   */
  function generated(s: ConstellationStar, spect: string | null): Localized {
    const kind = kindOf(spect, s.temp)
    const lum = s.distLy !== null && s.lum > 0
    const ratio = lum ? (s.lum >= 1 ? s.lum : 1 / s.lum) : 0
    const frLum = !lum ? '' : s.lum >= 1.5
      ? ` Elle est environ ${num(round(ratio), 0)} fois plus lumineuse que le Soleil.`
      : s.lum <= 0.67 ? ` Elle est environ ${num(round(ratio), 0)} fois moins lumineuse que le Soleil.` : ' Elle brille à peu près autant que le Soleil.'
    const enLum = !lum ? '' : s.lum >= 1.5
      ? ` It is about ${round(ratio).toLocaleString('en')} times as luminous as the Sun.`
      : s.lum <= 0.67 ? ` It is about ${round(ratio).toLocaleString('en')} times fainter than the Sun.` : ' It shines about as brightly as the Sun.'
    const frD = s.distLy !== null ? ` Sa lumière met environ ${num(Math.round(s.distLy), 0)} ans à nous parvenir.` : ''
    const enD = s.distLy !== null ? ` Its light takes about ${Math.round(s.distLy).toLocaleString('en')} years to reach us.` : ''
    return {
      fr: `${kind.fr}${spect ? ` de type spectral ${spect}` : ''}.${frLum}${frD}`,
      en: `${kind.en}${spect ? ` of spectral type ${spect}` : ''}.${enLum}${enD}`,
    }
  }

  return { sheet, t }
}

/** Rounds to 2 significant digits: "about 13,000 times", not "about 13,415 times". */
function round(v: number): number {
  if (v < 10) return Math.round(v)
  const p = 10 ** (Math.floor(Math.log10(v)) - 1)
  return Math.round(v / p) * p
}

/** Kind of star from the luminosity class in the spectral type, and its colour from the temperature. */
function kindOf(spect: string | null, temp: number | null): Localized {
  const sp = spect ?? ''
  const colour = temp === null ? null : temp >= 10000 ? ['bleue', 'blue'] : temp >= 7500 ? ['blanche', 'white']
    : temp >= 6000 ? ['jaune-blanc', 'yellow-white'] : temp >= 5200 ? ['jaune', 'yellow'] : temp >= 3700 ? ['orange', 'orange'] : ['rouge', 'red']
  const cls = /Ia|Ib|(^|[^I])I([^IV]|$)/.test(sp) ? 'super' : /II|III/.test(sp) ? 'giant' : /IV/.test(sp) ? 'sub' : /V/.test(sp) ? 'dwarf' : null
  const fr = { super: 'Supergéante', giant: 'Géante', sub: 'Sous-géante', dwarf: 'Étoile de la séquence principale' }
  const en = { super: 'supergiant', giant: 'giant', sub: 'subgiant', dwarf: 'main-sequence star' }
  // English article from the first word: "an orange giant", "a blue supergiant".
  const an = (words: string) => `${/^[aeiou]/i.test(words) ? 'An' : 'A'} ${words}`
  if (!cls) return colour ? { fr: `Étoile ${colour[0]}`, en: an(`${colour[1]} star`) } : { fr: 'Étoile', en: 'A star' }
  if (!colour) return { fr: fr[cls], en: an(en[cls]) }
  return { fr: `${fr[cls]} ${colour[0]}`, en: an(`${colour[1]} ${en[cls]}`) }
}
