import { Vector3, type PerspectiveCamera } from 'three'
import type { ObjectRender } from '~/types/objects'

/**
 * Named points each renderer can place a marker on (the catalogue's "Repères"). A marker in the data names one of
 * its renderer's keys; anchor() then returns that point in world space for the current frame, or null when it is
 * absent from this object (no jets on this hole) or hidden (on the far side of a sphere).
 *
 * The lists are the contract between the data and the renderers: the object page warns (in development) about a
 * marker whose key is not listed for its renderer (ObjectStage.unknownAnchors). Adding a key here without handling it in the renderer leaves
 * its markers silently missing.
 */
export const ANCHOR_KEYS = {
  'black-hole': ['singularity', 'shadow', 'photon-ring', 'disk', 'inner-edge', 'lensed-arc', 'jet', 'companion', 'stream', 'host'],
  'star': ['surface', 'limb', 'corona', 'envelope'],
  'neutron-star': ['star', 'beam', 'field', 'wind-torus', 'wind-jet'],
  'galaxy': ['core', 'bar', 'arm', 'disk-edge', 'companion', 'dust-lane', 'bulge', 'halo', 'tarantula'],
  'nebula': ['trapezium', 'cavity', 'gas-wall', 'central-star', 'rim', 'halo', 'knots', 'pulsar', 'filaments', 'synchrotron', 'pillar', 'massive-stars', 'eta-carinae', 'dust-lane'],
  'comet': ['nucleus', 'coma', 'ion-tail', 'dust-tail', 'anti-tail'],
  // Plus 'uv:<u>,<v>': a point of the surface map, in texture coordinates (see DwarfPlanet).
  'dwarf-planet': ['surface', 'limb', 'ring', 'long-axis'],
  // Per model: see SPACECRAFT_ANCHORS in Spacecraft.ts.
  'spacecraft': ['solar-arrays', 'cupola', 'zarya', 'aperture', 'instruments', 'mirror', 'secondary', 'sunshield', 'dish', 'magnetometer', 'rtg', 'bus', 'tianhe', 'wings', 'platform', 'sphere', 'antennas'],
} as const satisfies Record<ObjectRender['kind'], readonly string[]>

/** Whether a renderer knows a key (the 'uv:' form counts for dwarf planets). */
export function isAnchorKey(kind: ObjectRender['kind'], key: string): boolean {
  if (kind === 'dwarf-planet' && /^uv:[\d.]+,[\d.]+$/.test(key)) return true
  return (ANCHOR_KEYS[kind] as readonly string[]).includes(key)
}

const toCam = new Vector3()
const right = new Vector3()
const upS = new Vector3()
const WORLD_UP = new Vector3(0, 1, 0)

/**
 * A point on a sphere's visible face, placed relative to the camera so it is always in view: `tiltDeg` from the
 * centre of the disc as seen (0 = dead centre, 90 = on the limb), `roundDeg` around it (0 = up, 90 = right).
 * With `lift` > 1 the point leaves the surface along the same screen direction (a corona, a haze).
 */
export function facingPoint(
  center: Vector3, radius: number, camera: PerspectiveCamera, tiltDeg: number, roundDeg: number, out: Vector3, lift = 1,
): Vector3 {
  toCam.subVectors(camera.position, center).normalize()
  right.crossVectors(toCam, WORLD_UP)
  // Looking straight down the world's vertical: any horizontal axis will do.
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
  right.normalize()
  upS.crossVectors(right, toCam).normalize()
  const t = (tiltDeg * Math.PI) / 180
  const r = (roundDeg * Math.PI) / 180
  // right × toCam points up on screen; −right points right (the frame is right-handed with toCam towards us).
  out.copy(upS).multiplyScalar(Math.cos(r)).addScaledVector(right, -Math.sin(r)).multiplyScalar(Math.sin(t))
  out.addScaledVector(toCam, Math.cos(t)).normalize()
  return out.multiplyScalar(radius * lift).add(center)
}

/** True when a point of a sphere's surface faces away from the camera (the marker would float over the front). */
export function onFarSide(point: Vector3, center: Vector3, camera: PerspectiveCamera): boolean {
  toCam.subVectors(camera.position, point)
  right.subVectors(point, center)
  return toCam.dot(right) < 0
}
