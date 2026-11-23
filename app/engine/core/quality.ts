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
  /**
   * Drawing resolution as a share of the (capped) pixel ratio, whatever the screen. Pixel fill (scene, bloom, finish
   * pass) is most of a frame's GPU time, and on a 1× screen the pixel-ratio cap above changes nothing: measured on
   * the exploit scenes, the three tiers then cost within 15 % of each other. Pixels drawn grow with its square.
   */
  renderScale: number
  /** MSAA samples on the HDR target. 0 on mobile: tile GPUs pay heavily for multisampled float targets. */
  msaa: number
  /** Atmosphere ray-march steps. Below ~6 the limb shows visible banding. */
  atmosphereSteps: number
  starCount: number
  /** Whether the user's device allows pointer-drag orbiting (touch devices keep native page scrolling instead). */
  pointerOrbit: boolean
}

/** The tiers, lowest first (the order the quality picker lists them in). */
export const QUALITY_TIERS: readonly QualityTier[] = ['low', 'medium', 'high']

/**
 * localStorage key that forces a tier. Set by the exploits' quality picker (the visitor's choice, kept between
 * visits); also handy to test the low tier on a desktop. Absent = the tier detected from the device.
 */
export const QUALITY_OVERRIDE_KEY = 'space:quality'

const PROFILES: Record<QualityTier, Omit<QualityProfile, 'pointerOrbit'>> = {
  // renderScale: low draws ~42 % of the pixels of high, medium ~72 %. Medium also halves MSAA (2 samples).
  high: { tier: 'high', bakeRes: 2048, maxPixelRatio: 2, renderScale: 1, msaa: 4, atmosphereSteps: 14, starCount: 7000 },
  medium: { tier: 'medium', bakeRes: 1024, maxPixelRatio: 2, renderScale: 0.85, msaa: 2, atmosphereSteps: 12, starCount: 6000 },
  low: { tier: 'low', bakeRes: 512, maxPixelRatio: 1.5, renderScale: 0.65, msaa: 0, atmosphereSteps: 8, starCount: 3500 },
}

/** Heuristic only (no GPU benchmark): coarse pointer = mobile, then texture limits and reported memory. */
export function detectQuality(gl: WebGL2RenderingContext): QualityProfile {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const pointerOrbit = !coarse

  const forced = readQualityOverride()
  if (forced) return { ...PROFILES[forced], pointerOrbit }

  if (coarse) return { ...PROFILES.low, pointerOrbit }

  const maxCube = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) as number
  // deviceMemory is Chromium-only and capped at 8; when it is missing we do not penalise the device.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const tier: QualityTier = maxCube >= 4096 && memory >= 8 ? 'high' : 'medium'
  return { ...PROFILES[tier], pointerOrbit }
}

/** The forced tier, or null to detect it from the device. */
export function readQualityOverride(): QualityTier | null {
  try {
    const v = window.localStorage.getItem(QUALITY_OVERRIDE_KEY)
    return v === 'low' || v === 'medium' || v === 'high' ? v : null
  } catch {
    // Storage can throw in privacy modes and sandboxed frames: just ignore the override.
    return null
  }
}

/** Forces a tier (null: back to detection). Read when the next engine is created. */
export function writeQualityOverride(tier: QualityTier | null): void {
  try {
    if (tier) window.localStorage.setItem(QUALITY_OVERRIDE_KEY, tier)
    else window.localStorage.removeItem(QUALITY_OVERRIDE_KEY)
  } catch {
    // Storage blocked: the choice cannot be kept. The caller rebuilds anyway, so nothing changes on screen.
  }
}
