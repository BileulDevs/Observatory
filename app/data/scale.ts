import type { MoonRender } from '~/engine/bodies/Moons'
import { TYPE_PARAMS } from '~/engine/presets'
import type { SystemBody, SystemStar } from '~/engine/stages/SystemStage'
import type { MoonData, PlanetarySystem, PlanetFacts } from '~/types/systems'

/**
 * Real proportions cannot fit on a screen (Neptune orbits 30 AU out, Mercury is 1/30 of Jupiter's width).
 * These functions compress sizes, distances and periods while keeping their order, so the view stays readable.
 * The fact panel always shows the true values.
 */

/** Earth's radius on screen, world units. */
const EARTH_DISPLAY_RADIUS = 0.55
/** Size compression exponent: 1 = true ratios, 0 = all the same size. 0.45 keeps Jupiter visibly huge but not 11× Earth. */
const SIZE_EXPONENT = 0.45
const MIN_RADIUS = 0.3
const MAX_RADIUS = 2.2
/** Sun's radius on screen and its compression exponent. */
const SUN_DISPLAY_RADIUS = 1.05
const STAR_EXPONENT = 0.35
const MIN_STAR = 0.6
/** Spacing per unit of ln(a): larger = distances closer to a log scale. */
const LOG_SPACING = 3.2
/** Free space between two neighbouring orbits, on top of both planet radii. */
const ORBIT_MARGIN = 0.9
/** Display period of the innermost planet, seconds per revolution, and the compression exponent of period ratios. */
const INNER_PERIOD_SECONDS = 18
const PERIOD_EXPONENT = 0.55
const EARTH_RADIUS_KM = 6371
/** Moon size compression (radius ratio to the planet, raised to this power) and its display bounds, in planet radii. */
const MOON_SIZE_EXPONENT = 0.6
const MIN_MOON = 0.06
const MAX_MOON = 0.32
/** Moon orbit in planet radii: base + spacing × ln(a / R_planet). Ringed planets start beyond their rings. */
const MOON_ORBIT_BASE = 1.2
const MOON_ORBIT_BASE_RINGED = 2.4
const MOON_ORBIT_SPACING = 0.6
/** Display seconds per revolution for a one-day moon, and the compression exponent of period ratios. */
const MOON_PERIOD_ONE_DAY = 5
const MOON_PERIOD_EXPONENT = 0.5

export function radiusEarthOf(f: PlanetFacts): number | null {
  if (f.radiusKm) return f.radiusKm / EARTH_RADIUS_KM
  if (f.radiusEarth) return f.radiusEarth
  return null
}

/** For display only: when the radius is unmeasured, a rocky mass–radius relation gives a plausible size. */
function displayRadius(f: PlanetFacts): number {
  const r = radiusEarthOf(f) ?? Math.pow(f.massEarth ?? 1, 0.27)
  return Math.min(Math.max(EARTH_DISPLAY_RADIUS * Math.pow(r, SIZE_EXPONENT), MIN_RADIUS), MAX_RADIUS)
}

/** Planet radius in km from whatever the source gives; null when only a mass is known. */
function planetRadiusKm(f: PlanetFacts): number | null {
  const re = radiusEarthOf(f)
  return re === null ? null : re * EARTH_RADIUS_KM
}

function toMoons(moons: MoonData[] | undefined, f: PlanetFacts, ringed: boolean): MoonRender[] | undefined {
  const rp = planetRadiusKm(f)
  if (!moons?.length || !rp) return undefined
  const base = ringed ? MOON_ORBIT_BASE_RINGED : MOON_ORBIT_BASE
  let last = 0
  return [...moons].sort((a, b) => a.semiMajorAxisKm - b.semiMajorAxisKm).map((m, i) => {
    const radius = Math.min(Math.max(Math.pow(m.radiusKm / rp, MOON_SIZE_EXPONENT), MIN_MOON), MAX_MOON)
    // Never closer to the previous moon than both radii plus a hair, even when real orbits are close.
    const orbit = Math.max(base + MOON_ORBIT_SPACING * Math.log(m.semiMajorAxisKm / rp), last + 2 * radius + 0.08)
    last = orbit
    return {
      id: m.id,
      radius,
      orbit,
      period: MOON_PERIOD_ONE_DAY * Math.pow(m.periodDays, MOON_PERIOD_EXPONENT),
      phase: i * 2.39996 + 1,
      retrograde: !!m.retrograde,
      texture: m.texture,
      color: m.color,
      twoTone: m.twoTone,
      hazy: m.hazy,
      seed: i + 1,
    }
  })
}

export function toStage(system: PlanetarySystem): { star: SystemStar; bodies: SystemBody[] } {
  const starRadius = Math.max(SUN_DISPLAY_RADIUS * Math.pow(system.star.radiusSun, STAR_EXPONENT), MIN_STAR)
  const sorted = [...system.planets].sort((a, b) => a.facts.semiMajorAxisAU - b.facts.semiMajorAxisAU)
  const radii = sorted.map((p) => displayRadius(p.facts))
  const innerP = sorted[0]?.facts.periodDays ?? 1

  let orbit = starRadius * 2.4 + (radii[0] ?? 0.5)
  const bodies: SystemBody[] = sorted.map((p, i) => {
    if (i > 0) {
      const prev = sorted[i - 1]!
      const logGap = LOG_SPACING * Math.log(p.facts.semiMajorAxisAU / prev.facts.semiMajorAxisAU)
      orbit += Math.max(radii[i - 1]! + radii[i]! + ORBIT_MARGIN, logGap)
    }
    return {
      id: p.id,
      render: p.render,
      radius: radii[i]!,
      orbit,
      period: INNER_PERIOD_SECONDS * Math.pow(p.facts.periodDays / innerP, PERIOD_EXPONENT),
      // Golden-angle phases: planets start spread around the star instead of lined up.
      phase: i * 2.39996,
      moons: toMoons(p.moons, p.facts, p.render.rings ?? TYPE_PARAMS[p.render.type].rings),
    }
  })
  return { star: { temperatureK: system.star.temperatureK, radius: starRadius, seed: system.id.length * 7 }, bodies }
}
