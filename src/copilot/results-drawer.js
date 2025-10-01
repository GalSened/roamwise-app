// ---- Copilot Results Drawer: Flag-gated UI for nearby places ----
// Displays provider results from Step 19-Pro in a minimal, accessible drawer
// Vanilla JS class with DOM manipulation (no React/JSX)

import { flags } from '../lib/flags.js';
import { onActionResult } from './actions.js';
import { emitNavigate } from './nav-bus.js';

/**
 * @typedef {Object} Place
 * @property {string} id - Unique place ID
 * @property {string} [name] - Place name
 * @property {number} lat - Latitude
 * @property {number} lon - Longitude
 * @property {string} category - Place category
 * @property {number} [distanceM] - Distance from search point in meters
 */

export class ResultsDrawer {
  constructor() {
    this.container = null;
    this.items = [];
    this.isRtl = false;
    this.visible = false;
    this.unsubscribe = null;

    // Bind methods
    this.handleActionResult = this.handleActionResult.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleNavigate = this.handleNavigate.bind(this);
  }

  /**
   * Mount drawer to document.body
   */
  mount() {
    if (this.container) {
      console.warn('[ResultsDrawer] Already mounted');
      return;
    }

    // Create drawer container
    this.container = document.createElement('div');
    this.container.id = 'copilot-results-drawer';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-label', 'Nearby results');
    this.container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 10001;
      background: #0f172a;
      color: #ffffff;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      display: none;
      flex-direction: column;
      max-height: 50vh;
      box-sizing: border-box;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const title = document.createElement('strong');
    title.id = 'drawer-title';
    title.style.cssText = 'font-size: 16px; font-weight: 600;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = `
      background: transparent;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 8px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
    `;
    closeBtn.addEventListener('mousedown', () => {
      closeBtn.style.transform = 'scale(0.95)';
    });
    closeBtn.addEventListener('mouseup', () => {
      closeBtn.style.transform = 'scale(1)';
    });
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.background = 'transparent';
    });
    closeBtn.addEventListener('click', this.handleClose);

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create scrollable list container
    const listContainer = document.createElement('ul');
    listContainer.id = 'drawer-list';
    listContainer.style.cssText = `
      list-style: none;
      margin: 0;
      padding: 8px;
      display: grid;
      gap: 8px;
      max-height: 40vh;
      overflow-y: auto;
      overflow-x: hidden;
    `;

    // Assemble DOM
    this.container.appendChild(header);
    this.container.appendChild(listContainer);
    document.body.appendChild(this.container);

    // Subscribe to action results
    this.unsubscribe = onActionResult(this.handleActionResult);

    // Register keyboard listener
    document.addEventListener('keydown', this.handleKeydown);

    // Detect RTL
    this.updateRtl();

    console.info('[ResultsDrawer] Mounted successfully');
  }

  /**
   * Unmount drawer from document.body
   */
  unmount() {
    if (!this.container) return;

    document.removeEventListener('keydown', this.handleKeydown);
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.container.remove();
    this.container = null;
    this.items = [];
    this.visible = false;

    console.info('[ResultsDrawer] Unmounted');
  }

  /**
   * Update RTL direction from document
   * @private
   */
  updateRtl() {
    const dir = document.documentElement.getAttribute('dir') || 'ltr';
    this.isRtl = dir.toLowerCase() === 'rtl';
    if (this.container) {
      this.container.setAttribute('dir', this.isRtl ? 'rtl' : 'ltr');
    }
  }

  /**
   * Show drawer with items
   * @param {Place[]} items - Places to display
   */
  show(items) {
    // Guard: only show if all required flags are enabled
    if (!flags.copilot || !flags.copilotUi || !flags.copilotExec) {
      console.info('[ResultsDrawer] Flags not enabled, skipping display');
      return;
    }

    if (!this.container) {
      console.warn('[ResultsDrawer] Cannot show - not mounted');
      return;
    }

    // Cap at 10 items for safety
    this.items = items.slice(0, 10);
    this.updateRtl();

    // Update title
    const title = document.getElementById('drawer-title');
    if (title) {
      title.textContent = this.isRtl ? 'מקומות קרובים' : 'Nearby places';
    }

    // Render items
    const list = document.getElementById('drawer-list');
    if (list) {
      list.innerHTML = '';
      this.items.forEach((place) => {
        const li = this.createPlaceCard(place);
        list.appendChild(li);
      });
    }

    // Display drawer
    this.container.style.display = 'flex';
    this.visible = true;

    console.info('[ResultsDrawer] Showing', this.items.length, 'places');
  }

  /**
   * Hide drawer
   */
  hide() {
    if (!this.container) return;
    this.container.style.display = 'none';
    this.visible = false;
    this.items = [];
    console.info('[ResultsDrawer] Hidden');
  }

  /**
   * Create a place card element
   * @private
   * @param {Place} place
   * @returns {HTMLElement}
   */
  createPlaceCard(place) {
    const li = document.createElement('li');
    li.style.cssText = `
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      padding: 10px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
    `;

    // Info section
    const info = document.createElement('div');
    info.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

    const name = document.createElement('div');
    name.textContent = place.name || (this.isRtl ? 'ללא שם' : 'Unnamed');
    name.style.cssText = 'font-weight: 700; font-size: 14px;';

    const details = document.createElement('div');
    const distanceText =
      typeof place.distanceM === 'number'
        ? `${Math.round(place.distanceM)} m`
        : this.isRtl
        ? 'מרחק לא ידוע'
        : 'unknown distance';
    details.textContent = `${place.category} · ${distanceText}`;
    details.style.cssText = 'opacity: 0.8; font-size: 12px;';

    info.appendChild(name);
    info.appendChild(details);

    // Actions section
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    const navBtn = document.createElement('button');
    navBtn.textContent = this.isRtl ? 'ניווט' : 'Navigate';
    navBtn.style.cssText = `
      background: #10b981;
      color: #06281f;
      border: none;
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      font-weight: 800;
      font-size: 13px;
      transition: transform 0.1s, background 0.2s;
      touch-action: manipulation;
    `;
    navBtn.addEventListener('mousedown', () => {
      navBtn.style.transform = 'scale(0.95)';
    });
    navBtn.addEventListener('mouseup', () => {
      navBtn.style.transform = 'scale(1)';
    });
    navBtn.addEventListener('mouseover', () => {
      navBtn.style.background = '#059669';
    });
    navBtn.addEventListener('mouseout', () => {
      navBtn.style.background = '#10b981';
    });
    navBtn.addEventListener('click', () => this.handleNavigate(place));

    actions.appendChild(navBtn);

    // Assemble card
    li.appendChild(info);
    li.appendChild(actions);

    return li;
  }

  /**
   * Handle action result from action dispatcher
   * @private
   * @param {Object} result - Action result
   */
  handleActionResult(result) {
    if (result?.type === 'NEARBY_RESULTS' && Array.isArray(result.items)) {
      console.info('[ResultsDrawer] Received', result.items.length, 'results');
      this.show(result.items);
    }
  }

  /**
   * Handle Navigate button click
   * @private
   * @param {Place} place
   */
  handleNavigate(place) {
    console.info('[ResultsDrawer] Navigate to:', place.name);
    emitNavigate({
      lat: place.lat,
      lon: place.lon,
      name: place.name,
      source: 'copilot',
    });
  }

  /**
   * Handle close button click
   * @private
   */
  handleClose() {
    this.hide();
  }

  /**
   * Handle keyboard shortcuts
   * @private
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    if (!this.visible) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  }
}
