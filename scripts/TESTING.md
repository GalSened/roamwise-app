# RoamWise Testing Guide

This document describes the testing strategy for RoamWise, including automated smoke tests, manual frontend tests, and log verification procedures.

## Table of Contents

- [Automated Smoke Tests](#automated-smoke-tests)
- [Manual Frontend Tests](#manual-frontend-tests)
- [Pass Criteria](#pass-criteria)
- [Log Verification](#log-verification)
- [GitHub Actions Setup](#github-actions-setup)

---

## Automated Smoke Tests

### Local Testing

Run the smoke test script locally:

```bash
npm run smoke
```

Or directly:

```bash
./scripts/must-test.sh
```

**Requirements:**
- `gcloud` CLI configured (optional - script falls back to hardcoded URLs)
- `jq` installed for JSON parsing
- `curl` for HTTP requests

### What It Tests

The smoke test verifies 5 critical endpoints:

1. **OSRM Reachability** - Ensures routing service is up
2. **Route API** - Tests full route calculation via proxy
3. **Hazards API** - Tests weather/traffic hazard aggregation
4. **Health Dashboard** - Verifies admin/monitoring endpoints
5. **Request-ID Propagation** - Provides guidance for manual log verification

### GitHub Actions

Trigger automated smoke tests via GitHub Actions:

1. Go to **Actions** tab in GitHub repository
2. Select **must-test** workflow
3. Click **Run workflow**
4. View results

**Note:** The workflow requires repository variables to be configured (see [GitHub Actions Setup](#github-actions-setup)).

---

## Manual Frontend Tests

These tests verify the user-facing functionality that cannot be automated.

### Test 1: Navigation with ETA/Distance Chips

**Duration:** ~30 seconds

**Steps:**
1. Open the RoamWise app at https://roamwise-frontend-2t6n2rxiaa-uc.a.run.app
2. Choose a destination by clicking on the map or searching
3. Click the **Navigate** button

**Expected Results:**
- ✅ ETA chip displays estimated time (e.g., "12 min")
- ✅ Distance chip displays route distance (e.g., "3.5 km")
- ✅ Route polyline appears on map
- ✅ No error messages displayed

---

### Test 2: External Map App Buttons

**Duration:** ~15 seconds

**Steps:**
1. After selecting a destination and calculating a route
2. Click on each external map app button:
   - Google Maps
   - Apple Maps
   - Waze

**Expected Results:**
- ✅ Each button opens the respective map app
- ✅ Destination is correctly passed to the app
- ✅ Origin is passed (if GPS fix exists)
- ✅ No "undefined" or "null" in URLs

---

### Test 3: Hazards Visualization Toggle

**Duration:** ~45 seconds

**Steps:**
1. Open the app and pan to a location with known traffic/weather
2. Toggle the **Hazards** flag/button (if feature flag exists)
3. Pan the map around

**Expected Results:**
- ✅ Weather polygons appear on map (if weather alerts exist)
- ✅ Traffic lines appear on map (if traffic incidents exist)
- ✅ Clicking a hazard shows severity and title
- ✅ Hazards update when panning to new areas
- ✅ Empty areas show no hazards (not an error)

---

### Test 4: Resilience - OSRM Down Scenario

**Duration:** ~60 seconds

**Purpose:** Verify app gracefully handles backend failures

**Steps:**
1. **Prepare:** Temporarily scale OSRM to 0 instances:
   ```bash
   gcloud run services update roamwise-osrm --region us-central1 --min-instances 0 --max-instances 0
   ```

2. **Test:**
   - Open the app
   - Select a destination
   - Click **Navigate**

3. **Restore:**
   ```bash
   gcloud run services update roamwise-osrm --region us-central1 --min-instances 0 --max-instances 1
   ```

**Expected Results:**
- ✅ App remains functional (no crash)
- ✅ ETA chip shows "—" (dash/placeholder)
- ✅ Distance chip shows "—" (dash/placeholder)
- ✅ External map buttons still work (fallback to direct lat/lon)
- ✅ Error message is user-friendly (not technical stack trace)

---

## Pass Criteria

### Automated Smoke Test

All 5 tests must pass:

| # | Test | Expected Output | Status |
|---|------|----------------|--------|
| 1 | OSRM Reachability | `code: "Ok"` | ✅ |
| 2 | Route API | `ok: true`, `distance_m > 0`, `duration_s > 0`, `geometry.type: "FeatureCollection"` | ✅ |
| 3 | Hazards API | `ok: true`, `counts` object present | ✅ |
| 4 | Health Dashboard | `ok: true/false`, `providers.osrm.up: true/false`, `providers.overpass.up: true/false` | ✅ |
| 5 | Request-ID Propagation | Guidance provided for manual log check | ℹ️ |

### Manual Frontend Tests

| Test | Pass Criteria |
|------|--------------|
| Navigation Chips | ETA and Distance display numeric values |
| External Buttons | All 3 map apps open with correct destination |
| Hazards | Weather/traffic layers render and are clickable |
| OSRM Down | App shows placeholders, external buttons work |

---

## Log Verification

### Request-ID Propagation Check

Verify that request IDs propagate through the entire request chain:

#### 1. Identify Request IDs

From smoke test output:
```
Request-ID propagation check:
   - Search for: rw_musttest_route_* in proxy and backend-v2 logs
   - Search for: rw_musttest_haz_* in proxy and backend-v2 logs
```

From GitHub Actions (in workflow summary):
```
- Route: gh_action_route_<RUN_ID>
- Hazards: gh_action_hazards_<RUN_ID>
```

#### 2. Search Cloud Run Logs

**Using gcloud CLI:**

```bash
# Search backend-v2 logs for route request
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=roamwise-backend-v2 \
  AND jsonPayload.req.id=rw_musttest_route_1727812345" \
  --limit 5 --format json

# Search proxy logs for hazards request
gcloud logging read "resource.type=cloud_run_revision \
  AND resource.labels.service_name=roamwise-proxy \
  AND textPayload:rw_musttest_haz_1727812345" \
  --limit 5 --format json
```

**Using Cloud Console:**

1. Go to **Cloud Run** → Select service (proxy or backend-v2)
2. Click **Logs** tab
3. Enter filter:
   ```
   jsonPayload.req.id="rw_musttest_route_1727812345"
   ```
   or
   ```
   "rw_musttest_haz_1727812345"
   ```

#### 3. Verify Expected Fields

**In backend-v2 logs:**
```json
{
  "req": {
    "id": "rw_musttest_route_1727812345",
    "method": "POST",
    "url": "/api/route"
  },
  "res": {
    "statusCode": 200,
    "headers": {
      "x-request-id": "rw_musttest_route_1727812345"
    }
  },
  "route": "/api/route",
  "responseTime": 245,
  "event": "route_ok"
}
```

**Expected fields:**
- ✅ `req.id` matches the custom x-request-id
- ✅ `res.headers.x-request-id` is present
- ✅ `route` field indicates the endpoint
- ✅ `responseTime` shows latency in ms
- ✅ `event` field shows operation (route_ok, hazards_ok, etc.)

**In proxy logs:**
```json
{
  "level": "info",
  "msg": "[rw_musttest_route_1727812345] POST /api/route",
  ...
}
```

**Expected fields:**
- ✅ Request ID appears in log message
- ✅ Method and path are logged
- ✅ Timestamp matches request time

---

## GitHub Actions Setup

### Repository Variables

Configure these variables in your GitHub repository:

**Path:** Settings → Secrets and variables → Actions → Variables

| Variable Name | Value | Required |
|--------------|-------|----------|
| `ROAMWISE_PROXY_URL` | `https://roamwise-proxy-2t6n2rxiaa-uc.a.run.app` | ✅ Yes |
| `ROAMWISE_BACKEND_V2_URL` | `https://roamwise-backend-v2-2t6n2rxiaa-uc.a.run.app` | ✅ Yes |

### Setting Variables

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **Variables** tab
4. Click **New repository variable**
5. Enter name and value from table above
6. Click **Add variable**
7. Repeat for second variable

### Verifying Setup

After configuring variables:

1. Go to **Actions** tab
2. Select **must-test** workflow
3. Click **Run workflow**
4. Workflow should complete successfully with ✅ status

If workflow fails with "variable not set" error, verify variables are correctly configured.

---

## Troubleshooting

### Smoke Test Failures

**OSRM returns ERROR:**
- Check OSRM service is running: `gcloud run services describe roamwise-osrm --region us-central1`
- Verify service has instances: Look for "min-instances" and "max-instances"

**Route API returns ok:false:**
- Check backend-v2 logs for errors
- Verify OSRM_URL environment variable is set in backend-v2
- Test OSRM endpoint directly (see test #1)

**Hazards API returns ok:false:**
- This is expected if weather/traffic feed URLs are not configured
- Check if HAZ_WEATHER_URL and HAZ_TRAFFIC_URL are set in backend-v2

**Health dashboard missing fields:**
- Verify admin routes are mounted in backend-v2 server.js
- Check metrics.js and providers.js modules exist

### GitHub Actions Failures

**Variables not found:**
- Verify variables are set at repository level (not environment level)
- Variable names must match exactly (case-sensitive)

**jq command not found:**
- Update workflow to install jq (should not happen on ubuntu-latest)

**Timeout errors:**
- Increase timeout in workflow (currently 5 minutes)
- Check if services are running and accessible

---

## Best Practices

### When to Run Tests

**Always run before:**
- Creating a pull request
- Deploying to production
- After major infrastructure changes

**Optional for:**
- Minor frontend CSS/HTML changes
- Documentation updates
- Non-functional changes

### Test Frequency

- **Local smoke tests:** Before every PR
- **GitHub Actions:** On-demand via workflow_dispatch
- **Manual frontend tests:** Weekly or after UI changes
- **Log verification:** After implementing new features with request IDs

### Adding New Tests

To add a new automated test:

1. Add test case to `scripts/must-test.sh`
2. Update pass criteria in this document
3. Consider adding to GitHub Actions workflow
4. Document expected output and failure modes

---

## Additional Resources

- [Cloud Run Logging Documentation](https://cloud.google.com/run/docs/logging)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [jq Manual](https://stedolan.github.io/jq/manual/)
- [Playwright Testing](https://playwright.dev/)

---

**Last Updated:** October 2025
**Maintained by:** RoamWise Engineering Team
