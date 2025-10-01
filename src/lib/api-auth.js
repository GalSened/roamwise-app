// ---- Auth API Client ----
// Frontend API calls for authentication and profile management

const API_BASE = 'http://localhost:3000';

/**
 * Login with tenant and username (dev mode - no password)
 * @param {string} tenant - Tenant name
 * @param {string} username - Username
 * @returns {Promise<Object>} User data
 */
export async function login(tenant, username) {
  const resp = await fetch(`${API_BASE}/api/dev/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include cookies
    body: JSON.stringify({ tenant, username })
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || `Login failed: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Logout (clear auth cookie)
 * @returns {Promise<Object>} Success response
 */
export async function logout() {
  const resp = await fetch(`${API_BASE}/api/dev/logout`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!resp.ok) {
    throw new Error(`Logout failed: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Get list of available tenants
 * @returns {Promise<Array>} List of tenants
 */
export async function getTenants() {
  const resp = await fetch(`${API_BASE}/api/dev/tenants`);

  if (!resp.ok) {
    throw new Error(`Get tenants failed: ${resp.status}`);
  }

  const data = await resp.json();
  return data.tenants;
}

/**
 * Get list of users for a tenant
 * @param {number} tenantId - Tenant ID
 * @returns {Promise<Array>} List of users
 */
export async function getUsersByTenant(tenantId) {
  const resp = await fetch(`${API_BASE}/api/dev/users/${tenantId}`);

  if (!resp.ok) {
    throw new Error(`Get users failed: ${resp.status}`);
  }

  const data = await resp.json();
  return data.users;
}

/**
 * Get current user's profile
 * @returns {Promise<Object>} Profile data with preferences
 */
export async function getProfile() {
  const resp = await fetch(`${API_BASE}/api/profile`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!resp.ok) {
    if (resp.status === 401) {
      throw new Error('Not authenticated');
    }
    throw new Error(`Get profile failed: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Update current user's preferences
 * @param {Object} prefs - Preferences to update
 * @returns {Promise<Object>} Updated preferences
 */
export async function updateProfile(prefs) {
  const resp = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prefs)
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || `Update profile failed: ${resp.status}`);
  }

  return resp.json();
}
