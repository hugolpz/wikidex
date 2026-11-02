import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import i18n from './i18n'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(router)
app.mount('#app')

// Service Worker for PWA: production only. In dev it would cache Vite's modules and keep
// serving an old version of the app, so any worker left from earlier is removed.
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister())
  })
  caches.keys().then((names) => names.forEach((name) => caches.delete(name)))
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker
      .register(swPath)
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope)

        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('New service worker available')
        })
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
  })
}

// PWA Install Prompt
let deferredPrompt
window.addEventListener('beforeinstallprompt', (event) => {
  console.log('PWA install prompt available')
  event.preventDefault()
  deferredPrompt = event

  // Show custom install button or banner
  showInstallPromotion()
})

function showInstallPromotion() {
  // You can add a custom install button or banner here
  console.log('App can be installed')
}

// Show install prompt when user clicks install button
window.showInstallPrompt = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)
    deferredPrompt = null
  }
}

// Track app installation
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed successfully')
  deferredPrompt = null
})
