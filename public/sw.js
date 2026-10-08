const CACHE = 'kiri-pwa-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    '/offline.html', '/icons/kiri-192.png', '/icons/kiri-512.png',
  ])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('kiri-pwa-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
// Keep the app and all database/auth requests on the network to avoid stale data.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/icons/kiri-192.png' || url.pathname === '/icons/kiri-512.png') {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
    return;
  }
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
