<script setup lang="ts">
/**
 * One constellation: its figure seen from Earth, then the flight to the side that shows how far apart its stars
 * really are. Click a star for its sheet; click a second one to measure the true distance between them.
 */
import { CONSTELLATIONS } from '~/data/constellations.generated'
import type { ConstellationStage as ConstellationStageType, ConstellationView } from '~/engine/stages/ConstellationStage'
import type { ConstellationData, ConstellationStar } from '~/types/constellations'
import type { Localized } from '~/types/systems'

/** Subject placement, as on the object pages. */
const WIDE_QUERY = '(min-width: 900px)'
const SHIFT = { wide: { x: 0.2, y: 0 }, narrow: { x: 0, y: -0.24 } }
/** Names drawn next to stars in the sky: figure stars with a proper name, plus the two selected ones. */
const LABEL_OFFSET_PX = 12

const route = useRoute()
const { t } = useI18n()
const { tl, num } = useLocalized()
const localePath = useLocalePath()
const { sheet } = useStarSheet()

// Unknown ids are rejected by the router, before the page is created. Throwing from setup alone is not enough:
// in dev builds Vue still renders the template after a setup error, and the template then reads fields of an
// undefined value (TypeError over the 404 page). The throw below stays as the type guard for the rest of setup.
definePageMeta({
  validate: (route) => CONSTELLATIONS.some((c) => c.id === String(route.params.id)),
})

const summary = CONSTELLATIONS.find((c) => c.id === String(route.params.id))
if (!summary) throw createError({ statusCode: 404, statusMessage: t('constellations.notFound'), fatal: true })

const data = shallowRef<ConstellationData | null>(null)
const view = ref<ConstellationView>('sky')
/** Measurement slots: first and second star. */
const slotA = ref<number | null>(null)
const slotB = ref<number | null>(null)
/** The star whose sheet is open (the last one clicked or chosen). */
const focused = ref<number | null>(null)
const hover = ref<{ hip: number; x: number; y: number } | null>(null)
const labels = ref<{ hip: number; text: string; x: number; y: number; slot: 'a' | 'b' | null }[]>([])

const byHip = computed(() => new Map((data.value?.stars ?? []).map((s) => [s.hip, s])))
const starOf = (hip: number | null): ConstellationStar | null => (hip === null ? null : byHip.value.get(hip) ?? null)
const focusedSheet = computed(() => {
  const s = starOf(focused.value)
  return s ? sheet(s, constellationName(s)) : null
})
const hoverStar = computed(() => starOf(hover.value?.hip ?? null))
/** Figure stars first, then the constellation's other bright stars; brightest first. Field stars stay off the list. */
const starList = computed(() => (data.value?.stars ?? []).filter((s) => s.role !== 'field')
  .sort((a, b) => Number(b.role === 'figure') - Number(a.role === 'figure') || a.mag - b.mag))
const label = (s: ConstellationStar) => (s.name ? `${s.name} · ${s.designation}` : s.designation)

/** The constellation a star belongs to: this one, or a neighbour for stars of the surrounding field. */
function constellationName(s: ConstellationStar): Localized {
  if (s.con === summary!.abbr) return summary!.name
  // Unknown abbreviation (should not happen with HYG data): show it as is in every language.
  return CONSTELLATIONS.find((c) => c.abbr === s.con)?.name ?? { fr: s.con, en: s.con }
}

// The star data is a static file per constellation: fetched in the browser only, the HTML stays light.
const stage = useStage(async () => {
  const [{ ConstellationStage }, json] = await Promise.all([
    import('~/engine/stages/ConstellationStage'),
    $fetch<ConstellationData>(`/data/constellations/${summary.id}.json`),
  ])
  data.value = json
  const shift = window.matchMedia(WIDE_QUERY).matches ? SHIFT.wide : SHIFT.narrow
  const instance: ConstellationStageType = new ConstellationStage(json, shift, {
    onSelect: (hip) => { if (hip !== null) pick(hip) },
    onHover: (h) => { hover.value = h },
    onFrame: placeLabels,
  })
  return instance
})

watch(view, (v) => stage.value?.setView(v))
const wide = useWideLayout(WIDE_QUERY)
watch(wide, (w) => stage.value?.setShift(w ? SHIFT.wide : SHIFT.narrow))
watch([slotA, slotB], ([a, b]) => {
  stage.value?.setSelection(a, b)
  placeLabels()
})

/**
 * A click on a star (map or list). First click fills the first slot, the second the other; once both are set,
 * a new star replaces the second. Clicking a selected star removes it from the measurement.
 */
function pick(hip: number): void {
  focused.value = hip
  if (hip === slotA.value) {
    slotA.value = slotB.value
    slotB.value = null
  } else if (hip === slotB.value) {
    slotB.value = null
  } else if (slotA.value === null) {
    slotA.value = hip
  } else {
    slotB.value = hip
  }
}

function clear(slot: 'a' | 'b' | 'both'): void {
  if (slot === 'both') {
    slotA.value = null
    slotB.value = null
  } else if (slot === 'a') {
    slotA.value = slotB.value
    slotB.value = null
  } else {
    slotB.value = null
  }
}

/** Escape cancels the current measurement. */
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') clear('both')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/** Re-projects the star names after each drawn frame. */
function placeLabels(): void {
  const s = stage.value
  const stars = data.value?.stars
  if (!s || !stars) return
  const out: typeof labels.value = []
  for (const star of stars) {
    const slot = star.hip === slotA.value ? 'a' : star.hip === slotB.value ? 'b' : null
    if (!slot && !(star.role === 'figure' && star.name)) continue
    const p = s.project(star.hip)
    if (p) out.push({ hip: star.hip, text: star.name ?? star.designation, x: p.x + LABEL_OFFSET_PX, y: p.y - LABEL_OFFSET_PX, slot })
  }
  labels.value = out
}

const tipLabel = computed(() => {
  const s = hoverStar.value
  if (!s) return ''
  return s.distLy !== null ? t('constellations.tooltip', { name: label(s), d: num(s.distLy, 0) }) : label(s)
})

useSeoMeta({
  title: () => `${tl(summary.name)} · ${t('constellations.title')}`,
  description: () => t('constellations.pageDescription', { name: tl(summary.name) }),
})
</script>

<template>
  <div class="obj">
    <div class="obj__scrim" aria-hidden="true" />
    <section class="panel panel-fade interactive" :aria-label="tl(summary.name)">
      <NuxtLink :to="localePath('constellations')" class="back mono">← {{ $t('constellations.title') }}</NuxtLink>
      <p class="eyebrow mono">{{ summary.latin }} · {{ summary.genitive }} · {{ summary.abbr }}</p>
      <h1 class="panel__title">{{ tl(summary.name) }}</h1>
      <p class="panel__desc">
        {{ $t('constellations.intro', { n: summary.figureStars }) }}
        <template v-if="summary.nearestLy && summary.farthestLy">
          {{ $t('constellations.depth', { near: num(summary.nearestLy, 0), far: num(summary.farthestLy, 0) }) }}
        </template>
      </p>

      <div class="views mono" role="radiogroup" :aria-label="$t('constellations.viewLabel')">
        <button type="button" role="radio" class="view" :aria-checked="view === 'sky'" @click="view = 'sky'">{{ $t('constellations.viewSky') }}</button>
        <button type="button" role="radio" class="view" :aria-checked="view === '3d'" @click="view = '3d'">{{ $t('constellations.view3d') }}</button>
      </div>
      <p class="panel__note">{{ view === 'sky' ? $t('constellations.skyNote') : $t('constellations.depthNote') }}</p>

      <StarMeasure :a="starOf(slotA)" :b="starOf(slotB)" @clear="clear" @focus="(h) => (focused = h)" />

      <StarSheetCard v-if="focusedSheet" :sheet="focusedSheet" />
      <p v-else class="panel__note">{{ $t('constellations.clickHint') }}</p>

      <h2 class="panel__sub mono">{{ $t('constellations.stars') }}</h2>
      <p v-if="!data" class="panel__note mono">{{ $t('objects.loading') }}</p>
      <ul v-else class="stars mono">
        <li v-for="s in starList" :key="s.hip">
          <button
            type="button"
            class="star"
            :class="{ 'is-a': s.hip === slotA, 'is-b': s.hip === slotB }"
            :aria-pressed="s.hip === slotA || s.hip === slotB"
            @click="pick(s.hip)"
          >
            <span>{{ label(s) }}<span v-if="s.role !== 'figure'" class="star__extra"> · {{ $t('constellations.outsideFigure') }}</span></span>
            <span class="star__d">{{ s.distLy !== null ? $t('objects.units.ly', { v: num(s.distLy, 0) }) : '—' }}</span>
          </button>
        </li>
      </ul>
      <p class="panel__note">{{ $t('constellations.dataNote') }}</p>
    </section>

    <div class="labels" aria-hidden="true">
      <span
        v-for="l in labels"
        :key="l.hip"
        class="label mono"
        :class="l.slot ? `label--${l.slot}` : ''"
        :style="{ transform: `translate(${l.x}px, ${l.y}px)` }"
      >{{ l.text }}</span>
    </div>
    <p v-if="hover && hoverStar" class="tip mono" :style="{ left: `${hover.x + 14}px`, top: `${hover.y + 14}px` }">{{ tipLabel }}</p>

    <div class="tools interactive">
      <button type="button" class="tool tool--recenter mono" @click="stage?.recenter()">{{ $t('systems.recenter') }}</button>
    </div>
    <p class="hint mono">{{ view === '3d' ? $t('objects.hint') : $t('constellations.skyHint') }}</p>
  </div>
</template>

<style scoped>
.obj { position: fixed; inset: 0; }
.obj__scrim { position: absolute; inset: 0 auto 0 0; width: min(46rem, 60vw);
  background: linear-gradient(90deg, rgb(4 6 10 / 0.9) 0%, rgb(4 6 10 / 0.75) 60%, rgb(4 6 10 / 0) 100%); pointer-events: none; }
.panel { position: absolute; left: 0; top: 0; bottom: 0; width: min(44vw, 34rem); overflow-y: auto; padding: 6rem var(--gutter) 3rem; scrollbar-width: thin; z-index: 2; }
.back { display: inline-block; color: var(--muted); text-decoration: none; margin-bottom: 1.6rem; }
.back:hover { color: var(--fg); }
.panel__title { margin: 0 0 1rem; font: 400 clamp(2.6rem, 4.6vw, 4rem)/1 var(--font-serif); }
.panel__desc { margin: 0 0 1.4rem; color: var(--fg-soft); line-height: 1.65; max-width: 58ch; }
.panel__note { margin: 0.6rem 0 1.4rem; color: var(--faint); font-size: 0.875rem; line-height: 1.6; }
.panel__sub { margin: 1.8rem 0 0.6rem; font-weight: 400; color: var(--fg); }

.views { display: flex; gap: 1.6rem; padding: 0.8rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.view { appearance: none; background: none; border: 0; padding: 0.3rem 0; color: var(--muted); cursor: pointer; font: inherit; letter-spacing: inherit; text-transform: inherit; position: relative; }
.view:hover, .view[aria-checked='true'] { color: var(--fg); }
.view[aria-checked='true']::after { content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px; background: var(--accent); }

.stars { list-style: none; margin: 0; padding: 0; }
.star { appearance: none; width: 100%; display: flex; justify-content: space-between; gap: 1rem; background: none; border: 0; border-top: 1px solid var(--line);
  padding: 0.5rem 0; color: var(--muted); cursor: pointer; font: inherit; letter-spacing: 0.02em; text-transform: none; text-align: left; }
.star:hover { color: var(--fg); }
.star.is-a { color: var(--fg); box-shadow: inset 2px 0 0 #e8c27a; padding-left: 0.6rem; }
.star.is-b { color: var(--fg); box-shadow: inset 2px 0 0 #7fd6e8; padding-left: 0.6rem; }
.star__extra { color: var(--faint); }
.star__d { font-variant-numeric: tabular-nums; white-space: nowrap; }

/* The panel has no opaque background: clip the names out of its area instead of letting them run under the text. */
.labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 1; clip-path: inset(0 0 0 min(44vw, 34rem)); }
.label { position: absolute; left: 0; top: 0; font-size: 0.65rem; color: rgb(232 226 210 / 0.55); text-transform: none; letter-spacing: 0.04em; white-space: nowrap; will-change: transform; }
.label--a { color: #e8c27a; }
.label--b { color: #7fd6e8; }
.tip { position: fixed; margin: 0; padding: 0.35rem 0.6rem; background: rgb(4 6 10 / 0.85); border: 1px solid var(--line); color: var(--fg);
  pointer-events: none; text-transform: none; letter-spacing: 0.02em; font-size: 0.75rem; white-space: nowrap; z-index: 6; }
.tools { position: absolute; right: var(--gutter); top: 5.6rem; display: grid; gap: 0.6rem; justify-items: end; z-index: 2; }
.tool { appearance: none; background: none; border: 0; padding: 0.25rem 0; color: var(--muted); cursor: pointer; }
.tool:hover { color: var(--fg); }
.tool--recenter::before { content: "↺ "; color: var(--accent); }
.hint { position: absolute; right: var(--gutter); bottom: 2rem; margin: 0; color: var(--faint); text-align: right; max-width: 26rem; line-height: 1.8; }

@media (max-width: 899px) {
  .obj__scrim { width: 100%; background: linear-gradient(0deg, rgb(4 6 10 / 0.95) 0%, rgb(4 6 10 / 0.9) 50%, rgb(4 6 10 / 0) 62%); }
  .panel { top: auto; width: 100%; height: 52svh; padding: 1.5rem var(--gutter) 2.5rem; }
  .labels { clip-path: inset(0 0 52svh 0); }
  .tools { top: 4.4rem; }
  .hint { display: none; }
}
</style>
