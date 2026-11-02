const CACHE_NAME = 'wikidex-v2'

// Determine base path from the service worker's location
const BASE_PATH = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1)

const STATIC_CACHE_URLS = [
  `${BASE_PATH}`,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}404.html`,
  `${BASE_PATH}assets/logo-192.png`,
  `${BASE_PATH}assets/logo-512.png`,
  `${BASE_PATH}assets/github.svg`,
  `${BASE_PATH}assets/wikidata.svg`,
  `${BASE_PATH}assets/wikipedia.svg`,
  `${BASE_PATH}assets/gbif.svg`,
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing', 'BASE_PATH:', BASE_PATH)
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets with BASE_PATH:', BASE_PATH)
        // Cache files individually to identify failures
        return Promise.all(
          STATIC_CACHE_URLS.map((url) =>
            cache.add(url).catch((error) => {
              console.warn('Failed to cache:', url, error)
            }),
          ),
        )
      })
      .catch((error) => {
        console.error('Error during install:', error)
      }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip external API requests (let them go to network)
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  // Never cache the same-origin GBIF proxy
  if (url.pathname.startsWith('/gbif/')) {
    return
  }

  // Pages (index.html): network first, so a new deployment is picked up right away.
  // The cache is only the offline fallback. Hashed /assets/* files below stay cache-first.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() =>
          caches
            .match(event.request)
            .then(
              (cached) =>
                cached ||
                caches.match(`${BASE_PATH}index.html`) ||
                caches.match(`${BASE_PATH}404.html`),
            ),
        ),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        console.log('Serving from cache:', event.request.url)
        return response
      }

      // Otherwise fetch from network
      console.log('Fetching from network:', event.request.url)
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clone the response since it can only be consumed once
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch((error) => {
          console.error('Fetch failed:', error)

          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(`${BASE_PATH}index.html`).then((response) => {
              return response || caches.match(`${BASE_PATH}404.html`) || caches.match(BASE_PATH)
            })
          }

          throw error
        })
    }),
  )
})

// Background sync for offline actions (optional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered')
    // Handle offline data synchronization here
  }
})

// Push notifications (optional)
self.addEventListener('push', (event) => {
  console.log('Push notification received')

  const options = {
    body: event.data ? event.data.text() : 'New content available!',
    icon: `${BASE_PATH}assets/logo-192.png`,
    badge: `${BASE_PATH}assets/logo-96.png`,
    vibrate: [200, 100, 200],
    tag: 'wikidex-notification',
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: `${BASE_PATH}assets/logo-96.png`,
      },
      {
        action: 'close',
        title: 'Close',
        icon: `${BASE_PATH}assets/logo-96.png`,
      },
    ],
  }

  event.waitUntil(self.registration.showNotification('WikiDex', options))
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked')
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    event.waitUntil(self.clients.openWindow(BASE_PATH))
  }
})
