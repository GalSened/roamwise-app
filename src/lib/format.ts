/**
 * Format distance in meters to human-readable string
 * @param meters - Distance in meters
 * @returns Formatted string like "3.6 km" or "850 m"
 */
export function fmtDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "7 min" or "1 hr 23 min"
 */
export function fmtDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  }
  return `${minutes} min`;
}
