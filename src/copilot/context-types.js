// ---- Type definitions for Context Engine ----
// These are JSDoc-style type comments for editor support

/**
 * @typedef {Object} GeoFix
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 * @property {number} accuracy - Accuracy in meters
 * @property {number} timestamp - Unix timestamp (ms)
 * @property {number|null} heading - Compass heading (0-360) or null
 * @property {number|null} speed - Estimated speed in km/h or null
 */

/**
 * @typedef {Object} WeatherDelta
 * @property {number} temp - Temperature in Celsius
 * @property {string} conditions - Weather conditions (e.g., "sunny", "rainy")
 * @property {number} fetched_at - Unix timestamp (ms) when fetched
 */

/**
 * @typedef {Object} ContextFrame
 * @property {GeoFix} geo - Current geolocation fix
 * @property {WeatherDelta|null} weather - Current weather (or null if not yet fetched)
 * @property {number} emitted_at - Unix timestamp (ms) when frame was emitted
 */

// ---- Simple Pub/Sub Event Bus ----
export class CtxBus {
  constructor() {
    this.subscribers = [];
  }

  /**
   * Register a listener for context frames
   * @param {function(ContextFrame): void} fn - Callback function
   */
  subscribe(fn) {
    this.subscribers.push(fn);
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
