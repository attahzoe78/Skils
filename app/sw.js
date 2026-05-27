// SisiPay Service Worker — offline-first PWA
const CACHE = 'sisipay-v3';
const CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

// Install: cache core assets + Chart.js
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled([
        c.addAll(CORE),
        fetch(CHART_CDN).then(r => r.ok && c.put(CHART_CDN, r)).catch(() => {}),
      ])
    ).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin, network-first for CDN
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // CDN resources — cache first
  if (url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // App files — cache first, then network, then offline page
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        if (res.ok && url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// Background sync placeholder (for future API sync)
self.addEventListener('sync', e => {
  if (e.tag === 'sync-data') {
    e.waitUntil(Promise.resolve());
  }
});
