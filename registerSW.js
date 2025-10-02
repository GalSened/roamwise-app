// Auto-detect base path for GitHub Pages compatibility
(function registerSW() {
  if (!('serviceWorker' in navigator)) {
    console.info('[SW] Service Worker not supported');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      // Auto-detect base path from HTML <base> tag or current location
      const base = document.querySelector('base')?.href || window.location.origin + '/';
      const basePath = new URL(base).pathname;
      const swPath = basePath + 'sw.js';

      console.info('[SW] Registering Service Worker at:', swPath, 'with scope:', basePath);

      const reg = await navigator.serviceWorker.register(swPath, { scope: basePath });
      console.info('[SW] Registered successfully, scope:', reg.scope);

      // Auto-activate new versions
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.info('[SW] New version available, activating...');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Handle controller change (new version activated)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.info('[SW] New version activated');
      });
    } catch (error) {
      console.warn('[SW] Registration failed:', error);
    }
  });
})();
