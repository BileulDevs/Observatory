import { Group, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ObjectRender } from '~/types/objects'
import { easeInOutCubic, Tween } from '../core/tween'
import { isAnchorKey } from '../objects/anchors'
import { createBody } from '../objects/createBody'
import { createLights, SUN_DIRECTION } from '../objects/lighting'
import type { SpaceBody } from '../objects/types'
import type { Stage, StageContext, StageFrame, ViewShift } from './Stage'

export interface ObjectStageOptions {
  /** Where the object sits on screen (the fact panel takes one side). */
  shift: ViewShift
  /** Multiplies the default camera distance (portrait screens need more room). */
  distanceScale?: number
}

export interface ObjectStageEvents {
  /** A frame with a moved camera or object is about to be drawn: re-place the HTML markers. */
  onFrame?(): void
}

/** Zoom-out limit, in default viewing distances. */
const MAX_ZOOM_OUT = 3
/** Recentre flight duration, seconds. */
const RECENTER_DURATION = 1.1
/**
 * Distance the camera comes to when flying to a marker, as a share of the default viewing distance. Lower = closer
 * on the feature (and less context around it); never closer than 1.5 × the zoom-in limit.
 */
const MARKER_VIEW_SHARE = 0.4

/**
 * Full-screen view of one catalogue object: the body at the origin, orbit/zoom controls around it, and a play /
 * pause switch for its motion.
 */
export class ObjectStage implements Stage {
  readonly root = new Group()
  readonly subject = null

  private ctx: StageContext | null = null
  private body: SpaceBody | null = null
  private controls: OrbitControls | null = null
  private time = 0
  private playing = true
  private tween: Tween | null = null
  private readonly focus = new Vector3()
  private readonly tmp = new Vector3()
  /** Markers must be re-projected on the next update (canvas resized, layout changed). */
  private overlayStale = false

  constructor(private render: ObjectRender, private opts: ObjectStageOptions, private readonly events: ObjectStageEvents = {}) {}

  attach(ctx: StageContext): void {
    this.ctx = ctx
    this.root.add(createLights())
    const body = this.build(ctx)
    ctx.setViewShift(this.opts.shift)
    this.home(ctx.camera.position)
    ctx.camera.lookAt(this.focus)
    const c = new OrbitControls(ctx.camera, ctx.canvas)
    c.target.copy(this.focus)
    c.enableDamping = true
    c.dampingFactor = 0.07
    c.enablePan = false
    c.rotateSpeed = 0.5
    c.zoomSpeed = 0.7
    c.addEventListener('change', ctx.invalidate)
    this.controls = c
    this.fitControls(body)
    ctx.invalidate()
  }

  /**
   * Replaces the object with another description (the creator, on every change). The camera stays where the
   * visitor put it when the kind of object is the same; a new kind starts from its own default view.
   */
  setRender(render: ObjectRender): void {
    const sameKind = render.kind === this.render.kind
    this.render = render
    const ctx = this.ctx
    if (!ctx) return
    this.body?.dispose()
    const body = this.build(ctx)
    this.fitControls(body)
    if (!sameKind) {
      this.home(ctx.camera.position)
      this.controls?.target.copy(this.focus)
      ctx.camera.lookAt(this.focus)
    }
    ctx.invalidate()
  }

  private build(ctx: StageContext): SpaceBody {
    const body = createBody(this.render, {
      baker: ctx.baker, renderer: ctx.renderer, drawTarget: ctx.drawTarget, quality: ctx.quality, preview: false, sunDir: SUN_DIRECTION, sky: ctx.sky,
      invalidate: () => ctx.invalidate(),
    })
    this.body = body
    this.root.add(body.root)
    this.focus.set(0, 0, 0)
    if (body.focus) this.focus.copy(body.focus)
    return body
  }

  /** Zoom limits from the body's size. */
  private fitControls(body: SpaceBody): void {
    const c = this.controls
    if (!c) return
    c.minDistance = body.radius * body.minDistance
    c.maxDistance = body.radius * body.view.distance * (this.opts.distanceScale ?? 1) * MAX_ZOOM_OUT
  }

  /** Default camera position from the body's preferred view. */
  private home(out: Vector3): Vector3 {
    const body = this.body
    if (!body) return out
    const el = (body.view.elevationDeg * Math.PI) / 180
    const az = (body.view.azimuthDeg * Math.PI) / 180
    const d = body.radius * body.view.distance * (this.opts.distanceScale ?? 1)
    return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(this.focus)
  }

  /**
   * New placement after a layout change (wide / narrow breakpoint): the object moves on screen at once; the zoom
   * limits follow the new distance scale, and the default view uses it from the next recentre.
   */
  setLayout(opts: ObjectStageOptions): void {
    this.opts = opts
    this.overlayStale = true
    this.ctx?.setViewShift(opts.shift)
    if (this.body) this.fitControls(this.body)
  }

  /** Back to the default view. */
  recenter(): void {
    const ctx = this.ctx
    if (!ctx || !this.controls) return
    this.flyTo(this.home(new Vector3()), this.focus)
  }

  /**
   * Flies the camera to one of the body's marker points: the orbit centre moves onto it and the camera comes in
   * along its current line of sight, so the feature ends up centred and seen from the same side. The point is
   * taken at the moment of the click (a turning body carries it on). False when the point is not available.
   */
  focusMarker(key: string): boolean {
    const ctx = this.ctx
    const body = this.body
    const c = this.controls
    if (!ctx || !body || !c) return false
    const target = body.anchor(key, ctx.camera, new Vector3())
    if (!target) return false
    const distance = Math.max(
      body.radius * body.view.distance * (this.opts.distanceScale ?? 1) * MARKER_VIEW_SHARE,
      c.minDistance * 1.5,
    )
    const dir = ctx.camera.position.clone().sub(target)
    // Camera already on the point (cannot happen through the controls' zoom limit, but guard the normalise).
    if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1)
    this.flyTo(dir.setLength(distance).add(target), target)
    return true
  }

  /** Moves camera and orbit centre together from where they are, eased; instant with reduced motion. */
  private flyTo(position: Vector3, target: Vector3): void {
    const ctx = this.ctx
    const c = this.controls
    if (!ctx || !c) return
    const fromPos = ctx.camera.position.clone()
    const fromTarget = c.target.clone()
    const toPos = position.clone()
    const toTarget = target.clone()
    this.tween?.cancel()
    this.tween = new Tween(ctx.reducedMotion ? 0 : RECENTER_DURATION, (k) => {
      ctx.camera.position.lerpVectors(fromPos, toPos, k)
      c.target.lerpVectors(fromTarget, toTarget, k)
    }, easeInOutCubic)
    ctx.invalidate()
  }

  /**
   * Screen position (CSS pixels, canvas-relative) of one of the body's marker points, or null when the body has
   * no such point, it is hidden, or it is behind the camera.
   */
  project(key: string): { x: number; y: number } | null {
    const ctx = this.ctx
    const body = this.body
    if (!ctx || !body) return null
    const p = body.anchor(key, ctx.camera, this.tmp)
    if (!p) return null
    p.project(ctx.camera)
    if (p.z > 1 || p.z < -1) return null
    const rect = ctx.canvas.getBoundingClientRect()
    return { x: (p.x * 0.5 + 0.5) * rect.width, y: (-p.y * 0.5 + 0.5) * rect.height }
  }

  /** Marker keys this object's renderer does not know (a typo in the data): their markers would never show. */
  unknownAnchors(keys: readonly string[]): string[] {
    return keys.filter((k) => !isAnchorKey(this.render.kind, k))
  }

  /** The markers were switched on or the layout moved: place them on the next update even if nothing moves. */
  refreshOverlay(): void {
    this.overlayStale = true
    this.ctx?.invalidate()
  }

  resized(): void {
    this.overlayStale = true
  }

  setPlaying(playing: boolean): void {
    this.playing = playing
    this.ctx?.invalidate()
  }

  update(dt: number): StageFrame {
    const ctx = this.ctx
    const body = this.body
    if (!ctx || !body) return { render: false, animating: false }
    let render = false
    if (this.tween && !this.tween.step(dt)) this.tween = null
    if (this.tween) render = true
    if (this.controls?.update(dt)) render = true
    const moving = this.playing && !ctx.reducedMotion && body.animated
    const step = moving ? dt : 0
    this.time += step
    body.update(step, this.time, ctx.camera)
    if (moving) render = true
    if (render || this.overlayStale) {
      this.overlayStale = false
      // Markers are projected before the frame is drawn: the camera matrices must already be current.
      ctx.camera.updateMatrixWorld()
      this.events.onFrame?.()
    }
    return { render, animating: moving }
  }

  dispose(): void {
    if (this.controls) {
      if (this.ctx) this.controls.removeEventListener('change', this.ctx.invalidate)
      this.controls.dispose()
      this.controls = null
    }
    this.tween?.cancel()
    this.body?.dispose()
    this.body = null
    this.root.removeFromParent()
    this.ctx = null
  }
}
