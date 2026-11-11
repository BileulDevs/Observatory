<script setup lang="ts">
/** Links to the current page in every other locale. Real links so crawlers follow them too. */
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const others = computed(() => locales.value.filter((l) => l.code !== locale.value))
</script>

<template>
  <span class="lang">
    <NuxtLink v-for="l in others" :key="l.code" :to="switchLocalePath(l.code)" :hreflang="l.language" :lang="l.code" :aria-label="l.name">
      {{ l.code.toUpperCase() }}
    </NuxtLink>
  </span>
</template>

<style scoped>
.lang a { color: var(--muted); text-decoration: none; }
.lang a:hover { color: var(--fg); }
</style>
