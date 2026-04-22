const CACHE_NAME = 'kids-hub-v19';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=2',
  './app.js?v=16',
  './manifest.json',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './games/_shared.js',
  './games/addition.js?v=16',
  './games/subtraction.js?v=16',
  './games/multiplication.js?v=16',
  './games/division.js?v=16',
  './games/clock.js?v=16',
  './games/timemath.js?v=16',
  './games/reading.js?v=16',
  './games/flashword.js?v=16',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  if (e.request.url.includes('sw.js')) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
