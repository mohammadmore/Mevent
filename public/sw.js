/* Mevent service worker: offline app shell, cached data for offline viewing (e.g. tickets at
   the venue), and Web Push notifications. */
const VERSION = 'v2';
const SHELL_CACHE = `mevent-shell-${VERSION}`;
const ASSET_CACHE = `mevent-assets-${VERSION}`;
const API_CACHE = `mevent-api-${VERSION}`;
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
// Never served from cache: they must be live (auth, payments, notification state), or are private
// (identity documents, check-in lists: these must not sit in the browser's HTTP cache).
const NO_CACHE_API = [/^\/api\/auth\//, /^\/api\/payments\//, /^\/api\/push\//, /^\/api\/notifications/, /^\/api\/trip-planner/, /^\/api\/admin\//, /^\/api\/jobs\//,
  /^\/api\/kyc/, /^\/api\/transfers/, /^\/api\/coupons/, /^\/api\/support/, /checkin/];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  const keep = [SHELL_CACHE, ASSET_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Any deep link works offline: the SPA shell routes it.
    event.respondWith(fetch(request).catch(async () => (await caches.match(request)) || caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }
  if (url.pathname.startsWith('/api/') && !NO_CACHE_API.some(re => re.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE));
  }
});

self.addEventListener('message', (event) => {
  // Sent on logout so the next person on this device does not see cached personal data.
  if (event.data === 'CLEAR_USER_DATA') event.waitUntil(caches.delete(API_CACHE));
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = { title: 'Mevent', body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(payload.title || 'Mevent', {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-64.png',
    dir: 'rtl',
    lang: 'fa',
    data: { url: payload.url || '/notifications' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) return client.navigate(target);
        return;
      }
    }
    return self.clients.openWindow(target);
  })());
});
