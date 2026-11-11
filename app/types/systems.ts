import type { PlanetRender } from '~/engine/presets'

export type ContentLocale = 'fr' | 'en'
/** Text in every content locale. A missing translation is a type error, not a runtime surprise. */
export type Localized = Record<ContentLocale, string>

export interface Source {
  label: string
  url: string
}

export interface StarFacts {
  name: string | Localized
  spectralType: string
  /** Solar masses. */
  massSun: number
  /** Solar radii. */
  radiusSun: number
  /** Effective temperature, kelvin. Drives the star colour on screen. */
  temperatureK: number
  /** Billions of years. */
  ageGyr?: number
  description?: Localized
}

/**
 * Measured (or computed, for generated systems) planet data. Every field is optional except the orbit:
 * the panel only shows what is known, and never fills a gap with a guess.
 */
export interface PlanetFacts {
  radiusKm?: number
  /** Earth radii; used when the source does not give kilometres. */
  radiusEarth?: number
  /** Earth masses. */
  massEarth?: number
  /** True when only a minimum mass is known (radial-velocity detections). */
  massIsMinimum?: boolean
  /** True for model estimates rather than measurements. */
  massIsEstimate?: boolean
  semiMajorAxisAU: number
  periodDays: number
  eccentricity?: number
  /** Hours from noon to noon. */
  dayHours?: number
  /** m/s². */
  gravity?: number
  /** Mean temperature in °C (Solar System) or equilibrium temperature in K (exoplanets). */
  meanTempC?: number
  equilibriumTempK?: number
  moons?: number
  /** Degrees. */
  obliquityDeg?: number
  discoveryYear?: number
}

/** A natural satellite. Real values from JPL SSD (mean radius, mean orbital elements). */
export interface MoonData {
  id: string
  name: string | Localized
  radiusKm: number
  semiMajorAxisKm: number
  periodDays: number
  /** Orbits against its planet's rotation (Triton). */
  retrograde?: boolean
  /** Equirectangular colour map URL when a public-domain one exists. */
  texture?: string
  /** Base colour of the procedural surface (and of 2D thumbnails). */
  color: string
  /** One dark hemisphere (Iapetus). */
  twoTone?: boolean
  /** Opaque atmosphere hides the surface (Titan): drawn as a soft haze instead of a cratered regolith. */
  hazy?: boolean
  /** Gravitational parameter GM, km³/s² (JPL). Mass and surface gravity are derived from it. */
  gmKm3s2?: number
  /** Mean density, g/cm³. Used for the mass when GM is unknown (generated moons). */
  densityGcm3?: number
  discoveryYear?: number
  discoveredBy?: string
  description?: Localized
}

export interface SystemPlanet {
  id: string
  /** Plain string for catalogue designations; Localized when the name is translated (Terre / Earth). */
  name: string | Localized
  /** Short classification, e.g. "Rocky planet". */
  kind: Localized
  /** Omitted when there is nothing to say beyond the facts (the appearance note still shows). */
  description?: Localized
  facts: PlanetFacts
  render: PlanetRender
  /** Major moons only, inner to outer. `facts.moons` keeps the full known count. */
  moons?: MoonData[]
  /** Representative colour for 2D views (catalogue thumbnails). Derived from the palette when omitted. */
  swatch?: string
  /** 'texture' = real map; 'artistic' = surface unknown, procedural impression only. */
  appearance: 'texture' | 'procedural' | 'artistic'
}

export interface PlanetarySystem {
  id: string
  name: string | Localized
  kind: 'real' | 'generated'
  /** Light-years from the Sun; 0 for the Solar System. */
  distanceLy: number
  summary: Localized
  star: StarFacts
  planets: SystemPlanet[]
  sources: Source[]
}
