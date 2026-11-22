<script setup lang="ts">
/** Root: locale-aware head (lang attribute, title template), then the layout. */
const { t } = useI18n()
// No SEO alternates: one URL serves both languages, so hreflang links would all point to the same page.
const i18nHead = useLocaleHead({ seo: false })
const route = useRoute()
const { siteUrl } = useRuntimeConfig().public
// Path only: query strings (?how, ?debug) show the same page and must not split it into several URLs.
const pageUrl = computed(() => `${siteUrl}${route.path === '/' ? '/' : route.path.replace(/\/$/, '')}`)

useHead(() => ({
  htmlAttrs: { lang: i18nHead.value.htmlAttrs?.lang },
  titleTemplate: (title?: string) => (title ? `${title} · ${t('site.name')}` : `${t('site.name')} — ${t('site.tagline')}`),
  link: [...(i18nHead.value.link ?? []), { rel: 'canonical', href: pageUrl.value }],
  meta: [...(i18nHead.value.meta ?? [])],
}))
useSeoMeta({ ogUrl: () => pageUrl.value, ogSiteName: () => t('site.name') })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
