// ---- Route Execution Helper ----
// Temporary route computation using existing apiRoute function

import { apiRoute } from '../lib/api.js';

/**
 * Compute a temporary route between origin and destination
 * Calls the backend /api/route endpoint and normalizes response
 * for Leaflet polyline rendering
 *
 * @param {{lat: number, lon: number}} origin - Origin coordinates
 * @param {{lat: number, lon: number}} dest - Destination coordinates
 * @returns {Promise<Array<[number, number]>>} Array of [lat, lon] coordinate pairs
 */
export async function computeTempRoute(origin, dest) {
  console.debug('[RouteExec] Computing route from', origin, 'to', dest);

  // Build request body for apiRoute
  const body = {
    stops: [origin, dest],
    mode: 'drive',
    constraints: {},
  };

  try {
    // Call backend API (with offline cache support if flag enabled)
    const json = await apiRoute(body);

    console.debug('[RouteExec] Route response:', json);

    // Normalize response to array of [lat, lon] pairs
    // Handle different possible response formats:

    // Format 1: geometry.coordinates (GeoJSON LineString)
    if (json?.geometry?.type === 'LineString' && Array.isArray(json.geometry.coordinates)) {
      // Coordinates in GeoJSON are [lon, lat], need to swap to [lat, lon] for Leaflet
      const coords = json.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      console.debug('[RouteExec] Normalized', coords.length, 'coordinates from geometry.coordinates');
      return coords;
    }

    // Format 2: Direct geometry.coordinates array (already in correct format)
    if (json?.geometry?.coordinates && Array.isArray(json.geometry.coordinates)) {
      // Assume already [lat, lon] if not explicitly LineString type
      const coords = json.geometry.coordinates;
      console.debug('[RouteExec] Using', coords.length, 'coordinates from geometry.coordinates');
      return coords;
    }

    // Format 3: polyline array (legacy format, [lat, lon] pairs)
    if (json?.polyline && Array.isArray(json.polyline)) {
      console.debug('[RouteExec] Using', json.polyline.length, 'coordinates from polyline');
      return json.polyline;
    }

    // Format 4: steps with coordinates
    if (json?.steps && Array.isArray(json.steps)) {
      const coords = json.steps
        .filter((step) => step.lat && step.lon)
        .map((step) => [step.lat, step.lon]);
      console.debug('[RouteExec] Extracted', coords.length, 'coordinates from steps');
      return coords;
    }

    // Fallback: no valid route data found
    console.warn('[RouteExec] No valid route coordinates in response:', json);
    return [];
  } catch (error) {
    console.error('[RouteExec] Failed to compute route:', error);
    throw error;
  }
}
