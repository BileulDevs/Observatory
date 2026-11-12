<script setup lang="ts">
/**
 * One catalogue object in 3D, full screen, with its fact sheet: description, figures, sources, and the previous /
 * next object of the same category.
 */
import { OBJECTS_BY_CATEGORY, findObject } from '~/data/objects'
import type { ObjectStage as ObjectStageType } from '~/engine/stages/ObjectStage'
import { OBJECT_CATEGORIES } from '~/types/objects'

/** Subject placement: right of the panel on wide screens, in the top half on phones. */
const WIDE_QUERY = '(min-width: 900px)'
const LAYOUT = {
  wide: { shift: { x: 0.2, y: 0 }, distanceScale: 1 },
  narrow: { shift: { x: 0, y: -0.24 }, distanceScale: 1.6 },
}

const route = useRoute()
const { t } = useI18n()
const { tl } = useLocalized()
const localePath = useLocalePath()
const { rows } = useObjectFacts()

// Unknown ids are rejected by the router, before the page is created. Throwing from setup alone is not enough:
// in dev builds Vue still renders the template after a setup error, and the template then reads fields of an
// undefined value (TypeError over the 404 page). The throw below stays as the type guard for the rest of setup.
definePageMeta({
  validate: (route) => !!findObject(String(route.params.id)),
})

const object = findObject(String(route.params.id))
if (!object) throw createError({ statusCode: 404, statusMessage: t('objects.notFound'), fatal: true })

const siblings = OBJECTS_BY_CATEGORY[object.category]
const index = siblings.findIndex((o) => o.id === object.id)
const prev = siblings[(index - 1 + siblings.length) % siblings.length]!
const next = siblings[(index + 1) % siblings.length]!
const playing = ref(true)
/** Markers ("Repères") on the object's notable parts. Off by default; the choice is kept between visits. */
const showMarkers = ref(false)
const markers = ref<{ key: string; x: number; y: number; code: string; title: string; text: string; flip: boolean }[]>([])
/** A marker this far (px) left of the others' average gets its label on the left, so it does not run over them. */
const FLIP_OFFSET_PX = 60
/** Width a marker's label needs on its right (px); closer to the screen's edge it opens to the left. */
const LABEL_ROOM_PX = 340
/** Side of a marker's click target (px): the 26 px brackets plus a margin for a finger. */
const HIT_PX = 36
/** Where the visitor's choice to show the markers is kept. */
const MARKERS_KEY = 'objects:markers'
/** Marker chosen (in the scene or the panel's list): highlighted, its sheet open in the panel. */
const selected = ref<string | null>(null)
const selectedMarker = computed(() => object.markers.find((m) => m.anchor === selected.value) ?? null)
const card = ref<HTMLElement | null>(null)

const stage = useStage(async () => {
  const { ObjectStage } = await import('~/engine/stages/ObjectStage')
  const layout = window.matchMedia(WIDE_QUERY).matches ? LAYOUT.wide : LAYOUT.narrow
  const instance: ObjectStageType = new ObjectStage(object.render, layout, { onFrame: placeMarkers })
  if (import.meta.dev) {
    const unknown = instance.unknownAnchors(object.markers.map((m) => m.anchor))
    if (unknown.length) console.warn(`[objects] ${object.id}: marker anchors unknown to the ${object.render.kind} renderer`, unknown)
  }
  return instance
})
watch(playing, (v) => stage.value?.setPlaying(v))

/** Re-projects the markers; called by the stage on frames where something moved. */
function placeMarkers(): void {
  const s = stage.value
  // `object` is re-checked here: TypeScript drops the narrowing from the top-level throw inside a hoisted function.
  if (!s || !object || !showMarkers.value) {
    if (markers.value.length) markers.value = []
    return
  }
  const out: typeof markers.value = []
  object.markers.forEach((m, i) => {
    const p = s.project(m.anchor)
    if (p) out.push({ key: m.anchor, x: p.x, y: p.y, code: t('objects.marker', { n: String(i + 1).padStart(2, '0') }), title: tl(m.title), text: tl(m.text), flip: false })
  })
  const meanX = out.reduce((sum, m) => sum + m.x, 0) / Math.max(out.length, 1)
  // Flipped too near the right edge, where a label running right would be cut off.
  const right = window.innerWidth - LABEL_ROOM_PX
  for (const m of out) m.flip = m.x < meanX - FLIP_OFFSET_PX || m.x > right
  markers.value = out
}

/**
 * Click on a marker (in the scene or in the list): opens its sheet and flies the camera to it, as the exploits'
 * hotspots do; a second click on the open one closes it, the list's buttons being toggles. Choosing from the list
 * turns the markers on, so the highlighted one can be seen.
 */
function toggleMarker(key: string): void {
  if (selected.value === key) {
    selected.value = null
    return
  }
  selected.value = key
  if (!showMarkers.value) {
    showMarkers.value = true
    stage.value?.refreshOverlay()
  }
  stage.value?.focusMarker(key)
}

// The sheet opens in the flow of the panel, under the list: bring it into view with the smallest scroll.
watch(selected, async (key) => {
  if (!key) return
  await nextTick()
  card.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})

function recenter(): void {
  stage.value?.recenter()
}

function toggleMarkers(): void {
  showMarkers.value = !showMarkers.value
  try { localStorage.setItem(MARKERS_KEY, showMarkers.value ? '1' : '0') } catch { /* storage off: the choice lasts this visit */ }
  if (showMarkers.value) stage.value?.refreshOverlay()
  else markers.value = []
  selected.value = null
}

onMounted(() => {
  try { showMarkers.value = localStorage.getItem(MARKERS_KEY) === '1' } catch { /* storage off: keep the default */ }
})
// The stage arrives after mount: place the markers once it is there if they were left on last visit.
watch(stage, (s) => { if (s && showMarkers.value) s.refreshOverlay() })

const wide = useWideLayout(WIDE_QUERY)
watch(wide, (w) => stage.value?.setLayout(w ? LAYOUT.wide : LAYOUT.narrow))

const backTo = localePath({ name: 'objects', query: object.category === OBJECT_CATEGORIES[0] ? {} : { c: object.category } })
const linkTo = (id: string) => localePath({ name: 'objects-id', params: { id } })

useSeoMeta({
  title: () => `${tl(object.name)} · ${t(`objects.categories.${object.category}.name`)}`,
  description: () => tl(object.description),
})
</script>

<template>
  <div class="obj">
    <div class="obj__scrim" aria-hidden="true" />
    <section class="panel panel-fade interactive" :aria-label="tl(object.name)">
      <NuxtLink :to="backTo" class="back mono">← {{ $t(`objects.categories.${object.category}.name`) }}</NuxtLink>
      <p class="eyebrow mono">{{ tl(object.kind) }}</p>
      <h1 class="panel__title">{{ tl(object.name) }}</h1>
      <p class="panel__desc">{{ tl(object.description) }}</p>
      <p class="panel__note mono">{{ $t(`objects.appearance.${object.appearance}`) }}</p>
      <dl class="facts mono">
        <template v-for="row in rows(object.facts)" :key="row.label">
          <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
        </template>
      </dl>
      <h2 class="panel__sub mono">{{ $t('objects.markers') }}</h2>
      <p class="panel__hint">{{ $t('objects.markersHint') }}</p>
      <ul class="marks mono">
        <li v-for="m in object.markers" :key="m.anchor">
          <button type="button" class="marks__item" :aria-pressed="selected === m.anchor" @click="toggleMarker(m.anchor)">{{ tl(m.title) }}</button>
        </li>
      </ul>
      <div v-if="selectedMarker" ref="card" class="marks__card">
        <MarkerCard :marker="selectedMarker" @close="selected = null" />
      </div>
      <h2 class="panel__sub mono">{{ $t('systems.sources') }}</h2>
      <ul class="sources">
        <li v-for="s in object.sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener">{{ s.label }} ↗<span class="sr-only"> {{ $t('a11y.newTab') }}</span></a>
        </li>
      </ul>
      <nav class="panel__nav mono" :aria-label="$t(`objects.categories.${object.category}.name`)">
        <NuxtLink :to="linkTo(prev.id)">← {{ tl(prev.name) }}</NuxtLink>
        <NuxtLink :to="linkTo(next.id)">{{ tl(next.name) }} →</NuxtLink>
      </nav>
    </section>

    <div class="markers" aria-hidden="true">
      <TargetMarker
        v-for="m in markers"
        :key="m.key"
        :x="m.x"
        :y="m.y"
        :code="m.code"
        :title="m.title"
        :readout="m.text"
        :flip="m.flip"
        :active="selected === m.key"
      />
    </div>
    <!-- Click targets over the brackets: the marker drawing itself is decorative (aria-hidden). -->
    <div class="marker-hits">
      <button
        v-for="m in markers"
        :key="m.key"
        type="button"
        class="marker-hit"
        :style="{ transform: `translate(${m.x - HIT_PX / 2}px, ${m.y - HIT_PX / 2}px)` }"
        :aria-label="$t('objects.goToMarker', { name: m.title })"
        :title="m.title"
        @click="toggleMarker(m.key)"
      />
    </div>

    <div class="tools interactive">
      <button type="button" class="tool mono" :aria-pressed="!playing" @click="playing = !playing">
        {{ playing ? $t('objects.pause') : $t('objects.play') }}
      </button>
      <button type="button" class="tool tool--markers mono" :aria-pressed="showMarkers" @click="toggleMarkers">{{ $t('objects.markers') }}</button>
      <button type="button" class="tool tool--recenter mono" @click="recenter">{{ $t('systems.recenter') }}</button>
    </div>
    <p class="hint mono">{{ $t('objects.hint') }}</p>
  </div>
</template>

<style scoped>
.obj { position: fixed; inset: 0; }
.obj__scrim { position: absolute; inset: 0 auto 0 0; width: min(46rem, 60vw);
  background: linear-gradient(90deg, rgb(4 6 10 / 0.9) 0%, rgb(4 6 10 / 0.75) 60%, rgb(4 6 10 / 0) 100%); pointer-events: none; }
.panel { position: absolute; left: 0; top: 0; bottom: 0; width: min(44vw, 38rem); overflow-y: auto; padding: 6rem var(--gutter) 3rem;
  animation: panel-in 0.9s var(--ease-out) 0.2s both; scrollbar-width: thin; }
@keyframes panel-in { from { opacity: 0; transform: translateX(-2rem); } to { opacity: 1; transform: none; } }
.back { display: inline-block; color: var(--muted); text-decoration: none; margin-bottom: 1.6rem; }
.back:hover { color: var(--fg); }
.panel__title { margin: 0 0 1rem; font: 400 clamp(2.6rem, 4.6vw, 4rem)/1 var(--font-serif); }
.panel__desc { margin: 0 0 0.9rem; color: var(--fg-soft); line-height: 1.65; max-width: 58ch; }
.panel__note { margin: 0 0 1.6rem; color: var(--faint); text-transform: none; letter-spacing: 0.02em; line-height: 1.6; }
.panel__sub { margin: 2.4rem 0 0.6rem; font-weight: 400; color: var(--fg); }
.panel__hint { margin: 0 0 0.6rem; color: var(--faint); font-size: 0.875rem; }
/* Same look as the exploits' list of objects in the scene (ExploitNarration). */
.marks { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem; }
.marks__item { appearance: none; background: none; border: 1px solid var(--line); color: var(--muted); padding: 0.35rem 0.6rem; cursor: pointer; font: inherit; font-size: 0.7rem; text-transform: none; letter-spacing: 0.02em; }
.marks__item:hover, .marks__item[aria-pressed='true'] { color: var(--fg); border-color: var(--accent); }
.marks__card { margin-top: 1.2rem; scroll-margin: 1.5rem; }
.facts { display: grid; grid-template-columns: auto 1fr; margin: 0 0 1rem; }
.facts dt, .facts dd { margin: 0; padding: 0.55rem 0; border-top: 1px solid var(--line); }
.facts dt { color: var(--faint); padding-right: 1.5rem; }
.facts dd { text-align: right; text-transform: none; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.sources { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; font-size: 0.875rem; }
.sources a { color: var(--muted); text-decoration: none; border-bottom: 1px solid var(--line); }
.sources a:hover { color: var(--fg); }
.panel__nav { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 1.2rem; border-top: 1px solid var(--line); }
.panel__nav a { color: var(--muted); text-decoration: none; }
.panel__nav a:hover { color: var(--fg); }

.tools { position: absolute; right: var(--gutter); top: 5.6rem; display: grid; gap: 0.6rem; justify-items: end; }
.tool { appearance: none; background: none; border: 0; padding: 0.25rem 0; color: var(--muted); cursor: pointer; }
.tool:hover, .tool[aria-pressed='true'] { color: var(--fg); }
.tool--recenter::before { content: "↺ "; color: var(--accent); }
.tool--markers::before { content: "⌖ "; color: var(--accent); }
/* Over the scene only: clipped out of the panel's area so a marker never lands on the text. */
.markers, .marker-hits { position: absolute; inset: 0; pointer-events: none; overflow: hidden; clip-path: inset(0 0 0 min(44vw, 38rem)); }
/* Same size as HIT_PX in the script. Only the buttons take the pointer: dragging elsewhere still orbits. */
.marker-hit { position: absolute; left: 0; top: 0; width: 36px; height: 36px; padding: 0; border: 0; background: none; border-radius: 50%; cursor: pointer; pointer-events: auto; will-change: transform; }
.marker-hit:focus-visible { outline: 1px solid var(--accent); outline-offset: 2px; }
.hint { position: absolute; right: var(--gutter); bottom: 2rem; margin: 0; color: var(--faint); text-align: right; max-width: 26rem; line-height: 1.8; }

@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
@media (max-width: 899px) {
  .obj__scrim { width: 100%; background: linear-gradient(0deg, rgb(4 6 10 / 0.95) 0%, rgb(4 6 10 / 0.9) 50%, rgb(4 6 10 / 0) 62%); }
  .panel { top: auto; width: 100%; height: 52svh; padding: 1.5rem var(--gutter) 2.5rem; }
  .tools { top: 4.4rem; }
  .markers, .marker-hits { clip-path: inset(0 0 52svh 0); }
  .hint { display: none; }
}
</style>
