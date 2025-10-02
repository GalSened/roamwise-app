/**
 * Generate deep links to external navigation apps
 */

/**
 * Generate Google Maps navigation URL
 * @param lat - Destination latitude
 * @param lon - Destination longitude
 * @returns Google Maps URL for navigation
 */
export function googleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

/**
 * Generate Apple Maps navigation URL
 * @param lat - Destination latitude
 * @param lon - Destination longitude
 * @returns Apple Maps URL for navigation
 */
export function appleMapsUrl(lat: number, lon: number): string {
  return `http://maps.apple.com/?daddr=${lat},${lon}`;
}

/**
 * Generate Waze navigation URL
 * @param lat - Destination latitude
 * @param lon - Destination longitude
 * @returns Waze URL for navigation
 */
export function wazeUrl(lat: number, lon: number): string {
  return `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
}
