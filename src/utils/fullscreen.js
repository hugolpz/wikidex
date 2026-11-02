import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Fullscreen mode, set by the `?fullscreen` URL parameter (`?fullscreen=0|false|off` disables it).
 * It hides the top bar, filters and footer, and puts the page in browser fullscreen.
 * @returns {import('vue').ComputedRef<boolean>}
 */
export function useFullscreenParam() {
  const route = useRoute()
  return computed(() => {
    const value = route.query.fullscreen
    return value !== undefined && !['0', 'false', 'off'].includes(String(value))
  })
}

/**
 * Drives the browser Fullscreen API for the `?fullscreen` mode (call once, from App.vue).
 *
 * Browsers only allow fullscreen after a user gesture, so a page opened with `?fullscreen`
 * asks for it on the first click, tap or key press (`needsGesture` tells the UI to show a
 * hint). Leaving fullscreen (Esc, browser UI or `exit()`) also leaves the mode, by removing
 * the parameter. Where the API doesn't exist (iPhone Safari), only the chrome is hidden.
 *
 * @param {import('vue').ComputedRef<boolean>} active - from useFullscreenParam()
 */
export function useFullscreenControl(active) {
  const route = useRoute()
  const router = useRouter()
  const supported = typeof document.documentElement.requestFullscreen === 'function'
  const isFullscreen = ref(!!document.fullscreenElement)
  let wasFullscreen = false

  const needsGesture = computed(() => active.value && supported && !isFullscreen.value)

  const request = () =>
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})

  function removeParam() {
    const query = { ...route.query }
    delete query.fullscreen
    router.replace({ query })
  }

  function exit() {
    wasFullscreen = false
    removeParam()
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }

  function onFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement
    if (isFullscreen.value) wasFullscreen = true
    else if (wasFullscreen && active.value) exit() // left with Esc or the browser UI
  }

  function onGesture(event) {
    if (event.target.closest?.('.fullscreen-exit')) return
    if (active.value && supported && !document.fullscreenElement) request()
  }

  // Param removed by hand while fullscreen: leave fullscreen too
  watch(active, (on) => {
    if (!on && document.fullscreenElement) {
      wasFullscreen = false
      document.exitFullscreen().catch(() => {})
    }
  })

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('pointerdown', onGesture, true)
    window.addEventListener('keydown', onGesture, true)
    if (active.value && supported) request() // works only if the browser accepts it without a gesture
  })
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    window.removeEventListener('pointerdown', onGesture, true)
    window.removeEventListener('keydown', onGesture, true)
  })

  return { needsGesture, exit }
}
