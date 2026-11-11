/**
 * One shared animation clock (seconds) for lightweight 2D animations, such as the catalogue thumbnails.
 * A single requestAnimationFrame drives every subscriber; it stops when no component uses it, when the tab is
 * hidden (rAF pauses by itself), and never starts for prefers-reduced-motion.
 */
const time = ref(0)
let users = 0
let raf = 0
let last = 0

function tick(now: number): void {
  time.value += Math.min((now - last) / 1000, 0.1)
  last = now
  raf = requestAnimationFrame(tick)
}

export function useClock() {
  let subscribed = false
  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    subscribed = true
    users++
    if (users === 1) {
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
  })
  onBeforeUnmount(() => {
    if (!subscribed) return
    users--
    if (users === 0) cancelAnimationFrame(raf)
  })
  return time
}
