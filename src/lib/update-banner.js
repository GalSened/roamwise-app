import { initSWUpdateListener, onUpdateChange, applyUpdateNow } from './sw-updates.js';

export function mountUpdateBanner() {
  // Create banner element
  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 12px;
    left: 12px;
    right: 12px;
    z-index: 9999;
    background: var(--bg-elevated, #1f2937);
    color: white;
    padding: 10px 12px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,.2);
    display: none;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  `;

  // Message text
  const message = document.createElement('span');
  message.textContent = 'New version is ready.';

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; gap: 8px;';

  // Later button
  const laterBtn = document.createElement('button');
  laterBtn.textContent = 'Later';
  laterBtn.style.cssText = `
    background: transparent;
    color: inherit;
    border: 1px solid rgba(255,255,255,.3);
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 14px;
  `;
  laterBtn.onclick = () => {
    banner.style.display = 'none';
  };

  // Update button
  const updateBtn = document.createElement('button');
  updateBtn.textContent = 'Update app';
  updateBtn.style.cssText = `
    background: #10b981;
    color: #0b1e16;
    border: none;
    border-radius: 6px;
    padding: 6px 10px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
  `;
  updateBtn.onclick = () => {
    applyUpdateNow();
  };

  // Assemble
  buttonContainer.appendChild(laterBtn);
  buttonContainer.appendChild(updateBtn);
  banner.appendChild(message);
  banner.appendChild(buttonContainer);

  // Add to DOM
  document.body.appendChild(banner);

  // Initialize SW listener and wire to banner visibility
  initSWUpdateListener();
  onUpdateChange((hasUpdate) => {
    banner.style.display = hasUpdate ? 'flex' : 'none';
  });
}
