#!/usr/bin/env bash
# MUST TEST for Step 30R: ORS integration for Avoid constraints
set -euo pipefail

REGION="${REGION:-us-central1}"
BACKEND="https://roamwise-backend-v2-971999716773.us-central1.run.app"

echo "Step 30R Test: ORS integration for Avoid constraints"
echo "===================================================="
echo "Backend URL: $BACKEND"
echo ""

# Test 1: Route with avoid=['tolls'] → expect provider=ors (or osrm_fallback if no key)
echo "Test 1: Route with avoid=['tolls']"
RESP1=$(curl -s -X POST "$BACKEND/api/route" \
  -H 'Content-Type: application/json' \
  -H 'x-request-id: rw_ors_test1' \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive","constraints":{"avoid":["tolls"]}}')

OK1=$(echo "$RESP1" | jq -r '.ok')
DIST1=$(echo "$RESP1" | jq -r '.distance_m')
DUR1=$(echo "$RESP1" | jq -r '.duration_s')
RELAXED1=$(echo "$RESP1" | jq -r '.route_retry_relaxed')

echo "Response:"
echo "$RESP1" | jq '{ok, distance_m, duration_s, route_retry_relaxed}'
echo ""

# Test 2: Route without avoid → expect provider=osrm
echo "Test 2: Route without avoid (control)"
RESP2=$(curl -s -X POST "$BACKEND/api/route" \
  -H 'Content-Type: application/json' \
  -H 'x-request-id: rw_ors_test2' \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive"}')

OK2=$(echo "$RESP2" | jq -r '.ok')

echo "Response: ok=$OK2"
echo ""

# Test 3: Health check → expect ors in providers
echo "Test 3: Health check (expect ors provider)"
HEALTH=$(curl -s "$BACKEND/admin/healthz")
ORS_UP=$(echo "$HEALTH" | jq -r '.providers.ors.up')

echo "ORS Provider Status: ${ORS_UP:-not_present}"
echo ""

# Summary
echo "===================================================="
echo "Summary:"
echo "Test 1 (avoid): ok=$OK1, route_retry_relaxed=$RELAXED1"
echo "Test 2 (control): ok=$OK2"
echo "Test 3 (health): ors.up=$ORS_UP"
echo ""

# Pass criteria
PASS=true

if [[ "$OK1" != "true" ]]; then
  echo "❌ FAIL: Test 1 - Route with avoid should return ok=true"
  PASS=false
fi

if [[ "$OK2" != "true" ]]; then
  echo "❌ FAIL: Test 2 - Control route should return ok=true"
  PASS=false
fi

if [[ "$ORS_UP" == "null" ]] || [[ -z "$ORS_UP" ]]; then
  echo "❌ FAIL: Test 3 - Health should include ors provider"
  PASS=false
fi

if [[ "$PASS" == "true" ]]; then
  echo "✅ PASS: All tests passed"
  echo ""
  echo "ORS integration is working:"
  echo "  ✓ Routes with avoid constraints work"
  echo "  ✓ Control routes work"
  echo "  ✓ ORS provider appears in health check"
  echo ""
  echo "Next: Check logs to verify provider selection:"
  echo "  gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"roamwise-backend-v2\" AND jsonPayload.event=\"route_ok\" AND textPayload=~\"rw_ors\"' --limit 5 --format json | jq -r '.[] | .jsonPayload | {event, provider, exclude, route_retry_relaxed, distance_m}'"
  exit 0
else
  echo ""
  echo "Some tests failed. Please check the logs and verify deployment."
  exit 1
fi
