/**
 * Neev FLN Assessor - Service Worker
 * Implements offline-first caching strategy for static assets and Tailwind CDN.
 */

const CACHE_NAME = 'neev-fln-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/index.css',
    '/js/core/db.js',
    '/js/features/speech.js',
    '/js/features/grading.js',
    '/js/core/sync.js',
    '/js/core/app.js',
    '/manifest.json',
    'https://cdn.tailwindcss.com' // Tailwind offline caching
];

// Install Event: Cache essential files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache, adding assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Stale-While-Revalidate
self.addEventListener('fetch', event => {
    // We don't cache POST/PATCH REST API calls
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchedResponse = fetch(event.request).then(networkResponse => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // Return offline fallback if network fails
                    if (!cachedResponse && event.request.mode === 'navigate') {
                        return cache.match('/index.html');
                    }
                });
                return cachedResponse || fetchedResponse;
            });
        })
    );
});

// Background Sync Event for Offline Data Uploads
self.addEventListener('sync', event => {
    if (event.tag === 'sync-assessments') {
        console.log('Background Sync triggered for assessments.');
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'TRIGGER_SYNC' }));
            })
        );
    }
});
