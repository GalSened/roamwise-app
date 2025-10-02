// Tiny IndexedDB helper (no external deps)

const DB_NAME = 'traveling-app';
const DB_VERSION = 2;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // Version 1: Create initial stores
      if (oldVersion < 1) {
        db.createObjectStore('itineraries', { keyPath: 'id' });
        db.createObjectStore('routes', { keyPath: 'id' });
        db.createObjectStore('weatherSnapshots', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'key' });
      }

      // Version 2: Add lastRoute store for offline route recall
      if (oldVersion < 2) {
        db.createObjectStore('lastRoute', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function idbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDel(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Offline-first: Last Route Recall ----

/**
 * Save the last computed route for offline recall
 * @param {Object} payload - Route data {ts, distance_m, duration_s, geometry}
 */
export async function idbSetLastRoute(payload) {
  const record = {
    id: 'last',
    ...payload,
    savedAt: Date.now(),
  };
  await idbPut('lastRoute', record);
}

/**
 * Get the last computed route (if any)
 * @returns {Promise<Object|undefined>}
 */
export async function idbGetLastRoute() {
  return idbGet('lastRoute', 'last');
}
