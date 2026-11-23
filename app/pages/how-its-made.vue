<script setup lang="ts">
/**
 * Standalone "How it's made" page, for direct links and search engines. From the home page the same text opens
 * as a sheet over the observatory instead (HowSheet); both render HowItsMade.
 */
const { t } = useI18n()
const localePath = useLocalePath()

usePageMeta({ title: () => t('how.title'), description: () => t('how.description') })
</script>

<template>
  <div class="page interactive">
    <div class="page__inner">
      <HowItsMade>
        <template #foot>
          <NuxtLink :to="localePath('index')">{{ $t('how.back') }}</NuxtLink>
        </template>
      </HowItsMade>
    </div>
  </div>
</template>

<style scoped>
.page { position: fixed; inset: 0; overflow-y: auto; background: rgb(10 12 16 / 0.9); }
.page__inner { padding: 8rem var(--gutter) 4rem; }
</style>
