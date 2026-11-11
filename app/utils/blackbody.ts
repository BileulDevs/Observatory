/**
 * Approximate black-body colour for a temperature in kelvin (Tanner Helland fit, 1000–40000 K), as 0–1 RGB.
 * Pure function: shared by the WebGL star and the 2D catalogue thumbnails.
 */
export function blackbodyRgb(kelvin: number): [number, number, number] {
  const t = Math.min(Math.max(kelvin, 1000), 40000) / 100
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592)
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307
  const c = (v: number) => Math.min(Math.max(v, 0), 255) / 255
  return [c(r), c(g), c(b)]
}

export function blackbodyHex(kelvin: number): string {
  return '#' + blackbodyRgb(kelvin).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}
