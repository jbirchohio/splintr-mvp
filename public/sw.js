/* global self, caches */
const CACHE_NAME = 'splintr-cache-v1'
const OFFLINE_URLS = [
  '/',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Fetch handler with tuned caching
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET') return

  const isImage = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(url.pathname)
  const isVideo = /\.(mp4|webm|m3u8|ts)$/i.test(url.pathname)
  const isApi = url.pathname.startsWith('/api/')

  if (isImage) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req)
        if (cached) {
          fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()) }).catch(()=>{})
          return cached
        }
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      })
    )
    return
  }

  if (isVideo || isApi) {
    event.respondWith(fetch(req).catch(() => caches.match(req)))
    return
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)))
})

// Message handler for caching URLs on demand (offline download)
self.addEventListener('message', (event) => {
  const { type, url } = event.data || {}
  if (type === 'cache-url' && url) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => fetch(url).then((res) => res.ok ? cache.put(url, res) : null))
    )
  }
})

// Web Push Notifications
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() || {} } catch { data = { title: 'Splintr', body: 'New notification' } }
  const title = data.title || 'Splintr'
  const options = {
    body: data.body || '',
    icon: '/vercel.svg',
    data: data.data || {}
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'
  event.waitUntil(self.clients.openWindow(target))
})
