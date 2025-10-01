import { CtxBus } from './context-types.js';
import { apiWeather } from '../lib/api.js';

// ---- Haversine distance calculation ----
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// ---- Context Engine ----
export class ContextEngine {
  constructor() {
    this.watchId = null;
    this.lastGeo = null; // Last GeoFix
    this.lastWeather = null; // Last WeatherDelta
    this.lastWeatherFetch = 0; // Timestamp of last weather fetch
    this.bus = new CtxBus();

    // Configuration
    this.GPS_INTERVAL = 5000; // 5 seconds between GPS updates
    this.WEATHER_INTERVAL = 600000; // 10 minutes between weather updates
    this.lastGpsTime = 0; // Throttle GPS updates
  }

  /**
   * Start the context engine
   * @returns {Promise<void>}
   */
  async start() {
    if (this.watchId !== null) {
      console.warn('[ContextEngine] Already running');
      return;
    }

    // Check geolocation support
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    console.info('[ContextEngine] Starting GPS watch...');

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this._onGeoUpdate(position),
      (error) => this._onGeoError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  /**
   * Stop the context engine
   */
  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.info('[ContextEngine] Stopped');
    }

    // Reset state
    this.lastGeo = null;
    this.lastWeather = null;
    this.lastWeatherFetch = 0;
    this.lastGpsTime = 0;
  }

  /**
   * Subscribe to context frames
   * @param {function(ContextFrame): void} fn - Callback function
   */
  subscribe(fn) {
    this.bus.subscribe(fn);
  }

  /**
   * Unsubscribe from context frames
   * @param {function(ContextFrame): void} fn - Callback function
   */
  unsubscribe(fn) {
    this.bus.unsubscribe(fn);
  }

  /**
   * Handle geolocation update
   * @private
   */
  async _onGeoUpdate(position) {
    const now = Date.now();

    // Throttle: only process if GPS_INTERVAL has elapsed
    if (now - this.lastGpsTime < this.GPS_INTERVAL) {
      return;
    }
    this.lastGpsTime = now;

    const { latitude, longitude, accuracy, heading } = position.coords;

    // Estimate speed if we have a previous position
    let speed = null;
    if (this.lastGeo) {
      const dist = haversineDistance(
        this.lastGeo.lat,
        this.lastGeo.lng,
        latitude,
        longitude
      );
      const timeDiffHours = (now - this.lastGeo.timestamp) / (1000 * 60 * 60);
      if (timeDiffHours > 0) {
        speed = dist / timeDiffHours; // km/h
      }
    }

    // Create GeoFix
    const geoFix = {
      lat: latitude,
      lng: longitude,
      accuracy,
      timestamp: now,
      heading: heading ?? null,
      speed,
    };

    this.lastGeo = geoFix;

    // Maybe refresh weather
    await this._maybeRefreshWeather(latitude, longitude, now);

    // Emit context frame
    this._emitFrame();
  }

  /**
   * Handle geolocation error
   * @private
   */
  _onGeoError(error) {
    console.error('[ContextEngine] Geolocation error:', error.message);
  }

  /**
   * Fetch weather if enough time has elapsed
   * @private
   */
  async _maybeRefreshWeather(lat, lng, now) {
    const elapsed = now - this.lastWeatherFetch;

    if (elapsed < this.WEATHER_INTERVAL && this.lastWeather) {
      // Weather is still fresh
      return;
    }

    try {
      console.info('[ContextEngine] Fetching weather...');
      const weatherData = await apiWeather({ lat, lon: lng, ts: now });

      this.lastWeather = {
        temp: weatherData.temp ?? null,
        conditions: weatherData.conditions ?? 'unknown',
        fetched_at: now,
      };
      this.lastWeatherFetch = now;
    } catch (err) {
      console.warn('[ContextEngine] Weather fetch failed:', err.message);
      // Keep last weather if available
    }
  }

  /**
   * Emit a context frame to subscribers
   * @private
   */
  _emitFrame() {
    if (!this.lastGeo) {
      return; // No GPS data yet
    }

    const frame = {
      geo: this.lastGeo,
      weather: this.lastWeather,
      emitted_at: Date.now(),
    };

    console.log('[ContextEngine] Frame:', {
      lat: frame.geo.lat.toFixed(6),
      lng: frame.geo.lng.toFixed(6),
      speed: frame.geo.speed ? `${frame.geo.speed.toFixed(1)} km/h` : 'null',
      weather: frame.weather
        ? `${frame.weather.temp}°C ${frame.weather.conditions}`
        : 'null',
    });

    this.bus.emit(frame);
  }
}
