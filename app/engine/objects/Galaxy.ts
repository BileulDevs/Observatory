import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CircleGeometry, Color, CustomBlending, DoubleSide, Group, Mesh, PlaneGeometry,
  OneMinusSrcColorFactor, Points, Quaternion, ShaderMaterial, Vector2, ZeroFactor, type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { fbm3, gaussian } from '../core/noise'
import { mulberry32 } from '../core/random'
import { GALAXY_FRAG, GALAXY_VERT, GLOW_FRAG, GLOW_VERT } from '../shaders/galaxy'
import { viewHeightOf, type BodyContext, type BodyView, type SpaceBody } from './types'

type GalaxyRender = Extract<ObjectRender, { kind: 'galaxy' }>

/** Star points: thumbnails / low tier / desktop. Below ~60k the arms look granular when zoomed in. */
const STAR_COUNT = { preview: 26000, low: 90000, high: 220000 }
/** Dust points relative to stars. */
const DUST_RATIO = 0.22
/** Default galaxy radius in world units. */
const GALAXY_RADIUS = 10
/** Rigid rotation, radians per second: a slow drift that shows the disk is three-dimensional. */
const SPIN = 0.018
/** HII region pink: ionised hydrogen (H-alpha) around young clusters. */
const HII = new Color('#ff7aa6')
/**
 * Fraction of light each dust point absorbs, per channel. Dust dims blue more than red (reddening), so what
 * shows through turns warmer, as in real dust lanes.
 */
const DUST = new Color('#8c9ab8')
/** Brightness of the diffuse disk glow under the star points. */
const DISK_GLOW = 0.22

interface Cloud {
  pos: number[]
  col: number[]
  size: number[]
}

export interface GalaxyOptions {
  /** Radius in world units (a quasar host is drawn much larger and fainter). */
  radius?: number
  intensity?: number
}

/**
 * A galaxy as a cloud of stars generated from its morphology: logarithmic spiral arms with young blue stars and
 * pink star-forming regions, an old yellow bulge, a bar, dust lanes that absorb light, or a smooth elliptical.
 */
export class Galaxy implements SpaceBody {
  readonly root = new Group()
  readonly radius: number
  readonly view: BodyView
  readonly minDistance = 0.25
  readonly animated = true

  private readonly stars: Points<BufferGeometry, ShaderMaterial>
  private readonly dust: Points<BufferGeometry, ShaderMaterial> | null
  private readonly glow: Mesh<PlaneGeometry, ShaderMaterial>
  private readonly pointU: { uPR: { value: number }; uViewH: { value: number }; uI: { value: number } }
  private readonly dustU: { uPR: { value: number }; uViewH: { value: number }; uI: { value: number } }
  private readonly parentQ = new Quaternion()
  private readonly disk: Mesh<CircleGeometry, ShaderMaterial> | null

  constructor(render: GalaxyRender, ctx: BodyContext, opts: GalaxyOptions = {}) {
    const R = opts.radius ?? GALAXY_RADIUS
    this.radius = R
    const count = ctx.preview ? STAR_COUNT.preview : ctx.quality.tier === 'low' ? STAR_COUNT.low : STAR_COUNT.high
    const rnd = mulberry32(render.seed * 7919 + 1)
    const stars: Cloud = { pos: [], col: [], size: [] }
    const dust: Cloud = { pos: [], col: [], size: [] }
    const core = new Color(render.core)
    const arm = new Color(render.arm)

    switch (render.morphology) {
      case 'elliptical': buildElliptical(stars, R, count, rnd, core); break
      case 'sombrero': buildSombrero(stars, dust, R, count, rnd, core, arm); break
      case 'magellanic': buildMagellanic(stars, dust, R, count, rnd, core, arm, render.seed); break
      default: buildSpiral(stars, dust, R, count, rnd, core, arm, render)
    }

    const pr = Math.min(window.devicePixelRatio, ctx.quality.maxPixelRatio)
    this.pointU = { uPR: { value: pr }, uViewH: { value: 800 }, uI: { value: (opts.intensity ?? 1) * 1.0 } }
    this.dustU = { uPR: { value: pr }, uViewH: { value: 800 }, uI: { value: render.dust } }
    this.stars = new Points(toGeometry(stars), new ShaderMaterial({
      vertexShader: GALAXY_VERT, fragmentShader: GALAXY_FRAG, uniforms: this.pointU,
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    }))
    this.root.add(this.stars)

    this.dust = dust.pos.length ? new Points(toGeometry(dust), new ShaderMaterial({
      vertexShader: GALAXY_VERT, fragmentShader: GALAXY_FRAG, uniforms: this.dustU,
      transparent: true, depthWrite: false,
      // Dust absorbs: destination × (1 − source), per channel. A subtraction went negative in the HDR target and
      // came out as false colours. Drawn after the stars so it dims what lies behind it.
      blending: CustomBlending, blendSrc: ZeroFactor, blendDst: OneMinusSrcColorFactor,
    })) : null
    if (this.dust) {
      this.dust.renderOrder = 1
      this.root.add(this.dust)
    }

    // Diffuse disk light: the billions of unresolved stars between the points. Without it the disk looks like
    // sprinkled sand on black.
    const flat = render.morphology !== 'elliptical'
    this.disk = flat ? new Mesh(new CircleGeometry(R * 1.05, 96), new ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
      uniforms: {
        uColor: { value: core.clone().lerp(arm, 0.35) },
        uI: { value: (opts.intensity ?? 1) * DISK_GLOW },
        uStretch: { value: new Vector2(1, 1) },
      },
      transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    })) : null
    if (this.disk) {
      this.disk.rotation.x = -Math.PI / 2
      // Diffuse light first, then stars, then dust: dust must dim the glow too, or lanes vanish under it.
      this.disk.renderOrder = -1
      this.root.add(this.disk)
    }

    const bulge = render.morphology === 'sombrero' ? 0.62 : render.morphology === 'elliptical' ? 0.9 : 0.3
    this.glow = new Mesh(new PlaneGeometry(R * 2 * bulge, R * 2 * bulge), new ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
      uniforms: {
        uColor: { value: core.clone() },
        uI: { value: (opts.intensity ?? 1) * (render.morphology === 'elliptical' ? 0.55 : render.morphology === 'sombrero' ? 0.45 : 0.7) },
        uStretch: { value: new Vector2(1, 1) },
      },
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    }))
    this.glow.renderOrder = -1
    this.root.add(this.glow)

    this.view = { elevationDeg: render.viewElevationDeg ?? 40, azimuthDeg: 20, distance: 3.1 }
  }

  update(dt: number, _time: number, camera: PerspectiveCamera): void {
    this.stars.rotation.y += dt * SPIN
    if (this.dust) this.dust.rotation.y = this.stars.rotation.y
    // Billboard: the bulge glow always faces the camera, whatever the parent's orientation.
    this.root.updateWorldMatrix(true, false)
    this.root.getWorldQuaternion(this.parentQ).invert()
    this.glow.quaternion.copy(camera.quaternion).premultiply(this.parentQ)
    // Point sizes are projected with the height of the viewport this camera renders into (see viewHeightOf).
    this.pointU.uViewH.value = viewHeightOf(camera)
    this.dustU.uViewH.value = this.pointU.uViewH.value
  }

  dispose(): void {
    this.stars.geometry.dispose()
    this.stars.material.dispose()
    this.dust?.geometry.dispose()
    this.dust?.material.dispose()
    this.glow.geometry.dispose()
    this.glow.material.dispose()
    this.disk?.geometry.dispose()
    this.disk?.material.dispose()
    this.root.removeFromParent()
  }
}

/**
 * Global point size and brightness scale. Smaller, more numerous points read as a smooth stellar disk; larger
 * ones as sand. Changing SIZE alone also changes overall brightness (each sprite covers more pixels).
 */
const POINT_SIZE = 0.6
const POINT_BRIGHTNESS = 0.85

function push(cloud: Cloud, x: number, y: number, z: number, c: Color, brightness: number, size: number): void {
  const b = brightness * POINT_BRIGHTNESS
  cloud.pos.push(x, y, z)
  cloud.col.push(c.r * b, c.g * b, c.b * b)
  cloud.size.push(size * POINT_SIZE)
}

function toGeometry(cloud: Cloud): BufferGeometry {
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(cloud.pos), 3))
  geo.setAttribute('aColor', new BufferAttribute(new Float32Array(cloud.col), 3))
  geo.setAttribute('aSize', new BufferAttribute(new Float32Array(cloud.size), 1))
  geo.computeBoundingSphere()
  return geo
}

/** Exponential disk radius (scale length h), truncated at rMax. */
function diskRadius(rnd: () => number, h: number, rMax: number): number {
  for (let i = 0; i < 8; i++) {
    const r = -h * Math.log(Math.max(rnd(), 1e-6))
    if (r < rMax) return r
  }
  return rnd() * rMax
}

const tmpC = new Color()

/**
 * Spiral galaxies. Arms follow logarithmic spirals θ = θₖ + twist · ln(r/r₀) / ln(R/r₀), starting from the bar
 * ends when there is a bar. Stars on arms are young and bluer; HII knots and dust lanes trace the arms' inner edge.
 */
function buildSpiral(stars: Cloud, dust: Cloud, R: number, count: number, rnd: () => number, core: Color, arm: Color, render: GalaxyRender): void {
  const barred = render.morphology === 'barred-spiral'
  const grand = render.morphology === 'grand-design'
  const h = R / 3.2
  const r0 = barred ? R * 0.28 : R * 0.08
  const arms = Math.max(1, render.arms)
  const armShare = grand ? 0.78 : 0.62
  const bulgeShare = barred ? 0.12 : 0.16
  const barShare = barred ? 0.1 : 0
  const angleAt = (r: number, k: number) =>
    (k / arms) * Math.PI * 2 + render.twist * Math.log(Math.max(r, r0) / r0) / Math.log(R / r0)

  for (let i = 0; i < count; i++) {
    const u = rnd()
    if (u < bulgeShare) {
      // Old, warm, centrally concentrated.
      const r = Math.abs(gaussian(rnd)) * R * 0.09
      const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1)
      tmpC.copy(core).lerp(new Color('#ffcf8a'), rnd() * 0.4)
      push(stars, r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.65, r * Math.sin(ph) * Math.sin(th), tmpC, 0.9 + rnd() * 0.5, 0.03 + rnd() * 0.04)
      continue
    }
    if (u < bulgeShare + barShare) {
      const x = gaussian(rnd) * r0 * 0.55
      const z = gaussian(rnd) * r0 * 0.14
      const y = gaussian(rnd) * r0 * 0.08
      tmpC.copy(core).lerp(arm, rnd() * 0.15)
      push(stars, x, y, z, tmpC, 0.8 + rnd() * 0.4, 0.03 + rnd() * 0.04)
      continue
    }
    const r = barred ? r0 + diskRadius(rnd, h, R - r0) : diskRadius(rnd, h, R)
    const onArm = rnd() < armShare
    const k = Math.floor(rnd() * arms)
    // Arms widen outwards; a grand-design galaxy keeps them narrow.
    const width = (grand ? 0.05 : 0.09) * R * (0.4 + r / R)
    let th: number
    let offset = 0
    if (onArm) {
      offset = gaussian(rnd) * width
      th = angleAt(r, k) + offset / Math.max(r, 0.3)
    } else {
      th = rnd() * Math.PI * 2
    }
    const thick = R * 0.012 * (1 + 2 * Math.exp(-r / (R * 0.15)))
    const y = gaussian(rnd) * thick
    const x = r * Math.cos(th), z = r * Math.sin(th)
    const young = onArm ? Math.exp(-Math.abs(offset) / (width * 0.7)) : 0.15
    tmpC.copy(core).lerp(arm, Math.min(1, young * 0.9 + r / R * 0.4))
    const b = (0.35 + 0.65 * young) * (0.7 + rnd() * 0.6)
    push(stars, x, y, z, tmpC, b, 0.02 + rnd() * 0.035 + young * 0.02)

    // Star-forming knots: a few bright pink clumps strung along the arms.
    if (onArm && young > 0.6 && rnd() < 0.012) {
      const n = 6 + Math.floor(rnd() * 10)
      for (let j = 0; j < n; j++) {
        push(stars, x + gaussian(rnd) * R * 0.012, y + gaussian(rnd) * thick * 0.5, z + gaussian(rnd) * R * 0.012, HII, 0.9 + rnd() * 0.8, 0.03 + rnd() * 0.05)
      }
    }
    // Dust: on the inner (trailing) edge of each arm, dense near the centre.
    if (onArm && rnd() < 0.42 * render.dust) {
      const dth = angleAt(r, k) - (width * 0.9) / Math.max(r, 0.3)
      const dr = r * (1 + gaussian(rnd) * 0.03)
      tmpC.copy(DUST)
      push(dust, dr * Math.cos(dth), gaussian(rnd) * thick * 0.6, dr * Math.sin(dth), tmpC, 0.05 + rnd() * 0.06, 0.08 + rnd() * 0.1)
    }
  }

  if (render.companion) {
    // NGC 5195 at the tip of an arm, joined by a tidal bridge.
    const tipR = R * 1.12
    const tipA = angleAt(R, 0) + 0.3
    const cx = tipR * Math.cos(tipA), cz = tipR * Math.sin(tipA)
    const n = Math.floor(count * 0.08)
    for (let i = 0; i < n; i++) {
      const r = Math.abs(gaussian(rnd)) * R * 0.1
      const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1)
      tmpC.copy(core).lerp(new Color('#ffc78a'), 0.3)
      push(stars, cx + r * Math.sin(ph) * Math.cos(th), R * 0.06 + r * Math.cos(ph) * 0.7, cz + r * Math.sin(ph) * Math.sin(th), tmpC, 0.9 + rnd() * 0.5, 0.03 + rnd() * 0.04)
    }
    for (let i = 0; i < n * 0.5; i++) {
      const t = rnd()
      const r = R * (0.8 + 0.32 * t)
      const th = angleAt(r, 0) + t * 0.3 + gaussian(rnd) * 0.04
      push(dust, r * Math.cos(th), R * 0.03 * t, r * Math.sin(th), DUST, 0.05 * render.dust, 0.1 + rnd() * 0.1)
    }
  }
}

/** Elliptical: a smooth triaxial cloud with a Hernquist-like profile, plus globular clusters around it. */
function buildElliptical(stars: Cloud, R: number, count: number, rnd: () => number, core: Color): void {
  const a = R * 0.16
  for (let i = 0; i < count; i++) {
    const s = Math.sqrt(rnd())
    const r = Math.min((a * s) / (1 - s * 0.985), R * 1.2)
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1)
    tmpC.copy(core).lerp(new Color('#ffb877'), rnd() * 0.35)
    push(stars, r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.78, r * Math.sin(ph) * Math.sin(th) * 0.88, tmpC, 0.5 + rnd() * 0.5, 0.025 + rnd() * 0.035)
  }
  for (let i = 0; i < 260; i++) {
    const r = R * (0.2 + rnd() * 1.1)
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1)
    push(stars, r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th), core, 1.6, 0.06)
  }
}

/** Sombrero: a dominant bulge and a thin disk whose ring of dust crosses it, nearly edge-on. */
function buildSombrero(stars: Cloud, dust: Cloud, R: number, count: number, rnd: () => number, core: Color, arm: Color): void {
  const bulgeN = Math.floor(count * 0.55)
  for (let i = 0; i < bulgeN; i++) {
    const s = Math.sqrt(rnd())
    const r = Math.min((R * 0.13 * s) / (1 - s * 0.97), R * 0.95)
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1)
    tmpC.copy(core).lerp(new Color('#ffd49a'), rnd() * 0.3)
    push(stars, r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.62, r * Math.sin(ph) * Math.sin(th), tmpC, 0.28 + rnd() * 0.3, 0.025 + rnd() * 0.03)
  }
  for (let i = bulgeN; i < count; i++) {
    const r = R * (0.45 + 0.6 * Math.sqrt(rnd()))
    const th = rnd() * Math.PI * 2
    tmpC.copy(arm).lerp(core, rnd() * 0.5)
    push(stars, r * Math.cos(th), gaussian(rnd) * R * 0.012, r * Math.sin(th), tmpC, 0.4 + rnd() * 0.4, 0.02 + rnd() * 0.03)
  }
  // The famous dust lane: a dense ring, slightly inside the stellar disk's edge.
  const dustN = Math.floor(count * 0.3)
  for (let i = 0; i < dustN; i++) {
    const r = R * (0.55 + 0.4 * rnd())
    const th = rnd() * Math.PI * 2
    push(dust, r * Math.cos(th), gaussian(rnd) * R * 0.01, r * Math.sin(th), DUST, 0.3 + rnd() * 0.2, 0.14 + rnd() * 0.12)
  }
}

/** Magellanic irregular: off-centre bar, one stubby arm, clumpy star formation and the Tarantula's pink glow. */
function buildMagellanic(stars: Cloud, dust: Cloud, R: number, count: number, rnd: () => number, core: Color, arm: Color, seed: number): void {
  const barA = 0.35
  for (let i = 0; i < count; i++) {
    const u = rnd()
    let x: number, z: number
    if (u < 0.3) {
      // Bar, tilted and off-centre.
      const bx = gaussian(rnd) * R * 0.32, bz = gaussian(rnd) * R * 0.07
      x = bx * Math.cos(barA) - bz * Math.sin(barA) - R * 0.12
      z = bx * Math.sin(barA) + bz * Math.cos(barA)
    } else {
      // Clumpy disk: rejection sampling against fractal noise.
      x = (rnd() * 2 - 1) * R
      z = (rnd() * 2 - 1) * R
      const d = Math.hypot(x, z) / R
      const n = fbm3(x * 0.25, 0, z * 0.25, 4, seed) * 0.5 + 0.5
      if (d > 1 || rnd() > n * n * 1.6 * (1 - d)) { i--; continue }
    }
    const y = gaussian(rnd) * R * 0.03
    const young = rnd()
    tmpC.copy(core).lerp(arm, young)
    push(stars, x, y, z, tmpC, 0.4 + rnd() * 0.6, 0.025 + rnd() * 0.04)
    if (young > 0.97) push(stars, x, y, z, HII, 1.2, 0.05 + rnd() * 0.05)
    if (rnd() < 0.08) push(dust, x + gaussian(rnd) * R * 0.05, y, z + gaussian(rnd) * R * 0.05, DUST, 0.03, 0.12)
  }
  // Tarantula Nebula: the brightest star-forming region of the Local Group.
  for (let i = 0; i < 500; i++) {
    push(stars, R * 0.38 + gaussian(rnd) * R * 0.03, gaussian(rnd) * R * 0.01, -R * 0.22 + gaussian(rnd) * R * 0.03, HII, 1.4 + rnd(), 0.04 + rnd() * 0.05)
  }
}
