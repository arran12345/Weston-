/*
 * Deliberately network-only: no caching at all.
 *
 * A service worker exists solely because Chrome requires one with a fetch
 * handler before it will offer to install the app. Caching would be actively
 * harmful here — a stale balance or an out-of-date net worth figure is worse
 * than an error message, and the whole point of the app is not lying about
 * the numbers. Offline would buy nothing anyway, since the data lives on the
 * machine running the server rather than on the phone.
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
