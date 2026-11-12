import { Group, PerspectiveCamera, Vector3, type WebGLRenderer, type WebGLRenderTarget } from 'three'
import { Planet } from '../bodies/Planet'
import { Star, blackbodyColor } from '../bodies/Star'
import type { Stage, StageContext, StageFrame } from './Stage'
import { makeOrbitLine, type SystemBody, type SystemStar } from './SystemStage'

/** One catalogue entry: a whole system, drawn into the screen rectangle of an HTML element. */
export interface CatalogueSystem {
  id: string
  star: SystemStar
  bodies: SystemBody[]
}

export interface CatalogueEvents {
  /** A system's planets are all baked: its 2D fallback can be hidden. */
  onReady?: (id: string) => void
}

/**
 * Orbit hairline opacity in thumbnails. Lower than the system view: at this size the lines are a few pixels
 * apart and, any brighter, read as a target drawn over the planets.
 */
const THUMB_ORBIT_OPACITY = 0.09
/** Distance between systems in world space: far enough that each thumbnail camera only ever sees its own. */
const SYSTEM_SPACING = 4000
/** Thumbnail camera far plane; must stay well under SYSTEM_SPACING. */
const THUMB_FAR = 1500
/** Thumbnail view: telephoto lens, low elevation (thin ellipses, as seen from afar). */
const THUMB_FOV = 26
const THUMB_ELEVATION = (21 * Math.PI) / 180
/** Margin around the outermost orbit, as a fraction of its radius. */
const THUMB_MARGIN = 0.1
/**
 * Planet size boost in thumbnails: true display sizes would be a few pixels. Capped per planet so neighbours
 * never touch (see gapLimit), which keeps the orbit order readable.
 */
const THUMB_SIZE_BOOST = 1.7
const THUMB_STAR_BOOST = 1.25
/** Hovered thumbnail orbits this many times faster: a light "come alive" cue. */
const HOVER_SPEED = 4
/** Planets created per frame while the catalogue opens: spreads the preview bakes, no visible freeze. */
const PLANETS_PER_FRAME = 3
/**
 * Full bake per thumbnail body, at this cube-face size: a tile shows its system only once every planet is at
 * full detail. 256 is plenty for a sphere a few dozen pixels wide; more lengthens the catalogue's loading.
 */
const THUMB_BAKE_RES = 256
/** Atmosphere ray-march steps for thumbnails: the shells are tiny on screen. */
const THUMB_ATMOSPHERE_STEPS = 6

interface ThumbPlanet {
  body: SystemBody
  planet: Planet | null
  radius: number
  /** Full bake landed (or the photographic map loaded): the planet is shown in its final detail. */
  baked: boolean
}

interface Thumb {
  system: CatalogueSystem
  group: Group
  camera: PerspectiveCamera
  star: Star | null
  planets: ThumbPlanet[]
  outer: number
  time: number
  ready: boolean
}

/**
 * The catalogue: every system as a live miniature, each rendered into the on-screen rectangle of its HTML tile.
 * One scene and one renderer for all of them (a canvas per tile would hit the browser's WebGL context limit).
 */
export class CatalogueStage implements Stage {
  readonly root = new Group()
  readonly subject = null

  private ctx: StageContext | null = null
  private readonly thumbs: Thumb[] = []
  private readonly elementOf: (id: string) => HTMLElement | null
  private readonly events: CatalogueEvents
  private hovered: string | null = null
  private pending: { thumb: Thumb; index: number }[] = []
  private readonly center = new Vector3()
  private readonly lines: ReturnType<typeof makeOrbitLine>[] = []

  constructor(systems: CatalogueSystem[], elementOf: (id: string) => HTMLElement | null, events: CatalogueEvents = {}) {
    this.elementOf = elementOf
    this.events = events
    systems.forEach((system, i) => {
      const group = new Group()
      group.position.set((i + 1) * SYSTEM_SPACING, 0, 0)
      const outer = system.bodies.reduce((m, b) => Math.max(m, b.orbit + b.radius), system.star.radius * 2)
      for (const body of system.bodies) {
        const line = makeOrbitLine(body.orbit, THUMB_ORBIT_OPACITY)
        this.lines.push(line)
        group.add(line)
      }
      this.thumbs.push({
        system, group, outer, time: 0, ready: false, star: null,
        camera: new PerspectiveCamera(THUMB_FOV, 2, 0.1, THUMB_FAR),
        planets: system.bodies.map((body, j) => ({ body, planet: null, radius: thumbRadius(system.bodies, j), baked: false })),
      })
      this.root.add(group)
    })
  }

  attach(ctx: StageContext): void {
    this.ctx = ctx
    // The main camera only draws the sky behind the page; the thumbnails come in renderViews().
    ctx.camera.position.set(0, 0, 0)
    ctx.camera.lookAt(0, 0, -1)
    ctx.setViewShift({ x: 0, y: 0 })
    for (const thumb of this.thumbs) {
      const star = new Star(thumb.system.star.temperatureK, thumb.system.star.radius * THUMB_STAR_BOOST, thumb.system.star.seed)
      thumb.star = star
      thumb.group.add(star.root)
      thumb.planets.forEach((_, index) => this.pending.push({ thumb, index }))
      if (thumb.planets.length === 0) this.markReady(thumb)
    }
  }

  /** Speeds up the hovered system (null = none). */
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
    this.createSome()
    const moving = !ctx.reducedMotion
    for (const thumb of this.thumbs) {
      if (moving) thumb.time += dt * (thumb.system.id === this.hovered ? HOVER_SPEED : 1)
      const star = thumb.star
      star?.update(thumb.time)
      for (const p of thumb.planets) {
        if (!p.planet) continue
        const b = p.body
        const a = b.phase + (thumb.time / b.period) * Math.PI * 2
        p.planet.root.position.set(Math.cos(a) * b.orbit, 0, -Math.sin(a) * b.orbit)
        p.planet.setSunDirection(this.center.copy(p.planet.root.position).negate())
        p.planet.update(moving ? dt : 0, thumb.camera, moving)
      }
    }
    // Every frame while animating: tile rectangles also move when the page scrolls.
    return { render: true, animating: moving || this.pending.length > 0 }
  }

  renderViews(renderer: WebGLRenderer, target: WebGLRenderTarget | null): void {
    const ctx = this.ctx
    if (!ctx) return
    const canvasRect = ctx.canvas.getBoundingClientRect()
    const pr = renderer.getPixelRatio()
    const fullW = target ? target.width : canvasRect.width * pr
    const fullH = target ? target.height : canvasRect.height * pr

    for (const thumb of this.thumbs) {
      // Not drawn until every planet has its full bake: the tile shows "Loading…" until then, never placeholders.
      if (!thumb.ready) continue
      const el = this.elementOf(thumb.system.id)
      if (!el) continue
      const r = el.getBoundingClientRect()
      // Skip tiles outside the viewport entirely.
      if (r.bottom < canvasRect.top || r.top > canvasRect.bottom || r.width < 2 || r.height < 2) continue
      const x = (r.left - canvasRect.left) * pr
      const y = fullH - (r.bottom - canvasRect.top) * pr
      const w = r.width * pr
      const h = r.height * pr

      this.frame(thumb, r.width / r.height)
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
      renderer.render(this.root.parent ?? this.root, thumb.camera)
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
    for (const thumb of this.thumbs) {
      thumb.star?.dispose()
      for (const p of thumb.planets) p.planet?.dispose()
    }
    for (const line of this.lines) {
      line.geometry.dispose()
      line.material.dispose()
    }
    this.lines.length = 0
    this.thumbs.length = 0
    this.pending = []
    this.root.removeFromParent()
    this.ctx = null
  }

  /** Frames the whole system: the outermost orbit spans the tile width (or height, for tall tiles). */
  private frame(thumb: Thumb, aspect: number): void {
    const cam = thumb.camera
    cam.aspect = aspect
    const half = Math.tan((THUMB_FOV * Math.PI) / 360)
    const radius = thumb.outer * (1 + THUMB_MARGIN)
    // Horizontal fit needs radius / (half × aspect); vertical fit only needs the squashed ellipse height.
    const dist = Math.max(radius / (half * aspect), (radius * Math.sin(THUMB_ELEVATION)) / half)
    const c = thumb.group.position
    cam.position.set(c.x, c.y + dist * Math.sin(THUMB_ELEVATION), c.z + dist * Math.cos(THUMB_ELEVATION))
    cam.lookAt(c.x, c.y, c.z)
    cam.updateProjectionMatrix()
  }

  private createSome(): void {
    const ctx = this.ctx
    if (!ctx) return
    for (let n = 0; n < PLANETS_PER_FRAME && this.pending.length; n++) {
      const { thumb, index } = this.pending.shift()!
      const tp = thumb.planets[index]!
      const planet = new Planet(ctx.baker, { bakeRes: THUMB_BAKE_RES, atmosphereSteps: THUMB_ATMOSPHERE_STEPS })
      planet.setStyle('natural')
      planet.setScale(tp.radius)
      planet.setLightTint(blackbodyColor(thumb.system.star.temperatureK))
      planet.setSpec(tp.body.render, undefined, () => {
        tp.baked = true
        ctx.invalidate()
        if (thumb.planets.every((p) => p.baked)) this.markReady(thumb)
      })
      thumb.group.add(planet.root)
      tp.planet = planet
    }
  }

  private markReady(thumb: Thumb): void {
    if (thumb.ready) return
    thumb.ready = true
    this.events.onReady?.(thumb.system.id)
  }
}

/** Boosted radius, capped at 45% of the distance to the nearest neighbouring orbit (or the star). */
function thumbRadius(bodies: SystemBody[], i: number): number {
  const b = bodies[i]!
  const inner = i > 0 ? b.orbit - bodies[i - 1]!.orbit : b.orbit * 0.5
  const outer = i < bodies.length - 1 ? bodies[i + 1]!.orbit - b.orbit : Infinity
  return Math.min(b.radius * THUMB_SIZE_BOOST, Math.min(inner, outer) * 0.45)
}
