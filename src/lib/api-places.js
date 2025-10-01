import { cacheGet, cachePut, stableKeyFrom } from './cache.js';
import { flags } from './flags.js';

const PLACES_TTL = 1000 * 60 * 5; // 5 minutes cache

/**
 * @typedef {Object} PlacesNearbyParams
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude
 * @property {'rest'|'fuel'|'food'|'scenic'} category - Place category
 * @property {number} [radius=3000] - Search radius in meters (500-20000)
 */

/**
 * @typedef {Object} Place
 * @property {string} id - Unique place ID
 * @property {string} [name] - Place name
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude
 * @property {string} category - Place category
 * @property {string} source - Data source (osm, google, etc)
 * @property {Record<string,string>} [tags] - Additional metadata
 * @property {number} [distanceM] - Distance from search point in meters
 */

/**
 * @typedef {Object} PlacesResponse
 * @property {boolean} ok - Success status
 * @property {string} source - Data source (cache, osm, etc)
 * @property {Place[]} items - Array of places
 */

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
  const timeout = new Promise((res) => setTimeout(async () => res(await cached), 1200));

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

/**
 * Fetch nearby places from backend
 * @param {PlacesNearbyParams} params
 * @returns {Promise<PlacesResponse>}
 */
export async function apiPlacesNearby(params) {
  const key = stableKeyFrom({ endpoint: '/api/places/nearby', params });
  const qs = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    category: params.category,
    radius: String(params.radius ?? 3000),
  });

  return withCache(
    'places',
    key,
    async () => {
      const resp = await fetch(`/api/places/nearby?${qs}`, { method: 'GET' });
      if (!resp.ok) throw new Error(`places ${resp.status}`);
      return resp.json();
    },
    PLACES_TTL
  );
}
