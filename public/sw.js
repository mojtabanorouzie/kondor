/**
 * Kondor service worker — installed from +html.tsx on web.
 *
 * Strategy:
 *  - Network-first for API calls (/sync, /auth) so fresh data is always preferred.
 *  - Cache-first for all other GET requests (JS bundles, fonts, images) so the
 *    app shell and assets load instantly and work offline.
 *  - Offline fallback: serve the cached root document for navigation requests.
 */

const CACHE_NAME = 'kondor-v1';

/**
 * App base path, derived from where this worker is served. Under GitHub Pages
 * the worker lives at /kondor/sw.js, so BASE === '/kondor/'; at the domain root
 * it is '/'. Keeping the shell URLs relative to BASE lets the same worker run
 * at any subpath without hard-coding it.
 */
const BASE = self.location.pathname.replace(/sw\.js$/, '');

/** URL prefixes that should always go to the network first. */
const NETWORK_FIRST_PATTERNS = ['/sync', '/auth', '/health'];

// ── Install: pre-cache the app shell ────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        BASE,
        BASE + 'index.html',
      ]).catch(() => {
        // Non-fatal if index.html isn't available at install time (first build).
      }),
    ),
  );
});

// ── Activate: purge stale caches ────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Fetch: apply routing strategy ───────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept same-origin or API GET requests; pass through everything else.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Network-first for API calls.
  const isApi = NETWORK_FIRST_PATTERNS.some((p) => url.pathname.startsWith(p));
  if (isApi) {
    event.respondWith(
      fetch(request).catch(() => new Response('', { status: 503 })),
    );
    return;
  }

  // Cache-first for static assets; store successful responses for offline use.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Only cache successful, opaque-free responses from the same origin.
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: return cached root for navigation requests.
          if (request.mode === 'navigate') {
            return caches.match(BASE) ?? new Response('', { status: 503 });
          }
          return new Response('', { status: 503 });
        });
    }),
  );
});
