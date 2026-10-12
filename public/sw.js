// Offline support for the PWA.
// - Navigations: network-first, so a fresh deploy wins when online; cached shell when offline.
// - The app shell (index.html + every /_expo/... script/style it references) is cached at
//   install time and re-cached on every successful online navigation, so a new deploy's
//   hashed bundle is available offline right after the first online launch.
// - Other same-origin GETs: cache-first.
const VERSION = 'v3';
const CACHE = `tmarlog-${VERSION}`;
const STATIC = ['/manifest.json', '/icon-192.png', '/icon-512.png', '/favicon.ico'];

/** Cache index.html and all local assets it references (hashed JS bundle etc.). */
async function cacheShell(htmlResponse) {
  const cache = await caches.open(CACHE);
  const html = await htmlResponse.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
  await Promise.all(
    [...new Set(assets)].map(async (url) => {
      if (await cache.match(url)) return;
      const res = await fetch(url);
      if (res.ok) await cache.put(url, res);
    }),
  );
  await cache.put('/', htmlResponse);
  // Drop bundles from previous deploys that the current index.html no longer references.
  const keep = new Set(['/', ...assets, ...STATIC]);
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname;
    if (path.startsWith('/_expo/') && !keep.has(path)) await cache.delete(req);
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(STATIC);
      await cacheShell(await fetch('/', { cache: 'no-cache' }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache API responses

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) e.waitUntil(cacheShell(res.clone()));
          return res;
        })
        .catch(async () => (await caches.match('/')) || Response.error()),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
          }
          return res;
        }),
    ),
  );
});
