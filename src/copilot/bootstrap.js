import { flags } from '../lib/flags.js';
import { ContextEngine } from './context-engine.js';
import { Recommender } from './recommender.js';
import { sugStream } from './sug-stream.js';

// Singleton instances
let engine = null;
let recommender = null;

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

    // Start recommender listening to context frames
    console.info('[Copilot] Starting recommender...');
    recommender = new Recommender(engine);
    recommender.start();

    // Subscribe to suggestions
    recommender.on((suggestions) => {
      console.info('[copilot] suggestions ->', suggestions);

      // If copilotUi flag is on, pipe to UI stream
      if (flags.copilotUi) {
        sugStream.push(suggestions);
      }
    });

    // Expose API for manual testing (dev only)
    window.__copilot = {
      accept: (id, kind) => recommender?.accept(id, kind),
      decline: (id, kind) => recommender?.decline(id, kind),
    };

    console.info('[Copilot] Recommender started successfully');
  } catch (err) {
    console.error('[Copilot] Failed to start context engine:', err.message);
    engine = null;
    recommender = null;
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

  console.info('[Copilot] Stopping context engine and recommender...');
  engine.stop();
  engine = null;
  recommender = null;
  delete window.__copilot;
  console.info('[Copilot] Context engine and recommender stopped');
}

/**
 * Get the current engine instance (for debugging or direct access)
 * @returns {ContextEngine|null}
 */
export function getCopilotEngine() {
  return engine;
}
