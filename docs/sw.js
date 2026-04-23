const CACHE_NAME = 'kids-hub-v50';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=5',
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
  './games/usstates.js?v=2',
  './games/europe.js?v=9',
  './games/worldhistory.js?v=1',
  './games/ushistory.js?v=1',
  './games/mythology.js?v=1',
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

// Allow the page to ask a waiting worker to activate immediately.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache-first with stale-while-revalidate:
//  1. Serve from cache immediately if present (fast, works offline).
//  2. In parallel, fetch from the network and refresh the cache for next time.
//  3. If nothing is cached, wait for the network and cache the response.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  // Never cache the service worker script itself — the browser handles its
  // own update check via byte-diffing sw.js.
  if (e.request.url.includes('sw.js')) return;

  e.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(e.request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
