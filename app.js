// RoamWise — app.js (with Weather card & compare)
const PROXY = "https://roamwise-proxy-971999716773.us-central1.run.app"; // e.g. https://roamwise-proxy-xxxxx.a.run.app

// Leaflet map
let map = L.map('map', { zoomControl:true }).setView([45.8144, 10.8400], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom: 19, attribution: '\u00A9 OpenStreetMap'
}).addTo(map);
let hereMarker, resultsLayer = L.layerGroup().addTo(map), routeLayer = L.layerGroup().addTo(map);

const ui = {
  intent: () => document.getElementById('intent').value,
  routeBox: document.getElementById('routeBox'),
  placeBox: document.getElementById('placeBox'),
  activitiesFilters: document.getElementById('activitiesFilters'),
  dest: document.getElementById('dest'),
  acList: document.getElementById('acList'),
  goRouteBtn: document.getElementById('goRouteBtn'),
  searchBtn: document.getElementById('searchBtn'),
  status: document.getElementById('status'),
  routeMeta: document.getElementById('routeMeta'),
  routeLinks: document.getElementById('routeLinks'),
  routeGmapsBtn: document.getElementById('routeGmapsBtn'),
  routeWazeBtn: document.getElementById('routeWazeBtn'),
  list: document.getElementById('list'),
  openNow: () => document.getElementById('openNow').checked,
  radius: () => parseInt(document.getElementById('radius').value, 10),
  minRating: () => parseFloat(document.getElementById('minRating').value),
  freeText: document.getElementById('freeText'),
  thinkBtn: document.getElementById('thinkBtn'),
  thinkStatus: document.getElementById('thinkStatus'),
  travelMode: () => document.getElementById('travelMode').value,
  favList: document.getElementById('favList'),
  wxTemp: document.getElementById('wxTemp'),
  wxDesc: document.getElementById('wxDesc'),
  wxHiLo: document.getElementById('wxHiLo'),
  wxNext: document.getElementById('wxNext'),
  wxRefresh: document.getElementById('wxRefresh'),
  // AI Elements
  moodSelect: document.getElementById('moodSelect'),
  voiceBtn: document.getElementById('voiceBtn'),
  voiceStatus: document.getElementById('voiceStatus'),
  voiceResponse: document.getElementById('voiceResponse'),
  aiRecommendBtn: document.getElementById('aiRecommendBtn'),
  aiRecommendations: document.getElementById('aiRecommendations'),
  smartNotifications: document.getElementById('smartNotifications'),
  aiToggle: document.getElementById('aiToggle'),
  voiceHelpBtn: document.getElementById('voiceHelpBtn'),
  // Trip Planning Elements
  tripToggle: document.getElementById('tripToggle'),
  tripPlanForm: document.getElementById('tripPlanForm'),
  tripDuration: document.getElementById('tripDuration'),
  customHoursField: document.getElementById('customHoursField'),
  customHours: document.getElementById('customHours'),
  tripBudget: document.getElementById('tripBudget'),
  groupSize: document.getElementById('groupSize'),
  tripMobility: document.getElementById('tripMobility'),
  planTripBtn: document.getElementById('planTripBtn'),
  tripPlanStatus: document.getElementById('tripPlanStatus'),
  tripPlanDisplay: document.getElementById('tripPlanDisplay'),
  liveNavigation: document.getElementById('liveNavigation')
};

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault(); deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.onclick = async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt = null; btn.textContent='מותקן'; };
});

// Geolocation + initial weather
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(async (p)=>{
    const lat = p.coords.latitude, lng = p.coords.longitude;
    map.setView([lat,lng], 13);
    hereMarker?.remove();
    hereMarker = L.marker([lat,lng], {title:'המיקום שלך'}).addTo(map);
    try { await updateWeatherCard(lat,lng); } catch {}
  }, ()=>{}, {enableHighAccuracy:true, timeout:8000});
}
ui.wxRefresh.addEventListener('click', async ()=>{
  const c = map.getCenter();
  ui.wxDesc.textContent = 'מרענן…';
  try { await updateWeatherCard(c.lat, c.lng); } catch { ui.wxDesc.textContent = 'שגיאה במז״א'; }
});

// UI events
document.getElementById('intent').addEventListener('change', onIntentChange);
document.querySelectorAll('[data-preset]').forEach(btn=>{
  btn.addEventListener('click', ()=> { setIntent(btn.dataset.preset); });
});
document.querySelectorAll('[data-activity]').forEach(btn=>{
  btn.addEventListener('click', ()=> { selectedActivity = btn.dataset.activity; doPlaces(); });
});
ui.searchBtn.addEventListener('click', doPlaces);
ui.goRouteBtn.addEventListener('click', doRoute);
ui.dest.addEventListener('input', debounce(doAutocomplete, 250));
ui.thinkBtn.addEventListener('click', doThink);

// AI Event Listeners
ui.voiceBtn.addEventListener('click', startVoiceInput);
ui.aiRecommendBtn.addEventListener('click', getAIRecommendations);
ui.moodSelect.addEventListener('change', onMoodChange);
ui.aiToggle.addEventListener('click', toggleAISettings);
ui.voiceHelpBtn.addEventListener('click', showVoiceHelp);

function setIntent(mode){ document.getElementById('intent').value = mode; onIntentChange(); }

let selectedActivity = null;
function onIntentChange(){
  const v = ui.intent();
  ui.routeBox.hidden = (v !== 'route');
  ui.placeBox.hidden = (v === 'route');
  ui.activitiesFilters.hidden = (v !== 'activities');
  if (v !== 'activities') selectedActivity = null;
  ui.list.innerHTML = '<div class="skel"></div><div class="skel"></div>';
  ui.status.textContent = ''; ui.routeMeta.textContent = ''; ui.routeLinks.hidden = true;
  resultsLayer.clearLayers(); routeLayer.clearLayers();
}

// HTTP helper
async function post(path, body){
  const r = await fetch(`${PROXY}${path}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

// Deep-links
function gmLink({oLat,oLng,dLat,dLng,query,placeId,mode}){
  const base = 'https://www.google.com/maps/dir/?api=1';
  const p = new URLSearchParams({ travelmode: mode || 'driving', language:'he' });
  if (oLat!=null && oLng!=null) p.set('origin', `${oLat},${oLng}`);
  if (placeId) { p.set('destination_place_id', placeId); if (query) p.set('destination', query); }
  else if (dLat!=null && dLng!=null) { p.set('destination', `${dLat},${dLng}`); }
  else if (query) { p.set('destination', query); }
  return `${base}&${p.toString()}`;
}
function wzLink({dLat,dLng,query}){
  if (dLat!=null && dLng!=null) return `https://www.waze.com/ul?ll=${dLat},${dLng}&navigate=yes&zoom=17`;
  if (query) return `waze://?q=${encodeURIComponent(query)}&navigate=yes`;
  return '#';
}
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

// Autocomplete (proxy)
let acToken = Math.random().toString(36).slice(2);
async function doAutocomplete(){
  const q = ui.dest.value.trim();
  if (!q){ ui.acList.hidden=true; ui.acList.innerHTML=''; return; }
  try{
    const j = await post('/autocomplete', { input:q, language:'he', sessionToken: acToken });
    const preds = j.predictions || [];
    ui.acList.innerHTML = '';
    preds.slice(0,6).forEach(p => {
      const btn = document.createElement('button');
      btn.textContent = p.description;
      btn.role = 'option';
      btn.onclick = ()=> { ui.dest.value = p.description; ui.acList.hidden = true; };
      ui.acList.appendChild(btn);
    });
    ui.acList.hidden = preds.length === 0;
  }catch(e){ ui.acList.hidden = true; }
}

// Activities mapping (client-side)
function mapActivityToQuery(sub){
  switch(sub){
    case 'water':   return { type:'tourist_attraction', keyword:'boat tour|sail|kayak|canoe|paddle|rent boat' };
    case 'hike':    return { type:'tourist_attraction', keyword:'trail|hike|viewpoint|panorama' };
    case 'bike':    return { type:'bicycle_store', keyword:'bike rental|mtb|e-bike|bicycle rental' };
    case 'museum':  return { type:'museum', keyword:'' };
    case 'park':    return { type:'park', keyword:'beach|lakeside' };
    case 'amusement': return { type:'amusement_park', keyword:'water park|theme park' };
    case 'spa':     return { type:'spa', keyword:'thermal|terme|spa' };
    case 'kids':    return { type:'tourist_attraction', keyword:'family friendly|kids' };
    default:        return { type:'point_of_interest', keyword:'' };
  }
}

// Places search
function buildPlaceQuery(){
  const v = ui.intent();
  let type = 'point_of_interest', keyword = '';
  if (v==='pizza'){ type='restaurant'; keyword='pizza|pizzeria'; }
  else if (v==='gelato'){ type='ice_cream'; keyword='gelato|ice cream'; }
  else if (v==='viewpoints'){ type='tourist_attraction'; keyword='viewpoint|panorama|scenic'; }
  else if (v==='food'){ type='restaurant'; }
  else if (v==='activities' && selectedActivity){ const m = mapActivityToQuery(selectedActivity); type=m.type; keyword=m.keyword; }
  const c = map.getCenter();
  return { lat:c.lat, lng:c.lng, openNow: ui.openNow(), radius: ui.radius(), language:'he',
           type, keyword, minRating: ui.minRating(), maxResults: 12 };
}

async function doPlaces(){
  try {
    ui.status.textContent = 'מחפש…';
    resultsLayer.clearLayers();
    ui.list.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    const q = buildPlaceQuery();
    const j = await post('/places', q);
    const items = j.items || [];
    ui.status.textContent = items.length ? `נמצאו ${items.length} תוצאות` : 'לא נמצאו תוצאות';
    ui.list.innerHTML = '';
    const group = L.featureGroup();
    items.forEach(renderPlaceCard);
    resultsLayer.eachLayer(m => group.addLayer(m));
    if (group.getLayers().length) map.fitBounds(group.getBounds().pad(0.2));
  } catch (e) {
    ui.status.textContent = 'שגיאה בחיפוש.';
  }
}

function renderPlaceCard(p){
  const div = document.createElement('div');
  div.className = 'result';
  const here = map.getCenter();
  const distKm = (p.lat!=null && p.lng!=null) ? (map.distance(here, L.latLng(p.lat,p.lng))/1000).toFixed(1) : null;
  const rating = (p.rating ? `${p.rating.toFixed(1)}⭐` : 'N/A') + (p.userRatingsTotal ? ` · ${p.userRatingsTotal} ביקורות` : '');
  const open = (p.openNow == null) ? '' : (p.openNow ? ' · פתוח עכשיו' : ' · סגור עכשיו');
  if (p.lat!=null && p.lng!=null){ L.marker([p.lat,p.lng]).bindPopup(p.name).addTo(resultsLayer); }
  div.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:center">
      <h3>${p.name}</h3>
      <button class="fav" aria-label="מועדף">${isFav(p) ? '★' : '☆'}</button>
    </div>
    <div class="muted">${p.address || ''}</div>
    <div class="muted small">${rating}${open}${distKm?` · ~${distKm} ק״מ`:''}</div>
    <div class="row" style="margin-top:6px">
      <button class="primary gbtn">נווט בגוגל</button>
      <button class="wbtn">נווט ב-Waze</button>
      <button class="mapbtn">על המפה</button>
    </div>
  `;
  div.querySelector('.gbtn').onclick = () => window.open(gmLink({ oLat: here.lat, oLng: here.lng, dLat: p.lat, dLng: p.lng, query: p.name }), '_blank');
  div.querySelector('.wbtn').onclick = () => window.open(wzLink({ dLat: p.lat, dLng: p.lng, query: p.name }), '_blank');
  div.querySelector('.mapbtn').onclick = () => { if (p.lat!=null && p.lng!=null) { map.setView([p.lat,p.lng], 16); L.marker([p.lat,p.lng]).addTo(resultsLayer).bindPopup(p.name).openPopup(); } };
  div.querySelector('.fav').onclick = () => { toggleFav(p); renderFavs(); div.querySelector('.fav').textContent = isFav(p) ? '★' : '☆'; };
  document.getElementById('list').appendChild(div);
}

// Route with weather compare
function decodePolyline(str){
  let index=0, lat=0, lng=0, coords=[];
  while (index < str.length) {
    let b, shift=0, result=0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat; shift=0; result=0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

async function doRoute(){
  const q = ui.dest.value.trim();
  if (!q) { ui.routeMeta.textContent = 'נא להקליד יעד.'; return; }
  ui.routeMeta.textContent = 'מחשב מסלול…';
  routeLayer.clearLayers();
  try {
    const origin = map.getCenter();
    const m = ui.travelMode(); // 'driving' | 'transit'
    const g = await post('/geocode', { query: q, language: 'he' });
    const dest = { lat: g.result.lat, lng: g.result.lng };
    const r = await post('/route', { origin, dest, mode: m, language: 'he' });
    ui.routeMeta.innerHTML = `🧭 זמן: <b>${r.durationText||''}</b> · מרחק: <b>${r.distanceText||''}</b>`;
    if (r.polyline) {
      const coords = decodePolyline(r.polyline);
      const poly = L.polyline(coords, {weight:5}).addTo(routeLayer);
      map.fitBounds(poly.getBounds().pad(0.2));
    }
    const gmaps = gmLink({ oLat: origin.lat, oLng: origin.lng, dLat: dest.lat, dLng: dest.lng, query: q, mode: m==='transit'?'transit':'driving' });
    const waze  = (m==='driving') ? wzLink({ dLat: dest.lat, dLng: dest.lng, query: q }) : null;
    ui.routeLinks.hidden = false;
    ui.routeGmapsBtn.onclick = ()=> window.open(gmaps,'_blank');
    ui.routeWazeBtn.onclick  = ()=> waze ? window.open(waze,'_blank') : alert('Waze תומך בניווט רכב בלבד');

    // Weather advice
    try {
      const wxBox = document.getElementById('wxCheck');
      const wxAdvice = document.getElementById('wxAdvice');
      if (wxBox && wxBox.checked && wxAdvice){
        wxAdvice.textContent = 'בודק מז"א...';
        const [wHere, wDest] = await Promise.all([
          getWeather(origin.lat, origin.lng),
          getWeather(dest.lat, dest.lng)
        ]);
        wxAdvice.textContent = adviseWeather(wHere, wDest, {src:'כאן', dst:'ביעד'});
      }
    } catch(e){ const wxAdvice = document.getElementById('wxAdvice'); if (wxAdvice) wxAdvice.textContent = 'לא הצלחתי להביא מז"א.'; }

  } catch (e) {
    ui.routeMeta.textContent = 'שגיאה במסלול.';
    ui.routeLinks.hidden = true;
  }
}

// Favorites
const FAV_KEY = "roamwise_favs_v1";
function getFavs(){ try { return JSON.parse(localStorage.getItem(FAV_KEY)||"[]"); } catch { return []; } }
function saveFavs(arr){ localStorage.setItem(FAV_KEY, JSON.stringify(arr)); }
function isFav(p){ return getFavs().some(x => x.id === p.id); }
function toggleFav(p){
  const arr = getFavs();
  const i = arr.findIndex(x => x.id === p.id);
  if (i>=0) arr.splice(i,1); else arr.push(p);
  saveFavs(arr);
}
function renderFavs(){
  const arr = getFavs();
  ui.favList.innerHTML = '';
  if (!arr.length) { ui.favList.textContent = 'אין מועדפים עדיין'; return; }
  arr.forEach(p => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.margin = '6px 0';
    row.innerHTML = `
      <span>★ ${p.name}</span>
      <span class="muted small"> · ${p.rating?`${p.rating.toFixed(1)}⭐`:''}</span>
      <button class="primary">פתח</button>
      <button>הסר</button>
    `;
    row.querySelector('button.primary').onclick = () => {
      if (p.lat!=null && p.lng!=null) { map.setView([p.lat,p.lng], 16); L.marker([p.lat,p.lng]).addTo(resultsLayer).bindPopup(p.name).openPopup(); }
    };
    row.querySelector('button:last-child').onclick = () => { toggleFav(p); renderFavs(); };
    ui.favList.appendChild(row);
  });
}
renderFavs();

// ChatGPT NLU — /think
async function doThink(){
  const text = ui.freeText.value.trim();
  if (!text){ ui.thinkStatus.textContent = 'כתוב משהו…'; return; }
  ui.thinkStatus.textContent = 'חושב…';
  try{
    const res = await post('/think', { text, context: { locale:'he-IL' } });
    ui.thinkStatus.textContent = '';
    // route
    if (res.intent === 'route'){
      setIntent('route'); ui.dest.value = res.destinationText || ''; 
      if (res.mode) document.getElementById('travelMode').value = res.mode;
      if (ui.dest.value) doRoute(); else ui.routeBox.hidden = false;
      return;
    }
    // activities
    if (res.intent === 'activities'){
      setIntent('activities'); selectedActivity = res.subcategory || null;
      if (res.filters){ document.getElementById('openNow').checked = !!res.filters.openNow; if (res.filters.minRating) document.getElementById('minRating').value = String(res.filters.minRating); }
      doPlaces(); return;
    }
    // places generic
    setIntent(res.intent === 'viewpoints' ? 'viewpoints' : (res.intent==='gelato' ? 'gelato' : (res.intent==='pizza' ? 'pizza' : 'food')));
    if (res.filters){ document.getElementById('openNow').checked = !!res.filters.openNow; if (res.filters.minRating) document.getElementById('minRating').value = String(res.filters.minRating); }
    doPlaces();
  }catch(e){
    ui.thinkStatus.textContent = 'שגיאת NLU';
  }
}

// --- AI Functionality ---
let userId = localStorage.getItem('roamwise_user_id') || (() => {
  const id = 'user_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('roamwise_user_id', id);
  return id;
})();

let speechRecognition = null;
let speechSynthesis = window.speechSynthesis;
let isListening = false;
let isSpeaking = false;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  speechRecognition = new (window.webkitSpeechRecognition || window.SpeechRecognition)();
  speechRecognition.continuous = false;
  speechRecognition.interimResults = false;
  speechRecognition.lang = 'he-IL';

  speechRecognition.onstart = () => {
    isListening = true;
    ui.voiceBtn.classList.add('listening');
    ui.voiceBtn.textContent = '🎤 מקשיב...';
    ui.voiceStatus.textContent = 'מקשיב...';
  };

  speechRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    processVoiceInput(transcript);
  };

  speechRecognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    ui.voiceStatus.textContent = 'שגיאה בזיהוי קול';
    resetVoiceButton();
  };

  speechRecognition.onend = () => {
    resetVoiceButton();
  };
}

function startVoiceInput() {
  if (!speechRecognition) {
    ui.voiceStatus.textContent = 'זיהוי קול לא נתמך בדפדפן זה';
    return;
  }

  if (isListening) {
    speechRecognition.stop();
    return;
  }

  try {
    speechRecognition.start();
  } catch (error) {
    console.error('Error starting speech recognition:', error);
    ui.voiceStatus.textContent = 'שגיאה בהפעלת זיהוי קול';
  }
}

function resetVoiceButton() {
  isListening = false;
  ui.voiceBtn.classList.remove('listening');
  ui.voiceBtn.textContent = '🎤 דבר עם RoamWise';
  if (!isSpeaking) {
    ui.voiceStatus.textContent = '';
  }
}

// Text-to-Speech function
function speakText(text, lang = 'he-IL') {
  if (!speechSynthesis) {
    console.log('Text-to-speech not supported');
    return;
  }

  // Stop any current speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 0.8;

  utterance.onstart = () => {
    isSpeaking = true;
    ui.voiceStatus.textContent = '🔊 RoamWise מדבר...';
  };

  utterance.onend = () => {
    isSpeaking = false;
    if (!isListening) {
      ui.voiceStatus.textContent = '';
    }
  };

  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event.error);
    isSpeaking = false;
    ui.voiceStatus.textContent = 'שגיאה בדיבור';
  };

  // Try to find Hebrew voice
  const voices = speechSynthesis.getVoices();
  const hebrewVoice = voices.find(voice => voice.lang.includes('he'));
  if (hebrewVoice) {
    utterance.voice = hebrewVoice;
  }

  speechSynthesis.speak(utterance);
}

async function processVoiceInput(transcript) {
  ui.voiceStatus.textContent = 'מעבד...';
  ui.voiceResponse.hidden = false;
  ui.voiceResponse.textContent = `שמעתי: "${transcript}"`;

  try {
    const center = map.getCenter();
    const response = await post('/voice-to-intent', {
      text: transcript,
      userId,
      location: { lat: center.lat, lng: center.lng }
    });

    ui.voiceResponse.innerHTML = `
      <div><strong>שמעתי:</strong> "${transcript}"</div>
      <div><strong>תגובה:</strong> ${response.conversationResponse}</div>
      <button onclick="speakText('${response.conversationResponse.replace(/'/g, "\\'")}')" class="small secondary" style="margin-top: 8px;">🔊 השמע תגובה</button>
    `;

    // Automatically speak the response
    setTimeout(() => speakText(response.conversationResponse), 500);

    // Track the voice interaction
    await post('/track-interaction', {
      userId,
      placeId: 'voice_' + Date.now(),
      interactionType: 'voice_query',
      rating: null
    });

    // If AI recommendations were triggered, display them
    if (response.actionResult?.recommendations) {
      displayAIRecommendations(response.actionResult.recommendations, response.actionResult.context);
      
      // Speak summary of recommendations
      const recCount = response.actionResult.recommendations.length;
      if (recCount > 0) {
        setTimeout(() => {
          speakText(`מצאתי ${recCount} המלצות עבורך. בדוק את המסך לפרטים נוספים.`);
        }, 3000);
      }
    }

    ui.voiceStatus.textContent = 'הושלם!';
  } catch (error) {
    console.error('Voice processing error:', error);
    ui.voiceResponse.textContent = 'שגיאה בעיבוד הקול';
    ui.voiceStatus.textContent = 'שגיאה';
  }
}

async function getAIRecommendations() {
  ui.aiRecommendBtn.textContent = '⏳ מחפש המלצות...';
  ui.aiRecommendBtn.disabled = true;

  try {
    const center = map.getCenter();
    const mood = ui.moodSelect.value;
    
    const response = await post('/ai-recommendations', {
      lat: center.lat,
      lng: center.lng,
      userId,
      mood,
      timeOfDay: getTimeOfDay(),
      companionType: 'solo' // Could be enhanced with user input
    });

    displayAIRecommendations(response.recommendations, response.context);
    
    // Track the AI recommendation request
    await post('/track-interaction', {
      userId,
      placeId: 'ai_recommendations_' + Date.now(),
      interactionType: 'ai_request',
      rating: null
    });

    ui.aiRecommendBtn.textContent = '✨ קבל המלצות מותאמות אישית';
  } catch (error) {
    console.error('AI recommendations error:', error);
    ui.aiRecommendations.innerHTML = '<div class="ai-recommendation">שגיאה בטעינת המלצות. נסה שוב.</div>';
    ui.aiRecommendations.hidden = false;
    ui.aiRecommendBtn.textContent = '✨ קבל המלצות מותאמות אישית';
  } finally {
    ui.aiRecommendBtn.disabled = false;
  }
}

function displayAIRecommendations(recommendations, context) {
  if (!recommendations || recommendations.length === 0) {
    ui.aiRecommendations.innerHTML = '<div class="ai-recommendation">לא נמצאו המלצות עבור המצב הנוכחי. נסה לשנות את מצב הרוח או המיקום.</div>';
    ui.aiRecommendations.hidden = false;
    return;
  }

  let html = `<div class="ai-context">
    <strong>🎯 הקשר:</strong> מצב רוח: ${getMoodEmoji(context.mood)}, מזג אוויר: ${Math.round(context.weather?.temperature_2m || 0)}°C
  </div>`;

  recommendations.forEach(rec => {
    html += `<div class="ai-recommendation">
      <h4>${getCategoryEmoji(rec.category)} ${getCategoryName(rec.category)}</h4>
      <div class="reason">${rec.reason}</div>`;
    
    rec.places.forEach(place => {
      html += `<div class="place" onclick="showPlaceOnMap(${place.lat}, ${place.lng}, '${place.name}')">
        <div class="place-name">${place.name}</div>
        <div class="place-details">
          ${place.rating ? `⭐ ${place.rating}` : ''} 
          ${place.address ? `• ${place.address}` : ''}
          ${place.openNow !== undefined ? (place.openNow ? ' • פתוח עכשיו' : ' • סגור עכשיו') : ''}
        </div>
      </div>`;
    });
    
    html += '</div>';
  });

  ui.aiRecommendations.innerHTML = html;
  ui.aiRecommendations.hidden = false;
}

function showPlaceOnMap(lat, lng, name) {
  map.setView([lat, lng], 16);
  L.marker([lat, lng]).addTo(resultsLayer).bindPopup(name).openPopup();
}

function getMoodEmoji(mood) {
  const moods = {
    neutral: '😐 רגיל',
    adventurous: '🗺️ הרפתקני', 
    relaxed: '😌 רגוע',
    social: '👥 חברותי',
    romantic: '💕 רומנטי',
    hungry: '🍽️ רעב',
    curious: '🔍 סקרן'
  };
  return moods[mood] || mood;
}

function getCategoryEmoji(category) {
  const categories = {
    restaurant: '🍽️',
    tourist_attraction: '🏛️',
    spa: '🧘',
    museum: '🏛️',
    ice_cream: '🍦'
  };
  return categories[category] || '📍';
}

function getCategoryName(category) {
  const names = {
    restaurant: 'מסעדות',
    tourist_attraction: 'אטרקציות',
    spa: 'ספא ורווחה',
    museum: 'מוזיאונים',
    ice_cream: 'גלידה'
  };
  return names[category] || category;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function onMoodChange() {
  // Could trigger automatic recommendations based on mood change
  const mood = ui.moodSelect.value;
  console.log('Mood changed to:', mood);
}

function toggleAISettings() {
  // Future: Show AI settings panel
  alert('הגדרות AI - בקרוב!');
}

function showVoiceHelp() {
  const helpText = `
🎤 דוגמאות לפקודות קוליות:

• "אני רוצה גלידה עם נוף יפה"
• "מצא לי מסעדה רומנטית לארוחת ערב"
• "איפה יש מוזיאון בקרבת מקום?"
• "מה יש לעשות פה בגשם?"
• "אני מחפש משהו הרפתקני"
• "תכנן לי מסלול לתחנה המרכזית"

הלחץ על כפתור המיקרופון ודבר בעברית! 
RoamWise יבין אותך ויענה גם בקול.
  `;
  
  ui.voiceResponse.innerHTML = `<div style="white-space: pre-line;">${helpText}</div>`;
  ui.voiceResponse.hidden = false;
  
  speakText('אני RoamWise, העוזר החכם שלך לטיולים. תוכל לדבר איתי בעברית ולבקש המלצות על מקומות, מסעדות ופעילויות. נסה לומר משהו כמו: מצא לי גלידה עם נוף יפה!');
}

// Smart Notifications
async function checkSmartNotifications() {
  try {
    const center = map.getCenter();
    const response = await post('/smart-notifications', {
      userId,
      location: { lat: center.lat, lng: center.lng },
      timeContext: { hour: new Date().getHours() }
    });

    displaySmartNotifications(response.notifications);
  } catch (error) {
    console.error('Smart notifications error:', error);
  }
}

function displaySmartNotifications(notifications) {
  if (!notifications || notifications.length === 0) {
    ui.smartNotifications.hidden = true;
    return;
  }

  let html = '';
  notifications.forEach(notif => {
    html += `<div class="notification ${notif.priority}">
      <div class="notification-title">${notif.title}</div>
      <div class="notification-message">${notif.message}</div>
      ${notif.action ? `<button class="notification-action" onclick="handleNotificationAction('${notif.action}', ${JSON.stringify(notif.params).replace(/"/g, '&quot;')})">פעל</button>` : ''}
    </div>`;
  });

  ui.smartNotifications.innerHTML = html;
  ui.smartNotifications.hidden = false;
}

function handleNotificationAction(action, params) {
  if (action === 'ai_recommendations') {
    // Set mood if provided and get recommendations
    if (params.mood) {
      ui.moodSelect.value = params.mood;
    }
    getAIRecommendations();
  }
}

// Initialize smart notifications check
setInterval(checkSmartNotifications, 5 * 60 * 1000); // Every 5 minutes
// Check immediately after location is obtained
setTimeout(checkSmartNotifications, 3000);

// --- Weather helpers ---
async function getWeather(lat, lng){
  const r = await fetch(`${PROXY}/weather`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ lat, lng })
  });
  if (!r.ok) throw new Error('weather');
  const j = await r.json();
  return j.weather;
}

function rainScore(w){
  if (!w) return 0;
  let near6 = 0;
  if (w.hourly?.precipitation_probability && w.hourly?.time){
    const now = new Date();
    const idxs = [];
    for (let i=0; i<w.hourly.time.length; i++){
      const t = new Date(w.hourly.time[i]);
      if (t >= now && idxs.length < 6) idxs.push(i);
    }
    if (idxs.length){
      near6 = Math.max(...idxs.map(i => w.hourly.precipitation_probability[i] ?? 0));
    }
  }
  let todaySum = 0;
  if (w.daily?.precipitation_sum && w.daily?.time){
    todaySum = w.daily.precipitation_sum[0] ?? 0;
  }
  return near6 + (todaySum * 10);
}

function adviseWeather(srcW, dstW, names={src:'כאן', dst:'ביעד'}){
  const s1 = rainScore(srcW), s2 = rainScore(dstW);
  const diff = s2 - s1;
  const arrow = diff <= -10 ? '⬇️' : diff >= 10 ? '⬆️' : '↔️';
  let call = '';
  if (diff <= -10) call = `כדאי לנסוע: יבש יותר ${names.dst}.`;
  else if (diff >= 10) call = `שקול דחייה/תכנית חלופית: צפוי רטוב יותר ${names.dst}.`;
  else call = `דומה בשניהם.`;
  const cur = (w)=> w?.current ? `${Math.round(w.current.temperature_2m)}°C` : '—';
  return `${arrow} ${call} עכשיו ${names.src}: ${cur(srcW)} · ${names.dst}: ${cur(dstW)} (מדד גשם ${Math.round(s1)}→${Math.round(s2)}).`;
}

// Weather Card (current location)
async function updateWeatherCard(lat, lng){
  const w = await getWeather(lat, lng);
  if (!w){ ui.wxDesc.textContent = 'אין נתונים'; return; }
  const t = Math.round(w.current?.temperature_2m ?? 0);
  const hi = w.daily?.temperature_2m_max?.[0];
  const lo = w.daily?.temperature_2m_min?.[0];
  const pop6 = (()=>{
    if (!w.hourly?.precipitation_probability) return null;
    let acc = 0, c=0;
    for (let i=0;i<6 && i<w.hourly.precipitation_probability.length;i++){ acc += (w.hourly.precipitation_probability[i]||0); c++; }
    return c? Math.round(acc/c) : null;
  })();
  ui.wxTemp.textContent = `${t}°`;
  ui.wxDesc.textContent = (w.current?.is_day? 'יום' : 'לילה') + (pop6!=null? ` · גשם בשש השעות הקרובות ~${pop6}%` : '');
  ui.wxHiLo.textContent = `H:${hi!=null?Math.round(hi):'—'}° · L:${lo!=null?Math.round(lo):'—'}°`;
  ui.wxNext.textContent = 'טיפ: גרור את המפה לאזור אחר ולחץ רענן כדי לראות מז״א שם.';
}

// Trip Planning Functionality
let currentTrip = null;
let currentActivity = 0;
let selectedInterests = [];

// Trip planning event listeners
ui.tripToggle.addEventListener('click', () => {
  const isHidden = ui.tripPlanForm.hidden;
  ui.tripPlanForm.hidden = !isHidden;
  ui.tripToggle.textContent = isHidden ? '📋' : '❌';
});

ui.tripDuration.addEventListener('change', (e) => {
  ui.customHoursField.hidden = e.target.value !== 'custom';
});

// Interest chips selection
document.querySelectorAll('.interest-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.preventDefault();
    const interest = e.target.dataset.interest;
    if (selectedInterests.includes(interest)) {
      selectedInterests = selectedInterests.filter(i => i !== interest);
      e.target.classList.remove('selected');
    } else {
      selectedInterests.push(interest);
      e.target.classList.add('selected');
    }
  });
});

ui.planTripBtn.addEventListener('click', async () => {
  if (!here) {
    ui.tripPlanStatus.textContent = 'צריך מיקום תחילה - הפעל מיקום או לחץ על המפה';
    return;
  }

  ui.planTripBtn.disabled = true;
  ui.tripPlanStatus.textContent = 'מתכנן טיול מותאם אישית... 🤖';

  try {
    const duration = ui.tripDuration.value;
    const customHours = duration === 'custom' ? parseInt(ui.customHours.value) : undefined;
    
    const response = await fetch(`${PROXY}/plan-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startLocation: { lat: here.lat, lng: here.lng },
        duration,
        customHours,
        interests: selectedInterests,
        budget: ui.tripBudget.value,
        groupSize: parseInt(ui.groupSize.value),
        mobility: ui.tripMobility.value,
        userId: getUserId()
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      currentTrip = data.tripPlan;
      currentActivity = 0;
      displayTripPlan(data.tripPlan, data.tripId);
      ui.tripPlanStatus.textContent = `נוצר טיול מושלם! 🎯`;
      
      // Track this interaction
      trackInteraction('trip_planned', 'plan_trip', { 
        duration, 
        interests: selectedInterests,
        activities_count: data.tripPlan.activities.length 
      });
    } else {
      ui.tripPlanStatus.textContent = `שגיאה: ${data.error}`;
    }
  } catch (error) {
    ui.tripPlanStatus.textContent = `שגיאה בתכנון: ${error.message}`;
  } finally {
    ui.planTripBtn.disabled = false;
  }
});

function displayTripPlan(tripPlan, tripId) {
  // Clear previous display
  ui.tripPlanDisplay.innerHTML = '';
  ui.tripPlanDisplay.hidden = false;

  // Trip overview
  const overview = document.createElement('div');
  overview.className = 'trip-overview';
  overview.innerHTML = `
    <div class="trip-title">${tripPlan.title}</div>
    <div class="trip-meta">
      <span>💰 ${tripPlan.estimated_cost}</span>
      <span>⏱️ ${tripPlan.activities.length} פעילויות</span>
      <span>📍 מטיול ${tripId.split('_')[1]}</span>
    </div>
    <div class="trip-description">${tripPlan.overview}</div>
  `;
  ui.tripPlanDisplay.appendChild(overview);

  // Activities
  const activitiesContainer = document.createElement('div');
  activitiesContainer.className = 'trip-activities';

  tripPlan.activities.forEach((activity, index) => {
    const activityEl = document.createElement('div');
    activityEl.className = `trip-activity ${index === currentActivity ? 'current' : ''}`;
    activityEl.innerHTML = `
      <div class="activity-header">
        <div class="activity-name">${activity.name}</div>
        <div class="activity-duration">${activity.duration_minutes}ד'</div>
      </div>
      <div class="activity-description">${activity.description}</div>
      ${activity.place ? `
        <div class="activity-place">
          <div class="place-info">
            <div class="place-name">${activity.place.name}</div>
            <div class="place-address">${activity.place.address}</div>
          </div>
          <div class="place-rating">⭐ ${activity.place.rating || 'N/A'}</div>
        </div>
        <div class="activity-actions">
          <button class="activity-btn primary" onclick="navigateToActivity(${index})">🗺️ נווט</button>
          <button class="activity-btn" onclick="viewOnMap(${activity.place.lat}, ${activity.place.lng})">👁️ במפה</button>
          ${activity.place.id ? `<button class="activity-btn" onclick="getPlaceDetails('${activity.place.id}')">ℹ️ פרטים</button>` : ''}
        </div>
      ` : `
        <div class="activity-actions">
          <button class="activity-btn" onclick="searchNearbyForActivity('${activity.name}')">🔍 חפש מקומות</button>
        </div>
      `}
    `;
    activitiesContainer.appendChild(activityEl);
  });

  ui.tripPlanDisplay.appendChild(activitiesContainer);

  // Tips
  if (tripPlan.tips && tripPlan.tips.length > 0) {
    const tipsEl = document.createElement('div');
    tipsEl.className = 'trip-tips';
    tipsEl.innerHTML = `
      <div class="tips-title">💡 טיפים לטיול</div>
      <ul class="tips-list">
        ${tripPlan.tips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    `;
    ui.tripPlanDisplay.appendChild(tipsEl);
  }

  // Start navigation button
  const navStart = document.createElement('button');
  navStart.className = 'primary full-width';
  navStart.style.marginTop = '16px';
  navStart.textContent = '🚀 התחל טיול';
  navStart.onclick = () => startLiveNavigation(tripId);
  ui.tripPlanDisplay.appendChild(navStart);
}

function navigateToActivity(activityIndex) {
  currentActivity = activityIndex;
  updateCurrentActivityDisplay();
  
  const activity = currentTrip.activities[activityIndex];
  if (activity.place) {
    viewOnMap(activity.place.lat, activity.place.lng);
    // Auto-calculate route if we have current location
    if (here) {
      calculateRoute(here, { lat: activity.place.lat, lng: activity.place.lng });
    }
  }
}

function viewOnMap(lat, lng) {
  map.setView([lat, lng], 16);
  // Add a temporary marker
  const marker = L.marker([lat, lng]).addTo(map);
  setTimeout(() => map.removeLayer(marker), 5000);
}

function updateCurrentActivityDisplay() {
  document.querySelectorAll('.trip-activity').forEach((el, index) => {
    el.classList.toggle('current', index === currentActivity);
  });
}

function startLiveNavigation(tripId) {
  ui.liveNavigation.hidden = false;
  ui.liveNavigation.innerHTML = `
    <div class="nav-current">
      <div class="nav-progress">פעילות ${currentActivity + 1} מתוך ${currentTrip.activities.length}</div>
      <div class="nav-destination">${currentTrip.activities[currentActivity].name}</div>
      <div class="nav-instructions">עוקב אחר המיקום ומנווט לפעילות הבאה...</div>
      <div class="nav-actions">
        <button class="nav-btn" onclick="nextActivity('${tripId}')">הבא ✈️</button>
        <button class="nav-btn secondary" onclick="pauseNavigation()">השהה ⏸️</button>
      </div>
    </div>
  `;
  
  // Start location tracking for navigation
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => updateLiveNavigation(tripId, position),
      (error) => console.error('Navigation error:', error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  }
}

async function updateLiveNavigation(tripId, position) {
  const currentLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  try {
    const response = await fetch(`${PROXY}/navigate-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        userId: getUserId(),
        currentLocation,
        currentActivity
      })
    });

    const data = await response.json();
    if (data.ok && data.currentActivity) {
      // Update navigation display with real-time info
      const navEl = ui.liveNavigation.querySelector('.nav-current');
      if (navEl) {
        navEl.querySelector('.nav-instructions').textContent = 
          data.navigation ? `${data.navigation.durationText} · ${data.navigation.distanceText}` : 'מחשב מסלול...';
      }
    }
  } catch (error) {
    console.error('Live navigation error:', error);
  }
}

function nextActivity(tripId) {
  if (currentActivity < currentTrip.activities.length - 1) {
    currentActivity++;
    updateCurrentActivityDisplay();
    navigateToActivity(currentActivity);
    
    // Update live navigation
    const navEl = ui.liveNavigation.querySelector('.nav-current');
    if (navEl) {
      navEl.querySelector('.nav-progress').textContent = `פעילות ${currentActivity + 1} מתוך ${currentTrip.activities.length}`;
      navEl.querySelector('.nav-destination').textContent = currentTrip.activities[currentActivity].name;
    }
  } else {
    // Trip completed
    ui.liveNavigation.innerHTML = `
      <div class="nav-current">
        <div class="nav-destination">🎉 הטיול הושלם!</div>
        <div class="nav-instructions">איך היה? דרג את החוויה שלך</div>
        <div class="nav-actions">
          <button class="nav-btn" onclick="rateTripExperience('${tripId}', 5)">מעולה ⭐⭐⭐⭐⭐</button>
          <button class="nav-btn secondary" onclick="rateTripExperience('${tripId}', 3)">בסדר ⭐⭐⭐</button>
        </div>
      </div>
    `;
  }
}

function pauseNavigation() {
  ui.liveNavigation.hidden = true;
}

function rateTripExperience(tripId, rating) {
  trackInteraction('trip_completed', 'trip_rating', { tripId, rating });
  ui.liveNavigation.innerHTML = `
    <div class="nav-current">
      <div class="nav-destination">תודה על הדירוג! 🙏</div>
      <div class="nav-instructions">נשמח לתכנן לך טיולים נוספים</div>
    </div>
  `;
  setTimeout(() => { ui.liveNavigation.hidden = true; }, 3000);
}

// Mobile Navigation System
function initMobileNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const mobileViews = document.querySelectorAll('.mobile-view');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.dataset.view;
      
      // Update nav active state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Update view active state
      mobileViews.forEach(view => view.classList.remove('active'));
      const targetMobileView = document.querySelector(`[data-view="${targetView}"]`);
      if (targetMobileView) {
        targetMobileView.classList.add('active');
      }
      
      // Special handling for map view
      if (targetView === 'map') {
        setTimeout(() => map.invalidateSize(), 300);
      }
      
      // Add haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    });
  });
}

// Mobile-specific gestures and interactions
function initMobileGestures() {
  let startX, startY, deltaX, deltaY;
  
  // Add swipe gestures for navigation
  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!startX || !startY) return;
    
    deltaX = e.touches[0].clientX - startX;
    deltaY = e.touches[0].clientY - startY;
  }, { passive: true });
  
  document.addEventListener('touchend', () => {
    if (!startX || !startY) return;
    
    // Reset values
    startX = null;
    startY = null;
    deltaX = 0;
    deltaY = 0;
  }, { passive: true });
}

// Enhanced location services for mobile
function initMobileLocationServices() {
  const locationFab = document.getElementById('locationFab');
  
  if (locationFab) {
    locationFab.addEventListener('click', () => {
      if ('geolocation' in navigator) {
        locationFab.classList.add('loading');
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Update map and current location
            map.setView([lat, lng], 15);
            setHere(lat, lng);
            
            // Add haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate([50, 30, 50]);
            }
            
            locationFab.classList.remove('loading');
          },
          (error) => {
            console.error('Location error:', error);
            locationFab.classList.remove('loading');
            
            // Show user-friendly error
            showNotification('לא ניתן לקבל מיקום. אנא בדק הגדרות המיקום.', 'error');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      }
    });
  }
}

// Quick search functionality
function initQuickSearch() {
  const quickSearchInput = document.querySelector('.search-input');
  const quickSearchBtn = document.querySelector('.search-btn');
  
  if (quickSearchInput && quickSearchBtn) {
    quickSearchBtn.addEventListener('click', () => {
      const query = quickSearchInput.value.trim();
      if (query) {
        // Switch to search view and perform search
        document.querySelector('.nav-item[data-view="search"]').click();
        
        // Set the main search input and trigger search
        setTimeout(() => {
          if (ui.freeText) {
            ui.freeText.value = query;
            ui.thinkBtn.click();
          }
        }, 300);
      }
    });
    
    quickSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        quickSearchBtn.click();
      }
    });
  }
}

// Enhanced category cards for mobile
function initMobileCategoryCards() {
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const preset = card.dataset.preset;
      
      // Add visual feedback
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transform = '';
      }, 150);
      
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
      
      // Trigger search based on preset
      if (preset) {
        document.getElementById('intent').value = preset;
        ui.searchBtn.click();
      }
    });
  });
}

// Notification system for mobile
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `mobile-notification ${type}`;
  notification.textContent = message;
  
  notification.style.cssText = `
    position: fixed;
    top: calc(var(--mobile-header-height) + 16px);
    left: 16px;
    right: 16px;
    padding: 16px;
    background: var(--glass);
    backdrop-filter: var(--backdrop-blur);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    color: var(--text-primary);
    z-index: 1000;
    transform: translateY(-100%);
    transition: transform 0.3s ease;
    box-shadow: var(--shadow-lg);
  `;
  
  if (type === 'error') {
    notification.style.borderColor = 'var(--secondary)';
    notification.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 0.2), var(--glass))';
  } else if (type === 'success') {
    notification.style.borderColor = 'var(--success)';
    notification.style.background = 'linear-gradient(135deg, rgba(107, 207, 127, 0.2), var(--glass))';
  }
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto remove
  setTimeout(() => {
    notification.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

// Initialize mobile features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initMobileNavigation();
  initMobileGestures();
  initMobileLocationServices();
  initQuickSearch();
  initMobileCategoryCards();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Accessibility improvements
document.addEventListener('keydown', (e)=>{
  if (e.key === 'k' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); ui.freeText.focus(); }
});
