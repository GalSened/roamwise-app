import { idbGet, idbPut } from './idb';
import { flags } from './flags';

export type JSONVal = string | number | boolean | null | JSONVal[] | { [k: string]: JSONVal };
type CacheRecord<T extends JSONVal = any> = {
  id: string; // cache key
  kind: 'route' | 'itinerary' | 'weather' | 'hazards';
  ts: number; // epoch ms when stored
  ttl?: number; // ms to live (optional; treat missing as unlimited for dev)
  data: T;
};

export async function cacheGet<T extends JSONVal>(
  kind: CacheRecord['kind'],
  key: string
): Promise<T | undefined> {
  if (!flags.offlineCache) return undefined;
  const rec =
    (await idbGet<CacheRecord<T>>('routes', key)) ||
    (await idbGet<CacheRecord<T>>('itineraries', key)) ||
    (await idbGet<CacheRecord<T>>('weatherSnapshots', key)) ||
    (await idbGet<CacheRecord<T>>('hazards', key));
  if (!rec) return undefined;
  if (rec.kind !== kind) return undefined;
  if (rec.ttl && Date.now() - rec.ts > rec.ttl) return undefined;
  return rec.data;
}

export async function cachePut<T extends JSONVal>(
  kind: CacheRecord['kind'],
  key: string,
  data: T,
  ttl?: number
) {
  if (!flags.offlineCache) return;
  const rec: CacheRecord<T> = { id: key, kind, ts: Date.now(), ttl, data };
  // Route → routes store; Itinerary → itineraries; Weather → weatherSnapshots; Hazards → hazards
  const store =
    kind === 'route' ? 'routes'
    : kind === 'itinerary' ? 'itineraries'
    : kind === 'hazards' ? 'hazards'
    : 'weatherSnapshots';
  await idbPut<any>(store as any, rec as any);
}

export function stableKeyFrom(obj: unknown): string {
  // stable stringify for POST bodies/params
  return JSON.stringify(obj, Object.keys(obj as any).sort());
}
