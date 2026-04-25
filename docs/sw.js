const CACHE_NAME = 'kids-hub-v56';
const RUNTIME_CACHE = 'kids-hub-runtime-v1';
const RUNTIME_CACHE_MAX_ENTRIES = 60;

const ASSETS = [
  './',
  './index.html',
  './style.css?v=10',
  './app.js?v=17',
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

// Only same-origin GET responses with one of these content types are runtime-cached.
const RUNTIME_CACHEABLE_TYPES = [
  'text/html',
  'text/css',
  'application/javascript',
  'text/javascript',
  'application/json',
  'image/',
  'font/',
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
  // Note: we intentionally do NOT call self.skipWaiting() here. The page
  // shows an update banner and only sends SKIP_WAITING when the user
  // confirms — that keeps in-flight sessions on a consistent version.
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Allow the page to ask a waiting worker to activate immediately.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Trim a cache to a max number of entries (FIFO).
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

function isRuntimeCacheable(response) {
  if (!response || !response.ok || response.type === 'opaque') return false;
  const ct = response.headers.get('content-type') || '';
  return RUNTIME_CACHEABLE_TYPES.some((t) => ct.includes(t));
}

// Cache-first with stale-while-revalidate:
//  1. Serve from cache immediately if present (fast, works offline).
//  2. In parallel, fetch from the network and refresh the cache for next time.
//  3. If nothing is cached, wait for the network and cache the response.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the service worker script itself — the browser handles its
  // own update check via byte-diffing sw.js.
  if (url.pathname.endsWith('/sw.js')) return;

  e.respondWith(
    (async () => {
      // Check the precache first, then the runtime cache.
      const precache = await caches.open(CACHE_NAME);
      const precached = await precache.match(req);
      const runtime = await caches.open(RUNTIME_CACHE);
      const cached = precached || (await runtime.match(req));

      const networkFetch = fetch(req)
        .then((response) => {
          if (isRuntimeCacheable(response)) {
            // Store a clone in the runtime cache (don't mutate precache).
            const copy = response.clone();
            runtime
              .put(req, copy)
              .then(() => trimCache(RUNTIME_CACHE, RUNTIME_CACHE_MAX_ENTRIES))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })()
  );
});
