// ---- Route Execution Helper ----
// Temporary route computation using existing apiRoute function

import { apiRoute } from '../lib/api.js';
import { getPrefs } from '../copilot/prefs-stream.js';

/**
 * Compute a temporary route between origin and destination
 * Calls the backend /api/route endpoint and normalizes response
 * for Leaflet polyline rendering
 *
 * @param {{lat: number, lon: number}} origin - Origin coordinates
 * @param {{lat: number, lon: number}} dest - Destination coordinates
 * @returns {Promise<{coordinates: Array<[number, number]>, distance_m: number, duration_s: number, route_retry_relaxed: boolean}>}
 */
export async function computeTempRoute(origin, dest) {
  console.debug('[RouteExec] Computing route from', origin, 'to', dest);

  // Get current user preferences for avoid settings
  const prefs = getPrefs() || {};
  const avoid = Array.isArray(prefs.avoid) ? prefs.avoid : [];

  // Build request body for apiRoute
  const body = {
    stops: [origin, dest],
    mode: 'drive',
    constraints: { avoid },
  };

  try {
    // Call backend API (with offline cache support if flag enabled)
    const json = await apiRoute(body);

    console.debug('[RouteExec] Route response:', json);

    // Extract metadata
    const distance_m = json?.distance_m || 0;
    const duration_s = json?.duration_s || 0;
    const route_retry_relaxed = json?.route_retry_relaxed ?? false;

    // Normalize response to array of [lat, lon] pairs
    // Handle different possible response formats:

    let coordinates = [];

    // Format 1: geometry.features[0].geometry.coordinates (FeatureCollection from backend-v2)
    if (json?.geometry?.features?.[0]?.geometry?.type === 'LineString') {
      const geom = json.geometry.features[0].geometry;
      // Coordinates in GeoJSON are [lon, lat], need to swap to [lat, lon] for Leaflet
      coordinates = geom.coordinates.map(([lon, lat]) => [lat, lon]);
      console.debug('[RouteExec] Normalized', coordinates.length, 'coordinates from FeatureCollection');
    }
    // Format 2: geometry.coordinates (GeoJSON LineString)
    else if (json?.geometry?.type === 'LineString' && Array.isArray(json.geometry.coordinates)) {
      // Coordinates in GeoJSON are [lon, lat], need to swap to [lat, lon] for Leaflet
      coordinates = json.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      console.debug('[RouteExec] Normalized', coordinates.length, 'coordinates from geometry.coordinates');
    }
    // Format 3: Direct geometry.coordinates array (already in correct format)
    else if (json?.geometry?.coordinates && Array.isArray(json.geometry.coordinates)) {
      // Assume already [lat, lon] if not explicitly LineString type
      coordinates = json.geometry.coordinates;
      console.debug('[RouteExec] Using', coordinates.length, 'coordinates from geometry.coordinates');
    }
    // Format 4: polyline array (legacy format, [lat, lon] pairs)
    else if (json?.polyline && Array.isArray(json.polyline)) {
      coordinates = json.polyline;
      console.debug('[RouteExec] Using', json.polyline.length, 'coordinates from polyline');
    }
    // Format 5: steps with coordinates
    else if (json?.steps && Array.isArray(json.steps)) {
      coordinates = json.steps
        .filter((step) => step.lat && step.lon)
        .map((step) => [step.lat, step.lon]);
      console.debug('[RouteExec] Extracted', coordinates.length, 'coordinates from steps');
    }

    // Fallback: no valid route data found
    if (coordinates.length === 0) {
      console.warn('[RouteExec] No valid route coordinates in response:', json);
    }

    return { coordinates, distance_m, duration_s, route_retry_relaxed };
  } catch (error) {
    console.error('[RouteExec] Failed to compute route:', error);
    throw error;
  }
}
