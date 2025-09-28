// RoamWise — app.js (with Weather card & compare)
const PROXY = "https://roamwise-proxy-971999716773.europe-west1.run.app"; // e.g. https://roamwise-proxy-xxxxx.a.run.app

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
  wxRefresh: document.getElementById('wxRefresh')
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

// Accessibility improvements
document.addEventListener('keydown', (e)=>{
  if (e.key === 'k' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); ui.freeText.focus(); }
});
