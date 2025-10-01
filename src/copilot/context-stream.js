// ---- Context Frame Stream: Lightweight helper to expose last GPS fix ----
// Provides last known position for action dispatcher

/**
 * @typedef {import('./context-types.js').ContextFrame} ContextFrame
 * @typedef {function(ContextFrame): void} ContextListener
 */

class ContextFrameStream {
  constructor() {
    /** @type {Set<ContextListener>} */
    this.listeners = new Set();
    /** @type {ContextFrame|null} */
    this.lastFrame = null;
  }

  /**
   * Subscribe to context frames
   * @param {ContextListener} fn - Callback function
   * @returns {function(): void} Unsubscribe function
   */
  subscribe(fn) {
    this.listeners.add(fn);
    // Immediately send last frame if available
    if (this.lastFrame) {
      fn(this.lastFrame);
    }
    return () => this.listeners.delete(fn);
  }

  /**
   * Push new context frame
   * @param {ContextFrame} frame
   */
  push(frame) {
    this.lastFrame = frame;
    this.emit(frame);
  }

  /**
   * Get last known GPS fix
   * @returns {{lat: number, lon: number}|null}
   */
  getLastFix() {
    return this.lastFrame?.fix
      ? { lat: this.lastFrame.fix.lat, lon: this.lastFrame.fix.lon }
      : null;
  }

  /**
   * Emit frame to all listeners
   * @private
   * @param {ContextFrame} frame
   */
  emit(frame) {
    this.listeners.forEach((fn) => {
      try {
        fn(frame);
      } catch (err) {
        console.error('[ContextStream] Listener error:', err);
      }
    });
  }
}

// Singleton instance
export const contextStream = new ContextFrameStream();
