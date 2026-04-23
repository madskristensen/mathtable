const CACHE_NAME = 'kids-hub-v43';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=3',
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
  './games/usstates.js?v=1',
  './games/uscapitals.js?v=1',
  './games/europe.js?v=8',
  './games/data/us-states.js',
  './games/data/us-states.svg?v=1',
  './games/data/europe.js',
  './games/data/europe.svg?v=1',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Try a fast bulk add first; if any single asset 404s, fall back to
      // adding them individually so one bad URL doesn't abort the whole
      // install and leave the app without an offline cache.
      cache.addAll(ASSETS).catch(() =>
        Promise.all(ASSETS.map((a) => cache.add(a).catch(() => null)))
      )
    )
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
