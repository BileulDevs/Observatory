<script setup lang="ts">
/**
 * App-wide error page. Nuxt renders it instead of the layout and the page for any fatal error: an address no
 * route matches, an unknown object, system, constellation or exploit id (those pages throw a 404), or a crash.
 * A 404 shows the "lost in space" scene; anything else gets a sober message. Self-contained on purpose: it draws
 * its own starfield in SVG instead of mounting SpaceCanvas, so it still works when the error came from WebGL.
 */
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const route = useRoute()

/** HTTP status that means "this address leads nowhere". */
const NOT_FOUND = 404
/** Stars in the background. More looks denser but each one is an SVG node; 140 stays light on mobile. */
const STAR_COUNT = 140
/** Fixed seed so the sky is the same on every visit (and between hydration and render). */
const STAR_SEED = 404
/** Share of stars that twinkle. Higher reads as noise rather than depth. */
const TWINKLE_SHARE = 0.18

// `statusCode` is deprecated in Nuxt 4 but still filled by createError({ statusCode }), which the pages use.
const status = computed(() => props.error.status ?? props.error.statusCode ?? 500)
const lost = computed(() => status.value === NOT_FOUND)

/** Address the visitor tried to reach, shown as the "last known position". */
const lostPath = computed(() => route.fullPath)

useHead({ title: () => (lost.value ? t('error.lost.title') : t('error.generic.title')) })

/** Deterministic pseudo-random generator (mulberry32): Math.random would reshuffle the sky on every render. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let r = Math.imul(a ^ (a >>> 15), 1 | a)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Star positions in a 0–100 viewBox, with radius, opacity and an optional twinkle delay. */
const stars = (() => {
  const rand = seeded(STAR_SEED)
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    x: rand() * 100,
    y: rand() * 100,
    // Squared so most stars are tiny and a few are bright, like a real sky.
    r: 0.05 + rand() ** 2 * 0.22,
    o: 0.25 + rand() * 0.6,
    twinkle: rand() < TWINKLE_SHARE ? `${(rand() * 6).toFixed(2)}s` : null,
  }))
})()

/** Leaves the error state and goes home; clearError is required, a plain link would keep the error page up. */
function goHome() {
  clearError({ redirect: '/' })
}

/** Leaves the error state and returns to the previous page, or home when the visitor landed here directly. */
async function goBack() {
  if (import.meta.client && window.history.length > 1) {
    await clearError()
    window.history.back()
  } else {
    goHome()
  }
}
</script>

<template>
  <div class="lost">
    <svg class="lost__sky" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle
        v-for="s in stars"
        :key="s.id"
        :cx="s.x"
        :cy="s.y"
        :r="s.r"
        :opacity="s.o"
        :class="{ twinkle: s.twinkle }"
        :style="s.twinkle ? { animationDelay: s.twinkle } : undefined"
      />
    </svg>

    <!-- A far, dim planet: gives the void a sense of scale. -->
    <div class="lost__planet" aria-hidden="true" />

    <!-- Original drawing: an astronaut drifting away from a cut tether. -->
    <svg v-if="lost" class="lost__astronaut" viewBox="0 0 120 120" aria-hidden="true">
      <path class="tether" d="M8 112 C 30 100, 34 80, 50 74" />
      <g class="drift">
        <rect x="58" y="44" width="16" height="26" rx="4" class="pack" />
        <rect x="44" y="48" width="24" height="30" rx="9" class="suit" />
        <rect x="36" y="52" width="10" height="7" rx="3.5" class="suit" transform="rotate(-25 41 55)" />
        <rect x="64" y="58" width="10" height="7" rx="3.5" class="suit" transform="rotate(30 69 61)" />
        <rect x="45" y="74" width="9" height="16" rx="4" class="suit" transform="rotate(12 49 82)" />
        <rect x="57" y="74" width="9" height="16" rx="4" class="suit" transform="rotate(-18 61 82)" />
        <circle cx="56" cy="38" r="14" class="suit" />
        <ellipse cx="54" cy="38" rx="9" ry="7.5" class="visor" />
        <ellipse cx="51" cy="35" rx="3" ry="1.6" class="glint" />
      </g>
    </svg>

    <main class="lost__body" :aria-labelledby="'error-title'">
      <p class="eyebrow mono">{{ lost ? t('error.lost.eyebrow') : t('error.generic.eyebrow', { status }) }}</p>
      <h1 id="error-title" class="lost__title">
        {{ lost ? t('error.lost.title') : t('error.generic.title') }}
      </h1>
      <p class="lost__text">{{ lost ? t('error.lost.body') : t('error.generic.body') }}</p>

      <dl v-if="lost" class="lost__readout mono">
        <div><dt>{{ t('error.lost.positionLabel') }}</dt><dd>{{ lostPath }}</dd></div>
        <div><dt>{{ t('error.lost.signalLabel') }}</dt><dd>{{ t('error.lost.signalValue') }}</dd></div>
      </dl>

      <div class="lost__actions">
        <button type="button" class="action action--primary" @click="goHome">{{ t('error.home') }}</button>
        <button type="button" class="action" @click="goBack">{{ t('error.back') }}</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.lost {
  position: fixed;
  inset: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: var(--gutter, 1.5rem);
  background: radial-gradient(ellipse at 70% 20%, rgb(40 52 80 / 0.35), transparent 60%), var(--bg);
  color: var(--fg);
}

.lost__sky { position: absolute; inset: 0; width: 100%; height: 100%; fill: var(--fg); }
.twinkle { animation: twinkle 4s ease-in-out infinite; }
@keyframes twinkle { 50% { opacity: 0.1; } }

.lost__planet {
  position: absolute;
  right: -14vmin;
  bottom: -18vmin;
  width: 46vmin;
  height: 46vmin;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #3b4a63, #141a26 60%, #05070b);
  box-shadow: -2px -2px 30px rgb(226 167 91 / 0.12);
  opacity: 0.8;
}

.lost__astronaut {
  position: absolute;
  top: 12%;
  right: 14%;
  width: clamp(110px, 18vmin, 190px);
  overflow: visible;
}
.tether { fill: none; stroke: var(--muted); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.6; }
.drift { transform-origin: 56px 60px; animation: drift 14s ease-in-out infinite; }
.suit { fill: var(--fg-soft, #cdc8be); }
.pack { fill: var(--muted); }
.visor { fill: #0d1420; stroke: var(--accent); stroke-width: 0.8; }
.glint { fill: var(--fg); opacity: 0.5; }
@keyframes drift {
  0% { transform: translate(0, 0) rotate(-8deg); }
  50% { transform: translate(-10px, 8px) rotate(14deg); }
  100% { transform: translate(0, 0) rotate(-8deg); }
}

.lost__body { position: relative; max-width: 34rem; }
.lost__title {
  margin: 0 0 1rem;
  font-family: var(--font-serif);
  font-weight: 400;
  font-size: clamp(2.4rem, 6vw, 4rem);
  line-height: 1.05;
}
.lost__text { margin: 0 0 1.75rem; color: var(--fg-soft, var(--fg)); line-height: 1.6; }

.lost__readout {
  display: grid;
  gap: 0.4rem;
  margin: 0 0 2rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--line);
  color: var(--muted);
}
.lost__readout div { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.lost__readout dd { margin: 0; color: var(--fg); word-break: break-all; text-transform: none; }

.lost__actions { display: flex; gap: 1.5rem; flex-wrap: wrap; }

@media (max-width: 640px) {
  .lost__astronaut { top: 4%; right: 6%; }
}
@media (prefers-reduced-motion: reduce) {
  .twinkle, .drift { animation: none; }
}
</style>
