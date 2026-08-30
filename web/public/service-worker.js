const CACHE_NAME = "mimi-pwa-2026-08-29-v21";
const CORE_FILES = [
  "./",
  "./main.js",
  "./manifest.webmanifest",
  "./tokens.css",
  "./style.css",
  "./icons/mimi.svg",
  "./icons/mimi-192.png",
  "./icons/mimi-512.png",
  "./word-bank-v1.txt",
  "./word-bank-v2.txt",
];

self.addEventListener("install", (event) => {
  // Do not skipWaiting automatically: a new worker waits so the page can offer
  // an explicit "refresh to update" prompt, then activates on SKIP_WAITING.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch (error) {
        // ignoreSearch so cache-busting query strings (e.g. icons/mimi.svg?v=2)
        // still resolve to the precached asset when offline.
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match("./");
        throw error;
      }
    })(),
  );
});
