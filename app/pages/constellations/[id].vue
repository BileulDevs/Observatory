<script setup lang="ts">
/**
 * One constellation: its figure as seen from Earth, then, at the press of a button, the flight out to the side
 * that shows how far apart its stars really are. Stars are clickable, with their fact sheet in the panel.
 */
import { CONSTELLATIONS } from '~/data/constellations.generated'
import type { ConstellationStage as ConstellationStageType, ConstellationView } from '~/engine/stages/ConstellationStage'
import type { ConstellationData, ConstellationStar } from '~/types/constellations'
import type { ObjectFact } from '~/types/objects'

/** Subject placement, as on the object pages. */
const WIDE_QUERY = '(min-width: 900px)'
const SHIFT = { wide: { x: 0.2, y: 0 }, narrow: { x: 0, y: -0.24 } }

const route = useRoute()
const { t } = useI18n()
const { tl, num } = useLocalized()
const localePath = useLocalePath()
const { rows } = useObjectFacts()

const summary = CONSTELLATIONS.find((c) => c.id === String(route.params.id))
if (!summary) throw createError({ statusCode: 404, statusMessage: t('constellations.notFound'), fatal: true })

const data = shallowRef<ConstellationData | null>(null)
const view = ref<ConstellationView>('sky')
const selected = ref<number | null>(null)
const hover = ref<{ hip: number; x: number; y: number } | null>(null)

const starOf = (hip: number | null): ConstellationStar | null => (hip === null ? null : data.value?.stars.find((s) => s.hip === hip) ?? null)
const selectedStar = computed(() => starOf(selected.value))
const hoverStar = computed(() => starOf(hover.value?.hip ?? null))
/** Figure stars first, brightest first; then the other bright stars of the area. */
const starList = computed(() => [...(data.value?.stars ?? [])].sort((a, b) => Number(b.figure) - Number(a.figure) || a.mag - b.mag))
const label = (s: ConstellationStar) => (s.name ? `${s.name} · ${s.designation}` : s.designation)

// The star data is a static file per constellation: fetched in the browser only, the HTML stays light.
const stage = useStage(async () => {
  const [{ ConstellationStage }, json] = await Promise.all([
    import('~/engine/stages/ConstellationStage'),
    $fetch<ConstellationData>(`/data/constellations/${summary.id}.json`),
  ])
  data.value = json
  const shift = window.matchMedia(WIDE_QUERY).matches ? SHIFT.wide : SHIFT.narrow
  const instance: ConstellationStageType = new ConstellationStage(json, shift, {
    onSelect: (hip) => { selected.value = hip },
    onHover: (h) => { hover.value = h },
  })
  return instance
})

watch(view, (v) => stage.value?.setView(v))
function pick(hip: number): void {
  selected.value = hip
  stage.value?.select(hip)
}

/** Effective temperature from the B−V colour index (Ballesteros 2012). */
function temperature(s: ConstellationStar): number | null {
  return s.ci === null ? null : 4600 * (1 / (0.92 * s.ci + 1.7) + 1 / (0.92 * s.ci + 0.62))
}

const starFacts = computed<ObjectFact[]>(() => {
  const s = selectedStar.value
  if (!s) return []
  const facts: ObjectFact[] = [{ key: 'designation', text: s.designation }]
  if (s.distLy !== null) {
    facts.push({ key: 'distance', value: s.distLy, unit: 'ly', digits: s.distLy < 100 ? 1 : 0 })
    facts.push({ key: 'lightLeft', text: lightLeft(s.distLy) })
  } else {
    facts.push({ key: 'distance', text: { fr: 'inconnue (parallaxe trop faible)', en: 'unknown (parallax too small)' } })
  }
  facts.push({ key: 'magnitude', value: s.mag, digits: 2 })
  facts.push({ key: 'absoluteMagnitude', value: s.absmag, digits: 2 })
  if (s.spect) facts.push({ key: 'spectralType', text: s.spect })
  const temp = temperature(s)
  if (temp) facts.push({ key: 'surfaceTemperature', value: Math.round(temp / 10) * 10, unit: 'k', qualifier: '≈', derived: true })
  facts.push({ key: 'luminosity', value: s.lum, unit: 'lsun', digits: s.lum < 10 ? 2 : 0 })
  return facts
})

/** "Light that set off around 1525": the year the light reaching us today left the star. */
function lightLeft(ly: number): { fr: string; en: string } {
  const year = new Date().getFullYear() - Math.round(ly)
  // Years are written without thousands separators ("vers 1163", not "vers 1 163").
  if (year > 0) return { fr: `vers ${year}`, en: `around ${year}` }
  return { fr: `vers ${-year} av. J.-C.`, en: `around ${-year} BC` }
}

/** Hover tooltip: name and distance. */
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
    <section class="panel interactive" :aria-label="tl(summary.name)">
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

      <template v-if="selectedStar">
        <h2 class="panel__sub">{{ selectedStar.name ?? selectedStar.designation }}</h2>
        <dl class="facts mono">
          <template v-for="row in rows(starFacts)" :key="row.label">
            <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
          </template>
        </dl>
      </template>
      <p v-else class="panel__note">{{ $t('constellations.clickHint') }}</p>

      <h2 class="panel__sub mono">{{ $t('constellations.stars') }}</h2>
      <p v-if="!data" class="panel__note mono">{{ $t('objects.loading') }}</p>
      <ul v-else class="stars mono">
        <li v-for="s in starList" :key="s.hip">
          <button type="button" class="star" :aria-pressed="s.hip === selected" @click="pick(s.hip)">
            <span>{{ label(s) }}<span v-if="!s.figure" class="star__extra"> · {{ $t('constellations.outsideFigure') }}</span></span>
            <span class="star__d">{{ s.distLy !== null ? $t('objects.units.ly', { v: num(s.distLy, 0) }) : '—' }}</span>
          </button>
        </li>
      </ul>
      <p class="panel__note">{{ $t('constellations.dataNote') }}</p>
    </section>

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
.panel { position: absolute; left: 0; top: 0; bottom: 0; width: min(44vw, 34rem); overflow-y: auto; padding: 6rem var(--gutter) 3rem; scrollbar-width: thin; }
.back { display: inline-block; color: var(--muted); text-decoration: none; margin-bottom: 1.6rem; }
.back:hover { color: var(--fg); }
.panel__title { margin: 0 0 1rem; font: 400 clamp(2.6rem, 4.6vw, 4rem)/1 var(--font-serif); }
.panel__desc { margin: 0 0 1.4rem; color: var(--fg-soft); line-height: 1.65; max-width: 58ch; }
.panel__note { margin: 0.6rem 0 1.4rem; color: var(--faint); font-size: 0.875rem; line-height: 1.6; }
.panel__sub { margin: 1.8rem 0 0.6rem; font: 400 1.6rem/1.1 var(--font-serif); }
.panel__sub.mono { font: inherit; font-family: var(--font-mono); color: var(--fg); }

.views { display: flex; gap: 1.6rem; padding: 0.8rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.view { appearance: none; background: none; border: 0; padding: 0.3rem 0; color: var(--muted); cursor: pointer; font: inherit; letter-spacing: inherit; text-transform: inherit; position: relative; }
.view:hover, .view[aria-checked='true'] { color: var(--fg); }
.view[aria-checked='true']::after { content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px; background: var(--accent); }

.facts { display: grid; grid-template-columns: auto 1fr; margin: 0 0 1rem; }
.facts dt, .facts dd { margin: 0; padding: 0.55rem 0; border-top: 1px solid var(--line); }
.facts dt { color: var(--faint); padding-right: 1.5rem; }
.facts dd { text-align: right; text-transform: none; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }

.stars { list-style: none; margin: 0; padding: 0; }
.star { appearance: none; width: 100%; display: flex; justify-content: space-between; gap: 1rem; background: none; border: 0; border-top: 1px solid var(--line);
  padding: 0.5rem 0; color: var(--muted); cursor: pointer; font: inherit; letter-spacing: 0.02em; text-transform: none; text-align: left; }
.star:hover, .star[aria-pressed='true'] { color: var(--fg); }
.star[aria-pressed='true'] { box-shadow: inset 2px 0 0 var(--accent); padding-left: 0.6rem; }
.star__extra { color: var(--faint); }
.star__d { font-variant-numeric: tabular-nums; white-space: nowrap; }

.tip { position: fixed; margin: 0; padding: 0.35rem 0.6rem; background: rgb(4 6 10 / 0.85); border: 1px solid var(--line); color: var(--fg);
  pointer-events: none; text-transform: none; letter-spacing: 0.02em; font-size: 0.75rem; white-space: nowrap; z-index: 6; }
.tools { position: absolute; right: var(--gutter); top: 5.6rem; display: grid; gap: 0.6rem; justify-items: end; }
.tool { appearance: none; background: none; border: 0; padding: 0.25rem 0; color: var(--muted); cursor: pointer; }
.tool:hover { color: var(--fg); }
.tool--recenter::before { content: "↺ "; color: var(--accent); }
.hint { position: absolute; right: var(--gutter); bottom: 2rem; margin: 0; color: var(--faint); text-align: right; max-width: 26rem; line-height: 1.8; }

@media (max-width: 899px) {
  .obj__scrim { width: 100%; background: linear-gradient(0deg, rgb(4 6 10 / 0.95) 0%, rgb(4 6 10 / 0.9) 50%, rgb(4 6 10 / 0) 62%); }
  .panel { top: auto; width: 100%; height: 52svh; padding: 1.5rem var(--gutter) 2.5rem; }
  .tools { top: 4.4rem; }
  .hint { display: none; }
}
</style>
