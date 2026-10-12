/* Service worker di Leo per iPhone: fa funzionare l'app anche offline.
   Mette in cache il guscio dell'app + il pacchetto Leo, e — man mano che
   vengono scaricati — anche i file di Pyodide (il motore Python). */
const CACHE = "leo-iphone-v1";
const CORE = [
  "iphone.html",
  "leo_web.zip",
  "leo_app.webmanifest",
  "img/leo_iphone_icon.png",
  "img/leo_iphone_icon_192.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const cacheabile = url.origin === location.origin ||
                     url.hostname.includes("jsdelivr") ||
                     url.pathname.includes("pyodide");
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((resp) => {
        if (resp && resp.ok && cacheabile) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return resp;
      }).catch(() => caches.match("iphone.html"));
    })
  );
});
