// Web push upozornení (KARTA 63) — načíta ho service worker z vite-plugin-pwa (workbox importScripts).
// Telo push: { titul, text, url, tag } z /api/push.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titul: "DEED+", text: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titul || "DEED+", {
    body: d.text || "", tag: d.tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: d.url || "/" }, lang: "sk",
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((okna) => {
    const o = okna.find((w) => w.url.startsWith(self.location.origin));
    if (o) { o.focus(); return o.navigate ? o.navigate(url).catch(() => undefined) : undefined; }
    return self.clients.openWindow(url);
  }));
});
