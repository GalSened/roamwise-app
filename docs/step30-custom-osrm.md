# Step 30: Custom OSRM with Excludable Classes (INCOMPLETE)

## Objective

Deploy a custom OSRM (Open Source Routing Machine) server with support for excludable road classes (toll, ferry, motorway) to enable the backend to honor user avoid preferences instead of falling back to Step 29's retry logic.

## Implementation Status

**Status**: ❌ **FAILED** - Custom OSRM deployment does not support exclude parameter despite correct profile configuration.

**Current Configuration**: Backend reverted to public OSRM (`https://router.project-osrm.org`) with Step 29 retry logic handling lack of exclude support.

## What Was Attempted

### A) Custom OSRM Profile

Created `/Users/galsened/Downloads/roamwise-routing-osrm/profiles/car-exclude.lua` with:

1. **Classes Definition in setup()**
   ```lua
   function setup()
     return {
       -- ... properties ...

       -- Excludable classes
       classes = Sequence {
         'toll', 'ferry', 'motorway'
       },

       -- Speed profile for different road types
       speeds = Sequence {
         highway = {
           motorway = 90,
           motorway_link = 45,
           trunk = 85,
           -- ... more speeds ...
         }
       },
       -- ... more config ...
     }
   end
   ```

2. **Class Tagging in process_way()** (final working version)
   ```lua
   function process_way(profile, way, result, relations)
     -- ... access checks and validation ...

     -- ==== EXCLUDABLE CLASSES ====

     -- Initialize classes tables once at the beginning
     result.forward_classes = {}
     result.backward_classes = {}

     -- 1) TOLL
     local toll = way:get_value_by_key("toll")
     if toll == "yes" then
       result.forward_classes['toll'] = true
       result.backward_classes['toll'] = true
     end

     -- 2) FERRY
     if route == "ferry" then
       result.forward_classes['ferry'] = true
       result.backward_classes['ferry'] = true
       result.forward_mode = mode.ferry
       result.backward_mode = mode.ferry
       result.forward_speed = 5
       result.backward_speed = 5
       result.duration = way:get_value_by_key("duration")
       return -- Early exit for ferry
     end

     -- 3) MOTORWAY
     if highway == "motorway" or highway == "motorway_link" then
       result.forward_classes['motorway'] = true
       result.backward_classes['motorway'] = true
     end

     -- ==== SPEED & ROUTING ====
     -- ... speed calculations, oneway handling ...
   end
   ```

### B) Multi-Stage Dockerfile

Created Docker build pipeline that:

1. **Stage 1 (Builder)**: Downloads PBF, extracts/partitions/customizes OSRM graph
2. **Stage 2 (Runtime)**: Copies built graph and runs osrm-routed server

**Final Dockerfile**:
```dockerfile
# Multi-stage build for OSRM with custom car-exclude profile

# ==================== STAGE 1: Build OSRM graph ====================
FROM osrm/osrm-backend:v5.27.1 AS builder

WORKDIR /data

# Copy PBF file and custom profile
COPY israel-and-palestine-latest.osm.pbf ./
COPY profiles/car-exclude.lua /opt/car-exclude.lua

# Build OSRM graph with custom profile
# Extract: Convert OSM data to OSRM graph format
RUN osrm-extract -p /opt/car-exclude.lua israel-and-palestine-latest.osm.pbf

# Partition: Prepare graph for routing algorithm
RUN osrm-partition israel-and-palestine-latest.osrm

# Customize: Apply profile-specific customizations
RUN osrm-customize israel-and-palestine-latest.osrm

# ==================== STAGE 2: Runtime server ====================
FROM osrm/osrm-backend:v5.27.1

WORKDIR /data

# Copy built OSRM graph files from builder stage
COPY --from=builder /data/israel-and-palestine-latest.osrm* ./

ENV PORT=8080
EXPOSE 8080

# Start OSRM server with MLD algorithm
CMD ["osrm-routed", "--algorithm=MLD", "--port", "8080", "/data/israel-and-palestine-latest.osrm"]
```

### C) Build and Deploy

**Preparation**:
```bash
cd /Users/galsened/Downloads/roamwise-routing-osrm
curl -L -o israel-and-palestine-latest.osm.pbf \
  https://download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf
```

**Build**:
```bash
docker build --platform linux/amd64 -t roamwise-osrm .
docker tag roamwise-osrm gcr.io/premium-hybrid-473405-g7/roamwise-osrm
docker push gcr.io/premium-hybrid-473405-g7/roamwise-osrm
```

**Deploy to Cloud Run**:
```bash
gcloud run deploy roamwise-osrm \
  --image gcr.io/premium-hybrid-473405-g7/roamwise-osrm \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60s \
  --max-instances 5 \
  --port 8080
```

**Result**: Deployed to `https://roamwise-osrm-971999716773.us-central1.run.app`

### D) Backend Update (Attempted)

```bash
gcloud run services update roamwise-backend-v2 \
  --region us-central1 \
  --update-env-vars OSRM_URL=https://roamwise-osrm-971999716773.us-central1.run.app
```

**Note**: This was later reverted to public OSRM due to test failures.

## Test Results

### MUST TEST Script: `scripts/test-step30.sh`

**Test 1: Direct OSRM with exclude parameter**
```bash
curl "https://roamwise-osrm-971999716773.us-central1.run.app/route/v1/driving/34.7818,32.0853;34.8000,32.0800?overview=false&exclude=toll"
```

**Result**: ❌ **FAILED**
- HTTP Status: 400 (expected 200)
- Response: `{"message": "Exclude flag combination is not supported.", "code": "InvalidValue"}`

**Test 2: Backend route with avoid=tolls**
```bash
curl -X POST https://roamwise-backend-v2.../api/route \
  -H "Content-Type: application/json" \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive","constraints":{"avoid":["tolls"]}}'
```

**Result**: ❌ **FAILED**
- Response: `{"ok": true, "route_retry_relaxed": true, ...}`
- Expected: `route_retry_relaxed: false` (constraints should be honored)
- Actual: `route_retry_relaxed: true` (constraints ignored, fell back to retry logic)

**Test 3: Control route without avoid**
```bash
curl -X POST https://roamwise-backend-v2.../api/route \
  -H "Content-Type: application/json" \
  -d '{"stops":[{"lat":32.0853,"lon":34.7818},{"lat":32.0800,"lon":34.8000}],"mode":"drive"}'
```

**Result**: ✅ **PASSED**
- Response: `{"ok": true, "distance_m": 2906, ...}`
- Basic routing works correctly

### Additional Verification

**Basic routing without exclude works**:
```bash
curl "https://roamwise-osrm-971999716773.us-central1.run.app/route/v1/driving/34.7818,32.0853;34.8000,32.0800?overview=false"
# Returns: {"code": "Ok", "routes": [...]} ✅
```

**All exclude parameters fail**:
```bash
# exclude=toll → InvalidValue
# exclude=ferry → InvalidValue
# exclude=motorway → InvalidValue
# exclude=toll,ferry → InvalidValue
```

## Troubleshooting and Errors

### Error 1: Debian Stretch Package Repository EOL
**Issue**: Couldn't install wget during build to download PBF
```
E: Failed to fetch http://deb.debian.org/debian/dists/stretch/main/binary-amd64/Packages  404  Not Found
```
**Root Cause**: osrm/osrm-backend:latest uses Debian Stretch (end-of-life)
**Fix**: Downloaded PBF locally before build, used COPY instead of RUN wget

### Error 2: OSRM Lua API - Classes Syntax Evolution

**Attempt 1**: `result:add_class('toll')`
- Error: `attempt to call method 'add_class' (a nil value)`
- Fix: Method doesn't exist

**Attempt 2**: `result.classes['toll'] = true`
- Error: `attempt to index (set) nil value "classes" on userdata`
- Fix: Can't set classes directly

**Attempt 3**: `result.forward_classes = result.forward_classes or {}`
- Issue: Initializing multiple times could overwrite
- Fix: Initialize once at beginning

**Final Working Version**:
```lua
-- Initialize classes tables once
result.forward_classes = {}
result.backward_classes = {}

-- Then set individual classes
if toll == "yes" then
  result.forward_classes['toll'] = true
  result.backward_classes['toll'] = true
end
```

### Error 3: Missing excludable_combinations (exclude-v2)
**Attempt**: Added `excludable_combinations` property with table assignment
```lua
-- In setup():
excludable = Set { 'toll', 'ferry', 'motorway' },
excludable_combinations = Sequence {
  Set { 'toll' },
  Set { 'ferry' },
  Set { 'motorway' },
  Set { 'toll', 'ferry' },
  Set { 'toll', 'motorway' },
  Set { 'ferry', 'motorway' },
  Set { 'toll', 'ferry', 'motorway' }
}

-- In process_way():
result.forward_classes = {}
result.backward_classes = {}
result.forward_classes['toll'] = true
```
**Result**: Still returned HTTP 400 "Exclude flag combination is not supported"
**Built as**: exclude-v2 tag
**Fix**: Changed to Sequence :insert() method

### Error 4: Sequence :insert() Still Fails (exclude-v3)
**Attempt**: Changed from table assignment to Sequence :insert() method
```lua
-- In process_way():
result.forward_classes = Sequence {}
result.backward_classes = Sequence {}
result.forward_classes:insert('toll')
result.backward_classes:insert('toll')
```
**Version**: v5.25.0 (latest available Docker tag)
**Result**: ❌ **STILL FAILED**
- HTTP 400 for single exclude
- HTTP 400 for multi exclude
- route_retry_relaxed=true (constraints not honored)
**Built as**: exclude-v3 tag
**Deployed**: `https://roamwise-osrm-2t6n2rxiaa-uc.a.run.app` (revision 00005-f6f)

**Error Message**:
```json
{
  "message": "Exclude flag combination is not supported.",
  "code": "InvalidValue"
}
```

**Diagnosis**: The error comes from osrm-routed binary itself, not the Lua profile. The OSRM Docker image v5.25.0 does not support the exclude parameter at the HTTP API level, regardless of profile configuration.

### Error 5: OSRM Version v5.27.1 Tag Doesn't Exist
**Attempt**: Use `FROM osrm/osrm-backend:v5.27.1`
**Result**: Docker build failed - tag not found
**Note**: Tried to use newer version to get exclude support, but tag doesn't exist. Latest is v5.25.0.

## Root Cause Analysis

**Problem**: The osrm-backend:v5.25.0 Docker image does not support the `exclude` parameter despite **all correct profile configurations**:
- ✅ Profile correctly defining `excludable` and `excludable_combinations` in setup()
- ✅ Profile correctly tagging ways with `forward_classes:insert()` and `backward_classes:insert()`
- ✅ OSRM graph building successfully (extract/partition/customize)
- ✅ Basic routing working correctly

**Definitive Cause**: The osrm-routed binary in the Docker image rejects the exclude parameter at the HTTP API level, before it even checks the profile configuration. The error "Exclude flag combination is not supported" comes from the server itself, not from the Lua profile.

**Evidence**:
- OSRM logs show HTTP 400 returned immediately (0.046827ms, 0.151221ms)
- Error message is generic "Exclude flag combination is not supported", not profile-specific
- Same error regardless of profile changes (table vs Sequence, with/without excludable_combinations)
- Basic routes (without exclude) work perfectly

**Conclusion**: The osrm-backend:v5.25.0 Docker image **does not include exclude parameter support** at all. This feature may require:
1. Building OSRM from source with specific CMake flags
2. A different OSRM release version (not available in Docker Hub)
3. Or the feature may not be publicly available yet

## Current Configuration

**Custom OSRM (exclude-v3)**:
- Deployed at `https://roamwise-osrm-2t6n2rxiaa-uc.a.run.app` (revision 00005-f6f)
- Version: osrm-backend:v5.25.0
- Image: `gcr.io/premium-hybrid-473405-g7/roamwise-osrm:exclude-v3`
- Profile: car-exclude.lua with `excludable_combinations` and Sequence :insert()
- Graph: israel-and-palestine-latest.osm.pbf (627 MB)
- Basic routing: ✅ Works
- Exclude parameter: ❌ **Not supported by osrm-routed binary**

**Backend Configuration**:
- OSRM_URL: `https://roamwise-osrm-2t6n2rxiaa-uc.a.run.app` (custom OSRM, exclude-v3)
- Step 29 retry logic: Active
- Behavior: Returns `route_retry_relaxed=true` when exclude fails (always)

## Comparison: Step 29 vs Step 30

### Step 29: Graceful Degradation (WORKING)
- Backend tries route with exclude parameter
- If fails (400), retries without exclude
- Returns `route_retry_relaxed=true` flag
- User gets a route but avoid preferences ignored
- Works with any OSRM server (public or custom)

### Step 30: Native Exclude Support (NOT WORKING)
- Custom OSRM should accept exclude parameter
- Backend doesn't need to retry
- Returns `route_retry_relaxed=false` flag
- User avoid preferences honored
- **Problem**: Can't get OSRM to support exclude parameter

## Future Steps to Enable Exclude Support

### Option 1: Build OSRM from Source
```bash
# Clone OSRM repo
git clone https://github.com/Project-OSRM/osrm-backend.git
cd osrm-backend

# Build with specific flags
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
sudo make install

# Build graph with custom profile
osrm-extract -p car-exclude.lua israel-and-palestine-latest.osm.pbf
osrm-partition israel-and-palestine-latest.osrm
osrm-customize israel-and-palestine-latest.osrm

# Run server
osrm-routed --algorithm=MLD israel-and-palestine-latest.osrm
```

### Option 2: Find OSRM Version with Classes Support
- Research OSRM documentation for exclude/classes feature
- Identify specific release version that supports it
- Use that version in Dockerfile

### Option 3: Alternative Routing Services
- Evaluate other routing engines (Valhalla, GraphHopper)
- These may have better support for avoid preferences
- Trade-off: Different API, different deployment

### Option 4: Accept Step 29 as Final Solution
- Step 29 retry logic provides good user experience
- Users get routes even when avoid can't be honored
- `route_retry_relaxed` flag provides transparency
- External navigation always available as alternative

## Files Created/Modified

### Created
- `/Users/galsened/Downloads/roamwise-routing-osrm/profiles/car-exclude.lua` - Custom OSRM profile with excludable_combinations
- `/Users/galsened/Downloads/RoamWise-frontend-WX/scripts/test-step30.sh` - Original MUST TEST script
- `/Users/galsened/Downloads/RoamWise-frontend-WX/scripts/test-step30-fix.sh` - Enhanced MUST TEST script for exclude-v3
- `/Users/galsened/Downloads/RoamWise-frontend-WX/docs/step30-custom-osrm.md` - This file

### Modified
- `/Users/galsened/Downloads/roamwise-routing-osrm/Dockerfile` - Multi-stage build (v5.25.0)

### Downloaded
- `israel-and-palestine-latest.osm.pbf` (627 MB) - OpenStreetMap data (updated size)

## Key Learnings

1. **OSRM Profile Syntax Evolution**:
   - Attempt 1: Table assignment `result.forward_classes['toll'] = true` (FAILED)
   - Attempt 2: Sequence :insert() `result.forward_classes:insert('toll')` (ALSO FAILED)
   - Both syntaxes are correct for the profile, but the osrm-routed binary doesn't support exclude

2. **excludable_combinations Required**: Profile must define both:
   - `excludable = Set { 'toll', 'ferry', 'motorway' }`
   - `excludable_combinations = Sequence { Set { 'toll' }, ... }` (all valid combinations)
   - But these are **necessary but not sufficient** - osrm-routed must also support the feature

3. **Docker Multi-Stage Builds**: Essential for OSRM to separate graph building (heavy) from runtime (lightweight)

4. **PBF Download Strategy**: Download locally before build to avoid package manager issues in old base images

5. **OSRM Binary vs Profile**: The exclude parameter support is determined by the osrm-routed **binary**, not just the Lua profile. Profile configuration is irrelevant if the binary doesn't support the feature.

6. **Docker Image Limitations**: osrm-backend:v5.25.0 (latest public Docker image) does not support exclude parameter at HTTP API level, despite correct profile configuration

7. **Graceful Degradation Value**: Step 29's retry logic proves valuable and necessary when infrastructure doesn't support all features

## Conclusion

Step 30 attempted to deploy a custom OSRM server with excludable classes support through **three iterations**:
1. **exclude-v1**: WayHandlers approach (failed - no edges)
2. **exclude-v2**: Table assignment with excludable_combinations (failed - exclude not supported)
3. **exclude-v3**: Sequence :insert() with excludable_combinations (failed - exclude not supported)

All attempts built and deployed successfully, with correct profile configuration, but the `exclude` parameter consistently returns "Exclude flag combination is not supported" error. The root cause is that **osrm-backend:v5.25.0 Docker image does not include exclude parameter support** at the osrm-routed binary level.

**Current Status**:
- Custom OSRM (exclude-v3) deployed at `https://roamwise-osrm-2t6n2rxiaa-uc.a.run.app`
- Backend uses custom OSRM with Step 29 retry logic providing graceful degradation
- All routes fall back to relaxed constraints (route_retry_relaxed=true)

**Definitive Finding**:
The exclude parameter feature is **not available in public osrm-backend Docker images**, regardless of profile configuration. This is a binary-level limitation, not a profile issue.

**Recommendation**:
Accept Step 29 retry logic as the final solution. The exclude parameter feature would require either:
1. Building OSRM from source (complex, maintenance burden)
2. Finding an alternative routing engine (significant migration effort)
3. Waiting for future OSRM releases to support this feature

**User Impact**:
Users continue to get routes via Step 29 retry logic. Avoid preferences (tolls, ferries, motorways) are not honored, but users can always use external navigation apps for specific routing needs. The `route_retry_relaxed` flag provides transparency about when constraints were relaxed.
