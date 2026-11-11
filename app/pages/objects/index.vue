<script setup lang="ts">
/**
 * Catalogue of space objects, one category at a time. Each tile is a live 3D miniature drawn by
 * ObjectCatalogueStage from the shared canvas; the selected category lives in the URL (?c=nebulae).
 */
import { OBJECTS_BY_CATEGORY, isCategory } from '~/data/objects'
import type { ObjectCatalogueStage as ObjectCatalogueStageType } from '~/engine/stages/ObjectCatalogueStage'
import { OBJECT_CATEGORIES, type ObjectCategory, type SpaceObject } from '~/types/objects'

const { t } = useI18n()
const { tl } = useLocalized()
const localePath = useLocalePath()
const route = useRoute()

const category = computed<ObjectCategory>(() => (isCategory(route.query.c) ? route.query.c : OBJECT_CATEGORIES[0]))
const items = computed<SpaceObject[]>(() => OBJECTS_BY_CATEGORY[category.value])
const views = new Map<string, HTMLElement>()
const ready = ref(new Set<string>())

function setView(id: string, el: unknown): void {
  if (el instanceof HTMLElement) views.set(id, el)
  else views.delete(id)
}

const entries = (list: SpaceObject[]) => list.map((o) => ({ id: o.id, render: o.render }))

const stage = useStage(async () => {
  const { ObjectCatalogueStage } = await import('~/engine/stages/ObjectCatalogueStage')
  const instance: ObjectCatalogueStageType = new ObjectCatalogueStage(
    entries(items.value),
    (id) => views.get(id) ?? null,
    (id) => { ready.value = new Set(ready.value).add(id) },
  )
  return instance
})

watch(category, () => {
  ready.value = new Set()
  stage.value?.setEntries(entries(items.value))
})

/** The first category is the default and keeps a clean URL. */
function categoryLink(c: ObjectCategory) {
  return localePath({ name: 'objects', query: c === OBJECT_CATEGORIES[0] ? {} : { c } })
}

useSeoMeta({ title: () => t('objects.title'), description: () => t('objects.description') })
</script>

<template>
  <div class="page interactive" @scroll.passive="stage?.refresh()">
    <div class="page__inner">
      <p class="eyebrow mono">{{ $t('objects.eyebrow') }}</p>
      <h1 class="page__title">{{ $t('objects.title') }}</h1>
      <p class="page__lead">{{ $t('objects.description') }}</p>

      <nav class="tabs mono" :aria-label="$t('objects.categoriesLabel')">
        <NuxtLink
          v-for="c in OBJECT_CATEGORIES"
          :key="c"
          :to="categoryLink(c)"
          replace
          class="tab"
          :aria-current="c === category ? 'true' : undefined"
        >
          {{ $t(`objects.categories.${c}.name`) }}
          <span class="tab__count">{{ OBJECTS_BY_CATEGORY[c].length }}</span>
        </NuxtLink>
      </nav>

      <p class="blurb">{{ $t(`objects.categories.${category}.blurb`) }}</p>

      <ul :key="category" class="grid" role="list">
        <li v-for="o in items" :key="o.id">
          <NuxtLink
            :to="localePath({ name: 'objects-id', params: { id: o.id } })"
            class="tile"
            @mouseenter="stage?.setHovered(o.id)"
            @mouseleave="stage?.setHovered(null)"
            @focus="stage?.setHovered(o.id)"
            @blur="stage?.setHovered(null)"
          >
            <span :ref="(el) => setView(o.id, el)" class="tile__view" :class="{ 'is-live': ready.has(o.id) }">
              <span class="tile__loading mono" aria-hidden="true">{{ $t('objects.loading') }}</span>
            </span>
            <span class="tile__kind mono">{{ tl(o.kind) }}</span>
            <span class="tile__name">{{ tl(o.name) }}</span>
          </NuxtLink>
        </li>
      </ul>

      <p class="foot mono"><NuxtLink :to="localePath('credits')">{{ $t('footer.credits') }}</NuxtLink></p>
    </div>
  </div>
</template>

<style scoped>
/* Same scroll container as the systems catalogue: the miniatures are drawn on the canvas behind the tiles. */
.page { position: fixed; inset: 0; overflow-y: auto;
  mask-image: linear-gradient(180deg, transparent 0, transparent 4.5rem, #000 7.5rem); }
.page::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: linear-gradient(180deg, rgb(4 6 10 / 0.55) 0%, rgb(4 6 10 / 0.25) 40%, rgb(4 6 10 / 0.25) 100%); }
.page__inner { max-width: 96rem; padding: 8rem var(--gutter) 4rem; }
.page__title { margin: 0 0 1rem; font: 400 clamp(3rem, 7vw, 5.5rem)/1 var(--font-serif); }
.page__lead { margin: 0 0 3rem; max-width: 56ch; color: var(--fg-soft); font-size: 1.1rem; line-height: 1.55; }

.tabs { display: flex; flex-wrap: wrap; gap: 0.4rem 1.6rem; padding: 1rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.tab { padding: 0.3rem 0; color: var(--muted); text-decoration: none; position: relative; }
.tab:hover { color: var(--fg); }
.tab[aria-current='true'] { color: var(--fg); }
.tab[aria-current='true']::after { content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px; background: var(--accent); }
.tab__count { color: var(--faint); margin-left: 0.3rem; }
.blurb { margin: 1.6rem 0 2.4rem; max-width: 62ch; color: var(--muted); line-height: 1.6; }

.grid { list-style: none; margin: 0 0 4rem; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr)); gap: 3rem 2.5rem; }
.tile { display: grid; gap: 0.35rem; color: inherit; text-decoration: none; }
.tile__view { display: grid; place-items: center; aspect-ratio: 2 / 1; margin-bottom: 0.8rem; position: relative;
  border: 1px solid var(--line); transition: border-color 0.3s; }
.tile:hover .tile__view, .tile:focus-visible .tile__view { border-color: rgb(236 231 220 / 0.25); }
.tile__loading { color: var(--faint); transition: opacity 0.6s; }
.tile__view.is-live .tile__loading { opacity: 0; }
.tile__kind { color: var(--accent); }
.tile__name { font: 400 1.8rem/1.1 var(--font-serif); transition: color 0.25s; }
.tile:hover .tile__name, .tile:focus-visible .tile__name { color: var(--accent); }
.foot a { color: var(--muted); text-decoration: none; }
.foot a:hover { color: var(--fg); }
@media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
</style>
