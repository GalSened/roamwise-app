# Step 29: Route Retry & Scenic Density Control

## Implementation Summary

### A) Backend: Retry Without Exclude (Graceful Degradation)

#### Problem Solved
The public OSRM demo server doesn't support the `exclude` parameter (requires custom profile configuration). This caused routes with avoid preferences to fail with HTTP 400 errors.

#### Solution
Implemented automatic retry logic: if a route request with `exclude` parameter fails, automatically retry once WITHOUT exclude to provide a route even if avoid preferences can't be honored.

#### Changes Made (`backend/routes/route.js`)

1. **Test Hooks Constant**
   - Added `TEST_HOOKS` environment variable check for testing retry path
   - Allows forcing retry logic without needing failing OSRM server

2. **callOsrm Helper Function**
   - Centralized OSRM fetch logic with timeout handling
   - Returns structured result: `{ok, json, status, error, body}`
   - Simplifies retry logic and error handling

3. **Retry Logic**
   ```javascript
   // First attempt with exclude
   let first = await callOsrm(urlWith, TIMEOUT_MS);

   // Retry without exclude if first fails
   if (!first.ok || first.json?.code !== 'Ok') {
     const second = await callOsrm(urlNo, TIMEOUT_MS);
     if (second.ok && second.json?.code === 'Ok') {
       first = second;
       relaxed = true; // Flag that we relaxed constraints
     }
   }
   ```

4. **Response Enhancement**
   - Added `route_retry_relaxed` boolean field to response
   - `false` = route honors avoid preferences
   - `true` = route ignores avoid preferences (OSRM doesn't support exclude)

5. **Structured Logging**
   - Added `route_retry_relaxed` to route_ok log events
   - Enables analytics on how often we fall back
   - Added `route_err` event for failures

#### Test Hook Usage
Set `ROUTE_TEST_HOOKS=1` environment variable to enable test mode:
```javascript
// In request body:
{
  "constraints": {
    "avoid": ["tolls"],
    "_testForceRelax": true  // Forces retry path for testing
  }
}
```

### B) Frontend: Scenic Density Control

#### Problem Solved
Users have different preferences for how frequently they want scenic suggestions. Some want frequent nudges (high density), others prefer fewer interruptions (low density).

#### Solution
Added scenic density selector to Dev Drawer with three levels:
- **Low**: 30-minute intervals (less frequent)
- **Normal**: 15-minute intervals (default)
- **High**: 8-minute intervals (more frequent)

#### Changes Made

**1. Dev Drawer UI (`src/lib/dev-drawer.js`)**
```javascript
// Scenic density control with localStorage persistence
const scenicLabel = document.createElement('label');
scenicLabel.innerHTML = `
  <span>Scenic density</span>
  <select id="scenic-density">
    <option value="low">Low (30min)</option>
    <option value="normal">Normal (15min)</option>
    <option value="high">High (8min)</option>
  </select>
`;
```

**2. Candidate Generation (`src/copilot/candidates.js`)**
```javascript
// Read density setting from localStorage
function getScenicDensity() {
  const val = localStorage.getItem('scenicDensity');
  return (val === 'low' || val === 'high') ? val : 'normal';
}

// Use density to adjust scenic suggestion frequency
const density = getScenicDensity();
const scenicMin = density === 'low' ? 30 : density === 'high' ? 8 : 15;

out.push({
  id: `scenic_${minuteBucket(scenicMin)}`,
  reason: `Scenic density: ${density}`,
  expiresAt: now + scenicMin * 60 * 1000,
  // ...
});
```

## Testing Results

### MUST TEST Script (`scripts/test-step29.sh`)

✅ **Test 1: Normal route with avoid**
- Response: `ok=true, route_retry_relaxed=true`
- Confirms retry logic activates when OSRM doesn't support exclude
- Route returned successfully despite constraint relaxation

✅ **Test 2: Forced retry path (test hook)**
- Response: `ok=true, route_retry_relaxed=true`
- Test hook `_testForceRelax` successfully forces retry path
- Verifies retry logic works correctly

### Cloud Run Logs Verification
```json
{
  "event": "route_ok",
  "exclude": "toll",
  "route_retry_relaxed": true,
  "distance_m": 2906,
  "ms": 1626
}
```

Logs confirm:
- `exclude` parameter attempted
- `route_retry_relaxed=true` indicates fallback to route without exclude
- Route computed successfully in 1.6 seconds

## Key Benefits

### Backend Retry Logic
1. **Graceful Degradation**: Routes work even when OSRM doesn't support exclude
2. **User Experience**: Users get a route instead of an error
3. **Transparency**: `route_retry_relaxed` field informs users constraints were relaxed
4. **Analytics**: Logs enable tracking of how often fallback occurs
5. **Future-Proof**: When custom OSRM with exclude support is deployed, logic seamlessly uses it

### Scenic Density Control
1. **User Preference**: Lets users control suggestion frequency
2. **Flexible**: Easy to adjust without code changes
3. **Persistent**: Settings saved in localStorage
4. **Clear Labels**: Shows time intervals (30min/15min/8min) for transparency

## Production Deployment Notes

### Backend
- ✅ Deployed to Cloud Run
- ✅ Test hooks disabled (`ROUTE_TEST_HOOKS` removed)
- ✅ Retry logic active for all requests
- ⚠️ **Future**: Deploy custom OSRM server with exclude support to honor avoid preferences

### Frontend
- ✅ Scenic density control available in Dev Drawer (open with `?debug=1` or `Ctrl+Shift+D`)
- ✅ Default setting: "Normal (15min)"
- ✅ Setting persists across sessions

## Example API Usage

### Route with Avoid (Auto-Retry)
```bash
curl -X POST https://roamwise-backend-v2.../api/route \
  -H "Content-Type: application/json" \
  -d '{
    "stops":[
      {"lat":32.0853,"lon":34.7818},
      {"lat":32.0800,"lon":34.8000}
    ],
    "mode":"drive",
    "constraints":{"avoid":["tolls"]}
  }'
```

**Response:**
```json
{
  "ok": true,
  "distance_m": 2906,
  "duration_s": 300,
  "geometry": { "type": "FeatureCollection", "features": [...] },
  "route_retry_relaxed": true
}
```

The `route_retry_relaxed: true` indicates:
- First attempt with `exclude=toll` failed (OSRM doesn't support it)
- Second attempt without exclude succeeded
- User got a route, but avoid preferences weren't honored

## Next Steps

### For Production Use of Avoid Preferences
1. **Deploy Custom OSRM Server**
   - Configure car.lua profile with exclude classes (toll, ferry, motorway)
   - Deploy to Cloud Run or GKE
   - Update `OSRM_URL` environment variable

2. **Verify Retry Logic**
   - With custom OSRM: `route_retry_relaxed` should be `false`
   - Routes will honor avoid preferences
   - Retry logic remains as safety net for OSRM failures

### User Experience Improvements
1. **Frontend Notification**
   - When `route_retry_relaxed: true`, show toast: "Route computed, but couldn't avoid tolls/ferries/highways"
   - Helps users understand their preferences couldn't be honored

2. **Analytics Dashboard**
   - Track `route_retry_relaxed` frequency in logs
   - Measure impact of deploying custom OSRM
   - Identify popular avoid preferences

## Files Modified

### Backend
- `backend/routes/route.js` - Retry logic, callOsrm helper, test hooks

### Frontend
- `src/lib/dev-drawer.js` - Scenic density selector
- `src/copilot/candidates.js` - Dynamic scenic suggestion frequency

### Testing
- `scripts/test-step29.sh` - MUST TEST script

### Documentation
- `docs/step29-route-retry-scenic.md` - This file
