import { Color, Vector3 } from 'three'
import { PALETTES, STYLE_PARAMS, type ArtStyle, type PlanetType } from './presets'

/**
 * Every art-style parameter resolved to numbers and colours, so two styles can be interpolated.
 * This is what makes the natural → cartographic "change of instrument" a continuous transition instead of a cut.
 */
export interface Look {
  overlay: number
  sunAz: number
  sunEl: number
  sunI: number
  city: number
  sky: number
  stars: number
  bloom: number
  exposure: number
  atmoI: number
  atmoSat: number
  grain: number
  cloudOpacity: number
  amb: Vector3
  sunColor: Color
  accent: Color
  ring0: Color
  ring1: Color
  cloudTint: Color
  palette: [Color, Color, Color, Color, Color, Color]
}

export function createLook(): Look {
  return {
    overlay: 0, sunAz: 0, sunEl: 0, sunI: 0, city: 0, sky: 0, stars: 0, bloom: 0, exposure: 1, atmoI: 1, atmoSat: 1,
    grain: 0, cloudOpacity: 1, amb: new Vector3(), sunColor: new Color(), accent: new Color(), ring0: new Color(),
    ring1: new Color(), cloudTint: new Color(),
    palette: [new Color(), new Color(), new Color(), new Color(), new Color(), new Color()],
  }
}

const tmpA = new Color()
const tmpB = new Color()

/** Blends two styles for one planet class into `out` (t = 0 → `from`, t = 1 → `to`). Allocation-free after creation. */
export function blendLook(type: PlanetType, from: ArtStyle, to: ArtStyle, t: number, out: Look): Look {
  const a = STYLE_PARAMS[from]
  const b = STYLE_PARAMS[to]
  const mix = (x: number, y: number) => x + (y - x) * t
  const col = (target: Color, x: string, y: string) => target.copy(tmpA.set(x)).lerp(tmpB.set(y), t)

  out.overlay = mix(a.overlay, b.overlay)
  out.sunAz = mix(a.sunAz, b.sunAz)
  out.sunEl = mix(a.sunEl, b.sunEl)
  out.sunI = mix(a.sunI, b.sunI)
  out.city = mix(a.city, b.city)
  out.sky = mix(a.sky, b.sky)
  out.stars = mix(a.stars, b.stars)
  out.bloom = mix(a.bloom, b.bloom)
  out.exposure = mix(a.exposure, b.exposure)
  out.atmoI = mix(a.atmoI, b.atmoI)
  out.atmoSat = mix(a.atmoSat, b.atmoSat)
  out.grain = mix(a.grain, b.grain)
  out.cloudOpacity = mix(a.cloudOpacity, b.cloudOpacity)
  out.amb.set(mix(a.amb[0], b.amb[0]), mix(a.amb[1], b.amb[1]), mix(a.amb[2], b.amb[2]))
  col(out.sunColor, a.sunColor, b.sunColor)
  col(out.accent, a.accent, b.accent)
  col(out.ring0, a.ring[0], b.ring[0])
  col(out.ring1, a.ring[1], b.ring[1])
  col(out.cloudTint, a.cloudTint, b.cloudTint)
  const pa = PALETTES[from][type]
  const pb = PALETTES[to][type]
  for (let i = 0; i < 6; i++) col(out.palette[i]!, pa[i]!, pb[i]!)
  return out
}
