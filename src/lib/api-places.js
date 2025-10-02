import { cacheGet, cachePut, stableKeyFrom } from './cache.js';
import { flags } from './flags.js';
import { getLang } from './i18n.js';

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
      const resp = await fetch(`/api/places/nearby?${qs}`, {
        method: 'GET',
        headers: {
          'x-lang': getLang()
        }
      });
      if (!resp.ok) throw new Error(`places ${resp.status}`);
      return resp.json();
    },
    PLACES_TTL
  );
}

/**
 * Search for places using Google Places API text search
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query text
 * @param {boolean} [params.openNow] - Filter to places open now
 * @param {number} [params.minRating] - Minimum rating (0-5)
 * @param {string[]} [params.priceLevels] - Price level filters
 * @param {string} [params.includedType] - Place type (e.g., 'restaurant', 'tourist_attraction')
 * @param {Object} [params.center] - Center point for location bias
 * @param {number} [params.center.lat] - Latitude
 * @param {number} [params.center.lon] - Longitude
 * @param {number} [params.radius] - Radius in meters for location bias
 * @returns {Promise<{ok: boolean, cached?: boolean, items: Array}>}
 */
export async function apiPlacesSearch({ query, openNow=false, minRating=0, includedType, priceLevels, center, radius=2000 }){
  const body = {
    query, openNow, minRating,
    ...(includedType ? { includedType } : {}),
    ...(priceLevels?.length ? { priceLevels } : {}),
    ...(center ? { bias: { center: { latitude: center.lat, longitude: center.lon }, radius } } : {})
  };
  const r = await fetch('/api/places/search', {
    method:'POST',
    headers:{ 'content-type':'application/json', 'x-lang': getLang() },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('places_search_failed');
  return r.json();
}

/**
 * Get detailed information about a specific place
 * @param {string} id - Place ID from Google Places API
 * @returns {Promise<{ok: boolean, cached?: boolean, place: Object}>}
 */
export async function apiPlaceDetails(id){
  const r = await fetch(`/api/places/${encodeURIComponent(id)}`, { headers: { 'x-lang': getLang() } });
  if (!r.ok) throw new Error('place_details_failed');
  return r.json();
}
