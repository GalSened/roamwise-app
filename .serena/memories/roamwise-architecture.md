# RoamWise App - Complete Architecture

## Project Locations
- **Frontend:** `/Users/galsened/Downloads/RoamWise-frontend-WX/`
- **Proxy Backend:** `/Users/galsened/Downloads/RoamWise-proxy-WX/`
- **PersonalAI Backend:** `/Users/galsened/Downloads/RoamWise-PersonalAI/`
- **Old Backend:** `/Users/galsened/Downloads/RoamWise-backend/` (empty, can delete)

## System Architecture

### 1. Frontend (PWA)
**Deployment:** GitHub Pages  
**URL:** https://galsened.github.io/roamwise-app/  
**Repository:** https://github.com/GalSened/roamwise-app (gh-pages branch)

**Tech Stack:**
- Vanilla JavaScript (ES6+)
- HTML5, CSS3
- Leaflet.js for maps
- Web Speech API for voice
- Service Worker for PWA/offline

**Main Files:**
- `index.html` (37,805 bytes) - 5 views in one HTML
- `app.js` (2,404 lines) - Legacy code
- `app-main.js` (46,354 bytes) - **Current active code**
- `sw.js` - Service worker cache v19
- `manifest.webmanifest` - PWA config

**5 Pages:**
1. **Search** - AI-powered place search with categories
2. **AI** - Voice commands + quick actions
3. **Trip** - AI trip generation with duration/interests/budget
4. **Map** - Interactive Leaflet map with geolocation
5. **Profile** - Settings toggles

**22 Buttons - All Functional ✅:**
- Search: 1 search btn + 4 category btns
- AI: 1 voice btn + 4 quick action btns
- Trip: 3 duration + 6 interest + 1 budget slider + 1 generate btn
- Map: 1 location btn
- Profile: 2 setting toggles

### 2. Proxy Backend (Cloud Run)
**URL:** https://roamwise-proxy-2t6n2rxiaa-uc.a.run.app  
**Region:** us-central1  
**File:** `server.js` (1,150 lines)

**Features:**
- Rate limiting (express-rate-limit)
- Caching (NodeCache, 5-10min TTL)
- Security (Helmet)
- Logging (Winston)
- CORS for GitHub Pages

**Endpoints:**
- `GET /health`
- `POST /places` - Google Maps places
- `POST /directions` - Routing
- `POST /geocode` - Address lookup

### 3. PersonalAI Backend (App Engine)
**URL:** https://premium-hybrid-473405-g7.uc.r.appspot.com  
**Project ID:** premium-hybrid-473405-g7  
**File:** `server.js` (169 lines)

**AI Core Modules** (`src/core/`):
- `PersonalAI.js` (20,260 bytes) - Main AI engine
- `ConversationalAI.js` (13,905 bytes) - Conversation handling
- `PreferenceEngine.js` (17,863 bytes) - User preference learning
- `TravelMemory.js` (15,875 bytes) - Travel history memory

**AI Features:**
- OpenAI o3-mini integration
- TensorFlow.js ML models
- Natural language processing (compromise, natural)
- Sentiment analysis
- User behavior learning

**Endpoints:**
- `GET /health`
- `POST /api/intelligence/search` - AI-powered search
- `POST /api/ai/recommend` - Trip recommendations

## Frontend Directory Structure
```
RoamWise-frontend-WX/
├── index.html              # Main HTML
├── app-main.js            # Active JavaScript
├── app.js                 # Legacy (being phased out)
├── sw.js                  # Service worker
├── manifest.webmanifest   # PWA manifest
├── assets/                # Images, icons
├── backend/               # Local dev server
│   ├── server.js
│   ├── db.js
│   ├── auth.js
│   └── roamwise.db       # SQLite
├── src/
│   ├── components/
│   ├── copilot/
│   ├── core/
│   ├── lib/
│   ├── map/
│   ├── providers/
│   └── routes/
├── tests/                 # Playwright tests
├── spec/                  # Test specs
├── screenshots/           # Test screenshots
└── .github/workflows/     # CI/CD

Documentation:
├── SPEC.md
├── FINAL-APP-ANALYSIS.md
├── TESTING-SUMMARY.md
├── VOICE-COMMANDS-GUIDE.md
├── COMPREHENSIVE-TEST-REPORT.md
└── TEST-ANALYSIS-REPORT.md
```

## Technology Stack Summary

**Frontend:**
- No framework (vanilla JS)
- Leaflet 1.9.4 for maps
- OpenStreetMap tiles
- Web Speech API
- Service Worker API
- LocalStorage for settings

**Backend:**
- Node.js + Express
- OpenAI API (o3-mini)
- TensorFlow.js
- Google Cloud Secret Manager
- Google Maps API
- OpenWeather API

**Infrastructure:**
- GitHub Pages (frontend)
- Google Cloud Run (proxy)
- Google App Engine (PersonalAI)
- GCP Secret Manager
- GitHub Actions (CI/CD)
