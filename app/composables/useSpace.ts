import type { Engine } from '~/engine/Engine'
import type { Stage } from '~/engine/stages/Stage'

/** Lifecycle of the 3D layer, as seen by the UI. */
export type SpaceStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error'

/**
 * The single engine instance, created by <SpaceCanvas> in the layout and kept across page navigations.
 * Module-level on purpose: it only ever exists in the browser (set in onMounted), never during SSR.
 */
const engineRef = shallowRef<Engine | null>(null)

/**
 * Real start-up state, filled by events as they happen (nothing here is timed or simulated):
 * - fonts: the web fonts have loaded (document.fonts.ready);
 * - engine: the Three.js / engine code has been downloaded and evaluated;
 * - gpu: WebGL renderer created, device tier detected;
 * - sky: the backdrop's sky cubemap is baked;
 * - shaders: shader programs compiled so far / in total (the current scene's);
 * - frame: a frame has been drawn;
 * - pendingStages: pages' 3D stages registered but not yet drawn once (data, models, compile).
 */
export interface BootState {
  fonts: boolean
  engine: boolean
  gpu: boolean
  sky: boolean
  shaders: { done: number; total: number; ready: boolean }
  frame: boolean
  pendingStages: number
}

export function useSpace() {
  const status = useState<SpaceStatus>('space-status', () => 'idle')
  const boot = useState<BootState>('space-boot', () => ({
    fonts: false, engine: false, gpu: false, sky: false, shaders: { done: 0, total: 0, ready: false }, frame: false, pendingStages: 0,
  }))
  return { status, boot, engine: engineRef }
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

  const { boot } = useSpace()
  let pending = false
  const settle = () => {
    if (!pending) return
    pending = false
    boot.value.pendingStages = Math.max(0, boot.value.pendingStages - 1)
  }

  onMounted(() => {
    // Counted from mount: the loading screen waits for this stage's first drawn frame, not just the engine's.
    pending = true
    boot.value.pendingStages++
    stop = watch(engineRef, async (engine) => {
      if (!engine || started) return
      started = true
      let s: T
      try {
        s = await factory(engine)
      } catch (err) {
        // A failed stage (data or module not loading) must not keep the loading screen up forever.
        console.error('[space] stage failed to start', err)
        settle()
        return
      }
      // The page may have been left while the stage module was downloading.
      if (!alive || engineRef.value !== engine) {
        s.dispose()
        settle()
        return
      }
      engine.setStage(s)
      stage.value = s
      // Stages that build their content after attach (exploit scenes) say when it is really there.
      if (s.ready) {
        try {
          await s.ready
        } catch (err) {
          console.error('[space] stage content failed to load', err)
        }
        if (!alive) return
      }
      engine.afterNextFrame(settle)
    }, { immediate: true })
  })

  onBeforeUnmount(() => {
    alive = false
    settle()
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
