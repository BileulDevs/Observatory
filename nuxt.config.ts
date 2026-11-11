import { readdirSync, readFileSync } from 'node:fs'
import { defineNuxtConfig } from 'nuxt/config'

/**
 * Every catalogue object page, in both languages. The catalogue shows one category at a time, so the crawler
 * alone would miss the others. Read with a pattern from the data files: the config cannot import app code
 * (its ~ aliases do not exist yet at this point).
 */
function objectRoutes(): string[] {
  const dir = new URL('./app/data/objects/', import.meta.url)
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .flatMap((f) => [...readFileSync(new URL(f, dir), 'utf8').matchAll(/id: '([a-z0-9-]+)', category:/g)].map((m) => m[1]!))
  return ids.flatMap((id) => [`/objets/${id}`, `/en/objects/${id}`])
}

/** Production origin. Used for canonical URLs, hreflang links and Open Graph. */
const SITE_URL = 'https://observatoire.example' // ← replace with the final domain

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  // Components are referenced by file name only (<SpaceCanvas/>, not <SpaceSpaceCanvas/>).
  components: [{ path: '~/components', pathPrefix: false }],

  i18n: {
    baseUrl: SITE_URL,
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    // Redirect on "/" only: crawlers and shared deep links always get the page they asked for.
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' },
    customRoutes: 'config',
    // Keys are route names: pages/systems/index.vue → "systems", pages/systems/[id].vue → "systems-id".
    pages: {
      systems: { fr: '/systemes', en: '/systems' },
      'systems-id': { fr: '/systemes/[id]', en: '/systems/[id]' },
      objects: { fr: '/objets', en: '/objects' },
      'objects-id': { fr: '/objets/[id]', en: '/objects/[id]' },
      credits: { fr: '/credits', en: '/credits' },
    },
  },

  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#04060a' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap',
        },
      ],
    },
  },

  typescript: {
    typeCheck: false,
    tsConfig: { compilerOptions: { skipLibCheck: true } },
  },

  runtimeConfig: {
    public: { siteUrl: SITE_URL },
  },

  vite: {
    // Three and its addons must share one pre-bundle, otherwise dev can load two copies of Three
    // and rendering silently breaks (empty canvas).
    optimizeDeps: {
      include: [
        'three',
        'three/addons/controls/OrbitControls.js',
        'three/addons/postprocessing/EffectComposer.js',
        'three/addons/postprocessing/RenderPass.js',
        'three/addons/postprocessing/UnrealBloomPass.js',
        'three/addons/postprocessing/OutputPass.js',
        'three/addons/postprocessing/ShaderPass.js',
      ],
    },
    build: {
      rollupOptions: {
        output: {
          // Three in its own long-cached chunk: content edits do not invalidate ~600 kB of engine.
          manualChunks: (id: string) => (id.includes('node_modules/three/') ? 'three' : undefined),
        },
      },
    },
  },

  nitro: {
    compressPublicAssets: true,
    // Featured systems are reached by the crawler from the index; any other generated seed is rendered client-side.
    prerender: { crawlLinks: true, routes: ['/', '/en', ...objectRoutes()] },
  },
})
