import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, ConeGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh,
  MeshStandardMaterial, PlaneGeometry, Quaternion, ShaderMaterial, Vector3, type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { fbm3 } from '../core/noise'
import { COMA_FRAG, DUST_TAIL_FRAG, ION_TAIL_FRAG, TAIL_VERT } from '../shaders/comet'
import { GLOW_VERT } from '../shaders/galaxy'
import { facingPoint } from './anchors'
import type { BodyContext, BodyView, SpaceBody } from './types'
import { loadGlb } from './gltf'
import { addSurfaceDetail } from './surfaceDetail'

type CometRender = Extract<ObjectRender, { kind: 'comet' }>

/** Marker positions: along the ion tail and the dust tail (share of the tail length), out in the coma (nucleus radii). */
const ION_MARK = 0.55
const DUST_MARK = 0.45
const COMA_MARK = 3.2
/** Nucleus radius in world units. Tails are hundreds of thousands of times longer in reality; here ~30×. */
const NUCLEUS_RADIUS = 0.35
/**
 * Rock detail tiles across the nucleus radius. With the second octave, fractures run from a tenth of the
 * radius down to a few hundredths; fewer tiles make the nucleus look like a smooth pebble.
 */
const NUCLEUS_DETAIL_TILES = 2.2
/** World length of a tail per unit of `render.tail`. */
const TAIL_UNIT = 3.2
/**
 * Icosahedron subdivisions: thumbnails / full. Each face is cut into (n + 1)² triangles, so 44 ≈ 40k triangles
 * and 20k shared vertices: enough for cliffs at full-screen size, and for the narrow waist of Halley's nucleus.
 * Built once per comet.
 */
const NUCLEUS_DETAIL = { preview: 14, full: 44 }
/** Tails up to this length (render units) get a head-on framing: their nucleus is the point of interest. */
const NUCLEUS_FOCUS_TAIL = 4
/**
 * Measured nucleus shapes, in public/models/comets/. 67P: ESA/Rosetta/NAVCAM shape model (Nov 2015, 104k
 * triangles, kilometres, spin axis along y), Draco-compressed; CC BY-SA 3.0 IGO, credited on the credits page.
 */
const SHAPE_MODELS = { '67p': '/models/comets/67p.glb' } as const
/**
 * Halley's nucleus as two overlapping ellipsoids (centre, semi-axes, in half-lengths): 15.3 × 7.2 × 7.2 km
 * overall (Vega 1 and Giotto, 1986), elongated, with the slight waist of its "peanut" outline.
 */
const HALLEY_LOBES = [
  { c: new Vector3(-0.25, 0, 0), s: new Vector3(0.75, 0.46, 0.45) },
  { c: new Vector3(0.3, 0.04, 0), s: new Vector3(0.7, 0.42, 0.43) },
]

/** Dust-tail mesh resolution (along × across). */
const FAN_SEGMENTS: [number, number] = [96, 24]

/**
 * A comet near the Sun: a dark nucleus (67P's measured shape, Halley's measured proportions, or a generic lumpy
 * body for comets whose nucleus was never imaged), its coma, a straight blue ion tail
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
  /** Marker points in the root's frame, from the tail geometry; the coma's is placed from the camera. */
  private readonly marks = new Map<string, Vector3>()
  private readonly center = new Vector3()
  private disposed = false

  constructor(render: CometRender, ctx: BodyContext) {
    const length = render.tail * TAIL_UNIT
    const tailDir = ctx.sunDir.clone().negate()
    // The orbit's direction of motion, perpendicular to the Sun line: dust lags behind it.
    const motion = new Vector3().crossVectors(ctx.sunDir, new Vector3(0, 1, 0)).normalize()

    const material = new MeshStandardMaterial({ color: '#4a4541', roughness: 0.95, metalness: 0 })
    addSurfaceDetail(material, { kind: 'rock', scale: NUCLEUS_DETAIL_TILES / NUCLEUS_RADIUS, cavity: true })
    if (render.nucleus === '67p') {
      // Hidden until the file arrives (a few hundred kB): the coma and tails show meanwhile.
      this.nucleus = new Mesh(new BufferGeometry(), material)
      this.nucleus.visible = false
      loadShape(render.nucleus).then((geo) => {
        if (this.disposed) {
          geo.dispose()
          return
        }
        this.nucleus.geometry.dispose()
        this.nucleus.geometry = geo
        this.nucleus.visible = true
        ctx.invalidate()
      }).catch((err) => console.error('[comet] shape model failed to load', SHAPE_MODELS[render.nucleus as '67p'], err))
    } else {
      this.nucleus = new Mesh(buildNucleus(render, ctx.preview ? NUCLEUS_DETAIL.preview : NUCLEUS_DETAIL.full), material)
    }
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

    // Markers: the ion tail straight down the anti-sun line; the dust tail on its fan's centre line, which bends
    // back along the orbit (buildFan); the anti-tail along its spike.
    if (render.ionTail > 0) this.marks.set('ion-tail', tailDir.clone().multiplyScalar(length * ION_MARK))
    if (render.dustTail > 0) {
      const s = DUST_MARK
      this.marks.set('dust-tail', tailDir.clone().multiplyScalar(length * s).addScaledVector(motion, -length * 0.38 * s * s))
    }
    if (render.antiTail) {
      this.marks.set('anti-tail', ctx.sunDir.clone().addScaledVector(motion, 0.25).normalize().multiplyScalar(length * 0.3))
    }

    // Seen from -z the anti-sun side is on the right of the screen, away from the fact panel.
    if (render.tail <= NUCLEUS_FOCUS_TAIL) {
      // Short-tailed comets (67P, 3I) are about their nucleus: frame the head. The nucleus spins (one turn in
      // ~50 s), so 67P shows its "rubber duck" outline and its end-on view in turn.
      this.focus = tailDir.clone().multiplyScalar(NUCLEUS_RADIUS * 1.5)
      this.radius = NUCLEUS_RADIUS * 2.6
      // Light (azimuth ~109°) falls from the side, so the relief reads.
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

  anchor(key: string, camera: PerspectiveCamera, out: Vector3): Vector3 | null {
    this.root.updateWorldMatrix(true, false)
    this.root.getWorldPosition(this.center)
    switch (key) {
      // The nucleus is small and turning: the marker aims at its centre, which is always inside it.
      case 'nucleus': return out.copy(this.center)
      case 'coma': return facingPoint(this.center, NUCLEUS_RADIUS * COMA_MARK, camera, 90, -30, out)
      default: {
        const p = this.marks.get(key)
        return p ? this.root.localToWorld(out.copy(p)) : null
      }
    }
  }

  dispose(): void {
    this.disposed = true
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

/** Decoded shape models, one per file for the page's lifetime (~1 MB each, CPU side); each comet gets a copy. */
const shapeCache = new Map<keyof typeof SHAPE_MODELS, Promise<BufferGeometry>>()

/**
 * A measured nucleus, scaled so its farthest point from the centre of mass sits at NUCLEUS_RADIUS (the same
 * convention as the built nuclei), with smooth normals. The caller owns the returned geometry.
 */
async function loadShape(model: keyof typeof SHAPE_MODELS): Promise<BufferGeometry> {
  let pending = shapeCache.get(model)
  if (!pending) {
    pending = loadGlb(SHAPE_MODELS[model]).then((gltf) => {
      let geo: BufferGeometry | null = null
      gltf.scene.traverse((o) => {
        const mesh = o as Mesh
        if (mesh.isMesh && !geo) geo = mesh.geometry
      })
      if (!geo) throw new Error('no mesh in shape model')
      const g = geo as BufferGeometry
      const pos = g.getAttribute('position') as BufferAttribute
      const v = new Vector3()
      let max = 0
      for (let i = 0; i < pos.count; i++) max = Math.max(max, v.fromBufferAttribute(pos, i).length())
      // The file's origin is the comet's centre of mass (the shape model's body frame): scale about it.
      g.scale(NUCLEUS_RADIUS / max, NUCLEUS_RADIUS / max, NUCLEUS_RADIUS / max)
      g.computeVertexNormals()
      computeCavity(g)
      return g
    })
    shapeCache.set(model, pending)
  }
  return (await pending).clone()
}

/**
 * Nucleus mesh: a sphere whose vertices are pushed to the body's surface along their direction. Irregular nuclei
 * are a lumpy ellipsoid; Halley is the union of two lobes matching its measured proportions. Fractal noise and
 * a few shallow pits add the rough terrain the spacecraft showed.
 */
function buildNucleus(render: CometRender, detail: number): BufferGeometry {
  // The polyhedron comes unindexed (three vertices per triangle), so its normals would come out flat and the
  // relief faceted. Weld it first, without the attributes that differ across the seam.
  const ico = new IcosahedronGeometry(1, detail)
  ico.deleteAttribute('normal')
  ico.deleteAttribute('uv')
  const geo = mergeVertices(ico)
  ico.dispose()
  const pos = geo.getAttribute('position') as BufferAttribute
  const d = new Vector3()
  const seed = render.seed
  let max = 0
  for (let i = 0; i < pos.count; i++) {
    d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize()
    let r: number
    if (render.nucleus === 'halley') {
      r = Math.max(...HALLEY_LOBES.map((l) => ellipsoidExit(d, l.c, l.s)))
      // Broad lumps: Vega's images show an irregular potato, not two clean ellipsoids.
      r *= 1 + 0.08 * fbm3(d.x * 1.3, d.y * 1.3, d.z * 1.3, 3, seed)
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
  computeCavity(geo)
  return geo
}

/** Laplacian smoothing passes for the cavity reference surface: more = wider hollows count as cavities. */
const CAVITY_PASSES = 12
/** Depth below the smoothed surface (in nucleus radii) that reaches full darkness. */
const CAVITY_DEPTH = 0.06
/** Darkest a hollow gets (0 = black): comets are lit by one sun, so pits are deep in shadow but not void. */
const CAVITY_FLOOR = 0.4

/**
 * Stores in `aCavity` how open each vertex is to the sky: 1 on ridges and plains, down to CAVITY_FLOOR at the
 * bottom of pits, the neck of 67P and under overhangs. Measured as the depth of the vertex below a smoothed
 * copy of the surface, along its normal: a cheap stand-in for ambient occlusion, computed once per shape
 * (about 20 ms for 67P's 52k vertices). Needs an indexed geometry with normals.
 */
function computeCavity(geo: BufferGeometry): void {
  const pos = geo.getAttribute('position') as BufferAttribute
  const nrm = geo.getAttribute('normal') as BufferAttribute
  const index = geo.getIndex()
  const n = pos.count
  const cavity = new Float32Array(n).fill(1)
  if (!index) {
    geo.setAttribute('aCavity', new BufferAttribute(cavity, 1))
    return
  }
  // Each triangle edge links two vertices, both ways.
  const idx = index.array
  const deg = new Uint32Array(n)
  for (let i = 0; i < idx.length; i++) deg[idx[i]!]! += 2
  let cur = Float32Array.from(pos.array as ArrayLike<number>)
  let next = new Float32Array(n * 3)
  for (let pass = 0; pass < CAVITY_PASSES; pass++) {
    next.fill(0)
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t]!, b = idx[t + 1]!, c = idx[t + 2]!
      for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
        next[u * 3]! += cur[v * 3]!; next[u * 3 + 1]! += cur[v * 3 + 1]!; next[u * 3 + 2]! += cur[v * 3 + 2]!
        next[v * 3]! += cur[u * 3]!; next[v * 3 + 1]! += cur[u * 3 + 1]!; next[v * 3 + 2]! += cur[u * 3 + 2]!
      }
    }
    for (let i = 0; i < n; i++) {
      const d = deg[i] || 1
      next[i * 3]! /= d; next[i * 3 + 1]! /= d; next[i * 3 + 2]! /= d
    }
    ;[cur, next] = [next, cur]
  }
  for (let i = 0; i < n; i++) {
    const dx = cur[i * 3]! - pos.getX(i), dy = cur[i * 3 + 1]! - pos.getY(i), dz = cur[i * 3 + 2]! - pos.getZ(i)
    // Positive when the smoothed surface lies outside the vertex: the vertex sits in a hollow.
    const depth = (dx * nrm.getX(i) + dy * nrm.getY(i) + dz * nrm.getZ(i)) / NUCLEUS_RADIUS
    cavity[i] = 1 - (1 - CAVITY_FLOOR) * Math.min(1, Math.max(0, depth / CAVITY_DEPTH))
  }
  geo.setAttribute('aCavity', new BufferAttribute(cavity, 1))
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
