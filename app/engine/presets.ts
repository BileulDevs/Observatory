/**
 * Art direction data for procedural planets: planet classes, palettes and art styles.
 * Pure data, no Three.js objects, so it can be imported anywhere (including content files) without pulling the engine.
 */

/** Planet class. The numeric value is the `uType` the shaders switch on: do not reorder. */
export const PLANET_TYPES = ['ocean', 'arid', 'gas', 'ice'] as const
export type PlanetType = (typeof PLANET_TYPES)[number]

/** Art style. Switching style only changes uniforms, never triggers a re-bake. */
export const ART_STYLES = ['natural', 'carto', 'nocturne'] as const
export type ArtStyle = (typeof ART_STYLES)[number]

/** What content files use to describe a planet: deterministic from type + seed. */
export interface PlanetSpec {
  type: PlanetType
  seed: number
}

/** Atmosphere coefficients, in planet-radius units (see the atmosphere shader). */
export interface AtmosphereParams {
  /** Shell thickness relative to the planet radius. Above ~0.08 the planet starts to look wrapped in fog. */
  thick: number
  /** Rayleigh coefficients per channel: their ratio sets the sky colour. */
  kR: [number, number, number]
  /** Mie coefficients per channel: dust/haze, mostly visible as a forward glow around the sun side. */
  kM: [number, number, number]
  /** Mie anisotropy. Closer to 1 = tighter forward glow. */
  g: number
}

/** Per-class constants consumed by Planet. */
export interface PlanetTypeParams {
  /** Axial tilt in radians. Rings need a visible tilt or they collapse into a line. */
  tilt: number
  /** Normal strength from the baked gradient. Doubling it roughly doubles apparent relief at grazing light. */
  bump: number
  /** Sea level in baked height units; a large negative value disables water. */
  sea: number
  /** Contour lines per height unit for the cartographic overlay. */
  contour: number
  clouds: boolean
  rings: boolean
  /** Exposure multiplier: bright bodies (ice, gas) would otherwise clip under ACES. */
  exposure: number
  atmo: AtmosphereParams
}

export const TYPE_PARAMS: Record<PlanetType, PlanetTypeParams> = {
  ocean: {
    tilt: 0.41, bump: 0.035, sea: 0.035, contour: 22, clouds: true, rings: false, exposure: 1,
    atmo: { thick: 0.05, kR: [5.5, 13.0, 22.4], kM: [3.0, 3.0, 3.0], g: 0.76 },
  },
  arid: {
    tilt: 0.44, bump: 0.05, sea: -9, contour: 34, clouds: false, rings: false, exposure: 1,
    atmo: { thick: 0.032, kR: [2.2, 2.9, 4.2], kM: [7.0, 4.4, 2.6], g: 0.6 },
  },
  gas: {
    tilt: 0.47, bump: 0, sea: -9, contour: 0, clouds: false, rings: true, exposure: 0.8,
    atmo: { thick: 0.05, kR: [5.0, 4.6, 4.2], kM: [2.0, 1.8, 1.5], g: 0.7 },
  },
  ice: {
    tilt: 0.08, bump: 0.06, sea: -9, contour: 90, clouds: false, rings: false, exposure: 0.72,
    atmo: { thick: 0.022, kR: [3.0, 5.6, 10.5], kM: [1.0, 1.0, 1.0], g: 0.7 },
  },
}

/** Six sRGB colours per [style][type]. Each planet class reads them differently in the surface shader. */
export type Palette = [string, string, string, string, string, string]

export const PALETTES: Record<ArtStyle, Record<PlanetType, Palette>> = {
  natural: {
    ocean: ['#071a33', '#1c5869', '#3f5a2c', '#a68c5c', '#6a5b4f', '#eef2f4'],
    arid: ['#5a2b1d', '#a0583a', '#cd9466', '#7a4a35', '#3b2a22', '#ebe4da'],
    gas: ['#c4a47c', '#83502f', '#e2d4ba', '#5f3b28', '#ad845a', '#a3412b'],
    ice: ['#e8edf1', '#b6c6d3', '#8d4d34', '#d3dde5', '#7f97a8', '#ffffff'],
  },
  carto: {
    ocean: ['#15171b', '#252a31', '#a39d90', '#c3baa8', '#7d776d', '#efebe2'],
    arid: ['#3a3734', '#8a8379', '#c9c2b5', '#5a554f', '#2a2826', '#efebe3'],
    gas: ['#d3cdc1', '#8c857a', '#ebe6dc', '#6c665e', '#aaa398', '#e2a75b'],
    ice: ['#e9e5dc', '#b7b1a6', '#3a3631', '#d8d3c8', '#8a847a', '#ffffff'],
  },
  nocturne: {
    ocean: ['#030913', '#0a1f31', '#203427', '#5c4f3b', '#3a3632', '#b9c5d1'],
    arid: ['#2a1811', '#4e2d20', '#735037', '#331e16', '#170f0b', '#a3abb4'],
    gas: ['#2f3a57', '#1a2236', '#4c5d84', '#121828', '#3c4a6a', '#79acd4'],
    ice: ['#a7bace', '#61798f', '#4a2a36', '#8ea3b8', '#4d6176', '#d8e6f2'],
  },
}

/** Lighting and post settings for one art style. */
export interface StyleParams {
  /** 0 or 1: cartographic overlay (contours, graticule, coastline). */
  overlay: number
  /** Default sun azimuth in degrees around the vertical axis; 0 = behind the camera (full phase). */
  sunAz: number
  sunEl: number
  sunColor: string
  sunI: number
  amb: [number, number, number]
  city: number
  sky: number
  stars: number
  bloom: number
  exposure: number
  /** Atmosphere intensity multiplier. */
  atmoI: number
  /** 0 = grey atmosphere, 1 = full Rayleigh colour. */
  atmoSat: number
  grain: number
  accent: string
  ring: [string, string]
  cloudTint: string
  cloudOpacity: number
}

export const STYLE_PARAMS: Record<ArtStyle, StyleParams> = {
  natural: {
    overlay: 0, sunAz: 55, sunEl: 14, sunColor: '#fff3e2', sunI: 3.0, amb: [0.010, 0.012, 0.018], city: 0.5,
    sky: 1.0, stars: 1.0, bloom: 0.18, exposure: 1.0, atmoI: 1.0, atmoSat: 1.0, grain: 0.022,
    accent: '#e2a75b', ring: ['#d8c2a0', '#9c8266'], cloudTint: '#ffffff', cloudOpacity: 0.92,
  },
  carto: {
    overlay: 1, sunAz: 62, sunEl: 22, sunColor: '#ffffff', sunI: 2.7, amb: [0.035, 0.035, 0.035], city: 0,
    sky: 0.25, stars: 0.55, bloom: 0.12, exposure: 1.0, atmoI: 0.55, atmoSat: 0.2, grain: 0.03,
    accent: '#e2a75b', ring: ['#d7d1c5', '#8e877c'], cloudTint: '#f1ede4', cloudOpacity: 0.3,
  },
  nocturne: {
    overlay: 0, sunAz: 148, sunEl: 8, sunColor: '#e6edff', sunI: 2.6, amb: [0.004, 0.006, 0.012], city: 2.2,
    sky: 1.35, stars: 1.2, bloom: 0.55, exposure: 1.05, atmoI: 1.45, atmoSat: 1.1, grain: 0.018,
    accent: '#8fb3d9', ring: ['#7d8db0', '#3c4766'], cloudTint: '#c9d4e6', cloudOpacity: 1.0,
  },
}

/**
 * A planet as content describes it: the procedural class and seed, plus optional overrides for real bodies
 * (a NASA map, a measured tint, no atmosphere...). Every override falls back to the class defaults.
 */
export interface PlanetRender extends PlanetSpec {
  /** URL of an equirectangular colour map. While it loads, the procedural planet is shown. */
  texture?: string
  /** Replaces the class palette (see PALETTES for what each slot means per class). */
  palette?: Palette
  rings?: boolean
  clouds?: boolean
  /** null = airless body (no atmosphere shell at all). */
  atmosphere?: AtmosphereParams | null
  /** Sun glint on dark-blue areas of the map (Earth). */
  waterGlint?: boolean
  /**
   * Night-side city lights (equirectangular luminance map, aligned with `texture`). Only the Earth has one: no
   * other world is known to be inhabited, so procedural planets never show lights.
   */
  nightLights?: string
  /** Axial tilt in degrees, when known. */
  tiltDeg?: number
}
