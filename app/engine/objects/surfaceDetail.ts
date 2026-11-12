import {
  DataTexture, LinearFilter, LinearMipmapLinearFilter, Matrix4, RepeatWrapping, RGBAFormat, UnsignedByteType,
  Vector4, type MeshStandardMaterial, type Object3D,
} from 'three'
import { mulberry32 } from '../core/random'

/**
 * Procedural surface detail for materials that ship without fine texture: the NASA models' flat or low-resolution
 * materials, the plain paint and metal of the built spacecraft, and the comet nucleus.
 *
 * One shared 512² tileable RGBA map carries four greyscale layers, sampled triplanar (no UVs needed) at two
 * scales and blended per material kind:
 * - R: creases, as on crinkled insulation foil or rock fractures;
 * - G: fine "orange peel" noise, as on paint;
 * - B: large soft blotches, used for grime / weathering of the albedo and roughness;
 * - A: thin parallel streaks, as on brushed or rolled metal.
 *
 * The bump is computed from screen-space derivatives of the blended height (Mikkelsen's surface-gradient
 * method, as in three's bump map), so no tangents are required. The slope is measured per tile unit, not per
 * pixel, so the relief keeps the same depth at every zoom level.
 */

/** Detail map edge (texels). 512² RGBA with mipmaps ≈ 1.4 MB of video memory, shared by every material. */
const MAP_SIZE = 512
/** Second sampling scale, relative to the first. Non-integer so the two octaves never line up into a grid. */
const OCTAVE = 4.7
/** Number of creases drawn into the R layer. More gives denser foil; under ~200 it reads as scratches. */
const CREASES = 520
/** Number of streaks drawn into the A layer. */
const STREAKS = 900

/** How a material uses the four layers. */
export type DetailKind = 'generic' | 'paint' | 'metal' | 'rock'

interface KindSettings {
  /** Weights of the R/G/B/A layers in the relief height. */
  height: [number, number, number, number]
  /** Relief depth, in tile units: 0.01 ≈ 1 % of a tile. Above ~0.03 on spacecraft the surface looks dented. */
  depth: number
  /** Albedo variation from the blotch layer (±). */
  grime: number
  /** Roughness variation from the peel and blotch layers (±). */
  rough: number
}

const KINDS: Record<DetailKind, KindSettings> = {
  // Unknown part: mostly foil-like creases with a little paint texture, as most of a spacecraft's exterior is MLI.
  generic: { height: [0.6, 0.3, 0.1, 0], depth: 0.012, grime: 0.1, rough: 0.12 },
  paint: { height: [0.08, 0.7, 0.22, 0], depth: 0.002, grime: 0.08, rough: 0.15 },
  metal: { height: [0, 0.2, 0.1, 0.7], depth: 0.004, grime: 0.06, rough: 0.2 },
  // Comet nucleus, on the rock map (craters, boulders, fractures, grain): see buildRockMap.
  rock: { height: [0.45, 0.35, 0.25, 0.12], depth: 0.035, grime: 0.3, rough: 0.05 },
}

/** Where the triplanar coordinates come from. */
export interface DetailOptions {
  kind: DetailKind
  /** Tiles per unit of the chosen space. */
  scale: number
  /**
   * Shared frame for a whole loaded model: coordinates are taken in the model root's space so every mesh of
   * the model, whatever its own node transform, gets the same tile size. Without it, each mesh's own geometry
   * space is used, which suits geometry built in metres and lets materials be shared between models.
   */
  frame?: DetailFrame
  /**
   * The geometry carries an `aCavity` attribute (0 deep in a pit … 1 on open ground, see computeCavity):
   * darkens hollows the way ambient light can't reach them.
   */
  cavity?: boolean
}

/**
 * The model-root frame shared by all detailed materials of one loaded model. track() must be called once per
 * frame after the model moved, otherwise the pattern slides over the surface.
 */
export class DetailFrame {
  readonly uniform = { value: new Matrix4() }

  /** Re-reads the root's world matrix. One 4×4 inverse per frame. */
  track(root: Object3D): void {
    root.updateWorldMatrix(true, false)
    this.uniform.value.copy(root.matrixWorld).invert()
  }
}

/** Shared detail maps: the general one, and the 1024² rock map used only by comet nuclei. */
const maps: Record<'surface' | 'rock', { tex: DataTexture | null; users: number; build: () => DataTexture }> = {
  surface: { tex: null, users: 0, build: () => buildMap() },
  rock: { tex: null, users: 0, build: () => buildRockMap() },
}

function acquireMap(set: keyof typeof maps): DataTexture {
  const m = maps[set]
  m.users++
  if (!m.tex) m.tex = m.build()
  return m.tex
}

function releaseMap(set: keyof typeof maps): void {
  const m = maps[set]
  m.users = Math.max(0, m.users - 1)
  if (m.users > 0 || !m.tex) return
  m.tex.dispose()
  m.tex = null
}

/**
 * Patches a standard material in place to add the detail. The material keeps every map it already has; the
 * detail only modulates albedo, roughness and the shading normal. The shared map is released when the
 * material is disposed.
 */
export function addSurfaceDetail(material: MeshStandardMaterial, options: DetailOptions): void {
  const k = KINDS[options.kind]
  const set = options.kind === 'rock' ? 'rock' : 'surface'
  const tex = acquireMap(set)
  const uniforms = {
    uDetailMap: { value: tex },
    uDetailScale: { value: options.scale },
    uDetailFrame: options.frame?.uniform ?? { value: new Matrix4() },
    uDetailHeight: { value: new Vector4(...k.height) },
    uDetailDepth: { value: k.depth },
    uDetailGrime: { value: k.grime },
    uDetailRough: { value: k.rough },
  }
  // Typed three materials don't expose `defines`, so the switch goes into the source; the cache key below
  // keeps the two variants apart.
  const mode = `${options.frame ? 'frame' : 'object'}-${set}${options.cavity ? '-cavity' : ''}`
  const define = (options.frame ? '' : '#define DETAIL_OBJECT_SPACE\n')
    + (set === 'rock' ? '#define DETAIL_ROCK\n' : '')
    + (options.cavity ? '#define DETAIL_CAVITY\n' : '')
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${define}${VERT_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_MAIN}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${define}${FRAG_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAG_COLOR}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${FRAG_ROUGH}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_NORMAL}`)
  }
  // Same source for every detailed material of a mode: one program per mode and base variant, not per material.
  material.customProgramCacheKey = () => `surface-detail-${mode}`
  material.addEventListener('dispose', function onDispose() {
    material.removeEventListener('dispose', onDispose)
    releaseMap(set)
  })
  material.needsUpdate = true
}

const VERT_PARS = /* glsl */ `
uniform mat4 uDetailFrame;
uniform float uDetailScale;
varying vec3 vDetailPos;
varying vec3 vDetailNrm;
#ifdef DETAIL_CAVITY
attribute float aCavity;
varying float vCavity;
#endif
`

// begin_vertex comes after beginnormal_vertex in the standard material, so objectNormal is defined here.
const VERT_MAIN = /* glsl */ `
#ifdef DETAIL_OBJECT_SPACE
  vDetailPos = transformed * uDetailScale;
  vDetailNrm = objectNormal;
#else
  mat4 detailM = uDetailFrame * modelMatrix;
  #ifdef USE_INSTANCING
    detailM = detailM * instanceMatrix;
  #endif
  vDetailPos = (detailM * vec4(transformed, 1.0)).xyz * uDetailScale;
  vDetailNrm = mat3(detailM) * objectNormal;
#endif
#ifdef DETAIL_CAVITY
  vCavity = aCavity;
#endif
`

const FRAG_PARS = /* glsl */ `
uniform sampler2D uDetailMap;
uniform vec4 uDetailHeight;
uniform float uDetailDepth;
uniform float uDetailGrime;
uniform float uDetailRough;
varying vec3 vDetailPos;
varying vec3 vDetailNrm;
#ifdef DETAIL_CAVITY
varying float vCavity;
#endif

vec4 detailTriplanar(vec3 p, vec3 w) {
  return texture(uDetailMap, p.yz) * w.x + texture(uDetailMap, p.zx) * w.y + texture(uDetailMap, p.xy) * w.z;
}

// Copy of three's perturbNormalArb, which only exists when the material has a bumpMap.
vec3 detailPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = normalize(dFdx(surfPos));
  vec3 sy = normalize(dFdy(surfPos));
  vec3 r1 = cross(sy, surfNorm);
  vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`

// Sampled once, right after the albedo, and reused for roughness and normal further down the same main().
const FRAG_COLOR = /* glsl */ `
  vec3 detailW = pow(abs(normalize(vDetailNrm)), vec3(4.0));
  detailW /= detailW.x + detailW.y + detailW.z;
  // Under ~4 pixels per tile the derivatives turn into noise: fade the relief out before that.
  float detailFade = 1.0 - smoothstep(0.08, 0.25, length(fwidth(vDetailPos)));
#ifdef DETAIL_ROCK
  // Three octaves (big craters and boulder fields down to cobbles) so a full-screen nucleus never shows a
  // single repeating tile. The finest one fades out first at distance.
  float fineFade = 1.0 - smoothstep(0.02, 0.06, length(fwidth(vDetailPos)));
  vec4 detailS = detailTriplanar(vDetailPos, detailW) * 0.45
    + detailTriplanar(vDetailPos * ${OCTAVE.toFixed(2)} + 0.37, detailW) * 0.35
    + mix(vec4(0.5), detailTriplanar(vDetailPos * ${(OCTAVE * OCTAVE * 0.8).toFixed(2)} + 0.71, detailW), fineFade) * 0.2;
  // Dust settles where the surface faces away from the centre (local "up" on a small body), in smooth slightly
  // brighter ponds, as Rosetta saw on 67P; steep cliffs stay bare and rough.
  float detailDust = smoothstep(0.55, 0.9, dot(normalize(vDetailNrm), normalize(vDetailPos)));
  diffuseColor.rgb *= (1.0 + uDetailGrime * (detailS.a - 0.5) * 2.0) * mix(0.75 + 0.5 * detailS.r, 1.12, detailDust);
#else
  vec4 detailS = mix(detailTriplanar(vDetailPos, detailW), detailTriplanar(vDetailPos * ${OCTAVE.toFixed(2)} + 0.37, detailW), 0.4);
  float detailDust = 0.0;
  diffuseColor.rgb *= 1.0 + uDetailGrime * (detailS.b - 0.5) * 2.0;
#endif
#ifdef DETAIL_CAVITY
  diffuseColor.rgb *= vCavity;
#endif
`

const FRAG_ROUGH = /* glsl */ `
  roughnessFactor = clamp(roughnessFactor + uDetailRough * (detailS.g + detailS.b - 1.0), 0.04, 1.0);
`

// Slope per tile unit (height change over distance travelled in detail space), not per pixel: zoom-independent.
const FRAG_NORMAL = /* glsl */ `
  {
    float h = dot(detailS, uDetailHeight);
    vec2 slope = vec2(
      dFdx(h) / max(length(dFdx(vDetailPos)), 1e-5),
      dFdy(h) / max(length(dFdy(vDetailPos)), 1e-5)
    ) * uDetailDepth * detailFade * (1.0 - 0.6 * detailDust);
    normal = detailPerturb(-vViewPosition, normal, slope, faceDirection);
  }
`

/** Draws the four layers. About 30 ms once per page; the map is kept while any detailed material lives. */
function buildMap(): DataTexture {
  const N = MAP_SIZE
  const data = new Uint8Array(N * N * 4)
  const creases = creaseLayer(N)
  const streaks = streakLayer(N)
  const peel = tileableNoise(N, [128], 3)
  const blotch = tileableNoise(N, [4, 8, 16, 32], 11)
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = creases[i]!
    data[i * 4 + 1] = peel[i]!
    data[i * 4 + 2] = blotch[i]!
    data[i * 4 + 3] = streaks[i]!
  }
  const t = new DataTexture(data, N, N, RGBAFormat, UnsignedByteType)
  t.wrapS = t.wrapT = RepeatWrapping
  // Mipmaps are what keep distant relief calm: the derivative of a blurred height is small.
  t.generateMipmaps = true
  t.minFilter = LinearMipmapLinearFilter
  t.magFilter = LinearFilter
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

/** Random straight creases on mid-grey, each drawn at the 9 wrap offsets so the layer tiles. */
function creaseLayer(N: number): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#808080'
  g.fillRect(0, 0, N, N)
  const rnd = mulberry32(4211)
  for (let i = 0; i < CREASES; i++) {
    const x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI, l = 12 + rnd() * 70
    g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'
    g.lineWidth = 1 + rnd() * 3
    for (let ox = -N; ox <= N; ox += N) for (let oy = -N; oy <= N; oy += N) {
      g.beginPath()
      g.moveTo(x + ox, y + oy)
      g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l)
      g.stroke()
    }
  }
  return redChannel(g, N)
}

/** Thin horizontal streaks of varying length and tone, wrapped horizontally. */
function streakLayer(N: number): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#808080'
  g.fillRect(0, 0, N, N)
  const rnd = mulberry32(907)
  for (let i = 0; i < STREAKS; i++) {
    const x = rnd() * N, y = Math.floor(rnd() * N) + 0.5, l = 20 + rnd() * 200
    g.strokeStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.08 + rnd() * 0.18})`
    g.lineWidth = 1
    for (const ox of [-N, 0, N]) {
      g.beginPath()
      g.moveTo(x + ox, y)
      g.lineTo(x + ox + l, y)
      g.stroke()
    }
  }
  return redChannel(g, N)
}

function redChannel(g: CanvasRenderingContext2D, N: number): Uint8ClampedArray {
  const src = g.getImageData(0, 0, N, N).data
  const out = new Uint8ClampedArray(N * N)
  for (let i = 0; i < N * N; i++) out[i] = src[i * 4]!
  return out
}

/**
 * Tileable value noise: lattice values wrap at each period, smoothstep-interpolated, octaves summed with
 * halving amplitude and stretched to the full 0–255 range.
 */
function tileableNoise(N: number, periods: number[], seed: number): Uint8ClampedArray {
  const acc = new Float32Array(N * N)
  let amp = 1
  periods.forEach((P, o) => {
    const rnd = mulberry32(seed * 97 + o)
    const lattice = new Float32Array(P * P).map(() => rnd())
    const cell = N / P
    for (let y = 0; y < N; y++) {
      const fy = y / cell, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty)
      const y0 = (iy % P) * P, y1 = ((iy + 1) % P) * P
      for (let x = 0; x < N; x++) {
        const fx = x / cell, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx)
        const x0 = ix % P, x1 = (ix + 1) % P
        const a = lattice[y0 + x0]! + (lattice[y0 + x1]! - lattice[y0 + x0]!) * sx
        const b = lattice[y1 + x0]! + (lattice[y1 + x1]! - lattice[y1 + x0]!) * sx
        acc[y * N + x]! += (a + (b - a) * sy) * amp
      }
    }
    amp *= 0.5
  })
  let lo = Infinity, hi = -Infinity
  for (const v of acc) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
  const out = new Uint8ClampedArray(N * N)
  for (let i = 0; i < N * N; i++) out[i] = ((acc[i]! - lo) / (hi - lo)) * 255
  return out
}

/** Rock map edge (texels). 1024² RGBA with mipmaps ≈ 5.6 MB, built only when a comet is on screen. */
const ROCK_SIZE = 1024
/** Impact craters per tile: from a few big bowls down to many small pits (radius ∝ 1/√rank). */
const ROCK_CRATERS = 260
/** Boulder lattice cells per tile edge (one candidate boulder per cell). */
const ROCK_BOULDER_CELLS = 40

/**
 * Comet-nucleus rock layers, tileable:
 * - R: craters and pits (bowl with a raised rim, mid-grey = flat ground);
 * - G: boulders, rounded bumps scattered on a jittered lattice, a third of the cells empty;
 * - B: fractures and terrace edges (straight creases, as the cliffs of 67P);
 * - A: fine grain, also used for albedo mottling.
 * About 150 ms, once per page.
 */
function buildRockMap(): DataTexture {
  const N = ROCK_SIZE
  const rnd = mulberry32(5021)
  const craters = new Float32Array(N * N)
  for (let i = 0; i < ROCK_CRATERS; i++) {
    const r = (N * 0.11) / Math.sqrt(1 + i * 0.35)
    const cx = rnd() * N, cy = rnd() * N, depth = 0.6 + rnd() * 0.4
    const ext = Math.ceil(r * 1.6)
    for (let dy = -ext; dy <= ext; dy++) for (let dx = -ext; dx <= ext; dx++) {
      const d = Math.hypot(dx, dy) / r
      if (d > 1.6) continue
      // Bowl inside, raised rim just outside, fading into the plain.
      const h = d < 1 ? (d * d - 1) * depth : 0
      const rim = 0.3 * depth * Math.exp(-(((d - 1) / 0.22) ** 2))
      const x = (((Math.floor(cx) + dx) % N) + N) % N, y = (((Math.floor(cy) + dy) % N) + N) % N
      craters[y * N + x]! += h + rim
    }
  }
  const boulders = new Float32Array(N * N)
  const C = ROCK_BOULDER_CELLS, cell = N / C
  const pts = Array.from({ length: C * C }, () => ({ x: rnd(), y: rnd(), r: rnd() < 0.35 ? 0 : 0.15 + rnd() * 0.35 }))
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy)
    let h = 0
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cxi = ix + ox, cyi = iy + oy
      const p = pts[(((cyi % C) + C) % C) * C + (((cxi % C) + C) % C)]!
      if (!p.r) continue
      const d = Math.hypot(cxi + p.x - fx, cyi + p.y - fy) / p.r
      if (d < 1) h = Math.max(h, Math.sqrt(1 - d * d) * p.r * 2)
    }
    boulders[y * N + x] = h
  }
  const fractures = creaseLayer(N)
  const grain = tileableNoise(N, [256, 128, 64], 23)
  const data = new Uint8Array(N * N * 4)
  const norm = (a: Float32Array) => {
    let lo = Infinity, hi = -Infinity
    for (const v of a) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
    return (v: number) => ((v - lo) / (hi - lo || 1)) * 255
  }
  const nc = norm(craters), nb = norm(boulders)
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = nc(craters[i]!)
    data[i * 4 + 1] = nb(boulders[i]!)
    data[i * 4 + 2] = fractures[i]!
    data[i * 4 + 3] = grain[i]!
  }
  const t = new DataTexture(data, N, N, RGBAFormat, UnsignedByteType)
  t.wrapS = t.wrapT = RepeatWrapping
  t.generateMipmaps = true
  t.minFilter = LinearMipmapLinearFilter
  t.magFilter = LinearFilter
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}
