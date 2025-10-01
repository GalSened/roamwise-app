// ---- Suggestion Stream: Decoupling Layer ----
// Sits between Recommender and UI (Car-Mode overlay)
// Filters, throttles, and manages single active suggestion

/**
 * @typedef {import('./suggestion-types.js').Suggestion} Suggestion
 * @typedef {function(Suggestion|null): void} StreamListener
 */

class SuggestionStream {
  constructor() {
    /** @type {Set<StreamListener>} */
    this.listeners = new Set();
    /** @type {Suggestion|null} */
    this.activeSuggestion = null;
  }

  /**
   * Subscribe to suggestion stream
   * @param {StreamListener} fn - Callback function
   * @returns {function(): void} Unsubscribe function
   */
  subscribe(fn) {
    this.listeners.add(fn);
    // Immediately send current active suggestion (if any)
    fn(this.activeSuggestion);
    return () => this.listeners.delete(fn);
  }

  /**
   * Push new suggestions from recommender
   * @param {Suggestion[]} suggestions - Array of suggestions from recommender
   */
  push(suggestions) {
    const now = Date.now();

    // Filter expired suggestions
    const valid = suggestions.filter((s) => (s.expiresAt ?? now + 1) > now);

    if (valid.length === 0) {
      this.clear();
      return;
    }

    // Take first valid suggestion (recommender already ranked them)
    const next = valid[0];

    // Throttle: don't emit if same suggestion ID
    if (this.activeSuggestion?.id === next.id) {
      return;
    }

    this.activeSuggestion = next;
    this.emit(next);
  }

  /**
   * Clear active suggestion
   */
  clear() {
    if (this.activeSuggestion === null) return;
    this.activeSuggestion = null;
    this.emit(null);
  }

  /**
   * Emit suggestion to all listeners
   * @private
   * @param {Suggestion|null} suggestion
   */
  emit(suggestion) {
    this.listeners.forEach((fn) => {
      try {
        fn(suggestion);
      } catch (err) {
        console.error('[SugStream] Listener error:', err);
      }
    });
  }
}

// Singleton instance
export const sugStream = new SuggestionStream();
