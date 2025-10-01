(function registerSW() {
  if (!('serviceWorker' in navigator)) {
    console.info('[SW] not supported');
    return;
  }
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.info('[SW] registered', reg.scope);

      // Auto-activate new versions in background (no UI)
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // On controllerchange we're on the new SW; avoid reload loops
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.info('[SW] controller changed (new version active)');
      });
    } catch (e) {
      console.warn('[SW] registration failed', e);
    }
  });
})();
