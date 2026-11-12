import {
  AdditiveBlending, Color, DoubleSide, Group, Mesh, RingGeometry, ShaderMaterial, Vector3, type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { Planet } from '../bodies/Planet'
import { facingPoint, onFarSide } from './anchors'
import type { BodyContext, BodyView, SpaceBody } from './types'

type DwarfRender = Extract<ObjectRender, { kind: 'dwarf-planet' }>

/** Planet radius in world units. */
const PLANET_RADIUS = 1
/** Cube face size of the full bake in the viewer (capped by the device tier). */
const VIEW_BAKE_RES = 1024
/** Thumbnail bake size. */
const PREVIEW_BAKE_RES = 128
/**
 * On-screen spin, radians per second. Haumea really turns in 3.9 h and the others in days: a single slow rate
 * keeps the surface readable, a little faster for Haumea so its tumbling shape shows.
 */
const SPIN = 0.06
const FAST_SPIN = 0.35

const RING_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uInner;
uniform float uOuter;
varying vec2 vUv;
varying vec3 vPosL;
void main(){
  float r = length(vPosL.xy);
  float t = (r - uInner) / (uOuter - uInner);
  float band = smoothstep(0.0, 0.25, t) * smoothstep(1.0, 0.75, t);
  gl_FragColor = vec4(uColor * band * 0.5, 1.0);
}
`
const RING_VERT = /* glsl */`
varying vec2 vUv;
varying vec3 vPosL;
void main(){ vUv = uv; vPosL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

/**
 * A dwarf planet: the same procedural/textured planet as the system views, lit by the stage's sun, optionally
 * stretched into an ellipsoid (Haumea) and ringed.
 */
export class DwarfPlanet implements SpaceBody {
  readonly root = new Group()
  readonly radius = PLANET_RADIUS
  /** Three-quarter phase: the light comes from azimuth ~109° (see SUN_DIRECTION). */
  readonly view: BodyView
  readonly minDistance = 1.35
  readonly animated = true

  private readonly planet: Planet
  /** Holds the ellipsoid scale: the planet itself must stay a sphere for its shaders. */
  private readonly shape = new Group()
  private readonly ring: Mesh<RingGeometry, ShaderMaterial> | null = null
  private readonly spin: number
  private readonly ringRadius: number | null
  private readonly center = new Vector3()
  private readonly tmp = new Vector3()

  constructor(render: DwarfRender, ctx: BodyContext) {
    this.view = { elevationDeg: render.elevationDeg ?? 12, azimuthDeg: 70, distance: 7.5 }
    const res = ctx.preview ? PREVIEW_BAKE_RES : Math.min(ctx.quality.bakeRes, VIEW_BAKE_RES)
    this.planet = new Planet(ctx.baker, { bakeRes: res, atmosphereSteps: ctx.quality.atmosphereSteps, previewOnly: ctx.preview })
    this.planet.setStyle('natural')
    this.planet.setScale(PLANET_RADIUS)
    this.planet.setSpec(render.planet, undefined, () => ctx.invalidate())
    this.planet.setSunDirection(ctx.sunDir)
    this.shape.add(this.planet.root)
    this.root.add(this.shape)
    if (render.ellipsoid) this.shape.scale.set(...render.ellipsoid)
    this.spin = render.ellipsoid ? FAST_SPIN : SPIN
    this.ringRadius = render.ring?.radius ?? null

    if (render.ring) {
      const inner = render.ring.radius - render.ring.width / 2
      const outer = render.ring.radius + render.ring.width / 2
      this.ring = new Mesh(new RingGeometry(inner, outer, 256, 1), new ShaderMaterial({
        vertexShader: RING_VERT, fragmentShader: RING_FRAG,
        uniforms: { uColor: { value: new Color('#d8d4cc') }, uInner: { value: inner }, uOuter: { value: outer } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      }))
      // In the equatorial plane, which is the plane of the shape's two long axes.
      this.ring.rotation.x = -Math.PI / 2
      this.root.add(this.ring)
    }
  }

  update(dt: number, _time: number, camera: PerspectiveCamera): void {
    // The ellipsoid turns as a whole; the planet inside does not spin on its own.
    this.shape.rotation.y += dt * this.spin
    this.planet.update(dt, camera, false)
  }

  /**
   * Marker points: a point of the visible face and the limb (placed from the camera), the ring, the nearer end of
   * an ellipsoid's long axis, and 'uv:u,v', a point of the surface map given in texture coordinates (read off the
   * map image: u from its left edge, v from its bottom), which turns with the body and hides on the far side.
   */
  anchor(key: string, camera: PerspectiveCamera, out: Vector3): Vector3 | null {
    this.root.updateWorldMatrix(true, true)
    this.root.getWorldPosition(this.center)
    if (key.startsWith('uv:')) {
      const [u, v] = key.slice(3).split(',').map(Number) as [number, number]
      // Inverse of sampleEquirect (shaders/equirect.ts): u = atan(z, −x) / 2π, v = 1 − acos(y) / π.
      const a = 2 * Math.PI * u
      const polar = Math.PI * (1 - v)
      out.set(-Math.cos(a) * Math.sin(polar), Math.cos(polar), Math.sin(a) * Math.sin(polar)).multiplyScalar(PLANET_RADIUS)
      this.planet.root.localToWorld(out)
      return onFarSide(out, this.center, camera) ? null : out
    }
    switch (key) {
      case 'surface': return facingPoint(this.center, PLANET_RADIUS, camera, 35, -40, out)
      case 'limb': return facingPoint(this.center, PLANET_RADIUS, camera, 86, 55, out)
      case 'ring': {
        if (this.ringRadius === null) return null
        // On the ring's near side, to the right of the screen.
        this.tmp.subVectors(camera.position, this.center).setY(0).normalize()
        out.set(-this.tmp.z, 0, this.tmp.x).multiplyScalar(-0.7).addScaledVector(this.tmp, 0.7).normalize()
        return out.multiplyScalar(this.ringRadius).add(this.center)
      }
      case 'long-axis': {
        // Whichever end of the long (x) axis is nearer the camera, so the marker stays on the visible side.
        this.shape.localToWorld(out.set(PLANET_RADIUS, 0, 0))
        this.shape.localToWorld(this.tmp.set(-PLANET_RADIUS, 0, 0))
        return out.distanceToSquared(camera.position) <= this.tmp.distanceToSquared(camera.position) ? out : out.copy(this.tmp)
      }
      default: return null
    }
  }

  dispose(): void {
    this.planet.dispose()
    this.ring?.geometry.dispose()
    this.ring?.material.dispose()
    this.root.removeFromParent()
  }
}
