/* Push handlers, imported into the generated service worker (workbox importScripts).
   Shows the notification and focuses/opens the app on click. */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const scope = self.registration.scope;
  const title = data.title || 'Intent';
  const options = {
    body: data.body || '',
    icon: scope + 'icons/icon-192.png',
    badge: scope + 'icons/icon-192.png',
    tag: data.tag || 'intent',
    data: { url: data.url || scope },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
