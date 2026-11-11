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

const object = findObject(String(route.params.id))
if (!object) throw createError({ statusCode: 404, statusMessage: t('objects.notFound'), fatal: true })

const siblings = OBJECTS_BY_CATEGORY[object.category]
const index = siblings.findIndex((o) => o.id === object.id)
const prev = siblings[(index - 1 + siblings.length) % siblings.length]!
const next = siblings[(index + 1) % siblings.length]!
const playing = ref(true)

const stage = useStage(async () => {
  const { ObjectStage } = await import('~/engine/stages/ObjectStage')
  const layout = window.matchMedia(WIDE_QUERY).matches ? LAYOUT.wide : LAYOUT.narrow
  const instance: ObjectStageType = new ObjectStage(object.render, layout)
  return instance
})
watch(playing, (v) => stage.value?.setPlaying(v))

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
    <section class="panel interactive" :aria-label="tl(object.name)">
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

    <div class="tools interactive">
      <button type="button" class="tool mono" :aria-pressed="!playing" @click="playing = !playing">
        {{ playing ? $t('objects.pause') : $t('objects.play') }}
      </button>
      <button type="button" class="tool tool--recenter mono" @click="stage?.recenter()">{{ $t('systems.recenter') }}</button>
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
.hint { position: absolute; right: var(--gutter); bottom: 2rem; margin: 0; color: var(--faint); text-align: right; max-width: 26rem; line-height: 1.8; }

@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
@media (max-width: 899px) {
  .obj__scrim { width: 100%; background: linear-gradient(0deg, rgb(4 6 10 / 0.95) 0%, rgb(4 6 10 / 0.9) 50%, rgb(4 6 10 / 0) 62%); }
  .panel { top: auto; width: 100%; height: 52svh; padding: 1.5rem var(--gutter) 2.5rem; }
  .tools { top: 4.4rem; }
  .hint { display: none; }
}
</style>
