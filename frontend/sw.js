const CACHE_NAME = 'npc-mode-v1';
const STATIC_ASSETS = [
  '/frontend/index.html',
  '/frontend/input.html',
  '/frontend/style.css',
  '/frontend/app.js',
  '/frontend/input.js',
  '/frontend/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 只快取前端靜態資源；API 請求直接走網路
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
