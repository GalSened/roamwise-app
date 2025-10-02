#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-us-central1}"
PROXY_URL="${PROXY_URL:-$(gcloud run services describe roamwise-proxy --region $REGION --format='value(status.url)' 2>/dev/null || echo '')}"
BACKEND_V2_URL="${BACKEND_V2_URL:-$(gcloud run services describe roamwise-backend-v2 --region $REGION --format='value(status.url)' 2>/dev/null || echo '')}"
OSRM_URL="${OSRM_URL:-$(gcloud run services describe roamwise-osrm --region $REGION --format='value(status.url)' 2>/dev/null || echo '')}"

# Fallback to hardcoded URLs if gcloud unavailable
PROXY_URL="${PROXY_URL:-https://roamwise-proxy-2t6n2rxiaa-uc.a.run.app}"
BACKEND_V2_URL="${BACKEND_V2_URL:-https://roamwise-backend-v2-2t6n2rxiaa-uc.a.run.app}"
OSRM_URL="${OSRM_URL:-https://roamwise-osrm-2t6n2rxiaa-uc.a.run.app}"

echo "=== MUST TEST: RoamWise Smoke Tests ==="
echo "[urls] PROXY=$PROXY_URL"
echo "       BACKEND_V2=$BACKEND_V2_URL"
echo "       OSRM=$OSRM_URL"
echo ""

# Track pass/fail
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: OSRM Reachability
echo "1) OSRM reachable (expect Ok):"
OSRM_CODE=$(curl -s "$OSRM_URL/route/v1/driving/34.7818,32.0853;34.8000,32.0800?overview=false" | jq -r '.code // "ERROR"')
if [ "$OSRM_CODE" = "Ok" ]; then
  echo "   ✅ OSRM returned: $OSRM_CODE"
  ((TESTS_PASSED++))
else
  echo "   ❌ OSRM returned: $OSRM_CODE (expected: Ok)"
  ((TESTS_FAILED++))
fi
echo ""

# Test 2: /api/route via proxy
echo "2) /api/route via proxy (expect ok:true, numbers):"
ROUTE_RESPONSE=$(curl -s -X POST "$PROXY_URL/api/route" \
  -H 'content-type: application/json' \
  -H "x-request-id: rw_musttest_route_$(date +%s)" \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}]}')

ROUTE_OK=$(echo "$ROUTE_RESPONSE" | jq -r '.ok // false')
ROUTE_DIST=$(echo "$ROUTE_RESPONSE" | jq -r '.distance_m // 0')
ROUTE_DUR=$(echo "$ROUTE_RESPONSE" | jq -r '.duration_s // 0')
ROUTE_GEO=$(echo "$ROUTE_RESPONSE" | jq -r '.geometry.type // "MISSING"')

if [ "$ROUTE_OK" = "true" ] && [ "$ROUTE_DIST" -gt 0 ] && [ "$ROUTE_DUR" -gt 0 ] && [ "$ROUTE_GEO" = "FeatureCollection" ]; then
  echo "   ✅ Route: ok=$ROUTE_OK, distance_m=$ROUTE_DIST, duration_s=$ROUTE_DUR, geo=$ROUTE_GEO"
  ((TESTS_PASSED++))
else
  echo "   ❌ Route: ok=$ROUTE_OK, distance_m=$ROUTE_DIST, duration_s=$ROUTE_DUR, geo=$ROUTE_GEO"
  echo "   Full response: $ROUTE_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# Test 3: /api/hazards via proxy
echo "3) /api/hazards via proxy (expect ok:true):"
HAZARDS_RESPONSE=$(curl -s "$PROXY_URL/api/hazards?lat=32.0853&lon=34.7818&radius=10000" \
  -H "x-request-id: rw_musttest_haz_$(date +%s)")

HAZARDS_OK=$(echo "$HAZARDS_RESPONSE" | jq -r '.ok // false')
HAZARDS_SEVERE=$(echo "$HAZARDS_RESPONSE" | jq -r '.severe // false')
HAZARDS_WEATHER=$(echo "$HAZARDS_RESPONSE" | jq -r '.counts.weather // 0')
HAZARDS_TRAFFIC=$(echo "$HAZARDS_RESPONSE" | jq -r '.counts.traffic // 0')

if [ "$HAZARDS_OK" = "true" ]; then
  echo "   ✅ Hazards: ok=$HAZARDS_OK, severe=$HAZARDS_SEVERE, weather=$HAZARDS_WEATHER, traffic=$HAZARDS_TRAFFIC"
  ((TESTS_PASSED++))
else
  echo "   ❌ Hazards: ok=$HAZARDS_OK"
  echo "   Full response: $HAZARDS_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# Test 4: Health dashboard JSON
echo "4) Health dashboard JSON (expect ok or providers status):"
HEALTH_RESPONSE=$(curl -s "$BACKEND_V2_URL/admin/healthz")
HEALTH_OK=$(echo "$HEALTH_RESPONSE" | jq -r '.ok | tostring')
OSRM_UP=$(echo "$HEALTH_RESPONSE" | jq -r '.providers.osrm.up | tostring')
OVERPASS_UP=$(echo "$HEALTH_RESPONSE" | jq -r '.providers.overpass.up | tostring')

# Pass if we got a valid response with ok field (can be true or false)
if [ "$HEALTH_OK" = "true" ] || [ "$HEALTH_OK" = "false" ]; then
  echo "   ✅ Health: ok=$HEALTH_OK, osrm_up=$OSRM_UP, overpass_up=$OVERPASS_UP"
  ((TESTS_PASSED++))
else
  echo "   ❌ Health endpoint returned invalid response"
  echo "   Full response: $HEALTH_RESPONSE"
  ((TESTS_FAILED++))
fi
echo ""

# Test 5: Request-ID propagation instructions
echo "5) Request-ID propagation check:"
echo "   📋 To verify x-request-id propagation in Cloud Run logs:"
echo "      - Search for: rw_musttest_route_* in proxy and backend-v2 logs"
echo "      - Search for: rw_musttest_haz_* in proxy and backend-v2 logs"
echo "      - Expected fields: req_id, event, ms, route"
echo "   ⚠️  This is a manual verification step"
echo ""

# Summary
echo "=== SUMMARY ==="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo "✅ All automated tests passed!"
  exit 0
else
  echo "❌ Some tests failed. Review output above."
  exit 1
fi
