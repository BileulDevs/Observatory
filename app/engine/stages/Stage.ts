import type { Object3D, PerspectiveCamera, Texture, WebGLRenderer, WebGLRenderTarget } from 'three'
import type { CubeBaker } from '../bake/CubeBaker'
import type { Planet } from '../bodies/Planet'
import type { QualityProfile } from '../core/quality'

/** Where the subject sits on screen, as fractions of the viewport. Positive x moves it right, negative y moves it up. */
export interface ViewShift {
  x: number
  y: number
}

/** What the engine lends to the active stage. */
export interface StageContext {
  readonly camera: PerspectiveCamera
  readonly canvas: HTMLCanvasElement
  readonly baker: CubeBaker
  /** The engine's renderer, for one-off offscreen work (volume bakes). Stages must restore any state they change. */
  readonly renderer: WebGLRenderer
  /**
   * The buffer the scene is really drawn into (the post-processing HDR target). Compile shaders against it: their
   * program depends on tone mapping and colour space, which differ from the screen's.
   */
  readonly drawTarget: WebGLRenderTarget
  /** The backdrop's sky cubemap (read-only): lets effects such as lensing show the same sky they bend. */
  readonly sky: Texture
  readonly quality: QualityProfile
  /** True when the user asked for reduced motion: stages must skip flights and continuous movement. */
  readonly reducedMotion: boolean
  /** Asks for a frame to be drawn (render-on-demand). */
  invalidate(): void
  /** Re-frames the camera without moving it. Cheap enough to call every frame during a transition. */
  setViewShift(shift: ViewShift): void
  readonly viewShift: ViewShift
}

/**
 * Post-processing and backdrop levels a stage can ask for when it has no planet subject (a floodlit launch pad
 * dims the stars, for instance). Missing values fall back to the natural style.
 */
export interface StagePost {
  bloom?: number
  exposure?: number
  /** Milky Way glow, 0..~1.4. */
  sky?: number
  /** Point stars, 0..~1.2. */
  stars?: number
}

/** Result of one stage update. */
export interface StageFrame {
  /** Something changed: draw this frame. */
  render: boolean
  /** Something will keep changing on its own: keep the loop running even if nothing else asks for it. */
  animating: boolean
}

/**
 * A self-contained 3D composition (home hero, project catalogue...). The engine owns the renderer and the loop;
 * a stage owns its objects, its interactions and its camera moves, and releases all of them in dispose().
 */
export interface Stage {
  readonly root: Object3D
  /** Planet whose style drives post-processing (bloom, exposure, grain), or null for defaults. */
  readonly subject: Planet | null
  /** Levels used when `subject` is null; read every drawn frame, so it may change over time. */
  readonly post?: StagePost
  /**
   * Resolves once the stage's first content is built and compiled (stages that load their scene after attach).
   * The loading screen waits for it; without it, the first drawn frame is enough.
   */
  readonly ready?: Promise<void>
  attach(ctx: StageContext): void
  update(dt: number): StageFrame
  /**
   * Optional extra views drawn after the main camera, into the same frame (and through the same post-processing).
   * Used by stages that show several small scenes at once, each in its own viewport (catalogue thumbnails).
   */
  renderViews?(renderer: WebGLRenderer, target: WebGLRenderTarget | null): void
  /**
   * Called when the canvas changed size, just before the redraw that follows: stages that place HTML over the
   * scene (labels, markers) must re-project them on that frame even if nothing in the scene moved.
   */
  resized?(): void
  /** Called when the engine pauses or resumes (section scrolled away, tab hidden). */
  setActive?(active: boolean): void
  dispose(): void
}
