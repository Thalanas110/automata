/**
 * AutomataStudio Service Worker
 *
 * Caching strategy:
 *  - Navigation (HTML)  → NetworkFirst (3 s timeout) → cached shell
 *  - Static assets      → CacheFirst (hashed filenames never change)
 *  - Google Fonts CSS   → StaleWhileRevalidate
 *  - Google Fonts files → CacheFirst (1 year)
 *  - AI / server fns    → NetworkOnly  (/_server/*, /_api/*)  ← intentionally no cache
 *  - Everything else    → NetworkFirst → cache
 */

const CACHE = 'automata-studio-v1'

// Patterns for routes that MUST go to the network (AI assistant & server API).
// If offline, these will fail gracefully in the UI.
const NETWORK_ONLY = [/^\/_server(\/|$)/, /^\/_api(\/|$)/]

// ─── Lifecycle ───────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        // Delete all previous cache versions
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET — let POST/PUT/DELETE etc. pass through untouched
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // ── AI / server function routes → always network, never cache ────────────
  if (NETWORK_ONLY.some((p) => p.test(url.pathname))) return

  // ── Google Fonts CSS → stale-while-revalidate ─────────────────────────────
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // ── Google Fonts files → cache-first (immutable) ──────────────────────────
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request))
    return
  }

  // ── Hashed static assets (JS / CSS / images in /assets/) → cache-first ───
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // ── Navigation (HTML pages) → network-first, fall back to cache ───────────
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  // ── Everything else → network-first with cache fallback ───────────────────
  event.respondWith(networkFirst(request))
})

// ─── Strategy helpers ────────────────────────────────────────────────────────

/** Try network (3 s timeout). On failure, return the last cached response. */
async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetchWithTimeout(request, 3000)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? Response.error()
  }
}

/** Try network first; fall back to cache. Cache successful responses. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) ?? Response.error()
  }
}

/** Serve from cache immediately; revalidate in the background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone())
    return response
  })
  return cached ?? networkPromise
}

/** Serve from cache if available; otherwise fetch and cache. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

/** fetch() with a millisecond timeout that rejects on expiry. */
function fetchWithTimeout(request, ms) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SW fetch timeout')), ms),
    ),
  ])
}
