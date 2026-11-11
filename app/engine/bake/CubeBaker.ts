import {
  BackSide, CubeCamera, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, Mesh, Scene, ShaderMaterial,
  SphereGeometry, UnsignedByteType, Vector3, WebGLCubeRenderTarget, type Camera, type WebGLRenderer,
} from 'three'
import { BAKE_FRAG, BAKE_VERT } from '../shaders/bake'

/** Which field a bake pass produces. Values match `uPass` in the bake shader. */
export const BakePass = { Surface: 0, Clouds: 1, Sky: 2 } as const
export type BakePass = (typeof BakePass)[keyof typeof BakePass]

/** One unit of GPU work: a horizontal strip of one cube face. */
interface BakeStep {
  target: WebGLCubeRenderTarget
  pass: BakePass
  type: number
  seed: Vector3
  face: number
  y: number
  height: number
  lastOfTarget: boolean
}

/** A queued bake: completes when all its steps ran, unless cancelled first. */
export interface BakeJob {
  readonly total: number
  readonly done: number
  readonly cancelled: boolean
  cancel(): void
}

interface InternalJob extends BakeJob {
  steps: BakeStep[]
  done: number
  cancelled: boolean
  onDone: () => void
  onCancel: () => void
}

/**
 * Pixels rendered per step. One strip of ~1M pixels stays well under a frame budget on a desktop GPU and far
 * from the ~2 s watchdog that resets the GPU on Windows. Raising it shortens loading but causes visible hitches.
 */
const PIXELS_PER_STEP = 1 << 20
/** Noise frequency cap per texel, see `uMaxFreq` in the bake shader. Higher = crisper but grainier. */
const MAX_FREQ_PER_TEXEL = 0.22

/**
 * Bakes procedural fields into cubemaps, so the per-frame shaders only do texture lookups.
 * Small targets bake synchronously; large ones are split into strips executed one per frame via `step()`.
 */
export class CubeBaker {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly geometry = new SphereGeometry(1, 64, 48)
  private readonly uniforms = {
    uType: { value: 0 },
    uPass: { value: 0 },
    uSeed: { value: new Vector3() },
    uTexel: { value: 0.001 },
    uMaxFreq: { value: 100 },
  }
  private readonly material = new ShaderMaterial({
    vertexShader: BAKE_VERT, fragmentShader: BAKE_FRAG, side: BackSide, uniforms: this.uniforms,
  })
  private readonly cubeCamera: CubeCamera
  private readonly placeholder = new WebGLCubeRenderTarget(4)
  private queue: InternalJob[] = []

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer
    this.scene.add(new Mesh(this.geometry, this.material))
    this.cubeCamera = new CubeCamera(0.1, 10, this.placeholder)
    // CubeCamera normally sets its face cameras up lazily in update(); we drive faces ourselves, so do it now.
    this.cubeCamera.coordinateSystem = renderer.coordinateSystem
    this.cubeCamera.updateCoordinateSystem()
    this.cubeCamera.updateMatrixWorld(true)
  }

  /** Creates a target suited to a pass: RGBA16F for surface data (height needs the precision), RGBA8 otherwise. */
  createTarget(size: number, pass: BakePass): WebGLCubeRenderTarget {
    const precise = pass === BakePass.Surface
    const mipmaps = pass !== BakePass.Sky
    return new WebGLCubeRenderTarget(size, {
      type: precise ? HalfFloatType : UnsignedByteType,
      generateMipmaps: mipmaps,
      minFilter: mipmaps ? LinearMipmapLinearFilter : LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    })
  }

  /** Bakes a whole cube now. Only for small targets (previews, sky): a big one would freeze the page. */
  bakeNow(target: WebGLCubeRenderTarget, pass: BakePass, type: number, seed: Vector3): void {
    for (const step of this.plan(target, pass, type, seed)) this.run(step)
  }

  /** Queues a progressive bake of several targets; `onDone` fires once every step has run. */
  enqueue(
    items: { target: WebGLCubeRenderTarget; pass: BakePass }[],
    type: number,
    seed: Vector3,
    onDone: () => void,
    onCancel: () => void,
  ): BakeJob {
    const steps = items.flatMap((i) => this.plan(i.target, i.pass, type, seed))
    const job: InternalJob = {
      steps, total: steps.length, done: 0, cancelled: false, onDone, onCancel,
      cancel: () => {
        if (job.cancelled || job.done === job.total) return
        job.cancelled = true
        this.queue = this.queue.filter((j) => j !== job)
        job.onCancel()
      },
    }
    this.queue.push(job)
    return job
  }

  get busy(): boolean {
    return this.queue.length > 0
  }

  /** Runs one step of the oldest job. Call once per frame. */
  step(): void {
    const job = this.queue[0]
    if (!job) return
    const step = job.steps[job.done]
    if (step) this.run(step)
    job.done++
    if (job.done >= job.total) {
      this.queue.shift()
      job.onDone()
    }
  }

  dispose(): void {
    for (const job of [...this.queue]) job.cancel()
    this.geometry.dispose()
    this.material.dispose()
    this.placeholder.dispose()
  }

  private plan(target: WebGLCubeRenderTarget, pass: BakePass, type: number, seed: Vector3): BakeStep[] {
    const size = target.width
    const rows = Math.max(1, Math.min(size, Math.floor(PIXELS_PER_STEP / size)))
    const steps: BakeStep[] = []
    for (let face = 0; face < 6; face++) {
      for (let y = 0; y < size; y += rows) {
        steps.push({ target, pass, type, seed: seed.clone(), face, y, height: Math.min(rows, size - y), lastOfTarget: false })
      }
    }
    const last = steps[steps.length - 1]
    if (last) last.lastOfTarget = true
    return steps
  }

  private run(step: BakeStep): void {
    const u = this.uniforms
    const size = step.target.width
    u.uType.value = step.type
    u.uPass.value = step.pass
    u.uSeed.value.copy(step.seed)
    // Gradient step of about one texel: the baked normal then carries all the detail the texture can hold.
    u.uTexel.value = 1.5 / size
    u.uMaxFreq.value = size * MAX_FREQ_PER_TEXEL

    const target = step.target
    const wantsMips = target.texture.minFilter === LinearMipmapLinearFilter
    // Mipmaps are generated once, after the very last strip; per strip it would multiply the cost.
    target.texture.generateMipmaps = wantsMips && step.lastOfTarget
    // A render target uses its own scissor, in texels (no pixel ratio involved).
    target.scissor.set(0, step.y, size, step.height)
    target.scissorTest = true

    const autoClear = this.renderer.autoClear
    // The bake sphere covers every texel, so clearing would only erase the strips already done.
    this.renderer.autoClear = false
    this.renderer.setRenderTarget(target, step.face)
    // CubeCamera's children are its six face cameras, in face order.
    const camera = this.cubeCamera.children[step.face] as Camera | undefined
    if (camera) this.renderer.render(this.scene, camera)
    this.renderer.setRenderTarget(null)
    this.renderer.autoClear = autoClear
    target.scissorTest = false
  }
}
