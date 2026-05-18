// ============================================================================
// service-worker.js — Cache complet pour fonctionnement 100% offline
// ============================================================================

const CACHE_VERSION = 'tracker-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/program.js',
  './js/workout.js',
  './js/stats.js',
  './js/exercises.js',
  './icons/icon-120.png',
  './icons/icon-152.png',
  './icons/icon-167.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// Install : pré-cache tout
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // addAll échoue si UNE seule ressource échoue → on filtre les erreurs CDN
      return Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('SW skip', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : cache-first, fallback réseau, puis index.html en dernier recours
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache "à la volée" les ressources réussies
        if (response && response.status === 200 && response.type !== 'opaque') {
          const respClone = response.clone();
          caches.open(CACHE_VERSION).then(c => {
            try { c.put(event.request, respClone); } catch (e) {}
          });
        }
        return response;
      }).catch(() => {
        // Offline et pas en cache → fallback sur index pour les navigations
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
