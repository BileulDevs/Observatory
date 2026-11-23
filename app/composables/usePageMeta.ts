/**
 * A page's title and description, for the browser tab, search engines and link previews (Open Graph, Twitter).
 * Getters, so the head follows the language and any in-page state (an inspected planet, an exploit step).
 * The title template (app.vue) adds the site name to the tab title; previews get it here, since og:title has no template.
 */
export function usePageMeta(meta: { title?: () => string; description: () => string }): void {
  const { t } = useI18n()
  const fullTitle = () => {
    const title = meta.title?.()
    return title ? `${title} · ${t('site.name')}` : `${t('site.name')} — ${t('site.tagline')}`
  }
  useSeoMeta({
    title: () => meta.title?.() ?? '',
    description: meta.description,
    ogTitle: fullTitle,
    ogDescription: meta.description,
    twitterTitle: fullTitle,
    twitterDescription: meta.description,
  })
}
