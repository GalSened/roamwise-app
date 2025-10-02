#!/bin/bash
# MUST TEST for Step 28: Route respects Profile "Avoid"

BACKEND="https://roamwise-backend-v2-971999716773.us-central1.run.app"
ORIGIN='{"lat":32.08,"lon":34.78}'
DEST='{"lat":31.77,"lon":35.22}'

echo "Step 28 Test: Route avoid preferences"
echo "======================================"
echo ""

# Test 1: No avoid (control)
echo "Test 1: Route without exclude (control)"
RESP1=$(curl -s -X POST "$BACKEND/api/route" \
  -H "Content-Type: application/json" \
  -d "{\"stops\":[$ORIGIN,$DEST],\"mode\":\"drive\",\"constraints\":{}}")

OK1=$(echo "$RESP1" | jq -r '.ok')
echo "Response: ok=$OK1"
echo "Expected log: exclude field missing or undefined"
echo ""

# Test 2: Avoid tolls
echo "Test 2: Route with avoid=[\"tolls\"]"
RESP2=$(curl -s -X POST "$BACKEND/api/route" \
  -H "Content-Type: application/json" \
  -d "{\"stops\":[$ORIGIN,$DEST],\"mode\":\"drive\",\"constraints\":{\"avoid\":[\"tolls\"]}}")

OK2=$(echo "$RESP2" | jq -r '.ok')
echo "Response: ok=$OK2"
echo "Expected log: exclude=\"toll\""
echo ""

# Test 3: Avoid ferries and highways
echo "Test 3: Route with avoid=[\"ferries\",\"highways\"]"
RESP3=$(curl -s -X POST "$BACKEND/api/route" \
  -H "Content-Type: application/json" \
  -d "{\"stops\":[$ORIGIN,$DEST],\"mode\":\"drive\",\"constraints\":{\"avoid\":[\"ferries\",\"highways\"]}}")

OK3=$(echo "$RESP3" | jq -r '.ok')
echo "Response: ok=$OK3"
echo "Expected log: exclude=\"ferry,motorway\""
echo ""

# Test 4: Unknown avoid term (should be filtered)
echo "Test 4: Route with avoid=[\"unknown\"]"
RESP4=$(curl -s -X POST "$BACKEND/api/route" \
  -H "Content-Type: application/json" \
  -d "{\"stops\":[$ORIGIN,$DEST],\"mode\":\"drive\",\"constraints\":{\"avoid\":[\"unknown\"]}}")

OK4=$(echo "$RESP4" | jq -r '.ok')
echo "Response: ok=$OK4"
echo "Expected log: exclude field missing or undefined (unknown term filtered)"
echo ""

# Summary
echo "======================================"
echo "Summary:"
echo "Test 1 (no avoid): $OK1"
echo "Test 2 (avoid tolls): $OK2"
echo "Test 3 (avoid ferries+highways): $OK3"
echo "Test 4 (unknown term): $OK4"
echo ""

if [[ "$OK1" == "true" && "$OK2" == "true" && "$OK3" == "true" && "$OK4" == "true" ]]; then
  echo "✅ PASS: All responses returned ok:true"
  echo ""
  echo "Next: Check Cloud Run logs for exclude values:"
  echo "  gcloud run logs read roamwise-backend-v2 --region us-central1 --limit 20 | grep route_ok"
  exit 0
else
  echo "❌ FAIL: Some responses did not return ok:true"
  exit 1
fi
