import { flags } from './flags.js';
import { apiSaveItinerary, apiGetItinerary } from './api.js';
import { idbPut, idbGet } from './idb.js';

// ---- LOAD ----
export async function loadItinerary(id) {
  if (flags.offlineCache) {
    try {
      const data = await apiGetItinerary(id);
      console.info('[itin] cache-aware load');
      return data;
    } catch (e) {
      // Optional: check if we have a local draft copy (same id)
      const draft = await idbGet('itineraries', id).catch(() => undefined);
      if (draft?.data) {
        console.info('[itin] offline draft served');
        return draft.data;
      }
      throw e;
    }
  } else {
    // ---- legacy v1 path (keep as-is) ----
    const resp = await fetch(`/api/itinerary/${id}`);
    if (!resp.ok) throw new Error(`itinerary ${resp.status}`);
    const json = await resp.json();
    console.info('[itin] legacy load');
    return json;
  }
}

// ---- SAVE ----
export async function saveItinerary(itin) {
  if (flags.offlineCache) {
    try {
      const saved = await apiSaveItinerary(itin);
      console.info('[itin] cache-aware save');
      return saved;
    } catch (e) {
      // Optional draft fallback: store locally if save fails (offline)
      try {
        await idbPut('itineraries', {
          id: itin.id,
          data: itin,
          ts: Date.now(),
          kind: 'itinerary',
        });
        console.info('[itin] save failed; draft stored locally');
      } catch {
        /* ignore */
      }
      // Re-throw so the caller can show the same v1 error UI
      throw e;
    }
  } else {
    // ---- legacy v1 path (keep as-is) ----
    const resp = await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itin),
    });
    if (!resp.ok) throw new Error(`itinerary ${resp.status}`);
    const json = await resp.json();
    console.info('[itin] legacy save');
    return json;
  }
}
