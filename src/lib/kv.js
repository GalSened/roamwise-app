// ---- Namespaced localStorage ----
// Per-tenant/per-user key-value storage for flags and bandit memory isolation

/**
 * Current namespace (set after login)
 * Format: "tenant:username"
 */
let currentNamespace = null;

/**
 * Set the current namespace for all localStorage operations
 * @param {string} tenant - Tenant name
 * @param {string} username - Username
 */
export function setNamespace(tenant, username) {
  currentNamespace = `${tenant}:${username}`;
  console.log('[KV] Namespace set:', currentNamespace);
}

/**
 * Get the current namespace
 * @returns {string|null} Current namespace or null if not set
 */
export function getNamespace() {
  return currentNamespace;
}

/**
 * Clear the namespace (logout)
 */
export function clearNamespace() {
  console.log('[KV] Namespace cleared');
  currentNamespace = null;
}

/**
 * Build namespaced key
 * @param {string} key - Original key
 * @returns {string} Namespaced key
 */
function namespacedKey(key) {
  if (!currentNamespace) {
    // No namespace set - use global key (backward compatible)
    return key;
  }
  return `${currentNamespace}:${key}`;
}

/**
 * Get item from namespaced localStorage
 * @param {string} key - Key to get
 * @returns {string|null} Value or null
 */
export function kvGet(key) {
  try {
    return localStorage.getItem(namespacedKey(key));
  } catch {
    return null;
  }
}

/**
 * Set item in namespaced localStorage
 * @param {string} key - Key to set
 * @param {string} value - Value to set
 */
export function kvSet(key, value) {
  try {
    localStorage.setItem(namespacedKey(key), value);
  } catch (err) {
    console.warn('[KV] Failed to set item:', err);
  }
}

/**
 * Remove item from namespaced localStorage
 * @param {string} key - Key to remove
 */
export function kvRemove(key) {
  try {
    localStorage.removeItem(namespacedKey(key));
  } catch (err) {
    console.warn('[KV] Failed to remove item:', err);
  }
}

/**
 * Clear all items in current namespace
 * WARNING: This clears all keys for the current user, use carefully
 */
export function kvClearNamespace() {
  if (!currentNamespace) {
    console.warn('[KV] No namespace set, cannot clear');
    return;
  }

  try {
    const prefix = `${currentNamespace}:`;
    const keysToRemove = [];

    // Find all keys with current namespace prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Remove them
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.log('[KV] Cleared namespace:', currentNamespace, '(removed', keysToRemove.length, 'keys)');
  } catch (err) {
    console.warn('[KV] Failed to clear namespace:', err);
  }
}
