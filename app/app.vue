<script setup lang="ts">
/** Root: locale-aware head (lang, hreflang, canonical, og:locale), then the layout. */
const { t } = useI18n()
const i18nHead = useLocaleHead({ seo: true })

useHead(() => ({
  htmlAttrs: { lang: i18nHead.value.htmlAttrs?.lang },
  titleTemplate: (title?: string) => (title ? `${title} · ${t('site.name')}` : `${t('site.name')} — ${t('site.tagline')}`),
  link: [...(i18nHead.value.link ?? [])],
  meta: [...(i18nHead.value.meta ?? [])],
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
