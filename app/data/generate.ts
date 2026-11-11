import { mulberry32 } from '~/engine/core/random'
import type { Palette, PlanetType } from '~/engine/presets'
import type { MoonData, PlanetarySystem, SystemPlanet } from '~/types/systems'

/**
 * Procedural planetary systems. Deterministic: a seed always gives the same system, so a generated system
 * has a stable URL (/systems/gen-1234) and can be shared.
 *
 * The physics is deliberately simple but consistent: Kepler's third law for periods, equilibrium temperature
 * from stellar luminosity, rocky planets inside the snow line and giants mostly beyond it.
 */

export const GENERATED_PREFIX = 'gen-'
/** Seeds shown in the index. Change them to feature other systems. */
export const FEATURED_SEEDS = [1729, 4096, 8128, 31415]
/** Largest accepted seed: keeps URLs short. */
export const MAX_SEED = 99999

interface StarClass {
  spectral: string
  temp: [number, number]
  radius: [number, number]
  mass: [number, number]
  /** Plausible age range in billions of years; hot stars burn out sooner, so their range is younger. */
  age: [number, number]
  label: { fr: string; en: string }
}

/** Main-sequence ranges per class (approximate textbook values). Weights favour common red dwarfs a little. */
const STAR_CLASSES: { weight: number; c: StarClass }[] = [
  { weight: 3, c: { spectral: 'M', temp: [2700, 3800], radius: [0.15, 0.6], mass: [0.12, 0.6], age: [0.5, 11], label: { fr: 'naine rouge', en: 'red dwarf' } } },
  { weight: 2, c: { spectral: 'K', temp: [3900, 5200], radius: [0.7, 0.9], mass: [0.6, 0.85], age: [0.5, 11], label: { fr: 'naine orange', en: 'orange dwarf' } } },
  { weight: 2, c: { spectral: 'G', temp: [5300, 6000], radius: [0.9, 1.15], mass: [0.85, 1.1], age: [0.5, 9], label: { fr: 'naine jaune', en: 'yellow dwarf' } } },
  { weight: 1, c: { spectral: 'F', temp: [6100, 7200], radius: [1.15, 1.6], mass: [1.1, 1.5], age: [0.3, 3], label: { fr: 'étoile blanc-jaune', en: 'yellow-white star' } } },
]

/** Bond albedo used for equilibrium temperatures. 0.3 is roughly Earth's. */
const ALBEDO = 0.3
/** Radius of the Sun in AU, for the equilibrium-temperature formula. */
const SUN_RADIUS_AU = 0.00465
/** Below this equilibrium temperature, ices condense: giants become likely. */
const SNOW_LINE_K = 170
const LETTERS = 'bcdefghij'
const ROMAN = ['I', 'II', 'III', 'IV', 'V']
/** Gravitational constant (m³ kg⁻¹ s⁻²), Earth mass (kg) and radius (km), for moon periods via Kepler's third law. */
const G = 6.674e-11
const EARTH_MASS_KG = 5.972e24
const EARTH_RADIUS_KM = 6371
/** Moon colours: regolith greys, water ice, sulphur-tinged and tholin-tinged surfaces. */
/**
 * Generated moon density range, g/cm³: icy moons sit near 1 (Mimas 1.15), rocky ones near 3.5 (Io 3.53).
 * Larger moons lean rocky, as in the Solar System. Widening the range makes some masses implausible.
 */
const MOON_DENSITY_MIN = 1.1
const MOON_DENSITY_MAX = 3.5
/** Radius (km) above which a generated moon is drawn from the rocky half of the density range. */
const MOON_ROCKY_RADIUS_KM = 1200
const MOON_COLORS = ['#9a9690', '#c9c6c0', '#e8ecef', '#8f857c', '#cdbfa8', '#b9a07a', '#d9c7bf', '#6f6c69']

const ICE_GIANT: Palette = ['#7fb4c9', '#6aa0b8', '#9cc9da', '#5a8ea8', '#7fb0c4', '#3f6f8a']
const WARM_GIANT: Palette = ['#c9ad86', '#8d5a3a', '#e6dac2', '#6b4430', '#b38c63', '#a8452f']

export function isGeneratedId(id: string): boolean {
  return id.startsWith(GENERATED_PREFIX) && seedFromId(id) !== null
}

export function seedFromId(id: string): number | null {
  const n = Number(id.slice(GENERATED_PREFIX.length))
  return Number.isInteger(n) && n >= 0 && n <= MAX_SEED ? n : null
}

export function generateSystem(seed: number): PlanetarySystem {
  const rnd = mulberry32(seed * 2654435761)
  const range = ([a, b]: [number, number]) => a + (b - a) * rnd()
  const pick = <T>(items: { weight: number; c: T }[]): T => {
    const total = items.reduce((s, i) => s + i.weight, 0)
    let x = rnd() * total
    for (const i of items) { if ((x -= i.weight) <= 0) return i.c }
    return items[items.length - 1]!.c
  }

  const cls = pick(STAR_CLASSES)
  const temperatureK = Math.round(range(cls.temp))
  const radiusSun = round(range(cls.radius), 2)
  const massSun = round(range(cls.mass), 2)
  const ageGyr = round(range(cls.age), 1)
  const name = `GEN-${String(seed).padStart(4, '0')}`

  // Start where the star would heat a planet to ~900 K, then space orbits geometrically (as real systems tend to).
  const teq = (a: number) => temperatureK * Math.sqrt((radiusSun * SUN_RADIUS_AU) / (2 * a)) * Math.pow(1 - ALBEDO, 0.25)
  let a = (radiusSun * SUN_RADIUS_AU / 2) * Math.pow((temperatureK * Math.pow(1 - ALBEDO, 0.25)) / 900, 2)
  const count = 3 + Math.floor(rnd() * 6)
  const planets: SystemPlanet[] = []

  for (let i = 0; i < count; i++) {
    const t = teq(a)
    const giant = t < SNOW_LINE_K ? rnd() < 0.65 : rnd() < 0.08
    let type: PlanetType
    let massEarth: number
    let radiusEarth: number
    let palette: Palette | undefined
    let kind: { fr: string; en: string }
    if (giant) {
      const ice = rnd() < 0.45
      massEarth = ice ? range([10, 25]) : range([40, 900])
      // Giants barely grow in radius with mass (electron degeneracy): ~4 R⊕ for ice giants, ~11 R⊕ for gas giants.
      radiusEarth = ice ? range([3.5, 4.2]) : range([9, 12.5])
      type = 'gas'
      palette = ice ? ICE_GIANT : WARM_GIANT
      kind = ice ? { fr: 'Géante de glace', en: 'Ice giant' } : { fr: 'Géante gazeuse', en: 'Gas giant' }
    } else {
      massEarth = range([0.1, 6])
      // Rocky mass–radius relation, R ≈ M^0.27 (valid roughly below 2 R⊕).
      radiusEarth = Math.pow(massEarth, 0.27)
      type = t > 400 ? 'arid' : t > 240 ? 'ocean' : t > 190 ? 'arid' : 'ice'
      kind = massEarth > 2 ? { fr: 'Super-Terre', en: 'Super-Earth' } : { fr: 'Planète rocheuse', en: 'Rocky planet' }
    }
    // Kepler's third law: P² = a³ / M, P in years, a in AU, M in solar masses.
    const periodDays = Math.sqrt((a * a * a) / massSun) * 365.25
    const letter = LETTERS[i] ?? String(i)
    // Moons draw from their own generator: adding them must not change the planets of existing seeds.
    const moons = makeMoons(mulberry32(seed * 7919 + i * 104729), `${name} ${letter}`, giant, massEarth, radiusEarth)
    planets.push({
      id: letter,
      name: `${name} ${letter}`,
      kind,
      description: {
        fr: 'Planète fictive, générée à partir de la graine du système.',
        en: 'Fictional planet, generated from the system seed.',
      },
      facts: {
        massEarth: round(massEarth, 2), radiusEarth: round(radiusEarth, 2), semiMajorAxisAU: round(a, 3),
        periodDays: round(periodDays, periodDays < 100 ? 2 : 0), eccentricity: round(rnd() * 0.12, 3),
        equilibriumTempK: Math.round(t), moons: moons.length,
      },
      moons,
      render: {
        type, seed: seed * 10 + i, rings: type === 'gas' && rnd() < 0.35,
        ...(palette ? { palette } : {}),
        ...(type === 'arid' && t > 600 ? { atmosphere: null } : {}),
      },
      appearance: 'procedural',
    })
    a *= 1.45 + rnd() * 0.75
  }

  return {
    id: GENERATED_PREFIX + seed,
    name,
    kind: 'generated',
    distanceLy: 0,
    summary: {
      fr: `Système fictif autour d'une étoile de type ${cls.spectral}, généré à partir de la graine ${seed}.`,
      en: `Fictional system around a ${cls.spectral}-type star, generated from seed ${seed}.`,
    },
    star: {
      name, spectralType: `${cls.spectral}V`, massSun, radiusSun, temperatureK, ageGyr,
      description: {
        fr: `Étoile fictive : une ${cls.label.fr} de la séquence principale, générée avec le système.`,
        en: `Fictional star: a main-sequence ${cls.label.en}, generated with the system.`,
      },
    },
    planets,
    sources: [],
  }
}

/**
 * Fictional moons: giants get one to four, rocky planets above half an Earth mass sometimes one.
 * Orbits are spaced outwards and periods follow from the planet's mass, so the numbers stay consistent.
 */
function makeMoons(rnd: () => number, planetName: string, giant: boolean, massEarth: number, radiusEarth: number): MoonData[] {
  const count = giant ? 1 + Math.floor(rnd() * 4) : massEarth > 0.5 && rnd() < 0.3 ? 1 : 0
  const rpKm = radiusEarth * EARTH_RADIUS_KM
  const moons: MoonData[] = []
  // Start a few planet radii out (inside that, tides would tear a moon apart: the Roche limit).
  let aRel = giant ? 4 + rnd() * 3 : 10 + rnd() * 20
  for (let i = 0; i < count; i++) {
    const radiusKm = Math.round(giant ? 150 + rnd() * 2400 : Math.min(300 + rnd() * 1500, rpKm * 0.3))
    const aKm = aRel * rpKm
    const seconds = 2 * Math.PI * Math.sqrt(Math.pow(aKm * 1000, 3) / (G * massEarth * EARTH_MASS_KG))
    moons.push({
      id: `m${i + 1}`,
      name: `${planetName} ${ROMAN[i]}`,
      radiusKm,
      semiMajorAxisKm: Math.round(aKm),
      periodDays: round(seconds / 86400, 3),
      color: MOON_COLORS[Math.floor(rnd() * MOON_COLORS.length)]!,
      densityGcm3: moonDensity(radiusKm, i),
      description: {
        fr: 'Lune fictive, générée avec sa planète ; sa masse découle de sa taille et de sa densité.',
        en: 'Fictional moon, generated with its planet; its mass follows from its size and density.',
      },
    })
    aRel *= 1.5 + rnd() * 0.9
  }
  return moons
}

function round(v: number, digits: number): number {
  const f = Math.pow(10, digits)
  return Math.round(v * f) / f
}

/**
 * Density for a generated moon. Uses its own PRNG keyed on the moon (not the moon stream): adding this field
 * must not shift the radii and orbits of moons that featured systems already show.
 */
function moonDensity(radiusKm: number, index: number): number {
  const r = mulberry32(radiusKm * 977 + index * 31)()
  const mid = (MOON_DENSITY_MIN + MOON_DENSITY_MAX) / 2
  const [lo, hi] = radiusKm > MOON_ROCKY_RADIUS_KM ? [mid, MOON_DENSITY_MAX] : [MOON_DENSITY_MIN, mid + 0.4]
  return Math.round((lo + r * (hi - lo)) * 100) / 100
}
