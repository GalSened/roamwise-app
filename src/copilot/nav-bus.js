// ---- Navigate Event Bus: Decoupled navigation events ----
// Allows any UI to emit navigate requests, any handler to consume them

/**
 * @typedef {Object} NavPayload
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude
 * @property {string} [name] - Place name
 * @property {string} [source] - Source of navigation request (e.g., 'copilot')
 */

/** @typedef {function(NavPayload): void} NavListener */

const listeners = new Set();

/**
 * Subscribe to navigate events
 * @param {NavListener} fn - Callback function
 * @returns {function(): void} Unsubscribe function
 */
export function onNavigate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Emit navigate event to all listeners
 * @param {NavPayload} payload - Navigate payload
 */
export function emitNavigate(payload) {
  listeners.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.error('[NavBus] Listener error:', err);
    }
  });
}
