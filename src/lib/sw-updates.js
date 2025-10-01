let updateReady = false;
const listeners = new Set();

export function onUpdateChange(fn) {
  listeners.add(fn);
  fn(updateReady);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(updateReady);
}

// Wire to existing registration from /registerSW.js
export async function initSWUpdateListener() {
  if (!('serviceWorker' in navigator)) return;

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;

  // If a worker is already waiting, we have an update
  if (reg.waiting) {
    updateReady = true;
    emit();
  }

  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    if (!nw) return;
    nw.addEventListener('statechange', () => {
      // "installed" + there is a controller => new version available
      if (nw.state === 'installed' && navigator.serviceWorker.controller) {
        updateReady = true;
        emit();
      }
    });
  });

  // When controller becomes the new worker, reload once
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

export async function applyUpdateNow() {
  const reg = await navigator.serviceWorker.getRegistration();
  const waiting = reg?.waiting;
  if (!waiting) return;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  // controllerchange will trigger the reload
}
