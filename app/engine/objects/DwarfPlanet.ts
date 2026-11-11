import {
  AdditiveBlending, Color, DoubleSide, Group, Mesh, RingGeometry, ShaderMaterial, type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { Planet } from '../bodies/Planet'
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
  readonly view: BodyView = { elevationDeg: 12, azimuthDeg: 70, distance: 7.5 }
  readonly minDistance = 1.35
  readonly animated = true

  private readonly planet: Planet
  /** Holds the ellipsoid scale: the planet itself must stay a sphere for its shaders. */
  private readonly shape = new Group()
  private readonly ring: Mesh<RingGeometry, ShaderMaterial> | null = null
  private readonly spin: number

  constructor(render: DwarfRender, ctx: BodyContext) {
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

  dispose(): void {
    this.planet.dispose()
    this.ring?.geometry.dispose()
    this.ring?.material.dispose()
    this.root.removeFromParent()
  }
}
