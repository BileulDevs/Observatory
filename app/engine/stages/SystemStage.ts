import {
  BufferGeometry, Color, Group, LineBasicMaterial, LineLoop, Vector2, Vector3,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Moons, type MoonRender } from '../bodies/Moons'
import { Planet } from '../bodies/Planet'
import { Star, blackbodyColor } from '../bodies/Star'
import { Tween, easeInOutCubic, easeOutQuart } from '../core/tween'
import type { PlanetRender } from '../presets'
import type { Stage, StageContext, StageFrame, ViewShift } from './Stage'

export type SystemLayout = 'orbit' | 'carousel'

/** Id used for the star in focus, inspect and label events. Planets never use it. */
export const STAR_ID = 'star'

/** A planet as the stage needs it: everything is already in display units (see app/data/scale.ts). */
export interface SystemBody {
  id: string
  render: PlanetRender
  /** Display radius, world units. */
  radius: number
  /** Display orbit radius, world units. */
  orbit: number
  /** Display seconds per revolution at time scale 1. */
  period: number
  /** Starting angle, radians. */
  phase: number
  /** Major moons, in planet-relative display units. */
  moons?: MoonRender[]
}

export interface SystemStar {
  temperatureK: number
  /** Display radius, world units. */
  radius: number
  seed: number
}

export interface SystemLabel {
  id: string
  x: number
  y: number
  /** On-screen radius, CSS pixels. */
  radius: number
  visible: boolean
}

export interface SystemEvents {
  onLabels?: (labels: SystemLabel[]) => void
  onFocus?: (id: string) => void
  onInspect?: (id: string | null) => void
  onSettled?: (id: string | null) => void
  /** A moon of the inspected planet was selected (its id), or the view went back to the planet (null). */
  onMoon?: (id: string | null) => void
}

export interface SystemOptions {
  layout: SystemLayout
  browseRes: number
  inspectRes: number
  browseShift: ViewShift
  inspectShift: ViewShift
  /** Multiplies the inspect distance; above 1 on portrait screens where the subject only gets the top half. */
  inspectDistance?: number
}

/** Carousel: empty space between neighbours, as a multiple of the larger radius of the pair. */
const CAROUSEL_GAP = 2.2
/** Carousel framing: camera distance in focused-body radii, never closer than CAROUSEL_MIN_DISTANCE. */
const CAROUSEL_DISTANCE = 6.5
const CAROUSEL_MIN_DISTANCE = 4
/**
 * Overview framing relative to the outermost orbit radius R: camera distance and elevation.
 * 3 R at ~42° keeps the near edge of the outer orbit on screen with a 30° lens; closer crops it.
 */
const OVERVIEW_RANGE = 3.0
const OVERVIEW_ELEVATION = (42 * Math.PI) / 180
/** Aim slightly in front of the star: the near half of the orbits takes more screen space than the far half. */
const OVERVIEW_AIM = 0.12
/**
 * Inspect framing, in body radii. For planets the camera sits mostly between the planet and its star (lit side),
 * swung sideways and up so the terminator stays in view: a three-quarter phase reads as a sphere.
 */
const INSPECT_DISTANCE = 5.6
const INSPECT_TOWARDS_STAR = 0.8
const INSPECT_SIDEWAYS = 0.55
const INSPECT_UP = 0.3
/** The star fills more of the frame than a planet would at the same ratio (its halo adds apparent size). */
const STAR_INSPECT_DISTANCE = 7
/** Inspect distance per unit of moon-system extent (planet radii): ~2.3 keeps the outermost moon in frame. */
const MOON_FRAMING = 2.3
const INSPECT_MIN = 1.45
const INSPECT_MAX = 10
/**
 * Moon inspect distance in moon radii. 4.5 filled the screen and ran under the controls; 7.5 leaves the moon
 * about as large as an inspected planet. Closer is one scroll away.
 */
const MOON_INSPECT_DISTANCE = 7.5
/** Zoom-out limit around a moon, in moon radii: far enough to see its planet beside it. */
const MOON_INSPECT_MAX = 40
/** Planet ↔ moon flight, seconds: shorter than a planet flight, the distance is much smaller. */
const MOON_FLIGHT_DURATION = 1.2
/** Minimum moon hit radius on screen, CSS pixels: most moons are a few pixels wide during inspection. */
const MOON_PICK_PX = 14
/** Pointer travel (CSS pixels) beyond which a press is an orbit drag, not a click. */
const CLICK_SLOP_PX = 5
/** Durations in seconds. */
const FLIGHT_DURATION = 1.7
const FOCUS_DURATION = 0.9
const LAYOUT_DURATION = 1.6
/** Peak height added mid-flight, as a fraction of the flight length. */
const FLIGHT_LIFT = 0.12
/** Hit radius bonus: small bodies stay clickable. */
const PICK_SLACK = 1.25
/** Fixed light in the carousel: from the front-right, like the observatory. */
const CAROUSEL_LIGHT = new Vector3(0.75, 0.25, 0.6)

interface Item {
  body: SystemBody
  planet: Planet
  from: Vector3
  line: LineLoop<BufferGeometry, LineBasicMaterial>
  moons: Moons | null
}

/** Separator in moon label ids: "<planet id>/<moon id>". */
export const MOON_SEPARATOR = '/'

/**
 * One planetary system: the star and its planets, browsable as an orrery (true order, compressed distances)
 * or as a carousel (one body at a time). Selecting the star or a planet flies the camera to it.
 */
export class SystemStage implements Stage {
  readonly root = new Group()

  private ctx: StageContext | null = null
  private readonly bodies: SystemBody[]
  private readonly starSpec: SystemStar
  private readonly items: Item[] = []
  private readonly opts: SystemOptions
  private readonly events: SystemEvents
  private star: Star | null = null
  private readonly starFrom = new Vector3()
  private layout: SystemLayout
  /** Browse order: the star first, then planets outwards. */
  private order: string[] = []
  private focusIndex = 0
  private inspectedId_: string | null = null
  private controls: OrbitControls | null = null
  private tweens: Tween[] = []
  private morph = 1
  private time = 0
  private timeScale = 1
  private orbitsVisible = true
  private starTime = 0
  /** Moons keep orbiting while a planet is inspected, so they get their own clock. */
  private moonTime = 0
  private readonly camTarget = new Vector3()
  private readonly tmp = new Vector3()
  private readonly tmp2 = new Vector3()
  private readonly ndc = new Vector2()
  private wheelLock = 0
  private hoverId: string | null = null
  private moonsVisible = true
  /** Selected moon of the inspected planet. */
  private moonId_: string | null = null
  /** The orbit controls target tracks the selected moon (set once the flight to it has landed). */
  private followMoon = false
  private readonly pressAt = new Vector2()
  private readonly moonDir = new Vector3()

  constructor(star: SystemStar, bodies: SystemBody[], opts: SystemOptions, events: SystemEvents = {}) {
    this.starSpec = star
    this.bodies = bodies
    this.opts = opts
    this.events = events
    this.layout = opts.layout
  }

  get subject(): Planet | null {
    const id = this.inspectedId_ ?? this.focusedId
    return this.itemById(id)?.planet ?? null
  }

  get currentLayout(): SystemLayout {
    return this.layout
  }

  get focusedId(): string | null {
    return this.order[this.focusIndex] ?? null
  }

  get inspectedId(): string | null {
    return this.inspectedId_
  }

  get moonId(): string | null {
    return this.moonId_
  }

  attach(ctx: StageContext): void {
    this.ctx = ctx
    this.star = new Star(this.starSpec.temperatureK, this.starSpec.radius, this.starSpec.seed)
    this.root.add(this.star.root)
    const tint = blackbodyColor(this.starSpec.temperatureK)

    for (const body of this.bodies) {
      const planet = new Planet(ctx.baker, { bakeRes: this.opts.browseRes, atmosphereSteps: ctx.quality.atmosphereSteps })
      planet.setStyle('natural')
      planet.setScale(body.radius)
      planet.setLightTint(tint)
      planet.setSpec(body.render, undefined, () => ctx.invalidate())
      this.root.add(planet.root)
      const line = makeOrbitLine(body.orbit)
      this.root.add(line)
      let moons: Moons | null = null
      if (body.moons?.length) {
        moons = new Moons(body.moons, planet.lightUniforms)
        // Inside the planet's tilted, scaled frame: orbits follow its equator and its display size.
        planet.root.add(moons.root)
      }
      this.items.push({ body, planet, from: new Vector3(), line, moons })
    }
    this.order = [STAR_ID, ...this.items.map((i) => i.body.id)]
    // Start focused on the first planet: the star is one step back.
    this.focusIndex = this.items.length ? 1 : 0

    for (const item of this.items) this.layoutPosition(item, item.planet.root.position)
    this.starPosition(this.star.root.position)
    this.applyLayoutVisibility()
    this.layoutCamera(ctx.camera.position, this.camTarget)
    ctx.camera.lookAt(this.camTarget)
    ctx.setViewShift(this.opts.browseShift)

    ctx.canvas.addEventListener('pointerdown', this.onPointerDown)
    ctx.canvas.addEventListener('pointermove', this.onPointerMove)
    ctx.canvas.addEventListener('click', this.onClick)
    ctx.canvas.addEventListener('wheel', this.onWheel, { passive: false })
    const first = this.focusedId
    if (first) this.events.onFocus?.(first)
  }

  setLayout(layout: SystemLayout): void {
    const ctx = this.ctx
    if (!ctx || layout === this.layout) return
    if (this.inspectedId_) this.inspect(null)
    this.layout = layout
    this.relayout()
  }

  /** Morphs bodies and camera to the current layout's positions (after a layout or spacing change). */
  private relayout(): void {
    const ctx = this.ctx
    if (!ctx) return
    for (const item of this.items) item.from.copy(item.planet.root.position)
    if (this.star) this.starFrom.copy(this.star.root.position)
    this.applyLayoutVisibility()
    const camFrom = ctx.camera.position.clone()
    const lookFrom = this.camTarget.clone()
    const camTo = new Vector3()
    const lookTo = new Vector3()
    this.morph = 0
    this.run(new Tween(ctx.reducedMotion ? 0 : LAYOUT_DURATION, (k) => {
      this.morph = k
      this.layoutCamera(camTo, lookTo)
      ctx.camera.position.lerpVectors(camFrom, camTo, k)
      this.camTarget.lerpVectors(lookFrom, lookTo, k)
    }))
  }

  /** Multiplies orbital motion and planet spin. 0 pauses everything (flights still run). */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale)
    this.ctx?.invalidate()
  }

  setOrbitsVisible(visible: boolean): void {
    this.orbitsVisible = visible
    this.applyLayoutVisibility()
    this.ctx?.invalidate()
  }

  /**
   * Shows or hides every moon with its orbit line. Hiding leaves a selected moon (back to its planet) and, in the
   * carousel, closes the gaps the moon systems needed.
   */
  setMoonsVisible(visible: boolean): void {
    if (visible === this.moonsVisible) return
    if (!visible && this.moonId_) this.selectMoon(null)
    this.moonsVisible = visible
    for (const item of this.items) item.moons?.setVisible(visible)
    const inspected = this.itemById(this.inspectedId_)
    if (inspected && this.controls && !this.moonId_) {
      this.controls.maxDistance = inspected.body.radius * Math.max(INSPECT_MAX, this.moonFraming(inspected) * 1.6)
    }
    if (this.layout === 'carousel' && !this.inspectedId_) this.relayout()
    this.emitLabels()
    this.ctx?.invalidate()
  }

  /**
   * Flies to a moon of the inspected planet, then orbits it while it moves; null flies back to the planet.
   * Ignored when no planet is inspected, the moon is unknown, or moons are hidden.
   */
  selectMoon(id: string | null): void {
    const ctx = this.ctx
    const item = this.itemById(this.inspectedId_)
    const moons = item?.moons
    if (!ctx || !item || !moons) return
    if (id !== null && (!moons.has(id) || !this.moonsVisible)) return
    if (id === this.moonId_) return
    this.disposeControls()
    this.tweens.forEach((t) => t.cancel())
    this.tweens = []
    this.followMoon = false
    this.moonId_ = id
    this.events.onMoon?.(id)

    const camFrom = ctx.camera.position.clone()
    const lookFrom = this.camTarget.clone()
    const duration = ctx.reducedMotion ? 0 : MOON_FLIGHT_DURATION
    // A deep link selects the moon while the planet flight is still running: that flight is cancelled above,
    // so finish its framing shift here too, or the subject stays where the browse view put it.
    const shiftFrom = { ...ctx.viewShift }
    const shiftTo = this.opts.inspectShift
    if (id) {
      const look = new Vector3()
      const cam = new Vector3()
      // The moon keeps moving during the flight: aim at where it is on each frame, not where it was.
      this.run(new Tween(duration, (k) => {
        this.moonInspectPosition(item, moons, id, look, cam)
        this.flight(camFrom, cam, lookFrom, look, k)
        ctx.setViewShift(lerpShift(shiftFrom, shiftTo, k))
      }, easeInOutCubic, () => {
        moons.worldPosition(id, look)
        const r = moons.worldRadius(id)
        this.createControls(look, r, MOON_INSPECT_MAX)
        this.followMoon = true
      }))
    } else {
      const center = item.planet.root.position
      const camTo = this.inspectPosition(item)
      this.run(new Tween(duration, (k) => {
        this.flight(camFrom, camTo, lookFrom, center, k)
        ctx.setViewShift(lerpShift(shiftFrom, shiftTo, k))
      }, easeInOutCubic, () => {
        this.createControls(center, item.body.radius, this.moonFraming(item) * 1.6)
      }))
    }
    ctx.invalidate()
  }

  /** Back to the overview framing (and out of any inspection). */
  recenter(): void {
    if (this.inspectedId_) {
      this.inspect(null)
      return
    }
    const ctx = this.ctx
    if (!ctx) return
    const camFrom = ctx.camera.position.clone()
    const lookFrom = this.camTarget.clone()
    const camTo = new Vector3()
    const lookTo = new Vector3()
    this.run(new Tween(ctx.reducedMotion ? 0 : FOCUS_DURATION, (k) => {
      this.layoutCamera(camTo, lookTo)
      ctx.camera.position.lerpVectors(camFrom, camTo, k)
      this.camTarget.lerpVectors(lookFrom, lookTo, k)
    }, easeOutQuart))
  }

  step(direction: 1 | -1): void {
    if (this.order.length === 0) return
    const next = (this.focusIndex + direction + this.order.length) % this.order.length
    const id = this.order[next]!
    if (this.inspectedId_) this.inspect(id)
    else this.focus(id)
  }

  focus(id: string): void {
    const ctx = this.ctx
    const index = this.order.indexOf(id)
    if (!ctx || index < 0 || this.inspectedId_) return
    this.focusIndex = index
    this.events.onFocus?.(id)
    if (this.layout === 'carousel') {
      const camFrom = ctx.camera.position.clone()
      const lookFrom = this.camTarget.clone()
      const camTo = new Vector3()
      const lookTo = new Vector3()
      this.layoutCamera(camTo, lookTo)
      this.run(new Tween(ctx.reducedMotion ? 0 : FOCUS_DURATION, (k) => {
        ctx.camera.position.lerpVectors(camFrom, camTo, k)
        this.camTarget.lerpVectors(lookFrom, lookTo, k)
      }, easeOutQuart))
    }
    ctx.invalidate()
  }

  /** Flies to the star or a planet (or back to the overview with null). */
  inspect(id: string | null): void {
    const ctx = this.ctx
    if (!ctx) return
    const target = id !== null && this.order.includes(id) ? id : null
    if (target === this.inspectedId_) return
    this.disposeControls()
    this.tweens.forEach((t) => t.cancel())
    this.tweens = []

    const previous = this.itemById(this.inspectedId_)
    this.followMoon = false
    if (this.moonId_) {
      this.moonId_ = null
      this.events.onMoon?.(null)
    }
    this.inspectedId_ = target
    this.events.onInspect?.(target)

    const camFrom = ctx.camera.position.clone()
    const lookFrom = this.camTarget.clone()
    const shiftFrom = { ...ctx.viewShift }
    const duration = ctx.reducedMotion ? 0 : FLIGHT_DURATION

    if (target) {
      this.focusIndex = this.order.indexOf(target)
      this.events.onFocus?.(target)
      const item = this.itemById(target)
      item?.planet.setResolution(this.opts.inspectRes)
      const center = item ? item.planet.root.position : this.star!.root.position
      const radius = item ? item.body.radius : this.starSpec.radius
      const camTo = item ? this.inspectPosition(item) : this.starInspectPosition()
      this.run(new Tween(duration, (k) => {
        this.flight(camFrom, camTo, lookFrom, center, k)
        ctx.setViewShift(lerpShift(shiftFrom, this.opts.inspectShift, k))
      }, easeInOutCubic, () => {
        this.createControls(center, radius, item ? this.moonFraming(item) * 1.6 : 0)
        this.events.onSettled?.(target)
      }))
    } else {
      const camTo = new Vector3()
      const lookTo = new Vector3()
      this.run(new Tween(duration, (k) => {
        this.layoutCamera(camTo, lookTo)
        this.flight(camFrom, camTo, lookFrom, lookTo, k)
        ctx.setViewShift(lerpShift(shiftFrom, this.opts.browseShift, k))
      }, easeInOutCubic, () => this.events.onSettled?.(null)))
    }
    // The previous planet no longer needs its high-resolution bake: free that memory.
    if (previous && previous.body.id !== target) previous.planet.setResolution(this.opts.browseRes)
    ctx.invalidate()
  }

  pick(clientX: number, clientY: number): string | null {
    const ctx = this.ctx
    if (!ctx) return null
    const rect = ctx.canvas.getBoundingClientRect()
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    const origin = this.tmp.copy(ctx.camera.position)
    const dir = this.tmp2.set(this.ndc.x, this.ndc.y, 0.5).unproject(ctx.camera).sub(origin).normalize()
    let best: string | null = null
    let bestT = Infinity
    const test = (id: string, c: Vector3, radius: number) => {
      const r = radius * PICK_SLACK
      const ocx = origin.x - c.x, ocy = origin.y - c.y, ocz = origin.z - c.z
      const b = ocx * dir.x + ocy * dir.y + ocz * dir.z
      const disc = b * b - (ocx * ocx + ocy * ocy + ocz * ocz - r * r)
      if (disc < 0) return
      const t = -b - Math.sqrt(disc)
      if (t > 0 && t < bestT) { bestT = t; best = id }
    }
    if (this.star) test(STAR_ID, this.star.root.position, this.starSpec.radius)
    for (const item of this.items) test(item.body.id, item.planet.root.position, item.body.radius)
    return best
  }

  update(dt: number): StageFrame {
    const ctx = this.ctx
    if (!ctx) return { render: false, animating: false }
    let render = false

    if (this.tweens.length) {
      this.tweens = this.tweens.filter((t) => t.step(dt))
      render = true
    }
    const scaled = ctx.reducedMotion ? 0 : dt * this.timeScale
    const orbiting = this.layout === 'orbit' && !this.inspectedId_ && scaled > 0
    if (orbiting) this.time += scaled

    if (orbiting || this.morph < 1) {
      for (const item of this.items) {
        this.layoutPosition(item, this.tmp)
        item.planet.root.position.lerpVectors(item.from, this.tmp, this.morph)
      }
      if (this.star) {
        this.starPosition(this.tmp)
        this.star.root.position.lerpVectors(this.starFrom, this.tmp, this.morph)
      }
      if (this.morph >= 1) {
        for (const item of this.items) item.from.copy(item.planet.root.position)
        if (this.star) this.starFrom.copy(this.star.root.position)
      }
      this.updateLighting()
      render = true
    }

    // Moons first: the controls may be following one of them this frame.
    this.moonTime += scaled
    for (const item of this.items) item.moons?.update(this.moonTime)
    if (this.followMoon && this.controls && this.moonId_ && scaled > 0) {
      const moons = this.itemById(this.inspectedId_)?.moons
      if (moons?.worldPosition(this.moonId_, this.tmp)) {
        // Carry the camera along with the target so the visitor's chosen angle and zoom are kept.
        ctx.camera.position.add(this.tmp2.copy(this.tmp).sub(this.controls.target))
        this.controls.target.copy(this.tmp)
        render = true
      }
    }

    if (this.controls) {
      if (this.controls.update(dt)) render = true
    } else {
      ctx.camera.lookAt(this.camTarget)
    }

    const spinning = scaled > 0
    for (const item of this.items) item.planet.update(scaled, ctx.camera, spinning)
    this.starTime += scaled
    this.star?.update(this.starTime)
    if (spinning) render = true
    if (render) this.emitLabels()
    return { render, animating: true }
  }

  dispose(): void {
    const ctx = this.ctx
    if (ctx) {
      ctx.canvas.removeEventListener('pointerdown', this.onPointerDown)
      ctx.canvas.removeEventListener('pointermove', this.onPointerMove)
      ctx.canvas.removeEventListener('click', this.onClick)
      ctx.canvas.removeEventListener('wheel', this.onWheel)
      ctx.canvas.style.cursor = ''
    }
    this.disposeControls()
    this.tweens.forEach((t) => t.cancel())
    this.tweens = []
    for (const item of this.items) {
      item.moons?.dispose()
      item.planet.dispose()
      item.line.geometry.dispose()
      item.line.material.dispose()
    }
    this.items.length = 0
    this.star?.dispose()
    this.star = null
    this.root.removeFromParent()
    this.ctx = null
  }

  /** Planet radius including its moon system: what the carousel must keep clear around it. */
  private extentOf(item: Item): number {
    return item.body.radius * (item.moons && this.moonsVisible ? Math.max(1, item.moons.extent * 0.75) : 1)
  }

  /** Inspect distance (planet radii) that frames the visible moon system; 0 without moons. */
  private moonFraming(item: Item): number {
    return item.moons && this.moonsVisible ? item.moons.extent * MOON_FRAMING : 0
  }

  private itemById(id: string | null): Item | undefined {
    return id ? this.items.find((i) => i.body.id === id) : undefined
  }

  private run(t: Tween): void {
    this.tweens.push(t)
    this.ctx?.invalidate()
  }

  private flight(camFrom: Vector3, camTo: Vector3, lookFrom: Vector3, lookTo: Vector3, k: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const length = camFrom.distanceTo(camTo)
    ctx.camera.position.lerpVectors(camFrom, camTo, k)
    ctx.camera.position.y += Math.sin(Math.PI * k) * length * FLIGHT_LIFT
    this.camTarget.lerpVectors(lookFrom, lookTo, k)
    ctx.camera.lookAt(this.camTarget)
  }

  private inspectPosition(item: Item): Vector3 {
    const center = item.planet.root.position
    const dir = this.viewDirection(center, new Vector3())
    // With moons, step back far enough to frame the whole moon system; the visitor can still zoom in.
    const framing = Math.max(INSPECT_DISTANCE, this.moonFraming(item))
    return center.clone().addScaledVector(dir, item.body.radius * framing * (this.opts.inspectDistance ?? 1))
  }

  /**
   * Camera direction for inspecting a body at `center`: mostly towards the light (lit side), swung sideways and
   * up so the terminator stays in view.
   */
  private viewDirection(center: Vector3, out: Vector3): Vector3 {
    const starPos = this.star?.root.position
    out.copy(starPos ?? center).sub(center)
    if (this.layout === 'carousel' || out.lengthSq() < 1e-6) out.copy(CAROUSEL_LIGHT)
    out.normalize()
    const side = this.tmp2.set(0, 1, 0).cross(out).normalize()
    return out.multiplyScalar(INSPECT_TOWARDS_STAR).addScaledVector(side, INSPECT_SIDEWAYS).add(this.tmp2.set(0, INSPECT_UP, 0)).normalize()
  }

  /** Where to look and stand to inspect a moon, for its current position. */
  private moonInspectPosition(item: Item, moons: Moons, id: string, look: Vector3, cam: Vector3): void {
    moons.worldPosition(id, look)
    // The planet's light direction, not the moon's own: at this scale they are the same and it stays steady.
    // Own scratch vector: `cam` cannot hold the direction, it is overwritten with the moon position below.
    const dir = this.viewDirection(item.planet.root.position, this.moonDir)
    const dist = moons.worldRadius(id) * MOON_INSPECT_DISTANCE * (this.opts.inspectDistance ?? 1)
    cam.copy(look).addScaledVector(dir, dist)
  }

  private starInspectPosition(): Vector3 {
    const center = this.star?.root.position ?? new Vector3()
    const dir = new Vector3(0.35, 0.3, 1).normalize()
    return center.clone().addScaledVector(dir, this.starSpec.radius * STAR_INSPECT_DISTANCE * (this.opts.inspectDistance ?? 1))
  }

  private layoutPosition(item: Item, out: Vector3): Vector3 {
    if (this.layout === 'carousel') {
      // The star sits at x = 0, then each planet to the right; surfaces never touch.
      let x = 0
      let prevRadius = this.starSpec.radius
      for (const it of this.items) {
        const r = this.extentOf(it)
        x += prevRadius + r + CAROUSEL_GAP * Math.max(prevRadius, r)
        if (it === item) break
        prevRadius = r
      }
      return out.set(x, 0, 0)
    }
    const b = item.body
    const angle = b.phase + (this.time / b.period) * Math.PI * 2
    return out.set(Math.cos(angle) * b.orbit, 0, -Math.sin(angle) * b.orbit)
  }

  private starPosition(out: Vector3): Vector3 {
    return out.set(0, 0, 0)
  }

  private layoutCamera(pos: Vector3, look: Vector3): void {
    if (this.layout === 'carousel') {
      const id = this.focusedId
      const item = this.itemById(id)
      if (item) this.layoutPosition(item, look)
      else this.starPosition(look)
      const r = item ? this.extentOf(item) : this.starSpec.radius
      const d = Math.max(CAROUSEL_MIN_DISTANCE, r * CAROUSEL_DISTANCE)
      pos.copy(look).add(this.tmp2.set(0, d * 0.12, d))
      return
    }
    const outer = this.bodies.reduce((m, b) => Math.max(m, b.orbit + b.radius), this.starSpec.radius * 2)
    pos.set(0, outer * OVERVIEW_RANGE * Math.sin(OVERVIEW_ELEVATION), outer * OVERVIEW_RANGE * Math.cos(OVERVIEW_ELEVATION))
    look.set(0, 0, outer * OVERVIEW_AIM)
  }

  /** Orrery: each planet is lit by the star. Carousel: one fixed key light for all. */
  private updateLighting(): void {
    const starPos = this.star?.root.position
    for (const item of this.items) {
      if (this.layout === 'orbit' && starPos) item.planet.setSunDirection(this.tmp2.copy(starPos).sub(item.planet.root.position))
      else item.planet.setSunDirection(CAROUSEL_LIGHT)
    }
  }

  private applyLayoutVisibility(): void {
    const showLines = this.layout === 'orbit' && this.orbitsVisible
    for (const item of this.items) {
      item.line.visible = showLines
      item.moons?.setOrbitsVisible(this.orbitsVisible)
    }
    this.updateLighting()
  }

  /** `farthest` is in body radii: room to zoom out over a whole moon system. */
  private createControls(center: Vector3, radius: number, farthest = 0): void {
    const ctx = this.ctx
    if (!ctx) return
    const c = new OrbitControls(ctx.camera, ctx.canvas)
    c.target.copy(center)
    c.enableDamping = true
    c.dampingFactor = 0.06
    c.enablePan = false
    c.minDistance = radius * INSPECT_MIN
    c.maxDistance = radius * Math.max(INSPECT_MAX, farthest)
    c.rotateSpeed = 0.45
    c.zoomSpeed = 0.6
    c.addEventListener('change', ctx.invalidate)
    this.controls = c
  }

  private disposeControls(): void {
    if (!this.controls) return
    if (this.ctx) this.controls.removeEventListener('change', this.ctx.invalidate)
    this.camTarget.copy(this.controls.target)
    this.controls.dispose()
    this.controls = null
  }

  private emitLabels(): void {
    const ctx = this.ctx
    if (!ctx || !this.events.onLabels) return
    const w = ctx.canvas.clientWidth
    const h = ctx.canvas.clientHeight
    const cam = ctx.camera
    const focal = ((h / 2) / Math.tan((cam.fov * Math.PI) / 360)) * cam.zoom
    const label = (id: string, pos: Vector3, radius: number): SystemLabel => {
      const p = this.tmp.copy(pos)
      const dist = p.distanceTo(cam.position)
      p.project(cam)
      return {
        id,
        x: (p.x * 0.5 + 0.5) * w,
        y: (-p.y * 0.5 + 0.5) * h,
        radius: (focal * radius) / dist,
        visible: p.z < 1,
      }
    }
    const labels = this.items.map((item) => label(item.body.id, item.planet.root.position, item.body.radius))
    if (this.star) labels.unshift(label(STAR_ID, this.star.root.position, this.starSpec.radius))
    // Moon names only around the inspected planet: everywhere else they would be unreadable clutter.
    const inspected = this.itemById(this.inspectedId_)
    if (inspected?.moons && this.moonsVisible) {
      const pos = new Vector3()
      for (const id of inspected.moons.ids) {
        if (!inspected.moons.worldPosition(id, pos)) continue
        const hidden = this.behind(pos, inspected.planet.root.position, inspected.body.radius)
        const l = label(inspected.body.id + MOON_SEPARATOR + id, pos, inspected.moons.worldRadius(id))
        if (hidden) l.visible = false
        labels.push(l)
      }
    }
    this.events.onLabels(labels)
  }

  /**
   * During inspection, what the pointer is over: a moon id, the planet (only meaningful to leave a selected
   * moon), or nothing. Screen-space test with a minimum radius, since moons are often a few pixels wide.
   */
  private pickInInspection(clientX: number, clientY: number): { moon: string } | 'planet' | null {
    const ctx = this.ctx
    const item = this.itemById(this.inspectedId_)
    if (!ctx || !item) return null
    const rect = ctx.canvas.getBoundingClientRect()
    const cam = ctx.camera
    const focal = ((rect.height / 2) / Math.tan((cam.fov * Math.PI) / 360)) * cam.zoom
    // Distance along the view ray at which the planet is hit, to skip moons hidden behind it.
    const planetT = this.rayHit(clientX, clientY, item.planet.root.position, item.body.radius)
    let best: string | null = null
    let bestScore = Infinity
    const moons = item.moons
    if (moons && this.moonsVisible) {
      const pos = new Vector3()
      for (const id of moons.ids) {
        if (id === this.moonId_ || !moons.worldPosition(id, pos)) continue
        const dist = pos.distanceTo(cam.position)
        if (planetT !== null && dist > planetT) continue
        pos.project(cam)
        if (pos.z > 1) continue
        const x = rect.left + (pos.x * 0.5 + 0.5) * rect.width
        const y = rect.top + (-pos.y * 0.5 + 0.5) * rect.height
        const r = Math.max((focal * moons.worldRadius(id)) / dist * PICK_SLACK, MOON_PICK_PX)
        const d = Math.hypot(clientX - x, clientY - y)
        // Nearest relative to its own size: a small moon beside a large one stays reachable.
        if (d <= r && d / r < bestScore) { bestScore = d / r; best = id }
      }
    }
    if (best) return { moon: best }
    return planetT !== null ? 'planet' : null
  }

  /**
   * True when the sphere (center, radius) hides `point` from the camera: a moon passing behind its planet
   * must lose its label, or the name floats over the planet's face.
   */
  private behind(point: Vector3, center: Vector3, radius: number): boolean {
    const cam = this.ctx?.camera.position
    if (!cam) return false
    const dir = this.tmp2.copy(point).sub(cam)
    const len = dir.length()
    dir.divideScalar(len)
    const ocx = cam.x - center.x, ocy = cam.y - center.y, ocz = cam.z - center.z
    const b = ocx * dir.x + ocy * dir.y + ocz * dir.z
    const disc = b * b - (ocx * ocx + ocy * ocy + ocz * ocz - radius * radius)
    if (disc < 0) return false
    const t = -b - Math.sqrt(disc)
    return t > 0 && t < len
  }

  /** Ray–sphere hit distance from the camera through a screen point, or null on a miss. */
  private rayHit(clientX: number, clientY: number, c: Vector3, radius: number): number | null {
    const ctx = this.ctx
    if (!ctx) return null
    const rect = ctx.canvas.getBoundingClientRect()
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    const origin = ctx.camera.position
    const dir = this.tmp2.set(this.ndc.x, this.ndc.y, 0.5).unproject(ctx.camera).sub(origin).normalize()
    const ocx = origin.x - c.x, ocy = origin.y - c.y, ocz = origin.z - c.z
    const b = ocx * dir.x + ocy * dir.y + ocz * dir.z
    const disc = b * b - (ocx * ocx + ocy * ocy + ocz * ocz - radius * radius)
    if (disc < 0) return null
    const t = -b - Math.sqrt(disc)
    return t > 0 ? t : null
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.pressAt.set(e.clientX, e.clientY)
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.ctx) return
    if (this.inspectedId_) {
      // Buttons held: the visitor is orbiting, leave the cursor to the controls.
      if (e.buttons) return
      // Forget the browse hover, so the cursor is recomputed when the inspection ends.
      this.hoverId = null
      const hit = this.pickInInspection(e.clientX, e.clientY)
      const clickable = hit !== null && (typeof hit === 'object' || this.moonId_ !== null)
      this.ctx.canvas.style.cursor = clickable ? 'pointer' : ''
      return
    }
    const id = this.pick(e.clientX, e.clientY)
    if (id !== this.hoverId) {
      this.hoverId = id
      this.ctx.canvas.style.cursor = id ? 'pointer' : ''
      if (id && this.layout === 'orbit') this.focus(id)
    }
  }

  private readonly onClick = (e: MouseEvent): void => {
    if (this.inspectedId_) {
      // A drag to orbit the camera also ends with a click event: only a still press selects.
      if (Math.hypot(e.clientX - this.pressAt.x, e.clientY - this.pressAt.y) > CLICK_SLOP_PX) return
      const hit = this.pickInInspection(e.clientX, e.clientY)
      if (hit && typeof hit === 'object') this.selectMoon(hit.moon)
      else if (hit === 'planet' && this.moonId_) this.selectMoon(null)
      return
    }
    const id = this.pick(e.clientX, e.clientY)
    if (!id) return
    if (this.layout === 'carousel' && id !== this.focusedId) this.focus(id)
    else this.inspect(id)
  }

  private readonly onWheel = (e: WheelEvent): void => {
    if (this.inspectedId_ || this.layout !== 'carousel') return
    // In the carousel the wheel browses bodies; the page itself does not scroll.
    e.preventDefault()
    const now = performance.now()
    if (now < this.wheelLock) return
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(delta) < 4) return
    // A short lock turns trackpad inertia into single steps.
    this.wheelLock = now + 450
    this.step(delta > 0 ? 1 : -1)
  }
}

function lerpShift(a: ViewShift, b: ViewShift, k: number): ViewShift {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

/** Opacity of the orbit hairlines in the system view; anything stronger competes with the planets. */
const ORBIT_LINE_OPACITY = 0.14

/** Faint hairline circle in the page text colour, in the orbital plane. Shared with the catalogue thumbnails. */
export function makeOrbitLine(radius: number, opacity = ORBIT_LINE_OPACITY): LineLoop<BufferGeometry, LineBasicMaterial> {
  const segments = 256
  const pts: Vector3[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  return new LineLoop(
    new BufferGeometry().setFromPoints(pts),
    new LineBasicMaterial({ color: new Color('#ece7dc'), transparent: true, opacity }),
  )
}
