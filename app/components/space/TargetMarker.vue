<script setup lang="ts">
/**
 * Survey-style target over the 3D scene: corner brackets around the point, a leader line, a code ("Marker 01")
 * and a precise readout. Shared by the observatory's surface marker and the exploit hotspots. Positioned by its
 * parent (CSS pixels of the canvas); decorative only, so it is hidden from assistive technology.
 */
withDefaults(defineProps<{
  x: number
  y: number
  /** First line ("Marker 01"); left out when the marker needs no number (a single target). */
  code?: string
  /** Second line: what is marked. */
  title?: string
  /** Third line: a measured value or coordinates. */
  readout?: string
  /** Text shown (otherwise only the brackets). */
  open?: boolean
  /** Highlighted (selected or hovered). */
  active?: boolean
  /** Text on the left of the target (for targets on the left of a cluster, so labels do not overlap). */
  flip?: boolean
}>(), { code: '', title: '', readout: '', open: true, active: false, flip: false })
</script>

<template>
  <div class="target mono" :class="{ 'is-open': open, 'is-active': active, 'is-flip': flip }" :style="{ transform: `translate(${x - 13}px, ${y - 13}px)` }" aria-hidden="true">
    <svg class="target__mark" width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1">
      <path d="M1 7V1h6M19 1h6v6M25 19v6h-6M7 25H1v-6" /><circle cx="13" cy="13" r="1.5" fill="currentColor" stroke="none" />
    </svg>
    <span class="target__lead" />
    <span class="target__txt">
      <!-- One block per line, so a missing line leaves no blank (a leading <br> did). -->
      <b v-if="code" class="target__line">{{ code }}</b>
      <span v-if="title" class="target__line target__title">{{ title }}</span>
      <span v-if="readout" class="target__line target__readout">{{ readout }}</span>
    </span>
  </div>
</template>

<style scoped>
.target { position: absolute; left: 0; top: 0; display: flex; align-items: center; color: var(--accent); will-change: transform; }
.target__mark { flex: none; transition: transform 0.25s var(--ease-out); }
.target.is-active .target__mark { transform: scale(1.25); }
.target__lead, .target__txt { opacity: 0; transition: opacity 0.25s; }
.target.is-open .target__lead, .target.is-open .target__txt, .target.is-active .target__lead, .target.is-active .target__txt { opacity: 1; }
/* No opacity here: it would override the hidden state above and leave a bare line beside every closed target. */
.target__lead { width: 46px; height: 1px; background: currentColor; margin-left: 2px; }
.target.is-open .target__lead, .target.is-active .target__lead { opacity: 0.6; }
.target__txt { padding-left: 10px; white-space: nowrap; line-height: 1.6; font-size: 0.68rem; text-shadow: 0 1px 6px rgb(0 0 0 / 0.9); }
.target__txt b { font-weight: 500; color: var(--fg); }
.target.is-flip { flex-direction: row-reverse; transform-origin: right center; }
/* Flipped: the box is laid out right to left, so its right edge (not its left) must sit on the point. */
.target.is-flip { translate: calc(-100% + 26px) 0; }
.target.is-flip .target__lead { margin: 0 2px 0 0; }
.target.is-flip .target__txt { padding: 0 10px 0 0; text-align: right; }
.target__line { display: block; }
.target__title { color: var(--fg); text-transform: none; letter-spacing: 0.03em; }
.target__readout { color: var(--muted); text-transform: none; letter-spacing: 0.03em; }
</style>
