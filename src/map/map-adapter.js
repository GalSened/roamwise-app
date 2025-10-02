// ---- Leaflet Map Adapter ----
// Provides abstraction for map operations (focus, route drawing)

/** @type {import('leaflet').Map | null} */
let mapRef = null;

/** @type {import('leaflet').Polyline | null} */
let routePolyline = null;

/** @type {import('leaflet').LayerGroup | null} */
let hazardsLayer = null;

/**
 * Register Leaflet map instance for adapter to use
 * @param {import('leaflet').Map} map - Leaflet map instance
 */
export function registerMap(map) {
  mapRef = map;
  console.debug('[MapAdapter] Map registered');
}

/**
 * Focus (center) the map on given coordinates with smooth animation
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} [zoom=15] - Zoom level (default 15)
 */
export function focus(lat, lon, zoom = 15) {
  if (!mapRef) {
    console.warn('[MapAdapter] Cannot focus: map not registered');
    return;
  }

  console.debug('[MapAdapter] Focusing on:', lat, lon, 'zoom:', zoom);
  mapRef.flyTo([lat, lon], zoom, { duration: 0.8 });
}

/**
 * Draw a route on the map as a polyline
 * Removes any existing route polyline first
 * @param {Array<[number, number]>} latlngs - Array of [lat, lon] coordinate pairs
 */
export function drawRoute(latlngs) {
  if (!mapRef) {
    console.warn('[MapAdapter] Cannot draw route: map not registered');
    return;
  }

  if (!latlngs || latlngs.length === 0) {
    console.warn('[MapAdapter] Cannot draw route: empty coordinates');
    return;
  }

  console.debug('[MapAdapter] Drawing route with', latlngs.length, 'points');

  // Remove existing route if any
  clearRoute();

  // Create new polyline (green, weight 5)
  // Access global L from window since Leaflet is loaded via CDN
  if (window.L && window.L.polyline) {
    routePolyline = window.L.polyline(latlngs, {
      color: '#10b981',
      weight: 5,
      opacity: 0.8,
    }).addTo(mapRef);
  } else {
    console.error('[MapAdapter] Leaflet (window.L) not available');
  }
}

/**
 * Clear (remove) the route polyline from the map
 */
export function clearRoute() {
  if (routePolyline) {
    console.debug('[MapAdapter] Clearing route');
    routePolyline.remove();
    routePolyline = null;
  }
}

/**
 * Display hazards on the map as markers
 * @param {Array<{lat: number, lon: number, type: string, severity: string, description: string}>} hazards
 */
export function displayHazards(hazards) {
  if (!mapRef) {
    console.warn('[MapAdapter] Cannot display hazards: map not registered');
    return;
  }

  if (!window.L) {
    console.error('[MapAdapter] Leaflet (window.L) not available');
    return;
  }

  console.debug('[MapAdapter] Displaying', hazards.length, 'hazards');

  // Clear existing hazards
  clearHazards();

  // Create new layer group
  hazardsLayer = window.L.layerGroup().addTo(mapRef);

  // Add markers for each hazard
  hazards.forEach((hazard) => {
    const icon = window.L.divIcon({
      className: 'hazard-marker',
      html: `<div class="hazard-icon hazard-${hazard.type} hazard-severity-${hazard.severity}">
        ${getHazardIcon(hazard.type)}
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = window.L.marker([hazard.lat, hazard.lon], { icon })
      .bindPopup(`
        <div class="hazard-popup">
          <strong>${hazard.type.toUpperCase()}</strong><br/>
          <span class="severity-${hazard.severity}">${hazard.severity}</span><br/>
          ${hazard.description || 'No details available'}
        </div>
      `);

    hazardsLayer.addLayer(marker);
  });
}

/**
 * Clear all hazard markers from the map
 */
export function clearHazards() {
  if (hazardsLayer) {
    console.debug('[MapAdapter] Clearing hazards');
    hazardsLayer.clearLayers();
    hazardsLayer.remove();
    hazardsLayer = null;
  }
}

/**
 * Get icon HTML for hazard type
 * @param {string} type - Hazard type (weather, traffic)
 * @returns {string} Icon HTML
 */
function getHazardIcon(type) {
  const icons = {
    weather: '⚠️',
    traffic: '🚧',
  };
  return icons[type] || '⚠️';
}
