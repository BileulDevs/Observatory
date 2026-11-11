/**
 * Small deterministic noise for geometry built on the CPU (comet nuclei, galaxy clumps). GPU shaders use
 * their own noise; this one only needs to be stable for a given seed, not fast.
 */

/** Integer hash to [0, 1). */
function hash3(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144665) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Trilinear value noise in [-1, 1]. */
export function valueNoise3(x: number, y: number, z: number, seed = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi)
  let acc = 0
  for (let dz = 0; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
    const w = (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf)
    acc += w * hash3(xi + dx, yi + dy, zi + dz, seed)
  }
  return acc * 2 - 1
}

/** Fractal sum of value noise, roughly in [-1, 1]. */
export function fbm3(x: number, y: number, z: number, octaves: number, seed = 0): number {
  let sum = 0, amp = 0.5, norm = 0, f = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise3(x * f, y * f, z * f, seed + i * 31)
    norm += amp
    amp *= 0.5
    f *= 2.03
  }
  return sum / norm
}

/** Standard normal sample (Box–Muller) from a uniform generator. */
export function gaussian(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-9)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd())
}
