import type { ObjectFact } from '~/types/objects'
import type { Localized, Source } from '~/types/systems'

/** Wikipedia (English) article as a source. `path` is the article slug exactly as in its URL. */
export function wikipedia(title: string, path: string): Source {
  return { label: `Wikipedia — ${title}`, url: `https://en.wikipedia.org/wiki/${path}` }
}

/** Schwarzschild radius of one solar mass, km (2GM☉/c²). */
const SUN_SCHWARZSCHILD_KM = 2.95325
const KM_PER_AU = 149_597_870.7
/** Above this radius the AU reads better than kilometres. */
const AU_SWITCH_KM = 1e8

/**
 * Event-horizon radius of a non-rotating black hole of the given mass. Computed, not sourced: the fact is marked
 * as derived and inherits the uncertainty of the mass.
 */
export function schwarzschild(massSun: number): ObjectFact {
  const km = massSun * SUN_SCHWARZSCHILD_KM
  return km > AU_SWITCH_KM
    ? { key: 'schwarzschild', value: km / KM_PER_AU, unit: 'au', digits: km / KM_PER_AU < 10 ? 2 : 0, qualifier: '≈', derived: true }
    : { key: 'schwarzschild', value: km, unit: 'km', digits: 0, qualifier: '≈', derived: true }
}

/** Constellation names, French / English (IAU English names). */
export const CONSTELLATION = {
  andromeda: { fr: 'Andromède', en: 'Andromeda' },
  aquarius: { fr: 'Verseau', en: 'Aquarius' },
  bootes: { fr: 'Bouvier', en: 'Boötes' },
  canesVenatici: { fr: 'Chiens de chasse', en: 'Canes Venatici' },
  carina: { fr: 'Carène', en: 'Carina' },
  cygnus: { fr: 'Cygne', en: 'Cygnus' },
  doradoMensa: { fr: 'Dorade et Table', en: 'Dorado and Mensa' },
  lynx: { fr: 'Lynx', en: 'Lynx' },
  lyra: { fr: 'Lyre', en: 'Lyra' },
  orion: { fr: 'Orion', en: 'Orion' },
  phoenix: { fr: 'Phénix', en: 'Phoenix' },
  pictor: { fr: 'Peintre', en: 'Pictor' },
  sagittarius: { fr: 'Sagittaire', en: 'Sagittarius' },
  serpens: { fr: 'Serpent', en: 'Serpens' },
  taurus: { fr: 'Taureau', en: 'Taurus' },
  vela: { fr: 'Voiles', en: 'Vela' },
  virgo: { fr: 'Vierge', en: 'Virgo' },
  vulpecula: { fr: 'Petit Renard', en: 'Vulpecula' },
} satisfies Record<string, Localized>

/** Shorthand for a constellation fact. */
export function constellation(name: Localized): ObjectFact {
  return { key: 'constellation', text: name }
}
