import { LOCALE_STORAGE_KEY, pickLocale } from '~/utils/locale'

/**
 * Picks the visitor's language once the app is hydrated: their saved choice first, else the browser's preferred
 * languages, else English. Done after hydration on purpose: the static HTML is English, and switching before
 * would make the first client render differ from it (hydration mismatch). On a first load the loading screen
 * covers the switch.
 */
export default defineNuxtPlugin((nuxtApp) => {
  let done = false
  // app:suspense:resolve, not app:mounted: async pages hydrate after mount, and switching while they hydrate
  // still produces mismatches. This hook fires once hydration has fully completed (and again on navigations).
  nuxtApp.hook('app:suspense:resolve', () => {
    if (done) return
    done = true
    const i18n = nuxtApp.$i18n
    let saved: string | null = null
    try {
      saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    } catch {
      // Storage blocked (privacy modes): fall back to the browser languages.
    }
    const wanted = pickLocale(saved, navigator.languages ?? [navigator.language])
    if (wanted !== i18n.locale.value) void i18n.setLocale(wanted)
  })
})
