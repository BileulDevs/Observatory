<script setup lang="ts">
/** Root: locale-aware head (lang attribute, title template), then the layout. */
const { t } = useI18n()
// No SEO alternates: one URL serves both languages, so hreflang links would all point to the same page.
const i18nHead = useLocaleHead({ seo: false })

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
