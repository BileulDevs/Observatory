import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, CustomBlending, Data3DTexture, Group, LinearFilter, Matrix4,
  Mesh, OneFactor, OneMinusSrcAlphaFactor, Points, RedFormat, RepeatWrapping, ShaderMaterial, SphereGeometry, Vector3,
  type PerspectiveCamera,
} from 'three'
import type { ObjectRender } from '~/types/objects'
import { gaussian } from '../core/noise'
import { mulberry32 } from '../core/random'
import { GALAXY_FRAG, GALAXY_VERT } from '../shaders/galaxy'
import { NEBULA_FRAG, NEBULA_VERT } from '../shaders/nebula'
import { viewHeightOf, type BodyContext, type BodyView, type SpaceBody } from './types'

type NebulaRender = Extract<ObjectRender, { kind: 'nebula' }>

/** Nebula radius in world units. */
const NEBULA_RADIUS = 8
/** Ray-march steps: thumbnails / low tier / desktop. Under ~32 the gas shows layered slices. */
const STEPS = { preview: 30, low: 44, high: 72 }
/** 3D noise texture edge (texels). 64³ = 256 KB; finer only adds memory, the shader stacks octaves anyway. */
const NOISE_SIZE = 64
/** Lattice period of the noise (cells per texture edge): sets the base feature size. */
const NOISE_PERIOD = 8
const SHAPE_INDEX: Record<NebulaRender['shape'], number> = { emission: 0, ring: 1, helix: 2, remnant: 3, pillars: 4, complex: 5 }
/** Overall brightness per shape: thin shells need more gain than big emission clouds. */
const SHAPE_GAIN: Record<NebulaRender['shape'], number> = { emission: 1.0, ring: 0.85, helix: 0.9, remnant: 1.0, pillars: 1.0, complex: 1.6 }

let sharedNoise: Data3DTexture | null = null
let noiseUsers = 0

/**
 * A gaseous nebula drawn as a volume: emission from ionised gas, absorption by dust, embedded stars.
 * The volume is static (gas changes over centuries), so it only re-renders when the camera moves.
 */
export class Nebula implements SpaceBody {
  readonly root = new Group()
  readonly radius = NEBULA_RADIUS
  readonly view: BodyView
  readonly minDistance = 1.15
  readonly animated = false

  private readonly volume: Mesh<SphereGeometry, ShaderMaterial>
  private readonly volumeU
  private readonly stars: Points<BufferGeometry, ShaderMaterial>
  private readonly starU = { uPR: { value: 1 }, uViewH: { value: 800 }, uI: { value: 1 } }
  private readonly invLocal = new Matrix4()

  constructor(render: NebulaRender, ctx: BodyContext) {
    const steps = ctx.preview ? STEPS.preview : ctx.quality.tier === 'low' ? STEPS.low : STEPS.high
    this.volumeU = {
      uNoise: { value: acquireNoise() },
      uCamL: { value: new Vector3() },
      uRadius: { value: NEBULA_RADIUS },
      uC1: { value: new Color(render.palette[0]) },
      uC2: { value: new Color(render.palette[1]) },
      uC3: { value: new Color(render.palette[2]) },
      uSeed: { value: (render.seed % 17) * 0.137 },
      uI: { value: SHAPE_GAIN[render.shape] },
    }
    this.volume = new Mesh(new SphereGeometry(NEBULA_RADIUS, 48, 32), new ShaderMaterial({
      vertexShader: NEBULA_VERT, fragmentShader: NEBULA_FRAG, uniforms: this.volumeU,
      defines: { STEPS: steps, SHAPE: SHAPE_INDEX[render.shape] },
      transparent: true, depthWrite: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
    }))
    this.root.add(this.volume)

    this.starU.uPR.value = Math.min(window.devicePixelRatio, ctx.quality.maxPixelRatio)
    this.stars = new Points(buildStars(render), new ShaderMaterial({
      vertexShader: GALAXY_VERT, fragmentShader: GALAXY_FRAG, uniforms: this.starU,
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    }))
    this.stars.renderOrder = 1
    this.root.add(this.stars)

    // Planetary nebulae and the Crab are seen face-on in famous images; pillars from the front, slightly below.
    const face = render.shape === 'ring' || render.shape === 'helix'
    this.view = { elevationDeg: face ? 8 : render.shape === 'pillars' ? -4 : 10, azimuthDeg: 0, distance: 3.3 }
  }

  update(_dt: number, _time: number, camera: PerspectiveCamera): void {
    this.volume.updateWorldMatrix(true, false)
    this.invLocal.copy(this.volume.matrixWorld).invert()
    this.volumeU.uCamL.value.copy(camera.position).applyMatrix4(this.invLocal)
    this.starU.uViewH.value = viewHeightOf(camera)
  }

  dispose(): void {
    this.volume.geometry.dispose()
    this.volume.material.dispose()
    releaseNoise()
    this.stars.geometry.dispose()
    this.stars.material.dispose()
    this.root.removeFromParent()
  }
}

/**
 * Embedded stars: the ionising sources each nebula is known for, plus a sprinkling of members. Brightness stays
 * near 2: brighter single points make the bloom's separable blur draw a visible cross around them.
 */
function buildStars(render: NebulaRender): BufferGeometry {
  const rnd = mulberry32(render.seed * 53 + 3)
  const pos: number[] = []
  const col: number[] = []
  const size: number[] = []
  const add = (x: number, y: number, z: number, c: Color, b: number, s: number) => {
    pos.push(x * NEBULA_RADIUS, y * NEBULA_RADIUS, z * NEBULA_RADIUS)
    col.push(c.r * b, c.g * b, c.b * b)
    size.push(s)
  }
  const hot = new Color('#cfe0ff')
  const warm = new Color('#ffe6c8')
  switch (render.shape) {
    case 'emission':
      // The Trapezium: four bright stars packed together.
      for (const [x, y] of [[0.05, 0.02], [0.08, 0.04], [0.06, -0.01], [0.03, 0.035]] as const) add(x, y, 0.08, hot, 2.4, 0.09)
      break
    case 'ring':
    case 'helix':
      add(0, 0, 0, hot, 2.2, 0.07)
      break
    case 'remnant':
      add(0.02, 0.01, 0, hot, 2.2, 0.06)
      break
    case 'pillars':
      for (let i = 0; i < 6; i++) add(-0.5 + rnd(), 0.75 + rnd() * 0.2, (rnd() - 0.5) * 0.4, hot, 2, 0.08)
      break
    default:
      add(0.18, 0.08, 0, warm, 2.6, 0.12)
  }
  const members = render.shape === 'ring' || render.shape === 'helix' ? 40 : 260
  for (let i = 0; i < members; i++) {
    const r = Math.abs(gaussian(rnd)) * 0.45
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1)
    add(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th), rnd() < 0.6 ? hot : warm, 0.6 + rnd() * 1.4, 0.035 + rnd() * 0.04)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('aColor', new BufferAttribute(new Float32Array(col), 3))
  geo.setAttribute('aSize', new BufferAttribute(new Float32Array(size), 1))
  return geo
}

/** One noise texture for every nebula on screen (a catalogue tab shows six). Freed with the last user. */
function acquireNoise(): Data3DTexture {
  noiseUsers++
  if (!sharedNoise) sharedNoise = buildNoise()
  return sharedNoise
}

function releaseNoise(): void {
  noiseUsers = Math.max(0, noiseUsers - 1)
  if (noiseUsers === 0 && sharedNoise) {
    sharedNoise.dispose()
    sharedNoise = null
  }
}

/**
 * Tileable smooth value noise in a 64³ R8 texture: a random lattice of NOISE_PERIOD³ cells, smoothstep
 * interpolated with wrap-around, so sampling with RepeatWrapping has no seams.
 */
function buildNoise(): Data3DTexture {
  const P = NOISE_PERIOD
  const rnd = mulberry32(424242)
  const lattice = new Float32Array(P * P * P)
  for (let i = 0; i < lattice.length; i++) lattice[i] = rnd()
  const L = (x: number, y: number, z: number) => lattice[((z % P) * P + (y % P)) * P + (x % P)]!
  const s = (t: number) => t * t * (3 - 2 * t)
  const N = NOISE_SIZE
  const data = new Uint8Array(N * N * N)
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = (x / N) * P, fy = (y / N) * P, fz = (z / N) * P
    const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz)
    const tx = s(fx - ix), ty = s(fy - iy), tz = s(fz - iz)
    let v = 0
    for (let dz = 0; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
      v += (dx ? tx : 1 - tx) * (dy ? ty : 1 - ty) * (dz ? tz : 1 - tz) * L(ix + dx, iy + dy, iz + dz)
    }
    data[(z * N + y) * N + x] = Math.round(v * 255)
  }
  const tex = new Data3DTexture(data, N, N, N)
  tex.format = RedFormat
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.wrapR = RepeatWrapping
  tex.unpackAlignment = 1
  tex.needsUpdate = true
  return tex
}
