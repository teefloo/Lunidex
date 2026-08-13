// Extends the Workbox-generated service worker (via workboxOptions.importScripts
// in next.config.ts) with Web Push support: showing incoming notifications and
// focusing/opening the relevant tab when the user clicks one.

// Runtime page and JavaScript caches intentionally use versioned names in
// next.config.ts. Remove the previous names when an updated worker activates so
// a cached document cannot request chunk hashes from an older deployment.
const OBSOLETE_RUNTIME_CACHES = ['pages', 'next-static-js', 'next-static-css'];

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => OBSOLETE_RUNTIME_CACHES.includes(cacheName))
          .map((cacheName) => caches.delete(cacheName)),
      ),
    ),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Lunidex', body: event.data.text() };
  }

  const title = payload.title || 'Lunidex';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
