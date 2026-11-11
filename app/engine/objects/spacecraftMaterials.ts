import {
  CanvasTexture, DoubleSide, Color, EquirectangularReflectionMapping, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace,
  type Texture,
} from 'three'
import { mulberry32 } from '../core/random'

/**
 * Materials and generated textures for the spacecraft models. Everything is drawn into canvases at start-up:
 * solar cells, crinkled insulation foil, open truss lattices, and a dim environment map for metal reflections.
 * Shared by every model on screen and released when the last one goes.
 */
export interface CraftMaterials {
  goldFoil: MeshStandardMaterial
  silverFoil: MeshStandardMaterial
  whiteBlanket: MeshStandardMaterial
  whitePaint: MeshStandardMaterial
  darkStructure: MeshStandardMaterial
  truss: MeshStandardMaterial
  metal: MeshStandardMaterial
  polished: MeshStandardMaterial
  goldMirror: MeshStandardMaterial
  sunshield: MeshStandardMaterial
  /** Solar arrays: orange-brown ISS blankets, dark blue rigid panels, near-black flexible arrays. */
  cellsCopper: MeshStandardMaterial
  cellsBlue: MeshStandardMaterial
  cellsDark: MeshStandardMaterial
  radiator: MeshStandardMaterial
  record: MeshStandardMaterial
  textures: Texture[]
}

let shared: CraftMaterials | null = null
let users = 0

export function acquireCraftMaterials(): CraftMaterials {
  users++
  if (!shared) shared = build()
  return shared
}

export function releaseCraftMaterials(): void {
  users = Math.max(0, users - 1)
  if (users > 0 || !shared) return
  for (const value of Object.values(shared)) {
    if (value instanceof MeshStandardMaterial) value.dispose()
  }
  shared.textures.forEach((t) => t.dispose())
  shared = null
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!]
}

function texture(c: HTMLCanvasElement, srgb: boolean, repeat: [number, number] = [1, 1]): CanvasTexture {
  const t = new CanvasTexture(c)
  if (srgb) t.colorSpace = SRGBColorSpace
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.repeat.set(...repeat)
  t.anisotropy = 8
  return t
}

/** Solar cells: a grid of cells with silver bus bars and fine collection fingers. */
function cells(cell: string, gap: string, finger: string, nx: number, ny: number): HTMLCanvasElement {
  const [c, g] = canvas(512, 512)
  g.fillStyle = gap
  g.fillRect(0, 0, 512, 512)
  const cw = 512 / nx, ch = 512 / ny
  const rnd = mulberry32(nx * 31 + ny)
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    // Cells differ slightly in tint, as in real arrays.
    const k = 0.92 + rnd() * 0.16
    const base = new Color(cell).multiplyScalar(k)
    g.fillStyle = `#${base.getHexString()}`
    g.fillRect(i * cw + 1.5, j * ch + 1.5, cw - 3, ch - 3)
    g.strokeStyle = finger
    g.globalAlpha = 0.35
    g.lineWidth = 0.6
    for (let f = 1; f < 6; f++) {
      g.beginPath()
      g.moveTo(i * cw + 2, j * ch + (f * ch) / 6)
      g.lineTo(i * cw + cw - 2, j * ch + (f * ch) / 6)
      g.stroke()
    }
    g.globalAlpha = 1
  }
  return c
}

/**
 * Normal map of crinkled multi-layer insulation: random creases drawn as a height field, then turned into
 * normals with a Sobel filter.
 */
function crinkleNormal(): HTMLCanvasElement {
  const N = 256
  const [hc, hg] = canvas(N, N)
  hg.fillStyle = '#808080'
  hg.fillRect(0, 0, N, N)
  const rnd = mulberry32(77)
  for (let i = 0; i < 420; i++) {
    const x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI, l = 10 + rnd() * 50
    hg.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'
    hg.lineWidth = 1 + rnd() * 3
    hg.beginPath()
    hg.moveTo(x, y)
    hg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    hg.stroke()
  }
  const src = hg.getImageData(0, 0, N, N).data
  const [nc, ng] = canvas(N, N)
  const out = ng.createImageData(N, N)
  const h = (x: number, y: number) => src[(((y + N) % N) * N + ((x + N) % N)) * 4]! / 255
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 2.5
    const dy = (h(x, y + 1) - h(x, y - 1)) * 2.5
    const l = Math.hypot(dx, dy, 1)
    const o = (y * N + x) * 4
    out.data[o] = ((-dx / l) * 0.5 + 0.5) * 255
    out.data[o + 1] = ((-dy / l) * 0.5 + 0.5) * 255
    out.data[o + 2] = ((1 / l) * 0.5 + 0.5) * 255
    out.data[o + 3] = 255
  }
  ng.putImageData(out, 0, 0)
  return nc
}

/** Open truss: a lattice of struts on transparency, used as an alpha map on box faces. */
function lattice(): HTMLCanvasElement {
  const [c, g] = canvas(256, 256)
  g.fillStyle = '#000'
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = '#fff'
  g.lineWidth = 9
  g.strokeRect(0, 0, 256, 256)
  g.beginPath()
  g.moveTo(0, 0); g.lineTo(256, 256)
  g.moveTo(256, 0); g.lineTo(0, 256)
  g.stroke()
  return c
}

/** Beta-cloth / panel seams: a faint grid of panel joins on white blankets. */
function panels(base: string, line: string): HTMLCanvasElement {
  const [c, g] = canvas(256, 256)
  g.fillStyle = base
  g.fillRect(0, 0, 256, 256)
  const rnd = mulberry32(5)
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    g.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.05})`
    g.fillRect(i * 32, j * 64, 32, 64)
  }
  g.strokeStyle = line
  g.lineWidth = 1.5
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 256); g.stroke() }
  for (let j = 0; j <= 4; j++) { g.beginPath(); g.moveTo(0, j * 64); g.lineTo(256, j * 64); g.stroke() }
  return c
}

/** Radiator panels: white with the thin stripes of their coolant tubes. */
function radiatorStripes(): HTMLCanvasElement {
  const [c, g] = canvas(256, 256)
  g.fillStyle = '#e9ecee'
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = '#c9cdd1'
  for (let i = 0; i < 256; i += 16) g.fillRect(i, 0, 3, 256)
  return c
}

/**
 * Dim surroundings for reflections: black space above, the blue glow of Earth below, a hot spot towards the Sun.
 * Converted to a pre-filtered environment by the renderer on first use.
 */
function environment(): HTMLCanvasElement {
  const [c, g] = canvas(512, 256)
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#020304')
  grad.addColorStop(0.5, '#05080d')
  grad.addColorStop(0.62, '#1b2c44')
  grad.addColorStop(1, '#2a4a70')
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 256)
  const sun = g.createRadialGradient(380, 80, 0, 380, 80, 70)
  sun.addColorStop(0, 'rgba(255,248,230,1)')
  sun.addColorStop(0.2, 'rgba(255,240,210,0.35)')
  sun.addColorStop(1, 'rgba(255,240,210,0)')
  g.fillStyle = sun
  g.fillRect(0, 0, 512, 256)
  return c
}

function build(): CraftMaterials {
  const env = texture(environment(), true)
  env.mapping = EquirectangularReflectionMapping
  const crinkle = texture(crinkleNormal(), false, [3, 3])
  const latticeTex = texture(lattice(), false, [24, 1])
  const blanket = texture(panels('#e7e3da', 'rgba(150,145,135,0.6)'), true, [2, 2])
  const copper = texture(cells('#7a4a24', '#c9b48a', '#e0d0a8', 8, 16), true, [2, 6])
  const blue = texture(cells('#1d2a5c', '#9aa3b8', '#8d9ad0', 10, 10), true, [2, 4])
  const dark = texture(cells('#141b2c', '#59606e', '#3d4a6a', 10, 10), true, [2, 6])
  const radiator = texture(radiatorStripes(), true, [3, 1])
  const textures = [env, crinkle, latticeTex, blanket, copper, blue, dark, radiator]

  const std = (p: ConstructorParameters<typeof MeshStandardMaterial>[0]) => new MeshStandardMaterial({ envMap: env, envMapIntensity: 0.7, ...p })
  return {
    goldFoil: std({ color: '#c99a3e', metalness: 1, roughness: 0.32, normalMap: crinkle }),
    silverFoil: std({ color: '#d9dde2', metalness: 0.55, roughness: 0.4, normalMap: crinkle }),
    whiteBlanket: std({ map: blanket, metalness: 0, roughness: 0.82 }),
    whitePaint: std({ color: '#e6e6e2', metalness: 0.05, roughness: 0.55, side: DoubleSide }),
    darkStructure: std({ color: '#262829', metalness: 0.3, roughness: 0.6 }),
    truss: std({ color: '#9da1a6', metalness: 0.7, roughness: 0.45, alphaMap: latticeTex, alphaTest: 0.5, side: DoubleSide }),
    metal: std({ color: '#a7abb0', metalness: 0.85, roughness: 0.35 }),
    polished: std({ color: '#eef0f3', metalness: 0.75, roughness: 0.18, envMapIntensity: 1.6 }),
    goldMirror: std({ color: '#f0b84a', metalness: 0.6, roughness: 0.2, emissive: '#3a2608', envMapIntensity: 1.4 }),
    sunshield: std({ color: '#d2c2e4', metalness: 0.55, roughness: 0.35, normalMap: crinkle, side: DoubleSide }),
    cellsCopper: std({ map: copper, metalness: 0.35, roughness: 0.38, side: DoubleSide }),
    cellsBlue: std({ map: blue, metalness: 0.4, roughness: 0.32, side: DoubleSide }),
    cellsDark: std({ map: dark, metalness: 0.4, roughness: 0.35, side: DoubleSide }),
    radiator: std({ map: radiator, metalness: 0.05, roughness: 0.6, side: DoubleSide }),
    record: std({ color: '#d9a640', metalness: 1, roughness: 0.18 }),
    textures,
  }
}
