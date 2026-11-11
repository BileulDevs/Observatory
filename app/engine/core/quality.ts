/**
 * Picks a GPU budget for the current device. Everything that scales with hardware is decided here,
 * so the rest of the engine never branches on "is this a phone".
 */

export type QualityTier = 'low' | 'medium' | 'high'

export interface QualityProfile {
  tier: QualityTier
  /** Surface cubemap face size. Memory grows with the square: 2048 ≈ 270 MB, 1024 ≈ 67 MB, 512 ≈ 17 MB (RGBA16F + mips). */
  bakeRes: number
  /** Cap on devicePixelRatio. Fill cost grows with its square; above 2 the gain is invisible. */
  maxPixelRatio: number
  /** MSAA samples on the HDR target. 0 on mobile: tile GPUs pay heavily for multisampled float targets. */
  msaa: number
  /** Atmosphere ray-march steps. Below ~6 the limb shows visible banding. */
  atmosphereSteps: number
  starCount: number
  /** Whether the user's device allows pointer-drag orbiting (touch devices keep native page scrolling instead). */
  pointerOrbit: boolean
}

/** localStorage key that forces a tier: handy to test the low tier on a desktop, or to rescue a struggling machine. */
export const QUALITY_OVERRIDE_KEY = 'space:quality'

const PROFILES: Record<QualityTier, Omit<QualityProfile, 'pointerOrbit'>> = {
  high: { tier: 'high', bakeRes: 2048, maxPixelRatio: 2, msaa: 4, atmosphereSteps: 14, starCount: 7000 },
  medium: { tier: 'medium', bakeRes: 1024, maxPixelRatio: 2, msaa: 4, atmosphereSteps: 12, starCount: 6000 },
  low: { tier: 'low', bakeRes: 512, maxPixelRatio: 1.5, msaa: 0, atmosphereSteps: 8, starCount: 3500 },
}

/** Heuristic only (no GPU benchmark): coarse pointer = mobile, then texture limits and reported memory. */
export function detectQuality(gl: WebGL2RenderingContext): QualityProfile {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const pointerOrbit = !coarse

  const forced = readOverride()
  if (forced) return { ...PROFILES[forced], pointerOrbit }

  if (coarse) return { ...PROFILES.low, pointerOrbit }

  const maxCube = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) as number
  // deviceMemory is Chromium-only and capped at 8; when it is missing we do not penalise the device.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const tier: QualityTier = maxCube >= 4096 && memory >= 8 ? 'high' : 'medium'
  return { ...PROFILES[tier], pointerOrbit }
}

function readOverride(): QualityTier | null {
  try {
    const v = window.localStorage.getItem(QUALITY_OVERRIDE_KEY)
    return v === 'low' || v === 'medium' || v === 'high' ? v : null
  } catch {
    // Storage can throw in privacy modes and sandboxed frames: just ignore the override.
    return null
  }
}
