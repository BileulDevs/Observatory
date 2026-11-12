<script setup lang="ts">
/**
 * First-visit loading screen. Every line and the progress bar follow real events from the engine and the page
 * (see BootState): nothing is timed. It leaves as soon as the current page's 3D has drawn its first frame,
 * and does not come back on later navigations (those reuse the running engine).
 *
 * The animation is pure CSS transforms, which run on the compositor thread: it keeps moving even while the main
 * thread is busy compiling shaders, which is exactly when it is on screen.
 */
const { status, boot } = useSpace()
const { num } = useLocalized()

/** Share of the bar per milestone, by how long each typically takes (the shader share fills program by program). */
const WEIGHT = { fonts: 5, engine: 30, gpu: 5, sky: 10, shaders: 35, stage: 15 } as const

const done = ref(false)
const failed = computed(() => status.value === 'unsupported' || status.value === 'error')
const ready = computed(() => boot.value.frame && boot.value.pendingStages === 0)

const steps = computed(() => {
  const b = boot.value
  const sh = b.shaders
  return [
    { id: 'fonts', ok: b.fonts, detail: '' },
    { id: 'engine', ok: b.engine, detail: '' },
    { id: 'gpu', ok: b.gpu, detail: '' },
    { id: 'sky', ok: b.sky, detail: '' },
    { id: 'shaders', ok: sh.ready, detail: sh.total ? `${sh.done} / ${sh.total}` : '' },
    { id: 'stage', ok: ready.value, detail: '' },
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
        <div class="boot__orrery" aria-hidden="true">
          <span class="boot__ring boot__ring--outer" />
          <span class="boot__ring" />
          <span class="boot__planet" />
          <span class="boot__orbit"><span class="boot__moon" /></span>
          <span class="boot__orbit boot__orbit--slow"><span class="boot__moon boot__moon--far" /></span>
        </div>
        <p class="boot__name">{{ $t('site.name') }}</p>
        <div class="boot__bar" aria-hidden="true"><span :style="{ transform: `scaleX(${progress / 100})` }" /></div>
        <p class="boot__pct mono">{{ $t('boot.progress', { p: num(progress, 0) }) }}</p>
        <ul class="boot__steps mono">
          <li v-for="s in steps" :key="s.id" :class="{ 'is-ok': s.ok, 'is-now': s.id === current }">
            <span class="boot__mark" aria-hidden="true">{{ s.ok ? '●' : s.id === current ? '◌' : '·' }}</span>
            <span>{{ $t(`boot.steps.${s.id}`) }}</span>
            <span v-if="s.detail" class="boot__detail">{{ s.detail }}</span>
          </li>
        </ul>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.boot { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; background: #04060a; }
.boot__inner { display: grid; justify-items: center; gap: 1.1rem; width: min(22rem, 80vw); }
.boot__name { margin: 0.4rem 0 0; font: 400 2.2rem/1 var(--font-serif); letter-spacing: 0.01em; color: var(--fg); }
.boot__bar { width: 100%; height: 1px; background: var(--line); overflow: hidden; }
.boot__bar span { display: block; height: 100%; background: var(--accent); transform-origin: left; transition: transform 0.35s var(--ease-out); }
.boot__pct { margin: 0; color: var(--muted); }
.boot__steps { list-style: none; margin: 0.6rem 0 0; padding: 0; width: 100%; display: grid; gap: 0.35rem; color: var(--faint); font-size: 0.7rem; }
.boot__steps li { display: flex; gap: 0.7rem; align-items: baseline; transition: color 0.3s; }
.boot__steps li.is-ok { color: var(--muted); }
.boot__steps li.is-now { color: var(--fg); }
.boot__mark { width: 0.8rem; color: var(--accent); }
.boot__detail { margin-left: auto; font-variant-numeric: tabular-nums; }

/* Orrery: a planet, two orbiting moons and a slowly turning dashed ring. Transforms only (compositor thread). */
.boot__orrery { position: relative; width: 7rem; height: 7rem; }
.boot__planet { position: absolute; inset: 38%; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #e9dcc0 0%, #a8916a 45%, #2a2219 100%); box-shadow: 0 0 18px rgb(232 200 140 / 0.25); }
.boot__ring { position: absolute; inset: 22%; border-radius: 50%; border: 1px solid var(--line); }
.boot__ring--outer { inset: 4%; border-style: dashed; opacity: 0.6; animation: boot-turn 40s linear infinite; }
.boot__orbit { position: absolute; inset: 22%; animation: boot-turn 4.2s linear infinite; }
.boot__orbit--slow { inset: 4%; animation-duration: 11s; animation-direction: reverse; }
.boot__moon { position: absolute; top: -3px; left: 50%; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: #f2efe6; box-shadow: 0 0 8px rgb(242 239 230 / 0.8); }
.boot__moon--far { width: 4px; height: 4px; margin-left: -2px; top: -2px; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
@keyframes boot-turn { to { transform: rotate(360deg); } }

.boot-leave-active { transition: opacity 0.8s var(--ease-out); }
.boot-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .boot__orbit, .boot__ring--outer { animation: none; }
  .boot__bar span { transition: none; }
}
</style>
