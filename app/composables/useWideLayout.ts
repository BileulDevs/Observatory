/** The breakpoint where side panels become bottom sheets (same value as the pages' CSS). */
export const WIDE_LAYOUT_QUERY = '(min-width: 900px)'

/**
 * Whether the wide (side panel) layout applies, kept up to date while the window is resized. The 3D subject is
 * placed beside or above the panel depending on it: pages watch this to move the subject when the layout flips,
 * instead of keeping the placement chosen when the page opened. False during SSR and before mount.
 */
export function useWideLayout(query = WIDE_LAYOUT_QUERY) {
  const wide = ref(false)
  let mq: MediaQueryList | null = null
  const update = () => { wide.value = mq?.matches ?? false }
  onMounted(() => {
    mq = window.matchMedia(query)
    update()
    mq.addEventListener('change', update)
  })
  onBeforeUnmount(() => mq?.removeEventListener('change', update))
  return wide
}
