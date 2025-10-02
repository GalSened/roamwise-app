# RoamWise - Key Features & Functionality

## App Overview
RoamWise is an AI-powered travel planner Progressive Web App that provides personalized recommendations and trip planning.

## 5 Core Pages

### 1. 🔍 Search Page (Default View)
**File:** app-main.js lines 115-169

**Elements:**
- Search input field (`#freeText`)
- Search button (`#searchBtn`)
- 4 Category quick buttons (`.category-btn`):
  1. Food
  2. Attractions  
  3. Hotels
  4. Events

**Flow:**
1. User types query OR clicks category
2. Click search → calls backend API
3. Loading indicator shows
4. Results display in `#list` container
5. AI personalized notes included

**Backend Call:**
```javascript
POST /api/intelligence/search
{
  query: string,
  location: string,
  preferences: {...}
}
```

### 2. 🤖 AI Page
**File:** app-main.js lines 327-540

**Elements:**
- Voice button (`#voiceBtn`) - Press & hold to record
- 4 Quick action buttons (`.action-btn`):
  1. Find Food → navigates to Search with "restaurants"
  2. Check Weather → navigates to Map
  3. Get Directions → navigates to Map
  4. Plan Trip → navigates to Trip page

**Voice Recognition:**
- Uses Web Speech API (SpeechRecognition)
- Supports 10+ voice commands
- Real-time speech-to-text transcription
- Commands:
  - "Search for [query]" / "Find [query]"
  - "Food" / "Restaurant" / "Eat"
  - "Map" / "Navigation" / "Location"
  - "Plan trip" / "Generate trip"
  - "Profile" / "Settings"
  - Any unrecognized → treated as search query

**Browser Support:**
- ✅ Chrome/Edge - Full support
- ✅ Safari - Full support
- ❌ Firefox - Not supported (Web Speech API limitation)

**Error Handling:**
- No speech detected
- Microphone not found
- Permission denied
- Network errors
- Unsupported browser

### 3. 🗺️ Trip Page
**File:** app-main.js lines 211-306

**Elements:**
- 3 Duration buttons (`.duration-btn`):
  1. Half day
  2. Full day
  3. Multi-day
- 6 Interest buttons (`.interest-btn`):
  1. Food
  2. Culture
  3. Nature
  4. Adventure
  5. Relaxation
  6. Shopping
- Budget slider (`#budgetRange`) - $50-$1000
- Generate button (`#generateTripBtn`)

**Validation:**
- **REQUIRED:** At least 1 interest must be selected
- Maximum 4 interests allowed
- Friendly error message if validation fails

**User Flow:**
1. Select duration (optional, defaults to Full day)
2. Select 1-4 interests (REQUIRED)
3. Adjust budget (optional, defaults to $300)
4. Click Generate Smart Trip
5. AI generates personalized itinerary
6. Results display with confidence score + insights

**Backend Call:**
```javascript
POST /api/ai/recommend
{
  preferences: {
    duration: string,
    interests: string[],
    budget: number
  },
  context: {
    userId: string,
    location: string
  }
}
```

**Response:**
- Raw AI itinerary
- Confidence score
- Personalized insights
- Learning notes

### 4. 🗺️ Map Page
**File:** app-main.js lines 404-468

**Elements:**
- Map container (`#map`) - Leaflet.js
- Location button (`#locationBtn`)
- Zoom controls (+/-)
- User marker
- Interactive pan/drag

**Map Details:**
- Library: Leaflet 1.9.4
- Tiles: OpenStreetMap
- Default location: Tel Aviv [32.0853, 34.7818]
- Default zoom: 13 (city view)

**Location Button Flow:**
1. Click location button
2. Request geolocation permission
3. On grant → center map on user's actual location
4. On deny → show error message
5. Update user marker

**Functionality:**
- ✅ Pan/drag map
- ✅ Zoom in/out
- ✅ Click markers for popups
- ✅ Geolocation API
- ✅ Real-time position updates

### 5. ⚙️ Profile Page
**File:** app-main.js lines 306-326

**Settings:**
1. Voice Guidance toggle (`#voiceEnabled`)
2. Weather-Aware Routing toggle (`#weatherEnabled`)

**Functionality:**
- Checkboxes toggle on/off
- State persists during session (localStorage)
- Visual feedback on toggle
- Settings affect app behavior

## Navigation System
**File:** app-main.js lines 560-586

**5 Navigation Buttons:**
- 🔍 Search (active by default)
- 🤖 AI
- 🗺️ Trip
- 📍 Map
- ⚙️ Profile

**Navigation Flow:**
1. Click nav button
2. Hide previous view (display: none)
3. Show new view (display: block)
4. Update active button class
5. Smooth fade-in animation

**Implementation:**
- No external router library
- DOM-based state management
- `.active` class for highlighting
- View switching via display property

## PWA Features

### Service Worker (sw.js)
**Current Version:** v19

**Caching Strategy:**
- Cache-first for static assets
- Network-first for API calls
- Offline fallback page

**Cached Assets:**
- HTML, CSS, JavaScript
- Leaflet library & tiles
- Icons & images
- Fonts (Google Fonts - Inter)

### Manifest (manifest.webmanifest)
- App name: RoamWise
- Short name: RoamWise
- Theme color: #4F46E5 (indigo)
- Background: #FFFFFF
- Display: standalone
- Icons: Multiple sizes for iOS/Android

### Installability
- ✅ iOS: Add to Home Screen
- ✅ Android: Install prompt
- ✅ Desktop: Chrome install button
- Standalone app experience

## AI & Intelligence Features

### Personal AI System
**Model:** OpenAI o3-mini

**Capabilities:**
1. **Preference Learning** - Tracks user choices over time
2. **Context Awareness** - Weather, time, location-based
3. **Natural Language** - Understands conversational queries
4. **Sentiment Analysis** - Detects user mood/intent
5. **Trip Optimization** - Multi-destination routing
6. **Personalized Notes** - Adds AI insights to results

**Learning Loop:**
```
User Input → AI Processing → Recommendation → User Feedback → Learn → Improve
```

### Voice Interface
**Technology:** Web Speech API (browser native)

**Features:**
- Press & hold to record
- Real-time transcription
- Command parsing
- Natural language understanding
- Multi-language support (configured for Hebrew + English)
- Feedback: Visual + audio cues

**Privacy:**
- Audio processed by browser's speech service (Google/Apple servers)
- No audio stored
- Transcription only sent to backend when executing search

## Data Flow

### Search Flow
```
User Input → Frontend Validation → Backend Proxy → Google Maps API → 
PersonalAI Processing → Cached Results → Frontend Display
```

### Trip Generation Flow
```
User Preferences → Frontend Validation → PersonalAI Backend → 
OpenAI o3-mini → Preference Engine → Response + Learning → Frontend Display
```

### Map Flow
```
User Location Request → Browser Geolocation API → Leaflet Map Update → 
Marker Placement → Tile Loading (OpenStreetMap)
```

## Performance Optimizations

**Frontend:**
- Vanilla JS (no framework overhead)
- Lazy loading of map tiles
- Service worker caching
- Minimal dependencies
- Code splitting (separate files)

**Backend:**
- Rate limiting (prevent abuse)
- Response caching (NodeCache, 5-10min)
- Compression (gzip)
- Connection pooling

**Network:**
- CDN for static assets (GitHub Pages)
- Cloud Run auto-scaling
- Regional deployment (us-central1)
- HTTPS everywhere
