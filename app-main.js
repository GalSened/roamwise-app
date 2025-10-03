// Simple JavaScript implementation to ensure navigation works
import { t } from './src/lib/i18n.js';

console.log('Simple app starting...');

class SimpleNavigation {
  constructor() {
    this.currentView = 'search';
    this.init();
  }

  init() {
    console.log('Initializing navigation...');
    this.setupNavigation();
    this.setupThemeToggle();
    this.setupFormInteractions(); // Add this to ensure search works
    this.showView('search');
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.app-view');

    console.log('Found nav buttons:', navButtons.length);
    console.log('Found views:', views.length);

    navButtons.forEach(button => {
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
    views.forEach(view => {
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
    navButtons.forEach(button => {
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
    document.querySelectorAll('.duration-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.duration-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
      });
    });

    // Interest options
    document.querySelectorAll('.interest-option').forEach(option => {
      option.addEventListener('click', () => {
        const selected = document.querySelectorAll('.interest-option.selected');
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
    this.setupPlannerUI();
  }

  setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('freeText');
    console.log('Setting up search - Button:', !!searchBtn, 'Input:', !!searchInput);
    
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        if (query) {
          console.log('Searching with Personal AI for:', query);
          searchBtn.textContent = 'AI Searching...';
          searchBtn.disabled = true;
          
          try {
            // Use Personal AI for intelligent search
            const response = await fetch('https://premium-hybrid-473405-g7.uc.r.appspot.com/api/intelligence/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: query,
                location: 'Current Location',
                preferences: {
                  budgetCategory: 'mid_range',
                  destinationTypes: ['urban', 'cultural'],
                  activityPreferences: ['food', 'sightseeing']
                }
              })
            });
            
            const data = await response.json();
            const resultsList = document.getElementById('list');
            
            if (data.results && data.results.length > 0) {
              resultsList.innerHTML = data.results.map(result => `
                <div class="search-result ai-powered">
                  <h3>🤖 ${result.name}</h3>
                  <p>${result.description}</p>
                  <div class="result-rating">⭐ ${result.rating?.toFixed(1) || 'N/A'} • AI Score: ${result.personalizedScore?.toFixed(1) || 'N/A'}</div>
                  <div class="ai-reason">${result.personalizedReason}</div>
                  <div class="ai-tags">${result.personalizedTags?.join(', ') || ''}</div>
                </div>
              `).join('');
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
        generateBtn.textContent = '🧠 AI Thinking...';
        generateBtn.disabled = true;
        
        try {
          // Collect user preferences
          const selectedDuration = document.querySelector('.duration-option.selected')?.textContent || 'Full day';
          const selectedInterests = Array.from(document.querySelectorAll('.interest-option.selected')).map(el => el.textContent);
          const budget = document.getElementById('budgetAmount')?.textContent || '300';
          
          // Call Personal AI for recommendations
          const response = await fetch('https://premium-hybrid-473405-g7.uc.r.appspot.com/api/ai/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preferences: {
                duration: selectedDuration,
                interests: selectedInterests,
                budget: parseInt(budget),
                destinationType: 'mixed',
                activities: selectedInterests
              },
              context: {
                userId: 'personal',
                location: 'Current Location',
                requestType: 'trip_planning'
              }
            })
          });
          
          const data = await response.json();
          const tripDisplay = document.getElementById('enhancedTripDisplay');
          
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
          
        } catch (error) {
          console.error('AI Trip generation error:', error);
          const tripDisplay = document.getElementById('enhancedTripDisplay');
          tripDisplay.innerHTML = `
            <div class="trip-result ai-learning">
              <h3>🧠 AI Learning Your Preferences</h3>
              <div class="trip-summary">
                <div class="trip-stat">
                  <span class="stat-label">Duration:</span>
                  <span class="stat-value">${document.querySelector('.duration-option.selected')?.textContent || 'Full day'}</span>
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

  setupVoiceButton() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
      let isListening = false;
      
      voiceBtn.addEventListener('mousedown', () => {
        if (!isListening) {
          isListening = true;
          voiceBtn.classList.add('listening');
          voiceBtn.querySelector('.voice-text').textContent = 'Listening... Release to stop';
          
          const statusEl = document.getElementById('voiceStatus');
          if (statusEl) {
            statusEl.textContent = '🎤 Listening for your voice command...';
          }
        }
      });

      voiceBtn.addEventListener('mouseup', () => {
        if (isListening) {
          isListening = false;
          voiceBtn.classList.remove('listening');
          voiceBtn.querySelector('.voice-text').textContent = 'Press & Hold to Speak';
          
          const statusEl = document.getElementById('voiceStatus');
          const responseEl = document.getElementById('voiceResponse');
          
          if (statusEl) {
            statusEl.textContent = '🤖 Processing your request...';
          }
          
          setTimeout(() => {
            if (statusEl) statusEl.textContent = '';
            if (responseEl) {
              responseEl.textContent = 'Demo: Voice recognition would work here. The AI would process your speech and provide intelligent responses!';
              responseEl.style.display = 'block';
            }
          }, 1500);
        }
      });

      voiceBtn.addEventListener('mouseleave', () => {
        if (isListening) {
          isListening = false;
          voiceBtn.classList.remove('listening');
          voiceBtn.querySelector('.voice-text').textContent = 'Press & Hold to Speak';
        }
      });
    }
  }

  /**
   * Render comfort tags and outfit hint for a leg/POI
   * @param {object} leg - The timeline leg or SAR item
   * @returns {string} HTML string for comfort section
   */
  renderComfort(leg) {
    const c = leg.comfort || {};
    const tags = Array.isArray(c.tags) ? c.tags : [];
    const hint = (leg.outfit_hint && typeof leg.outfit_hint === 'string') ? leg.outfit_hint : t('comfort.comfortable');

    if (tags.length === 0 && hint === t('comfort.comfortable')) {
      return ''; // No comfort data to show
    }

    let html = '<div class="comfort">';

    // Tags row
    if (tags.length > 0) {
      html += `<div><span class="label">${t('comfort.tags')}:</span>`;
      for (const tag of tags) {
        const key = `comfort.${tag}`;
        html += `<span class="tag tag-${tag}">${t(key)}</span>`;
      }
      html += '</div>';
    }

    // Outfit hint row
    if (hint) {
      html += `<div class="hint"><span class="label">${t('comfort.hint')}:</span>${hint}</div>`;
    }

    html += '</div>';
    return html;
  }

  setupPlannerUI() {
    // Toggle start source buttons
    const btnCurrent = document.getElementById('btnStartCurrent');
    const btnHotel = document.getElementById('btnStartHotel');
    const hotelRow = document.getElementById('hotelRow');
    
    if (btnCurrent && btnHotel && hotelRow) {
      btnCurrent.addEventListener('click', () => {
        btnCurrent.classList.add('active');
        btnHotel.classList.remove('active');
        hotelRow.style.display = 'none';
      });
      
      btnHotel.addEventListener('click', () => {
        btnHotel.classList.add('active');
        btnCurrent.classList.remove('active');
        hotelRow.style.display = 'flex';
      });
    }
    
    // Update slider value displays
    const nearRadius = document.getElementById('nearRadius');
    const nearRadiusVal = document.getElementById('nearRadiusVal');
    if (nearRadius && nearRadiusVal) {
      nearRadius.addEventListener('input', () => {
        nearRadiusVal.textContent = nearRadius.value;
      });
    }
    
    const detourMin = document.getElementById('detourMin');
    const detourMinVal = document.getElementById('detourMinVal');
    if (detourMin && detourMinVal) {
      detourMin.addEventListener('input', () => {
        detourMinVal.textContent = detourMin.value;
      });
    }
    
    // Plan Day button handler
    const btnPlanDay = document.getElementById('btnPlanDay');
    if (btnPlanDay) {
      btnPlanDay.addEventListener('click', async () => {
        const resultsDiv = document.getElementById('planner-results');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '<div style="padding:20px; text-align:center;">🧠 Planning your day...</div>';
        btnPlanDay.disabled = true;
        btnPlanDay.textContent = 'Planning...';
        
        try {
          const lang = document.documentElement.getAttribute('data-lang') || 'he';
          const isHotelMode = btnHotel && btnHotel.classList.contains('active');
          
          let body = {
            mode: 'drive',
            near_origin: {
              radius_km: parseInt(nearRadius?.value || '5'),
              types: ['tourist_attraction', 'viewpoint', 'museum'],
              min_rating: 4.3,
              open_now: false,
              limit: 8
            },
            sar: {
              query: 'viewpoint|restaurant|ice_cream',
              max_detour_min: parseInt(detourMin?.value || '15'),
              max_results: 12
            }
          };
          
          if (isHotelMode) {
            // Hotel mode: use origin_query
            const hotelInput = document.getElementById('hotelInput');
            const hotelName = hotelInput?.value?.trim();
            if (!hotelName) {
              resultsDiv.innerHTML = '<div style="padding:20px; color:#d32f2f;">⚠️ Please enter a hotel name</div>';
              btnPlanDay.disabled = false;
              btnPlanDay.textContent = document.querySelector('[data-i18n="planner.plan_day"]')?.textContent || 'Plan Day';
              return;
            }
            body.origin_query = hotelName;
          } else {
            // Current location mode: use geolocation
            try {
              const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: false,
                  timeout: 10000,
                  maximumAge: 300000
                });
              });
              body.origin = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
              };
            } catch (geoErr) {
              console.error('Geolocation error:', geoErr);
              resultsDiv.innerHTML = '<div style="padding:20px; color:#d32f2f;">⚠️ Could not get your location. Please enable location services or use hotel mode.</div>';
              btnPlanDay.disabled = false;
              btnPlanDay.textContent = document.querySelector('[data-i18n="planner.plan_day"]')?.textContent || 'Plan Day';
              return;
            }
          }
          
          // Optional destination
          const destInput = document.getElementById('destInput');
          const destQuery = destInput?.value?.trim();
          if (destQuery) {
            body.dest_query = destQuery;
          }
          
          // Call backend API via proxy
          const response = await fetch('https://roamwise-proxy-971999716773.us-central1.run.app/planner/plan-day', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-lang': lang
            },
            credentials: 'include',
            body: JSON.stringify(body)
          });
          
          const data = await response.json();
          
          if (!data.ok || !data.plan) {
            throw new Error(data.error || 'Plan failed');
          }
          
          // Render results
          const { plan } = data;
          const { summary, timeline } = plan;
          
          let html = '<div class="header">';
          html += `<div><strong>🗺️ Day Plan</strong></div>`;
          if (summary.origin_name) {
            html += `<div>📍 Starting from: ${summary.origin_name}</div>`;
          }
          html += `<div>🎯 Mode: ${summary.plan_mode} • POIs: ${summary.count}</div>`;
          if (summary.near_origin_scanned) {
            html += `<div>🔍 Near origin: ${summary.near_origin_count || 0} found</div>`;
          }
          if (summary.sar_scanned) {
            html += `<div>🛣️ Along route: ${summary.sar_count || 0} found</div>`;
          }
          html += '</div>';
          
          if (timeline && timeline.length > 0) {
            let cumMin = 0;
            for (const leg of timeline) {
              if (leg.to?.kind === 'poi') {
                const eta = leg.eta_seconds ? Math.round(leg.eta_seconds / 60) : null;
                cumMin = eta || cumMin;
                
                html += '<div class="poi">';
                html += `<div><strong>${leg.to.name || 'POI'}</strong></div>`;
                if (leg.to.rating) {
                  html += `<div class="meta">⭐ ${leg.to.rating.toFixed(1)}`;
                  if (leg.to.user_ratings_total) {
                    html += ` (${leg.to.user_ratings_total} reviews)`;
                  }
                  html += '</div>';
                }
                if (eta !== null) {
                  html += `<div class="meta">🕐 ETA: +${cumMin} min from start</div>`;
                }
                if (leg.to.detour_min !== undefined) {
                  html += `<div class="meta">🔀 Detour: ${leg.to.detour_min} min</div>`;
                }
                html += this.renderComfort(leg);
                html += '</div>';
              }
            }
          } else {
            html += '<div style="padding:20px;">No POIs found. Try adjusting the radius or destination.</div>';
          }
          
          // Add SAR results if present
          if (summary.sar_results && summary.sar_results.length > 0) {
            html += '<hr><div class="header"><strong>🛣️ Along-Route Discoveries</strong></div>';
            for (const sar of summary.sar_results.slice(0, 6)) {
              html += '<div class="poi">';
              html += `<div><strong>${sar.name || 'Place'}</strong></div>`;
              if (sar.rating) {
                html += `<div class="meta">⭐ ${sar.rating.toFixed(1)}`;
                if (sar.user_ratings_total) {
                  html += ` (${sar.user_ratings_total} reviews)`;
                }
                html += '</div>';
              }
              if (sar.detour_min !== undefined) {
                html += `<div class="meta">🔀 Detour: ${sar.detour_min} min</div>`;
              }
              html += this.renderComfort(sar);
              html += '</div>';
            }
          }
          
          resultsDiv.innerHTML = html;
          
        } catch (error) {
          console.error('Planner error:', error);
          resultsDiv.innerHTML = `<div style="padding:20px; color:#d32f2f;">❌ Error: ${error.message || 'Failed to plan day'}</div>`;
        } finally {
          btnPlanDay.disabled = false;
          btnPlanDay.textContent = document.querySelector('[data-i18n="planner.plan_day"]')?.textContent || 'Plan Day';
        }
      });
    }
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.simpleApp = new SimpleNavigation();
  });
} else {
  window.simpleApp = new SimpleNavigation();
}

console.log('Simple app loaded');