<script setup lang="ts">
/**
 * "How it's made" as a sheet over the home page. It scrolls on its own; pulling up past its top (wheel or touch)
 * lowers it a little as feedback and, past a threshold, closes it, returning to the observatory as it was.
 * It also closes with its close button and Escape. A dialog: focus moves into it on open and back on close.
 */
const emit = defineEmits<{ close: [] }>()

/** Pull distance, px of sheet travel, that closes the sheet. Lower = easier to close by accident. */
const PULL_CLOSE_PX = 120
/** Wheel delta to sheet travel. Wheel deltas are large (100 per notch on most mice): this keeps a notch ~25 px. */
const WHEEL_TO_PULL = 0.25
/** Finger travel to sheet travel: under 1, the sheet resists, which reads as "pulling" rather than "dragging". */
const TOUCH_TO_PULL = 0.6
/** Without a new wheel event for this long, a partial pull springs back. */
const WHEEL_IDLE_MS = 160
/**
 * After a scroll reaches the top, wheel events are ignored as pulls for this long. Trackpads keep sending momentum
 * after the finger lifts: without this, flicking up to the top of the text would also close the sheet.
 */
const MOMENTUM_GUARD_MS = 350
/** Lines and pages to pixels, for wheels that report in those units (Firefox with some mice). */
const LINE_PX = 16

const scroller = ref<HTMLElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)
const pull = ref(0)
const dragging = ref(false)
let atTopSince = 0
let wheelTimer: ReturnType<typeof setTimeout> | undefined
let touchStartY: number | null = null
let returnFocus: HTMLElement | null = null

function onScroll(): void {
  const el = scroller.value
  if (!el) return
  if (el.scrollTop <= 0) {
    if (!atTopSince) atTopSince = performance.now()
  } else {
    atTopSince = 0
  }
}

function settle(): void {
  if (pull.value >= PULL_CLOSE_PX) emit('close')
  else pull.value = 0
  dragging.value = false
}

function onWheel(e: WheelEvent): void {
  const el = scroller.value
  if (!el) return
  const dy = e.deltaY * (e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? el.clientHeight : 1)
  if (dy >= 0 || el.scrollTop > 0) {
    // Scrolling down, or still inside the text: no pull, and any partial one is undone.
    if (pull.value) pull.value = 0
    return
  }
  if (!atTopSince || performance.now() - atTopSince < MOMENTUM_GUARD_MS) return
  dragging.value = true
  pull.value = Math.min(pull.value - dy * WHEEL_TO_PULL, PULL_CLOSE_PX * 1.5)
  clearTimeout(wheelTimer)
  if (pull.value >= PULL_CLOSE_PX) {
    settle()
    return
  }
  wheelTimer = setTimeout(settle, WHEEL_IDLE_MS)
}

function onTouchStart(e: TouchEvent): void {
  const el = scroller.value
  touchStartY = el && el.scrollTop <= 0 ? e.touches[0]!.clientY : null
}

function onTouchMove(e: TouchEvent): void {
  if (touchStartY === null) return
  const dy = e.touches[0]!.clientY - touchStartY
  if (dy <= 0) {
    // Finger going up: an ordinary scroll of the text. Stop treating this touch as a pull.
    touchStartY = null
    pull.value = 0
    return
  }
  // Pulling down at the top: the sheet follows instead of the page bouncing.
  e.preventDefault()
  dragging.value = true
  pull.value = dy * TOUCH_TO_PULL
}

function onTouchEnd(): void {
  if (touchStartY === null && !pull.value) return
  touchStartY = null
  settle()
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  returnFocus = document.activeElement as HTMLElement | null
  // The listener must not be passive: a pull at the top cancels the touch's own scroll (see onTouchMove).
  scroller.value?.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('keydown', onKey)
  atTopSince = performance.now()
  closeBtn.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  clearTimeout(wheelTimer)
  scroller.value?.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('keydown', onKey)
  returnFocus?.focus?.({ preventScroll: true })
})
</script>

<template>
  <div
    class="sheet interactive"
    :class="{ 'is-dragging': dragging }"
    role="dialog"
    aria-modal="true"
    aria-labelledby="how-title"
    :style="{ transform: pull ? `translateY(${pull}px)` : undefined }"
  >
    <div class="sheet__bar">
      <span class="sheet__handle" aria-hidden="true" />
      <p class="sheet__hint">{{ $t('how.pullHint') }}</p>
      <button ref="closeBtn" type="button" class="sheet__close" :aria-label="$t('how.close')" @click="emit('close')">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
    <div ref="scroller" class="sheet__scroll" @scroll.passive="onScroll" @wheel.passive="onWheel" @touchstart.passive="onTouchStart" @touchend="onTouchEnd" @touchcancel="onTouchEnd">
      <div class="sheet__inner">
        <HowItsMade title-id="how-title" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Leaves a strip of the observatory visible at the top, so it reads as a layer that can be put away.
 * Opaque on purpose: even at 97 % the home page's name and buttons showed through and muddied the text. (The home
 * page's phone sheet must stay below 100 % because the 3D keeps drawing under it; here the 3D is paused.)
 */
.sheet { position: fixed; left: 0; right: 0; top: 4.5rem; bottom: 0; z-index: 10; display: flex; flex-direction: column; border-top: 1px solid var(--line); border-radius: 10px 10px 0 0; background: var(--bg); box-shadow: 0 -12px 40px rgb(0 0 0 / 0.5); transition: transform 0.3s var(--ease-out); }
/* While the pointer or finger pulls, the sheet follows it directly; the transition only animates the release. */
.sheet.is-dragging { transition: none; }
.sheet__bar { position: relative; display: flex; align-items: center; justify-content: center; min-height: 3rem; padding: 0 var(--gutter); }
.sheet__handle { position: absolute; top: 0.6rem; left: 50%; width: 2.5rem; height: 4px; margin-left: -1.25rem; border-radius: 2px; background: var(--line); }
.sheet__hint { margin: 0.6rem 0 0; font-size: 0.8125rem; color: var(--faint); }
.sheet__close { position: absolute; right: var(--gutter); top: 0.4rem; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; border: 1px solid var(--line); border-radius: 2px; background: transparent; color: var(--fg); cursor: pointer; }
.sheet__close:hover { border-color: var(--fg); }
/* contain: reaching the top must not scroll or bounce anything behind the sheet. */
.sheet__scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
.sheet__inner { padding: 1.5rem var(--gutter) 4rem; }
@media (max-width: 640px) { .sheet { top: 3.5rem; } .sheet__hint { display: none; } }
</style>
