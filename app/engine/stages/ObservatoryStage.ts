import { Group, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Planet, type PlanetBakeProgress } from '../bodies/Planet'
import type { ArtStyle, PlanetRender } from '../presets'
import type { Stage, StageContext, StageFrame } from './Stage'

/** Camera start: slightly above and to the right, so the terminator is visible. */
const CAMERA_START: [number, number, number] = [0.6, 0.9, 6.6]
/** Zoom range in planet radii from the centre. Below ~1.4 the near plane starts clipping the atmosphere. */
const MIN_DISTANCE = 1.45
const MAX_DISTANCE = 14

export interface ObservatoryEvents {
  /** Full-resolution bake progress; null once done. */
  onProgress?: (p: PlanetBakeProgress | null) => void
  /** Called after each rendered frame, for HTML elements pinned to the surface. */
  onFrame?: () => void
}

/** Screen position of a surface point. */
export interface SurfacePoint {
  x: number
  y: number
  /** Cosine between the surface normal and the view direction: ≤ 0 means on the far side. */
  facing: number
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
  private readonly tmp = new Vector3()
  private readonly tmp2 = new Vector3()

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

  attach(ctx: StageContext): void {
    this.ctx = ctx
    ctx.camera.position.set(...CAMERA_START)
    ctx.camera.lookAt(0, 0, 0)

    this.planet = new Planet(ctx.baker, { bakeRes: ctx.quality.bakeRes, atmosphereSteps: ctx.quality.atmosphereSteps })
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
    this.controls = c
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

  /** Projects a point given in planet latitude/longitude (degrees) to canvas pixels. */
  project(latDeg: number, lonDeg: number): SurfacePoint | null {
    const ctx = this.ctx
    const planet = this.planet
    if (!ctx || !planet) return null
    const lat = (latDeg * Math.PI) / 180
    const lon = (lonDeg * Math.PI) / 180
    const p = this.tmp.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon))
    planet.surfaceToWorld(p)
    const nx = p.x - planet.center.x, ny = p.y - planet.center.y, nz = p.z - planet.center.z
    const toCam = this.tmp2.copy(ctx.camera.position).sub(p).normalize()
    const facing = (nx * toCam.x + ny * toCam.y + nz * toCam.z) / Math.hypot(nx, ny, nz)
    p.project(ctx.camera)
    return {
      x: (p.x * 0.5 + 0.5) * ctx.canvas.clientWidth,
      y: (-p.y * 0.5 + 0.5) * ctx.canvas.clientHeight,
      facing,
    }
  }

  setActive(active: boolean): void {
    if (this.controls) this.controls.enabled = active
  }

  update(dt: number): StageFrame {
    const ctx = this.ctx
    if (!ctx || !this.planet) return { render: false, animating: false }
    const moved = this.controls?.update(dt) ?? false
    const spin = this.spin && !ctx.reducedMotion
    // Always refresh uniforms (cheap): a frame can also be requested from outside (resize, bake landing).
    this.planet.update(dt, ctx.camera, spin)
    const progress = this.planet.progress
    if (progress) this.events.onProgress?.(progress)
    const render = spin || moved
    if (render) queueMicrotask(() => this.events.onFrame?.())
    // Damping needs frames after the pointer is released, so the loop keeps ticking while controls exist.
    return { render, animating: true }
  }

  dispose(): void {
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
