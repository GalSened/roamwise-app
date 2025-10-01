// ---- Car-Mode Overlay: Production-Safe Suggestion UI ----
// Large, distraction-minimal overlay for in-vehicle use
// Vanilla JS class with DOM manipulation (no React/JSX)

import { flags } from '../lib/flags.js';
import { executeAccept } from './actions.js';
import { contextStream } from './context-stream.js';

/**
 * @typedef {import('./suggestion-types.js').Suggestion} Suggestion
 */

export class CarModeOverlay {
  /**
   * @param {Object} deps - Dependencies
   * @param {function(string, string): void} deps.onAccept - Accept handler (id, kind)
   * @param {function(string, string): void} deps.onDecline - Decline handler (id, kind)
   */
  constructor({ onAccept, onDecline }) {
    this.onAccept = onAccept;
    this.onDecline = onDecline;
    this.container = null;
    this.currentSuggestion = null;
    this.visible = false;

    // Bind methods
    this.handleAcceptClick = this.handleAcceptClick.bind(this);
    this.handleDeclineClick = this.handleDeclineClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Mount overlay to document.body
   */
  mount() {
    if (this.container) {
      console.warn('[CarModeOverlay] Already mounted');
      return;
    }

    // Create overlay container
    this.container = document.createElement('div');
    this.container.id = 'car-mode-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create content wrapper
    const content = document.createElement('div');
    content.style.cssText = `
      max-width: 800px;
      width: 100%;
      text-align: center;
      color: #ffffff;
    `;

    // Create title element
    const title = document.createElement('h2');
    title.id = 'car-mode-title';
    title.style.cssText = `
      font-size: 2rem;
      margin: 0 0 1rem 0;
      font-weight: 600;
      line-height: 1.4;
      color: #ffffff;
    `;
    title.setAttribute('dir', 'auto');

    // Create reason element
    const reason = document.createElement('p');
    reason.id = 'car-mode-reason';
    reason.style.cssText = `
      font-size: 1.2rem;
      margin: 0 0 2rem 0;
      opacity: 0.8;
      color: #e0e0e0;
    `;
    reason.setAttribute('dir', 'auto');

    // Create buttons container
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    `;

    // Create Accept button
    const acceptBtn = document.createElement('button');
    acceptBtn.id = 'car-mode-accept';
    acceptBtn.textContent = '✓ Accept';
    acceptBtn.style.cssText = `
      min-width: 160px;
      min-height: 80px;
      font-size: 1.5rem;
      font-weight: 600;
      background: #10b981;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      padding: 1rem 2rem;
      transition: transform 0.1s, background 0.2s;
      touch-action: manipulation;
    `;
    acceptBtn.addEventListener('mousedown', () => {
      acceptBtn.style.transform = 'scale(0.95)';
    });
    acceptBtn.addEventListener('mouseup', () => {
      acceptBtn.style.transform = 'scale(1)';
    });
    acceptBtn.addEventListener('mouseover', () => {
      acceptBtn.style.background = '#059669';
    });
    acceptBtn.addEventListener('mouseout', () => {
      acceptBtn.style.background = '#10b981';
    });
    acceptBtn.addEventListener('click', this.handleAcceptClick);

    // Create Decline button
    const declineBtn = document.createElement('button');
    declineBtn.id = 'car-mode-decline';
    declineBtn.textContent = '✕ Decline';
    declineBtn.style.cssText = `
      min-width: 160px;
      min-height: 80px;
      font-size: 1.5rem;
      font-weight: 600;
      background: #6b7280;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      padding: 1rem 2rem;
      transition: transform 0.1s, background 0.2s;
      touch-action: manipulation;
    `;
    declineBtn.addEventListener('mousedown', () => {
      declineBtn.style.transform = 'scale(0.95)';
    });
    declineBtn.addEventListener('mouseup', () => {
      declineBtn.style.transform = 'scale(1)';
    });
    declineBtn.addEventListener('mouseover', () => {
      declineBtn.style.background = '#4b5563';
    });
    declineBtn.addEventListener('mouseout', () => {
      declineBtn.style.background = '#6b7280';
    });
    declineBtn.addEventListener('click', this.handleDeclineClick);

    // Assemble DOM
    buttons.appendChild(acceptBtn);
    buttons.appendChild(declineBtn);
    content.appendChild(title);
    content.appendChild(reason);
    content.appendChild(buttons);
    this.container.appendChild(content);
    document.body.appendChild(this.container);

    // Register event listeners
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    console.info('[CarModeOverlay] Mounted successfully');
  }

  /**
   * Unmount overlay from document.body
   */
  unmount() {
    if (!this.container) return;

    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.container.remove();
    this.container = null;
    this.currentSuggestion = null;
    this.visible = false;

    console.info('[CarModeOverlay] Unmounted');
  }

  /**
   * Show suggestion
   * @param {Suggestion} suggestion
   */
  show(suggestion) {
    if (!this.container) {
      console.warn('[CarModeOverlay] Cannot show - not mounted');
      return;
    }

    this.currentSuggestion = suggestion;

    // Update UI
    const title = document.getElementById('car-mode-title');
    const reason = document.getElementById('car-mode-reason');
    if (title) title.textContent = suggestion.title;
    if (reason) reason.textContent = suggestion.reason;

    // Display overlay
    this.container.style.display = 'flex';
    this.visible = true;

    // Voice read-out (if TTS flag enabled)
    if (flags.tts) {
      this.speak(suggestion.title);
    }

    console.info('[CarModeOverlay] Showing suggestion:', suggestion.kind);
  }

  /**
   * Hide overlay
   */
  hide() {
    if (!this.container) return;
    this.container.style.display = 'none';
    this.visible = false;
    this.currentSuggestion = null;

    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    console.info('[CarModeOverlay] Hidden');
  }

  /**
   * Speak text using Web Speech API
   * @private
   * @param {string} text
   */
  speak(text) {
    if (!('speechSynthesis' in window)) {
      console.warn('[CarModeOverlay] TTS not supported');
      return;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[CarModeOverlay] TTS error:', err);
    }
  }

  /**
   * Handle Accept button click
   * @private
   */
  async handleAcceptClick() {
    if (!this.currentSuggestion) return;
    const { id, kind } = this.currentSuggestion;
    console.info('[CarModeOverlay] User accepted:', kind);

    // Call recommender accept handler
    this.onAccept(id, kind);

    // Execute action if copilotExec flag enabled
    try {
      const lastFix = contextStream.getLastFix();
      await executeAccept(this.currentSuggestion, lastFix);
    } catch (err) {
      console.error('[CarModeOverlay] Action execution failed:', err);
    }

    this.hide();
  }

  /**
   * Handle Decline button click
   * @private
   */
  handleDeclineClick() {
    if (!this.currentSuggestion) return;
    const { id, kind } = this.currentSuggestion;
    console.info('[CarModeOverlay] User declined:', kind);
    this.onDecline(id, kind);
    this.hide();
  }

  /**
   * Handle keyboard shortcuts
   * @private
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    if (!this.visible || !this.currentSuggestion) return;

    switch (event.key) {
      case 'Enter':
      case 'a':
      case 'A':
        event.preventDefault();
        this.handleAcceptClick();
        break;
      case 'Escape':
      case 'd':
      case 'D':
        event.preventDefault();
        this.handleDeclineClick();
        break;
    }
  }

  /**
   * Handle visibility change (safety gate)
   * @private
   */
  handleVisibilityChange() {
    // Hide overlay when tab becomes hidden (safety gate)
    if (document.hidden && this.visible) {
      console.info('[CarModeOverlay] Tab hidden, hiding overlay (safety gate)');
      this.hide();
    }
  }
}
