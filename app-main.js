// Simple JavaScript implementation to ensure navigation works
console.log('Simple app starting...');

// Import API client (feature-flagged offline caching)
import { apiRoute, apiWeather, apiPlan, apiHazards, apiGetProfile, apiUpdateProfile, apiSigninStart, apiSigninFinish, apiMe } from './src/lib/api.js';
import { saveItinerary, loadItinerary } from './src/lib/itinerary.js';
import { idbSetLastRoute, idbGetLastRoute } from './src/lib/idb.js';
import { mountUpdateBanner } from './src/lib/update-banner.js';
import { mountDevDrawer } from './src/lib/dev-drawer.js';
import { flags } from './src/lib/flags.js';
import { startCopilotContext, getCopilotEngine } from './src/copilot/bootstrap.js';
import { CarModeOverlay } from './src/copilot/car-mode-overlay.js';
import { sugStream } from './src/copilot/sug-stream.js';
import { ResultsDrawer } from './src/copilot/results-drawer.js';
import { onNavigate } from './src/copilot/nav-bus.js';
import { registerMap, focus, drawRoute, clearRoute, displayHazards, clearHazards } from './src/map/map-adapter.js';
import { computeTempRoute } from './src/routes/route-exec.js';
import { fmtDistance as fmtDistanceOld, fmtDuration as fmtDurationOld } from './src/lib/format.js';
import { fmtDistance, fmtDuration } from './src/lib/fmt-i18n.js';
import { i18nInit, i18nSet, t, getLang } from './src/lib/i18n.js';
import { googleMapsUrl, appleMapsUrl, wazeUrl } from './src/lib/navlinks.js';
import { createDevLogin } from './src/components/DevLogin.js';
import { getProfile } from './src/lib/api-auth.js';
import { setPrefs, clearPrefs } from './src/copilot/prefs-stream.js';

class SimpleNavigation {
  constructor() {
    this.currentView = 'search';
    this.init();
  }

  async init() {
    console.log('Initializing navigation...');

    // Initialize i18n system
    await i18nInit('he');

    // Wire language toggle buttons
    document.getElementById('btn-lang-he')?.addEventListener('click', () => i18nSet('he'));
    document.getElementById('btn-lang-en')?.addEventListener('click', () => i18nSet('en'));

    // React to language changes
    window.addEventListener('i18n:changed', () => this.refreshStaticTexts());
    this.refreshStaticTexts();

    this.setupDevLogin(); // Mount DevLogin component and handle auth events
    this.setupWhoAmI(); // Fetch and display user profile in header pill
    this.setupOfflineDetection(); // Wire offline banner and behavior
    this.ensureSignedIn(); // Family Mode signin check
    this.setupNavigation();
    this.setupThemeToggle();
    this.setupFormInteractions(); // Add this to ensure search works
    this.setupRouting(); // Wire routing API client
    this.setupWeather(); // Wire weather API client
    this.setupItinerary(); // Wire itinerary save/load
    this.setupMap(); // Initialize map
    this.setupProfilePrefs(); // Wire profile preferences save handler
    startCopilotContext(); // Wire context engine (flag-gated)
    this.setupCarModeOverlay(); // Wire Car-Mode overlay (flag-gated)
    this.setupResultsDrawer(); // Wire results drawer (flag-gated)
    this.setupNavigateHandler(); // Wire navigate event handler
    this.showView('search');
  }

  refreshStaticTexts() {
    // Update header
    const headerTitle = document.querySelector('.header-title');
    if (headerTitle) headerTitle.textContent = t('app.title');

    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.textContent = t('common.install');

    // Update bottom navigation
    const navButtons = [
      { view: 'search', key: 'nav.search' },
      { view: 'trip', key: 'nav.trip' },
      { view: 'ai', key: 'nav.ai' },
      { view: 'map', key: 'nav.map' },
      { view: 'profile', key: 'nav.profile' }
    ];

    navButtons.forEach(({ view, key }) => {
      const btn = document.querySelector(`.nav-btn[data-view="${view}"] .nav-label`);
      if (btn) btn.textContent = t(key);
    });

    // Update offline banner
    const offlineBanner = document.getElementById('offline-banner');
    if (offlineBanner) offlineBanner.textContent = t('offline.banner');

    // Activate current language button
    const btnHe = document.getElementById('btn-lang-he');
    const btnEn = document.getElementById('btn-lang-en');
    const currentLang = getLang();
    if (btnHe && btnEn) {
      btnHe.classList.toggle('active', currentLang === 'he');
      btnEn.classList.toggle('active', currentLang === 'en');
    }

    console.log('[i18n] Static texts refreshed');
  }

  setupDevLogin() {
    console.log('[DevLogin] Mounting login component...');

    try {
      // Create and mount DevLogin component
      const loginComponent = createDevLogin();
      document.body.appendChild(loginComponent);

      // Handle login event: load profile and set preferences
      window.addEventListener('userLoggedIn', async (event) => {
        const user = event.detail;
        console.log('[DevLogin] User logged in:', user);

        try {
          // Fetch user profile from backend
          const profileData = await getProfile();
          console.log('[DevLogin] Profile loaded:', profileData);

          // Set preferences in prefs-stream (context engine will pick it up)
          if (profileData.preferences) {
            setPrefs(profileData.preferences);
            console.log('[DevLogin] Preferences set:', profileData.preferences);
          }
        } catch (error) {
          console.error('[DevLogin] Failed to load profile:', error);
        }
      });

      // Handle logout event: clear preferences
      window.addEventListener('userLoggedOut', () => {
        console.log('[DevLogin] User logged out');
        clearPrefs();
      });

      console.log('[DevLogin] Login component mounted');
    } catch (error) {
      console.error('[DevLogin] Failed to setup login component:', error);
    }
  }

  async setupWhoAmI() {
    console.log('[WhoAmI] Fetching user profile...');
    try {
      const profile = await apiGetProfile();
      const el = document.getElementById('whoami');
      if (el) {
        const tenant = profile.user?.tenant || 'home';
        const username = profile.user?.username || 'me';
        el.textContent = `${tenant}:${username}`;
        console.log('[WhoAmI] Profile loaded:', `${tenant}:${username}`);
      }
      // Store profile globally for planner/suggestions
      window.__rwProfile = profile;
    } catch (error) {
      console.warn('[WhoAmI] Failed to load profile (guest mode):', error);
      const el = document.getElementById('whoami');
      if (el) {
        el.textContent = 'guest';
      }
      window.__rwProfile = null;
    }
  }

  setupProfilePrefs() {
    console.log('[ProfilePrefs] Setting up profile preferences handler...');

    // Load and populate profile form when profile view is shown
    const loadProfileForm = async () => {
      try {
        const profile = window.__rwProfile || await apiGetProfile();
        const prefs = profile?.preferences || {};

        // Populate pace
        const paceEl = document.getElementById('prefPace');
        if (paceEl && prefs.pace) {
          paceEl.value = prefs.pace;
        }

        // Populate likes checkboxes
        const likesChecks = document.querySelectorAll('input[name="likes"]');
        const likesArray = prefs.likes || [];
        likesChecks.forEach((cb) => {
          cb.checked = likesArray.includes(cb.value);
        });

        // Populate avoid checkboxes
        const avoidChecks = document.querySelectorAll('input[name="avoid"]');
        const avoidArray = prefs.avoid || [];
        avoidChecks.forEach((cb) => {
          cb.checked = avoidArray.includes(cb.value);
        });

        // Populate dietary checkboxes
        const dietChecks = document.querySelectorAll('input[name="dietary"]');
        const dietArray = prefs.dietary || [];
        dietChecks.forEach((cb) => {
          cb.checked = dietArray.includes(cb.value);
        });

        // Populate budget
        const budgetMinEl = document.getElementById('prefBudgetMin');
        const budgetMaxEl = document.getElementById('prefBudgetMax');
        if (budgetMinEl && prefs.budget_min !== undefined) {
          budgetMinEl.value = prefs.budget_min;
        }
        if (budgetMaxEl && prefs.budget_max !== undefined) {
          budgetMaxEl.value = prefs.budget_max;
        }

        console.log('[ProfilePrefs] Form populated with:', prefs);
      } catch (error) {
        console.warn('[ProfilePrefs] Failed to load profile for form:', error);
      }
    };

    // Listen for profile view activation
    const navButtons = document.querySelectorAll('.nav-btn[data-view="profile"]');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', loadProfileForm);
    });

    // Save button handler
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        console.log('[ProfilePrefs] Saving preferences...');
        try {
          // Collect form values
          const pace = document.getElementById('prefPace')?.value || 'normal';

          const likes = Array.from(document.querySelectorAll('input[name="likes"]:checked'))
            .map((cb) => cb.value);

          const avoid = Array.from(document.querySelectorAll('input[name="avoid"]:checked'))
            .map((cb) => cb.value);

          const dietary = Array.from(document.querySelectorAll('input[name="dietary"]:checked'))
            .map((cb) => cb.value);

          const budget_min = Number(document.getElementById('prefBudgetMin')?.value) || 0;
          const budget_max = Number(document.getElementById('prefBudgetMax')?.value) || 1000;

          const prefs = { pace, likes, avoid, dietary, budget_min, budget_max };

          // Save to backend
          await apiUpdateProfile(prefs);
          console.log('[ProfilePrefs] Preferences saved:', prefs);

          // Refresh whoami pill
          await this.setupWhoAmI();

          // Show success feedback
          saveBtn.textContent = '✓ Saved!';
          setTimeout(() => {
            saveBtn.textContent = 'Save Preferences';
          }, 2000);
        } catch (error) {
          console.error('[ProfilePrefs] Failed to save preferences:', error);
          saveBtn.textContent = '✗ Error';
          setTimeout(() => {
            saveBtn.textContent = 'Save Preferences';
          }, 2000);
        }
      });
    }
  }

  setupOfflineDetection() {
    console.log('[Offline] Setting up offline detection...');

    const banner = document.getElementById('offline-banner');
    const hazardsToggle = document.getElementById('hazards-toggle');

    // Helper to update UI based on online/offline status
    const setOfflineUI = (isOffline) => {
      console.log('[Offline] Status changed, offline:', isOffline);

      // Toggle banner visibility
      if (banner) {
        if (isOffline) {
          banner.removeAttribute('hidden');
        } else {
          banner.setAttribute('hidden', '');
        }
      }

      // Disable hazards controls when offline
      if (hazardsToggle) {
        hazardsToggle.disabled = isOffline;
        if (isOffline) {
          hazardsToggle.title = 'Hazards unavailable offline';
        } else {
          hazardsToggle.title = 'Toggle hazards';
        }
      }
    };

    // Listen to online/offline events
    window.addEventListener('online', () => setOfflineUI(false));
    window.addEventListener('offline', () => setOfflineUI(true));

    // Set initial state
    setOfflineUI(!navigator.onLine);
  }

  // ---- Family Mode Signin (Step 34) ----

  async ensureSignedIn() {
    console.log('[FamilyAuth] Checking signin status...');

    // Check if already signed in
    try {
      const meResp = await apiMe();
      if (meResp.ok && meResp.session) {
        console.log('[FamilyAuth] Already signed in:', meResp.session);
        this.currentSession = meResp.session;
        return; // User is signed in, no need to show modal
      }
    } catch (error) {
      console.log('[FamilyAuth] Not signed in, showing modal');
    }

    // Show modal
    this.showSigninModal();
  }

  showSigninModal() {
    const modal = document.getElementById('signin-modal');
    const form = document.getElementById('signin-form');
    const phoneInput = document.getElementById('signin-phone');
    const nameContainer = document.getElementById('name-field-container');
    const nameInput = document.getElementById('signin-name');
    const submitBtn = document.getElementById('signin-submit');
    const messageDiv = document.getElementById('signin-message');

    if (!modal || !form) {
      console.error('[FamilyAuth] Modal elements not found');
      return;
    }

    // Reset form
    form.reset();
    nameContainer.setAttribute('hidden', '');
    messageDiv.textContent = '';
    messageDiv.className = 'signin-message';

    // Show modal
    modal.removeAttribute('hidden');

    // Track state
    let isKnownUser = false;

    // Handle form submission
    const handleSubmit = async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      messageDiv.textContent = '';

      const phone = phoneInput.value.trim();

      try {
        if (!isKnownUser) {
          // Step 1: Check if phone is known
          const startResp = await apiSigninStart(phone);
          
          if (startResp.ok && startResp.known) {
            // Existing user - proceed to finish
            console.log('[FamilyAuth] Known user:', startResp.name);
            messageDiv.textContent = `ברוך שובך, ${startResp.name}!`;
            messageDiv.className = 'signin-message success';
            
            const finishResp = await apiSigninFinish(phone, startResp.name);
            if (finishResp.ok) {
              await this.afterSignin(finishResp.user_id);
              modal.setAttribute('hidden', '');
            }
          } else if (startResp.ok && !startResp.known) {
            // New user - show name field
            console.log('[FamilyAuth] New user, requesting name');
            nameContainer.removeAttribute('hidden');
            nameInput.required = true;
            nameInput.focus();
            submitBtn.textContent = 'סיים';
            messageDiv.textContent = 'מספר חדש! הכנס את שמך';
            messageDiv.className = 'signin-message';
            isKnownUser = false;
          }
        } else {
          // Step 2: Finish with name (new user)
          const name = nameInput.value.trim();
          if (!name) {
            messageDiv.textContent = 'נא להזין שם';
            messageDiv.className = 'signin-message error';
            submitBtn.disabled = false;
            return;
          }

          const finishResp = await apiSigninFinish(phone, name);
          if (finishResp.ok) {
            messageDiv.textContent = `ברוך הבא, ${name}!`;
            messageDiv.className = 'signin-message success';
            await this.afterSignin(finishResp.user_id);
            modal.setAttribute('hidden', '');
          }
        }

        // After successful start (new user), mark for second submit
        if (!isKnownUser && nameContainer.hasAttribute('hidden') === false) {
          isKnownUser = true;
        }

      } catch (error) {
        console.error('[FamilyAuth] Signin error:', error);
        messageDiv.textContent = 'שגיאה בהתחברות. נסה שוב';
        messageDiv.className = 'signin-message error';
      } finally {
        submitBtn.disabled = false;
      }
    };

    // Attach event listener
    form.removeEventListener('submit', handleSubmit); // Remove old listener if any
    form.addEventListener('submit', handleSubmit);
  }

  async afterSignin(userId) {
    console.log('[FamilyAuth] Signin successful, userId:', userId);
    
    // Try to fetch and update profile
    try {
      const profile = await apiGetProfile();
      if (profile && profile.user) {
        console.log('[FamilyAuth] Profile fetched:', profile.user);
        // Update UI with user info if needed
      }
    } catch (error) {
      console.warn('[FamilyAuth] Could not fetch profile:', error);
    }
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.app-view');

    console.log('Found nav buttons:', navButtons.length);
    console.log('Found views:', views.length);

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetView = button.getAttribute('data-view');
        console.log('Navigation clicked:', targetView);
        this.showView(targetView);
      });
    });
  }

  showView(viewName) {
    console.log('Showing view:', viewName);

    // Hide all views
    const views = document.querySelectorAll('.app-view');
    views.forEach((view) => {
      view.classList.remove('active');
    });

    // Show target view
    const targetView = document.querySelector(`[data-view="${viewName}"]`);
    if (targetView) {
      targetView.classList.add('active');
      console.log('View activated:', viewName);
    } else {
      console.error('View not found:', viewName);
    }

    // Update navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach((button) => {
      button.classList.remove('active');
      if (button.getAttribute('data-view') === viewName) {
        button.classList.add('active');
      }
    });

    this.currentView = viewName;
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('app-theme', newTheme);
        console.log('Theme changed to:', newTheme);
      });
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  setupFormInteractions() {
    console.log('Setting up form interactions...');

    // Budget slider
    const budgetSlider = document.getElementById('budgetRange');
    const budgetAmount = document.getElementById('budgetAmount');
    if (budgetSlider && budgetAmount) {
      budgetSlider.addEventListener('input', () => {
        budgetAmount.textContent = budgetSlider.value;
      });
    }

    // Duration options
    document.querySelectorAll('.duration-btn').forEach((option) => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.duration-btn').forEach((o) => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    // Interest options
    document.querySelectorAll('.interest-btn').forEach((option) => {
      option.addEventListener('click', () => {
        const selected = document.querySelectorAll('.interest-btn.selected');
        if (option.classList.contains('selected')) {
          option.classList.remove('selected');
        } else if (selected.length < 4) {
          option.classList.add('selected');
        } else {
          alert('Maximum 4 interests allowed');
        }
      });
    });

    this.setupSearch();
    this.setupTripGeneration();
    this.setupVoiceButton();
    this.setupQuickActions();
  }

  setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('freeText');
    console.log('Setting up search - Button:', !!searchBtn, 'Input:', !!searchInput);

    // Category buttons
    document.querySelectorAll('.category-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Toggle selected state
        document.querySelectorAll('.category-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Get category and search
        const category = btn.getAttribute('data-category');
        const categoryText = btn.textContent.trim();
        searchInput.value = categoryText;
        searchBtn.click();
      });
    });

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (query) {
          console.log('Searching with Personal AI for:', query);
          searchBtn.textContent = 'AI Searching...';
          searchBtn.disabled = true;

          try {
            // Use Personal AI for intelligent search
            const response = await fetch(
              'https://premium-hybrid-473405-g7.uc.r.appspot.com/api/intelligence/search',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: query,
                  location: 'Current Location',
                  preferences: {
                    budgetCategory: 'mid_range',
                    destinationTypes: ['urban', 'cultural'],
                    activityPreferences: ['food', 'sightseeing'],
                  },
                }),
              }
            );

            const data = await response.json();
            const resultsList = document.getElementById('list');
            resultsList.style.display = 'block'; // Show results

            if (data.results && data.results.length > 0) {
              resultsList.innerHTML = data.results
                .map(
                  (result) => `
                <div class="search-result ai-powered">
                  <h3>🤖 ${result.name}</h3>
                  <p>${result.description}</p>
                  <div class="result-rating">⭐ ${result.rating?.toFixed(1) || 'N/A'} • AI Score: ${result.personalizedScore?.toFixed(1) || 'N/A'}</div>
                  <div class="ai-reason">${result.personalizedReason}</div>
                  <div class="ai-tags">${result.personalizedTags?.join(', ') || ''}</div>
                </div>
              `
                )
                .join('');
            } else {
              resultsList.innerHTML = `
                <div class="search-result">
                  <h3>🧠 AI Analysis for "${query}"</h3>
                  <p>Your Personal AI processed this search. Results: ${data.personalizedNote || 'No specific results found'}</p>
                  <div class="result-rating">🤖 Powered by o3-mini</div>
                </div>
              `;
            }
          } catch (error) {
            console.error('AI Search error:', error);
            const resultsList = document.getElementById('list');
            resultsList.style.display = 'block'; // Show results even on error
            resultsList.innerHTML = `
              <div class="search-result">
                <h3>🔄 AI Learning Mode</h3>
                <p>Your Personal AI is initializing. This powerful backend with o3-mini reasoning will provide amazing results soon!</p>
                <div class="result-rating">🧠 Personal AI Backend Active</div>
              </div>
            `;
          }

          searchBtn.textContent = 'Search';
          searchBtn.disabled = false;
        }
      });
    } else {
      console.error('Search elements not found - Button:', !!searchBtn, 'Input:', !!searchInput);
    }
  }

  setupTripGeneration() {
    const generateBtn = document.getElementById('generateTripBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        console.log('Generating AI-powered trip...');

        // Collect user preferences
        const selectedDuration =
          document.querySelector('.duration-btn.selected')?.textContent || 'Full day';
        const selectedInterests = Array.from(
          document.querySelectorAll('.interest-btn.selected')
        ).map((el) => el.textContent);
        const budget = document.getElementById('budgetAmount')?.textContent || '300';

        // Validate that at least one interest is selected
        const tripDisplay = document.getElementById('enhancedTripDisplay');
        if (selectedInterests.length === 0) {
          tripDisplay.innerHTML = `
            <div class="trip-result" style="background: var(--warning-bg, #fff3cd); border-left: 4px solid var(--warning, #ffc107); padding: 20px; border-radius: 8px;">
              <h3>📝 Please Select Your Interests</h3>
              <p>Choose at least one interest from the options above to generate a personalized trip!</p>
              <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">💡 Tip: You can select up to 4 interests for the best recommendations.</p>
            </div>
          `;
          return;
        }

        generateBtn.textContent = '🧠 AI Thinking...';
        generateBtn.disabled = true;

        try {
          // Collect location for stub call
          let startLocation = {
            lat: 32.0853, // Default: Tel Aviv
            lng: 34.7818,
            name: 'Tel Aviv',
          };

          // Try to get actual current location
          if (navigator.geolocation) {
            try {
              const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
              });
              startLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                name: 'Current Location',
              };
            } catch (geoError) {
              console.log('[planner] Using default location (geolocation failed)');
            }
          }

          if (flags.plannerStub) {
            // ---- NEW (flagged) path: use orchestrator stub ----
            console.info('[planner] calling /api/plan (stub) due to plannerStub flag');

            // Read profile preferences from global state
            const profilePrefs = window.__rwProfile?.preferences || {};

            const planInputs = {
              preferences: {
                interests: selectedInterests,
                duration: selectedDuration,
                budget: parseInt(budget),
                // Include profile preferences
                pace: profilePrefs.pace || 'normal',
                likes: profilePrefs.likes || [],
                dietary: profilePrefs.dietary || [],
              },
              startLocation,
            };

            const response = await apiPlan(planInputs);
            const { itinerary, rationales, citations } = response;

            // Map stub response to existing display format
            tripDisplay.innerHTML = `
              <div class="trip-result ai-powered">
                <h3>🧠 Your AI Generated Trip! (Stub Mode)</h3>
                <div class="trip-summary">
                  <div class="trip-stat">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${selectedDuration}</span>
                  </div>
                  <div class="trip-stat">
                    <span class="stat-label">Budget:</span>
                    <span class="stat-value">$${budget}</span>
                  </div>
                  <div class="trip-stat">
                    <span class="stat-label">Mode:</span>
                    <span class="stat-value">Stub</span>
                  </div>
                </div>
                <div class="trip-content">
                  <h4>📍 ${itinerary.title}</h4>
                  ${
                    itinerary.days
                      ?.map(
                        (day) => `
                    <div style="margin: 15px 0;">
                      <strong>Day ${day.date}:</strong>
                      <ul style="margin-left: 20px;">
                        ${day.activities
                          ?.map(
                            (a) => `
                          <li>${a.time} - ${a.place} (${a.duration}min) - ${a.notes}</li>
                        `
                          )
                          .join('')}
                      </ul>
                    </div>
                  `
                      )
                      .join('') || ''
                  }
                  ${
                    rationales?.length
                      ? `
                    <div style="margin-top: 20px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                      <strong>💡 Rationales:</strong>
                      <ul>${rationales.map((r) => `<li>${r}</li>`).join('')}</ul>
                    </div>
                  `
                      : ''
                  }
                  ${
                    citations?.length
                      ? `
                    <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
                      <strong>📚 Sources:</strong> ${citations.length} provider citations
                    </div>
                  `
                      : ''
                  }
                </div>
                <p style="margin-top: 15px; padding: 10px; background: rgba(59, 130, 246, 0.2); border-radius: 8px;">
                  <strong>🧪 Stub Mode Active</strong> - Using mock data from /api/plan endpoint.
                  Disable <code>plannerStub</code> flag to use production AI.
                </p>
              </div>
            `;
          } else {
            // ---- LEGACY path: keep your current v1 logic exactly as-is ----
            // Call Personal AI for recommendations
            const response = await fetch(
              'https://premium-hybrid-473405-g7.uc.r.appspot.com/api/ai/recommend',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  preferences: {
                    duration: selectedDuration,
                    interests: selectedInterests,
                    budget: parseInt(budget),
                    destinationType: 'mixed',
                    activities: selectedInterests,
                  },
                  context: {
                    userId: 'personal',
                    location: 'Current Location',
                    requestType: 'trip_planning',
                  },
                }),
              }
            );

            const data = await response.json();

            if (data.recommendations) {
              tripDisplay.innerHTML = `
              <div class="trip-result ai-powered">
                <h3>🧠 Your o3-mini AI Generated Trip!</h3>
                <div class="trip-summary">
                  <div class="trip-stat">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${selectedDuration}</span>
                  </div>
                  <div class="trip-stat">
                    <span class="stat-label">Budget:</span>
                    <span class="stat-value">$${budget}</span>
                  </div>
                  <div class="trip-stat">
                    <span class="stat-label">AI Confidence:</span>
                    <span class="stat-value">${data.confidence || 85}%</span>
                  </div>
                </div>
                <div class="ai-insight">
                  <strong>Personal Insight:</strong> ${data.personalizedInsight || 'Your AI is learning your preferences!'}
                </div>
                <div class="learning-note">
                  <strong>Learning:</strong> ${data.learningNote || 'Each interaction makes your AI smarter!'}
                </div>
                <div class="trip-content">
                  <strong>AI Recommendations:</strong>
                  <pre style="white-space: pre-wrap; font-family: inherit;">${data.recommendations.rawResponse || 'AI-powered recommendations generated!'}</pre>
                </div>
                <p><strong>🤖 Powered by o3-mini reasoning</strong> - Your Personal AI is analyzing your preferences and creating the perfect trip just for you!</p>
              </div>
            `;
            } else {
              throw new Error('No recommendations received');
            }
          }
        } catch (error) {
          console.error('AI Trip generation error:', error);
          tripDisplay.innerHTML = `
            <div class="trip-result ai-learning">
              <h3>🧠 AI Learning Your Preferences</h3>
              <div class="trip-summary">
                <div class="trip-stat">
                  <span class="stat-label">Duration:</span>
                  <span class="stat-value">${document.querySelector('.duration-btn.selected')?.textContent || 'Full day'}</span>
                </div>
                <div class="trip-stat">
                  <span class="stat-label">Budget:</span>
                  <span class="stat-value">$${document.getElementById('budgetAmount')?.textContent || '300'}</span>
                </div>
                <div class="trip-stat">
                  <span class="stat-label">AI Status:</span>
                  <span class="stat-value">Learning Mode</span>
                </div>
              </div>
              <p><strong>🚀 Your Personal AI (o3-mini) is initializing!</strong> Your travel intelligence system is setting up and will provide amazing personalized recommendations soon. Each interaction helps it learn your unique travel style!</p>
            </div>
          `;
        }

        generateBtn.textContent = '🤖 Generate Smart Trip';
        generateBtn.disabled = false;
      });
    }
  }

  setupRouting() {
    const getRouteBtn = document.getElementById('getRouteBtn');
    const routeOrigin = document.getElementById('routeOrigin');
    const routeDestination = document.getElementById('routeDestination');
    const routeResults = document.getElementById('routeResults');

    if (!getRouteBtn || !routeOrigin || !routeDestination || !routeResults) {
      console.log('Route UI elements not found, skipping routing setup');
      return;
    }

    getRouteBtn.addEventListener('click', async () => {
      const origin = routeOrigin.value.trim();
      const destination = routeDestination.value.trim();

      if (!origin || !destination) {
        routeResults.innerHTML = `
          <div class="result-card" style="background: var(--warning-bg, #fff3cd); border-left: 4px solid var(--warning, #ffc107);">
            <p>⚠️ Please enter both origin and destination</p>
          </div>
        `;
        return;
      }

      console.log('Getting route from', origin, 'to', destination);
      getRouteBtn.textContent = '🔄 Finding Route...';
      getRouteBtn.disabled = true;

      try {
        // Use apiRoute() which is feature-flagged for offline caching
        const routeData = await apiRoute({
          origin: origin,
          destination: destination,
          mode: 'driving',
        });

        console.log('Route data:', routeData);

        // Save route to IDB for offline recall
        try {
          await idbSetLastRoute({
            ts: Date.now(),
            distance_m: routeData.distance_m || 0,
            duration_s: routeData.duration_s || 0,
            geometry: routeData.geometry || null,
          });
          console.log('[Offline] Last route saved to IDB');
        } catch (idbError) {
          console.warn('[Offline] Failed to save last route:', idbError);
        }

        // Display route results
        routeResults.innerHTML = `
          <div class="result-card" style="background: var(--bg-glass); border-left: 4px solid var(--primary);">
            <h4>🗺️ Route Found!</h4>
            <p><strong>From:</strong> ${origin}</p>
            <p><strong>To:</strong> ${destination}</p>
            <p><strong>Distance:</strong> ${routeData.distance || 'N/A'}</p>
            <p><strong>Duration:</strong> ${routeData.duration || 'N/A'}</p>
            ${routeData.offline ? '<p style="font-size: 0.9em; opacity: 0.7;">📦 Served from offline cache</p>' : ''}
          </div>
        `;
      } catch (error) {
        console.error('Routing error:', error);
        routeResults.innerHTML = `
          <div class="result-card" style="background: #ffebee; border-left: 4px solid #f44336;">
            <h4>❌ Route Not Available</h4>
            <p>Could not calculate route at this time. This feature requires a backend routing API.</p>
            <p style="font-size: 0.9em; margin-top: 10px;">💡 Demo: The API client is working, but the backend <code>/api/route</code> endpoint needs to be implemented.</p>
          </div>
        `;
      }

      getRouteBtn.textContent = '🗺️ Get Route';
      getRouteBtn.disabled = false;
    });
  }

  setupVoiceButton() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      voiceBtn.disabled = true;
      voiceBtn.title = 'Voice recognition not supported in this browser. Try Chrome or Edge.';
      voiceBtn.querySelector('.voice-text').textContent = 'Not Supported';
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isListening = false;

    // Handle recognition results
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      console.log('Voice input:', transcript, 'Confidence:', confidence);

      const statusEl = document.getElementById('voiceStatus');
      const responseEl = document.getElementById('voiceResponse');

      if (statusEl) {
        statusEl.textContent = '🤖 Processing your command...';
      }

      // Process the voice command
      this.processVoiceCommand(transcript);

      setTimeout(() => {
        if (statusEl) statusEl.textContent = '';
        if (responseEl) {
          responseEl.textContent = `✅ Heard: "${transcript}"`;
          responseEl.style.display = 'block';
        }
      }, 500);
    };

    // Handle recognition errors
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      isListening = false;
      voiceBtn.classList.remove('listening');
      voiceBtn.querySelector('.voice-text').textContent = 'Press & Hold to Speak';

      const statusEl = document.getElementById('voiceStatus');
      const responseEl = document.getElementById('voiceResponse');

      let errorMessage = '';
      switch (event.error) {
        case 'no-speech':
          errorMessage = '❌ No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = '❌ Microphone not found. Please check your device.';
          break;
        case 'not-allowed':
          errorMessage = '❌ Microphone permission denied. Please enable it in settings.';
          break;
        case 'network':
          errorMessage = '❌ Network error. Please check your connection.';
          break;
        default:
          errorMessage = `❌ Error: ${event.error}`;
      }

      if (statusEl) {
        statusEl.textContent = errorMessage;
        setTimeout(() => {
          statusEl.textContent = '';
        }, 3000);
      }
      if (responseEl) {
        responseEl.textContent = errorMessage;
        responseEl.style.display = 'block';
      }
    };

    // Handle recognition end
    recognition.onend = () => {
      isListening = false;
      voiceBtn.classList.remove('listening');
      voiceBtn.querySelector('.voice-text').textContent = 'Press & Hold to Speak';
    };

    // Mouse down - start listening
    voiceBtn.addEventListener('mousedown', () => {
      if (!isListening) {
        try {
          recognition.start();
          isListening = true;
          voiceBtn.classList.add('listening');
          voiceBtn.querySelector('.voice-text').textContent = 'Listening... Release to stop';

          const statusEl = document.getElementById('voiceStatus');
          if (statusEl) {
            statusEl.textContent = '🎤 Listening for your voice command...';
          }

          const responseEl = document.getElementById('voiceResponse');
          if (responseEl) {
            responseEl.style.display = 'none';
          }
        } catch (error) {
          console.error('Recognition start error:', error);
        }
      }
    });

    // Mouse up - stop listening
    voiceBtn.addEventListener('mouseup', () => {
      if (isListening) {
        recognition.stop();
      }
    });

    // Mouse leave - stop listening if active
    voiceBtn.addEventListener('mouseleave', () => {
      if (isListening) {
        recognition.stop();
      }
    });
  }

  processVoiceCommand(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    console.log('Processing command:', lowerTranscript);

    // Parse voice commands and execute actions
    if (
      lowerTranscript.includes('search for') ||
      lowerTranscript.includes('find') ||
      lowerTranscript.includes('look for')
    ) {
      // Extract search query
      let query = lowerTranscript
        .replace('search for', '')
        .replace('find', '')
        .replace('look for', '')
        .replace('me', '')
        .trim();

      if (query) {
        this.showView('search');
        setTimeout(() => {
          const searchInput = document.getElementById('freeText');
          const searchBtn = document.getElementById('searchBtn');
          if (searchInput && searchBtn) {
            searchInput.value = query;
            searchBtn.click();
          }
        }, 300);
      }
    } else if (
      lowerTranscript.includes('food') ||
      lowerTranscript.includes('restaurant') ||
      lowerTranscript.includes('eat')
    ) {
      this.showView('search');
      setTimeout(() => {
        const searchInput = document.getElementById('freeText');
        const searchBtn = document.getElementById('searchBtn');
        if (searchInput && searchBtn) {
          searchInput.value = 'restaurants';
          searchBtn.click();
        }
      }, 300);
    } else if (
      lowerTranscript.includes('plan') &&
      (lowerTranscript.includes('trip') || lowerTranscript.includes('vacation'))
    ) {
      this.showView('trip');
    } else if (lowerTranscript.includes('generate') && lowerTranscript.includes('trip')) {
      this.showView('trip');
      setTimeout(() => {
        const generateBtn = document.getElementById('generateTripBtn');
        if (generateBtn) {
          generateBtn.click();
        }
      }, 500);
    } else if (
      lowerTranscript.includes('map') ||
      lowerTranscript.includes('navigation') ||
      lowerTranscript.includes('location')
    ) {
      this.showView('map');
    } else if (lowerTranscript.includes('weather')) {
      this.showView('map');
    } else if (lowerTranscript.includes('profile') || lowerTranscript.includes('setting')) {
      this.showView('profile');
    } else if (lowerTranscript.includes('go to') || lowerTranscript.includes('open')) {
      // Try to extract page name
      if (lowerTranscript.includes('search')) {
        this.showView('search');
      } else if (lowerTranscript.includes('ai') || lowerTranscript.includes('assistant')) {
        this.showView('ai');
      } else if (lowerTranscript.includes('trip')) {
        this.showView('trip');
      } else if (lowerTranscript.includes('map')) {
        this.showView('map');
      } else if (lowerTranscript.includes('profile')) {
        this.showView('profile');
      }
    } else {
      // Default: treat as search query
      this.showView('search');
      setTimeout(() => {
        const searchInput = document.getElementById('freeText');
        const searchBtn = document.getElementById('searchBtn');
        if (searchInput && searchBtn) {
          searchInput.value = transcript;
          searchBtn.click();
        }
      }, 300);
    }
  }

  setupQuickActions() {
    document.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');

        // Switch to appropriate view and trigger action
        switch (action) {
          case 'find-food':
            // Go to search view and search for food
            this.showView('search');
            setTimeout(() => {
              const searchInput = document.getElementById('freeText');
              const searchBtn = document.getElementById('searchBtn');
              if (searchInput && searchBtn) {
                searchInput.value = '🍽️ Food';
                searchBtn.click();
              }
            }, 100);
            break;

          case 'weather':
            // Show weather info - scroll to map view where weather is displayed
            this.showView('map');
            break;

          case 'navigate':
            // Go to map view for directions
            this.showView('map');
            break;

          case 'recommend':
            // Go to trip planning view
            this.showView('trip');
            break;
        }
      });
    });
  }

  setupWeather() {
    const weatherBtn = document.querySelector('.action-btn[data-action="weather"]');

    if (!weatherBtn) {
      console.log('Weather button not found, skipping weather setup');
      return;
    }

    weatherBtn.addEventListener('click', async () => {
      console.log('Weather button clicked');

      // Get current location
      if (!navigator.geolocation) {
        alert('⚠️ Geolocation is not supported by your browser');
        return;
      }

      weatherBtn.textContent = '🔄 Getting Weather...';
      weatherBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const ts = Math.floor(Date.now() / 1000); // current timestamp

          console.log(`Getting weather for lat=${lat}, lon=${lon}, ts=${ts}`);

          try {
            // Use apiWeather() which is feature-flagged for offline caching
            const weatherData = await apiWeather({ lat, lon, ts });

            console.log('Weather data:', weatherData);

            // Display weather results (simple alert for now - can be enhanced with UI)
            const temp = weatherData.temp || 'N/A';
            const desc = weatherData.description || 'No description';
            const humidity = weatherData.humidity || 'N/A';

            alert(`⛅ Current Weather\n\n🌡️ Temperature: ${temp}°C\n☁️ ${desc}\n💧 Humidity: ${humidity}%`);

            weatherBtn.textContent = '⛅ Weather';
            weatherBtn.disabled = false;
          } catch (error) {
            console.error('Weather error:', error);
            alert('❌ Weather Not Available\n\nCould not fetch weather at this time. This feature requires a backend weather API.');
            weatherBtn.textContent = '⛅ Weather';
            weatherBtn.disabled = false;
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('❌ Location Error\n\nCould not get your location. Please enable location services.');
          weatherBtn.textContent = '⛅ Weather';
          weatherBtn.disabled = false;
        }
      );
    });
  }

  setupItinerary() {
    const saveBtn = document.getElementById('saveItineraryBtn');
    const loadBtn = document.getElementById('loadItineraryBtn');
    const titleInput = document.getElementById('itineraryTitle');
    const idInput = document.getElementById('itineraryId');
    const resultsDiv = document.getElementById('itineraryResults');

    if (!saveBtn || !loadBtn || !titleInput || !idInput || !resultsDiv) {
      console.log('Itinerary UI elements not found, skipping itinerary setup');
      return;
    }

    // Handle Save
    saveBtn.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      if (!title) {
        resultsDiv.innerHTML = `
          <div class="result-card" style="background: var(--warning-bg, #fff3cd); border-left: 4px solid var(--warning, #ffc107);">
            <p>⚠️ Please enter a trip title</p>
          </div>
        `;
        return;
      }

      console.log('Saving itinerary:', title);
      saveBtn.textContent = '🔄 Saving...';
      saveBtn.disabled = true;

      try {
        // Create sample itinerary data
        const itinerary = {
          id: `itin-${Date.now()}`,
          title: title,
          days: [],
          preferences: {
            duration: document.querySelector('.duration-btn.selected')?.dataset.duration || '8',
            interests: Array.from(document.querySelectorAll('.interest-btn.selected')).map(
              (btn) => btn.dataset.interest
            ),
            budget: document.getElementById('budgetRange')?.value || '300',
          },
          createdAt: new Date().toISOString(),
        };

        // Use saveItinerary() which is feature-flagged
        const saved = await saveItinerary(itinerary);

        console.log('Itinerary saved:', saved);

        resultsDiv.innerHTML = `
          <div class="result-card" style="background: var(--bg-glass); border-left: 4px solid var(--primary);">
            <h4>✅ Itinerary Saved!</h4>
            <p><strong>Title:</strong> ${saved.title}</p>
            <p><strong>ID:</strong> <code>${saved.id}</code></p>
            <p style="font-size: 0.9em; opacity: 0.7;">Copy the ID above to load this itinerary later</p>
            ${saved.offline ? '<p style="font-size: 0.9em; opacity: 0.7;">📦 Saved to offline cache</p>' : ''}
          </div>
        `;

        // Clear title, set ID for easy load test
        titleInput.value = '';
        idInput.value = saved.id;
      } catch (error) {
        console.error('Save error:', error);
        resultsDiv.innerHTML = `
          <div class="result-card" style="background: #ffebee; border-left: 4px solid #f44336;">
            <h4>❌ Save Failed</h4>
            <p>Could not save itinerary. The backend <code>/api/itinerary</code> endpoint is required.</p>
            <p style="font-size: 0.9em; margin-top: 10px;">💡 With offline flag ON, a draft was saved locally.</p>
          </div>
        `;
      }

      saveBtn.textContent = '💾 Save Itinerary';
      saveBtn.disabled = false;
    });

    // Handle Load
    loadBtn.addEventListener('click', async () => {
      const id = idInput.value.trim();
      if (!id) {
        resultsDiv.innerHTML = `
          <div class="result-card" style="background: var(--warning-bg, #fff3cd); border-left: 4px solid var(--warning, #ffc107);">
            <p>⚠️ Please enter an itinerary ID</p>
          </div>
        `;
        return;
      }

      console.log('Loading itinerary:', id);
      loadBtn.textContent = '🔄';
      loadBtn.disabled = true;

      try {
        // Use loadItinerary() which is feature-flagged
        const itin = await loadItinerary(id);

        console.log('Itinerary loaded:', itin);

        resultsDiv.innerHTML = `
          <div class="result-card" style="background: var(--bg-glass); border-left: 4px solid var(--primary);">
            <h4>📂 Itinerary Loaded!</h4>
            <p><strong>Title:</strong> ${itin.title}</p>
            <p><strong>ID:</strong> ${itin.id}</p>
            <p><strong>Created:</strong> ${new Date(itin.createdAt).toLocaleString()}</p>
            ${itin.preferences ? `<p><strong>Duration:</strong> ${itin.preferences.duration}h</p>` : ''}
            ${itin.fromDraft ? '<p style="font-size: 0.9em; opacity: 0.7;">📦 Loaded from offline draft</p>' : ''}
          </div>
        `;

        // Populate the form with loaded data
        if (itin.title) titleInput.value = itin.title;
      } catch (error) {
        console.error('Load error:', error);
        resultsDiv.innerHTML = `
          <div class="result-card" style="background: #ffebee; border-left: 4px solid #f44336;">
            <h4>❌ Load Failed</h4>
            <p>Could not load itinerary with ID: <code>${id}</code></p>
            <p style="font-size: 0.9em; margin-top: 10px;">💡 The backend API or offline cache doesn't have this itinerary.</p>
          </div>
        `;
      }

      loadBtn.textContent = '📂 Load';
      loadBtn.disabled = false;
    });
  }

  async tryRedrawLastRouteWhenOffline() {
    console.log('[Offline] Checking for last route to redraw...');

    // Only redraw if offline
    if (navigator.onLine) {
      console.log('[Offline] Online, skipping last route redraw');
      return;
    }

    try {
      const lastRoute = await idbGetLastRoute();
      if (!lastRoute || !lastRoute.geometry) {
        console.log('[Offline] No last route found in IDB');
        return;
      }

      console.log('[Offline] Found last route, redrawing on map...');

      // Redraw polyline on map
      if (lastRoute.geometry && this.map) {
        // Assuming geometry is in GeoJSON format with coordinates
        const coords = lastRoute.geometry.coordinates || lastRoute.geometry;
        if (coords && coords.length > 0) {
          // Convert to Leaflet LatLng format [lat, lng]
          const latlngs = coords.map((coord) => [coord[1], coord[0]]);

          // Draw polyline
          L.polyline(latlngs, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7,
          }).addTo(this.map);

          // Fit map to route bounds
          this.map.fitBounds(latlngs);

          console.log('[Offline] Last route redrawn successfully');
        }
      }
    } catch (error) {
      console.warn('[Offline] Failed to redraw last route:', error);
    }
  }

  setupMap() {
    // Wait for Leaflet to be loaded
    if (typeof L === 'undefined') {
      console.log('Waiting for Leaflet to load...');
      setTimeout(() => this.setupMap(), 100);
      return;
    }

    console.log('Initializing map...');

    try {
      // Initialize Leaflet map
      this.map = L.map('map', { zoomControl: true }).setView([32.0853, 34.7818], 13); // Tel Aviv coordinates

      // Register map with adapter (Step 21-Pro)
      registerMap(this.map);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.map);

      // Add a marker for current location
      this.userMarker = L.marker([32.0853, 34.7818])
        .addTo(this.map)
        .bindPopup('Your Location')
        .openPopup();

      console.log('Map initialized successfully');

      // Try to redraw last route if offline
      this.tryRedrawLastRouteWhenOffline();

      // Setup location button
      const locationBtn = document.getElementById('locationBtn');
      if (locationBtn) {
        locationBtn.addEventListener('click', () => {
          console.log('Location button clicked');
          locationBtn.classList.add('active');

          // Try to get user's actual location
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Update map center and marker
                this.map.setView([lat, lng], 15);
                this.userMarker.setLatLng([lat, lng]);
                this.userMarker.bindPopup('You are here!').openPopup();

                console.log('Location updated:', lat, lng);
                locationBtn.classList.remove('active');
              },
              (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please enable location services.');
                locationBtn.classList.remove('active');
              }
            );
          } else {
            alert('Geolocation is not supported by your browser');
            locationBtn.classList.remove('active');
          }
        });
      }
    } catch (error) {
      console.error('Map initialization error:', error);
    }
  }

  setupCarModeOverlay() {
    // Only mount if BOTH copilot AND copilotUi flags are enabled
    if (!flags.copilot || !flags.copilotUi) {
      console.log('[CarMode] Flags OFF, overlay disabled');
      return;
    }

    console.info('[CarMode] Mounting overlay...');

    try {
      // Get recommender API from window.__copilot (exposed by bootstrap)
      const copilotApi = window.__copilot;
      if (!copilotApi) {
        console.warn('[CarMode] Copilot API not available yet, skipping overlay setup');
        return;
      }

      // Create overlay instance
      this.carModeOverlay = new CarModeOverlay({
        onAccept: (id, kind) => copilotApi.accept(id, kind),
        onDecline: (id, kind) => copilotApi.decline(id, kind),
      });

      // Mount overlay to DOM
      this.carModeOverlay.mount();

      // Subscribe to suggestion stream
      sugStream.subscribe((suggestion) => {
        if (suggestion === null) {
          this.carModeOverlay.hide();
        } else {
          this.carModeOverlay.show(suggestion);
        }
      });

      console.info('[CarMode] Overlay setup complete');
    } catch (error) {
      console.error('[CarMode] Failed to setup overlay:', error);
    }
  }

  setupResultsDrawer() {
    // Only mount if ALL three flags are enabled
    if (!flags.copilot || !flags.copilotUi || !flags.copilotExec) {
      console.log('[ResultsDrawer] Flags OFF, drawer disabled');
      return;
    }

    console.info('[ResultsDrawer] Mounting drawer...');

    try {
      // Create drawer instance
      this.resultsDrawer = new ResultsDrawer();

      // Mount drawer to DOM
      this.resultsDrawer.mount();

      console.info('[ResultsDrawer] Drawer setup complete');
    } catch (error) {
      console.error('[ResultsDrawer] Failed to setup drawer:', error);
    }
  }

  setupNavigateHandler() {
    console.info('[Navigate] Setting up navigate handler...');

    // Store last GPS fix from context engine
    let lastFix = null;

    // Hook: context engine will call this when GPS fix updates
    window.__copilot_setFix = (lat, lon) => {
      lastFix = { lat, lon };
      console.debug('[Navigate] GPS fix updated:', lastFix);
    };

    try {
      // Subscribe to navigate events
      onNavigate(async ({ lat, lon, name, source }) => {
        console.info('[Navigate] Navigate requested:', { lat, lon, name, source });

        // Flag gate: only proceed if all copilot flags + copilotNav are enabled
        if (!flags.copilot || !flags.copilotUi || !flags.copilotExec || !flags.copilotNav) {
          console.debug('[Navigate] Flags not fully enabled, skipping navigation features');
          return;
        }

        // Always focus the map on destination
        focus(lat, lon, 15);

        // Try to draw route if we have origin fix
        try {
          if (lastFix && lastFix.lat && lastFix.lon) {
            console.info('[Navigate] Computing route from', lastFix, 'to', { lat, lon });

            // Compute route with metadata
            const { coordinates, distance_m, duration_s, route_retry_relaxed } = await computeTempRoute(lastFix, { lat, lon });

            // Draw route if we got valid coordinates
            if (coordinates && coordinates.length > 0) {
              drawRoute(coordinates);
              console.info('[Navigate] Route drawn with', coordinates.length, 'points');

              // Display route metrics
              const metricsEl = document.getElementById('routeMetrics');
              const distanceEl = document.getElementById('routeDistance');
              const durationEl = document.getElementById('routeDuration');
              const avoidChipEl = document.getElementById('avoidChip');
              if (metricsEl && distanceEl && durationEl && distance_m && duration_s) {
                distanceEl.textContent = `📏 ${fmtDistance(distance_m)}`;
                durationEl.textContent = `⏱️ ${fmtDuration(duration_s)}`;

                // Display avoid chip if element exists
                if (avoidChipEl) {
                  if (route_retry_relaxed) {
                    avoidChipEl.textContent = t('route.avoids_relaxed');
                    avoidChipEl.className = 'route-chip chip-warn';
                  } else {
                    avoidChipEl.textContent = t('route.avoids_honored');
                    avoidChipEl.className = 'route-chip chip-ok';
                  }
                  avoidChipEl.style.display = 'inline-flex';
                }

                metricsEl.style.display = 'flex';
              }

              // Set up navigation buttons
              const navButtonsEl = document.getElementById('navButtons');
              const navGoogleEl = document.getElementById('navGoogle');
              const navAppleEl = document.getElementById('navApple');
              const navWazeEl = document.getElementById('navWaze');
              if (navButtonsEl && navGoogleEl && navAppleEl && navWazeEl) {
                navGoogleEl.href = googleMapsUrl(lat, lon);
                navAppleEl.href = appleMapsUrl(lat, lon);
                navWazeEl.href = wazeUrl(lat, lon);
                navButtonsEl.style.display = 'flex';
              }

              // Fetch and display hazards along the route
              try {
                // Skip hazards when offline
                if (!navigator.onLine) {
                  console.info('[Navigate] Offline, skipping hazards fetch');
                  clearHazards();
                  return;
                }

                console.info('[Navigate] Fetching hazards around destination');
                const hazardsData = await apiHazards({
                  lat,
                  lon,
                  radius: 10000, // 10km radius
                });

                if (hazardsData && hazardsData.hazards && hazardsData.hazards.length > 0) {
                  displayHazards(hazardsData.hazards);
                  console.info('[Navigate] Displayed', hazardsData.hazards.length, 'hazards');
                } else {
                  console.debug('[Navigate] No hazards found in area');
                  clearHazards();
                }
              } catch (error) {
                console.warn('[Navigate] Failed to fetch hazards:', error.message);
                clearHazards();
              }
            } else {
              console.warn('[Navigate] No route coordinates returned');
              clearRoute();
              clearHazards();
              // Hide route UI
              const metricsEl = document.getElementById('routeMetrics');
              const navButtonsEl = document.getElementById('navButtons');
              if (metricsEl) metricsEl.style.display = 'none';
              if (navButtonsEl) navButtonsEl.style.display = 'none';
            }
          } else {
            console.debug('[Navigate] No GPS fix available, skipping route');
            clearRoute();
            clearHazards();
            // Hide route UI
            const metricsEl = document.getElementById('routeMetrics');
            const navButtonsEl = document.getElementById('navButtons');
            if (metricsEl) metricsEl.style.display = 'none';
            if (navButtonsEl) navButtonsEl.style.display = 'none';
          }
        } catch (error) {
          // Fail safe: route computation failed, but map focus still works
          console.warn('[Navigate] Route computation failed:', error.message);
          clearRoute();
          clearHazards();
          // Hide route UI
          const metricsEl = document.getElementById('routeMetrics');
          const navButtonsEl = document.getElementById('navButtons');
          if (metricsEl) metricsEl.style.display = 'none';
          if (navButtonsEl) navButtonsEl.style.display = 'none';
        }

        // Add a marker at destination
        if (this.map && window.L && window.L.marker) {
          const marker = window.L.marker([lat, lon]).addTo(this.map);
          if (name) {
            marker.bindPopup(name).openPopup();
          }
        }
      });

      console.info('[Navigate] Navigate handler setup complete');
    } catch (error) {
      console.error('[Navigate] Failed to setup handler:', error);
    }
  }
}

// ---- Release Notes & Feedback Modal Handlers ----

/**
 * Open Release Notes modal
 */
async function openNotes() {
  try {
    const response = await fetch('/roamwise-app/release-notes.json', { cache: 'no-cache' });
    const data = await response.json();
    const ul = document.getElementById('notes-list');
    ul.innerHTML = '';
    data.items.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.title}</strong> — ${item.desc}`;
      ul.appendChild(li);
    });
    document.getElementById('notes-modal').hidden = false;
  } catch (error) {
    console.error('[ReleaseNotes] Failed to load:', error);
  }
}

/**
 * Close Release Notes modal
 */
function closeNotes() {
  document.getElementById('notes-modal').hidden = true;
}

/**
 * Open Feedback modal
 */
function openFeedback() {
  document.getElementById('feedback-modal').hidden = false;
  document.getElementById('fb-status').textContent = '';
  document.getElementById('fb-text').value = '';
}

/**
 * Close Feedback modal
 */
function closeFeedback() {
  document.getElementById('feedback-modal').hidden = true;
}

/**
 * Send feedback to backend
 */
async function sendFeedback() {
  const text = (document.getElementById('fb-text').value || '').trim();
  const statusEl = document.getElementById('fb-status');

  if (!text) {
    statusEl.textContent = 'Please write something first.';
    return;
  }

  statusEl.textContent = 'Sending…';

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: text,
        page: location.pathname,
        ts: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    statusEl.textContent = 'Thanks! Feedback sent.';
    document.getElementById('fb-text').value = '';

    // Auto-close after 2 seconds
    setTimeout(() => {
      closeFeedback();
    }, 2000);
  } catch (error) {
    console.error('[Feedback] Failed to send:', error);
    statusEl.textContent = 'Failed to send. Try again later.';
  }
}

// Wire up modal event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notes-close')?.addEventListener('click', closeNotes);
  document.getElementById('fb-cancel')?.addEventListener('click', closeFeedback);
  document.getElementById('fb-send')?.addEventListener('click', sendFeedback);

  // Close modals when clicking outside
  document.getElementById('notes-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'notes-modal') closeNotes();
  });
  document.getElementById('feedback-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'feedback-modal') closeFeedback();
  });
});

// Expose globally for dev-drawer buttons
window.openNotes = openNotes;
window.openFeedback = openFeedback;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.simpleApp = new SimpleNavigation();
    mountUpdateBanner(); // Mount SW update banner
    mountDevDrawer(); // Mount hidden dev drawer
  });
} else {
  window.simpleApp = new SimpleNavigation();
  mountUpdateBanner(); // Mount SW update banner
  mountDevDrawer(); // Mount hidden dev drawer
}

console.log('Simple app loaded');
