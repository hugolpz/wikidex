import { createRouter, createWebHashHistory } from 'vue-router'
import { watch } from 'vue'
import GalleryView from '@/views/GalleryView.vue'
import SettingsView from '@/views/SettingsView.vue'
import { useSettingsStore } from '@/stores/settings'
import { checkWikipageExists } from '@/utils/fetchDatalist'
import i18n, { resolveLocale } from '@/i18n'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'gallery',
      component: GalleryView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
    {
      path: '/User::username',
      name: 'user',
      component: GalleryView,
    },
  ],
})

// Global navigation guard - runs BEFORE any route-specific guards
router.beforeEach(async (to, from) => {
  const settings = useSettingsStore()

  // Extract username from User route
  if (to.path.startsWith('/User:')) {
    const username = to.params.username?.replace(/:/g, '')
    if (username) {
      console.log('Global guard: Setting username from URL:', username)
      await settings.setUsername(username)
    }
  } else if (to.path === '/' && from.path.startsWith('/User:')) {
    // Navigating from user page to home - keep username in store but don't clear it
    console.log('Global guard: Navigating to home, keeping username:', settings.wikimediaUsername)
  }
})

/**
 * Navigate to user route with username validation and refresh
 * @param {string} username - The Wikimedia username
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function navigateToUser(username) {
  const trimmedUsername = username.trim()
  const settings = useSettingsStore()

  if (!trimmedUsername) {
    await settings.setUsername('')
    await router.push({ path: '/' })
    return { success: true }
  }

  const pageTitle = `User:${trimmedUsername}/WikiDex`
  const exists = await checkWikipageExists(pageTitle)

  if (exists) {
    await settings.setUsername(trimmedUsername)
    await router.push({ path: `/User:${trimmedUsername}` })
    return { success: true }
  } else {
    console.warn(`No datalist found for user: ${trimmedUsername}`)
    return {
      success: false,
      message: `No species list found for user "${trimmedUsername}"`,
    }
  }
}

/**
 * Update route based on current username in settings
 * @param {string} username - The current username
 */
export async function updateRouteForUsername(username) {
  if (username && username.trim() !== '') {
    await router.push({ path: `/User:${username}` })
  } else {
    await router.push({ path: '/' })
  }
}

// Watch settings.wikimediaUsername and sync route
// This ensures the URL updates when username changes from anywhere (e.g., SettingsView)
let isUpdatingFromRoute = false

router.afterEach(() => {
  // Prevent circular updates when route changes trigger settings updates
  isUpdatingFromRoute = true
  setTimeout(() => {
    isUpdatingFromRoute = false
  }, 100)
})

// Initialize watcher after router is ready
router.isReady().then(() => {
  const settings = useSettingsStore()

  // ?uselang= --> language (e.g. a link changed in place, back/forward). The other direction,
  // language --> URL, is done by LanguageSelect.
  watch(
    () => router.currentRoute.value.query.uselang,
    (value) => {
      const locale = resolveLocale(Array.isArray(value) ? value[0] : value)
      if (locale && locale !== i18n.global.locale.value) i18n.global.locale.value = locale
    },
  )

  watch(
    () => settings.wikimediaUsername,
    async (newUsername) => {
      // Prevent circular updates
      if (isUpdatingFromRoute) return

      // Get current route path
      const currentPath = router.currentRoute.value.path

      // Determine target path
      const targetPath = newUsername && newUsername.trim() !== '' ? `/User:${newUsername}` : '/'

      // Only navigate if path actually changed
      if (currentPath !== targetPath) {
        console.log(`Username changed to: ${newUsername}, updating route to: ${targetPath}`)
        await updateRouteForUsername(newUsername)
      }
    },
  )
})

export default router
