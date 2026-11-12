<script setup lang="ts">
/**
 * One planetary system in 3D: orrery or carousel, simulation controls, and a fact panel for the inspected
 * star, planet or moon. The selection lives in the URL (?body=jupiter&moon=io), so it can be shared and
 * survives a reload.
 */
import { findSystem } from '~/data/catalog'
import { toStage } from '~/data/scale'
import type { SystemLabel, SystemLayout, SystemStage as SystemStageType } from '~/engine/stages/SystemStage'
import type { Localized } from '~/types/systems'

/** Must match STAR_ID in the stage (not imported: that would pull Three.js into the server bundle). */
const STAR_ID = 'star'
/** Subject placement while browsing / inspecting, as viewport fractions (see ViewShift). */
const WIDE_QUERY = '(min-width: 900px)'
const SHIFTS = {
  wide: { browse: { x: 0.08, y: -0.02 }, inspect: { x: 0.22, y: 0 }, inspectDistance: 1 },
  narrow: { browse: { x: 0, y: -0.12 }, inspect: { x: 0, y: -0.27 }, inspectDistance: 1.9 },
}
/** Bake size while browsing: planets are small on screen. 256 ≈ 4 MB each. */
const BROWSE_RES = 256
/** Simulation speeds offered. 0 = paused; the base speed is already compressed (see data/scale.ts). */
const SPEEDS = [0, 0.5, 1, 2, 5, 10] as const

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { tl, num } = useLocalized()
const localePath = useLocalePath()
const { planetRows, starRows, moonRow, moonRows } = useFacts()

const system = findSystem(String(route.params.id))
if (!system) throw createError({ statusCode: 404, statusMessage: t('systems.notFound'), fatal: true })

const layout = ref<SystemLayout>('orbit')
const speed = ref<number>(1)
const showOrbits = ref(true)
const showLabels = ref(true)
const showMoons = ref(true)
const moonId = ref<string | null>(null)
const focusedId = ref<string | null>(null)
const inspectedId = ref<string | null>(null)
const labels = ref<SystemLabel[]>([])

/** What the UI lists: the star first, then planets outwards (same order as the 3D scene). */
interface BodyView {
  id: string
  name: string | Localized
  kind: string | Localized
}
const planets = [...system.planets].sort((a, b) => a.facts.semiMajorAxisAU - b.facts.semiMajorAxisAU)
const planetById = new Map(planets.map((p) => [p.id, p]))
const bodies: BodyView[] = [
  { id: STAR_ID, name: system.star.name, kind: { fr: `Étoile · ${system.star.spectralType}`, en: `Star · ${system.star.spectralType}` } },
  ...planets.map((p) => ({ id: p.id, name: p.name, kind: p.kind })),
]
const bodyById = new Map(bodies.map((b) => [b.id, b]))
const isBody = (id: unknown): id is string => typeof id === 'string' && bodyById.has(id)

const focused = computed(() => (focusedId.value ? bodyById.get(focusedId.value) ?? null : null))
const inspected = computed(() => (inspectedId.value ? bodyById.get(inspectedId.value) ?? null : null))
const inspectedPlanet = computed(() => (inspectedId.value ? planetById.get(inspectedId.value) ?? null : null))
const inspectedMoon = computed(() => inspectedPlanet.value?.moons?.find((m) => m.id === moonId.value) ?? null)
/** No toggle to offer when no planet of this system has a known moon (real exoplanet systems). */
const hasMoons = planets.some((p) => p.moons?.length)
const isMoonOf = (planetId: string, q: unknown): q is string =>
  typeof q === 'string' && !!planetById.get(planetId)?.moons?.some((m) => m.id === q)
const indexOf = (id: string) => bodies.findIndex((b) => b.id === id)
const ordinal = (id: string) => (id === STAR_ID ? '00' : String(indexOf(id)).padStart(2, '0'))

const stage = useStage(async (engine) => {
  const { SystemStage } = await import('~/engine/stages/SystemStage')
  const { star, bodies: stageBodies } = toStage(system)
  const s = window.matchMedia(WIDE_QUERY).matches ? SHIFTS.wide : SHIFTS.narrow
  const instance: SystemStageType = new SystemStage(star, stageBodies, {
    layout: layout.value,
    browseRes: BROWSE_RES,
    inspectRes: Math.min(engine.quality.bakeRes, 1024),
    browseShift: s.browse,
    inspectShift: s.inspect,
    inspectDistance: s.inspectDistance,
  }, {
    onLabels: (l) => { labels.value = l },
    onFocus: (id) => { focusedId.value = id },
    onInspect: (id) => {
      inspectedId.value = id
      queueUrlSync()
    },
    onMoon: (id) => {
      moonId.value = id
      queueUrlSync()
    },
  })
  instance.setTimeScale(speed.value)
  instance.setOrbitsVisible(showOrbits.value)
  instance.setMoonsVisible(showMoons.value)
  return instance
})
const wide = useWideLayout(WIDE_QUERY)
watch(wide, (w) => {
  const s = w ? SHIFTS.wide : SHIFTS.narrow
  stage.value?.setShifts(s.browse, s.inspect, s.inspectDistance)
})

/**
 * Writes the selection to the URL once per tick. Selecting a moon emits two events (planet, then moon): written
 * one by one, the intermediate URL (planet, no moon) reached the route watcher below after the moon was selected,
 * and the watcher dropped the moon again.
 */
let urlSyncQueued = false
function queueUrlSync(): void {
  if (urlSyncQueued) return
  urlSyncQueued = true
  queueMicrotask(() => {
    urlSyncQueued = false
    const body = inspectedId.value ?? undefined
    const moon = moonId.value ?? undefined
    if (route.query.body !== body || route.query.moon !== moon) router.replace({ query: { ...route.query, body, moon } })
  })
}

// Deep link: open the body from the URL once the stage exists, and follow back/forward navigation.
watch(stage, (s) => {
  if (!s || !isBody(route.query.body)) return
  const body = route.query.body
  const moon = route.query.moon
  s.inspect(body)
  if (isMoonOf(body, moon)) selectMoon(moon)
})
watch(() => [route.query.body, route.query.moon] as const, ([q, m]) => {
  const s = stage.value
  if (!s) return
  const id = isBody(q) ? q : null
  if (id !== s.inspectedId) s.inspect(id)
  const moon = id && isMoonOf(id, m) ? m : null
  if (moon !== s.moonId) selectMoon(moon)
})
watch(layout, (l) => stage.value?.setLayout(l))
watch(speed, (v) => stage.value?.setTimeScale(v))
watch(showOrbits, (v) => stage.value?.setOrbitsVisible(v))
watch(showMoons, (v) => stage.value?.setMoonsVisible(v))

function inspect(id: string | null): void {
  stage.value?.inspect(id)
}
function step(dir: 1 | -1): void {
  stage.value?.step(dir)
}
/**
 * Selects a moon of the inspected planet (null = back to the planet). Asking for a moon is explicit enough to
 * turn hidden moons back on: otherwise the click would silently do nothing.
 */
function selectMoon(id: string | null): void {
  const s = stage.value
  if (!s) return
  if (id && !showMoons.value) {
    showMoons.value = true
    s.setMoonsVisible(true)
  }
  s.selectMoon(id)
}
/** Previous / next moon of the inspected planet, wrapping around. */
function stepMoon(dir: 1 | -1): void {
  const list = inspectedPlanet.value?.moons
  if (!list?.length) return
  const i = list.findIndex((m) => m.id === moonId.value)
  selectMoon(list[(i + dir + list.length) % list.length]!.id)
}
/** Moon labels use "<planet>/<moon>" ids (see MOON_SEPARATOR in the stage). */
function isMoonLabel(id: string): boolean {
  return id.includes('/')
}
function labelName(id: string): string {
  if (isMoonLabel(id)) {
    const [pid, mid] = id.split('/')
    const moon = planetById.get(pid ?? '')?.moons?.find((m) => m.id === mid)
    return moon ? tl(moon.name) : ''
  }
  const body = bodyById.get(id)
  return body ? tl(body.name) : id
}
function onLabelClick(id: string): void {
  if (isMoonLabel(id)) {
    selectMoon(id.split('/')[1] ?? null)
    return
  }
  if (layout.value === 'orbit' || id === focusedId.value) inspect(id)
  else stage.value?.focus(id)
}
function speedLabel(v: number): string {
  return v === 0 ? t('systems.pause') : `×${num(v, 1)}`
}

function onKey(e: KeyboardEvent): void {
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea')) return
  // Enter and Space already activate a focused button or link: do not run the shortcut on top of it.
  const onControl = !!target?.closest('button, a')
  if (e.key === 'Escape' && moonId.value) selectMoon(null)
  else if (e.key === 'Escape' && inspectedId.value) inspect(null)
  else if (e.key === 'ArrowRight') moonId.value ? stepMoon(1) : step(1)
  else if (e.key === 'ArrowLeft') moonId.value ? stepMoon(-1) : step(-1)
  else if (e.key === 'Enter' && !onControl && !inspectedId.value && focusedId.value) inspect(focusedId.value)
  else if (e.key === ' ' && !onControl) {
    e.preventDefault()
    speed.value = speed.value === 0 ? 1 : 0
  }
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  // On phones, nine names on a small orrery overlap: start with only the focused one.
  if (!window.matchMedia(WIDE_QUERY).matches) showLabels.value = false
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

useSeoMeta({
  title: () => {
    if (inspectedMoon.value && inspected.value) return `${tl(inspectedMoon.value.name)} · ${tl(inspected.value.name)} · ${tl(system.name)}`
    return inspected.value ? `${tl(inspected.value.name)} · ${tl(system.name)}` : tl(system.name)
  },
  description: () => tl(system.summary),
})
</script>

<template>
  <div class="sys" :class="{ 'is-inspecting': !!inspected, 'hide-labels': !showLabels }">
    <div class="sys__scrim" aria-hidden="true" />

    <!-- Browse overlay -->
    <div class="browse">
      <div class="browse__head interactive">
        <NuxtLink :to="localePath('systems')" class="back mono">← {{ $t('nav.systems') }}</NuxtLink>
        <p class="eyebrow mono">
          {{ system.kind === 'real' ? $t('systems.kindReal') : $t('systems.kindGenerated') }}<template v-if="system.kind === 'real'"> · {{ system.distanceLy === 0 ? $t('systems.here') : $t('systems.ly', { d: num(system.distanceLy, 2) }) }}</template>
        </p>
        <h1 class="browse__title">{{ tl(system.name) }}</h1>
        <p class="browse__summary">{{ tl(system.summary) }}</p>
      </div>

      <section class="controls interactive" :aria-label="$t('systems.controls')">
        <div class="ctl">
          <span id="c-view" class="mono ctl__label">{{ $t('systems.layout') }}</span>
          <div class="seg" role="group" aria-labelledby="c-view">
            <button type="button" :aria-pressed="layout === 'orbit'" @click="layout = 'orbit'">{{ $t('systems.orbit') }}</button>
            <button type="button" :aria-pressed="layout === 'carousel'" @click="layout = 'carousel'">{{ $t('systems.carousel') }}</button>
          </div>
        </div>
        <div class="ctl">
          <span id="c-speed" class="mono ctl__label">{{ $t('systems.speed') }}</span>
          <div class="seg" role="group" aria-labelledby="c-speed">
            <button v-for="v in SPEEDS" :key="v" type="button" :aria-pressed="speed === v" @click="speed = v">{{ speedLabel(v) }}</button>
          </div>
        </div>
        <div class="ctl">
          <span id="c-show" class="mono ctl__label">{{ $t('systems.display') }}</span>
          <div class="seg" role="group" aria-labelledby="c-show">
            <button type="button" :aria-pressed="showOrbits" :disabled="layout !== 'orbit'" @click="showOrbits = !showOrbits">{{ $t('systems.orbitLines') }}</button>
            <button type="button" :aria-pressed="showLabels" @click="showLabels = !showLabels">{{ $t('systems.names') }}</button>
            <button v-if="hasMoons" type="button" :aria-pressed="showMoons" @click="showMoons = !showMoons">{{ $t('systems.moonsToggle') }}</button>
          </div>
        </div>
        <button type="button" class="btn mono" @click="stage?.recenter()">{{ $t('systems.recenter') }}</button>
      </section>

      <div v-if="focused" class="focus interactive" aria-live="polite">
        <p class="focus__top mono">
          <span>{{ ordinal(focused.id) }} / {{ String(planets.length).padStart(2, '0') }}</span>
          <span class="focus__kind">{{ tl(focused.kind) }}</span>
        </p>
        <h2 class="focus__name">{{ tl(focused.name) }}</h2>
        <div class="focus__act">
          <button type="button" class="action action--primary" @click="inspect(focused.id)">{{ $t('systems.inspect') }}</button>
          <span class="arrows mono">
            <button type="button" :aria-label="$t('systems.prevPlanet')" @click="step(-1)">←</button>
            <button type="button" :aria-label="$t('systems.nextPlanet')" @click="step(1)">→</button>
          </span>
        </div>
      </div>
      <p class="hint mono">{{ layout === 'orbit' ? $t('systems.hintOrbit') : $t('systems.hintCarousel') }}<br>{{ $t('systems.scaleNote') }}</p>
    </div>

    <!-- Labels pinned under the bodies -->
    <div class="labels" :class="`layout-${layout}`">
      <button
        v-for="l in labels"
        :key="l.id"
        type="button"
        class="label interactive"
        :class="{ 'is-hidden': !l.visible, 'is-focused': l.id === focusedId, 'is-star': l.id === STAR_ID, 'is-moon': isMoonLabel(l.id), 'is-selected': l.id === `${inspectedId}/${moonId}` }"
        :style="{ transform: `translate(${l.x}px, ${l.y + l.radius + 10}px) translateX(-50%)` }"
        tabindex="-1"
        @click="onLabelClick(l.id)"
      >
        <span class="label__name">{{ labelName(l.id) }}</span>
      </button>
    </div>

    <!-- Inspect panel -->
    <!-- Moon panel: replaces the planet panel while a moon is selected. -->
    <section v-if="inspected && inspectedMoon" :key="`${inspected.id}/${inspectedMoon.id}`" class="panel panel-fade interactive" :aria-label="tl(inspectedMoon.name)">
      <button type="button" class="back mono" @click="selectMoon(null)">← {{ tl(inspected.name) }}</button>
      <p class="eyebrow mono">{{ system.kind === 'generated' ? $t('systems.moonFictional', { planet: tl(inspected.name) }) : $t('systems.moonOf', { planet: tl(inspected.name) }) }}</p>
      <h2 class="panel__title">{{ tl(inspectedMoon.name) }}</h2>
      <p v-if="inspectedMoon.description" class="panel__desc">{{ tl(inspectedMoon.description) }}</p>
      <p class="panel__appearance mono">{{ $t(`systems.appearance.${inspectedMoon.texture ? 'texture' : 'procedural'}`) }}</p>
      <dl class="facts mono">
        <template v-for="row in moonRows(inspectedMoon)" :key="row.label">
          <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
        </template>
      </dl>
      <template v-if="system.sources.length">
        <h3 class="panel__sub mono">{{ $t('systems.sources') }}</h3>
        <ul class="sources">
          <li v-for="s in system.sources" :key="s.url">
            <a :href="s.url" target="_blank" rel="noopener">{{ s.label }} ↗<span class="sr-only"> {{ $t('a11y.newTab') }}</span></a>
          </li>
        </ul>
      </template>
      <nav v-if="(inspectedPlanet?.moons?.length ?? 0) > 1" class="panel__nav mono" :aria-label="$t('systems.moons')">
        <button type="button" @click="stepMoon(-1)">← {{ $t('systems.prevMoon') }}</button>
        <button type="button" @click="stepMoon(1)">{{ $t('systems.nextMoon') }} →</button>
      </nav>
    </section>

    <section v-else-if="inspected" :key="inspected.id" class="panel panel-fade interactive" :aria-label="tl(inspected.name)">
      <button type="button" class="back mono" @click="inspect(null)">← {{ tl(system.name) }}</button>
      <p class="eyebrow mono">{{ ordinal(inspected.id) }} · {{ tl(inspected.kind) }}</p>
      <h2 class="panel__title">{{ tl(inspected.name) }}</h2>

      <template v-if="inspectedPlanet">
        <p v-if="inspectedPlanet.description" class="panel__desc">{{ tl(inspectedPlanet.description) }}</p>
        <p class="panel__appearance mono">{{ $t(`systems.appearance.${inspectedPlanet.appearance}`) }}</p>
        <dl class="facts mono">
          <template v-for="row in planetRows(inspectedPlanet.facts)" :key="row.label">
            <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
          </template>
        </dl>
        <template v-if="inspectedPlanet.moons?.length">
          <h3 class="panel__sub mono">{{ $t('systems.moons') }}</h3>
          <p class="panel__appearance mono">{{ $t('systems.moonsLegend') }}</p>
          <dl class="facts facts--moons mono">
            <template v-for="m in inspectedPlanet.moons" :key="m.id">
              <dt><button type="button" class="moon-link" @click="selectMoon(m.id)">{{ moonRow(m).label }}</button></dt>
              <dd>{{ moonRow(m).value }}</dd>
            </template>
          </dl>
        </template>
        <h3 class="panel__sub mono">{{ $t('systems.star') }} · {{ tl(system.star.name) }}</h3>
      </template>
      <p v-else-if="system.star.description" class="panel__desc">{{ tl(system.star.description) }}</p>

      <dl class="facts mono">
        <template v-for="row in starRows(system.star)" :key="row.label">
          <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
        </template>
      </dl>
      <p v-if="!inspectedPlanet" class="panel__appearance mono">{{ $t('systems.starNote') }}</p>

      <template v-if="system.sources.length">
        <h3 class="panel__sub mono">{{ $t('systems.sources') }}</h3>
        <ul class="sources">
          <li v-for="s in system.sources" :key="s.url">
            <a :href="s.url" target="_blank" rel="noopener">{{ s.label }} ↗<span class="sr-only"> {{ $t('a11y.newTab') }}</span></a>
          </li>
        </ul>
      </template>

      <nav class="panel__nav mono" :aria-label="$t('systems.bodies')">
        <button type="button" @click="step(-1)">← {{ $t('systems.prev') }}</button>
        <button type="button" @click="step(1)">{{ $t('systems.next') }} →</button>
      </nav>
    </section>
    <p v-if="inspected" class="hint hint--inspect mono">
      {{ $t('systems.hintInspect') }}<template v-if="inspectedPlanet?.moons?.length && showMoons && !moonId"><br>{{ $t('systems.hintMoons') }}</template>
    </p>
  </div>
</template>

<style scoped>
.sys { position: fixed; inset: 0; }
.sys__scrim { position: absolute; inset: 0 auto 0 0; width: min(520px, 55vw);
  background: linear-gradient(90deg, rgb(4 6 10 / 0.7) 0%, rgb(4 6 10 / 0.35) 55%, rgb(4 6 10 / 0) 100%); }

.browse { position: absolute; inset: 0; }
.browse > * { transition: opacity 0.6s var(--ease-out); }
/* The simulation controls stay during inspection (pause, moons on/off matter most up close); the rest fades. */
.is-inspecting .browse > :not(.controls) { opacity: 0; }
.is-inspecting .browse > :not(.controls).interactive, .is-inspecting .labels .interactive { pointer-events: none; }
.browse__head { position: absolute; left: var(--gutter); top: 5.6rem; width: min(26rem, calc(100% - 2 * var(--gutter))); }
.back { display: inline-block; color: var(--muted); text-decoration: none; margin-bottom: 1.6rem; background: none; border: 0; padding: 0; cursor: pointer; }
.back:hover { color: var(--fg); }
.browse__title { margin: 0 0 0.6rem; font: 400 clamp(2.6rem, 5vw, 4.25rem)/1 var(--font-serif); }
.browse__summary { margin: 0; color: var(--fg-soft); line-height: 1.55; font-size: 0.95rem; }

/* Simulation controls: top-right column, under the site header. */
.controls { position: absolute; right: var(--gutter); top: 5.6rem; display: grid; gap: 0.9rem; justify-items: end; text-align: right; }
.ctl { display: grid; gap: 0.4rem; justify-items: end; }
.ctl__label { color: var(--faint); }
.seg button:disabled { opacity: 0.35; cursor: default; }
.btn { appearance: none; background: none; border: 0; padding: 0.25rem 0; color: var(--muted); cursor: pointer; }
.btn::before { content: "↺ "; color: var(--accent); }
.btn:hover { color: var(--fg); }

.focus { position: absolute; left: var(--gutter); bottom: 2rem; width: min(26rem, calc(100% - 2 * var(--gutter))); }
.focus__top { display: flex; gap: 1.2rem; color: var(--muted); margin: 0 0 0.5rem; }
.focus__kind { color: var(--accent); }
.focus__name { margin: 0 0 1rem; font: 400 clamp(2.2rem, 4vw, 3.25rem)/1 var(--font-serif); }
.focus__act { display: flex; gap: 1.6rem; align-items: baseline; }
.arrows button { background: none; border: 0; color: var(--muted); padding: 0.3rem 0.25rem; cursor: pointer; font: inherit; }
.arrows button:hover { color: var(--fg); }
.hint { position: absolute; right: var(--gutter); bottom: 2rem; margin: 0; color: var(--faint); text-align: right; line-height: 1.8; max-width: 26rem; }

.labels { position: absolute; inset: 0; pointer-events: none; }
.label { position: absolute; left: 0; top: 0; background: none; border: 0; padding: 0; cursor: pointer; color: var(--muted);
  font: 400 0.95rem var(--font-serif); white-space: nowrap; transition: opacity 0.4s, color 0.3s; will-change: transform; }
.label.is-focused { color: var(--fg); }
.label.is-star { color: var(--accent); }
.label.is-hidden, .is-inspecting .label:not(.is-moon), .hide-labels .label:not(.is-focused) { opacity: 0; pointer-events: none; }
/* Moon names: small and quiet, only shown around the inspected planet, and clickable there. */
.label.is-moon { font: 400 0.68rem var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.is-inspecting .labels .label.is-moon { pointer-events: auto; }
.label.is-moon:hover, .label.is-moon.is-selected { color: var(--accent); }
.is-inspecting .labels .label.is-moon.is-hidden { opacity: 0; pointer-events: none; }
/* "Names" off hides moon names too (the selected one stays as a marker); the canvas and the panel list still select. */
.is-inspecting.hide-labels .labels .label.is-moon:not(.is-selected) { opacity: 0; pointer-events: none; }
.moon-link { appearance: none; background: none; border: 0; padding: 0; font: inherit; color: inherit; letter-spacing: inherit;
  text-transform: inherit; cursor: pointer; border-bottom: 1px solid var(--line); }
.moon-link:hover, .moon-link:focus-visible { color: var(--accent); border-color: currentColor; }
.facts--moons dd { font-size: 0.7rem; }
/* The carousel's focus card already names the centred body. */
.layout-carousel .label.is-focused { opacity: 0; }

.panel { position: absolute; left: 0; top: 0; bottom: 0; width: min(44vw, 38rem); overflow-y: auto; padding: 6rem var(--gutter) 3rem;
  background: linear-gradient(90deg, rgb(4 6 10 / 0.94) 0%, rgb(4 6 10 / 0.9) 72%, rgb(4 6 10 / 0) 100%);
  animation: panel-in 0.9s var(--ease-out) 0.3s both; scrollbar-width: thin; }
@keyframes panel-in { from { opacity: 0; transform: translateX(-2rem); } to { opacity: 1; transform: none; } }
.panel__title { margin: 0 0 1rem; font: 400 clamp(2.75rem, 5vw, 4.25rem)/0.98 var(--font-serif); }
.panel__desc { margin: 0 0 0.9rem; color: var(--fg-soft); line-height: 1.65; max-width: 58ch; }
.panel__appearance { margin: 0 0 1.6rem; color: var(--faint); text-transform: none; letter-spacing: 0.02em; }
.panel__sub { margin: 2.4rem 0 0.6rem; font-weight: 400; color: var(--fg); }
.facts { display: grid; grid-template-columns: auto 1fr; margin: 0 0 1rem; }
.facts dt, .facts dd { margin: 0; padding: 0.55rem 0; border-top: 1px solid var(--line); }
.facts dt { color: var(--faint); padding-right: 1.5rem; }
.facts dd { text-align: right; text-transform: none; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.sources { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; font-size: 0.875rem; }
.sources a { color: var(--muted); text-decoration: none; border-bottom: 1px solid var(--line); }
.sources a:hover { color: var(--fg); }
.panel__nav { display: flex; justify-content: space-between; margin-top: 3rem; padding-top: 1.2rem; border-top: 1px solid var(--line); }
.panel__nav button { background: none; border: 0; padding: 0; color: var(--muted); cursor: pointer; font: inherit; }
.panel__nav button:hover { color: var(--fg); }
.hint--inspect { animation: panel-in 0.6s var(--ease-out) 0.9s both; }

@media (prefers-reduced-motion: reduce) { .panel, .hint--inspect { animation: none; } }
@media (max-width: 899px) {
  .sys__scrim { width: 100%; background: linear-gradient(0deg, rgb(4 6 10 / 0.9) 0%, rgb(4 6 10 / 0) 45%); }
  .browse__head { top: 4.6rem; }
  .browse__summary, .hint { display: none; }
  /* Phones: controls become one compact row above the focus card. */
  .controls { top: auto; bottom: 10.5rem; left: var(--gutter); right: 0; justify-items: start; text-align: left;
    grid-auto-flow: column; grid-auto-columns: max-content; align-items: end; overflow-x: auto; gap: 1.6rem;
    padding-right: var(--gutter); scrollbar-width: none; }
  .ctl { justify-items: start; }
  .controls .seg { flex-wrap: nowrap; }
  /* Phones: the fact panel takes the bottom half, where the controls sit. */
  .is-inspecting .browse > .controls { opacity: 0; pointer-events: none; }
  .panel { top: auto; width: 100%; height: 58svh; padding: 1.5rem var(--gutter) 2.5rem;
    background: linear-gradient(0deg, rgb(4 6 10 / 0.97) 88%, rgb(4 6 10 / 0) 100%); }
}
</style>
