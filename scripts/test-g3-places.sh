#!/usr/bin/env bash
set -euo pipefail
PROXY="${PROXY:-https://roamwise-proxy-2t6n2rxiaa-uc.a.run.app}"

echo "G3 Test Suite: Google Places Search + Details"
echo "=============================================="
echo

echo "1) HE: gelato open now around Tel Aviv"
curl -s -X POST "$PROXY/api/places/search" -H 'content-type: application/json' -H 'x-lang: he' \
  -d '{"query":"gelato","openNow":true,"minRating":4.3,"includedType":"restaurant","bias":{"center":{"latitude":32.0853,"longitude":34.7818},"radius":2500}}' \
  | jq '{ok, cached, count: (.items|length), sample: .items[0] | {id: .id, name:.displayName.text, rating, userRatingCount}}'

echo
echo "2) EN: viewpoint around Haifa (compare localized names)"
curl -s -X POST "$PROXY/api/places/search" -H 'content-type: application/json' -H 'x-lang: en' \
  -d '{"query":"viewpoint","minRating":4.2,"bias":{"center":{"latitude":32.7940,"longitude":34.9896},"radius":5000}}' \
  | jq '{ok, count: (.items|length), sample: .items[0] | {id: .id, name:.displayName.text}}'

echo
echo "3) Details for first result (should reflect language)"
FIRST_ID=$(curl -s -X POST "$PROXY/api/places/search" -H 'content-type: application/json' -H 'x-lang: en' \
  -d '{"query":"ice cream","minRating":4.0,"bias":{"center":{"latitude":32.0853,"longitude":34.7818},"radius":2000}}' | jq -r '.items[0].id')
curl -s "$PROXY/api/places/$FIRST_ID" -H 'x-lang: en' | jq '{ok, place: {name: .place.displayName.text, rating: .place.rating, priceLevel: .place.priceLevel, opening: .place.currentOpeningHours}}'

echo
echo "4) Cache verification: run test 1 again (should show cached:true)"
curl -s -X POST "$PROXY/api/places/search" -H 'content-type: application/json' -H 'x-lang: he' \
  -d '{"query":"gelato","openNow":true,"minRating":4.3,"includedType":"restaurant","bias":{"center":{"latitude":32.0853,"longitude":34.7818},"radius":2500}}' \
  | jq '{ok, cached, count: (.items|length)}'

echo
echo "=============================================="
echo "G3 Tests Complete"
echo
echo "Pass criteria:"
echo "✓ Test 1: ok=true, count>0, sample.rating≥4.3"
echo "✓ Test 2: ok=true, count>0, English displayName"
echo "✓ Test 3: ok=true, localized name and opening hours"
echo "✓ Test 4: ok=true, cached=true"
