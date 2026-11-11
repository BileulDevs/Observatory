<script setup lang="ts">
/**
 * 2D stand-in for a catalogue thumbnail: shown until the 3D miniature is ready, and kept when WebGL is missing.
 * Same compressed scale as the 3D view (data/scale.ts), so both match what opens on click.
 */
import { toStage } from '~/data/scale'
import { PALETTES, TYPE_PARAMS } from '~/engine/presets'
import type { PlanetarySystem } from '~/types/systems'

const props = defineProps<{ system: PlanetarySystem }>()

/** Half-width of the drawing area in viewBox units (the box is 2:1, like the 3D thumbnail it stands in for). */
const EXTENT = 180
/** Vertical squash of the orbits: sin of the view angle (~21° above the plane), matching the 3D thumbnail. */
const TILT = 0.36
/** Thumbnails turn this much slower than the 3D view, so nine of them side by side stay calm. */
const SLOWDOWN = 2.5
/** Minimum dot radius: tiny planets must stay visible at thumbnail size. */
const MIN_DOT = 2.5
const MIN_STAR = 5

const time = useClock()
const { star, bodies } = toStage(props.system)
const outer = bodies.reduce((m, b) => Math.max(m, b.orbit + b.radius), star.radius * 2)
const k = EXTENT / outer
const starColor = blackbodyHex(props.system.star.temperatureK)
const starR = Math.max(star.radius * k, MIN_STAR)

const planets = bodies.map((b) => {
  const data = props.system.planets.find((p) => p.id === b.id)
  const type = b.render.type
  const swatch = data?.swatch ?? b.render.palette?.[2] ?? PALETTES.natural[type][type === 'gas' ? 0 : 2]
  return {
    id: b.id,
    orbit: b.orbit * k,
    r: Math.max(b.radius * k, MIN_DOT),
    period: b.period * SLOWDOWN,
    phase: b.phase,
    swatch,
    rings: b.render.rings ?? TYPE_PARAMS[type].rings,
  }
})

const positions = computed(() => planets.map((p) => {
  const a = p.phase + (time.value / p.period) * Math.PI * 2
  // Behind the star (far half) when sin(a) > 0: drawn first so the star covers them.
  return { ...p, x: Math.cos(a) * p.orbit, y: Math.sin(a) * p.orbit * TILT, behind: Math.sin(a) > 0 }
}))
const back = computed(() => positions.value.filter((p) => p.behind))
const front = computed(() => positions.value.filter((p) => !p.behind))
const gradId = `glow-${props.system.id}`
</script>

<template>
  <svg class="thumb" viewBox="-200 -100 400 200" aria-hidden="true">
    <defs>
      <radialGradient :id="gradId">
        <stop offset="0" :stop-color="starColor" stop-opacity="0.55" />
        <stop offset="1" :stop-color="starColor" stop-opacity="0" />
      </radialGradient>
    </defs>
    <ellipse v-for="p in planets" :key="'o' + p.id" class="thumb__orbit" cx="0" cy="0" :rx="p.orbit" :ry="p.orbit * TILT" />
    <g v-for="p in back" :key="p.id">
      <ellipse v-if="p.rings" class="thumb__ring" :cx="p.x" :cy="p.y" :rx="p.r * 2.1" :ry="p.r * 0.7" />
      <circle :cx="p.x" :cy="p.y" :r="p.r" :fill="p.swatch" />
    </g>
    <circle cx="0" cy="0" :r="starR * 3.2" :fill="`url(#${gradId})`" />
    <circle cx="0" cy="0" :r="starR" :fill="starColor" />
    <g v-for="p in front" :key="p.id">
      <ellipse v-if="p.rings" class="thumb__ring" :cx="p.x" :cy="p.y" :rx="p.r * 2.1" :ry="p.r * 0.7" />
      <circle :cx="p.x" :cy="p.y" :r="p.r" :fill="p.swatch" />
    </g>
  </svg>
</template>

<style scoped>
.thumb { display: block; width: 100%; height: auto; overflow: visible; }
.thumb__orbit { fill: none; stroke: var(--fg); stroke-opacity: 0.16; stroke-width: 0.6; vector-effect: non-scaling-stroke; transition: stroke-opacity 0.3s; }
.thumb__ring { fill: none; stroke: #c9b38a; stroke-opacity: 0.8; stroke-width: 0.9; }
</style>
