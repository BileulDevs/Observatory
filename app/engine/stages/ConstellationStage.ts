import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, LineBasicMaterial, LineSegments, Points,
  ShaderMaterial, Vector3,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ConstellationData, ConstellationStar } from '~/types/constellations'
import { easeInOutCubic, Tween } from '../core/tween'
import { blackbodyColor } from '../objects/CatalogueStar'
import type { Stage, StageContext, StageFrame, ViewShift } from './Stage'

/** World units per light-year. The engine camera sees 400 units: 1 unit = 20 ly keeps 2,800 ly stars inside. */
const LY = 1 / 20
/** Where a star without a usable parallax is drawn, as a fraction of the figure's median distance. */
const UNKNOWN_DISTANCE = 1
/** Sky view: field of view around the figure's angular size, and its bounds (degrees). */
const SKY_FOV_MARGIN = 1.35
const SKY_FOV_MIN = 18
const SKY_FOV_MAX = 95
/** 3D view: camera distance from the stars' centre, in units of the figure's depth spread (larger = further). */
const SIDE_DISTANCE = 2.4
/** Flight between the two views, seconds. */
const FLIGHT = 2.2
/**
 * Star sprite size in px for magnitude 0, and its bounds. Each magnitude is 2.512× fainter in light: drawn
 * 0.8× smaller and (in the shader) dimmer, so a magnitude-5 field star stays a faint pinpoint.
 */
const SIZE_MAG0 = 17
const SIZE_MIN = 2.5
const SIZE_MAX = 26
/** Size factor by role: the figure's stars lead, the surrounding field recedes. */
const ROLE_SIZE = { figure: 1, member: 0.85, field: 0.7 } as const
/** Brightness factor by role (multiplies the magnitude-based intensity). */
const ROLE_LIGHT = { figure: 1, member: 0.8, field: 0.55 } as const
/** Colours of the two measurement slots (selection rings and the line between them). */
const SLOT_A = new Color('#e8c27a')
const SLOT_B = new Color('#7fd6e8')
/** Earth marker size, px. */
const EARTH_SIZE = 12
/** Screen distance (px) under which a click or hover picks the nearest star. */
const PICK_PX = 16
/** A drag longer than this (px) is an orbit, not a click. */
const CLICK_SLOP_PX = 5

export type ConstellationView = 'sky' | '3d'

export interface ConstellationEvents {
  /** A star was clicked (or the empty sky: null). The page decides what that means (select, measure). */
  onSelect?: (hip: number | null) => void
  /** A frame was drawn: HTML labels pinned to stars can be repositioned (see project()). */
  onFrame?: () => void
  /** The pointer is over a star, at these client coordinates (or nothing: null). */
  onHover?: (hover: { hip: number; x: number; y: number } | null) => void
}

/**
 * One constellation in its true 3D layout around the Sun. From Earth (the "sky" view, camera at the origin) the
 * stars draw the familiar figure; the "3D" view flies out to the side and shows how far apart they really are,
 * with faint sight lines back to Earth. Stars are clickable.
 */
export class ConstellationStage implements Stage {
  readonly root = new Group()
  readonly subject = null

  private ctx: StageContext | null = null
  private controls: OrbitControls | null = null
  private tween: Tween | null = null
  private view: ConstellationView = 'sky'
  private readonly positions: Vector3[] = []
  /** Unit direction from Earth to the figure's centre on the sky. */
  private readonly skyDir = new Vector3()
  /** Centre of the stars in space. */
  private readonly centre = new Vector3()
  private skyFov = 40
  private sideOffset = new Vector3()
  private savedFov = 0
  private readonly stars: Points<BufferGeometry, ShaderMaterial>
  private readonly lines: LineSegments<BufferGeometry, LineBasicMaterial>
  private readonly sight: LineSegments<BufferGeometry, LineBasicMaterial>
  private readonly earth: Points<BufferGeometry, ShaderMaterial>
  private readonly earthU = {
    uPR: { value: 1 }, uSelectedA: { value: -1 }, uSelectedB: { value: -1 }, uHover: { value: -1 },
    uColorA: { value: SLOT_A }, uColorB: { value: SLOT_B },
  }
  private readonly starU = {
    uPR: { value: 1 }, uSelectedA: { value: -1 }, uSelectedB: { value: -1 }, uHover: { value: -1 },
    uColorA: { value: SLOT_A }, uColorB: { value: SLOT_B },
  }
  private readonly measure: LineSegments<BufferGeometry, LineBasicMaterial>
  private readonly pressAt = { x: 0, y: 0 }
  private hoverIndex = -1
  /** True until labels have been placed once (the first frames come from attach/invalidate, not update). */
  private labelsStale = true
  private readonly tmp = new Vector3()

  constructor(private readonly data: ConstellationData, private readonly shift: ViewShift, private readonly events: ConstellationEvents = {}) {
    const known = data.stars.filter((s) => s.figure && s.distLy).map((s) => s.distLy!).sort((a, b) => a - b)
    const median = known[Math.floor(known.length / 2)] ?? 300
    for (const s of data.stars) this.positions.push(direction(s).multiplyScalar((s.distLy ?? median * UNKNOWN_DISTANCE) * LY))

    // Figure centre on the sky and its angular radius (figure stars only: stray bright stars can sit far away).
    const fig = data.stars.map((s, i) => [s, i] as const).filter(([s]) => s.figure)
    const use = fig.length ? fig : data.stars.map((s, i) => [s, i] as const)
    for (const [s] of use) this.skyDir.add(direction(s))
    this.skyDir.normalize()
    let maxAngle = 0
    for (const [s, i] of use) {
      maxAngle = Math.max(maxAngle, direction(s).angleTo(this.skyDir))
      this.centre.add(this.positions[i]!)
    }
    this.centre.divideScalar(use.length)
    this.skyFov = Math.min(SKY_FOV_MAX, Math.max(SKY_FOV_MIN, (maxAngle * 2 * 180 / Math.PI) * SKY_FOV_MARGIN))

    // Side view: perpendicular to the line of sight, far enough to see the whole depth spread.
    let near = Infinity, far = 0
    for (const [, i] of use) {
      const d = this.positions[i]!.length()
      near = Math.min(near, d); far = Math.max(far, d)
    }
    const spread = Math.max(far - near, this.centre.length() * 0.4)
    const sideways = new Vector3(0, 1, 0).cross(this.skyDir)
    if (sideways.lengthSq() < 1e-6) sideways.set(1, 0, 0)
    sideways.normalize()
    // A little elevation and a slight angle back towards Earth so the sight lines fan out visibly.
    this.sideOffset.copy(sideways).multiplyScalar(spread * SIDE_DISTANCE)
      .addScaledVector(new Vector3(0, 1, 0), spread * 0.5)
      .addScaledVector(this.skyDir, -spread * 0.6)

    this.stars = this.buildStars()
    this.lines = this.buildLines()
    this.sight = this.buildSightLines(use.map(([, i]) => i))
    this.earth = this.buildEarth()
    this.measure = this.buildMeasure()
    this.root.add(this.sight, this.lines, this.measure, this.stars, this.earth)
  }

  attach(ctx: StageContext): void {
    this.ctx = ctx
    this.savedFov = ctx.camera.fov
    this.starU.uPR.value = Math.min(window.devicePixelRatio, ctx.quality.maxPixelRatio)
    this.earthU.uPR.value = this.starU.uPR.value
    ctx.setViewShift(this.shift)
    // Controls first: OrbitControls aims the camera at its target when created, and with the camera at the
    // origin and the default target also at the origin that leaves it pointing nowhere.
    const c = new OrbitControls(ctx.camera, ctx.canvas)
    c.enableDamping = true
    c.dampingFactor = 0.08
    c.enablePan = false
    c.rotateSpeed = 0.5
    c.enabled = false
    c.addEventListener('change', ctx.invalidate)
    this.controls = c
    this.applySky(1)
    ctx.canvas.addEventListener('pointerdown', this.onPointerDown)
    ctx.canvas.addEventListener('pointermove', this.onPointerMove)
    ctx.canvas.addEventListener('click', this.onClick)
    ctx.invalidate()
  }

  /** Flies between the view from Earth and the side view. */
  setView(view: ConstellationView): void {
    const ctx = this.ctx
    if (!ctx || view === this.view) return
    this.view = view
    const controls = this.controls
    if (controls) controls.enabled = false
    const fromPos = ctx.camera.position.clone()
    const fromLook = this.tmp.copy(ctx.camera.position).add(ctx.camera.getWorldDirection(new Vector3())).clone()
    const fromFov = ctx.camera.fov
    const toPos = view === 'sky' ? new Vector3() : this.centre.clone().add(this.sideOffset)
    const toLook = view === 'sky' ? this.skyDir.clone() : this.centre.clone()
    const toFov = view === 'sky' ? this.skyFov : this.savedFov
    const look = new Vector3()
    this.tween?.cancel()
    this.tween = new Tween(ctx.reducedMotion ? 0 : FLIGHT, (k) => {
      ctx.camera.position.lerpVectors(fromPos, toPos, k)
      ctx.camera.lookAt(look.lerpVectors(fromLook, toLook, k))
      ctx.camera.fov = fromFov + (toFov - fromFov) * k
      ctx.camera.updateProjectionMatrix()
      this.applySightOpacity(view === '3d' ? k : 1 - k)
    }, easeInOutCubic, () => {
      // Land exactly on the sky framing (north up): the interpolated look-at can leave the view rolled.
      if (view === 'sky') this.applySky(1)
      if (view === '3d' && controls) {
        controls.target.copy(this.centre)
        controls.minDistance = this.sideOffset.length() * 0.15
        controls.maxDistance = this.sideOffset.length() * 4
        controls.enabled = true
        controls.update()
      }
    })
    ctx.invalidate()
  }

  /** Back to the current view's starting framing. */
  recenter(): void {
    const v = this.view
    this.view = v === 'sky' ? '3d' : 'sky'
    this.setView(v)
  }

  /**
   * Shows the two measurement slots: gold ring on the first star, cyan on the second, and the line joining
   * them in space (in the 3D view it shows the true separation; from Earth it overlays the sky).
   */
  setSelection(a: number | null, b: number | null): void {
    const ia = a === null ? -1 : this.indexOf(a)
    const ib = b === null ? -1 : this.indexOf(b)
    this.starU.uSelectedA.value = ia
    this.starU.uSelectedB.value = ib
    const show = ia >= 0 && ib >= 0
    this.measure.visible = show
    if (show) {
      const pos = this.measure.geometry.getAttribute('position') as BufferAttribute
      pos.setXYZ(0, this.positions[ia]!.x, this.positions[ia]!.y, this.positions[ia]!.z)
      pos.setXYZ(1, this.positions[ib]!.x, this.positions[ib]!.y, this.positions[ib]!.z)
      pos.needsUpdate = true
    }
    this.ctx?.invalidate()
  }

  /** Canvas-relative pixel position of a star, or null when behind the camera or off screen. */
  project(hip: number): { x: number; y: number } | null {
    const ctx = this.ctx
    const i = this.indexOf(hip)
    if (!ctx || i < 0) return null
    const v = this.tmp.copy(this.positions[i]!).project(ctx.camera)
    if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return null
    return { x: (v.x * 0.5 + 0.5) * ctx.canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * ctx.canvas.clientHeight }
  }

  private indexOf(hip: number): number {
    return this.data.stars.findIndex((s) => s.hip === hip)
  }

  update(dt: number): StageFrame {
    let render = false
    if (this.tween) {
      if (!this.tween.step(dt)) this.tween = null
      render = true
    }
    if (this.controls?.enabled && this.controls.update()) render = true
    // Labels follow the stars: after this frame is drawn, let the page re-project them.
    if (render || this.labelsStale) {
      this.labelsStale = false
      queueMicrotask(() => this.events.onFrame?.())
    }
    return { render, animating: this.tween !== null }
  }

  dispose(): void {
    const ctx = this.ctx
    if (ctx) {
      ctx.canvas.removeEventListener('pointerdown', this.onPointerDown)
      ctx.canvas.removeEventListener('pointermove', this.onPointerMove)
      ctx.canvas.removeEventListener('click', this.onClick)
      ctx.canvas.style.cursor = ''
      // The camera is the engine's: give its field of view back to the next page.
      ctx.camera.fov = this.savedFov
      ctx.camera.updateProjectionMatrix()
    }
    if (this.controls) {
      if (ctx) this.controls.removeEventListener('change', ctx.invalidate)
      this.controls.dispose()
    }
    this.tween?.cancel()
    for (const o of [this.stars, this.lines, this.sight, this.earth, this.measure]) {
      o.geometry.dispose()
      o.material.dispose()
    }
    this.root.removeFromParent()
    this.ctx = null
  }

  private applySky(k: number): void {
    const ctx = this.ctx
    if (!ctx) return
    ctx.camera.position.set(0, 0, 0)
    ctx.camera.lookAt(this.skyDir)
    ctx.camera.fov = this.skyFov
    ctx.camera.updateProjectionMatrix()
    this.applySightOpacity(1 - k)
  }

  private applySightOpacity(k: number): void {
    this.sight.material.opacity = 0.22 * k
    this.sight.visible = k > 0.001
    // Earth is where the camera sits in the sky view: shown only once the camera has left it.
    this.earth.visible = k > 0.05
  }

  /** The Sun / Earth at the origin, a blue dot where all the sight lines meet. */
  private buildEarth(): Points<BufferGeometry, ShaderMaterial> {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(3), 3))
    geo.setAttribute('aColor', new BufferAttribute(new Float32Array([0.35, 0.6, 1.4]), 3))
    geo.setAttribute('aSize', new BufferAttribute(new Float32Array([EARTH_SIZE]), 1))
    geo.setAttribute('aIndex', new BufferAttribute(new Float32Array([0]), 1))
    geo.setAttribute('aLight', new BufferAttribute(new Float32Array([1]), 1))
    const points = new Points(geo, new ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: this.earthU,
      transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    }))
    points.frustumCulled = false
    points.renderOrder = 3
    points.visible = false
    return points
  }

  private buildStars(): Points<BufferGeometry, ShaderMaterial> {
    const n = this.data.stars.length
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const size = new Float32Array(n)
    const index = new Float32Array(n)
    const light = new Float32Array(n)
    this.data.stars.forEach((s, i) => {
      this.positions[i]!.toArray(pos, i * 3)
      // Colour saturated a little beyond the black body: real star colours are subtle, and on screen next
      // to the glow they would all read as white.
      const c = blackbodyColor(temperatureOf(s))
      const grey = (c.r + c.g + c.b) / 3
      c.r = grey + (c.r - grey) * 1.6; c.g = grey + (c.g - grey) * 1.6; c.b = grey + (c.b - grey) * 1.6
      c.toArray(col, i * 3)
      const role = s.role ?? (s.figure ? 'figure' : 'member')
      size[i] = Math.min(SIZE_MAX, Math.max(SIZE_MIN, SIZE_MAG0 * 0.8 ** s.mag)) * ROLE_SIZE[role]
      // Light ratio relative to magnitude 1, compressed (√) so the faint end stays visible on a screen.
      light[i] = Math.min(2.2, Math.sqrt(2.512 ** (1 - s.mag))) * ROLE_LIGHT[role]
      index[i] = i
    })
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('aColor', new BufferAttribute(col, 3))
    geo.setAttribute('aSize', new BufferAttribute(size, 1))
    geo.setAttribute('aIndex', new BufferAttribute(index, 1))
    geo.setAttribute('aLight', new BufferAttribute(light, 1))
    const points = new Points(geo, new ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: this.starU,
      transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    }))
    points.frustumCulled = false
    points.renderOrder = 3
    return points
  }

  private buildLines(): LineSegments<BufferGeometry, LineBasicMaterial> {
    const pos = new Float32Array(this.data.segments.length * 6)
    this.data.segments.forEach(([a, b], i) => {
      this.positions[a]!.toArray(pos, i * 6)
      this.positions[b]!.toArray(pos, i * 6 + 3)
    })
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    const lines = new LineSegments(geo, new LineBasicMaterial({
      color: new Color('#c9a96e'), transparent: true, opacity: 0.55, depthTest: false, depthWrite: false,
    }))
    lines.frustumCulled = false
    lines.renderOrder = 2
    return lines
  }

  /** Faint lines from Earth (the origin) to each figure star: they make the depth readable in the side view. */
  private buildSightLines(indices: number[]): LineSegments<BufferGeometry, LineBasicMaterial> {
    const pos = new Float32Array(indices.length * 6)
    indices.forEach((i, k) => this.positions[i]!.toArray(pos, k * 6 + 3))
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    const lines = new LineSegments(geo, new LineBasicMaterial({
      color: new Color('#7fa2d6'), transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    }))
    lines.frustumCulled = false
    lines.renderOrder = 1
    return lines
  }

  /** Nearest star to a client point, within PICK_PX. */
  private pick(clientX: number, clientY: number): number {
    const ctx = this.ctx
    if (!ctx) return -1
    const rect = ctx.canvas.getBoundingClientRect()
    let best = -1, bestD = PICK_PX
    this.positions.forEach((p, i) => {
      const v = this.tmp.copy(p).project(ctx.camera)
      if (v.z > 1) return
      const x = rect.left + (v.x * 0.5 + 0.5) * rect.width
      const y = rect.top + (-v.y * 0.5 + 0.5) * rect.height
      const d = Math.hypot(x - clientX, y - clientY)
      if (d < bestD) { bestD = d; best = i }
    })
    return best
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.pressAt.x = e.clientX
    this.pressAt.y = e.clientY
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.ctx || e.buttons) return
    const i = this.pick(e.clientX, e.clientY)
    if (i !== this.hoverIndex) {
      this.hoverIndex = i
      this.starU.uHover.value = i
      this.ctx.canvas.style.cursor = i >= 0 ? 'pointer' : ''
      this.ctx.invalidate()
    }
    this.events.onHover?.(i >= 0 ? { hip: this.data.stars[i]!.hip, x: e.clientX, y: e.clientY } : null)
  }

  private readonly onClick = (e: MouseEvent): void => {
    if (Math.hypot(e.clientX - this.pressAt.x, e.clientY - this.pressAt.y) > CLICK_SLOP_PX) return
    const i = this.pick(e.clientX, e.clientY)
    const hip = i >= 0 ? this.data.stars[i]!.hip : null
    this.events.onSelect?.(hip)
  }

  /** The measuring line: two vertices rewritten by setSelection(). */
  private buildMeasure(): LineSegments<BufferGeometry, LineBasicMaterial> {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
    const line = new LineSegments(geo, new LineBasicMaterial({
      color: SLOT_B, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false,
    }))
    line.frustumCulled = false
    line.renderOrder = 2
    line.visible = false
    return line
  }
}

/** Unit vector towards a star, in the scene frame: +y to the north celestial pole, RA 0 towards +x, RA 6h towards −z. */
function direction(s: ConstellationStar): Vector3 {
  const ra = (s.ra * Math.PI) / 180
  const dec = (s.dec * Math.PI) / 180
  // −z for RA 6h keeps east to the left when looking out at the sky from inside, as on star charts.
  return new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra))
}

/** Effective temperature from the B−V colour index (Ballesteros 2012); 5,800 K when unknown. */
export function temperatureOf(s: ConstellationStar): number {
  if (s.ci === null) return 5800
  return 4600 * (1 / (0.92 * s.ci + 1.7) + 1 / (0.92 * s.ci + 0.62))
}

const STAR_VERT = /* glsl */`
attribute vec3 aColor;
attribute float aSize;
attribute float aIndex;
attribute float aLight;
uniform float uPR;
uniform float uSelectedA;
uniform float uSelectedB;
uniform float uHover;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec3 vColor;
varying float vLight;
varying vec3 vRingColor;
varying float vRing;
varying float vSpikes;
void main(){
  vColor = aColor;
  vLight = aLight;
  float a = abs(aIndex - uSelectedA) < 0.5 ? 1.0 : 0.0;
  float b = abs(aIndex - uSelectedB) < 0.5 ? 1.0 : 0.0;
  float hov = abs(aIndex - uHover) < 0.5 ? 1.0 : 0.0;
  vRing = max(max(a, b), hov * 0.5);
  vRingColor = b > 0.5 ? uColorB : a > 0.5 ? uColorA : vec3(0.85, 0.85, 0.85);
  // Only the brightest stars get diffraction spikes, as in a telescope photograph.
  vSpikes = smoothstep(1.2, 2.0, aLight);
  // The sprite is enlarged for the ring, and for the spikes' reach on the brightest stars.
  float size = aSize * (1.0 + vSpikes * 1.4) + vRing * 18.0;
  // Fixed screen size (no distance attenuation): a dot shows how bright the star looks from Earth, in both views.
  gl_PointSize = size * uPR;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const STAR_FRAG = /* glsl */`
varying vec3 vColor;
varying float vLight;
varying vec3 vRingColor;
varying float vRing;
varying float vSpikes;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  // Rescale so the star itself keeps the same footprint whatever the extra room for ring and spikes.
  float grow = 1.0 + vSpikes * 1.4;
  float r = length(c) * 2.0 * grow;
  // Core (white-hot centre), coloured halo, wide faint glow.
  float core = exp(-r * r * 22.0);
  float halo = exp(-r * r * 5.0);
  float glow = exp(-r * 2.6) * 0.25;
  // Four thin spikes along the axes, fading outwards.
  vec2 q = abs(c) * 2.0 * grow;
  float spikes = vSpikes * (exp(-q.x * 60.0) * exp(-q.y * 1.6) + exp(-q.y * 60.0) * exp(-q.x * 1.6)) * 0.55;
  vec3 col = mix(vColor, vec3(1.0), 0.65) * core * 1.8 + vColor * (halo * 0.9 + glow + spikes);
  // Selection ring at a fixed radius in the enlarged sprite.
  float rr = length(c) * 2.0;
  float ring = vRing * smoothstep(0.06, 0.0, abs(rr - 0.86)) * 0.9;
  gl_FragColor = vec4(col * vLight + vRingColor * ring, 1.0);
}
`
