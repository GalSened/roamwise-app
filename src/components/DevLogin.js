// ---- Dev Login Component ----
// Minimal login UI for dev/home use (choose tenant + user)

import { login, logout, getTenants, getUsersByTenant } from '../lib/api-auth.js';
import { setNamespace, clearNamespace } from '../lib/kv.js';

/**
 * Create DevLogin component
 * @returns {HTMLElement} DevLogin component
 */
export function createDevLogin() {
  const container = document.createElement('div');
  container.className = 'dev-login';
  container.innerHTML = `
    <style>
      .dev-login {
        position: fixed;
        top: 10px;
        right: 10px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        max-width: 300px;
      }

      .dev-login.logged-in {
        padding: 8px 12px;
      }

      .dev-login h3 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #1e40af;
      }

      .dev-login label {
        display: block;
        font-size: 12px;
        margin-bottom: 4px;
        color: #374151;
      }

      .dev-login select,
      .dev-login button {
        width: 100%;
        padding: 6px 8px;
        margin-bottom: 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 13px;
      }

      .dev-login button {
        background: #3b82f6;
        color: white;
        border: none;
        cursor: pointer;
        font-weight: 500;
      }

      .dev-login button:hover {
        background: #2563eb;
      }

      .dev-login button.logout {
        background: #ef4444;
        margin-bottom: 0;
      }

      .dev-login button.logout:hover {
        background: #dc2626;
      }

      .dev-login .user-info {
        font-size: 13px;
        color: #374151;
        margin-bottom: 8px;
      }

      .dev-login .user-info strong {
        color: #1e40af;
      }

      .dev-login .error {
        color: #dc2626;
        font-size: 12px;
        margin-top: 8px;
      }

      .dev-login .loading {
        font-size: 12px;
        color: #6b7280;
      }
    </style>

    <div class="login-form">
      <h3>🔑 Dev Login</h3>
      <label>Tenant:</label>
      <select id="tenant-select" disabled>
        <option value="">Loading...</option>
      </select>

      <label>User:</label>
      <select id="user-select" disabled>
        <option value="">Select tenant first</option>
      </select>

      <button id="login-btn" disabled>Login</button>
      <div class="error" id="error-msg" style="display: none;"></div>
    </div>

    <div class="user-info-container" style="display: none;">
      <div class="user-info">
        Logged in as <strong id="current-user"></strong>
      </div>
      <button class="logout" id="logout-btn">Logout</button>
    </div>
  `;

  // Get DOM elements
  const loginForm = container.querySelector('.login-form');
  const userInfoContainer = container.querySelector('.user-info-container');
  const tenantSelect = container.querySelector('#tenant-select');
  const userSelect = container.querySelector('#user-select');
  const loginBtn = container.querySelector('#login-btn');
  const logoutBtn = container.querySelector('#logout-btn');
  const errorMsg = container.querySelector('#error-msg');
  const currentUserSpan = container.querySelector('#current-user');

  let currentUser = null;

  // Load tenants on mount
  async function loadTenants() {
    try {
      const tenants = await getTenants();
      tenantSelect.innerHTML = '<option value="">Select tenant</option>';
      tenants.forEach((tenant) => {
        const option = document.createElement('option');
        option.value = tenant.id;
        option.textContent = tenant.name;
        tenantSelect.appendChild(option);
      });
      tenantSelect.disabled = false;
    } catch (err) {
      console.error('[DevLogin] Failed to load tenants:', err);
      errorMsg.textContent = 'Failed to load tenants';
      errorMsg.style.display = 'block';
    }
  }

  // Load users when tenant changes
  tenantSelect.addEventListener('change', async () => {
    const tenantId = tenantSelect.value;
    if (!tenantId) {
      userSelect.innerHTML = '<option value="">Select tenant first</option>';
      userSelect.disabled = true;
      loginBtn.disabled = true;
      return;
    }

    try {
      userSelect.innerHTML = '<option value="">Loading...</option>';
      userSelect.disabled = true;

      const users = await getUsersByTenant(parseInt(tenantId, 10));
      userSelect.innerHTML = '<option value="">Select user</option>';
      users.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.display_name || user.username;
        userSelect.appendChild(option);
      });
      userSelect.disabled = false;
    } catch (err) {
      console.error('[DevLogin] Failed to load users:', err);
      errorMsg.textContent = 'Failed to load users';
      errorMsg.style.display = 'block';
    }
  });

  // Enable login button when user is selected
  userSelect.addEventListener('change', () => {
    loginBtn.disabled = !userSelect.value;
  });

  // Handle login
  loginBtn.addEventListener('click', async () => {
    errorMsg.style.display = 'none';
    const tenantName = tenantSelect.options[tenantSelect.selectedIndex].text;
    const username = userSelect.value;

    if (!tenantName || !username) {
      errorMsg.textContent = 'Please select tenant and user';
      errorMsg.style.display = 'block';
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';

      const result = await login(tenantName, username);
      currentUser = result.user;

      // Set namespace for localStorage
      setNamespace(currentUser.tenant, currentUser.username);

      // Show user info, hide login form
      currentUserSpan.textContent = `${currentUser.displayName} (${currentUser.tenant})`;
      loginForm.style.display = 'none';
      userInfoContainer.style.display = 'block';
      container.classList.add('logged-in');

      console.log('[DevLogin] Logged in as:', currentUser);

      // Emit custom event for app to handle
      window.dispatchEvent(
        new CustomEvent('userLoggedIn', { detail: currentUser })
      );
    } catch (err) {
      console.error('[DevLogin] Login failed:', err);
      errorMsg.textContent = err.message;
      errorMsg.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });

  // Handle logout
  logoutBtn.addEventListener('click', async () => {
    try {
      await logout();
      clearNamespace();
      currentUser = null;

      // Show login form, hide user info
      loginForm.style.display = 'block';
      userInfoContainer.style.display = 'none';
      container.classList.remove('logged-in');

      // Reset form
      tenantSelect.value = '';
      userSelect.innerHTML = '<option value="">Select tenant first</option>';
      userSelect.disabled = true;
      loginBtn.disabled = true;
      errorMsg.style.display = 'none';

      console.log('[DevLogin] Logged out');

      // Emit custom event for app to handle
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
    } catch (err) {
      console.error('[DevLogin] Logout failed:', err);
    }
  });

  // Load tenants on mount
  loadTenants();

  return container;
}
