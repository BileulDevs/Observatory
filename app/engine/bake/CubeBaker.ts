import {
  BackSide, CubeCamera, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, Mesh, Scene, ShaderMaterial,
  SphereGeometry, UnsignedByteType, Vector3, WebGLCubeRenderTarget, type Camera, type WebGLRenderer,
} from 'three'
import { compileAndWait } from '../core/compile'
import { PLANET_TYPES, type PlanetType } from '../presets'
import { BAKE_FRAG, BAKE_VERT } from '../shaders/bake'

/** Which field a bake pass produces. */
export const BakePass = { Surface: 0, Clouds: 1, Sky: 2 } as const
export type BakePass = (typeof BakePass)[keyof typeof BakePass]

/**
 * One compiled bake program per field. Values are the `BAKE_VARIANT` define and must match the VARIANT_* names
 * in shaders/bake.ts. Renumbering is harmless as long as both sides change together.
 */
export const BakeVariant = { Sky: 0, Clouds: 1, Gas: 2, Ocean: 3, Arid: 4, Ice: 5 } as const
export type BakeVariant = (typeof BakeVariant)[keyof typeof BakeVariant]

/** Surface program per planet type. A type missing here would fall back to the ice field, as the old shader did. */
const SURFACE_VARIANT: Record<PlanetType, BakeVariant> = {
  ocean: BakeVariant.Ocean,
  arid: BakeVariant.Arid,
  gas: BakeVariant.Gas,
  ice: BakeVariant.Ice,
}

/** The program that bakes `pass` for the planet type at `type` (index in PLANET_TYPES). */
export function bakeVariant(pass: BakePass, type: number): BakeVariant {
  if (pass === BakePass.Sky) return BakeVariant.Sky
  if (pass === BakePass.Clouds) return BakeVariant.Clouds
  const name = PLANET_TYPES[type]
  return name ? SURFACE_VARIANT[name] : BakeVariant.Ice
}

/** A bake program and the one-mesh scene it is drawn with. */
interface BakeProgram {
  readonly scene: Scene
  readonly material: ShaderMaterial
  /** Settled once the driver reports the program linked, or the wait timed out. */
  compiled: Promise<void> | null
  ready: boolean
}

/** One unit of GPU work: a horizontal strip of one cube face. */
interface BakeStep {
  target: WebGLCubeRenderTarget
  variant: BakeVariant
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
 * Default pixels rendered per step. One strip of ~1M pixels stays well under a frame budget on a desktop GPU and
 * far from the ~2 s watchdog that resets the GPU on Windows. Raising it shortens loading but causes visible
 * hitches. The engine passes a smaller budget on weaker tiers.
 */
const PIXELS_PER_STEP = 1 << 20
/** Noise frequency cap per texel, see `uMaxFreq` in the bake shader. Higher = crisper but grainier. */
const MAX_FREQ_PER_TEXEL = 0.22
/**
 * Longest wait for a bake program to compile in the background, ms. On timeout the program is treated as ready
 * and the first strip finishes the compile synchronously: a freeze of whatever is left, never a stuck bake.
 * Measured worst case is ~2.6 s (arid) on a fast desktop CPU; slower machines can take several times that.
 */
const COMPILE_TIMEOUT_MS = 15000

/**
 * Bakes procedural fields into cubemaps, so the per-frame shaders only do texture lookups.
 * Small targets bake synchronously; large ones are split into strips executed one per frame via `step()`.
 *
 * Each field has its own program (see BakeVariant), created on first need. `prepare()` compiles one in the
 * background (KHR_parallel_shader_compile); baking with a program that is not compiled yet makes three compile
 * it synchronously, on the main thread.
 */
export class CubeBaker {
  private readonly renderer: WebGLRenderer
  private readonly geometry = new SphereGeometry(1, 64, 48)
  /** Shared by every program: ShaderMaterial keeps the object by reference, so one write reaches them all. */
  private readonly uniforms = {
    uSeed: { value: new Vector3() },
    uTexel: { value: 0.001 },
    uMaxFreq: { value: 100 },
  }
  private readonly programs = new Map<BakeVariant, BakeProgram>()
  private readonly cubeCamera: CubeCamera
  private readonly placeholder = new WebGLCubeRenderTarget(4)
  private queue: InternalJob[] = []
  /** Open holds: while any is open the engine draws nothing (see hold()). */
  private holds = 0

  /**
   * @param wake called when a background compile finishes or a hold is released, so the owner can restart its
   *   frame loop: a strip or a frame waiting on either would otherwise only resume at the next unrelated frame.
   */
  constructor(
    renderer: WebGLRenderer,
    private readonly pixelsPerStep = PIXELS_PER_STEP,
    private readonly wake: () => void = () => {},
  ) {
    this.renderer = renderer
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

  /**
   * Bakes a whole cube now. Only for small targets (previews, sky): a big one would freeze the page.
   * Call prepare() first and wait for it, unless the program is known to be cheap to compile (the sky is).
   */
  bakeNow(target: WebGLCubeRenderTarget, pass: BakePass, type: number, seed: Vector3): void {
    for (const step of this.plan(target, pass, type, seed)) this.run(step)
  }

  /** True when the program for this pass and planet type is compiled (or its background wait gave up). */
  isReady(pass: BakePass, type: number): boolean {
    return this.program(bakeVariant(pass, type)).ready
  }

  /**
   * Compiles the program for this pass and planet type in the background. Resolves when bakeNow() / queued
   * strips can use it without stalling the main thread. Never rejects; calling it again returns the same promise.
   */
  prepare(pass: BakePass, type: number): Promise<void> {
    return this.compile(bakeVariant(pass, type))
  }

  /**
   * Stops the engine from drawing until the returned function is called (idempotent). For content with nothing
   * to show yet: a planet whose first bake waits for its program would otherwise be drawn as a bare sphere.
   */
  hold(): () => void {
    this.holds++
    let open = true
    return () => {
      if (!open) return
      open = false
      this.holds--
      this.wake()
    }
  }

  /** True while some content asked the engine not to draw (see hold()). */
  get blocking(): boolean {
    return this.holds > 0
  }

  /**
   * Reads every face of a baked cube back to the CPU, without stalling (pixel-pack buffer + fence). Faces in
   * three's order (+X, −X, +Y, −Y, +Z, −Z), RGBA, rows of `target.width`. Half-float targets give raw half
   * floats (decode with DataUtils.fromHalfFloat), byte targets give 0–255.
   * The six reads are issued before the first await: the target may be disposed right after this call returns
   * (a preview replaced by the full bake), the data is already copied.
   */
  readFaces(target: WebGLCubeRenderTarget): Promise<(Uint16Array | Uint8Array)[]> {
    const size = target.width
    const half = target.texture.type === HalfFloatType
    const reads = Array.from({ length: 6 }, (_, face) => {
      const buffer = half ? new Uint16Array(size * size * 4) : new Uint8Array(size * size * 4)
      return this.renderer.readRenderTargetPixelsAsync(target, 0, 0, size, size, buffer, face) as Promise<Uint16Array | Uint8Array>
    })
    return Promise.all(reads)
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
    // Start the compiles now rather than when the first strip of each target comes up.
    for (const variant of new Set(steps.map((s) => s.variant))) void this.compile(variant)
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

  /** Runs one step of the oldest job. Call once per frame. Waits (does nothing) while its program compiles. */
  step(): void {
    const job = this.queue[0]
    if (!job) return
    const step = job.steps[job.done]
    if (step) {
      if (!this.program(step.variant).ready) {
        void this.compile(step.variant)
        return
      }
      this.run(step)
    }
    job.done++
    if (job.done >= job.total) {
      this.queue.shift()
      job.onDone()
    }
  }

  dispose(): void {
    for (const job of [...this.queue]) job.cancel()
    this.geometry.dispose()
    for (const program of this.programs.values()) program.material.dispose()
    this.programs.clear()
    this.placeholder.dispose()
  }

  /** The program of a variant, created (not compiled) on first request. */
  private program(variant: BakeVariant): BakeProgram {
    let program = this.programs.get(variant)
    if (!program) {
      const material = new ShaderMaterial({
        vertexShader: BAKE_VERT, fragmentShader: BAKE_FRAG, side: BackSide, uniforms: this.uniforms,
        defines: { BAKE_VARIANT: variant },
      })
      const scene = new Scene()
      scene.add(new Mesh(this.geometry, material))
      program = { scene, material, compiled: null, ready: false }
      this.programs.set(variant, program)
    }
    return program
  }

  private compile(variant: BakeVariant): Promise<void> {
    const program = this.program(variant)
    if (program.compiled) return program.compiled
    // Compile for a render target, as bakes are drawn: three keys programs on tone mapping and output colour
    // space, which differ for the screen, so compiling with no target bound would build a program never used.
    // compileAsync does its compile() synchronously before returning, so the target only needs to be set around it.
    const previous = this.renderer.getRenderTarget()
    this.renderer.setRenderTarget(this.placeholder)
    const camera = this.cubeCamera.children[0] as Camera
    const compiled = compileAndWait(this.renderer, program.scene, camera, program.scene, COMPILE_TIMEOUT_MS)
    this.renderer.setRenderTarget(previous)
    program.compiled = compiled.then((outcome) => {
      if (outcome === 'timeout') console.warn('[bake] program', variant, 'still compiling after', COMPILE_TIMEOUT_MS, 'ms; continuing')
      program.ready = true
      this.wake()
    })
    return program.compiled
  }

  private plan(target: WebGLCubeRenderTarget, pass: BakePass, type: number, seed: Vector3): BakeStep[] {
    const variant = bakeVariant(pass, type)
    const size = target.width
    const rows = Math.max(1, Math.min(size, Math.floor(this.pixelsPerStep / size)))
    const steps: BakeStep[] = []
    for (let face = 0; face < 6; face++) {
      for (let y = 0; y < size; y += rows) {
        steps.push({ target, variant, seed: seed.clone(), face, y, height: Math.min(rows, size - y), lastOfTarget: false })
      }
    }
    const last = steps[steps.length - 1]
    if (last) last.lastOfTarget = true
    return steps
  }

  private run(step: BakeStep): void {
    const u = this.uniforms
    const size = step.target.width
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
    if (camera) this.renderer.render(this.program(step.variant).scene, camera)
    this.renderer.setRenderTarget(null)
    this.renderer.autoClear = autoClear
    target.scissorTest = false
  }
}
