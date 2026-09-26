const CACHE_NAME = 'resqmesh-shell-v7';
const APP_FILES = [
  './',
  './index.html',
  './css/main.css',
  './css/console.css',
  './css/mesh.css',
  './css/citizen.css',
  './css/assistant.css',
  './css/modals.css',
  './js/bloom-filter.js',
  './js/audio.js',
  './js/data.js',
  './js/offline-store.js',
  './js/state.js',
  './js/trust-engine.js',
  './js/route-planner.js',
  './js/resource-matcher.js',
  './js/knowledge-graph.js',
  './js/cap-alert.js',
  './js/crypto-inspector.js',
  './js/mesh-simulator.js',
  './js/demo-controller.js',
  './js/assistant.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('resqmesh-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (request.method !== 'GET' || requestUrl.origin !== scopeUrl.origin || !requestUrl.pathname.startsWith(scopeUrl.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(new URL('index.html', scopeUrl), copy));
      return response;
    }).catch(async () => (await caches.match(new URL('index.html', scopeUrl))) || Response.error()));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
