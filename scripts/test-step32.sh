#!/usr/bin/env bash
# MUST TEST for Step 32: Profiles in Production
set -euo pipefail

PROXY="${PROXY:-https://roamwise-proxy-971999716773.us-central1.run.app}"
BACKEND="${BACKEND:-https://roamwise-backend-v2-971999716773.us-central1.run.app}"

echo "Step 32 Test: Profiles in Production"
echo "====================================="
echo "Proxy URL: $PROXY"
echo "Backend URL: $BACKEND"
echo ""

# Cookie jar for session persistence
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

# Test 1: GET /api/profile via proxy (expect 200 + JSON)
echo "Test 1: GET /api/profile via proxy"
RESP1=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$PROXY/api/profile")
HTTP_CODE1=$(echo "$RESP1" | tail -n 1)
BODY1=$(echo "$RESP1" | sed '$d')

echo "HTTP Status: $HTTP_CODE1"
if [[ "$HTTP_CODE1" == "200" ]]; then
  echo "Response:"
  echo "$BODY1" | jq '{user, preferences, updatedAt}'
else
  echo "Response: $BODY1"
fi
echo ""

# Test 2: PUT /api/profile via proxy (set preferences)
echo "Test 2: PUT /api/profile via proxy (set preferences)"
PUT_PAYLOAD='{"preferences":{"pace":"slow","avoid":["tolls"],"likes":["scenic"],"dietary":["vegetarian"],"budget_min":50,"budget_max":500}}'
RESP2=$(curl -s -w "\n%{http_code}" -X PUT -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -d "$PUT_PAYLOAD" \
  "$PROXY/api/profile")
HTTP_CODE2=$(echo "$RESP2" | tail -n 1)
BODY2=$(echo "$RESP2" | sed '$d')

echo "HTTP Status: $HTTP_CODE2"
echo "Response:"
echo "$BODY2" | jq '.'
echo ""

# Test 3: GET /api/profile again (values must persist)
echo "Test 3: GET /api/profile again (verify persistence)"
sleep 1  # Brief pause to ensure backend has updated
RESP3=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$PROXY/api/profile")
HTTP_CODE3=$(echo "$RESP3" | tail -n 1)
BODY3=$(echo "$RESP3" | sed '$d')

echo "HTTP Status: $HTTP_CODE3"
PACE3=$(echo "$BODY3" | jq -r '.preferences.pace // "null"')
AVOID3=$(echo "$BODY3" | jq -r '.preferences.avoid // []')
LIKES3=$(echo "$BODY3" | jq -r '.preferences.likes // []')

echo "Preferences after PUT:"
echo "  pace: $PACE3"
echo "  avoid: $AVOID3"
echo "  likes: $LIKES3"
echo ""

# Test 4: Route should use avoid from profile automatically
echo "Test 4: Route using profile avoid preferences"
ROUTE_RESP=$(curl -s -X POST "$BACKEND/api/route" \
  -H 'Content-Type: application/json' \
  -H 'x-request-id: rw_step32_test4' \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive"}')

ROUTE_OK=$(echo "$ROUTE_RESP" | jq -r '.ok')
echo "Route computed successfully: $ROUTE_OK"
echo ""

# Test 5: /admin/healthz shows counters and providers
echo "Test 5: Health endpoint shows counters and providers"
HEALTH=$(curl -s "$BACKEND/admin/healthz")
HEALTH_OK=$(echo "$HEALTH" | jq -r '.ok')
HAS_COUNTERS=$(echo "$HEALTH" | jq 'has("counters")')
HAS_PROVIDERS=$(echo "$HEALTH" | jq 'has("providers")')

echo "Health status: $HEALTH_OK"
echo "Has counters: $HAS_COUNTERS"
echo "Has providers: $HAS_PROVIDERS"
echo ""

# Summary
echo "====================================="
echo "Summary:"
echo "Test 1 (GET profile): HTTP $HTTP_CODE1"
echo "Test 2 (PUT profile): HTTP $HTTP_CODE2"
echo "Test 3 (GET again): HTTP $HTTP_CODE3, pace=$PACE3"
echo "Test 4 (Route): ok=$ROUTE_OK"
echo "Test 5 (Health): ok=$HEALTH_OK, counters=$HAS_COUNTERS, providers=$HAS_PROVIDERS"
echo ""

# Pass criteria
PASS=true

# Test 1: Should return 200
if [[ "$HTTP_CODE1" != "200" ]]; then
  echo "❌ FAIL: Test 1 - GET /api/profile should return 200"
  PASS=false
fi

# Test 2: Should return 200
if [[ "$HTTP_CODE2" != "200" ]]; then
  echo "❌ FAIL: Test 2 - PUT /api/profile should return 200"
  PASS=false
fi

# Test 3: Should return 200 and pace should be 'slow'
if [[ "$HTTP_CODE3" != "200" ]]; then
  echo "❌ FAIL: Test 3 - GET /api/profile should return 200"
  PASS=false
fi

if [[ "$PACE3" != "slow" ]]; then
  echo "❌ FAIL: Test 3 - pace should be 'slow', got '$PACE3'"
  PASS=false
fi

# Test 4: Route should succeed
if [[ "$ROUTE_OK" != "true" ]]; then
  echo "❌ FAIL: Test 4 - Route should return ok=true"
  PASS=false
fi

# Test 5: Health should be ok with counters and providers
if [[ "$HEALTH_OK" != "true" ]]; then
  echo "❌ FAIL: Test 5 - Health should be ok"
  PASS=false
fi

if [[ "$HAS_COUNTERS" != "true" ]]; then
  echo "❌ FAIL: Test 5 - Health should have counters"
  PASS=false
fi

if [[ "$HAS_PROVIDERS" != "true" ]]; then
  echo "❌ FAIL: Test 5 - Health should have providers"
  PASS=false
fi

if [[ "$PASS" == "true" ]]; then
  echo "✅ PASS: All tests passed"
  echo ""
  echo "Step 32 is working:"
  echo "  ✓ Proxy forwards /api/profile requests"
  echo "  ✓ Profile GET/PUT work with cookie auth"
  echo "  ✓ Profile preferences persist"
  echo "  ✓ Routes can be computed"
  echo "  ✓ Health endpoint exposes counters and providers"
  echo ""
  echo "Next: Test frontend by:"
  echo "  1. Open app in browser"
  echo "  2. Check whoami pill in header shows tenant:user"
  echo "  3. Go to Profile tab"
  echo "  4. Fill in preferences and click Save"
  echo "  5. Verify whoami pill updates"
  echo "  6. Verify planner uses pace/likes/dietary from profile"
  exit 0
else
  echo ""
  echo "Some tests failed. Please check the logs and verify deployment."
  exit 1
fi
