/* Service worker di Leo per iPhone: fa funzionare l'app anche offline.
   Mette in cache il guscio dell'app + il pacchetto Leo, e — man mano che
   vengono scaricati — anche i file di Pyodide (il motore Python). */
const CACHE = "leo-iphone-v2";
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
  const motore = url.hostname.includes("jsdelivr") || url.pathname.includes("pyodide");
  const guscio = url.origin === location.origin &&
                 CORE.some((f) => url.pathname.endsWith("/" + f));
  if (motore || guscio) {
    // il guscio dell'app e il motore: prima dalla cache (funziona offline)
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return resp;
      }).catch(() => caches.match("iphone.html")))
    );
    return;
  }
  if (url.origin !== location.origin) return;
  // le altre pagine del sito: prima dalla rete (sempre aggiornate), la cache solo senza rete
  e.respondWith(
    fetch(req).then((resp) => {
      if (resp && resp.ok) {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
      }
      return resp;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match("iphone.html")))
  );
});
