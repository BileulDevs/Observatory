<script setup lang="ts">
/**
 * Catalogue of planetary systems: each tile is a live 3D miniature of its system (CatalogueStage draws them all
 * from one canvas), with a 2D version shown until it is ready or when WebGL is unavailable.
 */
import { featuredGenerated } from '~/data/catalog'
import { GENERATED_PREFIX, MAX_SEED } from '~/data/generate'
import { toStage } from '~/data/scale'
import { realSystems } from '~/data/systems'
import type { CatalogueStage as CatalogueStageType } from '~/engine/stages/CatalogueStage'
import type { PlanetarySystem } from '~/types/systems'

const { t } = useI18n()
const { tl, num } = useLocalized()
const localePath = useLocalePath()
const router = useRouter()

const generated = featuredGenerated()
const all = [...realSystems, ...generated]
const views = new Map<string, HTMLElement>()
const ready = ref(new Set<string>())

function setView(id: string, el: unknown): void {
  if (el instanceof HTMLElement) views.set(id, el)
  else views.delete(id)
}

const stage = useStage(async () => {
  const { CatalogueStage } = await import('~/engine/stages/CatalogueStage')
  const instance: CatalogueStageType = new CatalogueStage(
    all.map((s) => ({ id: s.id, ...toStage(s) })),
    (id) => views.get(id) ?? null,
    { onReady: (id) => { ready.value = new Set(ready.value).add(id) } },
  )
  return instance
})

function linkTo(s: PlanetarySystem) {
  return localePath({ name: 'systems-id', params: { id: s.id } })
}

function generate(): void {
  const seed = Math.floor(Math.random() * MAX_SEED)
  router.push(localePath({ name: 'systems-id', params: { id: GENERATED_PREFIX + seed } }))
}

function meta(s: PlanetarySystem): string {
  const where = s.kind === 'generated' ? t('systems.kindGenerated') : s.distanceLy === 0 ? t('systems.here') : t('systems.ly', { d: num(s.distanceLy, 2) })
  return `${where} · ${s.star.spectralType} · ${t('systems.planets', s.planets.length)}`
}

useSeoMeta({ title: () => t('systems.title'), description: () => t('systems.description') })
</script>

<template>
  <div class="page interactive" @scroll.passive="stage?.refresh()">
    <div class="page__inner">
      <p class="eyebrow mono">{{ $t('systems.eyebrow') }}</p>
      <h1 class="page__title">{{ $t('systems.title') }}</h1>
      <p class="page__lead">{{ $t('systems.description') }}</p>

      <template v-for="group in [{ key: 'real', items: realSystems }, { key: 'generated', items: generated }]" :key="group.key">
        <h2 class="group-title mono">{{ $t(`systems.${group.key}`) }}</h2>
        <p v-if="group.key === 'generated'" class="gen-note">{{ $t('systems.generatedNote') }}</p>
        <ul class="grid" role="list">
          <li v-for="s in group.items" :key="s.id">
            <NuxtLink
              :to="linkTo(s)"
              class="tile"
              @mouseenter="stage?.setHovered(s.id)"
              @mouseleave="stage?.setHovered(null)"
              @focus="stage?.setHovered(s.id)"
              @blur="stage?.setHovered(null)"
            >
              <span :ref="(el) => setView(s.id, el)" class="tile__view" :class="{ 'is-live': ready.has(s.id) }">
                <SystemThumb :system="s" />
              </span>
              <span class="tile__name">{{ tl(s.name) }}</span>
              <span class="tile__meta mono">{{ meta(s) }}</span>
            </NuxtLink>
          </li>
          <li v-if="group.key === 'generated'">
            <button type="button" class="tile tile--new" @click="generate">
              <span class="tile__view">
                <svg class="tile__new" viewBox="-200 -100 400 200" aria-hidden="true">
                  <ellipse cx="0" cy="0" rx="170" ry="60" />
                  <ellipse cx="0" cy="0" rx="105" ry="37" />
                  <path d="M0 -12V12M-12 0H12" />
                </svg>
              </span>
              <span class="tile__name">{{ $t('systems.generate') }}</span>
              <span class="tile__meta mono">{{ $t('systems.generateHint') }}</span>
            </button>
          </li>
        </ul>
      </template>

      <p class="foot mono"><NuxtLink :to="localePath('credits')">{{ $t('footer.credits') }}</NuxtLink></p>
    </div>
  </div>
</template>

<style scoped>
/*
 * The document never scrolls (full-screen app): this page scrolls inside its own container.
 * No background on the tiles: the 3D miniatures are drawn on the canvas behind, through them.
 */
.page { position: fixed; inset: 0; overflow-y: auto;
  /* Fades the text out under the fixed header instead of letting the two overlap. Not the 3D miniatures: they are on the canvas behind. */
  mask-image: linear-gradient(180deg, transparent 0, transparent 4.5rem, #000 7.5rem); }
.page::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: linear-gradient(180deg, rgb(4 6 10 / 0.55) 0%, rgb(4 6 10 / 0.25) 40%, rgb(4 6 10 / 0.25) 100%); }
.page__inner { max-width: 96rem; padding: 8rem var(--gutter) 4rem; }
.page__title { margin: 0 0 1rem; font: 400 clamp(3rem, 7vw, 5.5rem)/1 var(--font-serif); }
.page__lead { margin: 0 0 4rem; max-width: 52ch; color: var(--fg-soft); font-size: 1.1rem; line-height: 1.55; }
.group-title { margin: 0 0 1rem; padding-top: 1rem; border-top: 1px solid var(--line); font-weight: 400; color: var(--fg); }
.gen-note { margin: -0.4rem 0 1.5rem; color: var(--muted); max-width: 60ch; line-height: 1.55; font-size: 0.9rem; }

.grid { list-style: none; margin: 0 0 4rem; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(26rem, 1fr)); gap: 3rem 2.5rem; }
.tile { display: grid; gap: 0.35rem; width: 100%; padding: 0; background: none; border: 0; color: inherit; text-align: left;
  text-decoration: none; cursor: pointer; font: inherit; }
/* 2:1, like the thumbnail cameras frame them. The WebGL miniature is drawn into exactly this rectangle. */
.tile__view { display: block; aspect-ratio: 2 / 1; margin-bottom: 0.8rem; position: relative; }
.tile__view :deep(.thumb) { transition: opacity 0.8s var(--ease-out); }
.tile__view.is-live :deep(.thumb) { opacity: 0; }
.tile__name { font: 400 1.9rem/1.05 var(--font-serif); transition: color 0.25s; }
.tile:hover .tile__name, .tile:focus-visible .tile__name { color: var(--accent); }
.tile__meta { color: var(--muted); line-height: 1.6; }

.tile__new { display: block; width: 100%; height: 100%; }
.tile__new ellipse { fill: none; stroke: var(--fg); stroke-opacity: 0.2; stroke-dasharray: 3 4; }
.tile__new path { stroke: var(--accent); stroke-width: 1.5; }
.tile--new:hover .tile__new ellipse { stroke-opacity: 0.45; }

.foot a { color: var(--muted); text-decoration: none; }
.foot a:hover { color: var(--fg); }
@media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .tile__view :deep(.thumb) { transition: none; } }
</style>
