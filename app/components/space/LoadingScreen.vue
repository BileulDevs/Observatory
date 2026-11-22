<script setup lang="ts">
/**
 * First-visit loading screen: the wordmark, a bar that fills and one line naming the step in progress. The bar and
 * the line follow real events from the engine and the page (see BootState): nothing is timed. It leaves as soon as
 * the current page's 3D has drawn its first frame, and does not come back on later navigations (those reuse the
 * running engine).
 *
 * The only animation (a dot circling an orbit) is a CSS transform, which runs on the compositor thread: it keeps
 * moving even while the main thread is busy, which is exactly when this screen is up.
 */
const { status, boot } = useSpace()
const { num } = useLocalized()

/** Share of the bar per milestone, by how long each typically takes (the shader share fills program by program). */
const WEIGHT = { fonts: 5, engine: 30, gpu: 5, sky: 10, shaders: 35, stage: 15 } as const

const done = ref(false)
const failed = computed(() => status.value === 'unsupported' || status.value === 'error')
const ready = computed(() => boot.value.frame && boot.value.pendingStages === 0)

/** Start-up steps in order; the first one not done is the one named on screen. */
const steps = computed(() => {
  const b = boot.value
  return [
    { id: 'fonts', ok: b.fonts },
    { id: 'engine', ok: b.engine },
    { id: 'gpu', ok: b.gpu },
    { id: 'sky', ok: b.sky },
    { id: 'shaders', ok: b.shaders.ready },
    { id: 'stage', ok: ready.value },
  ]
})
const current = computed(() => steps.value.find((s) => !s.ok)?.id ?? null)

const progress = computed(() => {
  const b = boot.value
  let p = 0
  if (b.fonts) p += WEIGHT.fonts
  if (b.engine) p += WEIGHT.engine
  if (b.gpu) p += WEIGHT.gpu
  if (b.sky) p += WEIGHT.sky
  p += WEIGHT.shaders * (b.shaders.ready ? 1 : b.shaders.total ? b.shaders.done / b.shaders.total : 0)
  if (ready.value) p += WEIGHT.stage
  return Math.min(100, Math.round(p))
})

onMounted(() => {
  // Fonts: the only resource the HTML itself waits on visually.
  document.fonts?.ready.then(() => { boot.value.fonts = true }).catch(() => { boot.value.fonts = true })
  if (!document.fonts) boot.value.fonts = true
})

/** Removed from the DOM once its fade-out has finished. */
function onLeave(): void {
  done.value = true
}
</script>

<template>
  <Transition name="boot" @after-leave="onLeave">
    <div v-if="!done && !ready && !failed" class="boot" role="status" aria-live="polite">
      <div class="boot__inner">
        <div class="boot__orbit" aria-hidden="true"><span class="boot__dot" /></div>
        <p class="boot__name">{{ $t('site.name') }}</p>
        <div class="boot__bar" aria-hidden="true"><span :style="{ transform: `scaleX(${progress / 100})` }" /></div>
        <p class="boot__step">
          <span>{{ current ? $t(`boot.steps.${current}`) : '' }}</span>
          <span class="boot__pct mono">{{ $t('boot.progress', { p: num(progress, 0) }) }}</span>
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.boot { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; background: var(--bg); }
.boot__inner { display: grid; justify-items: center; gap: 1.1rem; width: min(22rem, 80vw); }
.boot__name { margin: 0.4rem 0 0; font: 800 2.75rem/1 var(--font-display); letter-spacing: 0.02em; text-transform: uppercase; color: var(--fg); }
.boot__bar { width: 100%; height: 2px; background: var(--line); overflow: hidden; }
.boot__bar span { display: block; height: 100%; background: var(--accent); transform-origin: left; transition: transform 0.35s var(--ease-out); }
/* Fixed height: step names differ in length, and the block must not jump as they change. */
.boot__step { display: flex; justify-content: space-between; gap: 1rem; width: 100%; min-height: 1.5em; margin: 0; font-size: 0.9375rem; color: var(--muted); }
.boot__pct { color: var(--fg); font-variant-numeric: tabular-nums; }

/* An orbit with one dot going round it. Transforms only (compositor thread). */
.boot__orbit { position: relative; width: 3.5rem; height: 3.5rem; border: 1px solid var(--line); border-radius: 50%; animation: boot-turn 2.4s linear infinite; }
.boot__dot { position: absolute; top: -4px; left: 50%; width: 7px; height: 7px; margin-left: -3.5px; border-radius: 50%; background: var(--accent); }
@keyframes boot-turn { to { transform: rotate(360deg); } }

.boot-leave-active { transition: opacity 0.8s var(--ease-out); }
.boot-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .boot__orbit { animation: none; }
  .boot__bar span { transition: none; }
}
</style>
