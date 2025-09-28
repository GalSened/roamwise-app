const CACHE = "roamwise-v2";
const ASSETS = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest"];
self.addEventListener("install", (e)=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener("activate", (e)=>{ e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); });
self.addEventListener("fetch", (e)=>{
  const url = new URL(e.request.url);
  if (ASSETS.some(a => url.pathname.endsWith(a.replace("./","/")))) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); return;
  }
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
