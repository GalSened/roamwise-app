# RoamWise — AI-Powered Travel Planner PWA

## /constitution

### Mission

RoamWise is a Progressive Web App that provides personalized travel recommendations and trip planning powered by AI. The app learns user preferences over time and delivers context-aware suggestions for restaurants, attractions, and complete trip itineraries.

### Core Principles

1. **AI-First Experience** - Every feature leverages Personal AI (o3-mini) for intelligent, personalized recommendations
2. **Mobile-First Design** - Optimized for iPhone and mobile devices with responsive UI
3. **Real-Time Intelligence** - Live location services, weather-aware routing, and voice guidance
4. **Progressive Enhancement** - Works offline, installable as PWA, with service worker caching
5. **User Privacy** - API keys secured in GCP Secret Manager, no sensitive data in frontend

### Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Node.js + Express (Google App Engine)
- **AI**: OpenAI o3-mini via Personal AI system
- **Maps**: Leaflet + OpenStreetMap
- **Voice**: Web Speech API
- **Deployment**: GitHub Pages (frontend), GCP App Engine (backend)

---

## /specify

### User Stories

#### US-1: Voice-Controlled Search

**As a** mobile user
**I want to** use voice commands to search for places
**So that** I can find recommendations hands-free while traveling

**Acceptance Criteria:**

- Press and hold voice button to record
- Speech-to-text transcription appears
- Supports commands: "Find restaurants", "Search for coffee", "Plan a trip"
- Navigates to appropriate page with query pre-filled
- Error handling for no microphone, no speech, unsupported browser

#### US-2: AI Trip Generation

**As a** traveler
**I want to** generate personalized trip itineraries
**So that** I can plan my day based on my interests and budget

**Acceptance Criteria:**

- Select trip duration (half day, full day, multi-day)
- Select 1-4 interests (food, culture, nature, adventure, relaxation, shopping)
- Adjust budget slider ($50-$1000)
- Validation: Must select at least 1 interest
- AI generates detailed itinerary with confidence score
- Shows personalized insights and learning notes

#### US-3: Interactive Map

**As a** user
**I want to** view locations on an interactive map
**So that** I can visualize where recommendations are located

**Acceptance Criteria:**

- Default location: Tel Aviv
- "My Location" button requests geolocation permission
- Centers map on user's actual location when granted
- Markers for recommended places
- Zoom controls and pan/drag functionality
- Loads OpenStreetMap tiles

#### US-4: Smart Search

**As a** user
**I want to** search for specific types of places
**So that** I can find what I'm looking for quickly

**Acceptance Criteria:**

- Text input with search button
- 4 category quick buttons: Food, Attractions, Hotels, Events
- Loading indicator during API call
- Results display with AI-personalized notes
- Empty input validation

#### US-5: Profile Settings

**As a** user
**I want to** configure app behavior
**So that** I can customize my experience

**Acceptance Criteria:**

- Toggle voice guidance on/off
- Toggle weather-aware routing on/off
- Settings persist during session
- Visual feedback on toggle

---

## /plan

### Architecture

#### Frontend Structure

```
/Users/galsened/Downloads/RoamWise-frontend-WX/
├── index.html              # Main HTML with 5 views
├── app-main.js             # Core JavaScript logic
├── sw.js                   # Service worker for PWA
├── manifest.json           # PWA manifest
└── screenshots/            # Test screenshots
```

#### Backend Structure

```
/Users/galsened/Downloads/RoamWise-PersonalAI/
├── server.js               # Express server
├── fetch-secrets.js        # Secret Manager integration
├── src/
│   └── core/
│       └── PersonalAI.js   # AI logic and learning
├── app.yaml                # GCP App Engine config
└── package.json
```

### API Endpoints

#### Backend (premium-hybrid-473405-g7.uc.r.appspot.com)

**Health Check**

```
GET /health
Response: { status: "healthy", timestamp, uptime, memory }
```

**Intelligent Search**

```
POST /api/intelligence/search
Body: {
  query: string,
  location: string,
  preferences: {
    budgetCategory: string,
    destinationTypes: string[],
    activityPreferences: string[]
  }
}
Response: {
  results: [],
  query: string,
  personalizedNote: string,
  totalResults: number
}
```

**AI Trip Recommendations**

```
POST /api/ai/recommend
Body: {
  preferences: {
    duration: string,
    interests: string[],
    budget: number,
    destinationType: string,
    activities: string[]
  },
  context: {
    userId: string,
    location: string,
    requestType: string
  }
}
Response: {
  recommendations: {
    rawResponse: string
  },
  confidence: number,
  personalizedInsight: string,
  learningNote: string
}
```

### State Management

- No external state library (Vue/React)
- DOM-based state with class toggles
- View switching via `.active` class
- Navigation button highlighting

### Navigation Flow

```
[Search] → [AI] → [Trip] → [Map] → [Profile]
   ↓        ↓       ↓        ↓         ↓
Default  Voice   Plan   Location  Settings
```

---

## /tasks

### Phase 1: Critical Bug Fixes ✅ COMPLETED

- [x] Fix duplicate `const tripDisplay` declaration (line 297)
- [x] Add missing `try` block before fetch call (line 238)
- [x] Deploy fixes to GitHub Pages
- [x] Verify all navigation tabs work correctly
- [x] Test backend API endpoints

### Phase 2: OpenAI API Key Issue 🔄 IN PROGRESS

- [x] Update Secret Manager with new OpenAI key (version 3)
- [ ] Fix backend Secret Manager permissions (PERMISSION_DENIED)
- [ ] Grant secretAccessor role to service account
- [ ] Redeploy backend with correct permissions
- [ ] Test AI trip generation works end-to-end

### Phase 3: Frontend Testing ⏳ PENDING

- [ ] Run full Playwright test suite
- [ ] Verify all 22 buttons functional
- [ ] Test on iPhone (user testing)
- [ ] Generate test report
- [ ] Update FINAL-APP-ANALYSIS.md

### Phase 4: Documentation 📝 PENDING

- [ ] Create API documentation
- [ ] Update README with setup instructions
- [ ] Document Secret Manager configuration
- [ ] Create user guide for voice commands
- [ ] Add troubleshooting guide

### Phase 5: Performance Optimization 🚀 FUTURE

- [ ] Implement service worker offline mode
- [ ] Add request caching
- [ ] Optimize bundle size
- [ ] Add code splitting
- [ ] Performance monitoring

### Phase 6: Feature Enhancements 💡 FUTURE

- [ ] Save trip history
- [ ] Export trips to calendar
- [ ] Share trips with friends
- [ ] More voice commands
- [ ] User authentication
- [ ] Trip favorites/bookmarks
- [ ] Multi-language support
- [ ] Dark mode

---

## Current Status (2025-10-01)

### ✅ Working Features

- All navigation tabs (Search, AI, Trip, Map, Profile)
- Voice recognition with Web Speech API
- Interactive Leaflet map with geolocation
- Trip planning UI with validation
- Search functionality
- Profile settings toggles
- PWA installable
- Service worker caching (v19)

### ❌ Known Issues

1. **OpenAI API Key Rejected** - Backend service account lacks Secret Manager permissions
2. **AI Trip Generation Fails** - Returns 401 error from OpenAI
3. **Backend Deployment Issues** - npm package-lock.json sync problems (workaround: exclude from .gcloudignore)

### 📊 Test Results

- Navigation: 5/5 tabs working ✅
- Backend Health: 200 OK ✅
- Search API: 200 OK ✅
- Trip API: 503 Service Unavailable ❌ (permissions)

### 🔑 Secret Manager Configuration

- OPENAI_API_KEY: 3 versions (v3 latest, v1-v2 disabled)
- GOOGLE_MAPS_API_KEY: [REDACTED_GMAPS_KEY]
- OPENWEATHER_API_KEY: [REDACTED_OPENWEATHER_KEY]

### 🌐 Deployment URLs

- **Frontend**: https://galsened.github.io/roamwise-app/
- **Backend**: https://premium-hybrid-473405-g7.uc.r.appspot.com
- **Project**: premium-hybrid-473405-g7 (GCP)
- **Repository**: https://github.com/GalSened/roamwise-app (gh-pages branch)

---

## Next Immediate Actions

1. **Fix Secret Manager Permissions** (CRITICAL)

   ```bash
   gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
     --member="serviceAccount:premium-hybrid-473405-g7@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

2. **Grant for All Secrets**

   ```bash
   gcloud secrets add-iam-policy-binding GOOGLE_MAPS_API_KEY \
     --member="serviceAccount:premium-hybrid-473405-g7@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"

   gcloud secrets add-iam-policy-binding OPENWEATHER_API_KEY \
     --member="serviceAccount:premium-hybrid-473405-g7@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Redeploy Backend** (if needed)

   ```bash
   cd /Users/galsened/Downloads/RoamWise-PersonalAI
   gcloud app deploy --quiet
   ```

4. **Test AI Trip Generation**

   ```bash
   curl -X POST 'https://premium-hybrid-473405-g7.uc.r.appspot.com/api/ai/recommend' \
     -H 'Content-Type: application/json' \
     -d '{"preferences":{"duration":"full_day","interests":["food"],"budget":500},"context":{"userId":"test"}}'
   ```

5. **Complete iPhone Testing**
   - Open https://galsened.github.io/roamwise-app/ on iPhone
   - Test all navigation tabs
   - Test voice recognition
   - Test trip generation (once API fixed)
   - Test map geolocation
