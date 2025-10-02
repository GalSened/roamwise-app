// sw.js
const VERSION = 'rw-sw-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/app-main.js',
  '/src/lib/api.js',
  '/src/lib/cache.js',
  '/src/lib/idb.js',
  '/src/map/map-adapter.js',
  '/release-notes.json',
];

const TILE_HOSTS = ['tile.openstreetmap.org', 'a.tile.openstreetmap.org', 'b.tile.openstreetmap.org', 'c.tile.openstreetmap.org'];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== VERSION).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell + tiles, network-first for everything else
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Cache-first for app shell
  if (APP_SHELL.includes(url.pathname) || url.pathname === '/') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Cache-first for release notes
  if (url.pathname === '/release-notes.json') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((resp) => {
        caches.open(VERSION).then((cache) => cache.put(request, resp.clone()));
        return resp;
      }))
    );
    return;
  }

  // Cache-first for map tiles
  if (TILE_HOSTS.includes(url.host)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          caches.open(VERSION).then((cache) => cache.put(request, resp.clone()));
          return resp;
        });
      })
    );
    return;
  }

  // Network-first for everything else (API calls, etc.)
  // Don't cache POST/PUT requests
  event.respondWith(fetch(request));
});
