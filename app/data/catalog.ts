import { FEATURED_SEEDS, generateSystem, isGeneratedId, seedFromId } from './generate'
import { realSystems } from './systems'
import type { PlanetarySystem } from '~/types/systems'

/** Resolves a URL id to a system: a real one by id, or a generated one from its seed. */
export function findSystem(id: string): PlanetarySystem | null {
  const real = realSystems.find((s) => s.id === id)
  if (real) return real
  if (isGeneratedId(id)) return generateSystem(seedFromId(id)!)
  return null
}

/** Generated systems shown in the index. */
export function featuredGenerated(): PlanetarySystem[] {
  return FEATURED_SEEDS.map(generateSystem)
}
