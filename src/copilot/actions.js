// ---- Action Dispatcher: Execute Accept actions from suggestions ----
// Flag-gated execution (requires copilot + copilotUi + copilotExec)

import { flags } from '../lib/flags.js';
import { apiPlacesNearby } from '../lib/api-places.js';

/**
 * @typedef {import('./suggestion-types.js').Suggestion} Suggestion
 */

// ---- Simple event bus for action results ----
// UI can subscribe later (Step 20-Pro); for now just console logging

/**
 * @typedef {Object} ActionResult
 * @property {string} type - Result type
 * @property {*} [payload] - Result payload
 */

/** @typedef {function(ActionResult): void} ResultListener */

const resultListeners = new Set();

/**
 * Subscribe to action results
 * @param {ResultListener} fn - Callback function
 * @returns {function(): void} Unsubscribe function
 */
export function onActionResult(fn) {
  resultListeners.add(fn);
  return () => resultListeners.delete(fn);
}

/**
 * Emit action result to all listeners
 * @private
 * @param {ActionResult} result
 */
function emitResult(result) {
  resultListeners.forEach((fn) => {
    try {
      fn(result);
    } catch (err) {
      console.error('[Actions] Listener error:', err);
    }
  });
}

/**
 * Execute Accept action from suggestion
 * @param {Suggestion} suggestion - The accepted suggestion
 * @param {{lat: number, lon: number}|null} [lastFix] - Last known GPS position
 * @returns {Promise<void>}
 */
export async function executeAccept(suggestion, lastFix) {
  // Guard: only execute if all required flags are enabled
  if (!flags.copilot || !flags.copilotUi || !flags.copilotExec) {
    console.info('[Actions] Flags not enabled, skipping execution');
    return;
  }

  const action = suggestion.acceptAction;
  if (!action) {
    console.info('[Actions] No accept action defined for suggestion');
    return;
  }

  console.info('[Actions] Executing action:', action.type, 'for suggestion:', suggestion.kind);

  try {
    switch (action.type) {
      case 'FIND_NEARBY': {
        // Fetch nearby places for the specified category
        const category = (action.payload?.category ?? suggestion.kind);
        if (!lastFix) {
          throw new Error('No GPS position available');
        }

        console.info('[Actions] Fetching nearby', category, 'around', lastFix);
        const result = await apiPlacesNearby({
          lat: lastFix.lat,
          lon: lastFix.lon,
          category: category,
          radius: 5000, // 5km default
        });

        emitResult({
          type: 'NEARBY_RESULTS',
          category: category,
          items: result.items,
          source: result.source,
        });

        console.info(
          `[Actions] Found ${result.items.length} ${category} places (source: ${result.source})`
        );
        if (result.items.length > 0) {
          console.info('[Actions] Top results:', result.items.slice(0, 5));
        }
        break;
      }

      case 'SHOW_SCENIC': {
        // Fetch nearby scenic viewpoints
        if (!lastFix) {
          throw new Error('No GPS position available');
        }

        console.info('[Actions] Fetching scenic viewpoints around', lastFix);
        const result = await apiPlacesNearby({
          lat: lastFix.lat,
          lon: lastFix.lon,
          category: 'scenic',
          radius: 8000, // 8km for scenic spots
        });

        emitResult({
          type: 'NEARBY_RESULTS',
          category: 'scenic',
          items: result.items,
          source: result.source,
        });

        console.info(
          `[Actions] Found ${result.items.length} scenic spots (source: ${result.source})`
        );
        if (result.items.length > 0) {
          console.info('[Actions] Top results:', result.items.slice(0, 5));
        }
        break;
      }

      case 'OPEN_REROUTE': {
        // Placeholder: future integration with routing API
        const mode = action.payload?.mode ?? 'avoid_weather';
        emitResult({
          type: 'REROUTE_PROPOSED',
          mode: mode,
        });
        console.info('[Actions] Reroute proposed (mode:', mode, ') - TODO: integrate with route API');
        break;
      }

      case 'SHIFT_SCHEDULE': {
        // Placeholder: future integration with itinerary API
        const minutes = action.payload?.minutes ?? 15;
        emitResult({
          type: 'SCHEDULE_SHIFT',
          minutes: minutes,
        });
        console.info(
          '[Actions] Schedule shift proposed (+',
          minutes,
          'min) - TODO: integrate with itinerary'
        );
        break;
      }

      default:
        console.warn('[Actions] Unknown action type:', action.type);
        emitResult({
          type: 'ACTION_ERROR',
          error: `Unknown action type: ${action.type}`,
        });
    }
  } catch (error) {
    console.error('[Actions] Execution failed:', error);
    emitResult({
      type: 'ACTION_ERROR',
      error: error.message ?? String(error),
    });
  }
}
