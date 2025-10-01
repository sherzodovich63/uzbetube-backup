self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => clients.claim());

// HLS va Next build assetlarini cache'lamaymiz
const shouldBypass = (url) =>
  url.pathname.startsWith('/_next/') ||
  url.pathname.endsWith('.m3u8') ||
  url.pathname.endsWith('.ts');

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (shouldBypass(url)) return;

  e.respondWith((async () => {
    try {
      const fresh = await fetch(e.request);
      return fresh;
    } catch {
      const cache = await caches.open('offline-v1');
      const hit = await cache.match(e.request);
      return hit || new Response('Offline', { status: 503 });
    }
  })());
});
