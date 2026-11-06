/* Mevent service worker: offline app shell, cached data for offline viewing (e.g. tickets at
   the venue), and Web Push notifications. */
const VERSION = 'v3';
// The app may live under a sub-path (https://host/mevent): this worker's scope says which.
// BASE is "" at the domain root, otherwise e.g. "/mevent"; app paths below are root-relative.
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const appPath = (pathname) => (BASE && (pathname === BASE || pathname.startsWith(BASE + '/')) ? pathname.slice(BASE.length) || '/' : pathname);
const SHELL_CACHE = `mevent-shell-${VERSION}`;
const ASSET_CACHE = `mevent-assets-${VERSION}`;
const API_CACHE = `mevent-api-${VERSION}`;
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'].map(u => BASE + u);
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
  const path = appPath(url.pathname);

  if (request.mode === 'navigate') {
    // Any deep link works offline: the SPA shell routes it.
    event.respondWith(fetch(request).catch(async () => (await caches.match(request)) || caches.match(BASE + '/')));
    return;
  }
  if (path.startsWith('/assets/') || path.startsWith('/icons/') || path.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }
  if (path.startsWith('/api/') && !NO_CACHE_API.some(re => re.test(path))) {
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
    icon: BASE + '/icons/icon-192.png',
    badge: BASE + '/icons/badge-64.png',
    dir: 'rtl',
    lang: 'fa',
    data: { url: payload.url || '/notifications' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // The push payload carries an app path ("/events/3"); put it under the base path.
  const appUrl = String(event.notification.data?.url || '/');
  const target = new URL(appUrl.startsWith('/') && !appUrl.startsWith('//') ? BASE + appUrl : appUrl, self.location.origin).href;
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
