const CACHE = 'ndiggel-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
];

// Installation : précache les assets essentiels
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activation : supprime les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : cache-first pour assets, network-first pour navigation
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer : API externe, Supabase, PayTech, backend
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation SPA → essayer le réseau, sinon index.html du cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets statiques → cache first, puis réseau
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Mise à jour immédiate quand une nouvelle version est disponible
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
