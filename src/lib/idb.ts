// Tiny IndexedDB helper (no external deps)
export type StoreMap = {
  itineraries: 'id';
  routes: 'id';
  weatherSnapshots: 'id';
  hazards: 'id';
  meta: 'key';
};

const DB_NAME = 'traveling-app';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Create stores if they don't exist (handles both fresh installs and upgrades)
      if (!db.objectStoreNames.contains('itineraries')) {
        db.createObjectStore('itineraries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('routes')) {
        db.createObjectStore('routes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('weatherSnapshots')) {
        db.createObjectStore('weatherSnapshots', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('hazards')) {
        db.createObjectStore('hazards', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function idbGet<T = unknown>(
  store: keyof StoreMap,
  key: IDBValidKey
): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut<T extends Record<string, any>>(
  store: keyof StoreMap,
  value: T
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDel(store: keyof StoreMap, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
