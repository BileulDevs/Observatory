<script setup lang="ts">
/** Top bar: wordmark, the site sections, language switch. */
const localePath = useLocalePath()
const route = useRoute()
const routeBase = computed(() => String(route.name ?? '').split('___')[0] ?? '')
</script>

<template>
  <header class="header">
    <NuxtLink :to="localePath('index')" class="header__mark interactive">{{ $t('site.name') }}</NuxtLink>
    <nav class="header__nav mono interactive" :aria-label="$t('nav.label')">
      <NuxtLink :to="localePath('index')" :aria-current="routeBase === 'index' ? 'page' : undefined">{{ $t('nav.observatory') }}</NuxtLink>
      <NuxtLink :to="localePath('systems')" :aria-current="routeBase.startsWith('systems') ? 'page' : undefined">{{ $t('nav.systems') }}</NuxtLink>
      <NuxtLink :to="localePath('objects')" :aria-current="routeBase.startsWith('objects') ? 'page' : undefined">{{ $t('nav.objects') }}</NuxtLink>
      <NuxtLink :to="localePath('constellations')" :aria-current="routeBase.startsWith('constellations') ? 'page' : undefined">{{ $t('nav.constellations') }}</NuxtLink>
      <NuxtLink :to="localePath('create')" :aria-current="routeBase === 'create' ? 'page' : undefined">{{ $t('nav.create') }}</NuxtLink>
      <LangSwitch />
    </nav>
  </header>
</template>

<style scoped>
.header {
  position: fixed; inset: 0 0 auto 0; z-index: 5;
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-4);
  padding: var(--space-5) var(--gutter); pointer-events: none;
}
/* The bar itself lets clicks through to the canvas; its links must not inherit that. */
.header > * { pointer-events: auto; }
.header__mark { font-family: var(--font-serif); font-size: 1.625rem; color: var(--fg); text-decoration: none; }
.header__nav { display: flex; align-items: baseline; gap: var(--space-5); }
.header__nav a { color: var(--muted); text-decoration: none; transition: color 0.2s; position: relative; white-space: nowrap; }
.header__nav a:hover, .header__nav a[aria-current='page'] { color: var(--fg); }
.header__nav a[aria-current='page']::after { content: ""; position: absolute; left: 0; right: 0; bottom: -4px; height: 1px; background: var(--accent); }
@media (max-width: 640px) {
  .header { padding: var(--space-4) var(--gutter); }
  .header__mark { font-size: 1.375rem; }
  .header__nav { gap: var(--space-4); }
  /* The wordmark already links home: keep the bar on one line. */
  .header__nav a:first-child { display: none; }
}
</style>
