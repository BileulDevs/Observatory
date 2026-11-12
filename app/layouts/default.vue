<script setup lang="ts">
/** App shell: skip link, persistent 3D layer, header, and the page as an overlay above the canvas. */
const { status } = useSpace()
// Without JavaScript nothing would ever load: drop the loading screen. In the head, as a <noscript> style: a
// <noscript> in the body is re-created by Vue's hydration, and its <style> then applies with scripts on.
useHead({ noscript: [{ innerHTML: '<style>.boot { display: none !important; }</style>' }] })
</script>

<template>
  <div class="shell">
    <a class="skip-link" href="#main">{{ $t('a11y.skip') }}</a>
    <!-- ClientOnly rather than a .client.vue file: with the suffix, onMounted runs before the canvas exists during hydration. -->
    <ClientOnly><SpaceCanvas /></ClientOnly>
    <!-- Server-rendered so it covers the very first paint (hidden without JavaScript: see useHead below). -->
    <LoadingScreen />
    <SiteHeader />
    <main id="main" class="shell__main" tabindex="-1">
      <slot />
    </main>
    <p v-if="status === 'unsupported' || status === 'error'" class="shell__fallback mono" role="status">
      {{ status === 'unsupported' ? $t('space.unsupported') : $t('space.error') }}
    </p>
  </div>
</template>

<style scoped>
.shell { position: relative; min-height: 100svh; }
/* The page floats above the canvas but lets pointer events through, except on its own controls. */
.shell__main { position: relative; z-index: 1; outline: none; pointer-events: none; }
.shell__main :deep(.interactive) { pointer-events: auto; }
.shell__fallback { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); color: var(--muted); z-index: 1; text-align: center; max-width: 30rem; }
</style>
