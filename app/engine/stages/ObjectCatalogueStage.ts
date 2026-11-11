import { Group, PerspectiveCamera, type WebGLRenderer, type WebGLRenderTarget } from 'three'
import type { ObjectRender } from '~/types/objects'
import { createBody } from '../objects/createBody'
import { createLights, SUN_DIRECTION } from '../objects/lighting'
import type { SpaceBody } from '../objects/types'
import type { Stage, StageContext, StageFrame } from './Stage'

export interface CatalogueEntry {
  id: string
  render: ObjectRender
}

/** Distance between objects in world space: each thumbnail camera only ever sees its own. */
const SPACING = 4000
/** Thumbnail cameras: field of view and far plane (well under SPACING). */
const THUMB_FOV = 30
const THUMB_FAR = 1500
/** Hovered thumbnail animates this many times faster: a light "come alive" cue. */
const HOVER_SPEED = 3
/** Thumbnails reuse the body's preferred view, a little further out so nothing touches the tile edges. */
const THUMB_DISTANCE = 1.15

interface Thumb {
  entry: CatalogueEntry
  group: Group
  camera: PerspectiveCamera
  body: SpaceBody | null
  time: number
}

/**
 * Live 3D thumbnails for one catalogue category, all drawn from the shared canvas: each object sits far from the
 * others with its own camera, rendered into the screen rectangle of its HTML tile.
 */
export class ObjectCatalogueStage implements Stage {
  readonly root = new Group()
  readonly subject = null

  private ctx: StageContext | null = null
  private thumbs: Thumb[] = []
  private pending: Thumb[] = []
  private hovered: string | null = null

  constructor(
    entries: CatalogueEntry[],
    private readonly elementOf: (id: string) => HTMLElement | null,
    private readonly onReady: (id: string) => void = () => {},
  ) {
    this.root.add(createLights())
    this.setEntries(entries)
  }

  attach(ctx: StageContext): void {
    this.ctx = ctx
    // The main camera only draws the sky behind the page.
    ctx.camera.position.set(0, 0, 0)
    ctx.camera.lookAt(0, 0, -1)
    ctx.setViewShift({ x: 0, y: 0 })
  }

  /** Replaces the objects shown (category change). Bodies are built a frame at a time. */
  setEntries(entries: CatalogueEntry[]): void {
    for (const t of this.thumbs) {
      t.body?.dispose()
      t.group.removeFromParent()
    }
    this.thumbs = entries.map((entry, i) => {
      const group = new Group()
      group.position.set((i + 1) * SPACING, 0, 0)
      this.root.add(group)
      return { entry, group, camera: new PerspectiveCamera(THUMB_FOV, 2, 0.05, THUMB_FAR), body: null, time: 0 }
    })
    this.pending = [...this.thumbs]
    this.ctx?.invalidate()
  }

  setHovered(id: string | null): void {
    this.hovered = id
  }

  /** Asks for a redraw (the page scrolled while motion is reduced). */
  refresh(): void {
    this.ctx?.invalidate()
  }

  update(dt: number): StageFrame {
    const ctx = this.ctx
    if (!ctx) return { render: false, animating: false }
    const next = this.pending.shift()
    if (next) {
      next.body = createBody(next.entry.render, {
        baker: ctx.baker, quality: ctx.quality, preview: true, sunDir: SUN_DIRECTION, sky: ctx.sky,
        invalidate: () => ctx.invalidate(),
      })
      next.group.add(next.body.root)
      this.onReady(next.entry.id)
    }
    const moving = !ctx.reducedMotion
    for (const t of this.thumbs) {
      if (!t.body) continue
      const step = moving ? dt * (t.entry.id === this.hovered ? HOVER_SPEED : 1) : 0
      t.time += step
      this.frame(t)
      t.body.update(step, t.time, t.camera)
    }
    // Every frame: tile rectangles also move when the page scrolls.
    return { render: true, animating: moving || this.pending.length > 0 }
  }

  renderViews(renderer: WebGLRenderer, target: WebGLRenderTarget | null): void {
    const ctx = this.ctx
    if (!ctx) return
    const canvasRect = ctx.canvas.getBoundingClientRect()
    const pr = renderer.getPixelRatio()
    const fullW = target ? target.width : canvasRect.width * pr
    const fullH = target ? target.height : canvasRect.height * pr
    for (const t of this.thumbs) {
      if (!t.body) continue
      const el = this.elementOf(t.entry.id)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (r.bottom < canvasRect.top || r.top > canvasRect.bottom || r.width < 2 || r.height < 2) continue
      const x = (r.left - canvasRect.left) * pr
      const y = fullH - (r.bottom - canvasRect.top) * pr
      const w = r.width * pr
      const h = r.height * pr
      if (target) {
        target.viewport.set(x, y, w, h)
        target.scissor.set(x, y, w, h)
        target.scissorTest = true
        renderer.setRenderTarget(target)
      } else {
        renderer.setViewport(x / pr, y / pr, w / pr, h / pr)
        renderer.setScissor(x / pr, y / pr, w / pr, h / pr)
        renderer.setScissorTest(true)
      }
      renderer.clearDepth()
      renderer.render(this.root.parent ?? this.root, t.camera)
    }
    if (target) {
      target.viewport.set(0, 0, fullW, fullH)
      target.scissor.set(0, 0, fullW, fullH)
      target.scissorTest = false
      renderer.setRenderTarget(target)
    } else {
      renderer.setScissorTest(false)
      renderer.setViewport(0, 0, fullW / pr, fullH / pr)
    }
  }

  dispose(): void {
    for (const t of this.thumbs) t.body?.dispose()
    this.thumbs = []
    this.pending = []
    this.root.removeFromParent()
    this.ctx = null
  }

  /** Places a thumbnail camera on the body's preferred view, fitted to its tile's aspect ratio. */
  private frame(t: Thumb): void {
    const body = t.body
    const el = this.elementOf(t.entry.id)
    if (!body || !el) return
    const rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    const cam = t.camera
    cam.aspect = rect.width / rect.height
    cam.userData.viewHeight = rect.height
    // Fit the radius in the narrower of the two directions.
    const half = Math.tan((THUMB_FOV * Math.PI) / 360)
    const fit = Math.max(body.radius / half, body.radius / (half * cam.aspect))
    const d = Math.max(fit, body.radius * body.view.distance * 0.75) * THUMB_DISTANCE
    const el2 = (body.view.elevationDeg * Math.PI) / 180
    const az = (body.view.azimuthDeg * Math.PI) / 180
    const c = t.group.position
    const fx = c.x + (body.focus?.x ?? 0), fy = c.y + (body.focus?.y ?? 0), fz = c.z + (body.focus?.z ?? 0)
    cam.position.set(fx + Math.sin(az) * Math.cos(el2) * d, fy + Math.sin(el2) * d, fz + Math.cos(az) * Math.cos(el2) * d)
    cam.lookAt(fx, fy, fz)
    cam.updateProjectionMatrix()
  }
}
