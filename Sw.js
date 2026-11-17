// Service worker de la app de almacén: deja abrirla sin cobertura.
// Guarda la propia página y el lector de códigos; nunca guarda las llamadas al servidor (n8n/Holded).
const VERSION = 'alm-v4-1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    try { await c.put(ZXING, await fetch(ZXING, { mode: 'no-cors' })); } catch (err) {}
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.url === ZXING) {
    e.respondWith(caches.match(req.url).then(hit => hit || fetch(req)));
    return;
  }
  if (url.origin !== self.location.origin) return;   // API y demás: directo a la red
  // Red primero (siempre la versión más nueva) y, si no hay cobertura, la guardada
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) { const c = await caches.open(VERSION); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      const hit = (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await caches.match('index.html') : null);
      if (hit) return hit;
      throw err;
    }
  })());
});
