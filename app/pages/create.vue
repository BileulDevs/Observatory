<script setup lang="ts">
/**
 * Object creator: pick a type, tune its physical parameters, and the object is rebuilt live in the canvas
 * with its computed fact sheet. The settings live in the URL, so a creation is shared by copying the link.
 */
import { CREATOR, CREATOR_TYPES, parseValues, serializeValues, type CreatorType, type ParamSpec, type ParamValues } from '~/data/creator'
import type { ObjectStage as ObjectStageType } from '~/engine/stages/ObjectStage'

/** Subject placement, as on the object pages: right of the panel on wide screens, top half on phones. */
const WIDE_QUERY = '(min-width: 900px)'
const LAYOUT = {
  wide: { shift: { x: 0.2, y: 0 }, distanceScale: 1 },
  narrow: { shift: { x: 0, y: -0.24 }, distanceScale: 1.6 },
}
/** Rebuild delay after the last change, ms: lets a dragged slider settle (a nebula re-bakes its volume). */
const REBUILD_DELAY = 120
/** URL update delay, ms: replaceState on every slider step floods the history API. */
const URL_DELAY = 400
/** Log sliders run over this many steps. */
const LOG_STEPS = 1000
/** How long the "link copied" confirmation stays, ms. */
const COPIED_MS = 2000

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { num } = useLocalized()
const { rows } = useObjectFacts()

const isType = (v: unknown): v is CreatorType => typeof v === 'string' && (CREATOR_TYPES as readonly string[]).includes(v)
// Start from the defaults, as the prerendered HTML does: reading the query here would make the client's first
// render differ from that HTML, and Vue keeps the server's attributes on a hydration mismatch.
const type = ref<CreatorType>('black-hole')
const values = ref<ParamValues>(parseValues('black-hole', {}))

// Then apply the link's settings once mounted. From the router, not window.location: during hydration the
// address bar briefly shows the prerendered path without its query.
onMounted(() => {
  const query = route.query as Record<string, unknown>
  if (!isType(query.type)) return
  type.value = query.type
  values.value = parseValues(query.type, query)
})

const derived = computed(() => CREATOR[type.value].derive(values.value))
const visibleParams = computed(() => CREATOR[type.value].params.filter((p) => !p.when || p.when(values.value)))
const factRows = computed(() => rows(derived.value.facts))

const stage = useStage(async () => {
  const { ObjectStage } = await import('~/engine/stages/ObjectStage')
  const layout = window.matchMedia(WIDE_QUERY).matches ? LAYOUT.wide : LAYOUT.narrow
  const instance: ObjectStageType = new ObjectStage(derived.value.render, layout)
  return instance
})

const wide = useWideLayout(WIDE_QUERY)
watch(wide, (w) => stage.value?.setLayout(w ? LAYOUT.wide : LAYOUT.narrow))

let rebuildTimer: ReturnType<typeof setTimeout> | null = null
let urlTimer: ReturnType<typeof setTimeout> | null = null
watch(derived, (d) => {
  if (rebuildTimer) clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(() => stage.value?.setRender(d.render), REBUILD_DELAY)
  if (urlTimer) clearTimeout(urlTimer)
  urlTimer = setTimeout(() => {
    router.replace({ query: serializeValues(type.value, values.value) })
  }, URL_DELAY)
})
onBeforeUnmount(() => {
  if (rebuildTimer) clearTimeout(rebuildTimer)
  if (urlTimer) clearTimeout(urlTimer)
})

function selectType(next: CreatorType): void {
  if (next === type.value) return
  type.value = next
  values.value = parseValues(next, {})
}

function reset(): void {
  values.value = parseValues(type.value, {})
}

function set(key: string, value: number | string | boolean): void {
  values.value = { ...values.value, [key]: value }
}

/** Log slider position (0…LOG_STEPS) ↔ value. */
function toLog(p: Extract<ParamSpec, { control: 'log' }>, v: number): number {
  return Math.round(((Math.log10(v) - Math.log10(p.min)) / (Math.log10(p.max) - Math.log10(p.min))) * LOG_STEPS)
}
function fromLog(p: Extract<ParamSpec, { control: 'log' }>, s: number): number {
  const l = Math.log10(p.min) + (s / LOG_STEPS) * (Math.log10(p.max) - Math.log10(p.min))
  return Number((10 ** l).toPrecision(3))
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
/** Slider readout: plain number in the comfortable range, × 10ⁿ outside it. */
function readout(p: ParamSpec): string {
  const v = values.value[p.key]
  if (typeof v !== 'number') return ''
  let text: string
  const a = Math.abs(v)
  if (a !== 0 && (a >= 1e6 || a < 0.01)) {
    const exp = Math.floor(Math.log10(a))
    const sup = String(exp).split('').map((c) => (c === '-' ? '⁻' : SUPERSCRIPT[Number(c)])).join('')
    text = `${num(v / 10 ** exp, 2)} × 10${sup}`
  } else {
    text = num(v, a < 1 ? 3 : a < 100 ? 1 : 0)
  }
  return t(`creator.units.${type.value}.${p.key}`, { v: text })
}

const copied = ref(false)
async function share(): Promise<void> {
  // The URL update is debounced: write the current state first so the copied link is complete.
  await router.replace({ query: serializeValues(type.value, values.value) })
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), COPIED_MS)
  } catch {
    // Clipboard refused (insecure context, permissions): the link is still in the address bar.
  }
}

useSeoMeta({ title: () => t('creator.title'), description: () => t('creator.description') })
</script>

<template>
  <div class="obj">
    <div class="obj__scrim" aria-hidden="true" />
    <section class="panel panel-fade interactive" :aria-label="$t('creator.title')">
      <p class="eyebrow mono">{{ $t('creator.eyebrow') }}</p>
      <h1 class="panel__title">{{ $t('creator.title') }}</h1>
      <p class="panel__desc">{{ $t('creator.description') }}</p>

      <div class="types mono" role="radiogroup" :aria-label="$t('creator.type')">
        <button
          v-for="c in CREATOR_TYPES"
          :key="c"
          type="button"
          role="radio"
          class="type"
          :aria-checked="c === type"
          @click="selectType(c)"
        >
          {{ $t(`creator.types.${c}`) }}
        </button>
      </div>
      <p class="panel__note">{{ $t(`creator.intro.${type}`) }}</p>

      <form class="controls" @submit.prevent>
        <div v-for="p in visibleParams" :key="`${type}-${p.key}`" class="control">
          <label :for="`c-${p.key}`" class="control__label mono">
            <span>{{ $t(`creator.params.${type}.${p.key}`) }}</span>
            <output v-if="p.control === 'range' || p.control === 'log'" :for="`c-${p.key}`">{{ readout(p) }}</output>
          </label>
          <input
            v-if="p.control === 'range'"
            :id="`c-${p.key}`"
            type="range"
            :min="p.min" :max="p.max" :step="p.step"
            :value="values[p.key]"
            @input="set(p.key, Number(($event.target as HTMLInputElement).value))"
          >
          <input
            v-else-if="p.control === 'log'"
            :id="`c-${p.key}`"
            type="range"
            min="0" :max="LOG_STEPS" step="1"
            :value="toLog(p, Number(values[p.key]))"
            :aria-valuetext="readout(p)"
            @input="set(p.key, fromLog(p, Number(($event.target as HTMLInputElement).value)))"
          >
          <select
            v-else-if="p.control === 'select'"
            :id="`c-${p.key}`"
            class="select mono"
            :value="values[p.key]"
            @change="set(p.key, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="o in p.options" :key="o" :value="o">{{ $t(`creator.options.${p.key}.${o}`) }}</option>
          </select>
          <input
            v-else-if="p.control === 'toggle'"
            :id="`c-${p.key}`"
            type="checkbox"
            class="toggle"
            :checked="Boolean(values[p.key])"
            @change="set(p.key, ($event.target as HTMLInputElement).checked)"
          >
          <input
            v-else
            :id="`c-${p.key}`"
            type="color"
            class="color"
            :value="String(values[p.key])"
            @input="set(p.key, ($event.target as HTMLInputElement).value)"
          >
        </div>
      </form>

      <div class="actions mono">
        <button type="button" class="action" @click="share">{{ copied ? $t('creator.copied') : $t('creator.share') }}</button>
        <button type="button" class="action" @click="reset">{{ $t('creator.reset') }}</button>
      </div>

      <h2 class="panel__sub mono">{{ $t('creator.results') }}</h2>
      <dl class="facts mono">
        <template v-for="row in factRows" :key="row.label">
          <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
        </template>
      </dl>
      <p class="panel__note">{{ $t('creator.note') }}</p>
    </section>

    <div class="tools interactive">
      <button type="button" class="tool tool--recenter mono" @click="stage?.recenter()">{{ $t('systems.recenter') }}</button>
    </div>
    <p class="hint mono">{{ $t('objects.hint') }}</p>
  </div>
</template>

<style scoped>
.obj { position: fixed; inset: 0; }
.obj__scrim { position: absolute; inset: 0 auto 0 0; width: min(46rem, 60vw);
  background: linear-gradient(90deg, rgb(4 6 10 / 0.92) 0%, rgb(4 6 10 / 0.8) 60%, rgb(4 6 10 / 0) 100%); pointer-events: none; }
.panel { position: absolute; left: 0; top: 0; bottom: 0; width: min(44vw, 34rem); overflow-y: auto; padding: 6rem var(--gutter) 3rem;
  scrollbar-width: thin; }
.panel__title { margin: 0 0 1rem; font: 400 clamp(2.6rem, 4.6vw, 4rem)/1 var(--font-serif); }
.panel__desc { margin: 0 0 1.4rem; color: var(--fg-soft); line-height: 1.65; max-width: 58ch; }
.panel__note { margin: 0.6rem 0 1.4rem; color: var(--faint); font-size: 0.875rem; line-height: 1.6; }
.panel__sub { margin: 2rem 0 0.6rem; font-weight: 400; color: var(--fg); }

.types { display: flex; flex-wrap: wrap; gap: 0.4rem 1.4rem; padding: 0.8rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.type { appearance: none; background: none; border: 0; padding: 0.3rem 0; color: var(--muted); cursor: pointer; font: inherit; letter-spacing: inherit; text-transform: inherit; position: relative; }
.type:hover, .type[aria-checked='true'] { color: var(--fg); }
.type[aria-checked='true']::after { content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px; background: var(--accent); }

.controls { display: grid; gap: 1.1rem; margin: 0.6rem 0 1.2rem; }
.control { display: grid; gap: 0.45rem; }
.control__label { display: flex; justify-content: space-between; gap: 1rem; color: var(--muted); }
.control__label output { color: var(--fg); text-transform: none; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
input[type='range'] { width: 100%; accent-color: var(--accent); }
.select { background: transparent; color: var(--fg); border: 1px solid var(--line); padding: 0.4rem 0.5rem; }
.select option { background: #0b0e14; }
.toggle { justify-self: start; accent-color: var(--accent); width: 1.1rem; height: 1.1rem; }
.color { justify-self: start; width: 3rem; height: 1.8rem; background: none; border: 1px solid var(--line); padding: 0; }

.actions { display: flex; gap: 1.6rem; }
.action { appearance: none; background: none; border: 0; padding: 0.25rem 0; color: var(--muted); cursor: pointer; font: inherit; letter-spacing: inherit; text-transform: inherit; }
.action:hover { color: var(--fg); }
.action:first-child::before { content: "↗ "; color: var(--accent); }

.facts { display: grid; grid-template-columns: auto 1fr; margin: 0 0 1rem; }
.facts dt, .facts dd { margin: 0; padding: 0.55rem 0; border-top: 1px solid var(--line); }
.facts dt { color: var(--faint); padding-right: 1.5rem; }
.facts dd { text-align: right; text-transform: none; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }

.tools { position: absolute; right: var(--gutter); top: 5.6rem; display: grid; gap: 0.6rem; justify-items: end; }
.tool { appearance: none; background: none; border: 0; padding: 0.25rem 0; color: var(--muted); cursor: pointer; }
.tool:hover { color: var(--fg); }
.tool--recenter::before { content: "↺ "; color: var(--accent); }
.hint { position: absolute; right: var(--gutter); bottom: 2rem; margin: 0; color: var(--faint); text-align: right; max-width: 26rem; line-height: 1.8; }

@media (max-width: 899px) {
  .obj__scrim { width: 100%; background: linear-gradient(0deg, rgb(4 6 10 / 0.95) 0%, rgb(4 6 10 / 0.9) 50%, rgb(4 6 10 / 0) 62%); }
  .panel { top: auto; width: 100%; height: 55svh; padding: 1.5rem var(--gutter) 2.5rem; }
  .tools { top: 4.4rem; }
  .hint { display: none; }
}
</style>
