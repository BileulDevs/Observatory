<script setup lang="ts">
/** Sheet of a marker chosen on an object page: its name, the one-line readout shown in the scene, and a short text. */
import type { ObjectMarker } from '~/types/objects'

defineProps<{ marker: ObjectMarker }>()
const emit = defineEmits<{ close: [] }>()
const { tl } = useLocalized()
</script>

<template>
  <article class="card" :aria-labelledby="`marker-${marker.anchor}`">
    <header class="card__head">
      <h3 :id="`marker-${marker.anchor}`" class="card__title">{{ tl(marker.title) }}</h3>
      <button type="button" class="card__close mono" :aria-label="$t('objects.closeMarker')" @click="emit('close')">×</button>
    </header>
    <p class="card__readout mono">{{ tl(marker.text) }}</p>
    <p class="card__text">{{ tl(marker.body) }}</p>
  </article>
</template>

<style scoped>
/* Same look as the exploits' hotspot sheet (HotspotCard). */
.card { border: 1px solid var(--line); background: rgb(4 6 10 / 0.72); padding: 1.1rem 1.2rem 1rem; }
.card__head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
.card__title { margin: 0 0 0.5rem; font: 400 1.6rem/1.1 var(--font-serif); }
.card__close { appearance: none; background: none; border: 0; color: var(--muted); cursor: pointer; font-size: 1.2rem; line-height: 1; padding: 0.2rem; }
.card__close:hover { color: var(--fg); }
.card__readout { margin: 0 0 0.8rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--line); color: var(--accent); font-size: 0.72rem; text-transform: none; letter-spacing: 0.02em; }
.card__text { margin: 0; color: var(--fg-soft); line-height: 1.6; font-size: 0.95rem; }
</style>
