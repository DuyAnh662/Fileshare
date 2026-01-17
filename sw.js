const CACHE_NAME = 'fileshare-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/settings.js',
  '/js/icons.js',
  '/js/utils.js',
  '/js/stateManager.js',
  '/js/lootlabs.js',
  '/js/rateLimit.js',
  '/js/api.js',
  '/manifest.json',
  '/manifest-light.json',
  '/manifest-dark.json',
  '/icons/icon-light-192.png',
  '/icons/icon-light-512.png',
  '/icons/icon-dark-192.png',
  '/icons/icon-dark-512.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Helper to clean redirected responses (fix for Safari)
function cleanResponse(response) {
  if (!response || !response.redirected) {
    return response;
  }

  const body = response.body;
  const headers = new Headers(response.headers);
  return new Response(body, {
    headers: headers,
    status: response.status,
    statusText: response.statusText
  });
}

// Fetch event - Network First, fallback to Cache
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Response is valid?
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone response to cache it
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return cleanResponse(response);
      })
      .catch(() => {
        // Network failed, try to get from cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return cleanResponse(response);
            }
            // Optional: Return offline page if needed
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
