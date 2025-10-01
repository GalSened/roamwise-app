import { describe, it, expect } from 'vitest';
import { generateCandidates } from './candidates.js';

// Helper to create base context frame
const createFrame = (speedKph = 60, weather = null) => ({
  ts: Date.now(),
  fix: {
    ts: Date.now(),
    lat: 45.0,
    lon: 10.0,
    speedKph,
  },
  localTime: new Date().toISOString(),
  weather,
});

describe('generateCandidates', () => {
  it('yields rest suggestion when driving fast', () => {
    const frame = createFrame(60); // 60 km/h - cruising speed
    const suggestions = generateCandidates(frame, true);

    expect(suggestions.some((s) => s.kind === 'rest')).toBe(true);
    const rest = suggestions.find((s) => s.kind === 'rest');
    expect(rest).toBeDefined();
    expect(rest.safety?.minSpeedKph).toBe(30);
  });

  it('yields pace_adjust at low speed', () => {
    const frame = createFrame(10); // 10 km/h - crawling in traffic
    const suggestions = generateCandidates(frame, true);

    expect(suggestions.some((s) => s.kind === 'pace_adjust')).toBe(true);
    const pace = suggestions.find((s) => s.kind === 'pace_adjust');
    expect(pace).toBeDefined();
    expect(pace.safety?.minSpeedKph).toBe(5);
    expect(pace.safety?.maxSpeedKph).toBe(50);
  });

  it('yields weather_reroute only with severe alert', () => {
    const weather = {
      ts: Date.now(),
      alerts: [
        {
          id: 'alert-1',
          title: 'Severe Thunderstorm Warning',
          severity: 'severe',
        },
      ],
    };
    const frame = createFrame(50, weather);
    const suggestions = generateCandidates(frame, true);

    expect(suggestions.some((s) => s.kind === 'weather_reroute')).toBe(true);
    const reroute = suggestions.find((s) => s.kind === 'weather_reroute');
    expect(reroute).toBeDefined();
    expect(reroute.safety?.minSpeedKph).toBe(20);
  });

  it('does not yield weather_reroute without severe alert', () => {
    const weather = {
      ts: Date.now(),
      alerts: [
        {
          id: 'alert-2',
          title: 'Minor Rain Advisory',
          severity: 'minor',
        },
      ],
    };
    const frame = createFrame(50, weather);
    const suggestions = generateCandidates(frame, true);

    expect(suggestions.some((s) => s.kind === 'weather_reroute')).toBe(false);
  });

  it('yields scenic suggestion when moving', () => {
    const frame = createFrame(40); // 40 km/h - moderate speed
    const suggestions = generateCandidates(frame, true);

    expect(suggestions.some((s) => s.kind === 'scenic')).toBe(true);
    const scenic = suggestions.find((s) => s.kind === 'scenic');
    expect(scenic).toBeDefined();
    expect(scenic.safety?.minSpeedKph).toBe(20);
  });

  it('does not yield scenic when severe weather present', () => {
    const weather = {
      ts: Date.now(),
      alerts: [
        {
          id: 'alert-3',
          title: 'Severe Storm',
          severity: 'severe',
        },
      ],
    };
    const frame = createFrame(40, weather);
    const suggestions = generateCandidates(frame, true);

    expect(suggestions.some((s) => s.kind === 'scenic')).toBe(false);
  });

  it('returns empty array when not moving', () => {
    const frame = createFrame(3); // 3 km/h - standing still
    const suggestions = generateCandidates(frame, true);

    expect(suggestions.length).toBe(0);
  });

  it('returns empty array when no fix available', () => {
    const frame = {
      ts: Date.now(),
      fix: null,
      localTime: new Date().toISOString(),
    };
    const suggestions = generateCandidates(frame, true);

    expect(suggestions.length).toBe(0);
  });

  it('includes stable IDs for cooldown management', () => {
    const frame = createFrame(60);
    const suggestions = generateCandidates(frame, true);

    suggestions.forEach((s) => {
      expect(s.id).toBeDefined();
      expect(typeof s.id).toBe('string');
      expect(s.id.length).toBeGreaterThan(0);
    });
  });

  it('includes expiration timestamps', () => {
    const frame = createFrame(60);
    const now = Date.now();
    const suggestions = generateCandidates(frame, true);

    suggestions.forEach((s) => {
      expect(s.expiresAt).toBeDefined();
      expect(s.expiresAt).toBeGreaterThan(now);
    });
  });

  it('includes safety gates for all suggestions', () => {
    const frame = createFrame(60);
    const suggestions = generateCandidates(frame, true);

    suggestions.forEach((s) => {
      expect(s.safety).toBeDefined();
      expect(typeof s.safety).toBe('object');
    });
  });
});
