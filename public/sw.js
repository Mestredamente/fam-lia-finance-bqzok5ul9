/* Família Finance — Service Worker
 *
 * Caching strategy:
 *   - HTML navigations: Network First (fallback to cache, then offline.html)
 *   - Same-origin static assets (JS/CSS/fonts/images): Cache First, then network
 *     (and populate cache on miss)
 *   - PocketBase API calls (/api/, Realtime WebSocket): Network Only — never
 *     cached, never intercepted beyond a straight pass-through. This keeps
 *     auth and live data working normally while online.
 *
 * Background Sync: on 'sync-transactions' the SW asks every controlled client
 * to flush its offline transaction queue. The actual PocketBase writes happen
 * client-side (the SW has no access to the auth token), so this is a trigger.
 */
const CACHE_NAME = 'familia-finance-v7'
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/icon.svg', '/offline.html']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {})),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

// Background Sync: the browser fires this when connectivity is restored after
// a failed register('sync', ...) — the SW pings clients to flush their queues.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(notifyClientsToFlush())
  }
})

async function notifyClientsToFlush() {
  const clientList = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clientList) {
    client.postMessage({ type: 'ff-flush-offline-queue' })
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  const sameOrigin = url.origin === self.location.origin

  // ---- PocketBase API & realtime: Network Only (no cache) ----
  // The backend lives on the same origin under /api/, /realtime and on the
  // configured VITE_POCKETBASE_URL origin. We never want stale auth/data.
  const isApi =
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/realtime') ||
    url.pathname.startsWith('/_/') ||
    !sameOrigin // cross-origin (PocketBase host, CDN) — pass straight through

  if (isApi) {
    // Let the request go to the network untouched. If offline, it just fails
    // and the app handles the error / uses cached data it stored itself.
    return
  }

  // ---- HTML navigations: Network First ----
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const clone = response.clone()
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(req, clone))
            .catch(() => {})
          return response
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached || caches.match('/index.html'))
            .then((cached) => cached || caches.match('/offline.html')),
        ),
    )
    return
  }

  // ---- Static assets (same-origin GET): Cache First, fallback to network ----
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone()
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(req, clone))
              .catch(() => {})
          }
          return response
        })
        .catch(() => caches.match('/offline.html'))
    }),
  )
})
