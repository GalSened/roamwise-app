import { describe, it, expect } from 'vitest';
import { haversineM, ContextEngine } from './context-engine.js';

describe('haversineM', () => {
  it('should calculate distance between two points correctly', () => {
    // Tel Aviv (32.0853° N, 34.7818° E) to Jerusalem (31.7683° N, 35.2137° E)
    const telAvivLat = 32.0853;
    const telAvivLon = 34.7818;
    const jerusalemLat = 31.7683;
    const jerusalemLon = 35.2137;

    const distance = haversineM(telAvivLat, telAvivLon, jerusalemLat, jerusalemLon);

    // Expected distance is approximately 54km = 54,000m
    expect(distance).toBeGreaterThan(53000);
    expect(distance).toBeLessThan(55000);
  });

  it('should return 0 for identical points', () => {
    const lat = 40.7128;
    const lon = -74.0060;

    const distance = haversineM(lat, lon, lat, lon);

    expect(distance).toBe(0);
  });

  it('should calculate short distances accurately', () => {
    // Two points 100m apart (approximately)
    const lat1 = 40.7128;
    const lon1 = -74.0060;
    const lat2 = 40.7137; // ~1km north
    const lon2 = -74.0060;

    const distance = haversineM(lat1, lon1, lat2, lon2);

    // Should be approximately 1000m
    expect(distance).toBeGreaterThan(900);
    expect(distance).toBeLessThan(1100);
  });
});

describe('ContextEngine.prototype.pickInterval', () => {
  it('should return FAST interval for high speed (>70 km/h)', () => {
    const engine = new ContextEngine();
    engine.visible = true;
    engine.batterySaver = false;

    const interval = engine.pickInterval(80);

    expect(interval).toBe(1000); // MS.FAST
  });

  it('should return CRUISE interval for moderate speed (8-70 km/h)', () => {
    const engine = new ContextEngine();
    engine.visible = true;
    engine.batterySaver = false;

    const interval1 = engine.pickInterval(50);
    const interval2 = engine.pickInterval(9);

    expect(interval1).toBe(5000); // MS.CRUISE
    expect(interval2).toBe(5000); // MS.CRUISE
  });

  it('should return IDLE interval for low speed (<8 km/h)', () => {
    const engine = new ContextEngine();
    engine.visible = true;
    engine.batterySaver = false;

    const interval1 = engine.pickInterval(5);
    const interval2 = engine.pickInterval(0);

    expect(interval1).toBe(15000); // MS.IDLE
    expect(interval2).toBe(15000); // MS.IDLE
  });

  it('should return IDLE interval when not visible', () => {
    const engine = new ContextEngine();
    engine.visible = false;
    engine.batterySaver = false;

    const interval = engine.pickInterval(80); // Even at high speed

    expect(interval).toBe(15000); // MS.IDLE
  });

  it('should return IDLE interval when battery saver is active', () => {
    const engine = new ContextEngine();
    engine.visible = true;
    engine.batterySaver = true;

    const interval = engine.pickInterval(80); // Even at high speed

    expect(interval).toBe(15000); // MS.IDLE
  });

  it('should handle undefined speed as idle', () => {
    const engine = new ContextEngine();
    engine.visible = true;
    engine.batterySaver = false;

    const interval = engine.pickInterval(undefined);

    expect(interval).toBe(15000); // MS.IDLE
  });

  it('should handle null speed as idle', () => {
    const engine = new ContextEngine();
    engine.visible = true;
    engine.batterySaver = false;

    const interval = engine.pickInterval(null);

    expect(interval).toBe(15000); // MS.IDLE
  });

  it('should respect battery saver over visibility', () => {
    const engine = new ContextEngine();
    engine.visible = true;
    engine.batterySaver = true;

    const interval = engine.pickInterval(100);

    expect(interval).toBe(15000); // MS.IDLE
  });
});
