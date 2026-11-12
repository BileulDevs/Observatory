<script setup lang="ts">
/**
 * The 88 constellations as small line drawings, searchable by French, English or Latin name and abbreviation.
 * Each opens its page with the figure in 3D. Drawn in SVG: 88 live 3D miniatures would cost far more than
 * they show.
 */
import { CONSTELLATIONS } from '~/data/constellations.generated'

const { t } = useI18n()
const { tl, num } = useLocalized()
const localePath = useLocalePath()

const query = ref('')
/** Accent- and case-insensitive match on every name of the constellation. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const list = computed(() => {
  const q = fold(query.value.trim())
  const sorted = [...CONSTELLATIONS].sort((a, b) => tl(a.name).localeCompare(tl(b.name)))
  if (!q) return sorted
  return sorted.filter((c) => [c.name.fr, c.name.en, c.latin, c.abbr].some((n) => fold(n).includes(q)))
})

/** Dot radius in the 100-unit box from the apparent magnitude: brighter, bigger. */
const dotRadius = (mag: number) => Math.min(2.6, Math.max(0.7, 2.4 - mag * 0.38))

useSeoMeta({ title: () => t('constellations.title'), description: () => t('constellations.description') })
</script>

<template>
  <div class="page interactive">
    <div class="page__inner">
      <p class="eyebrow mono">{{ $t('constellations.eyebrow') }}</p>
      <h1 class="page__title">{{ $t('constellations.title') }}</h1>
      <p class="page__lead">{{ $t('constellations.description') }}</p>

      <label class="search mono">
        <span class="sr-only">{{ $t('constellations.search') }}</span>
        <input v-model="query" type="search" :placeholder="$t('constellations.search')" autocomplete="off">
        <span class="search__count">{{ $t('constellations.count', { n: list.length }) }}</span>
      </label>

      <ul class="grid" role="list">
        <li v-for="c in list" :key="c.id">
          <NuxtLink :to="localePath({ name: 'constellations-id', params: { id: c.id } })" class="tile">
            <svg class="tile__fig" viewBox="0 0 100 100" aria-hidden="true">
              <path :d="c.path" />
              <circle v-for="(d, i) in c.dots" :key="i" :cx="d[0]" :cy="d[1]" :r="dotRadius(d[2])" />
            </svg>
            <span class="tile__name">{{ tl(c.name) }}</span>
            <span class="tile__meta mono">
              {{ c.latin }} · {{ c.abbr }}
              <template v-if="c.nearestLy && c.farthestLy">
                · {{ $t('constellations.range', { near: num(c.nearestLy, 0), far: num(c.farthestLy, 0) }) }}
              </template>
            </span>
          </NuxtLink>
        </li>
      </ul>

      <p class="foot mono"><NuxtLink :to="localePath('credits')">{{ $t('footer.credits') }}</NuxtLink></p>
    </div>
  </div>
</template>

<style scoped>
.page { position: fixed; inset: 0; overflow-y: auto;
  mask-image: linear-gradient(180deg, transparent 0, transparent 4.5rem, #000 7.5rem); }
.page::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: linear-gradient(180deg, rgb(4 6 10 / 0.6) 0%, rgb(4 6 10 / 0.35) 40%, rgb(4 6 10 / 0.35) 100%); }
.page__inner { max-width: 96rem; padding: 8rem var(--gutter) 4rem; }
.page__title { margin: 0 0 1rem; font: 400 clamp(3rem, 7vw, 5.5rem)/1 var(--font-serif); }
.page__lead { margin: 0 0 2.4rem; max-width: 60ch; color: var(--fg-soft); font-size: 1.1rem; line-height: 1.55; }

.search { display: flex; align-items: baseline; gap: 1.2rem; padding: 0.9rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.search input { flex: 1; background: transparent; border: 0; color: var(--fg); font: inherit; letter-spacing: inherit; outline: none; }
.search input::placeholder { color: var(--faint); }
.search__count { color: var(--faint); }

.grid { list-style: none; margin: 2rem 0 0; padding: 0; display: grid; gap: 1.6rem 1.4rem; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr)); }
.tile { display: grid; gap: 0.35rem; color: inherit; text-decoration: none; }
.tile__fig { width: 100%; aspect-ratio: 1; border: 1px solid var(--line); background: rgb(4 6 10 / 0.5); padding: 0.6rem; box-sizing: border-box; transition: border-color 0.25s; }
.tile__fig path { fill: none; stroke: #c9a96e; stroke-width: 0.7; stroke-opacity: 0.7; vector-effect: non-scaling-stroke; }
.tile__fig circle { fill: #f2efe6; }
.tile:hover .tile__fig, .tile:focus-visible .tile__fig { border-color: var(--accent); }
.tile__name { font: 400 1.35rem/1.1 var(--font-serif); margin-top: 0.3rem; }
.tile__meta { color: var(--faint); font-size: 0.7rem; line-height: 1.5; }
.foot { margin-top: 4rem; }
.foot a { color: var(--faint); text-decoration: none; }
.foot a:hover { color: var(--fg); }
</style>
