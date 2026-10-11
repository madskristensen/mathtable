import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../docs/sw.js', import.meta.url), 'utf8');
const base = 'https://example.test/hub/';
const types = { js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png' };
const responseFor = (url) => new Response('asset', { headers: {
  'Content-Type': types[new URL(url).pathname.split('.').pop()] || 'text/html',
} });

function worker(options = {}) {
  const listeners = {};
  const stores = new Map();
  const requests = [];
  const key = (input) => new URL(typeof input === 'string' ? input : input.url, base).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(input) { return store.get(key(input))?.clone(); },
        async put(input, response) {
          if (options.write) await options.write(key(input));
          store.set(key(input), response.clone());
        },
        async delete(input) { return store.delete(key(input)); },
        async keys() { return [...store.keys()].map((url) => new Request(url)); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  let skips = 0;
  let claims = 0;
  const context = vm.createContext({ URL, Request, Response, console, caches,
    fetch: async (input) => {
      requests.push(input);
      return options.fetch ? options.fetch(key(input)) : responseFor(key(input));
    },
    self: { location: { href: base + 'sw.js', origin: new URL(base).origin },
      registration: { scope: base },
      addEventListener(type, listener) { listeners[type] = listener; },
      async skipWaiting() { skips++; }, clients: { async claim() { claims++; } },
    },
  });
  vm.runInContext(source, context);
  const assets = Array.from(vm.runInContext('ASSETS', context));
  const release = vm.runInContext('CACHE_NAME', context);
  function dispatch(type, extra = {}) {
    const lifetime = [];
    let response;
    listeners[type]({ ...extra, waitUntil(promise) { lifetime.push(promise); }, respondWith(promise) { response = promise; } });
    return { lifetime, response, done: () => Promise.all(lifetime) };
  }
  return { stores, requests, caches, assets, release, dispatch, get skips() { return skips; }, get claims() { return claims; } };
}

const request = (path, mode = 'cors') => ({ url: new URL(path, base).href, method: 'GET', mode });

test('required install is complete, bypasses HTTP cache, and waits for user activation', async () => {
  const w = worker();
  const install = w.dispatch('install');
  assert.equal(install.lifetime.length, 1);
  await install.done();
  assert.equal(w.stores.get(w.release).size, w.assets.length);
  assert.equal(w.requests.length, w.assets.length);
  assert.ok(w.requests.every((r) => r.cache === 'reload'));
  assert.equal(w.skips, 0);
  const confirmation = w.dispatch('message', { data: { type: 'SKIP_WAITING' }, ports: [] });
  assert.equal(confirmation.lifetime.length, 1);
  await confirmation.done();
  assert.equal(w.skips, 1);
});

for (const failure of ['404', 'network', 'wrong-type', 'quota']) {
  test(`failed required install (${failure}) removes incomplete release and preserves old caches`, async () => {
    const w = worker({
      fetch: async (url) => {
        if (url.includes('learning.js')) {
          if (failure === '404') return new Response('', { status: 404 });
          if (failure === 'network') throw new Error('offline');
          if (failure === 'wrong-type') return new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } });
        }
        return responseFor(url);
      },
      write: async (url) => {
        if (failure !== 'quota') return;
        if (url.includes('learning.js')) throw new Error('quota');
        await new Promise((done) => setTimeout(done, 5));
      },
    });
    w.stores.set('kids-hub-v65', new Map([['old', new Response('old')]]));
    w.stores.set('other-app-v1', new Map());
    await assert.rejects(w.dispatch('install').done());
    assert.equal(w.stores.has(w.release), false);
    assert.equal(w.stores.get('kids-hub-v65').size, 1);
    assert.equal(w.stores.has('other-app-v1'), true);
    assert.equal(w.skips, 0);
  });
}

test('activation deletes only obsolete application caches', async () => {
  const w = worker();
  for (const name of [w.release, 'kids-hub-v65', 'kids-hub-runtime-v1', 'kids-hub-runtime-v0', 'foreign-cache']) w.stores.set(name, new Map());
  await w.dispatch('activate').done();
  assert.deepEqual([...w.stores.keys()].sort(), ['foreign-cache', 'kids-hub-runtime-v1', w.release].sort());
  assert.equal(w.claims, 1);
});

test('every precached request and navigation is cache-first with zero network revalidation', async () => {
  const w = worker();
  await w.dispatch('install').done();
  w.requests.length = 0;
  for (const asset of [...w.assets, 'deep/link']) {
    const event = w.dispatch('fetch', { request: request(asset, asset === 'deep/link' ? 'navigate' : 'cors') });
    assert.equal(event.lifetime.length, 1);
    assert.equal((await event.response).status, 200);
    await event.done();
  }
  assert.equal(w.requests.length, 0);
});

test('runtime writes and FIFO trimming are inside fetch lifetime, even on cache hits', async () => {
  let releaseWrite;
  let block = false;
  const w = worker({ write: async () => { if (block) await new Promise((done) => { releaseWrite = done; }); } });
  const cache = await w.caches.open('kids-hub-runtime-v1');
  for (let i = 0; i < 60; i++) await cache.put(`runtime-${i}.json`, new Response('old', { headers: { 'Content-Type': 'application/json' } }));
  block = true;
  const event = w.dispatch('fetch', { request: request('runtime-new.json') });
  let settled = false;
  const done = event.done().then(() => { settled = true; });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(settled, false);
  assert.equal((await event.response).status, 200, 'network response does not wait for cache writes');
  releaseWrite();
  assert.equal((await event.response).status, 200);
  await done;
  assert.equal((await cache.keys()).length, 60);
  assert.equal(await cache.match('runtime-0.json'), undefined);
  assert.ok(await cache.match('runtime-new.json'));
  block = false;
  const hit = w.dispatch('fetch', { request: request('runtime-new.json') });
  assert.equal(await (await hit.response).text(), 'asset');
  await hit.done();
  assert.equal(w.requests.length, 2);
});

test('offline misses have explicit responses and unrelated requests are untouched', async () => {
  const w = worker({ fetch: async () => { throw new Error('offline'); } });
  for (const mode of ['cors', 'navigate']) {
    const event = w.dispatch('fetch', { request: request('not-cached', mode) });
    const response = await event.response;
    assert.equal(response.status, 503);
    assert.match(await response.text(), /offline/i);
    await event.done();
  }
  for (const url of ['https://other.test/asset.js', 'https://example.test/another-app/file.js', base + 'sw.js']) {
    const event = w.dispatch('fetch', { request: { url, method: 'GET' } });
    assert.equal(event.response, undefined);
    assert.equal(event.lifetime.length, 0);
  }
  assert.equal(w.dispatch('fetch', { request: { ...request('x'), method: 'POST' } }).response, undefined);
});

test('offline-ready status is based on all required cached entries, not worker registration', async () => {
  const w = worker();
  const messages = [];
  const status = () => w.dispatch('message', { data: { type: 'OFFLINE_STATUS' }, ports: [{ postMessage(data) { messages.push(data); } }] }).done();
  await status();
  assert.equal(messages.at(-1).ready, false);
  await w.dispatch('install').done();
  await status();
  assert.equal(messages.at(-1).ready, true);
  await (await w.caches.open(w.release)).delete(w.assets[3]);
  await status();
  assert.equal(messages.at(-1).ready, false);
});

test('all shell, lazy and transitive module dependencies use the same precached release URLs', async () => {
  const w = worker();
  const urls = new Set(w.assets.map((asset) => new URL(asset, base).href));
  const version = w.release.match(/v(\d+)$/)[1];
  for (const asset of w.assets) {
    const url = new URL(asset, base);
    if (!url.pathname.endsWith('/') && !url.pathname.endsWith('index.html')) assert.equal(url.search, `?v=${version}`);
    const relative = url.pathname.slice(new URL(base).pathname.length) || 'index.html';
    const content = await readFile(new URL('../docs/' + relative, import.meta.url), 'utf8');
    if (!/\.(js|html|json)$/.test(relative)) continue;
    const references = relative.endsWith('.js')
      ? [...content.matchAll(/(?:\bfrom\s*|\bimport\s*\()(['"])([^'"]+\.js(?:\?v=\d+)?)\1/g)].map((m) => m[2])
      : relative.endsWith('.html')
        ? [...content.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1]).filter((s) => !s.startsWith('https:'))
        : JSON.parse(content).icons.map((icon) => icon.src);
    for (const reference of references) assert.ok(urls.has(new URL(reference, url).href), `${relative} dependency not precached: ${reference}`);
  }
});
