import { Group, Vector3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { ObjectRender } from '~/types/objects'
import { easeInOutCubic, Tween } from '../core/tween'
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

/** Zoom-out limit, in default viewing distances. */
const MAX_ZOOM_OUT = 3
/** Recentre flight duration, seconds. */
const RECENTER_DURATION = 1.1

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

  constructor(private render: ObjectRender, private readonly opts: ObjectStageOptions) {}

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
      baker: ctx.baker, renderer: ctx.renderer, quality: ctx.quality, preview: false, sunDir: SUN_DIRECTION, sky: ctx.sky,
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

  /** Back to the default view. */
  recenter(): void {
    const ctx = this.ctx
    if (!ctx || !this.controls) return
    const from = ctx.camera.position.clone()
    const to = this.home(new Vector3())
    this.tween?.cancel()
    this.tween = new Tween(ctx.reducedMotion ? 0 : RECENTER_DURATION, (k) => {
      ctx.camera.position.lerpVectors(from, to, k)
      this.controls?.target.copy(this.focus)
    }, easeInOutCubic)
    ctx.invalidate()
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
