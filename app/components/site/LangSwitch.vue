<script setup lang="ts">
/**
 * Language switch: changes the language in place (URLs carry no language) and remembers the choice for the
 * next visits, where it takes precedence over the browser's language.
 */
import { LOCALE_STORAGE_KEY, type SiteLocale } from '~/utils/locale'

const { locale, locales, setLocale } = useI18n()
const others = computed(() => locales.value.filter((l) => l.code !== locale.value))

async function choose(code: SiteLocale): Promise<void> {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code)
  } catch {
    // Not persisted (storage blocked): the switch still applies to this visit.
  }
  await setLocale(code)
}
</script>

<template>
  <span class="lang">
    <button
      v-for="l in others"
      :key="l.code"
      type="button"
      :lang="l.code"
      :aria-label="l.name"
      @click="choose(l.code as SiteLocale)"
    >
      {{ l.code.toUpperCase() }}
    </button>
  </span>
</template>

<style scoped>
.lang button { appearance: none; background: none; border: 0; padding: 0; color: var(--muted); cursor: pointer; font: inherit; letter-spacing: inherit; text-transform: inherit; }
.lang button:hover { color: var(--fg); }
</style>
