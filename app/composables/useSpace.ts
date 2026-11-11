import type { Engine } from '~/engine/Engine'
import type { Stage } from '~/engine/stages/Stage'

/** Lifecycle of the 3D layer, as seen by the UI. */
export type SpaceStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error'

/**
 * The single engine instance, created by <SpaceCanvas> in the layout and kept across page navigations.
 * Module-level on purpose: it only ever exists in the browser (set in onMounted), never during SSR.
 */
const engineRef = shallowRef<Engine | null>(null)

export function useSpace() {
  const status = useState<SpaceStatus>('space-status', () => 'idle')
  return { status, engine: engineRef }
}

/**
 * Gives the page a stage for as long as it is mounted. `factory` runs once the engine exists (immediately on
 * client navigations, after the engine boots on a first visit). It may be async, so stage code (and Three.js)
 * is only downloaded in the browser. The stage is removed, and its GPU resources freed, when the page unmounts.
 */
export function useStage<T extends Stage>(factory: (engine: Engine) => T | Promise<T>) {
  const stage = shallowRef<T | null>(null)
  let stop: (() => void) | null = null
  let alive = true
  let started = false

  onMounted(() => {
    stop = watch(engineRef, async (engine) => {
      if (!engine || started) return
      started = true
      const s = await factory(engine)
      // The page may have been left while the stage module was downloading.
      if (!alive || engineRef.value !== engine) {
        s.dispose()
        return
      }
      engine.setStage(s)
      stage.value = s
    }, { immediate: true })
  })

  onBeforeUnmount(() => {
    alive = false
    stop?.()
    const engine = engineRef.value
    if (engine && stage.value && engine.currentStage === stage.value) engine.clearStage()
    stage.value = null
  })

  return stage
}

/** Internal: only SpaceCanvas sets the engine. */
export function provideEngine(engine: Engine | null): void {
  engineRef.value = engine
}
