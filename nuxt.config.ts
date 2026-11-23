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
// No trailing slash: paths are appended to it ("/og.jpg"). Netlify address for now; change it with the final domain.
const SITE_URL = 'https://space-observatory.netlify.app'

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n', '@nuxt/fonts'],
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
      ],
    },
  },

  // "Mission" kit: Big Shoulders (condensed display, titles), Barlow (text and interface), Chivo Mono (figures).
  // Downloaded from Google Fonts at build time and served from the site itself (/_fonts): no request to a third
  // party, no extra connection before the text shows. Big Shoulders is the current Google Fonts family; it
  // replaced "Big Shoulders Display" in 2025.
  fonts: {
    // global: the families are named in CSS custom properties (--font-sans...), which the module's scan of
    // font-family declarations does not see, so it would emit no @font-face at all.
    families: [
      // Preloaded: what every page draws first, its title (one variable file) and its body text (regular).
      { name: 'Big Shoulders', provider: 'google', weights: ['500 900'], global: true, preload: { subsets: ['latin'] } },
      { name: 'Barlow', provider: 'google', weights: [400, 500, 600], global: true, preload: { subsets: ['latin'], weights: [400] } },
      // Figures and small labels: not worth competing with the above for the first bytes.
      { name: 'Chivo Mono', provider: 'google', weights: [400, 500], global: true, preload: false },
    ],
    defaults: {
      styles: ['normal'],
      // latin covers French (é, à, ç, œ); latin-ext only downloads if a page uses one of its characters.
      subsets: ['latin', 'latin-ext'],
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
        'three/addons/geometries/RoundedBoxGeometry.js',
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
    prerender: { crawlLinks: true, routes: ['/', '/how-its-made', '/exploits', '/exploits/apollo-11', '/exploits/rosetta', ...objectRoutes(), ...constellationRoutes()] },
  },
})
