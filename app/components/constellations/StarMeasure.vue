<script setup lang="ts">
/**
 * The two-star measurement: the selected pair, their true separation in space and how it compares with what
 * the sky suggests. Slots can be cleared one by one; a third click on the map replaces the second star.
 */
import type { ConstellationStar } from '~/types/constellations'
import { angularSeparation, spatialSeparation } from '~/utils/astro'

const props = defineProps<{ a: ConstellationStar | null; b: ConstellationStar | null }>()
const emit = defineEmits<{ clear: [slot: 'a' | 'b' | 'both']; focus: [hip: number] }>()
const { num } = useLocalized()

const name = (s: ConstellationStar) => s.name ?? s.designation
const angle = computed(() => (props.a && props.b ? angularSeparation(props.a.ra, props.a.dec, props.b.ra, props.b.dec) : null))
const separation = computed(() => {
  const { a, b } = props
  if (!a || !b || a.distLy === null || b.distLy === null || angle.value === null) return null
  return spatialSeparation(a.distLy, b.distLy, angle.value)
})
/** How much nearer to each other the two stars look than they are: the "depth" illusion in one number. */
const ratio = computed(() => {
  const { a, b } = props
  if (!a || !b || separation.value === null || angle.value === null) return null
  const apparent = Math.min(a.distLy!, b.distLy!) * Math.sin((angle.value * Math.PI) / 180)
  return apparent > 0 ? separation.value / apparent : null
})
</script>

<template>
  <section class="measure" :aria-label="$t('constellations.measure.title')">
    <header class="measure__head mono">
      <span>{{ $t('constellations.measure.title') }}</span>
      <button v-if="a || b" type="button" class="link" @click="emit('clear', 'both')">{{ $t('constellations.measure.reset') }}</button>
    </header>
    <ol class="slots mono">
      <li class="slot slot--a">
        <span class="slot__dot" aria-hidden="true" />
        <button v-if="a" type="button" class="slot__name" @click="emit('focus', a.hip)">{{ name(a) }}</button>
        <span v-else class="slot__empty">{{ $t('constellations.measure.pickFirst') }}</span>
        <button v-if="a" type="button" class="link" :aria-label="$t('constellations.measure.remove')" @click="emit('clear', 'a')">×</button>
      </li>
      <li class="slot slot--b">
        <span class="slot__dot" aria-hidden="true" />
        <button v-if="b" type="button" class="slot__name" @click="emit('focus', b.hip)">{{ name(b) }}</button>
        <span v-else class="slot__empty">{{ a ? $t('constellations.measure.pickSecond') : '—' }}</span>
        <button v-if="b" type="button" class="link" :aria-label="$t('constellations.measure.remove')" @click="emit('clear', 'b')">×</button>
      </li>
    </ol>
    <template v-if="a && b">
      <p v-if="separation !== null" class="measure__value">
        {{ $t('constellations.measure.value', { d: num(separation, separation < 100 ? 1 : 0) }) }}
      </p>
      <p v-else class="measure__note">{{ $t('constellations.measure.unknown') }}</p>
      <dl class="measure__facts mono">
        <dt>{{ $t('constellations.measure.angle') }}</dt><dd>{{ num(angle ?? 0, 2) }}°</dd>
        <template v-if="a.distLy !== null && b.distLy !== null">
          <dt>{{ $t('constellations.measure.depth') }}</dt><dd>{{ $t('objects.units.ly', { v: num(Math.abs(a.distLy - b.distLy), 0) }) }}</dd>
        </template>
        <template v-if="separation !== null">
          <dt>{{ $t('constellations.measure.light') }}</dt><dd>{{ $t('constellations.measure.years', { n: num(separation, 0) }) }}</dd>
        </template>
      </dl>
      <p v-if="ratio !== null && ratio > 1.5" class="measure__note">{{ $t('constellations.measure.illusion', { r: num(ratio, 0) }) }}</p>
      <p class="measure__note">{{ $t('constellations.measure.method') }}</p>
    </template>
    <p v-else class="measure__note">{{ $t('constellations.measure.howto') }}</p>
  </section>
</template>

<style scoped>
.measure { margin: 1.4rem 0; padding: 1rem 0 0.4rem; border-top: 1px solid var(--line); }
.measure__head { display: flex; justify-content: space-between; color: var(--fg); margin-bottom: 0.7rem; }
.link { appearance: none; background: none; border: 0; padding: 0 0.2rem; color: var(--muted); cursor: pointer; font: inherit; letter-spacing: inherit; text-transform: inherit; }
.link:hover { color: var(--fg); }
.slots { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
.slot { display: flex; align-items: center; gap: 0.7rem; }
.slot__dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; border: 1.5px solid; flex: none; }
.slot--a .slot__dot { border-color: #e8c27a; }
.slot--b .slot__dot { border-color: #7fd6e8; }
.slot__name { appearance: none; background: none; border: 0; padding: 0; color: var(--fg); cursor: pointer; font: inherit; letter-spacing: 0.02em; text-transform: none; flex: 1; text-align: left; }
.slot__empty { color: var(--faint); flex: 1; text-transform: none; letter-spacing: 0.02em; }
.measure__value { margin: 1rem 0 0.4rem; font: 400 2rem/1.1 var(--font-serif); color: #7fd6e8; }
.measure__facts { display: grid; grid-template-columns: auto 1fr; margin: 0.4rem 0; font-size: 0.75rem; }
.measure__facts dt, .measure__facts dd { margin: 0; padding: 0.35rem 0; border-top: 1px solid var(--line); }
.measure__facts dt { color: var(--faint); padding-right: 1rem; }
.measure__facts dd { text-align: right; text-transform: none; font-variant-numeric: tabular-nums; }
.measure__note { margin: 0.5rem 0; color: var(--faint); font-size: 0.8rem; line-height: 1.55; }
</style>
