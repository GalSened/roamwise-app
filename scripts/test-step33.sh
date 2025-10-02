#!/usr/bin/env bash
# MUST TEST for Step 33: Offline-first M1 (safe minimum)
set -euo pipefail

echo "Step 33 Test: Offline-first M1"
echo "==============================="
echo ""

PASS=true

# Test 1: Check sw.js exists and has correct VERSION
echo "Test 1: Service Worker file exists with VERSION 'rw-sw-v1'"
if [[ ! -f "sw.js" ]]; then
  echo "❌ FAIL: sw.js not found"
  PASS=false
else
  VERSION=$(grep "const VERSION = 'rw-sw-v1'" sw.js || echo "")
  if [[ -z "$VERSION" ]]; then
    echo "❌ FAIL: sw.js does not have VERSION = 'rw-sw-v1'"
    PASS=false
  else
    echo "✓ sw.js exists with correct VERSION"
  fi
fi
echo ""

# Test 2: Check sw.js has APP_SHELL array
echo "Test 2: Service Worker has APP_SHELL array"
APP_SHELL=$(grep "const APP_SHELL = \[" sw.js || echo "")
if [[ -z "$APP_SHELL" ]]; then
  echo "❌ FAIL: sw.js does not have APP_SHELL array"
  PASS=false
else
  echo "✓ APP_SHELL array found in sw.js"
fi
echo ""

# Test 3: Check sw.js has TILE_HOSTS array
echo "Test 3: Service Worker has TILE_HOSTS array"
TILE_HOSTS=$(grep "const TILE_HOSTS = \[" sw.js || echo "")
if [[ -z "$TILE_HOSTS" ]]; then
  echo "❌ FAIL: sw.js does not have TILE_HOSTS array"
  PASS=false
else
  echo "✓ TILE_HOSTS array found in sw.js"
fi
echo ""

# Test 4: Check registerSW.js exists
echo "Test 4: Service Worker registration script exists"
if [[ ! -f "registerSW.js" ]]; then
  echo "❌ FAIL: registerSW.js not found"
  PASS=false
else
  echo "✓ registerSW.js exists"
fi
echo ""

# Test 5: Check index.html includes registerSW.js
echo "Test 5: index.html includes registerSW.js"
REG_SCRIPT=$(grep 'registerSW.js' index.html || echo "")
if [[ -z "$REG_SCRIPT" ]]; then
  echo "❌ FAIL: index.html does not include registerSW.js"
  PASS=false
else
  echo "✓ index.html includes registerSW.js"
fi
echo ""

# Test 6: Check offline banner exists in index.html
echo "Test 6: Offline banner exists in index.html"
BANNER=$(grep 'id="offline-banner"' index.html || echo "")
if [[ -z "$BANNER" ]]; then
  echo "❌ FAIL: offline-banner not found in index.html"
  PASS=false
else
  echo "✓ Offline banner found in index.html"
fi
echo ""

# Test 7: Check offline banner CSS exists
echo "Test 7: Offline banner CSS exists"
BANNER_CSS=$(grep '.offline-banner' index.html || echo "")
if [[ -z "$BANNER_CSS" ]]; then
  echo "❌ FAIL: .offline-banner CSS not found"
  PASS=false
else
  echo "✓ Offline banner CSS found"
fi
echo ""

# Test 8: Check idb.js has lastRoute store
echo "Test 8: idb.js has lastRoute store"
LAST_ROUTE_STORE=$(grep "createObjectStore('lastRoute'" src/lib/idb.js || echo "")
if [[ -z "$LAST_ROUTE_STORE" ]]; then
  echo "❌ FAIL: lastRoute store not found in idb.js"
  PASS=false
else
  echo "✓ lastRoute store found in idb.js"
fi
echo ""

# Test 9: Check idb.js has idbSetLastRoute function
echo "Test 9: idb.js has idbSetLastRoute function"
SET_LAST_ROUTE=$(grep "export async function idbSetLastRoute" src/lib/idb.js || echo "")
if [[ -z "$SET_LAST_ROUTE" ]]; then
  echo "❌ FAIL: idbSetLastRoute function not found"
  PASS=false
else
  echo "✓ idbSetLastRoute function found"
fi
echo ""

# Test 10: Check idb.js has idbGetLastRoute function
echo "Test 10: idb.js has idbGetLastRoute function"
GET_LAST_ROUTE=$(grep "export async function idbGetLastRoute" src/lib/idb.js || echo "")
if [[ -z "$GET_LAST_ROUTE" ]]; then
  echo "❌ FAIL: idbGetLastRoute function not found"
  PASS=false
else
  echo "✓ idbGetLastRoute function found"
fi
echo ""

# Test 11: Check DB_VERSION is 2
echo "Test 11: idb.js DB_VERSION is 2"
DB_VERSION=$(grep "const DB_VERSION = 2" src/lib/idb.js || echo "")
if [[ -z "$DB_VERSION" ]]; then
  echo "❌ FAIL: DB_VERSION is not 2 in idb.js"
  PASS=false
else
  echo "✓ DB_VERSION = 2 in idb.js"
fi
echo ""

# Test 12: Check app-main.js has setupOfflineDetection
echo "Test 12: app-main.js has setupOfflineDetection method"
OFFLINE_DETECT=$(grep "setupOfflineDetection()" app-main.js || echo "")
if [[ -z "$OFFLINE_DETECT" ]]; then
  echo "❌ FAIL: setupOfflineDetection not found in app-main.js"
  PASS=false
else
  echo "✓ setupOfflineDetection found in app-main.js"
fi
echo ""

# Test 13: Check app-main.js has tryRedrawLastRouteWhenOffline
echo "Test 13: app-main.js has tryRedrawLastRouteWhenOffline method"
REDRAW=$(grep "tryRedrawLastRouteWhenOffline()" app-main.js || echo "")
if [[ -z "$REDRAW" ]]; then
  echo "❌ FAIL: tryRedrawLastRouteWhenOffline not found in app-main.js"
  PASS=false
else
  echo "✓ tryRedrawLastRouteWhenOffline found in app-main.js"
fi
echo ""

# Test 14: Check app-main.js imports idbSetLastRoute and idbGetLastRoute
echo "Test 14: app-main.js imports IDB functions"
IDB_IMPORT=$(grep "import.*idbSetLastRoute.*idbGetLastRoute.*from.*idb.js" app-main.js || echo "")
if [[ -z "$IDB_IMPORT" ]]; then
  echo "❌ FAIL: idbSetLastRoute/idbGetLastRoute import not found in app-main.js"
  PASS=false
else
  echo "✓ IDB functions imported in app-main.js"
fi
echo ""

# Test 15: Check app-main.js has offline check before hazards
echo "Test 15: app-main.js skips hazards when offline"
if grep -q "if (!navigator.onLine)" app-main.js && grep -q "skipping hazards fetch" app-main.js; then
  echo "✓ Offline check found before hazards fetch"
else
  echo "❌ FAIL: offline check not found before hazards fetch"
  PASS=false
fi
echo ""

# Summary
echo "==============================="
if [[ "$PASS" == "true" ]]; then
  echo "✅ PASS: All automated tests passed"
  echo ""
  echo "Step 33 implementation complete! Next steps:"
  echo ""
  echo "Manual Testing Required:"
  echo "========================"
  echo ""
  echo "1. Open Chrome DevTools (F12)"
  echo "   - Go to Application tab"
  echo "   - Check 'Service Workers' section"
  echo "   - Verify sw.js is registered and active"
  echo ""
  echo "2. Test offline banner:"
  echo "   - Go to Network tab"
  echo "   - Check 'Offline' checkbox"
  echo "   - Verify yellow banner appears at top"
  echo "   - Uncheck 'Offline'"
  echo "   - Verify banner disappears"
  echo ""
  echo "3. Test app shell caching:"
  echo "   - Go to Application tab > Cache Storage"
  echo "   - Verify 'rw-sw-v1' cache exists"
  echo "   - Check cached files include index.html, app-main.js, etc."
  echo ""
  echo "4. Test tile caching:"
  echo "   - Pan around map while online"
  echo "   - Go to Application tab > Cache Storage > rw-sw-v1"
  echo "   - Verify OpenStreetMap tile images are cached"
  echo ""
  echo "5. Test last route recall:"
  echo "   - Compute a route while online"
  echo "   - Go to Application tab > IndexedDB > traveling-app > lastRoute"
  echo "   - Verify route data is saved with id='last'"
  echo "   - Go offline (Network tab > Offline checkbox)"
  echo "   - Refresh page"
  echo "   - Verify route polyline redraws on map"
  echo ""
  echo "6. Test hazards disabled offline:"
  echo "   - Go offline"
  echo "   - Try to navigate to a destination"
  echo "   - Verify hazards don't fetch (check Console)"
  echo "   - Verify hazards toggle is disabled"
  echo ""
  echo "7. Test release notes offline:"
  echo "   - Go offline"
  echo "   - Click 'What's New' button"
  echo "   - Verify release notes load from cache"
  echo ""
  exit 0
else
  echo "❌ FAIL: Some automated tests failed"
  echo ""
  echo "Please fix the failing tests before manual testing."
  exit 1
fi
