/* Offline-friendly cache: core pages and assets. Bible books and audio are cached when first requested. */
const VERSION = "jesus-v2";
const CORE = [
  "./",
  "./index.html",
  "./histoire.html",
  "./bible.html",
  "./apropos.html",
  "./css/style.css",
  "./css/fonts.css",
  "./js/app.js",
  "./js/bible.js",
  "./data/books.json",
  "./img/logo.svg",
  "./favicon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isHtml = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    /(?:\.html|\/)$/.test(url.pathname) ||
    !url.pathname.split("/").pop().includes(".");

  const put = (res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(req, copy));
    }
    return res;
  };

  if (isHtml) {
    event.respondWith(fetch(req).then(put).catch(() => caches.match(req)));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchAndCache = fetch(req).then(put).catch(() => cached);
      return cached || fetchAndCache;
    })
  );
});
