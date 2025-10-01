import { flags } from '../lib/flags.js';
import { ContextEngine } from './context-engine.js';

// Singleton instance
let engine = null;

/**
 * Start the Context Engine if the copilot flag is enabled
 * and geolocation permission is granted.
 *
 * @returns {Promise<void>}
 */
export async function startCopilotContext() {
  // Check if flag is enabled
  if (!flags.copilot) {
    console.log('[Copilot] Flag OFF, context engine disabled');
    return;
  }

  // Check if already running
  if (engine !== null) {
    console.warn('[Copilot] Context engine already running');
    return;
  }

  try {
    console.info('[Copilot] Starting context engine...');
    engine = new ContextEngine();
    await engine.start();
    console.info('[Copilot] Context engine started successfully');

    // Example: subscribe to context frames for debugging
    engine.subscribe((frame) => {
      // In production, this would be consumed by recommender
      // For now, just log a minimal confirmation
      console.debug('[Copilot] Context frame emitted');
    });
  } catch (err) {
    console.error('[Copilot] Failed to start context engine:', err.message);
    engine = null;
  }
}

/**
 * Stop the Context Engine and clear the singleton instance.
 */
export function stopCopilotContext() {
  if (engine === null) {
    console.warn('[Copilot] Context engine not running');
    return;
  }

  console.info('[Copilot] Stopping context engine...');
  engine.stop();
  engine = null;
  console.info('[Copilot] Context engine stopped');
}

/**
 * Get the current engine instance (for debugging or direct access)
 * @returns {ContextEngine|null}
 */
export function getCopilotEngine() {
  return engine;
}
