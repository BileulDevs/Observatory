import type { ObjectFact, ObjectRender } from '~/types/objects'
import { schwarzschild } from './objects/common'

/**
 * The object creator: for each type, the controls offered and the physics that turns their values into a
 * render description and a fact sheet. Simple textbook relations, chosen so that every control visibly
 * changes the object the way it would in nature (a faster pulsar spins faster, a lighter black hole has a
 * hotter disk, oxygen turns a nebula teal...). Labels live in i18n under `creator.params.<type>.<key>`.
 */

export const CREATOR_TYPES = ['black-hole', 'pulsar', 'nebula', 'star'] as const
export type CreatorType = (typeof CREATOR_TYPES)[number]

export type ParamValue = number | string | boolean
export type ParamValues = Record<string, ParamValue>

/** One control. `log` sliders move by orders of magnitude. `when` hides a control that does not apply. */
export type ParamSpec =
  | { key: string; control: 'range'; min: number; max: number; step: number; default: number; when?: (v: ParamValues) => boolean }
  | { key: string; control: 'log'; min: number; max: number; default: number; when?: (v: ParamValues) => boolean }
  | { key: string; control: 'select'; options: readonly string[]; default: string; when?: (v: ParamValues) => boolean }
  | { key: string; control: 'toggle'; default: boolean; when?: (v: ParamValues) => boolean }
  | { key: string; control: 'color'; default: string; when?: (v: ParamValues) => boolean }

export interface CreatorKind {
  params: ParamSpec[]
  derive: (v: ParamValues) => { render: ObjectRender; facts: ObjectFact[] }
}

// --- physical constants and helpers ---------------------------------------------------------------------------

/** Sun's effective temperature, K. */
const T_SUN = 5772
/** Eddington luminosity per solar mass, in solar luminosities (hydrogen, electron scattering). */
const L_EDD_PER_MSUN = 3.2e4
/** Hawking temperature of a one-solar-mass black hole, K (scales as 1/M). */
const HAWKING_T_SUN = 6.17e-8
/** Hawking evaporation time of a one-solar-mass black hole, years (scales as M³). */
const HAWKING_LIFE_SUN = 2.1e67
/** Neutron star: radius (km) and moment of inertia (g cm²) of the canonical 1.4 M☉ model. */
const NS_RADIUS_KM = 12
const NS_INERTIA = 1e45
/** Magnetic dipole spin-down: B = 3.2 × 10¹⁹ √(P Ṗ) gauss. */
const DIPOLE_K = 3.2e19
const C_KMS = 299_792.458
const L_SUN_ERG = 3.828e33
const SECONDS_PER_YEAR = 3.156e7
/** Fastest pulsar known, PSR J1748−2446ad: 716 Hz. Below this period the creator says you beat it. */
const FASTEST_PERIOD_S = 1 / 716
/** Above this field a neutron star is a magnetar (gauss). */
const MAGNETAR_FIELD = 1e14

const num = (v: ParamValue | undefined) => Number(v)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Innermost stable circular orbit of a Kerr black hole (prograde), in gravitational radii GM/c² (Bardeen 1972). */
function iscoGravitational(a: number): number {
  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a))
  const z2 = Math.sqrt(3 * a * a + z1 * z1)
  return 3 + z2 - Math.sqrt((3 - z1) * (3 + 2 * z1 - z2))
}

/** sRGB hex of an emission line colour, blended in linear light by weight. */
function blend(colors: [string, number][]): string {
  let r = 0, g = 0, b = 0, w = 0
  for (const [hex, k] of colors) {
    const n = parseInt(hex.slice(1), 16)
    const lin = (c: number) => (c / 255) ** 2.2
    r += lin((n >> 16) & 255) * k; g += lin((n >> 8) & 255) * k; b += lin(n & 255) * k; w += k
  }
  if (w <= 0) return '#808080'
  const out = (c: number) => Math.round(clamp((c / w) ** (1 / 2.2), 0, 1) * 255)
  // Renormalise brightness: a blend should be as bright as its parts, not a muddy average.
  const m = Math.max(r, g, b) / w
  const s = m > 0 ? 0.85 / m : 1
  return `#${[r, g, b].map((c) => out(c * s).toString(16).padStart(2, '0')).join('')}`
}

/** Spectral class letter from an effective temperature. */
function spectralClass(t: number): string {
  return t >= 30000 ? 'O' : t >= 10000 ? 'B' : t >= 7500 ? 'A' : t >= 6000 ? 'F' : t >= 5200 ? 'G' : t >= 3700 ? 'K' : 'M'
}

// --- black hole --------------------------------------------------------------------------------------------------

const blackHole: CreatorKind = {
  params: [
    { key: 'mass', control: 'log', min: 3, max: 1e11, default: 4.3e6 },
    { key: 'accretion', control: 'range', min: 0, max: 100, step: 1, default: 10 },
    { key: 'spin', control: 'range', min: 0, max: 0.998, step: 0.001, default: 0.5 },
    { key: 'diskSize', control: 'range', min: 5, max: 16, step: 0.5, default: 9 },
    { key: 'jets', control: 'toggle', default: false },
    { key: 'jetColor', control: 'color', default: '#8fb4ff', when: (v) => v.jets === true },
  ],
  derive(v) {
    const m = num(v.mass), edd = num(v.accretion) / 100, a = num(v.spin)
    const isco = iscoGravitational(a)
    // Peak disk temperature (Shakura–Sunyaev): ∝ (Ṁ/Ṁ_Edd)^¼ M^-¼, higher when the disk reaches closer in.
    const tPeak = 6.3e5 * Math.max(edd, 1e-4) ** 0.25 * (m / 1e8) ** -0.25 * (6 / isco) ** 0.75
    // The physical peak is in X-rays for small holes: map its log onto the visible range for the picture.
    const tVisual = clamp(2800 + 3200 * Math.log10(tPeak / 1e4), 2800, 30000)
    const render: ObjectRender = {
      kind: 'black-hole',
      diskTemperatureK: tVisual,
      diskIntensity: edd <= 0 ? 0.03 : lerp(0.15, 2.4, Math.sqrt(edd)),
      diskOuter: num(v.diskSize),
      // ISCO in Schwarzschild radii (half the gravitational radius count).
      diskInner: isco / 2,
      tiltDeg: 14,
      // Blandford–Znajek: jet power grows with the square of the spin.
      jets: v.jets ? { intensity: 0.15 + 0.85 * a * a, color: String(v.jetColor) } : undefined,
      seed: 7,
    }
    const facts: ObjectFact[] = [
      { key: 'mass', value: m, unit: 'msun', digits: 2 },
      schwarzschild(m),
      { key: 'isco', value: isco / 2, digits: 2, derived: true, note: { fr: 'rayons de l\'horizon (Schwarzschild)', en: 'horizon radii (Schwarzschild)' } },
      { key: 'diskPeakTemperature', value: tPeak, unit: 'k', qualifier: '≈', derived: true },
      { key: 'luminosity', value: edd * L_EDD_PER_MSUN * m, unit: 'lsun', qualifier: '≈', derived: true },
      { key: 'hawkingTemperature', value: HAWKING_T_SUN / m, unit: 'k', sci: true, derived: true },
      { key: 'evaporation', value: HAWKING_LIFE_SUN * m ** 3, unit: 'years', sci: true, derived: true },
    ]
    return { render, facts }
  },
}

// --- pulsar ------------------------------------------------------------------------------------------------------

const pulsar: CreatorKind = {
  params: [
    { key: 'period', control: 'log', min: 0.001, max: 12, default: 0.0334 },
    { key: 'field', control: 'log', min: 1e8, max: 1e15, default: 3.8e12 },
    { key: 'inclination', control: 'range', min: 0, max: 90, step: 1, default: 45 },
    { key: 'beamColor', control: 'color', default: '#9ec8ff' },
    { key: 'windNebula', control: 'toggle', default: true },
    { key: 'nebulaColor', control: 'color', default: '#7fd0ff', when: (v) => v.windNebula === true },
  ],
  derive(v) {
    const p = num(v.period), b = num(v.field)
    // Magnetic dipole braking: Ṗ from B and P, then spin-down power and characteristic age.
    const pDot = (b / DIPOLE_K) ** 2 / p
    const eDot = (4 * Math.PI ** 2 * NS_INERTIA * pDot) / p ** 3
    const age = p / (2 * pDot) / SECONDS_PER_YEAR
    const vEq = (2 * Math.PI * NS_RADIUS_KM) / p
    const render: ObjectRender = {
      kind: 'neutron-star',
      periodS: p,
      magneticTiltDeg: num(v.inclination),
      beamColor: String(v.beamColor),
      magnetar: b >= MAGNETAR_FIELD,
      windNebula: v.windNebula ? { color: String(v.nebulaColor) } : undefined,
      seed: 11,
    }
    const facts: ObjectFact[] = [
      { key: 'period', value: p, unit: 's', digits: p < 0.01 ? 4 : 3 },
      { key: 'frequency', value: 1 / p, unit: 'hz', digits: 1, derived: true, note: p < FASTEST_PERIOD_S ? { fr: 'plus rapide que le record, 716 Hz', en: 'faster than the 716 Hz record' } : undefined },
      { key: 'equatorSpeed', value: (vEq / C_KMS) * 100, unit: 'pct', digits: 1, derived: true, note: { fr: 'de la vitesse de la lumière', en: 'of the speed of light' } },
      { key: 'magneticField', value: b, unit: 'gauss', sci: true },
      { key: 'type', text: b >= MAGNETAR_FIELD ? { fr: 'magnétar', en: 'magnetar' } : { fr: 'pulsar', en: 'pulsar' } },
      { key: 'spinDownPower', value: eDot / L_SUN_ERG, unit: 'lsun', qualifier: '≈', derived: true },
      { key: 'characteristicAge', value: age, unit: 'years', qualifier: '≈', derived: true },
    ]
    return { render, facts }
  },
}

// --- nebula ------------------------------------------------------------------------------------------------------

/**
 * Emission lines, as seen by eye (sRGB): hydrogen-alpha 656 nm red, doubly ionised oxygen 501 nm teal, ionised
 * sulfur 672 nm deep red, ionised nitrogen 658 nm orange-red, neutral helium 588 nm yellow.
 */
const LINES = {
  hydrogen: { color: '#ff3b2f', nm: 656 },
  oxygen: { color: '#2fe6c8', nm: 501 },
  sulfur: { color: '#b3122e', nm: 672 },
  nitrogen: { color: '#ff6a3d', nm: 658 },
  helium: { color: '#ffd94a', nm: 588 },
} as const
type Line = keyof typeof LINES

const nebula: CreatorKind = {
  params: [
    { key: 'shape', control: 'select', options: ['emission', 'ring', 'helix', 'remnant', 'pillars', 'complex'], default: 'emission' },
    { key: 'hydrogen', control: 'range', min: 0, max: 100, step: 1, default: 70 },
    { key: 'oxygen', control: 'range', min: 0, max: 100, step: 1, default: 15 },
    { key: 'sulfur', control: 'range', min: 0, max: 100, step: 1, default: 5 },
    { key: 'nitrogen', control: 'range', min: 0, max: 100, step: 1, default: 5 },
    { key: 'helium', control: 'range', min: 0, max: 100, step: 1, default: 5 },
    { key: 'variant', control: 'range', min: 1, max: 99, step: 1, default: 17 },
  ],
  derive(v) {
    const lines = (Object.keys(LINES) as Line[]).map((k) => [k, Math.max(0, num(v[k]))] as const)
    const total = lines.reduce((s, [, w]) => s + w, 0) || 1
    const sorted = [...lines].sort((x, y) => y[1] - x[1])
    const first = sorted[0]!
    // The renderers' palette slots follow ionisation, as in the catalogue: [low-ionisation gas (H, N, S, red),
    // high-ionisation gas near the hot stars (O, He, teal), highlight]. Each slot leans towards the overall mix
    // as its own elements get scarcer, so a nebula with 90 % oxygen comes out teal everywhere.
    const all = blend(lines.map(([k, w]) => [LINES[k].color, w]))
    const weightOf = (ks: Line[]) => ks.reduce((s, k) => s + Math.max(0, num(v[k])), 0)
    const slot = (ks: Line[]) => {
      const w = weightOf(ks)
      if (w <= 0) return all
      return blend([[blend(ks.map((k) => [LINES[k].color, Math.max(0, num(v[k]))])), w / total], [all, 1 - w / total]])
    }
    const low = slot(['hydrogen', 'nitrogen', 'sulfur'])
    const high = slot(['oxygen', 'helium'])
    const highlight = blend([[all, 0.35], ['#ffffff', 0.65]])
    const dominant = all
    const render: ObjectRender = {
      kind: 'nebula',
      shape: String(v.shape) as Extract<ObjectRender, { kind: 'nebula' }>['shape'],
      palette: [low, high, highlight],
      seed: num(v.variant),
    }
    const pct = (k: Line) => Math.round((Math.max(0, num(v[k])) / total) * 100)
    const facts: ObjectFact[] = [
      { key: 'dominantLine', text: { fr: `${lineName(first[0]).fr} · ${LINES[first[0]].nm} nm`, en: `${lineName(first[0]).en} · ${LINES[first[0]].nm} nm` } },
      { key: 'composition', text: (Object.keys(LINES) as Line[]).filter((k) => pct(k) > 0).map((k) => `${lineSymbol(k)} ${pct(k)} %`).join(' · ') || '—' },
      { key: 'colour', text: { fr: `dominante ${dominant}`, en: `dominant ${dominant}` } },
    ]
    return { render, facts }
  },
}

function lineName(k: Line) {
  const names: Record<Line, { fr: string; en: string }> = {
    hydrogen: { fr: 'hydrogène alpha', en: 'hydrogen-alpha' },
    oxygen: { fr: 'oxygène ionisé [O III]', en: 'ionised oxygen [O III]' },
    sulfur: { fr: 'soufre ionisé [S II]', en: 'ionised sulfur [S II]' },
    nitrogen: { fr: 'azote ionisé [N II]', en: 'ionised nitrogen [N II]' },
    helium: { fr: 'hélium', en: 'helium' },
  }
  return names[k]
}

function lineSymbol(k: Line): string {
  return { hydrogen: 'H', oxygen: 'O', sulfur: 'S', nitrogen: 'N', helium: 'He' }[k]
}

// --- star --------------------------------------------------------------------------------------------------------

/**
 * Colours of polluted white dwarfs (Hollands et al. 2026): sodium-rich debris greens them, carbon pinks them,
 * calcium-rich debris yellows them, mixed hydrogen–helium atmospheres turn them cyan.
 */
const POLLUTANTS = { none: '', sodium: '#d2ef9c', carbon: '#f39a8a', calcium: '#f2e48a', hydrogenHelium: '#9fe8f0' } as const

const star: CreatorKind = {
  params: [
    { key: 'stage', control: 'select', options: ['main-sequence', 'red-giant', 'white-dwarf'], default: 'main-sequence' },
    { key: 'mass', control: 'log', min: 0.08, max: 60, default: 1 },
    { key: 'wdTemperature', control: 'log', min: 4000, max: 60000, default: 12000, when: (v) => v.stage === 'white-dwarf' },
    { key: 'pollutant', control: 'select', options: Object.keys(POLLUTANTS), default: 'none', when: (v) => v.stage === 'white-dwarf' },
    { key: 'pollution', control: 'range', min: 0, max: 100, step: 1, default: 60, when: (v) => v.stage === 'white-dwarf' && v.pollutant !== 'none' },
    { key: 'rotation', control: 'log', min: 0.1, max: 200, default: 25 },
  ],
  derive(v) {
    const stage = String(v.stage)
    let m = num(v.mass)
    let radius: number, temp: number, lum: number
    if (stage === 'white-dwarf') {
      // A white dwarf cannot exceed the Chandrasekhar mass; heavier ones are smaller (R ∝ M^-1/3).
      m = clamp(m, 0.17, 1.4)
      radius = 0.0126 * m ** (-1 / 3)
      temp = num(v.wdTemperature)
      lum = radius ** 2 * (temp / T_SUN) ** 4
    } else if (stage === 'red-giant') {
      m = clamp(m, 0.8, 8)
      radius = 40 * m ** 0.6
      temp = lerp(3600, 4600, clamp((m - 0.8) / 7.2, 0, 1))
      lum = radius ** 2 * (temp / T_SUN) ** 4
    } else {
      // Main sequence: mass–luminosity and mass–radius relations, temperature from Stefan–Boltzmann.
      lum = m < 0.43 ? 0.23 * m ** 2.3 : m < 2 ? m ** 4 : m < 55 ? 1.4 * m ** 3.5 : 32000 * m
      radius = m < 1 ? m ** 0.8 : m ** 0.57
      temp = T_SUN * (lum / radius ** 2) ** 0.25
    }
    const rotationDays = num(v.rotation)
    // Faster rotation drives a stronger magnetic dynamo: more spots and faculae, in stars with a convective
    // envelope (cooler than ~7,000 K). Hot stars stay clean.
    const convective = temp < 7000 ? 1 : 0
    const activity = clamp(1.1 - 0.55 * Math.log10(rotationDays), 0, 1) * convective
    // Surface gravity sets the size of convection cells: giants have a few huge ones, dwarfs many tiny ones.
    const gravity = m / radius ** 2
    const granulation = clamp(gravity ** 0.18, 0.35, 3)
    const pollutant = String(v.pollutant) as keyof typeof POLLUTANTS
    let tint: string | undefined
    if (stage === 'white-dwarf' && pollutant !== 'none') {
      const k = num(v.pollution) / 100
      tint = blend([[POLLUTANTS[pollutant], k], [blackbodyHex(temp), 1 - k]])
    }
    const render: ObjectRender = {
      kind: 'star', temperatureK: temp, tint, granulation, spots: activity * 0.8, activity,
      rotationS: rotationDays * 86400, glow: stage === 'red-giant' ? 0.8 : 0.55, seed: 9,
    }
    const facts: ObjectFact[] = [
      { key: 'mass', value: m, unit: 'msun', digits: 2 },
      { key: 'radius', value: radius, unit: 'rsun', digits: radius < 0.1 ? 4 : 2, derived: true },
      { key: 'surfaceTemperature', value: temp, unit: 'k', digits: 0, derived: true },
      { key: 'luminosity', value: lum, unit: 'lsun', derived: true },
      { key: 'spectralType', text: stage === 'white-dwarf' ? { fr: 'naine blanche (D)', en: 'white dwarf (D)' } : spectralClass(temp) },
      { key: 'rotation', value: rotationDays, unit: 'days', digits: 1 },
    ]
    if (stage === 'main-sequence') facts.push({ key: 'lifetime', value: 1e10 * (m / lum), unit: 'years', qualifier: '≈', derived: true })
    return { render, facts }
  },
}

/** Black-body colour of a temperature as sRGB hex (same fit as the shaders). */
function blackbodyHex(kelvin: number): string {
  const t = clamp(kelvin, 1000, 40000) / 100
  const c01 = (v: number) => clamp(v, 0, 1)
  const r = t <= 66 ? 1 : c01(1.292936 * (t - 60) ** -0.1332048)
  const g = t <= 66 ? c01(0.3900816 * Math.log(t) - 0.6318414) : c01(1.1298909 * (t - 60) ** -0.0755148)
  const b = t >= 66 ? 1 : t <= 19 ? 0 : c01(0.5432068 * Math.log(t - 10) - 1.1962541)
  return `#${[r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`
}

export const CREATOR: Record<CreatorType, CreatorKind> = { 'black-hole': blackHole, pulsar, nebula, star }

/** Default values of a type. */
export function defaults(type: CreatorType): ParamValues {
  return Object.fromEntries(CREATOR[type].params.map((p) => [p.key, p.default]))
}

/**
 * Reads values from URL query strings, falling back to defaults and clamping to the control's range, so a
 * hand-edited or outdated link still opens a valid object.
 */
export function parseValues(type: CreatorType, query: Record<string, unknown>): ParamValues {
  const out = defaults(type)
  for (const p of CREATOR[type].params) {
    const raw = query[p.key]
    if (typeof raw !== 'string') continue
    if (p.control === 'range' || p.control === 'log') {
      const n = Number(raw)
      if (Number.isFinite(n)) out[p.key] = clamp(n, p.min, p.max)
    } else if (p.control === 'select') {
      if (p.options.includes(raw)) out[p.key] = raw
    } else if (p.control === 'toggle') {
      out[p.key] = raw === '1'
    } else if (/^#[0-9a-f]{6}$/i.test(raw)) {
      out[p.key] = raw.toLowerCase()
    }
  }
  return out
}

/** 4 significant digits; powers of ten as 3.8e12 rather than a dozen zeros in the link. */
function compactNumber(v: number): string {
  const a = Math.abs(v)
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(3).replace(/\.?0+e/, 'e').replace('e+', 'e')
  return String(Number(v.toPrecision(4)))
}

/** Writes values as compact query strings (numbers to 4 significant digits, toggles as 1/0). */
export function serializeValues(type: CreatorType, values: ParamValues): Record<string, string> {
  const out: Record<string, string> = { type }
  for (const p of CREATOR[type].params) {
    const v = values[p.key]
    if (v === undefined) continue
    out[p.key] = typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? compactNumber(v) : v
  }
  return out
}
