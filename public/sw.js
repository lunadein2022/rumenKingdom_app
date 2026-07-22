/* global self, caches, URL, fetch, Response */
const CACHE_NAME = 'rumen-web-v1'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/assets/favicon.png', '/assets/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event)
  event.waitUntil(self.registration.showNotification(payload.title || '루멘왕국 왕실 알림', {
    body: payload.body || '새 소식이 도착했어요.',
    icon: '/assets/apple-touch-icon.png',
    badge: '/assets/favicon.png',
    data: { path: payload.path || '/notifications' },
    tag: payload.tag || undefined,
  }))
})

function readPushPayload(event) {
  try { return event.data?.json() ?? {} } catch { return { body: event.data?.text() ?? '' } }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destination = new URL(event.notification.data?.path || '/notifications', self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.location.origin))
    if (existing) { existing.navigate(destination); return existing.focus() }
    return self.clients.openWindow(destination)
  }))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/.netlify/functions/')) return
  if (request.headers.has('authorization')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || Response.error())),
    )
    return
  }

  if (!['style', 'script', 'image', 'font'].includes(request.destination)) return
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached || Response.error())
      return cached || network
    }),
  )
})
