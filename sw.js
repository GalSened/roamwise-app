// Traveling App SW — offline-first foundations
const VERSION = 'v1';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const TILE_CACHE = `tiles-${VERSION}`;

// Heuristics: tweak to your domains/routes
const isTile = (url) =>
  /tile|tiles|osm|maptiler|openstreetmap/i.test(url.host) ||
  /\/tiles\//.test(url.pathname);

const isAPI = (url) =>
  /\/api\/(route|weather|itinerary|search)/.test(url.pathname);

// Install: precache minimal shell if you have it; keep empty for now
self.addEventListener('install', (event) => {
  self.skipWaiting(); // we'll control activation via message too
  event.waitUntil(caches.open(STATIC_CACHE));
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => ![STATIC_CACHE, RUNTIME_CACHE, TILE_CACHE].includes(n))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

// Core strategies:
// 1) Static assets (JS/CSS/fonts): Cache-First
// 2) Map tiles: Stale-While-Revalidate
// 3) API JSON (route/weather/itinerary): Cache-Then-Network (race) fallback to cache

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only GET is cacheable
  if (req.method !== 'GET') return;

  // Static assets
  if (
    url.origin === location.origin &&
    /\.(?:js|css|woff2?|ttf|png|jpg|svg)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Tiles (external or /tiles/)
  if (isTile(url)) {
    event.respondWith(
      staleWhileRevalidate(req, TILE_CACHE, { maxAgeSeconds: 60 * 60 * 24 * 7 })
    );
    return;
  }

  // API JSON
  if (isAPI(url)) {
    event.respondWith(cacheThenNetwork(req, RUNTIME_CACHE));
    return;
  }
});

// Message channel for skipWaiting from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ---- helpers ----
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  cache.put(request, resp.clone()).catch(() => {});
  return resp;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((resp) => {
      cache.put(request, resp.clone()).catch(() => {});
      return resp;
    })
    .catch(() => cached || Response.error());
  return cached ? Promise.resolve(cached) : networkPromise;
}

async function cacheThenNetwork(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachePromise = cache.match(request);
  const networkPromise = fetch(request)
    .then((resp) => {
      cache.put(request, resp.clone()).catch(() => {});
      return resp;
    })
    .catch(() => null);

  // Race: prefer fast network; fallback to cache if offline
  return Promise.race([
    networkPromise.then((r) => r || cachePromise),
    new Promise((res) => setTimeout(async () => res(await cachePromise), 1200)),
  ]).then(
    (r) =>
      r ||
      new Response(JSON.stringify({ offline: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
  );
}
