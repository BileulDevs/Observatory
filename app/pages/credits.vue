<script setup lang="ts">
/** Attribution for every external asset and data source. Required for the maps, useful for everything else. */
import { realSystems } from '~/data/systems'

const { t } = useI18n()
const { tl } = useLocalized()

/** Map provenance (all public domain). Keep in sync with public/textures/solar/, moons/ and dwarf/. */
const MAPS = [
  { body: { fr: 'Mercure', en: 'Mercury' }, credit: 'NASA / Johns Hopkins University APL / Carnegie Institution of Washington / USGS — MESSENGER MDIS Global Mosaic', url: 'https://astrogeology.usgs.gov/' },
  { body: { fr: 'Vénus (radar)', en: 'Venus (radar)' }, credit: 'NASA / JPL / USGS — Magellan C3-MDIR Synthetic Color Mosaic', url: 'https://astrogeology.usgs.gov/search/map/venus_magellan_global_c3_mdir_synthetic_color_mosaic_4641m' },
  { body: { fr: 'Terre', en: 'Earth' }, credit: 'NASA Earth Observatory — Blue Marble: Next Generation (Reto Stöckli, NASA GSFC)', url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry' },
  { body: { fr: 'Mars', en: 'Mars' }, credit: 'NASA / JPL / USGS — Viking MDIM2.1 Colorized Global Mosaic', url: 'https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m' },
  { body: { fr: 'Jupiter', en: 'Jupiter' }, credit: 'NASA / JPL / Space Science Institute — PIA07782, Cassini cylindrical map', url: 'https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/' },
  { body: { fr: 'Lune', en: 'Moon' }, credit: "NASA's Scientific Visualization Studio — CGI Moon Kit (LRO LROC WAC colour)", url: 'https://svs.gsfc.nasa.gov/4720' },
  { body: { fr: 'Phobos', en: 'Phobos' }, credit: 'NASA / JPL / USGS — Phobos Viking Global Mosaic', url: 'https://astrogeology.usgs.gov/search/map/phobos_viking_global_mosaic_5m' },
  { body: { fr: 'Io', en: 'Io' }, credit: 'NASA / JPL / USGS — Io Galileo SSI / Voyager Color Merged Global Mosaic', url: 'https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km' },
  { body: { fr: 'Europe', en: 'Europa' }, credit: 'NASA / JPL / USGS — Europa Voyager–Galileo SSI Global Mosaic', url: 'https://astrogeology.usgs.gov/search/map/europa_voyager_galileo_ssi_global_mosaic_500m' },
  { body: { fr: 'Ganymède', en: 'Ganymede' }, credit: 'NASA / JPL / USGS — Ganymede Voyager–Galileo SSI Color Global Mosaic', url: 'https://astrogeology.usgs.gov/search/map/ganymede_voyager_galileo_ssi_color_global_mosaic_1_4km' },
  { body: { fr: 'Callisto', en: 'Callisto' }, credit: 'NASA / JPL / USGS — Callisto Galileo / Voyager Global Mosaic', url: 'https://astrogeology.usgs.gov/search/map/callisto_galileo_voyager_global_mosaic_1km' },
  { body: { fr: 'Pluton', en: 'Pluto' }, credit: 'NASA / JHU-APL / SwRI — New Horizons global colour map (PIA11707)', url: 'https://www.jpl.nasa.gov/images/pia11707-pluto-color-map' },
  { body: { fr: 'Cérès', en: 'Ceres' }, credit: 'NASA / JPL-Caltech / UCLA / MPS / DLR / IDA — Dawn FC global mosaic (USGS)', url: 'https://astrogeology.usgs.gov/search/map/Ceres/Dawn/DLR/FramingCamera/Ceres_Dawn_FC_DLR_global_59ppd_Feb2016' },
]

useSeoMeta({ title: () => t('credits.title'), description: () => t('credits.description') })
</script>

<template>
  <div class="page interactive">
    <div class="page__inner">
      <p class="eyebrow mono">{{ $t('site.name') }}</p>
      <h1 class="page__title">{{ $t('credits.title') }}</h1>

      <h2 class="mono sub">{{ $t('credits.maps') }}</h2>
      <p class="note">{{ $t('credits.mapsNote') }}</p>
      <dl class="list">
        <template v-for="m in MAPS" :key="m.url">
          <dt class="mono">{{ tl(m.body) }}</dt>
          <dd><a :href="m.url" target="_blank" rel="noopener">{{ m.credit }} ↗<span class="sr-only"> {{ $t('a11y.newTab') }}</span></a></dd>
        </template>
      </dl>

      <h2 class="mono sub">{{ $t('credits.data') }}</h2>
      <dl class="list">
        <template v-for="s in realSystems" :key="s.id">
          <dt class="mono">{{ tl(s.name) }}</dt>
          <dd>
            <a v-for="src in s.sources" :key="src.url" :href="src.url" target="_blank" rel="noopener" class="src">{{ src.label }} ↗<span class="sr-only"> {{ $t('a11y.newTab') }}</span></a>
          </dd>
        </template>
      </dl>

      <h2 class="mono sub">{{ $t('credits.objects') }}</h2>
      <p class="note">{{ $t('credits.objectsNote') }}</p>

      <h2 class="mono sub">{{ $t('credits.fonts') }}</h2>
      <p class="note">{{ $t('credits.fontsNote') }}</p>
      <p class="note">{{ $t('credits.code') }}</p>
    </div>
  </div>
</template>

<style scoped>
.page { position: fixed; inset: 0; overflow-y: auto; background: rgb(4 6 10 / 0.88); }
.page__inner { max-width: 56rem; padding: 8rem var(--gutter) 4rem; }
.page__title { margin: 0 0 3rem; font: 400 clamp(3rem, 7vw, 5rem)/1 var(--font-serif); }
.sub { margin: 3rem 0 1rem; font-weight: 400; color: var(--fg); }
.note { color: var(--muted); line-height: 1.6; margin: 0 0 1rem; max-width: 60ch; }
.list { display: grid; grid-template-columns: 12rem 1fr; margin: 0; }
.list dt, .list dd { margin: 0; padding: 0.8rem 0; border-top: 1px solid var(--line); }
.list dt { color: var(--faint); }
.list a { color: var(--fg-soft); text-decoration: none; line-height: 1.6; }
.list a:hover { color: var(--accent); }
.src { display: block; }
@media (max-width: 640px) { .list { grid-template-columns: 1fr; } .list dd { border-top: 0; padding-top: 0; } }
</style>
