/**
 * The home page's world in its URL (`/?seed=4821&type=gas&style=carto`), so a world can be shared and reloaded.
 * Pure functions (no Vue, no Nuxt), tested by tests/worldLink.test.ts. The `.ts` extension below lets Node's test
 * runner load this file directly; Nuxt accepts it too.
 */
import { ART_STYLES, PLANET_TYPES, type ArtStyle, type PlanetType } from '../engine/presets.ts'

export interface World {
  seed: number
  type: PlanetType
  style: ArtStyle
}

/** Largest seed: "New world" draws up to it, and a link may not go beyond. Seeds stay short enough to read aloud and type. */
export const MAX_SEED = 9999

/** World shown on a first visit, and left out of the URL: a seed that reads well (continents and oceans both visible). */
export const DEFAULT_WORLD: Readonly<World> = { seed: 2718, type: 'ocean', style: 'natural' }

/** A query value as the router gives it: absent, one string, or several when the parameter is repeated. */
type QueryValue = string | null | undefined | (string | null)[]

function first(value: QueryValue): string | undefined {
  const v = Array.isArray(value) ? value[0] : value
  return v ?? undefined
}

function oneOf<T extends string>(list: readonly T[], value: QueryValue): T | undefined {
  const v = first(value)
  return list.find((item) => item === v)
}

function parseSeed(value: QueryValue): number | undefined {
  const v = first(value)
  // Digits only: rejects "-3", "12.5", "1e3" and the empty string, which Number() would all accept or turn into 0.
  if (!v || !/^\d{1,9}$/.test(v)) return undefined
  const seed = Number(v)
  return seed <= MAX_SEED ? seed : undefined
}

/** The world a URL describes. Anything missing or invalid falls back to the default world's value. */
export function worldFromQuery(query: Record<string, QueryValue>): World {
  return {
    seed: parseSeed(query.seed) ?? DEFAULT_WORLD.seed,
    type: oneOf(PLANET_TYPES, query.type) ?? DEFAULT_WORLD.type,
    style: oneOf(ART_STYLES, query.style) ?? DEFAULT_WORLD.style,
  }
}

/** Query parameters for a world: only what differs from the default world, so the first visit keeps a bare `/`. */
export function worldToQuery(world: World): Record<string, string> {
  const query: Record<string, string> = {}
  if (world.seed !== DEFAULT_WORLD.seed) query.seed = String(world.seed)
  if (world.type !== DEFAULT_WORLD.type) query.type = world.type
  if (world.style !== DEFAULT_WORLD.style) query.style = world.style
  return query
}
