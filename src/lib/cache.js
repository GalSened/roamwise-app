import { idbGet, idbPut } from './idb.js';
import { flags } from './flags.js';

export async function cacheGet(kind, key) {
  if (!flags.offlineCache) return undefined;
  const rec =
    (await idbGet('routes', key)) ||
    (await idbGet('itineraries', key)) ||
    (await idbGet('weatherSnapshots', key));
  if (!rec) return undefined;
  if (rec.kind !== kind) return undefined;
  if (rec.ttl && Date.now() - rec.ts > rec.ttl) return undefined;
  return rec.data;
}

export async function cachePut(kind, key, data, ttl) {
  if (!flags.offlineCache) return;
  const rec = { id: key, kind, ts: Date.now(), ttl, data };
  // Route → routes store; Itinerary → itineraries; Weather → weatherSnapshots
  const store =
    kind === 'route' ? 'routes' : kind === 'itinerary' ? 'itineraries' : 'weatherSnapshots';
  await idbPut(store, rec);
}

export function stableKeyFrom(obj) {
  // stable stringify for POST bodies/params
  return JSON.stringify(obj, Object.keys(obj).sort());
}
