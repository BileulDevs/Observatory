import { Group, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Planet, type PlanetBakeProgress } from '../bodies/Planet'
import type { SurfaceFacts } from '../bodies/surfaceFacts'
import { easeInOutCubic, Tween } from '../core/tween'
import type { ArtStyle, PlanetRender } from '../presets'
import type { Stage, StageContext, StageFrame, ViewShift } from './Stage'

/** Camera start: slightly above and to the right, so the terminator is visible. */
const CAMERA_START: [number, number, number] = [0.6, 0.9, 6.6]
/** Zoom range in planet radii from the centre. Below ~1.4 the near plane starts clipping the atmosphere. */
const MIN_DISTANCE = 1.45
const MAX_DISTANCE = 14
/** Flight back to the start view, seconds. Shorter reads as a jump; longer, as the page lagging behind the click. */
const RECENTER_SECONDS = 0.9
/** Directions this close to opposite have no defined path between them: the flight then goes over the pole. */
const OPPOSITE_DOT = -0.999

export interface ObservatoryEvents {
  /** Full-resolution bake progress; null once done. */
  onProgress?: (p: PlanetBakeProgress | null) => void
  /** Measured look of the planet now shown (ocean share, ice...), once per new planet. */
  onFacts?: (facts: SurfaceFacts) => void
}

/**
 * Single-planet viewing room: one planet the visitor can orbit and zoom, with every art-direction control exposed.
 */
export class ObservatoryStage implements Stage {
  readonly root = new Group()
  private ctx: StageContext | null = null
  private planet: Planet | null = null
  private controls: OrbitControls | null = null
  private spec: PlanetRender
  private style: ArtStyle
  private spin = true
  private readonly events: ObservatoryEvents

  constructor(spec: PlanetRender, style: ArtStyle, events: ObservatoryEvents = {}) {
    this.spec = { ...spec }
    this.style = style
    this.events = events
  }

  get subject(): Planet | null {
    return this.planet
  }

  get bakeResolution(): number {
    return this.planet?.resolution ?? 0
  }

  /** Running flight back to the start view, or null. */
  private recentering: Tween | null = null
  private readonly flightFrom = new Vector3()
  private readonly flightTo = new Vector3()
  private readonly flightDir = new Vector3()

  attach(ctx: StageContext): void {
    this.ctx = ctx
    ctx.camera.position.set(...CAMERA_START)
    ctx.camera.lookAt(0, 0, 0)

    this.planet = new Planet(ctx.baker, {
      bakeRes: ctx.quality.bakeRes,
      atmosphereSteps: ctx.quality.atmosphereSteps,
      onFacts: this.events.onFacts,
    })
    this.root.add(this.planet.root)
    this.planet.setStyle(this.style)
    this.applySpec()

    const c = new OrbitControls(ctx.camera, ctx.canvas)
    c.enableDamping = true
    c.dampingFactor = 0.06
    c.enablePan = false
    c.rotateSpeed = 0.45
    c.zoomSpeed = 0.6
    c.minDistance = MIN_DISTANCE
    c.maxDistance = MAX_DISTANCE
    c.addEventListener('change', ctx.invalidate)
    // A drag takes over from a running flight instead of fighting it.
    c.addEventListener('start', this.cancelRecenter)
    this.controls = c
  }

  /**
   * Flies the camera back to the start view (same angle and distance as on arrival). Instant under reduced motion.
   * The path follows the sphere around the planet rather than a straight line, which would cut through it when the
   * camera is on the far side.
   */
  recenter(): void {
    const ctx = this.ctx
    if (!ctx) return
    this.recentering?.cancel()
    // Drop any momentum left by the last drag: with damping on, OrbitControls keeps applying it frame after frame
    // and would drift the camera away again once the flight ends. One undamped update consumes it at once.
    if (this.controls) {
      this.controls.enableDamping = false
      this.controls.update()
      this.controls.enableDamping = true
    }
    const camera = ctx.camera
    const r0 = camera.position.length()
    const to = this.flightTo.set(...CAMERA_START)
    const r1 = to.length()
    const d0 = this.flightFrom.copy(camera.position).normalize()
    const d1 = to.normalize()
    if (d0.dot(d1) < OPPOSITE_DOT) d0.y += 0.05
    this.recentering = new Tween(ctx.reducedMotion ? 0 : RECENTER_SECONDS, (k) => {
      // Normalised linear blend of the two directions: close enough to a great circle at these angles, and cheap.
      const dir = this.flightDir.copy(d0).lerp(d1, k).normalize()
      camera.position.copy(dir).multiplyScalar(r0 + (r1 - r0) * k)
      camera.lookAt(0, 0, 0)
    }, easeInOutCubic, () => { this.recentering = null })
    ctx.invalidate()
  }

  private readonly cancelRecenter = (): void => {
    this.recentering?.cancel()
    this.recentering = null
  }

  setPlanet(spec: PlanetRender): void {
    this.spec = { ...spec }
    this.applySpec()
  }

  setStyle(style: ArtStyle): void {
    this.style = style
    this.planet?.setStyle(style)
    this.ctx?.invalidate()
  }

  /** Degrees; null restores the style default. */
  setSunAzimuth(deg: number | null): void {
    this.planet?.setSunAzimuth(deg)
    this.ctx?.invalidate()
  }

  setRelief(relief: number): void {
    this.planet?.setRelief(relief)
    this.ctx?.invalidate()
  }

  setResolution(res: number): void {
    this.planet?.setResolution(res)
    this.ctx?.invalidate()
  }

  setSpin(spin: boolean): void {
    this.spin = spin
    this.ctx?.invalidate()
  }

  /** Moves the planet on screen (layout change at the wide / narrow breakpoint). */
  setShift(shift: ViewShift): void {
    this.ctx?.setViewShift(shift)
  }

  setActive(active: boolean): void {
    if (this.controls) this.controls.enabled = active
  }

  update(dt: number): StageFrame {
    const ctx = this.ctx
    if (!ctx || !this.planet) return { render: false, animating: false }
    // During a flight the controls stay out of it: their damping would pull the camera back toward the drag.
    const moved = this.recentering ? (this.recentering.step(dt), true) : (this.controls?.update(dt) ?? false)
    const spin = this.spin && !ctx.reducedMotion
    // Always refresh uniforms (cheap): a frame can also be requested from outside (resize, bake landing).
    this.planet.update(dt, ctx.camera, spin)
    const progress = this.planet.progress
    if (progress) this.events.onProgress?.(progress)
    const render = spin || moved
    // Keep the loop alive only while something moves: update() reports damping motion as `moved` until it
    // settles, and a new drag restarts the loop through the controls' change event. Returning true here kept
    // the loop (and this method) running 60 times a second on an idle, paused planet.
    return { render, animating: render }
  }

  dispose(): void {
    this.cancelRecenter()
    this.controls?.removeEventListener('start', this.cancelRecenter)
    if (this.controls && this.ctx) this.controls.removeEventListener('change', this.ctx.invalidate)
    this.controls?.dispose()
    this.controls = null
    this.planet?.dispose()
    this.planet = null
    this.root.removeFromParent()
    this.ctx = null
  }

  private applySpec(): void {
    const ctx = this.ctx
    if (!this.planet || !ctx) return
    this.planet.setSpec(this.spec, (p) => this.events.onProgress?.(p), () => {
      this.events.onProgress?.(null)
      ctx.invalidate()
    })
    ctx.invalidate()
  }
}
