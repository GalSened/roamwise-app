#!/usr/bin/env bash
# MUST TEST for Step 30 Fix: Custom OSRM with excludable_combinations
set -euo pipefail

REGION="${REGION:-us-central1}"
BACKEND="https://roamwise-backend-v2-971999716773.us-central1.run.app"

# Get OSRM URL from Cloud Run
OSRM=$(gcloud run services describe roamwise-osrm --region $REGION --format='value(status.url)')

echo "Step 30 Fix Test: Custom OSRM with excludable_combinations"
echo "=========================================================="
echo "OSRM URL: $OSRM"
echo "Backend URL: $BACKEND"
echo ""

# Test 1: Direct OSRM — single exclude → expect 200
echo "Test 1: Direct OSRM with single exclude=toll (expect HTTP 200, not 400)"
HTTP_STATUS_1=$(curl -s -o /dev/null -w "%{http_code}" \
  "$OSRM/route/v1/driving/34.7818,32.0853;34.8000,32.0800?overview=false&exclude=toll")

echo "HTTP Status: $HTTP_STATUS_1"
echo "Expected: 200 (exclude parameter now supported)"
echo ""

# Test 2: Direct OSRM — multi exclude → expect 200
echo "Test 2: Direct OSRM with multi exclude=toll,ferry (expect HTTP 200)"
HTTP_STATUS_2=$(curl -s -o /dev/null -w "%{http_code}" \
  "$OSRM/route/v1/driving/34.7818,32.0853;34.8000,32.0800?overview=false&exclude=toll,ferry")

echo "HTTP Status: $HTTP_STATUS_2"
echo "Expected: 200 (no more 'Exclude flag combination is not supported' error)"
echo ""

# Test 3: Via backend with avoid=['tolls'] → expect ok:true & route_retry_relaxed:false
echo "Test 3: Backend route with avoid=tolls (expect route_retry_relaxed=false)"
RESP3=$(curl -s -X POST "$BACKEND/api/route" \
  -H 'Content-Type: application/json' \
  -H 'x-request-id: rw_excl_live' \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive","constraints":{"avoid":["tolls"]}}')

OK3=$(echo "$RESP3" | jq -r '.ok')
RELAXED3=$(echo "$RESP3" | jq -r '.route_retry_relaxed')
DIST3=$(echo "$RESP3" | jq -r '.distance_m')
DUR3=$(echo "$RESP3" | jq -r '.duration_s')

echo "Response:"
echo "$RESP3" | jq '{ok, distance_m, duration_s, route_retry_relaxed}'
echo ""
echo "Expected: ok=true, route_retry_relaxed=false (constraints honored by custom OSRM)"
echo ""

# Test 4: Control route without avoid
echo "Test 4: Control route without avoid (expect ok=true)"
RESP4=$(curl -s -X POST "$BACKEND/api/route" \
  -H 'Content-Type: application/json' \
  -H 'x-request-id: rw_excl_ctrl' \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive"}')

OK4=$(echo "$RESP4" | jq -r '.ok')

echo "Response: ok=$OK4"
echo "Expected: ok=true"
echo ""

# Summary
echo "=========================================================="
echo "Summary:"
echo "Test 1 (single exclude): HTTP $HTTP_STATUS_1"
echo "Test 2 (multi exclude): HTTP $HTTP_STATUS_2"
echo "Test 3 (backend avoid): ok=$OK3, route_retry_relaxed=$RELAXED3"
echo "Test 4 (control): ok=$OK4"
echo ""

# Pass criteria
PASS=true

if [[ "$HTTP_STATUS_1" != "200" ]]; then
  echo "❌ FAIL: Test 1 - OSRM should return HTTP 200 for single exclude"
  PASS=false
fi

if [[ "$HTTP_STATUS_2" != "200" ]]; then
  echo "❌ FAIL: Test 2 - OSRM should return HTTP 200 for multi exclude"
  PASS=false
fi

if [[ "$OK3" != "true" || "$RELAXED3" != "false" ]]; then
  echo "❌ FAIL: Test 3 - Backend should return ok=true and route_retry_relaxed=false"
  PASS=false
fi

if [[ "$OK4" != "true" ]]; then
  echo "❌ FAIL: Test 4 - Control route should return ok=true"
  PASS=false
fi

if [[ "$PASS" == "true" ]]; then
  echo "✅ PASS: All tests passed"
  echo ""
  echo "Custom OSRM with excludable_combinations is working correctly:"
  echo "  ✓ Single exclude supported (toll)"
  echo "  ✓ Multi exclude supported (toll,ferry)"
  echo "  ✓ Backend honors avoid preferences (route_retry_relaxed=false)"
  echo "  ✓ Control routes work normally"
  echo ""
  echo "Next: Verify logs show route_ok events with exclude parameter and no retry:"
  echo "  gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"roamwise-backend-v2\" AND jsonPayload.event=\"route_ok\" AND textPayload=~\"rw_excl\"' --limit 5 --format json | jq -r '.[] | .jsonPayload | {event, exclude, route_retry_relaxed, distance_m}'"
  exit 0
else
  echo ""
  echo "Some tests failed. Please check the logs and verify OSRM deployment."
  exit 1
fi
