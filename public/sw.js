// Service Worker for חיבור וניתוק בקליק
// Handles push notifications and offline caching

const CACHE_NAME = 'nituk-v4'   // bump this to clear old caches on all devices
const STATIC_CACHE = 'nituk-static-v4'
const OFFLINE_URL = '/'

// Only pre-cache the bare minimum
const PRECACHE_ASSETS = [
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_ASSETS))
  )
  self.skipWaiting()  // activate immediately, don't wait for old SW to die
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())   // take control of all open tabs
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API calls → always network, never cache
  if (url.pathname.startsWith('/api/')) return

  // Next.js immutable static assets (_next/static/) → cache-first
  // These have content-hashed names so caching is safe
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(request)
        if (cached) return cached
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      })
    )
    return
  }

  // HTML pages (/, /admin, etc.) → network-first so users always get fresh code
  // Fall back to cache only when offline
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(request, clone))
        }
        return res
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL)))
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try { data = event.data.json() }
  catch { data = { title: 'הודעה חדשה', body: event.data.text() } }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    dir: 'rtl',
    lang: 'he',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'פתח' },
      { action: 'close', title: 'סגור' },
    ],
    tag: data.tag || 'nituk-notification',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'חיבור וניתוק בקליק', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') return

  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-pending-messages') {
    event.waitUntil(sendPendingMessages())
  }
})

async function sendPendingMessages() {
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE' })
  })
}
