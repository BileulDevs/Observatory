import type { ObjectRender } from '~/types/objects'
import { BlackHole } from './BlackHole'
import { CatalogueStar } from './CatalogueStar'
import { Comet } from './Comet'
import { DwarfPlanet } from './DwarfPlanet'
import { Galaxy } from './Galaxy'
import { Nebula } from './Nebula'
import { NeutronStar } from './NeutronStar'
import { Spacecraft } from './Spacecraft'
import type { BodyContext, SpaceBody } from './types'

/** Builds the 3D body for a catalogue object from its render description. */
export function createBody(render: ObjectRender, ctx: BodyContext): SpaceBody {
  switch (render.kind) {
    case 'black-hole': return new BlackHole(render, ctx)
    case 'star': return new CatalogueStar(render, ctx)
    case 'neutron-star': return new NeutronStar(render, ctx)
    case 'galaxy': return new Galaxy(render, ctx)
    case 'nebula': return new Nebula(render, ctx)
    case 'comet': return new Comet(render, ctx)
    case 'dwarf-planet': return new DwarfPlanet(render, ctx)
    case 'spacecraft': return new Spacecraft(render, ctx)
  }
}
