// ---- Route API ----
// Real routing via OSRM with cache, timeout, circuit breaker

import express from 'express';
import { z } from 'zod';
import { LRUCache } from 'lru-cache';

const router = express.Router();

// Configuration from environment variables
const OSRM_URL = process.env.OSRM_URL || 'http://localhost:5000';
const TIMEOUT_MS = Number(process.env.ROUTE_TIMEOUT_MS || 12000);
const CACHE_MAX = Number(process.env.ROUTE_CACHE_MAX || 1000);
const CACHE_TTL_MS = Number(process.env.ROUTE_CACHE_TTL_MS || 5 * 60 * 1000); // 5 min

// Circuit breaker state
let breakerUntil = 0;

// LRU cache for route responses
const cache = new LRUCache({
  max: CACHE_MAX,
  ttl: CACHE_TTL_MS,
});

// Validation schema
const routeSchema = z.object({
  stops: z.array(z.object({
    lat: z.number().gte(-90).lte(90),
    lon: z.number().gte(-180).lte(180),
  })).min(2).max(5),
  mode: z.enum(['drive']).default('drive'),
  constraints: z.record(z.any()).optional()
});

/**
 * Generate cache key from stops (rounded to reduce churn)
 */
function keyFor(stops) {
  const s = stops
    .map(p => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`)
    .join('->');
  return `r:${s}`;
}

/**
 * POST /api/route
 * Compute route between stops using OSRM
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const result = routeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        code: 'invalid_request',
        details: result.error.flatten()
      });
    }

    const { stops } = result.data;
    const k = keyFor(stops);

    // Check cache first
    const hit = cache.get(k);
    if (hit) {
      console.debug('[Route] Cache hit for key:', k);
      return res.json(hit);
    }

    // Circuit breaker: short-circuit if provider was failing recently
    const now = Date.now();
    if (now < breakerUntil) {
      console.warn('[Route] Circuit breaker open, provider temporarily unavailable');
      return res.status(503).json({
        ok: false,
        code: 'provider_unavailable',
        message: 'Route provider temporarily unavailable'
      });
    }

    // Build OSRM URL (support exactly 2 stops for now; can extend later)
    const [a, b] = [stops[0], stops[stops.length - 1]];
    const coords = `${a.lon},${a.lat};${b.lon},${b.lat}`;
    const url = `${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=false`;

    console.debug('[Route] Calling OSRM:', url);

    // Make request with timeout
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), TIMEOUT_MS);

    try {
      const r = await fetch(url, { signal: ac.signal });
      clearTimeout(tid);

      if (!r.ok) {
        console.error('[Route] OSRM HTTP error:', r.status);
        // Set breaker for 60s on 5xx errors
        if (r.status >= 500) {
          breakerUntil = Date.now() + 60_000;
        }
        return res.status(502).json({
          ok: false,
          code: 'provider_failed',
          status: r.status
        });
      }

      const json = await r.json();

      // Validate OSRM response
      if (json.code !== 'Ok' || !json.routes?.length) {
        console.error('[Route] OSRM returned no route:', json.code);
        return res.status(502).json({
          ok: false,
          code: 'no_route',
          message: json.message || 'No route found'
        });
      }

      const route = json.routes[0];

      // Build response in format expected by frontend
      // Frontend expects: { ok, distance_m, duration_s, geometry: { type: 'FeatureCollection', features: [...] } }
      const featureCollection = {
        ok: true,
        distance_m: Math.round(route.distance ?? 0),
        duration_s: Math.round(route.duration ?? 0),
        geometry: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: route.geometry // GeoJSON LineString from OSRM
          }]
        }
      };

      // Cache the successful response
      cache.set(k, featureCollection);
      console.debug('[Route] Cached response for key:', k);

      return res.json(featureCollection);

    } catch (error) {
      clearTimeout(tid);

      // Network/timeout errors → short breaker (30s)
      breakerUntil = Date.now() + 30_000;

      const isTimeout = error?.name === 'AbortError';
      console.error('[Route] Provider error:', isTimeout ? 'timeout' : error.message);

      return res.status(502).json({
        ok: false,
        code: 'provider_error',
        message: isTimeout ? 'timeout' : String(error)
      });
    }

  } catch (error) {
    console.error('[Route] Unexpected error:', error);
    return res.status(500).json({
      ok: false,
      code: 'internal_error',
      message: error.message
    });
  }
});

export default router;
