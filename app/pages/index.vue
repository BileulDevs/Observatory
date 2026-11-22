<script setup lang="ts">
/**
 * Home: one procedural world, centred, named after its seed and described from what its bake actually contains.
 * Identity and description sit in a band along the bottom; the controls live in a tool strip on the right, each
 * tool opening its panel beside the strip, so the planet keeps the screen. All rendering lives in
 * ObservatoryStage; this page is the interface around it. Rendering figures (resolution, memory, generation,
 * frame rate) are for development: they open with `?debug` in the URL or Shift+D.
 */
import { ART_STYLES, PLANET_TYPES, STYLE_PARAMS, type ArtStyle, type PlanetType } from '~/engine/presets'
import type { SurfaceFacts } from '~/engine/bodies/surfaceFacts'
import type { ObservatoryStage as ObservatoryStageType } from '~/engine/stages/ObservatoryStage'
import { worldName } from '~/utils/worldName'

/**
 * Planet placement, as viewport fractions (see Engine.setViewShift), per layout. roomy and medium: the tool strip
 * takes the right edge, so the planet sits a little left of centre and above the bottom band; narrow (phones):
 * planet above the bottom sheet.
 */
const SHIFT = {
  roomy: { x: -0.04, y: -0.07 },
  // Far enough left that an open tool panel (no background) never sits over the planet at 1024 px.
  medium: { x: -0.1, y: -0.08 },
  narrow: { x: 0, y: -0.2 },
} as const
/** Width from which the controls fit as a column beside the planet (same value as the CSS below). */
const ROOMY_QUERY = '(min-width: 1180px)'
/** Bake sizes offered by the quality tool. Memory grows with the square (see the debug readout). */
const QUALITY_OPTIONS = [512, 1024, 2048] as const
/** Seed shown on first visit: a world that reads well (continents and oceans both visible). */
const DEFAULT_SEED = 2718
/** Largest seed drawn by "New world". Seeds stay short enough to read aloud and type. */
const MAX_SEED = 9999
/** How often the debug readout polls render stats, ms. */
const STATS_INTERVAL = 500
/** Clouds are baked at half the surface size (see Planet.ts), RGBA8 vs RGBA16F, both with mipmaps (×4/3). */
const BYTES_PER_TEXEL_SURFACE = 8
const BYTES_PER_TEXEL_CLOUDS = 4
/** Key that toggles the debug panel, with Shift (a bare letter would fire while typing a seed in the future). */
const DEBUG_KEY = 'D'
/** Tools that open a panel, in strip order. Recenter and pause act at once and have no panel. */
const PANEL_TOOLS = ['class', 'style', 'sun', 'relief', 'quality'] as const
type PanelTool = (typeof PANEL_TOOLS)[number]

const { t } = useI18n()
const { num } = useLocalized()
const { engine } = useSpace()
const route = useRoute()
const router = useRouter()

const style = ref<ArtStyle>('natural')
const type = ref<PlanetType>('ocean')
const seed = ref(DEFAULT_SEED)
const relief = ref(1)
const sunAz = ref(STYLE_PARAMS.natural.sunAz)
const spin = ref(true)
const quality = ref<number>(1024)
const progress = ref<{ done: number; total: number } | null>(null)
const stats = ref<{ fps: number; idle: boolean } | null>(null)
const facts = ref<SurfaceFacts | null>(null)
const debugByKey = ref(false)
/** Tool whose panel is open, or null (closed on arrival: the planet comes first). */
const openTool = ref<PanelTool | null>(null)

const debug = computed(() => debugByKey.value || route.query.debug !== undefined)
/** "How it's made" sheet: open while `?how` is in the URL, so it can be linked and the Back button closes it. */
const howOpen = computed(() => route.query.how !== undefined)
const howLink = computed(() => ({ query: { ...route.query, how: null } }))
const name = computed(() => worldName(seed.value))

const wide = useWideLayout()
const roomy = useWideLayout(ROOMY_QUERY)
const shift = computed(() => (roomy.value ? SHIFT.roomy : wide.value ? SHIFT.medium : SHIFT.narrow))

const stage = useStage(async (eng) => {
  quality.value = Math.min(eng.quality.bakeRes, 2048)
  eng.setViewShift(shift.value)
  const { ObservatoryStage } = await import('~/engine/stages/ObservatoryStage')
  const s: ObservatoryStageType = new ObservatoryStage({ type: type.value, seed: seed.value }, style.value, {
    onProgress: (p) => { progress.value = p },
    onFacts: (f) => { facts.value = f },
  })
  return s
})

/** Whole percent, never shown as 0 when there is some: "under 1 %" would be fussier than it is worth. */
function pct(share: number | undefined): string {
  const v = Math.round((share ?? 0) * 100)
  return num(share && v === 0 ? 1 : v, 0)
}

/** What this world looks like, from its measured bake; empty until the measurement lands (a frame or two). */
const factsLine = computed(() => {
  const f = facts.value
  if (!f || f.type !== type.value) return ''
  if (f.type === 'ocean') return t('observatory.facts.ocean', { ocean: pct(f.ocean), ice: pct(f.ice), cloud: pct(f.cloud) })
  if (f.type === 'arid') return t('observatory.facts.arid', { cratered: pct(f.cratered), ice: pct(f.ice) })
  if (f.type === 'gas') return t('observatory.facts.gas', { storm: pct(f.storm) })
  return t('observatory.facts.ice', { ridged: pct(f.ridged) })
})

watch(shift, (s) => stage.value?.setShift(s))
watch(style, (v) => {
  sunAz.value = STYLE_PARAMS[v].sunAz
  stage.value?.setStyle(v)
  stage.value?.setSunAzimuth(null)
})
watch([type, seed], () => {
  // The old facts describe the previous world: clear them rather than show them under the new name.
  facts.value = null
  stage.value?.setPlanet({ type: type.value, seed: seed.value })
})
watch(sunAz, (v) => stage.value?.setSunAzimuth(v))
watch(relief, (v) => stage.value?.setRelief(v))
watch(spin, (v) => stage.value?.setSpin(v))
watch(quality, (v) => stage.value?.setResolution(v))

function reseed(): void {
  seed.value = Math.floor(Math.random() * MAX_SEED)
}

/**
 * Closes the sheet. When it was opened from this page, going back pops the `?how` entry so Back does not reopen
 * it; on arrival from a shared `/?how` link there is nothing to go back to, so the query is just removed.
 */
function closeHow(): void {
  const back = (window.history.state as { back?: string } | null)?.back
  if (back && router.resolve(back).path === route.path && router.resolve(back).query.how === undefined) {
    router.back()
    return
  }
  const query = { ...route.query }
  delete query.how
  router.replace({ query })
}

// The sheet covers the planet: stop drawing it meanwhile (GPU and battery), and give it back on close.
watch(howOpen, (open) => engine.value?.setActive(!open))
watch(engine, (eng) => { if (eng && howOpen.value) eng.setActive(false) })

/** Opens a tool's panel, or closes it when it is already open (the strip buttons are toggles). */
function toggleTool(tool: PanelTool): void {
  openTool.value = openTool.value === tool ? null : tool
}

/** Icon name per panel tool (the icon component's names). */
const TOOL_ICON = { class: 'class', style: 'style', sun: 'sun', relief: 'relief', quality: 'quality' } as const

const memory = computed(() => {
  const res = quality.value
  const cloud = type.value === 'ocean' ? Math.max(256, res / 2) : 0
  const bytes = (res * res * 6 * BYTES_PER_TEXEL_SURFACE + cloud * cloud * 6 * BYTES_PER_TEXEL_CLOUDS) * (4 / 3)
  return Math.round(bytes / 1048576)
})

function onKey(e: KeyboardEvent): void {
  // The sheet handles its own keys; Escape there must not also close a tool panel behind it.
  if (howOpen.value) return
  if (e.key === 'Escape' && openTool.value) {
    openTool.value = null
    return
  }
  if (!e.shiftKey || e.key.toUpperCase() !== DEBUG_KEY || e.ctrlKey || e.metaKey || e.altKey) return
  const el = e.target as HTMLElement | null
  // Never steal a capital D typed into a field.
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
  debugByKey.value = !debugByKey.value
}

let timer: ReturnType<typeof setInterval> | undefined
watch(debug, (on) => {
  clearInterval(timer)
  // Polling only while the readout is shown: it is the only reader of these figures.
  if (on && import.meta.client) timer = setInterval(() => { stats.value = engine.value?.renderStats ?? null }, STATS_INTERVAL)
}, { immediate: true })
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  // Leaving the page with the sheet open (a link inside it): the next page's 3D must run.
  if (howOpen.value) engine.value?.setActive(true)
  clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})

usePageMeta({
  title: () => t('observatory.title'),
  description: () => t('observatory.description'),
})
</script>

<template>
  <div class="obs">
    <div class="ui" :inert="howOpen || undefined">
      <section class="band interactive" aria-live="polite" :aria-label="$t('observatory.worldLabel')">
        <div class="band__id">
          <p class="band__kind">{{ $t('observatory.kindLine', { kind: $t(`observatory.kinds.${type}`), seed }) }}</p>
          <h1 class="band__name">{{ name }}</h1>
        </div>
        <div class="band__about">
          <p v-if="factsLine" class="band__facts">{{ factsLine }}</p>
          <p class="band__class">{{ $t(`observatory.about.${type}`) }}</p>
          <NuxtLink :to="howLink" class="band__link">{{ $t('observatory.howLink') }}</NuxtLink>
        </div>
        <button type="button" class="new-world" @click="reseed"><ToolIcon name="dice" />{{ $t('observatory.reseed') }}</button>
      </section>

      <div class="tools interactive">
        <nav class="strip" :aria-label="$t('observatory.tools.label')">
          <button
            v-for="tool in PANEL_TOOLS"
            :key="tool"
            type="button"
            class="strip__btn"
            :aria-expanded="openTool === tool"
            aria-controls="tool-panel"
            @click="toggleTool(tool)"
          >
            <ToolIcon :name="TOOL_ICON[tool]" />
            <span>{{ $t(`observatory.tools.${tool}`) }}</span>
          </button>
          <span class="strip__rule" aria-hidden="true" />
          <button type="button" class="strip__btn" @click="stage?.recenter()">
            <ToolIcon name="recenter" />
            <span>{{ $t('observatory.tools.recenter') }}</span>
          </button>
          <button type="button" class="strip__btn" @click="spin = !spin">
            <ToolIcon :name="spin ? 'pause' : 'play'" />
            <span>{{ spin ? $t('observatory.tools.pause') : $t('observatory.tools.play') }}</span>
          </button>
        </nav>

        <section v-if="openTool" id="tool-panel" class="panel" :aria-label="$t(`observatory.tools.${openTool}`)">
          <h2 class="panel__title">{{ $t(`observatory.panels.${openTool}`) }}</h2>
          <template v-if="openTool === 'class'">
            <div class="tiles" role="group" :aria-label="$t('observatory.panels.class')">
              <button v-for="(p, i) in PLANET_TYPES" :key="p" type="button" class="tile" :aria-pressed="type === p" @click="type = p">
                <span class="tile__n mono">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="tile__name">{{ $t(`planetTypes.${p}.short`) }}</span>
              </button>
            </div>
            <p class="panel__note">{{ $t('observatory.panels.classNote') }}</p>
          </template>
          <div v-else-if="openTool === 'style'" class="choices" role="group" :aria-label="$t('observatory.panels.style')">
            <button v-for="st in ART_STYLES" :key="st" type="button" class="choice" :aria-pressed="style === st" @click="style = st">{{ $t(`styles.${st}`) }}</button>
          </div>
          <div v-else-if="openTool === 'quality'" class="choices" role="group" :aria-label="$t('observatory.panels.quality')">
            <button v-for="q in QUALITY_OPTIONS" :key="q" type="button" class="choice" :aria-pressed="quality === q" @click="quality = q">{{ $t(`observatory.q${q}`) }}</button>
          </div>
          <div v-else-if="openTool === 'sun'" class="slider">
            <label for="sun" class="field-label">{{ $t('observatory.light') }}</label>
            <input id="sun" v-model.number="sunAz" type="range" min="0" max="180" step="1">
            <span class="slider__value mono">{{ num(sunAz, 0) }}°</span>
          </div>
          <div v-else class="slider">
            <label for="relief" class="field-label">{{ $t('observatory.relief') }}</label>
            <input id="relief" v-model.number="relief" type="range" min="0" max="3" step="0.05">
            <span class="slider__value mono">× {{ num(relief, 2) }}</span>
          </div>
        </section>
      </div>

      <p class="hint">{{ $t('observatory.hint') }}</p>
    </div>

    <Transition name="sheet">
      <HowSheet v-if="howOpen" @close="closeHow" />
    </Transition>

    <section v-if="debug" class="debug interactive" aria-label="Debug">
      <dl class="readout mono">
        <dt>{{ $t('observatory.resolution') }}</dt><dd>6 × {{ quality }}²</dd>
        <dt>{{ $t('observatory.memory') }}</dt><dd>≈ {{ num(memory) }} Mo</dd>
        <dt>{{ $t('observatory.bake') }}</dt>
        <dd>{{ progress ? $t('observatory.baking', { done: progress.done, total: progress.total }) : $t('observatory.baked') }}</dd>
        <dt>{{ $t('observatory.render') }}</dt>
        <dd>{{ !stats ? '—' : stats.idle ? $t('observatory.idle') : `${stats.fps} ${$t('observatory.fps')}` }}</dd>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.obs { position: fixed; inset: 0; }
/* Layout layer: passes pointer events through to the canvas; only its panels take them (.interactive). */
.ui { position: absolute; inset: 0; pointer-events: none; }

/* Bottom band. Its right edge stops short of the tool strip so the two never overlap. */
.band { position: absolute; left: var(--gutter); right: calc(var(--gutter) + 6.5rem); bottom: 2rem; display: grid; grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto; align-items: end; gap: 1.5rem 2.5rem; padding-top: 1.25rem; border-top: 1px solid var(--line); }
.band__kind { margin: 0 0 0.35rem; font-weight: 500; color: var(--accent-2); }
.band__name { margin: 0; font: 800 clamp(4rem, 8.5vw, 8.5rem)/0.82 var(--font-display); letter-spacing: 0.005em; text-transform: uppercase; }
.band__about { display: grid; gap: 0.5rem; padding-bottom: 0.4rem; }
/*
 * Two lines at most: 34rem holds the longest sentence (French, ocean class, ~100 characters) on two lines at this
 * size; `balance` splits it into two even lines instead of a long one and a stub.
 */
.band__facts { margin: 0; max-width: 34rem; font-size: 1.0625rem; line-height: 1.45; color: var(--fg); text-wrap: balance; }
.band__class { margin: 0; max-width: 34rem; line-height: 1.5; color: var(--muted); }
.band__link { justify-self: start; color: var(--accent-2); text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; }
.band__link:hover { color: var(--fg); }
/* Fixed width: the label changes length with the language, the button must not. */
.new-world { display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem; width: 12.5rem; min-height: 48px; margin-bottom: 0.4rem; padding: 0 1rem; border: 0; border-radius: 2px; background: var(--accent); color: var(--bg); font: 600 0.9375rem/1 var(--font-sans); cursor: pointer; white-space: nowrap; }
.new-world:hover { background: #ff8559; }

/* Tool strip on the right edge, vertically centred; the open tool's panel sits to its left. */
.tools { position: absolute; right: var(--gutter); top: 50%; transform: translateY(-50%); display: flex; flex-direction: row-reverse; align-items: flex-start; gap: 0.75rem; }
/*
 * No background or frame: the strip floats on the black of space. The open tool is told by colour, not by a fill.
 * A soft dark halo (drop-shadow, on icon and label alike) keeps them readable when a bright planet or ring passes under.
 */
.strip { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.375rem 0; }
.strip__btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; width: 4rem; min-height: 3.75rem; padding: 0.25rem; border: 0; border-radius: 2px; background: transparent; color: var(--muted); font: 500 0.75rem/1.1 var(--font-sans); cursor: pointer; text-align: center; filter: drop-shadow(0 0 4px rgb(0 0 0 / 0.8)); }
.strip__btn:hover { color: var(--fg); }
.strip__btn[aria-expanded='true'] { color: var(--accent); }
.strip__rule { height: 1px; margin: 0.25rem 0.375rem; background: var(--line); }

/*
 * Like the strip, no background or frame: the panel's content floats on space. The planet is placed so the two do
 * not overlap (see SHIFT); the drop-shadow (on text, borders and icons alike) is a safety for a gas giant's rings.
 */
.panel { width: 16.5rem; box-sizing: border-box; padding: 0.375rem 0.25rem 0.375rem 0; display: grid; gap: 0.75rem; filter: drop-shadow(0 0 6px rgb(0 0 0 / 0.85)); }
.panel__title { margin: 0; font: 700 1.5rem/1 var(--font-display); text-transform: uppercase; letter-spacing: 0.01em; }
.panel__note { margin: 0; font-size: 0.875rem; line-height: 1.45; color: var(--muted); }
.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem; }
.tile { appearance: none; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; gap: 0.5rem; min-height: 4.25rem; padding: 0.55rem 0.7rem; border: 1px solid var(--line); border-radius: 2px; background: transparent; color: var(--muted); font: 500 0.9375rem/1.2 var(--font-sans); text-align: left; cursor: pointer; }
.tile:hover { color: var(--fg); border-color: rgb(241 241 236 / 0.35); }
.tile[aria-pressed='true'] { color: var(--fg); border-color: var(--accent); }
.tile__n { color: var(--faint); }
.tile[aria-pressed='true'] .tile__n { color: var(--accent); }
.choices { display: grid; gap: 0.25rem; }
.choice { display: flex; align-items: center; min-height: 44px; padding: 0 0.75rem; border: 1px solid transparent; border-radius: 2px; background: transparent; color: var(--muted); font: 500 0.9375rem/1 var(--font-sans); text-align: left; cursor: pointer; }
.choice:hover { color: var(--fg); border-color: var(--line); }
.choice[aria-pressed='true'] { color: var(--fg); border-color: var(--accent); }
.slider { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0.5rem 0.75rem; }
.slider .field-label { grid-column: 1 / -1; }
.slider__value { color: var(--fg); font-variant-numeric: tabular-nums; min-width: 3.5rem; text-align: right; }

.hint { position: absolute; right: var(--gutter); bottom: 2rem; margin: 0; max-width: 6rem; font-size: 0.75rem; line-height: 1.35; color: var(--faint); text-align: right; }

/* The sheet rises from the bottom edge and goes back down; no movement under reduced motion. */
.sheet-enter-active, .sheet-leave-active { transition: transform 0.4s var(--ease-out); }
.sheet-enter-from, .sheet-leave-to { transform: translateY(100%); }
@media (prefers-reduced-motion: reduce) { .sheet-enter-active, .sheet-leave-active { transition: none; } }

.debug { position: absolute; left: var(--gutter); top: 5.5rem; padding: 0.8rem 1rem; border: 1px solid var(--line); background: rgb(10 12 16 / 0.85); }
.readout { display: grid; grid-template-columns: auto auto; gap: 0.2rem 1.2rem; margin: 0; font-variant-numeric: tabular-nums; }
.readout dt { color: var(--faint); }
.readout dd { margin: 0; color: var(--fg); }

/*
 * Medium width: three columns no longer fit beside the strip. The button moves under the facts, in their column,
 * and the class sentence (the same for every seed) gives way, so the band stays as low as on wide screens.
 */
@media (max-width: 1179px) and (min-width: 900px) {
  .band__name { font-size: clamp(3.5rem, 8vw, 6rem); }
  .band { grid-template-columns: minmax(0, auto) minmax(0, 1fr); }
  .band__class { display: none; }
  .new-world { grid-column: 2; justify-self: start; }
}

/*
 * Phones: the planet above, everything else in one sheet along the bottom that scrolls on its own; the strip
 * becomes a row and the open panel follows it in the flow.
 * The sheet's background is not fully opaque on purpose (97 %): Chromium skips redrawing the parts of a WebGL
 * canvas it believes are hidden by an opaque layer, and with an opaque sheet over the canvas only a band of the
 * planet was redrawn (reproduced in headless Chrome).
 */
@media (max-width: 899px) {
  .ui { top: auto; max-height: 55vh; overflow-y: auto; pointer-events: auto; padding: 1rem var(--gutter) 1.5rem; background: rgb(10 12 16 / 0.97); border-top: 1px solid var(--line); display: grid; gap: 1.25rem; }
  .band, .tools { position: static; transform: none; }
  .band { grid-template-columns: 1fr; padding-top: 0; border-top: 0; gap: 1rem; }
  .band__name { font-size: 3.5rem; }
  .tools { flex-direction: column; align-items: stretch; }
  /* Seven buttons do not fit one row on a phone: two rows of four, every tool visible without scrolling. */
  .strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .strip__btn { width: auto; }
  .strip__rule { display: none; }
  .panel { width: auto; }
  .hint { display: none; }
  .debug { top: 4.5rem; }
}
</style>
