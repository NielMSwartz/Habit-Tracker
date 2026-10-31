/**
 * public/sw.js — Chromatic's service worker
 * ---------------------------------------------------------------------------
 * Three jobs:
 *
 * 1. **Installable shell** — icons, the manifest and a branded offline page
 *    are cached on install so the app opens without a connection.
 * 2. **Offline navigation** — successful page loads are cached as they happen.
 *    When the network is unavailable the last copy is served, or the offline
 *    page if this route has never been visited.
 * 3. **Notifications** — shows Web Push reminders and focuses an existing tab
 *    (or opens one) when a notification is clicked.
 *
 * The file is deliberately plain JavaScript: it runs in the browser, outside
 * the Next.js build, and is served straight from `public/`.
 */

/** The cache version. Bump it to invalidate every cached file. */
const CACHE_NAME = "chromatic-v2";

/** Small, public files that are precached when the worker installs. */
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/badge.png",
];

/** Installs the worker and pre-caches the public shell. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // Cache each file independently: one missing icon must not prevent
        // the whole service worker from installing.
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

/** Removes old caches and takes control of open pages. */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Messages from the app: clear account data on sign-out. */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHES") {
    event.waitUntil(caches.delete(CACHE_NAME));
  }
});

/** Network-first navigation with an offline fallback. */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    // Only cache clean, same-origin documents. Redirects (for example "/" to
    // "/dashboard") are stored under their final URL by the browser instead.
    if (response.ok && response.type === "basic" && !response.redirected) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match("/offline");
    if (fallback) return fallback;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Offline</title><body style='font-family:system-ui;padding:2rem'><h1>You are offline</h1><p>Reconnect and try again.</p></body>",
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
    );
  }
}

/** Cache-first for static assets, with a background refresh. */
async function handleAsset(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API calls, auth routes and server actions always go to the network.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleAsset(request));
});

/** Shows a push notification, with safe defaults. */
self.addEventListener("push", (event) => {
  let payload = {
    title: "Chromatic",
    body: "You have a habit waiting for you.",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge.png",
    tag: "chromatic-reminder",
    data: { url: "/dashboard" },
  };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // The payload was not JSON — keep the defaults.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      vibrate: payload.vibrate || [120, 60, 120],
      data: payload.data || { url: "/dashboard" },
      requireInteraction: false,
    }),
  );
});

/** Focuses an existing tab on click, or opens the target URL. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target =
    (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          try {
            if (new URL(client.url).pathname === target && "focus" in client) {
              return client.focus();
            }
          } catch {
            // Ignore malformed client URLs.
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
        return undefined;
      }),
  );
});
