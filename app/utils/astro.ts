/** Small astronomy helpers shared by the constellation pages. */

const DEG = Math.PI / 180

/** Angle between two sky positions (degrees), from right ascension and declination in degrees. */
export function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  // Haversine form: stays accurate for the very small angles between neighbouring stars.
  const dRa = (ra2 - ra1) * DEG
  const dDec = (dec2 - dec1) * DEG
  const h = Math.sin(dDec / 2) ** 2 + Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.sin(dRa / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / DEG
}

/**
 * True distance between two stars, in the unit of the distances given: both placed in space from their sky
 * position and their distance from Earth, then the law of cosines (d² = a² + b² − 2ab·cos θ). Independent of
 * how the 3D scene scales or compresses anything.
 */
export function spatialSeparation(d1: number, d2: number, angleDeg: number): number {
  return Math.sqrt(Math.max(0, d1 * d1 + d2 * d2 - 2 * d1 * d2 * Math.cos(angleDeg * DEG)))
}

/** Year the light reaching us now left a star this many light-years away (negative = BC). */
export function lightDepartureYear(ly: number, now = new Date().getFullYear()): number {
  return now - Math.round(ly)
}
