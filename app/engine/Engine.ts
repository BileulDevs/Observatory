import {
  ACESFilmicToneMapping, HalfFloatType, PerspectiveCamera, Scene, Vector2, WebGLRenderer, WebGLRenderTarget,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { CubeBaker } from './bake/CubeBaker'
import { Backdrop } from './bodies/Backdrop'
import { StagePass } from './core/StagePass'
import { detectQuality, type QualityProfile } from './core/quality'
import { disposeTextures } from './core/textures'
import { STYLE_PARAMS } from './presets'
import { FINISH_SHADER } from './shaders/finish'
import type { Stage, StageContext, ViewShift } from './stages/Stage'

export type { ViewShift } from './stages/Stage'

export interface EngineEvents {
  /** First frame rendered: the canvas can fade in. */
  onFirstFrame?: () => void
  /** Unrecoverable problem (context lost...). The page must keep working without the canvas. */
  onError?: (reason: 'context-lost') => void
}

/** Telephoto lens: flattens perspective, which reads as "observed through an instrument" and keeps the limb round. */
const FOV = 30
/** Bloom: radius and threshold in HDR units, tuned so only atmosphere limbs, stars and city lights glow. */
const BLOOM_RADIUS = 0.5
const BLOOM_THRESHOLD = 0.92
/** Vignette strength in the final pass. 0 = none; above ~0.8 corners turn muddy behind UI text. */
const VIGNETTE = 0.55
/** Frame-time clamp in seconds, so returning to a background tab does not jump animations. */
const MAX_DT = 0.1
/**
 * On portrait screens the vertical FOV would let the planet overflow the width: zoom out proportionally.
 * zoom = aspect × PORTRAIT_FIT, capped at 1. Higher = bigger planet on phones.
 */
const PORTRAIT_FIT = 1.25

/**
 * Owns the WebGL renderer, post-processing, the shared backdrop and the frame loop.
 * What is shown is delegated to one Stage at a time (hero, catalogue...). Framework-agnostic: Vue only talks
 * to this class. Renders on demand: when nothing moves, no frame is drawn and the GPU idles.
 */
export class Engine {
  readonly quality: QualityProfile

  private readonly canvas: HTMLCanvasElement
  private readonly events: EngineEvents
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.05, 400)
  private readonly composer: EffectComposer
  private readonly mainPass: StagePass
  private readonly bloom: UnrealBloomPass
  private readonly finish: ShaderPass
  private readonly baker: CubeBaker
  private readonly backdrop: Backdrop
  private readonly context: StageContext

  private stage: Stage | null = null
  private viewShift: ViewShift = { x: 0, y: 0 }
  private active = true
  private reducedMotion = false
  private dirty = true
  private raf = 0
  private last = 0
  private firstFrame = true
  /** True while frame() runs: invalidations then only mark dirty, the frame itself decides whether to loop. */
  private inFrame = false
  private fpsFrames = 0
  private fpsSince = 0
  private fps = 0
  private lastRenderAt = 0
  private disposed = false

  /** True when WebGL2 is available. Call before constructing, to show the static fallback instead. */
  static isSupported(): boolean {
    try {
      return !!document.createElement('canvas').getContext('webgl2')
    } catch {
      return false
    }
  }

  constructor(canvas: HTMLCanvasElement, events: EngineEvents = {}) {
    this.canvas = canvas
    this.events = events
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.setClearColor(0x000000, 1)
    this.quality = detectQuality(this.renderer.getContext() as WebGL2RenderingContext)

    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: this.quality.msaa })
    this.composer = new EffectComposer(this.renderer, target)
    this.mainPass = new StagePass(this.scene, this.camera)
    this.composer.addPass(this.mainPass)
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), STYLE_PARAMS.natural.bloom, BLOOM_RADIUS, BLOOM_THRESHOLD)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.finish = new ShaderPass(FINISH_SHADER)
    this.finish.uniforms.uVig!.value = VIGNETTE
    this.composer.addPass(this.finish)

    this.baker = new CubeBaker(this.renderer)
    this.backdrop = new Backdrop(this.baker, this.quality.starCount)
    this.scene.add(this.backdrop.root)

    // Getters keep the context live: stages always read the current values, never a stale copy.
    const engine = this
    this.context = {
      camera: this.camera,
      canvas,
      baker: this.baker,
      sky: this.backdrop.skyTexture,
      quality: this.quality,
      get reducedMotion() { return engine.reducedMotion },
      get viewShift() { return engine.viewShift },
      invalidate: this.invalidate,
      setViewShift: (shift) => {
        this.viewShift = { ...shift }
        this.applyFraming()
        this.invalidate()
      },
    }

    canvas.addEventListener('webglcontextlost', this.onContextLost)
    window.addEventListener('resize', this.onResize)
    this.resize()
    this.start()
  }

  /** Replaces the current stage. The previous one is disposed with all its GPU resources. */
  setStage(stage: Stage): void {
    if (this.stage === stage) return
    this.stage?.dispose()
    this.stage = stage
    this.mainPass.views = stage.renderViews ? (r, t) => stage.renderViews?.(r, t) : null
    this.scene.add(stage.root)
    stage.attach(this.context)
    stage.setActive?.(this.active)
    this.wake()
  }

  /** Removes the current stage (pages without 3D content); only the backdrop stays. */
  clearStage(): void {
    this.stage?.dispose()
    this.stage = null
    this.mainPass.views = null
    this.wake()
  }

  /** Frames actually drawn per second over the last half second, and whether the GPU is idle (render-on-demand). */
  get renderStats(): { fps: number; idle: boolean } {
    const idle = performance.now() - this.lastRenderAt > 500
    return { fps: idle ? 0 : this.fps, idle }
  }

  get currentStage(): Stage | null {
    return this.stage
  }

  /** Moves the subject on screen without moving it in the scene, so orbiting still pivots on its centre. */
  setViewShift(shift: ViewShift): void {
    this.context.setViewShift(shift)
  }

  /** Inactive = loop fully stopped (no RAF at all). Use when the 3D is scrolled out of view. */
  setActive(active: boolean): void {
    if (this.active === active) return
    this.active = active
    this.stage?.setActive?.(active)
    if (active) this.wake()
    else this.stop()
  }

  /** False for prefers-reduced-motion: no rotation, no orbits, camera cuts instead of flights. */
  setMotion(enabled: boolean): void {
    this.reducedMotion = !enabled
    this.wake()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    window.removeEventListener('resize', this.onResize)
    this.stage?.dispose()
    this.stage = null
    this.backdrop.dispose()
    this.baker.dispose()
    disposeTextures()
    this.composer.dispose()
    this.renderer.dispose()
  }

  /** Post-processing follows the stage's subject, so a style transition also blends bloom, grain and exposure. */
  private applyLookToPost(): void {
    const subject = this.stage?.subject
    const look = subject?.currentLook
    const natural = STYLE_PARAMS.natural
    this.bloom.strength = look?.bloom ?? natural.bloom
    this.finish.uniforms.uGrain!.value = look?.grain ?? natural.grain
    this.backdrop.setIntensity(look?.sky ?? natural.sky, look?.stars ?? natural.stars)
    this.renderer.toneMappingExposure = subject?.exposure ?? natural.exposure
  }

  private resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    const pr = Math.min(window.devicePixelRatio, this.quality.maxPixelRatio)
    this.renderer.setPixelRatio(pr)
    this.renderer.setSize(w, h, false)
    this.composer.setPixelRatio(pr)
    this.composer.setSize(w, h)
    this.backdrop.setPixelRatio(pr)
    this.applyFraming()
    this.invalidate()
  }

  private applyFraming(): void {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.camera.aspect = w / h
    this.camera.zoom = Math.min(1, (w / h) * PORTRAIT_FIT)
    // A negative offset shifts the rendered window left, which moves the content right.
    this.camera.setViewOffset(w, h, -w * this.viewShift.x, -h * this.viewShift.y, w, h)
    this.camera.updateProjectionMatrix()
  }

  private start(): void {
    if (this.raf || this.disposed) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  /** Restarts the loop if it was idle and something needs drawing. */
  private wake(): void {
    this.invalidate()
    if (this.active) this.start()
  }

  private readonly invalidate = (): void => {
    this.dirty = true
    if (this.active && !this.raf && !this.inFrame && !this.disposed) this.start()
  }

  private readonly frame = (now: number): void => {
    this.raf = 0
    if (this.disposed || !this.active) return
    const dt = Math.min((now - this.last) / 1000, MAX_DT)
    this.last = now
    this.inFrame = true

    if (this.baker.busy) {
      this.baker.step()
      this.dirty = true
    }
    const result = this.stage?.update(dt) ?? { render: false, animating: false }
    if (result.render) this.dirty = true

    if (this.dirty) {
      this.dirty = false
      this.applyLookToPost()
      this.backdrop.update(this.camera)
      this.finish.uniforms.uTime!.value = now * 0.001
      this.composer.render()
      this.lastRenderAt = now
      this.fpsFrames++
      if (now - this.fpsSince > 500) {
        this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsSince))
        this.fpsFrames = 0
        this.fpsSince = now
      }
      if (this.firstFrame) {
        this.firstFrame = false
        this.events.onFirstFrame?.()
      }
    }

    this.inFrame = false
    // Keep looping only while something can still change on its own; invalidate() restarts it otherwise.
    if (result.animating || this.baker.busy || this.dirty) this.raf = requestAnimationFrame(this.frame)
  }

  private readonly onResize = (): void => {
    this.resize()
    this.wake()
  }

  private readonly onContextLost = (e: Event): void => {
    e.preventDefault()
    this.stop()
    this.events.onError?.('context-lost')
  }
}
