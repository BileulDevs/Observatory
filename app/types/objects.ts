import type { PlanetRender } from '~/engine/presets'
import type { Localized, Source } from '~/types/systems'

/** Catalogue sections, in display order. Also the URL hash of the catalogue tab. */
export const OBJECT_CATEGORIES = [
  'black-holes', 'neutron-stars', 'quasars', 'galaxies', 'nebulae', 'comets', 'dwarf-planets', 'spacecraft',
] as const
export type ObjectCategory = (typeof OBJECT_CATEGORIES)[number]

/** Units a numeric fact can be shown in. Each has a template in i18n under `objects.units`. */
export type FactUnit =
  | 'msun' | 'lsun' | 'ly' | 'mly' | 'gly' | 'km' | 'm' | 'cm' | 'au' | 'years' | 'days' | 'hours' | 'min' | 'ms' | 's'
  | 'kg' | 'kms' | 'kmh' | 'gauss' | 'k' | 'deg' | 'gcm3' | 'm3' | 'mhz' | 'myr' | 'gyr' | 'joule' | 'm2' | 'w'

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
      nucleus: 'irregular' | 'bilobed'
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
 * - model: 3D model built from the real proportions;
 * - simulation: computed from physics (lensing, beams), with illustrative colours and scale;
 * - impression: shape and colours inspired by real images, structure procedural.
 */
export type ObjectAppearance = 'texture' | 'model' | 'simulation' | 'impression'

export interface SpaceObject {
  id: string
  category: ObjectCategory
  name: string | Localized
  /** One-line classification shown above the title. */
  kind: Localized
  description: Localized
  facts: ObjectFact[]
  render: ObjectRender
  appearance: ObjectAppearance
  sources: Source[]
}
