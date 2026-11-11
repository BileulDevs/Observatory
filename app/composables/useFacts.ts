import type { MoonData, PlanetFacts, StarFacts } from '~/types/systems'

export interface FactRow {
  label: string
  value: string
}

/** Below this many days, an orbital period reads better in days; above, in years. */
const DAYS_PER_YEAR_SWITCH = 1000
const DAYS_PER_YEAR = 365.25
/** Solar effective temperature, kelvin (IAU nominal value). */
const SUN_TEMPERATURE_K = 5772
/** Newtonian constant of gravitation in km³ kg⁻¹ s⁻² (CODATA 2018), to turn GM into a mass. */
const G_KM3 = 6.6743e-20
/** 1 g/cm³ expressed in kg/km³. */
const DENSITY_TO_KG_PER_KM3 = 1e12
const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/**
 * Turns raw facts into labelled, locale-formatted rows. Only known fields produce a row:
 * nothing is ever estimated here.
 */
export function useFacts() {
  const { t } = useI18n()
  const localized = useLocalized()
  const { num } = localized
  const u = (unit: string, v: string) => t(`facts.units.${unit}`, { v })

  function planetRows(f: PlanetFacts): FactRow[] {
    const rows: FactRow[] = []
    if (f.radiusKm !== undefined) rows.push({ label: t('facts.radius'), value: u('km', num(f.radiusKm, 0)) })
    else if (f.radiusEarth !== undefined) rows.push({ label: t('facts.radiusEarth'), value: num(f.radiusEarth, 3) })
    if (f.massEarth !== undefined) {
      const label = f.massIsMinimum ? t('facts.massMin') : t('facts.mass')
      const value = (f.massIsMinimum ? '≥ ' : f.massIsEstimate ? '≈ ' : '') + num(f.massEarth, f.massEarth < 1 ? 4 : 2)
      rows.push({ label, value: f.massIsEstimate ? `${value} (${t('facts.estimate')})` : value })
    }
    rows.push({ label: t('facts.distance'), value: u('au', num(f.semiMajorAxisAU, f.semiMajorAxisAU < 0.1 ? 5 : 3)) })
    rows.push({
      label: t('facts.period'),
      value: f.periodDays >= DAYS_PER_YEAR_SWITCH
        ? u('years', num(f.periodDays / DAYS_PER_YEAR, 1))
        : u('days', num(f.periodDays, f.periodDays < 30 ? 3 : 1)),
    })
    if (f.eccentricity !== undefined) rows.push({ label: t('facts.eccentricity'), value: num(f.eccentricity, 4) })
    if (f.dayHours !== undefined) rows.push({ label: t('facts.day'), value: u('hours', num(f.dayHours, 1)) })
    if (f.gravity !== undefined) rows.push({ label: t('facts.gravity'), value: u('ms2', num(f.gravity, 1)) })
    if (f.meanTempC !== undefined) rows.push({ label: t('facts.temp'), value: u('c', num(f.meanTempC, 0)) })
    if (f.equilibriumTempK !== undefined) rows.push({ label: t('facts.tempEq'), value: u('k', num(f.equilibriumTempK, 0)) })
    if (f.moons !== undefined) rows.push({ label: t('facts.moons'), value: num(f.moons, 0) })
    if (f.obliquityDeg !== undefined) rows.push({ label: t('facts.obliquity'), value: u('deg', num(f.obliquityDeg, 1)) })
    if (f.discoveryYear !== undefined) rows.push({ label: t('facts.discovery'), value: String(f.discoveryYear) })
    return rows
  }

  function starRows(s: StarFacts): FactRow[] {
    const rows: FactRow[] = [
      { label: t('facts.spectral'), value: s.spectralType },
      { label: t('facts.starMass'), value: num(s.massSun, 3) },
      { label: t('facts.starRadius'), value: num(s.radiusSun, 3) },
      { label: t('facts.starTemp'), value: u('k', num(s.temperatureK, 0)) },
    ]
    // Derived, not sourced: Stefan–Boltzmann, L/L☉ = (R/R☉)² (T/T☉)⁴ with T☉ = 5772 K.
    const luminosity = s.radiusSun * s.radiusSun * Math.pow(s.temperatureK / SUN_TEMPERATURE_K, 4)
    rows.push({ label: t('facts.luminosity'), value: '≈ ' + num(luminosity, luminosity < 0.01 ? 5 : luminosity < 1 ? 3 : 2) })
    if (s.ageGyr !== undefined) {
      rows.push({ label: t('facts.age'), value: s.ageGyr < 1 ? u('myr', num(s.ageGyr * 1000, 0)) : u('gyr', num(s.ageGyr, 1)) })
    }
    return rows
  }

  /** One line per moon: radius, distance to the planet, period. */
  function moonRow(m: MoonData): FactRow {
    const { tl } = localized
    const period = m.periodDays < 1 ? u('hours', num(m.periodDays * 24, 1)) : u('days', num(m.periodDays, 2))
    return {
      label: tl(m.name),
      value: `${u('km', num(m.radiusKm, 0))} · ${u('km', num(m.semiMajorAxisKm, 0))} · ${period}${m.retrograde ? ' · ' + t('facts.retrograde') : ''}`,
    }
  }

  /**
   * Full fact sheet of one moon. Mass and surface gravity are derived (from GM, or from density for generated
   * moons), so their labels say so.
   */
  function moonRows(m: MoonData): FactRow[] {
    const rows: FactRow[] = [{ label: t('facts.radius'), value: u('km', num(m.radiusKm, m.radiusKm < 100 ? 1 : 0)) }]
    const gm = m.gmKm3s2 ?? (m.densityGcm3 !== undefined
      ? G_KM3 * m.densityGcm3 * DENSITY_TO_KG_PER_KM3 * (4 / 3) * Math.PI * m.radiusKm ** 3
      : undefined)
    if (gm !== undefined) {
      rows.push({ label: m.gmKm3s2 !== undefined ? t('facts.massKg') : t('facts.massKgDerived'), value: u('kg', scientific(gm / G_KM3)) })
    }
    if (m.densityGcm3 !== undefined) rows.push({ label: t('facts.density'), value: u('gcm3', num(m.densityGcm3, 2)) })
    // km/s² → m/s²: × 1000.
    if (gm !== undefined) rows.push({ label: t('facts.surfaceGravity'), value: u('ms2', num((gm / m.radiusKm ** 2) * 1000, 3)) })
    rows.push({ label: t('facts.moonDistance'), value: u('km', num(m.semiMajorAxisKm, 0)) })
    rows.push({
      label: t('facts.period'),
      value: m.periodDays < 1 ? u('hours', num(m.periodDays * 24, 1)) : u('days', num(m.periodDays, 2)),
    })
    if (m.retrograde) rows.push({ label: t('facts.direction'), value: t('facts.retrograde') })
    if (m.discoveryYear !== undefined) {
      rows.push({ label: t('facts.discovery'), value: m.discoveredBy ? `${m.discoveryYear} · ${m.discoveredBy}` : String(m.discoveryYear) })
    }
    return rows
  }

  /** "1,08 × 10²³" in the current locale. */
  function scientific(v: number): string {
    const exp = Math.floor(Math.log10(v))
    const mantissa = v / 10 ** exp
    const sup = String(exp).split('').map((c) => (c === '-' ? '⁻' : SUPERSCRIPT[Number(c)])).join('')
    return `${num(mantissa, 2)} × 10${sup}`
  }

  return { planetRows, starRows, moonRow, moonRows }
}
