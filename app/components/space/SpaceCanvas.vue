<script setup lang="ts">
/**
 * Persistent WebGL layer, mounted once in the layout and kept across page navigations
 * (re-creating the renderer would recompile every shader and redo the bakes).
 * The engine is loaded lazily, client-side only. Must be wrapped in <ClientOnly> (see the layout).
 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const canvas = ref<HTMLCanvasElement | null>(null)
const { status, boot, engine } = useSpace()
let mq: MediaQueryList | null = null

function onMotionChange(): void {
  engine.value?.setMotion(!mq?.matches)
}

function onVisibility(): void {
  engine.value?.setActive(!document.hidden)
}

onMounted(async () => {
  const el = canvas.value
  if (!el) return
  status.value = 'loading'
  try {
    // Dynamic import: Three.js never reaches the server bundle nor blocks the first paint.
    const { Engine } = await import('~/engine/Engine')
    boot.value.engine = true
    if (!Engine.isSupported()) {
      status.value = 'unsupported'
      return
    }
    const instance = new Engine(el, {
      onFirstFrame: () => { status.value = 'ready' },
      onBoot: (step) => {
        if (step === 'shaders') boot.value.shaders.ready = true
        else boot.value[step] = true
      },
      onShaders: (done, total) => {
        boot.value.shaders = { done, total, ready: done >= total }
      },
      onError: () => { status.value = 'error' },
    })
    mq = window.matchMedia(REDUCED_MOTION_QUERY)
    mq.addEventListener('change', onMotionChange)
    instance.setMotion(!mq.matches)
    document.addEventListener('visibilitychange', onVisibility)
    provideEngine(instance)
  } catch (err) {
    console.error('[space] engine failed to start', err)
    status.value = 'error'
  }
})

onBeforeUnmount(() => {
  mq?.removeEventListener('change', onMotionChange)
  document.removeEventListener('visibilitychange', onVisibility)
  engine.value?.dispose()
  provideEngine(null)
})
</script>

<template>
  <div class="space" :class="{ 'is-ready': status === 'ready' }" aria-hidden="true">
    <canvas ref="canvas" class="space__canvas" />
  </div>
</template>

<style scoped>
.space { position: fixed; inset: 0; z-index: 0; opacity: 0; transition: opacity 1.2s var(--ease-out); }
.space.is-ready { opacity: 1; }
.space__canvas { display: block; width: 100%; height: 100%; touch-action: none; }
@media (prefers-reduced-motion: reduce) { .space { transition: none; } }
</style>
