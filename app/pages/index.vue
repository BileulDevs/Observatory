<script setup lang="ts">
/**
 * Home (the planet observatory): one procedural planet with every art-direction control (prototype 01, productised).
 * The page is a thin UI layer; all rendering lives in ObservatoryStage.
 */
import { ART_STYLES, PLANET_TYPES, STYLE_PARAMS, type ArtStyle, type PlanetType } from '~/engine/presets'
import type { ObservatoryStage as ObservatoryStageType } from '~/engine/stages/ObservatoryStage'

/** Planet placement, as viewport fractions: right of the text column on desktop, above the controls on phones. */
const WIDE_SHIFT = { x: 0.12, y: -0.03 }
const NARROW_SHIFT = { x: 0, y: -0.2 }
/** Bake sizes offered in the quality switch. Memory grows with the square (see readout). */
const QUALITY_OPTIONS = [512, 1024, 2048] as const
/** Seed shown on first visit: a planet that reads well (continents and oceans both visible). */
const DEFAULT_SEED = 2718
/** Marker position on the surface, degrees. */
const MARKER_LAT = 18
const MARKER_LON = 34
/** Below this facing value the marker is hidden: it would sit on the limb or behind the planet. */
const MARKER_MIN_FACING = 0.25
/** How often the readout polls render stats, ms. */
const STATS_INTERVAL = 500
/** Clouds are baked at half the surface size (see Planet.ts), RGBA8 vs RGBA16F, both with mipmaps (×4/3). */
const BYTES_PER_TEXEL_SURFACE = 8
const BYTES_PER_TEXEL_CLOUDS = 4

const { t } = useI18n()
const { num } = useLocalized()
const { engine } = useSpace()

const style = ref<ArtStyle>('natural')
const type = ref<PlanetType>('ocean')
const seed = ref(DEFAULT_SEED)
const relief = ref(1)
const sunAz = ref(STYLE_PARAMS.natural.sunAz)
const spin = ref(true)
const quality = ref<number>(1024)
const progress = ref<{ done: number; total: number } | null>(null)
const stats = ref<{ fps: number; idle: boolean } | null>(null)
const marker = ref<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })

const stage = useStage(async (eng) => {
  quality.value = Math.min(eng.quality.bakeRes, 2048)
  eng.setViewShift(window.matchMedia('(min-width: 900px)').matches ? WIDE_SHIFT : NARROW_SHIFT)
  const { ObservatoryStage } = await import('~/engine/stages/ObservatoryStage')
  const s: ObservatoryStageType = new ObservatoryStage({ type: type.value, seed: seed.value }, style.value, {
    onProgress: (p) => { progress.value = p },
    onFrame: placeMarker,
  })
  return s
})

const wide = useWideLayout()
watch(wide, (w) => stage.value?.setShift(w ? WIDE_SHIFT : NARROW_SHIFT))

function placeMarker(): void {
  const p = stage.value?.project(MARKER_LAT, MARKER_LON)
  if (p) marker.value = { x: p.x, y: p.y, visible: p.facing > MARKER_MIN_FACING }
}

watch(style, (v) => {
  sunAz.value = STYLE_PARAMS[v].sunAz
  stage.value?.setStyle(v)
  stage.value?.setSunAzimuth(null)
})
watch([type, seed], () => stage.value?.setPlanet({ type: type.value, seed: seed.value }))
watch(sunAz, (v) => stage.value?.setSunAzimuth(v))
watch(relief, (v) => stage.value?.setRelief(v))
watch(spin, (v) => stage.value?.setSpin(v))
watch(quality, (v) => stage.value?.setResolution(v))

function reseed(): void {
  seed.value = Math.floor(Math.random() * 9999)
}

const memory = computed(() => {
  const res = quality.value
  const cloud = type.value === 'ocean' ? Math.max(256, res / 2) : 0
  const bytes = (res * res * 6 * BYTES_PER_TEXEL_SURFACE + cloud * cloud * 6 * BYTES_PER_TEXEL_CLOUDS) * (4 / 3)
  return Math.round(bytes / 1048576)
})
const designation = computed(() => `OBJ-${type.value.slice(0, 2).toUpperCase()}-${String(seed.value).padStart(4, '0')}`)

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => { stats.value = engine.value?.renderStats ?? null }, STATS_INTERVAL)
})
onBeforeUnmount(() => clearInterval(timer))

useSeoMeta({
  title: () => t('observatory.title'),
  description: () => t('observatory.description'),
})
</script>

<template>
  <div class="obs" :class="`style-${style}`">
    <div class="obs__scrim" aria-hidden="true" />

    <aside class="sheet" aria-live="polite">
      <p class="eyebrow mono">{{ $t('observatory.eyebrow') }}</p>
      <h1 class="sheet__title">{{ $t(`planetTypes.${type}.a`) }} <em>{{ $t(`planetTypes.${type}.b`) }}</em></h1>
      <p class="sheet__desig mono">{{ designation }} · {{ $t('observatory.seed') }} {{ seed }}</p>
      <dl class="readout mono">
        <dt>{{ $t('observatory.resolution') }}</dt><dd>6 × {{ quality }}²</dd>
        <dt>{{ $t('observatory.memory') }}</dt><dd>≈ {{ num(memory) }} Mo</dd>
        <dt>{{ $t('observatory.bake') }}</dt>
        <dd>{{ progress ? $t('observatory.baking', { done: progress.done, total: progress.total }) : $t('observatory.baked') }}</dd>
        <dt>{{ $t('observatory.render') }}</dt>
        <dd>{{ !stats ? '—' : stats.idle ? $t('observatory.idle') : `${stats.fps} ${$t('observatory.fps')}` }}</dd>
      </dl>
      <p class="sheet__note">{{ $t('observatory.note') }}</p>
    </aside>

    <section class="controls interactive" :aria-label="$t('observatory.controls')">
      <div class="group">
        <span id="l-style" class="mono label">{{ $t('observatory.style') }}</span>
        <div class="seg" role="group" aria-labelledby="l-style">
          <button v-for="s in ART_STYLES" :key="s" type="button" :aria-pressed="style === s" @click="style = s">{{ $t(`styles.${s}`) }}</button>
        </div>
      </div>
      <div class="group">
        <span id="l-type" class="mono label">{{ $t('observatory.class') }}</span>
        <div class="seg" role="group" aria-labelledby="l-type">
          <button v-for="p in PLANET_TYPES" :key="p" type="button" :aria-pressed="type === p" @click="type = p">{{ $t(`planetTypes.${p}.short`) }}</button>
        </div>
      </div>
      <div class="group">
        <label for="sun" class="mono label">{{ $t('observatory.light') }}</label>
        <input id="sun" v-model.number="sunAz" type="range" min="0" max="180" step="1">
      </div>
      <div class="group">
        <label for="relief" class="mono label">{{ $t('observatory.relief') }}</label>
        <input id="relief" v-model.number="relief" type="range" min="0" max="3" step="0.05">
      </div>
      <div class="group">
        <span id="l-q" class="mono label">{{ $t('observatory.quality') }}</span>
        <div class="seg" role="group" aria-labelledby="l-q">
          <button v-for="q in QUALITY_OPTIONS" :key="q" type="button" :aria-pressed="quality === q" @click="quality = q">{{ $t(`observatory.q${q}`) }}</button>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn mono" @click="reseed">{{ $t('observatory.reseed') }}</button>
        <button type="button" class="btn mono" :aria-pressed="spin" @click="spin = !spin">{{ spin ? $t('observatory.spin') : $t('observatory.spinStopped') }}</button>
      </div>
    </section>

    <TargetMarker
      class="marker"
      :class="{ 'is-visible': marker.visible }"
      :x="marker.x"
      :y="marker.y"
      :code="$t('observatory.marker')"
      :readout="`${num(MARKER_LAT, 1)}° N · ${num(MARKER_LON, 1)}° E`"
    />

    <p class="hint mono">{{ $t('observatory.hint') }}</p>
  </div>
</template>

<style scoped>
.obs { position: fixed; inset: 0; }
/* Legibility scrim behind the text column only, so the planet stays untouched. */
.obs__scrim { position: absolute; inset: 0 auto 0 0; width: min(560px, 60vw);
  background: linear-gradient(90deg, rgb(4 6 10 / 0.78) 0%, rgb(4 6 10 / 0.45) 55%, rgb(4 6 10 / 0) 100%); }

.sheet { position: absolute; left: var(--gutter); top: 6.5rem; bottom: 9.5rem; width: 21rem; display: flex; flex-direction: column; justify-content: center; }
.sheet__title { font-family: var(--font-serif); font-weight: 400; font-size: clamp(3rem, 5vw, 4rem); line-height: 0.95; margin: 0 0 0.6rem; }
.sheet__title em { color: var(--muted); }
.sheet__desig { color: var(--muted); margin: 0 0 1.75rem; }
.readout { display: grid; grid-template-columns: auto 1fr; margin: 0 0 1.6rem; }
.readout dt, .readout dd { margin: 0; padding: 0.55rem 0; border-top: 1px solid var(--line); }
.readout dt { color: var(--faint); padding-right: 1.5rem; }
.readout dd { text-align: right; font-variant-numeric: tabular-nums; }
.sheet__note { font-size: 0.875rem; line-height: 1.6; color: var(--muted); margin: 0; max-width: 32ch; }

/* Instrument bar: one hairline row along the bottom, so the planet keeps the right side. */
.controls { position: absolute; left: var(--gutter); right: var(--gutter); bottom: 1.75rem; display: flex; flex-wrap: wrap; align-items: flex-end;
  gap: 0.875rem 2.1rem; padding-top: 1rem; border-top: 1px solid var(--line); }
.group { display: grid; gap: 0.5rem; }
.group input[type=range] { width: 8rem; }
.label { color: var(--faint); }
.actions { display: flex; gap: 1.4rem; margin-left: auto; padding-bottom: 0.25rem; }
.btn { appearance: none; background: none; border: 0; padding: 0.25rem 0; color: var(--muted); cursor: pointer; }
.btn::before { content: "→ "; color: var(--accent); }
.btn:hover { color: var(--fg); }

.hint { position: absolute; right: var(--gutter); top: 4.9rem; margin: 0; color: var(--faint); }

.marker { opacity: 0; transition: opacity 0.35s; }
.marker.is-visible { opacity: 1; }
.style-natural .marker { color: var(--fg); }
.style-nocturne { --accent: #8fb3d9; }

@media (max-height: 820px) and (min-width: 901px) { .sheet__note { display: none; } }
@media (max-width: 900px) {
  .obs__scrim { width: 100%; background: linear-gradient(0deg, rgb(4 6 10 / 0.95) 0%, rgb(4 6 10 / 0.6) 45%, rgb(4 6 10 / 0) 70%); }
  .sheet { top: auto; bottom: 19.5rem; width: auto; right: var(--gutter); display: block; }
  .sheet__title { font-size: 2.5rem; }
  .readout, .sheet__note { display: none; }
  .sheet__desig { margin-bottom: 0; }
  .controls { gap: 0.75rem 1.4rem; }
  .actions { margin-left: 0; }
  .hint { display: none; }
  .marker :deep(.target__lead), .marker :deep(.target__readout) { display: none; }
}
</style>
