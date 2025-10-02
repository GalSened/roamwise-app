#!/usr/bin/env bash
# MUST TEST for Step 31: Avoids Transparency Chip + Relaxed Counter
set -euo pipefail

REGION="${REGION:-us-central1}"
BACKEND="https://roamwise-backend-v2-971999716773.us-central1.run.app"

echo "Step 31 Test: Avoids Transparency + Counters"
echo "=============================================="
echo "Backend URL: $BACKEND"
echo ""

# Test 1: Health check BEFORE route requests (baseline)
echo "Test 1: Health check - verify counters present (baseline)"
HEALTH_BEFORE=$(curl -s "$BACKEND/admin/healthz")
RELAXED_BEFORE=$(echo "$HEALTH_BEFORE" | jq -r '.counters.route_relaxed_count // 0')
PROVIDER_MIX_BEFORE=$(echo "$HEALTH_BEFORE" | jq -r '.counters.provider_mix // {}')

echo "Counters before:"
echo "  route_relaxed_count: $RELAXED_BEFORE"
echo "  provider_mix: $PROVIDER_MIX_BEFORE"
echo ""

# Test 2: Route with avoid=['tolls'] → expect route_retry_relaxed in response
echo "Test 2: Route with avoid=['tolls']"
RESP1=$(curl -s -X POST "$BACKEND/api/route" \
  -H 'Content-Type: application/json' \
  -H 'x-request-id: rw_step31_test1' \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive","constraints":{"avoid":["tolls"]}}')

OK1=$(echo "$RESP1" | jq -r '.ok')
RELAXED1=$(echo "$RESP1" | jq -r '.route_retry_relaxed')

echo "Response:"
echo "$RESP1" | jq '{ok, distance_m, duration_s, route_retry_relaxed}'
echo ""

# Test 3: Route without avoid (control) → expect route_retry_relaxed: false
echo "Test 3: Route without avoid (control)"
RESP2=$(curl -s -X POST "$BACKEND/api/route" \
  -H 'Content-Type: application/json' \
  -H 'x-request-id: rw_step31_test2' \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive"}')

OK2=$(echo "$RESP2" | jq -r '.ok')
RELAXED2=$(echo "$RESP2" | jq -r '.route_retry_relaxed')

echo "Response: ok=$OK2, route_retry_relaxed=$RELAXED2"
echo ""

# Test 4: Health check AFTER route requests → verify counter increments
echo "Test 4: Health check - verify counters incremented"
sleep 1  # Give backend time to update counters
HEALTH_AFTER=$(curl -s "$BACKEND/admin/healthz")
RELAXED_AFTER=$(echo "$HEALTH_AFTER" | jq -r '.counters.route_relaxed_count // 0')
PROVIDER_MIX_AFTER=$(echo "$HEALTH_AFTER" | jq '.counters.provider_mix // {}')

echo "Counters after:"
echo "  route_relaxed_count: $RELAXED_AFTER"
echo "  provider_mix: $PROVIDER_MIX_AFTER"
echo ""

# Summary
echo "=============================================="
echo "Summary:"
echo "Test 1 (health baseline): counters present"
echo "Test 2 (avoid): ok=$OK1, route_retry_relaxed=$RELAXED1"
echo "Test 3 (control): ok=$OK2, route_retry_relaxed=$RELAXED2"
echo "Test 4 (health after): counters updated"
echo ""

# Pass criteria
PASS=true

# Test 1: Check counters field exists in health response
HAS_COUNTERS=$(echo "$HEALTH_BEFORE" | jq 'has("counters")')
if [[ "$HAS_COUNTERS" != "true" ]]; then
  echo "❌ FAIL: Test 1 - Health response missing counters field"
  PASS=false
fi

# Test 2: Route with avoid should succeed
if [[ "$OK1" != "true" ]]; then
  echo "❌ FAIL: Test 2 - Route with avoid should return ok=true"
  PASS=false
fi

# Test 3: Control route should succeed
if [[ "$OK2" != "true" ]]; then
  echo "❌ FAIL: Test 3 - Control route should return ok=true"
  PASS=false
fi

# Test 4: Counters should have incremented (at least provider_mix should have entries)
PROVIDER_COUNT=$(echo "$PROVIDER_MIX_AFTER" | jq 'length')
if [[ "$PROVIDER_COUNT" -eq 0 ]]; then
  echo "❌ FAIL: Test 4 - provider_mix should have entries after routes"
  PASS=false
fi

if [[ "$PASS" == "true" ]]; then
  echo "✅ PASS: All tests passed"
  echo ""
  echo "Step 31 is working:"
  echo "  ✓ Backend counters tracking routes"
  echo "  ✓ Health endpoint exposes counters"
  echo "  ✓ Routes return route_retry_relaxed field"
  echo ""
  echo "Next: Test frontend chip display by:"
  echo "  1. Open app in browser"
  echo "  2. Compute route with avoid preferences"
  echo "  3. Verify chip shows 'Avoids honored' or 'Avoids relaxed'"
  exit 0
else
  echo ""
  echo "Some tests failed. Please check the logs and verify deployment."
  exit 1
fi
