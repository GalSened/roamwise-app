#!/usr/bin/env bash
# MUST TEST for Step 30: Custom OSRM with excludable classes

set -euo pipefail

OSRM="https://roamwise-osrm-971999716773.us-central1.run.app"
BACKEND="https://roamwise-backend-v2-971999716773.us-central1.run.app"

echo "Step 30 Test: Custom OSRM with exclude support"
echo "==============================================="
echo ""

# Test 1: Direct OSRM with exclude parameter (should return 200, not 400)
echo "Test 1: Direct OSRM with exclude=toll (expect HTTP 200, not 400)"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${OSRM}/route/v1/driving/34.7818,32.0853;34.8000,32.0800?overview=false&exclude=toll")

echo "HTTP Status: $HTTP_STATUS"
echo "Expected: 200 (not 400 - exclude parameter is now supported)"
echo ""

# Test 2: Backend route with avoid=tolls (expect route_retry_relaxed: false)
echo "Test 2: Backend route with avoid=tolls (expect route_retry_relaxed=false)"
RESP2=$(curl -s -X POST "$BACKEND/api/route" \
  -H "Content-Type: application/json" \
  -H "x-request-id: rw_step30_avoid" \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive","constraints":{"avoid":["tolls"]}}')

OK2=$(echo "$RESP2" | jq -r '.ok')
RELAXED2=$(echo "$RESP2" | jq -r '.route_retry_relaxed')
DIST2=$(echo "$RESP2" | jq -r '.distance_m')

echo "Response: ok=$OK2, route_retry_relaxed=$RELAXED2, distance_m=$DIST2"
echo "Expected: ok=true, route_retry_relaxed=false (constraints honored by custom OSRM)"
echo ""

# Test 3: Control route without avoid (expect ok=true)
echo "Test 3: Control route without avoid (expect ok=true)"
RESP3=$(curl -s -X POST "$BACKEND/api/route" \
  -H "Content-Type: application/json" \
  -H "x-request-id: rw_step30_ctrl" \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive"}')

OK3=$(echo "$RESP3" | jq -r '.ok')
DIST3=$(echo "$RESP3" | jq -r '.distance_m')

echo "Response: ok=$OK3, distance_m=$DIST3"
echo "Expected: ok=true"
echo ""

# Summary
echo "==============================================="
echo "Summary:"
echo "Test 1 (direct OSRM exclude): HTTP $HTTP_STATUS"
echo "Test 2 (backend avoid): ok=$OK2, relaxed=$RELAXED2"
echo "Test 3 (control): ok=$OK3"
echo ""

# Pass criteria
PASS=true

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "❌ FAIL: Test 1 - OSRM should return HTTP 200 for exclude parameter"
  PASS=false
fi

if [[ "$OK2" != "true" || "$RELAXED2" != "false" ]]; then
  echo "❌ FAIL: Test 2 - Backend should return ok=true and route_retry_relaxed=false"
  PASS=false
fi

if [[ "$OK3" != "true" ]]; then
  echo "❌ FAIL: Test 3 - Control route should return ok=true"
  PASS=false
fi

if [[ "$PASS" == "true" ]]; then
  echo "✅ PASS: All tests passed"
  echo ""
  echo "Custom OSRM is working correctly:"
  echo "  - Accepts exclude parameter (HTTP 200)"
  echo "  - Backend honors avoid preferences (route_retry_relaxed=false)"
  echo "  - Control routes work normally"
  echo ""
  echo "Next: Check Cloud Run logs to verify route_ok events:"
  echo "  gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"roamwise-backend-v2\" AND jsonPayload.event=\"route_ok\" AND textPayload=~\"rw_step30\"' --limit 5 --format json | jq -r '.[] | .jsonPayload | {event, exclude, route_retry_relaxed, distance_m}'"
  exit 0
else
  echo ""
  echo "Please check the logs and verify OSRM deployment."
  exit 1
fi
