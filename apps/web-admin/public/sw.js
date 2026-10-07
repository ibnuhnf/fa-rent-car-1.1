/* global self, caches */
const CACHE_NAME = 'fa-admin-v1';
const SHELL_ROUTES = ['/', '/login', '/armada', '/booking'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ROUTES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Network-first for API requests, no caching for sensitive/admin data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first with cache fallback for navigation and static shell routes
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (SHELL_ROUTES.includes(url.pathname) || request.mode === 'navigate')) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((res) => res || caches.match('/')))
  );
});
