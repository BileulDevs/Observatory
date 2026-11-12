import type { PlanetRender } from '~/engine/presets'
import type { Localized, Source } from '~/types/systems'

/** Catalogue sections, in display order. Also the URL hash of the catalogue tab. */
export const OBJECT_CATEGORIES = [
  'black-holes', 'stars', 'neutron-stars', 'quasars', 'galaxies', 'nebulae', 'comets', 'dwarf-planets', 'spacecraft',
] as const
export type ObjectCategory = (typeof OBJECT_CATEGORIES)[number]

/** Units a numeric fact can be shown in. Each has a template in i18n under `objects.units`. */
export type FactUnit =
  | 'msun' | 'lsun' | 'ly' | 'mly' | 'gly' | 'km' | 'm' | 'cm' | 'au' | 'years' | 'days' | 'hours' | 'min' | 'ms' | 's'
  | 'kg' | 'kms' | 'kmh' | 'gauss' | 'k' | 'deg' | 'gcm3' | 'm3' | 'mhz' | 'myr' | 'gyr' | 'joule' | 'm2' | 'w'
  | 'hz' | 'rsun' | 'pct'

/**
 * One row of an object's fact sheet. The label comes from i18n (`objects.facts.<key>`), so the data stays
 * language-neutral where it can. Text facts carry their own wording.
 */
export type ObjectFact =
  | {
      key: string
      value: number
      unit?: FactUnit
      /** Maximum fraction digits. */
      digits?: number
      /** Always × 10ⁿ notation (masses in kg, energies). Otherwise large values use words (millions, billions). */
      sci?: boolean
      /** Uncertainty marker shown before the value. */
      qualifier?: '≈' | '~' | '≥' | '>' | '<'
      /** Short caveat after the value: estimate method, revised figure... */
      note?: Localized
      /** Value computed here, not taken from the source (e.g. Schwarzschild radius from the mass). */
      derived?: boolean
    }
  | { key: string; text: string | Localized }

/** How an object is drawn. One renderer per kind; the parameters make each example distinct. */
export type ObjectRender =
  | {
      kind: 'black-hole'
      /** Accretion disk colour temperature, kelvin (visual, not a measured value). */
      diskTemperatureK: number
      /** Disk brightness multiplier: quasars and active nuclei shine far more than quiet holes. */
      diskIntensity: number
      /** Disk outer edge, in Schwarzschild radii. */
      diskOuter: number
      /** Disk inner edge (innermost stable orbit), in Schwarzschild radii: 3 without spin, down to 0.5 at maximal spin. */
      diskInner?: number
      /** Viewing tilt of the disk, degrees from edge-on. */
      tiltDeg: number
      jets?: { intensity: number; color: string }
      /** Hot companion star feeding the disk (X-ray binaries such as Cygnus X-1). */
      companion?: { temperatureK: number; radius: number; distance: number }
      /** Faint host galaxy around an active nucleus (quasars). */
      host?: { color: string; radius: number }
      seed: number
    }
  | {
      kind: 'star'
      /** Effective temperature: sets the colour unless a tint overrides it. */
      temperatureK: number
      /** Perceived colour when the atmosphere's composition, not the temperature, sets it (polluted white dwarfs). */
      tint?: string
      /** Convection cell density, 1 = Sun-like; larger = more, smaller cells. */
      granulation?: number
      /** Starspot coverage (0–1). */
      spots?: number
      /** Magnetic activity (0–1): bright faculae around active regions. */
      activity?: number
      /** Real rotation period, seconds; the on-screen spin is compressed from it. */
      rotationS?: number
      /** Corona glow strength (default 0.6). */
      glow?: number
      /** Black hole star: lumpy turbulent envelope and a haze of the given colour around it. */
      envelope?: { lumpiness: number; haze: string }
      seed: number
    }
  | {
      kind: 'neutron-star'
      /** Real rotation period, seconds; the on-screen spin is compressed from it. */
      periodS: number
      /** Angle between rotation and magnetic axes, degrees: the lighthouse sweep. */
      magneticTiltDeg: number
      beamColor: string
      /** Magnetars: denser, brighter field lines and a hotter surface. */
      magnetar?: boolean
      /** Pulsar wind nebula around the star (Crab, Vela). */
      windNebula?: { color: string }
      seed: number
    }
  | {
      kind: 'galaxy'
      morphology: 'barred-spiral' | 'spiral' | 'grand-design' | 'sombrero' | 'elliptical' | 'magellanic'
      arms: number
      /** Arm winding, radians from centre to edge. */
      twist: number
      core: string
      arm: string
      /** Interacting companion (M51 / NGC 5195). */
      companion?: boolean
      /** 0 = no dust, 1 = strong dust lanes. */
      dust: number
      /** Default view, degrees above the disk plane: close to the real inclination for well-known galaxies. */
      viewElevationDeg?: number
      seed: number
    }
  | {
      kind: 'nebula'
      shape: 'emission' | 'ring' | 'helix' | 'remnant' | 'pillars' | 'complex'
      /** Emission colours: [dominant, secondary, highlight]. */
      palette: [string, string, string]
      seed: number
    }
  | {
      kind: 'comet'
      /**
       * Nucleus shape: irregular (never imaged, generic lumpy body), halley (built from the dimensions measured by
       * Vega and Giotto in 1986), or 67p (ESA's shape model from Rosetta's cameras, loaded from a file).
       */
      nucleus: 'irregular' | 'halley' | '67p'
      /** Tail length in nucleus-to-coma units; Hale–Bopp's is the longest. */
      tail: number
      /** Blue plasma tail strength (0–1). */
      ionTail: number
      /** Curved dust tail strength (0–1). */
      dustTail: number
      comaColor: string
      /** Sunward spike seen when Earth crosses the comet's orbital plane (Tsuchinshan–ATLAS, Oct 2024). */
      antiTail?: boolean
      seed: number
    }
  | {
      kind: 'dwarf-planet'
      planet: PlanetRender
      /** Axis ratios for non-spherical bodies (Haumea), x : y : z with y the spin axis. */
      ellipsoid?: [number, number, number]
      /** Narrow ring, in body radii (Haumea). */
      ring?: { radius: number; width: number }
      /** Default camera elevation, degrees, when the side worth seeing is not the one a level view shows. */
      elevationDeg?: number
    }
  | {
      kind: 'spacecraft'
      model: 'iss' | 'hubble' | 'jwst' | 'voyager-1' | 'tiangong' | 'sputnik-1'
      /** Low Earth orbit: draw the Earth below. */
      earth?: boolean
    }

/**
 * How the picture relates to reality, shown under the title:
 * - texture: real map of the surface;
 * - model: 3D model built here from the real dimensions;
 * - nasaModel: NASA's own 3D model (NASA 3D Resources);
 * - simulation: computed from physics (lensing, beams), with illustrative colours and scale;
 * - impression: shape and colours inspired by real images, structure procedural;
 * - shapeModel: measured shape of a small body from a mission's shape model (67P), coma and tails illustrative;
 * - measuredShape: shape built from published dimensions (Halley), relief and tails illustrative;
 * - textureFilled: real map whose unimaged part was filled in here (Pluto's southern hemisphere);
 * - computedColour: colour computed from the spectrum by the cited study, surface illustrative.
 */
export type ObjectAppearance = 'texture' | 'model' | 'nasaModel' | 'simulation' | 'impression' | 'shapeModel' | 'measuredShape' | 'textureFilled' | 'computedColour'

/**
 * A labelled point on an object's 3D view ("Repères"): what is special about that part of it. Short texts: they
 * sit on one line next to the marker.
 */
export interface ObjectMarker {
  /** Named point of the object's renderer (ANCHOR_KEYS in engine/objects/anchors.ts). */
  anchor: string
  title: Localized
  /** One line next to the marker in the scene. */
  text: Localized
  /** The sheet shown in the panel when the marker is chosen: what it is and why it matters, a few sentences. */
  body: Localized
}

export interface SpaceObject {
  id: string
  category: ObjectCategory
  name: string | Localized
  /** One-line classification shown above the title. */
  kind: Localized
  description: Localized
  facts: ObjectFact[]
  render: ObjectRender
  /** At least one: the feature the object is known for. */
  markers: ObjectMarker[]
  appearance: ObjectAppearance
  sources: Source[]
}
