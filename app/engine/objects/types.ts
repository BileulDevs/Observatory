import type { Object3D, PerspectiveCamera, Texture, Vector3, WebGLRenderer, WebGLRenderTarget } from 'three'
import type { CubeBaker } from '../bake/CubeBaker'
import type { QualityProfile } from '../core/quality'

/** What a body needs from the stage that shows it. */
export interface BodyContext {
  baker: CubeBaker
  /** For one-off offscreen work only (volume bakes); restore any renderer state you change. */
  renderer: WebGLRenderer
  /** Where frames are drawn: pass it to prepareForScene so shaders compile in their final variant. */
  drawTarget: WebGLRenderTarget
  quality: QualityProfile
  /** Catalogue thumbnail: fewer particles, fewer ray-march steps, no high-resolution bake. */
  preview: boolean
  /** Unit vector towards the light (the Sun, or the object's own star). Shared by every body of a stage. */
  sunDir: Vector3
  /** The backdrop's sky, for lensing. */
  sky: Texture
  invalidate(): void
}

/** Default camera placement for a body, around its centre. */
export interface BodyView {
  /** Degrees above the body's equatorial / disk plane. */
  elevationDeg: number
  /** Degrees around the vertical axis; 0 looks from +z. */
  azimuthDeg: number
  /**
   * Camera distance in body radii. The engine's lens is narrow (30° vertical): a sphere only fits the frame
   * beyond ~4 radii, ~7 with room around it. Flat or diffuse bodies (disks, nebulae) can sit closer.
   */
  distance: number
}

/**
 * One catalogue object in 3D. Everything is built around the origin of `root`; the stage positions the root.
 * The body owns every GPU resource it creates and frees them in dispose().
 */
export interface SpaceBody {
  readonly root: Object3D
  /** Radius of the part the camera frames (the disk, the nucleus and coma...), world units. */
  readonly radius: number
  readonly view: BodyView
  /** Closest allowed camera distance, in radii (inside a lensing sphere or a model would break the illusion). */
  readonly minDistance: number
  /** Moves on its own (rotation, flow): the stage keeps drawing while it is on screen. */
  readonly animated: boolean
  /** Point the camera aims at, in the root's frame; the origin when absent. */
  readonly focus?: Vector3
  update(dt: number, time: number, camera: PerspectiveCamera): void
  /**
   * World position of a named point of the body for a marker (keys: ANCHOR_KEYS in anchors.ts), as of the last
   * update; null when this body has no such part or the point is hidden behind it. Called every drawn frame
   * while markers are shown: no allocation.
   */
  anchor(key: string, camera: PerspectiveCamera, out: Vector3): Vector3 | null
  dispose(): void
}

/**
 * Height in CSS pixels of the viewport a camera draws into. Stages that render several small views store it in
 * `camera.userData.viewHeight`; otherwise the window height is a good approximation of the full-screen canvas.
 * Point sprites need it to turn world sizes into pixels.
 */
export function viewHeightOf(camera: PerspectiveCamera): number {
  const h = camera.userData.viewHeight
  return typeof h === 'number' && h > 0 ? h : window.innerHeight
}
