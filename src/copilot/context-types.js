// ---- Type definitions for Context Engine (Production v2) ----
// These are JSDoc-style type comments for editor support

/**
 * @typedef {Object} GeoFix
 * @property {number} ts - Unix timestamp (ms) when fix was captured
 * @property {number} lat - Latitude (6 decimals)
 * @property {number} lon - Longitude (6 decimals)
 * @property {number} [acc] - Accuracy in meters (optional)
 * @property {number} [heading] - Compass heading (0-360) or undefined
 * @property {number} [speedKph] - Estimated speed in km/h or undefined
 */

/**
 * @typedef {Object} ContextFrame
 * @property {number} ts - Unix timestamp (ms) when frame was emitted
 * @property {GeoFix} fix - Current geolocation fix
 * @property {string} localTime - ISO 8601 local time string
 */

// ---- Simple Pub/Sub Event Bus ----
export class CtxBus {
  constructor() {
    this.subscribers = [];
  }

  /**
   * Register a listener for context frames
   * @param {function(ContextFrame): void} fn - Callback function
   * @returns {function(): void} Unsubscribe function
   */
  on(fn) {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== fn);
    };
  }

  /**
   * Unregister a listener
   * @param {function(ContextFrame): void} fn - Callback function to remove
   */
  unsubscribe(fn) {
    this.subscribers = this.subscribers.filter(sub => sub !== fn);
  }

  /**
   * Emit a context frame to all subscribers
   * @param {ContextFrame} frame - Context frame to emit
   */
  emit(frame) {
    this.subscribers.forEach(fn => {
      try {
        fn(frame);
      } catch (err) {
        console.error('[CtxBus] Subscriber error:', err);
      }
    });
  }
}
