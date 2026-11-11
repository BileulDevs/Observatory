import { OBJECT_CATEGORIES, type ObjectCategory, type SpaceObject } from '~/types/objects'
import { BLACK_HOLES, NEUTRON_STARS, QUASARS } from './compact'
import { GALAXIES, NEBULAE } from './deepSky'
import { COMETS, DWARF_PLANETS, SPACECRAFT } from './solarSystem'

/** Every catalogued object, grouped by category in display order. */
export const OBJECTS_BY_CATEGORY: Record<ObjectCategory, SpaceObject[]> = {
  'black-holes': BLACK_HOLES,
  'neutron-stars': NEUTRON_STARS,
  'quasars': QUASARS,
  'galaxies': GALAXIES,
  'nebulae': NEBULAE,
  'comets': COMETS,
  'dwarf-planets': DWARF_PLANETS,
  'spacecraft': SPACECRAFT,
}

export const ALL_OBJECTS: SpaceObject[] = OBJECT_CATEGORIES.flatMap((c) => OBJECTS_BY_CATEGORY[c])

const byId = new Map(ALL_OBJECTS.map((o) => [o.id, o]))

export function findObject(id: string): SpaceObject | undefined {
  return byId.get(id)
}

export function isCategory(value: unknown): value is ObjectCategory {
  return typeof value === 'string' && (OBJECT_CATEGORIES as readonly string[]).includes(value)
}
