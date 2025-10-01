// ---- Type definitions for Recommender ----
// These are JSDoc-style type comments for editor support

/**
 * @typedef {'fuel'|'food'|'rest'|'scenic'|'weather_reroute'|'pace_adjust'} SuggestionKind
 */

/**
 * @typedef {Object} Suggestion
 * @property {string} id - Stable ID for dedupe/cooldown
 * @property {number} ts - Created at (Unix timestamp ms)
 * @property {SuggestionKind} kind - Type of suggestion
 * @property {string} title - Short headline for Car Mode
 * @property {string} reason - Explainability tag
 * @property {number} [expiresAt] - Optional TTL for visibility
 * @property {Object} [acceptAction] - Optional accept action
 * @property {string} acceptAction.type - Action type
 * @property {*} [acceptAction.payload] - Action payload
 * @property {Object} [declineAction] - Optional decline action
 * @property {string} declineAction.type - Action type
 * @property {*} [declineAction.payload] - Action payload
 */

/**
 * @typedef {function(Suggestion[]): void} SugListener
 */

// ---- Simple Pub/Sub Event Bus for Suggestions ----
export class SugBus {
  constructor() {
    this.listeners = new Set();
  }

  /**
   * Register a listener for suggestions
   * @param {SugListener} fn - Callback function
   * @returns {function(): void} Unsubscribe function
   */
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Emit suggestions to all listeners
   * @param {Suggestion[]} suggestions - Array of suggestions
   */
  emit(suggestions) {
    this.listeners.forEach((fn) => {
      try {
        fn(suggestions);
      } catch (err) {
        console.error('[SugBus] Listener error:', err);
      }
    });
  }
}
