<script setup lang="ts">
/**
 * Stroke icons for the home tool strip and buttons, drawn in currentColor so they follow the text colour.
 * Decorative only: every button carrying one also has a visible text label.
 */
export type ToolIconName = 'class' | 'style' | 'sun' | 'relief' | 'quality' | 'recenter' | 'pause' | 'play' | 'dice' | 'link'
defineProps<{ name: ToolIconName }>()
</script>

<template>
  <svg class="icon" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <template v-if="name === 'class'"><circle cx="12" cy="12" r="6" /><path d="M3 15c3 2.5 15-1 18-6" /></template>
    <template v-else-if="name === 'style'"><path d="M12 4l9 5-9 5-9-5z" /><path d="M3 14l9 5 9-5" /></template>
    <template v-else-if="name === 'sun'"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" /></template>
    <template v-else-if="name === 'relief'"><path d="M3 18l6-9 4 6 3-4 5 7z" /></template>
    <template v-else-if="name === 'quality'"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 12h16M12 4v16" /></template>
    <template v-else-if="name === 'recenter'"><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></template>
    <template v-else-if="name === 'pause'"><path d="M9 6v12M15 6v12" /></template>
    <template v-else-if="name === 'play'"><path d="M8 5.5v13l11-6.5z" /></template>
    <template v-else-if="name === 'link'"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></template>
    <template v-else><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" /><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" /></template>
  </svg>
</template>

<style scoped>
.icon { flex: none; display: block; }
</style>
