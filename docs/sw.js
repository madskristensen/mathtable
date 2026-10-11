const CACHE_NAME = 'kids-hub-v68';
const CACHE_PREFIX = 'kids-hub-';
const RUNTIME_CACHE = 'kids-hub-runtime-v1';
const RUNTIME_CACHE_MAX_ENTRIES = 60;

const ASSETS = [
  './',
  './index.html',
  './style.css?v=68',
  './app.js?v=66',
  './learning.js?v=66',
  './manifest.json?v=66',
  './favicon.svg?v=66',
  './icon-192.png?v=66',
  './icon-512.png?v=66',
  './games/_shared.js?v=66',
  './games/addition.js?v=66',
  './games/subtraction.js?v=66',
  './games/multiplication.js?v=66',
  './games/division.js?v=66',
  './games/clock.js?v=66',
  './games/timemath.js?v=66',
  './games/reading.js?v=66',
  './games/flashword.js?v=66',
  './games/usstates.js?v=66',
  './games/europe.js?v=66',
  './games/worldhistory.js?v=66',
  './games/ushistory.js?v=66',
  './games/mythology.js?v=66',
  './games/data/us-states.js?v=66',
  './games/data/us-states.svg?v=66',
  './games/data/europe.js?v=66',
  './games/data/europe.svg?v=66',
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
  e.waitUntil((async () => {
    try {
      // Fetch and validate the entire required release before publishing it.
      // Bypass the HTTP cache so an old unversioned shell cannot enter it.
      const responses = await Promise.all(ASSETS.map(async (asset) => {
        const response = await fetch(new Request(new URL(asset, self.location.href), { cache: 'reload' }));
        if (!response.ok || response.redirected || !hasExpectedType(asset, response)) {
          throw new Error(`Required offline asset unavailable: ${asset}`);
        }
        return response;
      }));
      const cache = await caches.open(CACHE_NAME);
      // Settle all writes before cleanup, including when a quota write fails.
      const writes = await Promise.allSettled(ASSETS.map((asset, index) => cache.put(asset, responses[index])));
      if (writes.some((result) => result.status === 'rejected')) throw new Error('Offline cache write failed');
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
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
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Allow the page to ask a waiting worker to activate immediately.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  } else if (event.data?.type === 'OFFLINE_STATUS' && event.ports[0]) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const present = await Promise.all(ASSETS.map((asset) => cache.match(asset)));
      event.ports[0].postMessage({ type: 'OFFLINE_STATUS', ready: present.every(Boolean), release: CACHE_NAME });
    })());
  }
});

function hasExpectedType(asset, response) {
  const pathname = new URL(asset, self.location.href).pathname;
  const type = response.headers.get('content-type') || '';
  if (pathname.endsWith('.js')) return /^(application|text)\/javascript\b/i.test(type);
  if (pathname.endsWith('.css')) return /^text\/css\b/i.test(type);
  if (pathname.endsWith('.json')) return /^(application\/json|application\/manifest\+json)\b/i.test(type);
  if (/\.(svg|png)$/.test(pathname)) return /^image\//i.test(type);
  return /^text\/html\b/i.test(type);
}

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

function offlineResponse(request) {
  const html = request.mode === 'navigate';
  return new Response(html
    ? '<!doctype html><meta name="viewport" content="width=device-width"><title>Offline</title><h1>You are offline</h1><p>Reconnect to finish installing Kids Learning Hub, then try again.</p>'
    : 'Offline: this resource is not available.', {
    status: 503,
    headers: { 'Content-Type': html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8' },
  });
}

// Required release assets are immutable cache-first. Only incidental runtime
// resources revalidate; their writes and FIFO trimming extend event lifetime.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the service worker script itself — the browser handles its
  // own update check via byte-diffing sw.js.
  if (url.pathname.endsWith('/sw.js')) return;

  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;

  const work = (async () => {
    const precache = await caches.open(CACHE_NAME);
    const precached = await precache.match(req.mode === 'navigate' ? './index.html' : req);
    if (precached) return { response: precached };
    const runtime = await caches.open(RUNTIME_CACHE);
    const cached = await runtime.match(req);
    const networkFetch = fetch(req).catch(() => cached || offlineResponse(req));
    const completion = networkFetch.then(async (response) => {
      if (isRuntimeCacheable(response)) {
        try {
          await runtime.put(req, response.clone());
          await trimCache(RUNTIME_CACHE, RUNTIME_CACHE_MAX_ENTRIES);
        } catch (error) {
          console.warn('Runtime cache write failed', error);
        }
      }
    });
    return { response: cached || networkFetch, completion };
  })().catch(async () => ({ response: await fetch(req).catch(() => offlineResponse(req)) }));
  e.respondWith(work.then((result) => result.response));
  e.waitUntil(work.then((result) => result.completion));
});
