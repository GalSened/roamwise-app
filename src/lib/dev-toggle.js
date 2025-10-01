let isOpen = false;
const listeners = new Set();

export function onDevToggle(fn) {
  listeners.add(fn);
  fn(isOpen);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(isOpen);
}

export function initDevToggle() {
  try {
    // Open if URL contains ?debug=1
    if (new URLSearchParams(location.search).get('debug') === '1') {
      isOpen = true;
      emit();
    }
  } catch {}

  // Secret shortcut: Ctrl/Cmd + Shift + D
  window.addEventListener('keydown', (e) => {
    const cmd = e.ctrlKey || e.metaKey;
    if (cmd && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      isOpen = !isOpen;
      emit();
      e.preventDefault();
    }
  });
}

export function setOfflineCache(enabled) {
  try {
    if (enabled) localStorage.setItem('offlineCache', '1');
    else localStorage.removeItem('offlineCache');
  } catch {}
}

export function getOfflineCache() {
  try {
    return localStorage.getItem('offlineCache') === '1';
  } catch {
    return false;
  }
}

export async function clearCachesAndIDB() {
  // Clear Service Worker caches
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  // Clear IndexedDB used by the app
  const dbs = ['traveling-app']; // from idb.js DB_NAME
  await Promise.all(
    dbs.map(
      (name) =>
        new Promise((res) => {
          const r = indexedDB.deleteDatabase(name);
          r.onsuccess = r.onblocked = () => res();
          r.onerror = () => res();
        })
    )
  );
}

export async function getSWInfo() {
  const out = { registered: false, controller: !!navigator.serviceWorker?.controller };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      out.registered = true;
      out.scope = reg.scope;
    }
  } catch {}
  // Read version from meta tag
  const meta = document.querySelector('meta[name="app-version"]');
  if (meta) out.version = meta.content;
  return out;
}
