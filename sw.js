const CACHE = 'moneda-v5';
const ASSETS = ['./', './index.html', './app.js', './manifest.json', './icon.png', './icon-192.png', './icon-180.png', './img/cl500_h.jpg', './img/cl500_t.jpg', './img/cl100_h.jpg', './img/cl100_t.jpg', './img/cl10_h.jpg', './img/cl10_t.jpg', './img/gbp1_h.jpg', './img/gbp1_t.jpg', './img/usq_h.jpg', './img/usq_t.jpg', './img/eur1_h.jpg', './img/eur1_t.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
