import type { Camera, Material, Object3D, Scene, WebGLRenderer } from 'three'

/** Poll interval while shader programs link in the background, ms (three's compileAsync uses the same). */
const POLL_MS = 10

/**
 * Compiles every material of `object` for `scene` (its lights decide the program variants), then resolves once
 * the driver reports all programs linked, or after `timeoutMs`. Same job as three's renderer.compileAsync(), which
 * this replaces: compileAsync's polling loop reads `currentProgram` of every pending material and throws ("reading
 * 'isReady'") when one was disposed meanwhile (a step left before its shaders were ready, an engine rebuilt after
 * a lost context). Here a disposed material simply has nothing left to wait for.
 *
 * The caller binds the render target the frames are drawn into around this call: compile() runs synchronously,
 * and three keys programs on that target's tone mapping and colour space.
 */
export function compileAndWait(
  renderer: WebGLRenderer, object: Object3D, camera: Camera, scene: Object3D, timeoutMs: number,
): Promise<'done' | 'timeout'> {
  // Typed as a Scene by three, but only its lights are read: a group holding its own lights works the same.
  const pending = new Set<Material>(renderer.compile(object, camera, scene as Scene))
  const start = performance.now()
  return new Promise((resolve) => {
    const poll = () => {
      for (const material of pending) {
        const program = (renderer.properties.get(material) as { currentProgram?: { isReady(): boolean } }).currentProgram
        if (!program || program.isReady()) pending.delete(material)
      }
      if (pending.size === 0) resolve('done')
      else if (performance.now() - start > timeoutMs) resolve('timeout')
      else setTimeout(poll, POLL_MS)
    }
    // Without KHR_parallel_shader_compile, isReady() blocks until linked: give the driver a first slice of time.
    setTimeout(poll, POLL_MS)
  })
}
