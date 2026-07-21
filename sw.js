/**
 * Neev FLN Assessor - Service Worker
 * Implements offline-first caching strategy for static assets and Tailwind CDN.
 */

const CACHE_NAME = 'neev-fln-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/index.css',
    '/db.js',
    '/speech.js',
    '/grading.js',
    '/sync.js',
    '/app.js',
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

// Fetch Event: Cache First, then Network
self.addEventListener('fetch', event => {
    // We don't cache POST/PATCH REST API calls
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then(networkResponse => {
                return networkResponse;
            }).catch(() => {
                // Return offline fallback if network fails
                return caches.match('/index.html');
            });
        })
    );
});
