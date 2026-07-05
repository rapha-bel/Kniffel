/* Kniffel Block – Service Worker für Offline-Betrieb */
const CACHE = 'kniffel-v2';
const ASSETS = [
  './',
  './index.html',
  './kniffel.html',
  './kniffel.js',
  './tutto.html',
  './tutto.js',
  './styles.css',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Kern-Dateien (Seite, Skript, Stil): network-first -> online immer aktuell,
  // offline aus dem Cache. Icons/Bilder: cache-first (schnell, ändern sich selten).
  const isCore = e.request.mode === 'navigate' || /\.(?:html|css|js|json)$/.test(url.pathname);

  if (isCore) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }))
    );
  }
});
