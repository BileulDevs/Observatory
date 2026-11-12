import { readdirSync, readFileSync } from 'node:fs'
import { defineNuxtConfig } from 'nuxt/config'

/**
 * Every catalogue object page. The catalogue shows one category at a time, so the crawler
 * alone would miss the others. Read with a pattern from the data files: the config cannot import app code
 * (its ~ aliases do not exist yet at this point).
 */
function objectRoutes(): string[] {
  const dir = new URL('./app/data/objects/', import.meta.url)
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .flatMap((f) => [...readFileSync(new URL(f, dir), 'utf8').matchAll(/id: '([a-z0-9-]+)', category:/g)].map((m) => m[1]!))
  return ids.map((id) => `/objects/${id}`)
}

/** Every constellation page, from the generated list (same pattern-reading approach). */
function constellationRoutes(): string[] {
  const src = readFileSync(new URL('./app/data/constellations.generated.ts', import.meta.url), 'utf8')
  const ids = [...src.matchAll(/"id":"([a-z0-9-]+)"/g)].map((m) => m[1]!)
  return ids.map((id) => `/constellations/${id}`)
}

/** Production origin. Used for canonical URLs, hreflang links and Open Graph. */
const SITE_URL = 'https://observatoire.example' // ← replace with the final domain

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  // Components are referenced by file name only (<SpaceCanvas/>, not <SpaceSpaceCanvas/>).
  components: [{ path: '~/components', pathPrefix: false }],

  i18n: {
    baseUrl: SITE_URL,
    // One URL per page, whatever the language: the static HTML is English, and the browser switches to French
    // after hydration when the visitor's choice or browser language asks for it (plugins/locale.client.ts).
    // Choosing on a server would avoid the switch, but the site is fully static.
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
    ],
    detectBrowserLanguage: false,
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
        'three/addons/loaders/GLTFLoader.js',
        'three/addons/loaders/DRACOLoader.js',
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
    prerender: { crawlLinks: true, routes: ['/', '/exploits', '/exploits/apollo-11', ...objectRoutes(), ...constellationRoutes()] },
  },
})
