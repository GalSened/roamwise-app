#!/usr/bin/env bash
# MUST TEST for Step 29: Route retry without exclude

set -euo pipefail

BACKEND="https://roamwise-backend-v2-971999716773.us-central1.run.app"

echo "Step 29 Test: Route retry logic"
echo "================================"
echo ""

# Test 1: Normal route with avoid (should succeed regardless of exclude support)
echo "Test 1: Normal route with avoid (should succeed with or without exclude support)"
RESP1=$(curl -s -X POST "$BACKEND/api/route" \
  -H "Content-Type: application/json" \
  -H "x-request-id: rw_retry_ok0" \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive","constraints":{"avoid":["tolls"]}}')

OK1=$(echo "$RESP1" | jq -r '.ok')
RELAXED1=$(echo "$RESP1" | jq -r '.route_retry_relaxed')
DIST1=$(echo "$RESP1" | jq -r '.distance_m')
DUR1=$(echo "$RESP1" | jq -r '.duration_s')

echo "Response: ok=$OK1, route_retry_relaxed=$RELAXED1"
echo "  distance_m=$DIST1, duration_s=$DUR1"
echo "Expected: ok=true, route_retry_relaxed=false|true (depends on OSRM exclude support)"
echo ""

# Test 2: Force retry path (test hook)
echo "Test 2: Force retry path (test hook) - expect ok=true and route_retry_relaxed=true"
RESP2=$(curl -s -X POST "$BACKEND/api/route" \
  -H "Content-Type: application/json" \
  -H "x-request-id: rw_retry_relax" \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive","constraints":{"avoid":["tolls"],"_testForceRelax":true}}')

OK2=$(echo "$RESP2" | jq -r '.ok')
RELAXED2=$(echo "$RESP2" | jq -r '.route_retry_relaxed')
DIST2=$(echo "$RESP2" | jq -r '.distance_m')
DUR2=$(echo "$RESP2" | jq -r '.duration_s')

echo "Response: ok=$OK2, route_retry_relaxed=$RELAXED2"
echo "  distance_m=$DIST2, duration_s=$DUR2"
echo "Expected: ok=true, route_retry_relaxed=true"
echo ""

# Summary
echo "================================"
echo "Summary:"
echo "Test 1 (normal with avoid): ok=$OK1, relaxed=$RELAXED1"
echo "Test 2 (forced retry): ok=$OK2, relaxed=$RELAXED2"
echo ""

if [[ "$OK1" == "true" && "$OK2" == "true" && "$RELAXED2" == "true" ]]; then
  echo "✅ PASS: All tests passed"
  echo ""
  echo "Next: Check Cloud Run logs for route_ok events with route_retry_relaxed field:"
  echo "  gcloud logging read 'resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"roamwise-backend-v2\" AND jsonPayload.event=\"route_ok\" AND textPayload=~\"rw_retry\"' --limit 5 --format json | jq -r '.[] | .jsonPayload | {event, exclude, route_retry_relaxed, distance_m}'"
  exit 0
else
  echo "❌ FAIL: Some tests did not pass"
  echo "  Test 1 should return ok=true"
  echo "  Test 2 should return ok=true and route_retry_relaxed=true"
  exit 1
fi
