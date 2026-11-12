<script setup lang="ts">
/** A star's fact sheet: names, figures (measured or computed), description and source. */
import type { StarSheet } from '~/composables/useStarSheet'

defineProps<{ sheet: StarSheet }>()
const { tl } = useLocalized()
const { rows } = useObjectFacts()
</script>

<template>
  <article class="sheet">
    <h2 class="sheet__title">{{ sheet.title }}</h2>
    <p v-if="sheet.aka" class="sheet__aka mono">{{ tl(sheet.aka) }}</p>
    <p class="sheet__desc">{{ tl(sheet.description) }}</p>
    <dl class="facts mono">
      <template v-for="row in rows(sheet.facts)" :key="row.label">
        <dt>{{ row.label }}</dt><dd>{{ row.value }}</dd>
      </template>
    </dl>
    <p class="sheet__src mono">
      <a v-if="sheet.source" :href="sheet.source.url" target="_blank" rel="noopener">{{ sheet.source.label }} ↗<span class="sr-only"> {{ $t('a11y.newTab') }}</span></a>
      <span v-else>{{ $t('constellations.computedNote') }}</span>
    </p>
  </article>
</template>

<style scoped>
.sheet { margin: 1.4rem 0 0; }
.sheet__title { margin: 0; font: 400 1.9rem/1.1 var(--font-serif); }
.sheet__aka { margin: 0.3rem 0 0; color: var(--faint); text-transform: none; letter-spacing: 0.02em; font-size: 0.75rem; }
.sheet__desc { margin: 0.8rem 0 1rem; color: var(--fg-soft); line-height: 1.6; font-size: 0.95rem; }
.facts { display: grid; grid-template-columns: auto 1fr; margin: 0 0 0.6rem; }
.facts dt, .facts dd { margin: 0; padding: 0.45rem 0; border-top: 1px solid var(--line); }
.facts dt { color: var(--faint); padding-right: 1.5rem; }
.facts dd { text-align: right; text-transform: none; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.sheet__src { margin: 0; font-size: 0.7rem; color: var(--faint); text-transform: none; letter-spacing: 0.02em; }
.sheet__src a { color: var(--muted); text-decoration: none; border-bottom: 1px solid var(--line); }
</style>
