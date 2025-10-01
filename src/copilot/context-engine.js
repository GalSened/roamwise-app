import { CtxBus } from './context-types.js';
import { flags } from '../lib/flags.js';
import { getPrefs } from './prefs-stream.js';

// ---- Constants ----
const MS = {
  FAST: 1000,           // 1s when moving fast (>70 km/h)
  CRUISE: 5000,         // 5s when cruising (8-70 km/h)
  IDLE: 15000,          // 15s when idle or hidden/battery-saver
};

const MAX_CONSEC_ERR = 3;  // Stop after 3 consecutive errors

// ---- Haversine distance calculation (meters) ----
/**
 * Calculate distance between two points using Haversine formula
 * @param {number} aLat - Point A latitude
 * @param {number} aLon - Point A longitude
 * @param {number} bLat - Point B latitude
 * @param {number} bLon - Point B longitude
 * @returns {number} Distance in meters
 * @export for testing
 */
export function haversineM(aLat, aLon, bLat, bLon) {
  const R = 6371000; // Earth radius in meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---- Production-Ready Context Engine ----
export class ContextEngine {
  constructor() {
    this.bus = new CtxBus();
    this.watchId = null;
    this.lastFix = null;
    this.running = false;
    this.errs = 0;
    this.visible = true;
    this.batterySaver = false;
    this.lastEmitTs = 0;

    // Bind methods for event listeners
    this.handleVisibility = this.handleVisibility.bind(this);
  }

  /**
   * Register a listener for context frames
   * @param {function(import('./context-types.js').ContextFrame): void} fn
   * @returns {function(): void} Unsubscribe function
   */
  on(fn) {
    return this.bus.on(fn);
  }

  /**
   * Start the context engine
   * @returns {Promise<void>}
   */
  async start() {
    // Flag gate
    if (!flags.copilot) {
      console.debug('[ContextEngine] Copilot flag OFF, not starting');
      return;
    }

    // Already running
    if (this.running) {
      console.warn('[ContextEngine] Already running');
      return;
    }

    // Check geolocation support
    if (!('geolocation' in navigator)) {
      console.warn('[ContextEngine] Geolocation not supported');
      return;
    }

    // Permission gate (ask once, cache decision)
    const granted = await this.ensurePermission();
    if (!granted) {
      console.warn('[ContextEngine] Geolocation permission denied');
      return;
    }

    // Start engine
    this.running = true;
    this.visible = !document.hidden;

    // Hook visibility API
    document.addEventListener('visibilitychange', this.handleVisibility, {
      passive: true,
    });

    // Hook battery API (if available)
    this.setupBatteryMonitor();

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePos(pos),
      (err) => this.handleErr(err),
      {
        enableHighAccuracy: true,
        maximumAge: 1500,
        timeout: 8000,
      }
    );

    console.info('[ContextEngine] Started (production v2)');
  }

  /**
   * Stop the context engine
   */
  stop() {
    this.running = false;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibility);

    // Reset state
    this.lastFix = null;
    this.errs = 0;
    this.lastEmitTs = 0;

    console.info('[ContextEngine] Stopped');
  }

  /**
   * Check and request geolocation permission
   * @private
   * @returns {Promise<boolean>}
   */
  async ensurePermission() {
    try {
      // Check permission state (if Permissions API available)
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') {
          return false;
        }
      }

      // One-shot permission request (cached by browser)
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
        });
      });

      return true;
    } catch (err) {
      console.debug('[ContextEngine] Permission request failed:', err.message);
      return false;
    }
  }

  /**
   * Setup battery monitoring (if available)
   * @private
   */
  async setupBatteryMonitor() {
    try {
      if (!navigator.getBattery) return;

      const battery = await navigator.getBattery();

      const updateBatteryState = () => {
        this.batterySaver = battery.level < 0.05 || battery.dischargingTime < 600; // <5% or <10min remaining
      };

      battery.addEventListener('levelchange', updateBatteryState);
      battery.addEventListener('chargingtimechange', updateBatteryState);
      battery.addEventListener('dischargingtimechange', updateBatteryState);

      updateBatteryState();
    } catch (err) {
      // Battery API not available, no-op
      console.debug('[ContextEngine] Battery API not available');
    }
  }

  /**
   * Handle visibility change
   * @private
   */
  handleVisibility() {
    this.visible = !document.hidden;
    console.debug('[ContextEngine] Visibility:', this.visible ? 'visible' : 'hidden');
  }

  /**
   * Handle geolocation error
   * @private
   * @param {GeolocationPositionError} err
   */
  handleErr(err) {
    this.errs++;
    console.warn(`[ContextEngine] Geolocation error (${this.errs}/${MAX_CONSEC_ERR}):`, err.message);

    // Fail-safe: stop after MAX_CONSEC_ERR
    if (this.errs >= MAX_CONSEC_ERR) {
      console.error('[ContextEngine] Too many errors, stopping');
      this.stop();
    }
  }

  /**
   * Handle geolocation position update
   * @private
   * @param {GeolocationPosition} pos
   */
  async handlePos(pos) {
    if (!this.running) return;

    const now = Date.now();
    const { latitude, longitude, accuracy, heading, speed } = pos.coords;

    // Estimate speed (prefer GPS speed, fallback to calculated)
    let speedKph;
    if (typeof speed === 'number' && !Number.isNaN(speed) && speed >= 0) {
      speedKph = speed * 3.6; // m/s to km/h
    } else {
      speedKph = this.estimateSpeed(now, latitude, longitude);
    }

    // Create GeoFix (round to 6 decimals for privacy)
    const fix = {
      ts: now,
      lat: +latitude.toFixed(6),
      lon: +longitude.toFixed(6),
      acc: accuracy !== null && accuracy !== undefined ? accuracy : undefined,
      heading: heading !== null && heading !== undefined ? heading : undefined,
      speedKph,
    };

    // Adaptive sampling: pick interval based on speed
    const interval = this.pickInterval(speedKph);

    // Throttle: only emit if enough time has elapsed
    if (!this.shouldEmit(now, interval)) {
      this.lastFix = fix; // Update last fix for speed estimation
      return;
    }

    // Get current user preferences (if logged in)
    const prefs = getPrefs();

    // Create and emit context frame
    const frame = {
      ts: now,
      fix,
      localTime: new Date(now).toISOString(),
      prefs, // Include user preferences (null if not logged in)
    };

    this.bus.emit(frame);

    // Update state
    this.lastFix = fix;
    this.errs = 0; // Reset error counter on success
  }

  /**
   * Estimate speed from last fix
   * @private
   * @param {number} now
   * @param {number} lat
   * @param {number} lon
   * @returns {number|undefined}
   */
  estimateSpeed(now, lat, lon) {
    if (!this.lastFix) return undefined;

    const dt = (now - this.lastFix.ts) / 1000; // seconds
    if (dt < 0.8) return undefined; // Too soon to estimate

    const distM = haversineM(this.lastFix.lat, this.lastFix.lon, lat, lon);
    const speedMps = distM / dt;
    return speedMps * 3.6; // m/s to km/h
  }

  /**
   * Pick sampling interval based on speed and context
   * @private
   * @param {number|undefined} speedKph
   * @returns {number}
   * @export for testing
   */
  pickInterval(speedKph) {
    // Aggressive throttling when not visible or on battery saver
    if (!this.visible || this.batterySaver) {
      return MS.IDLE;
    }

    // Adaptive based on speed
    const speed = speedKph || 0;
    if (speed > 70) return MS.FAST;   // Fast: 1s
    if (speed > 8) return MS.CRUISE;  // Cruise: 5s
    return MS.IDLE;                   // Idle: 15s
  }

  /**
   * Check if enough time has elapsed to emit
   * @private
   * @param {number} now
   * @param {number} interval
   * @returns {boolean}
   */
  shouldEmit(now, interval) {
    if (now - this.lastEmitTs >= interval) {
      this.lastEmitTs = now;
      return true;
    }
    return false;
  }
}

// Export pickInterval for testing
ContextEngine.prototype.pickInterval = ContextEngine.prototype.pickInterval;
