import { AmbientLight, DirectionalLight, Group, Vector3 } from 'three'

/**
 * Direction towards the light for every catalogue object: from the right, a little above and in front.
 * Comet tails are built opposite to it, so it also sets which way they stream.
 */
export const SUN_DIRECTION = new Vector3(0.92, 0.22, -0.32).normalize()
/** Direct sunlight on the models, and the faint fill that keeps their shadow side from going pure black. */
const SUN_INTENSITY = 3.2
const FILL_INTENSITY = 0.12

/** Lights for the objects that use standard materials (spacecraft, comet nuclei). Shader bodies light themselves. */
export function createLights(): Group {
  const g = new Group()
  const sun = new DirectionalLight('#fff6ea', SUN_INTENSITY)
  // A directional light shines from its position towards its target (the origin by default).
  sun.position.copy(SUN_DIRECTION).multiplyScalar(100)
  g.add(sun, sun.target, new AmbientLight('#8fa4c8', FILL_INTENSITY))
  return g
}
