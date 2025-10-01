import {
  initDevToggle,
  onDevToggle,
  getOfflineCache,
  setOfflineCache,
  clearCachesAndIDB,
  getSWInfo,
} from './dev-toggle.js';

export function mountDevDrawer() {
  // Create drawer container
  const drawer = document.createElement('div');
  drawer.id = 'dev-drawer';
  drawer.style.cssText = `
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 99999;
    width: 320px;
    background: rgba(17, 24, 39, 0.98);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
    padding: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    display: none;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  `;

  const title = document.createElement('strong');
  title.textContent = 'Dev Tools';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    background: transparent;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 13px;
  `;
  closeBtn.onclick = () => {
    drawer.style.display = 'none';
  };

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Content container
  const content = document.createElement('div');
  content.style.cssText = 'display: grid; gap: 10px;';

  // Offline cache toggle
  const toggleLabel = document.createElement('label');
  toggleLabel.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer;';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = getOfflineCache();
  checkbox.onchange = (e) => {
    setOfflineCache(e.target.checked);
    updateInfo(); // Refresh info display
  };

  const toggleText = document.createElement('span');
  toggleText.textContent = 'Enable offline cache (flag)';

  toggleLabel.appendChild(checkbox);
  toggleLabel.appendChild(toggleText);

  // Clear button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear caches & IDB';
  clearBtn.style.cssText = `
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-weight: 500;
  `;
  clearBtn.onclick = async () => {
    await clearCachesAndIDB();
    alert('Caches & IndexedDB cleared');
    updateInfo(); // Refresh info display
  };

  // Info display
  const info = document.createElement('div');
  info.style.cssText = 'font-size: 12px; opacity: 0.9;';

  const updateInfo = async () => {
    const sw = await getSWInfo();
    const offline = getOfflineCache();

    info.innerHTML = `
      <div>SW: ${sw.registered ? 'registered' : 'not registered'}${sw.scope ? ` @ ${sw.scope}` : ''}</div>
      <div>Controller: ${sw.controller ? 'yes' : 'no'}</div>
      <div>App version: ${sw.version ?? 'n/a'}</div>
      <div>Flag offlineCache: ${offline ? 'ON' : 'OFF'}</div>
      <div style="opacity: 0.8; margin-top: 6px;">
        Open: <code>?debug=1</code> or press <code>Ctrl/Cmd + Shift + D</code>
      </div>
    `;
  };

  // Assemble
  content.appendChild(toggleLabel);
  content.appendChild(clearBtn);
  content.appendChild(info);

  drawer.appendChild(header);
  drawer.appendChild(content);

  // Add to DOM
  document.body.appendChild(drawer);

  // Initialize and wire to toggle state
  initDevToggle();
  onDevToggle(async (open) => {
    drawer.style.display = open ? 'block' : 'none';
    if (open) {
      // Refresh checkbox and info when opened
      checkbox.checked = getOfflineCache();
      await updateInfo();
    }
  });
}
