/* Offline-friendly cache: core pages and assets. Bible books and audio are cached when first requested. */
const VERSION = "jesus-v3";
const CORE = [
  "./",
  "./index.html",
  "./histoire.html",
  "./bible.html",
  "./apropos.html",
  "./css/style.css",
  "./css/style.css?v=3",
  "./css/fonts.css",
  "./css/fonts.css?v=3",
  "./js/app.js",
  "./js/app.js?v=3",
  "./js/bible.js",
  "./js/bible.js?v=3",
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

  const dest = req.destination;
  const isShell = req.mode === "navigate" ||
    dest === "document" || dest === "script" || dest === "style" ||
    /\.(?:html|js|css)$/.test(url.pathname) ||
    /(?:\/)$/.test(url.pathname) ||
    !url.pathname.split("/").pop().includes(".");

  const put = (res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((cache) => cache.put(req, copy));
    }
    return res;
  };

  if (isShell) {
    event.respondWith(
      fetch(req).then(put).catch(() =>
        caches.match(req).then((cached) => cached || caches.match("./index.html"))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchAndCache = fetch(req).then(put).catch(() => cached);
      return cached || fetchAndCache;
    })
  );
});
