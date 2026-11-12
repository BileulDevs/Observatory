import { PerspectiveCamera, type Material, type Mesh, type Object3D, type Scene, type Texture, type WebGLRenderer, type WebGLRenderTarget } from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'

/** Draco decoder files copied from three/examples/jsm/libs/draco/gltf/ into public/draco/. */
const DRACO_PATH = '/draco/'

let loader: GLTFLoader | null = null

/**
 * Loads a .glb from public/, Draco-compressed or not. One loader (and one Draco decoder worker pool) for the
 * whole page, created on first use so pages without models never fetch the decoder.
 */
export function loadGlb(url: string): Promise<GLTF> {
  if (!loader) {
    const draco = new DRACOLoader().setDecoderPath(DRACO_PATH)
    loader = new GLTFLoader().setDRACOLoader(draco)
  }
  return loader.loadAsync(url)
}

let queue: Promise<unknown> = Promise.resolve()

/**
 * Runs heavy model preparation (download, decode, GPU upload, shader compile) one task at a time, in call order.
 * A catalogue tab starts six models at once; run together, their decodes and uploads pile up into the same
 * frames and the page stutters for seconds. One after another, each costs a short hitch and scrolling stays fluid.
 */
export function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  // The queue survives a failed task: the next one still runs.
  queue = run.catch(() => undefined)
  return run
}

/** The topmost ancestor of an object: the scene it will be drawn in, with its lights. */
export function sceneOf(object: Object3D): Object3D {
  let top = object
  while (top.parent) top = top.parent
  return top
}

/**
 * Compiles every material of a freshly loaded object for the scene it is about to join, and uploads its
 * textures, before it is shown. Done lazily by three at the first draw instead, shader compilation stalls the
 * main thread for a long frame per material; compileAsync lets the driver compile in parallel
 * (KHR_parallel_shader_compile) and resolves when ready.
 */
export async function prepareForScene(
  renderer: WebGLRenderer, object: Object3D, scene: Object3D, target: WebGLRenderTarget | null,
): Promise<void> {
  // Compile for the buffer frames are drawn into: three keys programs on the current target's tone mapping and
  // colour space, so compiling for the screen would leave the real programs to be built at the first draw.
  // compileAsync runs its compile() synchronously before its first await, so the target only needs to be set
  // around the call itself.
  const previous = renderer.getRenderTarget()
  renderer.setRenderTarget(target)
  // The camera only matters for its layers (which lights count); every camera here uses the default layer.
  const compiled = renderer.compileAsync(object, PREPARE_CAMERA, scene as Scene)
  renderer.setRenderTarget(previous)
  // Never wait forever: compileAsync polls each program until the driver reports it linked, and a program the
  // driver never reports (seen with ANGLE/D3D on some steps) left the caller, and the page's step switch, stuck.
  // On timeout the remaining programs are simply built at the first draw (a stutter, not a freeze).
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), PREPARE_TIMEOUT_MS) })
  const outcome = await Promise.race([compiled.then(() => 'done' as const), timeout])
  clearTimeout(timer)
  if (outcome === 'timeout') console.warn('[prepare] shader compilation still pending after', PREPARE_TIMEOUT_MS, 'ms; continuing')
  const textures = new Set<Texture>()
  object.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    for (const m of ([] as Material[]).concat(mesh.material)) {
      for (const v of Object.values(m)) if ((v as Texture | null)?.isTexture) textures.add(v as Texture)
    }
  })
  textures.forEach((t) => renderer.initTexture(t))
}

const PREPARE_CAMERA = new PerspectiveCamera()
/** Longest wait for the shader programs of a new scene, ms. Longer only delays a stuck switch; shorter may cut a
 * slow but healthy compile short (harmless: the rest compiles at the first draw). */
const PREPARE_TIMEOUT_MS = 8000
