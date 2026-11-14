// Service worker: lets "גלגל הלבשה" be installed and play offline.
// Network first (always fresh when online), falling back to the cache.
const CACHE = 'galgal-halbasha-v1';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-64.png',
    './src/audio.js',
    './src/clothes.js',
    './src/door.js',
    './src/girl.js',
    './src/icons.js',
    './src/items.js',
    './src/main.js',
    './src/motifs.js',
    './src/patterns.js',
    './src/pets.js',
    './src/room.js',
    './src/scenes/dressUpScene.js',
    './src/scenes/wheelScene.js',
    './src/sky.js',
    './src/spider.js',
    './src/themes.js',
    './src/thumbs.js',
    './src/toon.js',
    './src/wheel.js',
    './src/world.js',
  'https://unpkg.com/three@0.170.0/build/three.module.js',
  'https://unpkg.com/three@0.170.0/examples/jsm/effects/OutlineEffect.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })),
  );
});
