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
/**
 * Link preview image, the same for every page: a real frame of the home planet with the site name
 * (public/og.jpg, 1200 × 630, the size Open Graph and Twitter cards expect). Absolute URL: crawlers require one.
 */
const OG_IMAGE = { path: '/og.jpg', width: 1200, height: 630 }
useSeoMeta({
  ogUrl: () => pageUrl.value,
  ogSiteName: () => t('site.name'),
  ogImage: `${siteUrl}${OG_IMAGE.path}`,
  ogImageType: 'image/jpeg',
  ogImageWidth: OG_IMAGE.width,
  ogImageHeight: OG_IMAGE.height,
  ogImageAlt: () => t('site.ogImageAlt'),
  twitterImage: `${siteUrl}${OG_IMAGE.path}`,
  twitterImageAlt: () => t('site.ogImageAlt'),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
