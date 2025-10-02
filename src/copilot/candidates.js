// ---- Production Candidate Generation ----

/**
 * Get scenic density setting from localStorage
 * @returns {'low'|'normal'|'high'}
 */
function getScenicDensity() {
  try {
    const val = localStorage.getItem('scenicDensity');
    return (val === 'low' || val === 'high') ? val : 'normal';
  } catch {
    return 'normal';
  }
}

/**
 * Generate suggestion candidates based on context frame
 * @param {import('./context-types.js').ContextFrame} frame - Current context frame
 * @param {boolean} visible - Whether tab is currently visible
 * @returns {import('./suggestion-types.js').Suggestion[]}
 */
export function generateCandidates(frame, visible) {
  const out = [];
  const now = Date.now();
  const fix = frame.fix;

  if (!fix) return out;

  const speedKph = fix.speedKph ?? 0;
  const moving = speedKph > 8; // Above walking speed
  const driving = speedKph > 40; // Road speed

  // Helper: create time bucket IDs (stable IDs for cooldown)
  const minuteBucket = (minutes) => Math.floor(now / (minutes * 60 * 1000));

  // Check for severe weather alerts (requires external weather data in frame)
  const severe = frame.weather?.alerts?.some((a) => a.severity === 'severe');

  // ---- Suggestion 1: Weather Reroute ----
  // Only if severe weather alert present and user is moving
  if (severe && moving) {
    out.push({
      id: `wx_reroute_${minuteBucket(10)}`, // 10-minute bucket
      ts: now,
      kind: 'weather_reroute',
      title: 'Severe weather ahead — consider reroute',
      reason: 'Severe weather alert in vicinity',
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      safety: { minSpeedKph: 20, visibleOnly: false },
      acceptAction: { type: 'OPEN_REROUTE', payload: { mode: 'avoid_weather' } },
      declineAction: { type: 'SNOOZE', payload: { minutes: 10 } },
    });
  }

  // ---- Suggestion 2: Rest Stop ----
  // Every ~2 hours of driving (bucketed)
  if (driving) {
    out.push({
      id: `rest_${minuteBucket(120)}`, // 2-hour bucket
      ts: now,
      kind: 'rest',
      title: 'Consider a rest stop soon',
      reason: 'Driving for a long stretch',
      expiresAt: now + 20 * 60 * 1000, // 20 minutes
      safety: { minSpeedKph: 30, visibleOnly: false },
      acceptAction: { type: 'FIND_NEARBY', payload: { category: 'rest' } },
      declineAction: { type: 'SNOOZE', payload: { minutes: 30 } },
    });
  }

  // ---- Suggestion 3: Pace Adjust ----
  // If crawling in traffic for several minutes
  if (moving && speedKph < 15) {
    out.push({
      id: `pace_${minuteBucket(5)}`, // 5-minute bucket
      ts: now,
      kind: 'pace_adjust',
      title: 'Traffic is heavy — adjust schedule?',
      reason: 'Sustained low speed detected',
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      safety: { minSpeedKph: 5, maxSpeedKph: 50, visibleOnly: false },
      acceptAction: { type: 'SHIFT_SCHEDULE', payload: { minutes: 20 } },
      declineAction: { type: 'IGNORE' },
    });
  }

  // ---- Suggestion 4: Scenic Viewpoint ----
  // Periodic nudge if moving and no severe weather
  if (moving && !severe) {
    const density = getScenicDensity();
    const scenicMin = density === 'low' ? 30 : density === 'high' ? 8 : 15;

    out.push({
      id: `scenic_${minuteBucket(scenicMin)}`,
      ts: now,
      kind: 'scenic',
      title: 'Scenic viewpoint nearby (check when safe)',
      reason: `Scenic density: ${density}`,
      expiresAt: now + scenicMin * 60 * 1000,
      safety: { minSpeedKph: 20, visibleOnly: false },
      acceptAction: { type: 'SHOW_SCENIC', payload: {} },
      declineAction: { type: 'SNOOZE', payload: { minutes: 30 } },
    });
  }

  // Future: fuel/food hooks reserved for Places API integration

  return out;
}
