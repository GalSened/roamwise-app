import { cacheGet, cachePut, stableKeyFrom } from './cache.js';
import { flags } from './flags.js';

const ROUTE_TTL = 1000 * 60 * 60 * 12; // 12h
const WEATHER_TTL = 1000 * 60 * 60 * 3; // 3h
const ITIN_TTL = 1000 * 60 * 60 * 24; // 24h

// Helper: race network with (optional) cache for smoother offline-first
async function withCache(kind, key, fetcher, ttl) {
  if (!flags.offlineCache) return fetcher();
  const cached = cacheGet(kind, key);

  // Start network request in parallel
  const net = fetcher()
    .then(async (data) => {
      await cachePut(kind, key, data, ttl);
      return data;
    })
    .catch(() => undefined);

  // Prefer fast network; fallback to cache if slow/offline after 1.2s
  const timeout = new Promise((res) =>
    setTimeout(async () => res(await cached), 1200)
  );

  const winner = await Promise.race([net, timeout]);
  if (winner !== undefined && winner !== null) return winner;

  // If race yielded nothing (no cache + offline), await cache anyway
  const c = await cached;
  if (c !== undefined) return c;

  // Last resort: throw network error
  const final = await net;
  if (final !== undefined) return final;
  throw new Error('Network and cache both unavailable');
}

// ---- PUBLIC API ----
// NOTE: these functions DO NOT get auto-wired yet. Import them explicitly in future steps.

export async function apiRoute(body) {
  const key = stableKeyFrom({ endpoint: '/api/route', body });
  return withCache(
    'route',
    key,
    async () => {
      const resp = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(`route ${resp.status}`);
      return resp.json();
    },
    ROUTE_TTL
  );
}

export async function apiWeather(params) {
  const key = stableKeyFrom({ endpoint: '/api/weather', params });
  const qs = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    ts: String(params.ts),
  });
  return withCache(
    'weather',
    key,
    async () => {
      const resp = await fetch(`/api/weather?${qs}`, { method: 'GET' });
      if (!resp.ok) throw new Error(`weather ${resp.status}`);
      return resp.json();
    },
    WEATHER_TTL
  );
}

export async function apiSaveItinerary(itin) {
  // Saving is network-first; cache mirrors the last saved copy for offline
  const key = stableKeyFrom({ endpoint: '/api/itinerary', itin });
  const resp = await fetch('/api/itinerary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itin),
  });
  if (!resp.ok) throw new Error(`itinerary ${resp.status}`);
  const json = await resp.json();
  // store a snapshot (id is assumed in response or in itin)
  await cachePut('itinerary', key, json, ITIN_TTL);
  return json;
}

export async function apiGetItinerary(id) {
  const key = stableKeyFrom({ endpoint: `/api/itinerary/${id}` });
  return withCache(
    'itinerary',
    key,
    async () => {
      const resp = await fetch(`/api/itinerary/${id}`);
      if (!resp.ok) throw new Error(`itinerary ${resp.status}`);
      return resp.json();
    },
    ITIN_TTL
  );
}
