// ---- Preferences Stream ----
// Observable stream for user preferences (loaded from profile)
// Used by Context Engine and Recommender for personalization

/**
 * Current preferences
 * @type {Object|null}
 */
let currentPrefs = null;

/**
 * Listeners for preference changes
 * @type {Set<Function>}
 */
const listeners = new Set();

/**
 * Set current preferences (called after login or profile update)
 * @param {Object} prefs - Preferences object from profile API
 */
export function setPrefs(prefs) {
  currentPrefs = prefs;
  console.log('[PrefsStream] Preferences updated:', prefs);

  // Notify all listeners
  listeners.forEach((listener) => {
    try {
      listener(currentPrefs);
    } catch (err) {
      console.error('[PrefsStream] Listener error:', err);
    }
  });
}

/**
 * Get current preferences
 * @returns {Object|null} Current preferences or null if not loaded
 */
export function getPrefs() {
  return currentPrefs;
}

/**
 * Clear preferences (on logout)
 */
export function clearPrefs() {
  currentPrefs = null;
  console.log('[PrefsStream] Preferences cleared');

  // Notify listeners
  listeners.forEach((listener) => {
    try {
      listener(null);
    } catch (err) {
      console.error('[PrefsStream] Listener error:', err);
    }
  });
}

/**
 * Subscribe to preference changes
 * @param {Function} listener - Callback function (receives prefs)
 * @returns {Function} Unsubscribe function
 */
export function onPrefsChange(listener) {
  listeners.add(listener);

  // Immediately call with current prefs if available
  if (currentPrefs !== null) {
    try {
      listener(currentPrefs);
    } catch (err) {
      console.error('[PrefsStream] Listener error:', err);
    }
  }

  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
  };
}
