import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, ConeGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh,
  MeshStandardMaterial, PlaneGeometry, Quaternion, ShaderMaterial, Vector3, type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { fbm3 } from '../core/noise'
import { COMA_FRAG, DUST_TAIL_FRAG, ION_TAIL_FRAG, TAIL_VERT } from '../shaders/comet'
import { GLOW_VERT } from '../shaders/galaxy'
import type { BodyContext, BodyView, SpaceBody } from './types'

type CometRender = Extract<ObjectRender, { kind: 'comet' }>

/** Nucleus radius in world units. Tails are hundreds of thousands of times longer in reality; here ~30×. */
const NUCLEUS_RADIUS = 0.35
/** World length of a tail per unit of `render.tail`. */
const TAIL_UNIT = 3.2
/** Icosahedron subdivisions: thumbnails / full. 6 = 40k vertices, enough for cliffs at full-screen size. */
const NUCLEUS_DETAIL = { preview: 4, full: 6 }
/** Tails up to this length (render units) get a head-on framing: their nucleus is the point of interest. */
const NUCLEUS_FOCUS_TAIL = 4
/** Dust-tail mesh resolution (along × across). */
const FAN_SEGMENTS: [number, number] = [96, 24]

/**
 * A comet near the Sun: a dark nucleus (irregular, or two-lobed like 67P), its coma, a straight blue ion tail
 * pushed away by the solar wind and a broader curved dust tail lagging along the orbit.
 */
export class Comet implements SpaceBody {
  readonly root = new Group()
  readonly radius: number
  readonly view: BodyView
  readonly minDistance: number
  readonly animated = true
  /** The camera aims part-way down the tail rather than at the nucleus, so head and tail share the frame. */
  readonly focus: Vector3

  private readonly nucleus: Mesh<BufferGeometry, MeshStandardMaterial>
  private readonly coma: Mesh<PlaneGeometry, ShaderMaterial>
  private readonly tails: Mesh<BufferGeometry, ShaderMaterial>[] = []
  private readonly ionU: { uColor: { value: Color }; uI: { value: number }; uTime: { value: number } }
  private readonly parentQ = new Quaternion()
  private readonly spinAxis = new Vector3(0.3, 1, 0.1).normalize()

  constructor(render: CometRender, ctx: BodyContext) {
    const length = render.tail * TAIL_UNIT
    const tailDir = ctx.sunDir.clone().negate()
    // The orbit's direction of motion, perpendicular to the Sun line: dust lags behind it.
    const motion = new Vector3().crossVectors(ctx.sunDir, new Vector3(0, 1, 0)).normalize()

    this.nucleus = new Mesh(
      buildNucleus(render, ctx.preview ? NUCLEUS_DETAIL.preview : NUCLEUS_DETAIL.full),
      new MeshStandardMaterial({ color: '#4a4541', roughness: 0.95, metalness: 0 }),
    )
    this.root.add(this.nucleus)

    const coma = new Color(render.comaColor)
    this.coma = new Mesh(new PlaneGeometry(NUCLEUS_RADIUS * 14, NUCLEUS_RADIUS * 14), new ShaderMaterial({
      vertexShader: GLOW_VERT, fragmentShader: COMA_FRAG,
      uniforms: { uColor: { value: coma.clone() }, uI: { value: render.tail <= NUCLEUS_FOCUS_TAIL ? 0.25 : 0.55 } },
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    }))
    this.coma.renderOrder = 2
    this.root.add(this.coma)

    this.ionU = { uColor: { value: new Color('#6fa2ff') }, uI: { value: render.ionTail * 1.6 }, uTime: { value: 0 } }
    if (render.ionTail > 0) {
      const geo = new ConeGeometry(length * 0.045, length * 1.15, 32, 64, true)
      geo.translate(0, -length * 0.575, 0)
      // Apex at the head (uv.y must be 0 there for the shader): flip uvs, then aim along the anti-sun line.
      flipV(geo)
      const tail = new Mesh(geo, new ShaderMaterial({
        vertexShader: TAIL_VERT, fragmentShader: ION_TAIL_FRAG, uniforms: this.ionU,
        transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      }))
      tail.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), tailDir)
      this.addTail(tail)
    }

    if (render.dustTail > 0) {
      const dust = new Color(render.comaColor).lerp(new Color('#fff2d6'), 0.5)
      const mat = new ShaderMaterial({
        vertexShader: TAIL_VERT, fragmentShader: DUST_TAIL_FRAG,
        uniforms: { uColor: { value: dust }, uI: { value: render.dustTail * 1.2 } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      })
      // Two crossed sheets: a single flat fan vanishes when seen edge-on.
      const up = new Vector3().crossVectors(tailDir, motion).normalize()
      this.addTail(new Mesh(buildFan(tailDir, motion, motion, length, 1), mat))
      this.addTail(new Mesh(buildFan(tailDir, motion, up, length, 0.45), mat))
    }

    if (render.antiTail) {
      const geo = new ConeGeometry(length * 0.012, length * 0.45, 16, 16, true)
      geo.translate(0, -length * 0.225, 0)
      flipV(geo)
      const spike = new Mesh(geo, new ShaderMaterial({
        vertexShader: TAIL_VERT, fragmentShader: ION_TAIL_FRAG,
        uniforms: { uColor: { value: new Color('#ffe9c8') }, uI: { value: 1.1 }, uTime: { value: 0 } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      }))
      // Seen from Earth it points sunwards, slightly off the Sun line: dust left behind in the orbital plane.
      spike.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), ctx.sunDir.clone().addScaledVector(motion, 0.25).normalize())
      this.addTail(spike)
    }

    // Seen from -z the anti-sun side is on the right of the screen, away from the fact panel.
    if (render.tail <= NUCLEUS_FOCUS_TAIL) {
      // Short-tailed comets (67P, 3I) are about their nucleus: frame the head.
      this.focus = tailDir.clone().multiplyScalar(NUCLEUS_RADIUS * 1.5)
      this.radius = NUCLEUS_RADIUS * 2.6
      // Seen across the long axis, so 67P's two lobes read; light (azimuth ~109°) falls from the side.
      this.view = { elevationDeg: 16, azimuthDeg: 160, distance: 4.5 }
    } else {
      this.focus = tailDir.clone().multiplyScalar(length * 0.3)
      this.radius = length * 0.55
      this.view = { elevationDeg: 12, azimuthDeg: 190, distance: 3.2 }
    }
    this.minDistance = (NUCLEUS_RADIUS * 3) / this.radius
  }

  private addTail(mesh: Mesh<BufferGeometry, ShaderMaterial>): void {
    mesh.renderOrder = 1
    this.tails.push(mesh)
    this.root.add(mesh)
  }

  update(dt: number, time: number, camera: PerspectiveCamera): void {
    this.nucleus.rotateOnAxis(this.spinAxis, dt * 0.12)
    this.ionU.uTime.value = time
    this.root.updateWorldMatrix(true, false)
    this.root.getWorldQuaternion(this.parentQ).invert()
    this.coma.quaternion.copy(camera.quaternion).premultiply(this.parentQ)
  }

  dispose(): void {
    this.nucleus.geometry.dispose()
    this.nucleus.material.dispose()
    this.coma.geometry.dispose()
    this.coma.material.dispose()
    const mats = new Set<ShaderMaterial>()
    for (const t of this.tails) {
      t.geometry.dispose()
      mats.add(t.material)
    }
    mats.forEach((m) => m.dispose())
    this.root.removeFromParent()
  }
}

function flipV(geo: BufferGeometry): void {
  const uv = geo.getAttribute('uv') as BufferAttribute
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i))
  uv.needsUpdate = true
}

/** Distance from the origin to the far surface of an ellipsoid along a unit direction, or 0 when missed. */
function ellipsoidExit(d: Vector3, center: Vector3, semi: Vector3): number {
  // Solve |(o + t·d − c) / s|² = 1 with o = 0.
  const ox = -center.x / semi.x, oy = -center.y / semi.y, oz = -center.z / semi.z
  const dx = d.x / semi.x, dy = d.y / semi.y, dz = d.z / semi.z
  const a = dx * dx + dy * dy + dz * dz
  const b = 2 * (ox * dx + oy * dy + oz * dz)
  const c = ox * ox + oy * oy + oz * oz - 1
  const disc = b * b - 4 * a * c
  if (disc < 0) return 0
  return Math.max(0, (-b + Math.sqrt(disc)) / (2 * a))
}

/**
 * Nucleus mesh: a sphere whose vertices are pushed to the body's surface along their direction. Irregular nuclei
 * are a lumpy ellipsoid; 67P is the union of its two measured lobes (4.1 × 3.3 × 1.8 and 2.6 × 2.3 × 1.8 km).
 * Fractal noise and a few shallow pits add the rough terrain Rosetta showed.
 */
function buildNucleus(render: CometRender, detail: number): BufferGeometry {
  const geo = new IcosahedronGeometry(1, detail)
  const pos = geo.getAttribute('position') as BufferAttribute
  const d = new Vector3()
  const seed = render.seed
  const big = { c: new Vector3(-0.35, 0, 0), s: new Vector3(0.79, 0.63, 0.35) }
  const small = { c: new Vector3(0.78, 0.18, 0), s: new Vector3(0.5, 0.44, 0.35) }
  let max = 0
  for (let i = 0; i < pos.count; i++) {
    d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize()
    let r: number
    if (render.nucleus === 'bilobed') {
      r = Math.max(ellipsoidExit(d, big.c, big.s), ellipsoidExit(d, small.c, small.s))
    } else {
      r = 1 / Math.sqrt((d.x / 1) ** 2 + (d.y / 0.62) ** 2 + (d.z / 0.72) ** 2)
      r *= 1 + 0.18 * fbm3(d.x * 1.3, d.y * 1.3, d.z * 1.3, 3, seed)
    }
    // Terrain: rolling fractal relief, then terraced pits (ridged noise inverted).
    const n = fbm3(d.x * 4, d.y * 4, d.z * 4, 5, seed + 7)
    const pit = Math.max(0, fbm3(d.x * 7, d.y * 7, d.z * 7, 2, seed + 13) - 0.35)
    r *= 1 + 0.05 * n - 0.12 * pit
    pos.setXYZ(i, d.x * r, d.y * r, d.z * r)
    max = Math.max(max, r)
  }
  const k = NUCLEUS_RADIUS / max
  for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k)
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

/**
 * Dust tail sheet: a fan that widens and curves away from the anti-sun line towards the trailing side of the
 * orbit (dust grains are slower than the gas, so they fall behind). `across` sets the sheet's plane.
 */
function buildFan(tailDir: Vector3, motion: Vector3, across: Vector3, length: number, widthScale: number): BufferGeometry {
  const [nu, nv] = FAN_SEGMENTS
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const p = new Vector3()
  for (let i = 0; i <= nu; i++) {
    const s = i / nu
    const center = tailDir.clone().multiplyScalar(length * s).addScaledVector(motion, -length * 0.38 * s * s)
    const width = (0.15 + length * 0.2 * s) * widthScale
    for (let j = 0; j <= nv; j++) {
      const u = j / nv
      p.copy(center).addScaledVector(across, (u - 0.5) * width)
      pos.push(p.x, p.y, p.z)
      uv.push(u, s)
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + nv + 1
    idx.push(a, b, a + 1, a + 1, b, b + 1)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}
