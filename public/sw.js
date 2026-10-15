/* GITDM service worker — offline shell + push foundation */
const CACHE = "gitdm-shell-v1";
const SHELL = ["/", "/install", "/campus", "/site.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).catch(() => caches.match("/")))
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "GITDM", body: "You have a campus update." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "GITDM", {
      body: data.body || "",
      icon: "/web-app-manifest-192x192.png",
      badge: "/favicon-96x96.png",
      data: data.url || "/campus",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/campus";
  event.waitUntil(clients.openWindow(url));
});
