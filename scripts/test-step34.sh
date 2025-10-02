#!/usr/bin/env bash
set -euo pipefail

echo "Step 34 Test: Family Mode sign-in"
echo "=================================="
echo ""

# Clean up database for fresh test
rm -f /Users/galsened/Downloads/RoamWise-frontend-WX/backend/roamwise.db*
echo "✓ Database cleaned"

# Kill any existing backend on port 8080
lsof -ti:8080 | xargs kill 2>/dev/null || true
sleep 1

# Wait for port to be free
for i in {1..5}; do
  if ! lsof -ti:8080 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Start fresh backend to recreate tables
cd /Users/galsened/Downloads/RoamWise-frontend-WX/backend
PORT=8080 node server.js > /tmp/backend-test.log 2>&1 &
BACKEND_PID=$!
sleep 2
echo "✓ Backend restarted (PID: $BACKEND_PID)"
echo ""

PASS=true
BACKEND_URL="http://localhost:8787"

# Test 1: New phone => known:false
echo "Test 1: New phone signin/start"
RESP1=$(curl -s -X POST $BACKEND_URL/api/family/signin/start \
  -H 'Content-Type: application/json' \
  -d '{"phone":"0501234567"}')
KNOWN1=$(echo "$RESP1" | grep -o '"known":false' || echo "")
if [[ -z "$KNOWN1" ]]; then
  echo "❌ FAIL: expected known:false"
  echo "   Response: $RESP1"
  PASS=false
else
  echo "✓ New phone returns known:false"
fi
echo ""

# Test 2: Finish with name => user_id
echo "Test 2: Finish signin with name"
RESP2=$(curl -s -X POST $BACKEND_URL/api/family/signin/finish \
  -H 'Content-Type: application/json' \
  -d '{"phone":"0501234567","name":"Test User"}' \
  -c /tmp/family_cookie.txt)
USER_ID=$(echo "$RESP2" | grep -o '"user_id":"[^"]*"' || echo "")
if [[ -z "$USER_ID" ]]; then
  echo "❌ FAIL: expected user_id in response"
  echo "   Response: $RESP2"
  PASS=false
else
  echo "✓ Signin finish returns user_id"
fi
echo ""

# Test 3: Existing phone => known:true
echo "Test 3: Existing phone signin/start"
RESP3=$(curl -s -X POST $BACKEND_URL/api/family/signin/start \
  -H 'Content-Type: application/json' \
  -d '{"phone":"0501234567"}')
KNOWN3=$(echo "$RESP3" | grep -o '"known":true' || echo "")
NAME3=$(echo "$RESP3" | grep -o '"name":"Test User"' || echo "")
if [[ -z "$KNOWN3" ]] || [[ -z "$NAME3" ]]; then
  echo "❌ FAIL: expected known:true and name:Test User"
  echo "   Response: $RESP3"
  PASS=false
else
  echo "✓ Existing phone returns known:true with name"
fi
echo ""

# Test 4: Session check /api/me
echo "Test 4: Check session with /api/me"
RESP4=$(curl -s -X GET $BACKEND_URL/api/me \
  -b /tmp/family_cookie.txt)
SESSION=$(echo "$RESP4" | grep -o '"session":{' || echo "")
if [[ -z "$SESSION" ]]; then
  echo "❌ FAIL: expected session object"
  echo "   Response: $RESP4"
  PASS=false
else
  echo "✓ /api/me returns valid session"
fi
echo ""

# Cleanup
rm -f /tmp/family_cookie.txt
kill $BACKEND_PID 2>/dev/null || true

# Summary
echo "=================================="
if [[ "$PASS" == "true" ]]; then
  echo "✅ PASS: All tests passed"
  exit 0
else
  echo "❌ FAIL: Some tests failed"
  exit 1
fi
