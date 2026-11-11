// Service worker: lets the app open with no internet after the first visit.
//
// - The page itself (index.html) is fetched fresh when online, so updates
//   show up straight away, and the saved copy is used when offline.
// - Everything else (code, pictures, icons) is saved the first time it's
//   loaded and served from the saved copy after that. Built code files have
//   a unique name per version, so a saved copy is never stale.
//
// Nothing ever leaves the device: this only caches the app's own files.

const CACHE = 'drawing-toy-v3'; // bump to refresh saved pictures and icons that keep the same name

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Network first for the page, fall back to the saved copy.
    // 'no-cache' = always ask the server if there's a newer page (GitHub
    // otherwise lets the browser reuse an old copy for 10 minutes).
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  // Cache first for everything else.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
