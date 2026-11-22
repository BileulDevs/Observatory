<script setup lang="ts">
/**
 * The "How it's made" text: how a world is generated, baked and drawn. Shared by the sheet that opens over the
 * home page (HowSheet) and the standalone /how-its-made page, so the two can never drift apart.
 */
const localePath = useLocalePath()

/** Sections in reading order; each has a title and a body under how.sections.<id>. */
const SECTIONS = ['seed', 'relief', 'bake', 'light', 'real', 'render'] as const

defineProps<{
  /** Id given to the title, for the dialog's aria-labelledby. */
  titleId?: string
}>()
</script>

<template>
  <article class="how">
    <h1 :id="titleId" class="how__title">{{ $t('how.title') }}</h1>
    <p class="how__lead">{{ $t('how.lead') }}</p>
    <section v-for="id in SECTIONS" :key="id" class="how__part">
      <h2 class="how__part-title">{{ $t(`how.sections.${id}.title`) }}</h2>
      <p class="how__body">{{ $t(`how.sections.${id}.body`) }}</p>
    </section>
    <p class="how__foot">
      <slot name="foot" />
      <NuxtLink :to="localePath('credits')" class="how__link">{{ $t('how.credits') }}</NuxtLink>
    </p>
  </article>
</template>

<style scoped>
.how { max-width: 46rem; }
.how__title { margin: 0 0 1.5rem; font: 800 clamp(3.5rem, 8vw, 6rem)/0.85 var(--font-display); text-transform: uppercase; }
.how__lead { margin: 0 0 3rem; font-size: 1.25rem; line-height: 1.5; color: var(--fg-soft); max-width: 40ch; }
.how__part { padding: 1.5rem 0; border-top: 1px solid var(--line); }
.how__part-title { margin: 0 0 0.6rem; font: 700 1.75rem/1 var(--font-display); text-transform: uppercase; letter-spacing: 0.01em; }
.how__body { margin: 0; line-height: 1.65; color: var(--muted); max-width: 62ch; }
.how__foot { display: flex; flex-wrap: wrap; gap: 1rem 2rem; margin: 2.5rem 0 0; }
.how__link, .how__foot :slotted(a) { color: var(--accent-2); text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; }
.how__link:hover, .how__foot :slotted(a:hover) { color: var(--fg); }
</style>
