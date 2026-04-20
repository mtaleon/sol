const CACHE_NAME = 'sudoku-v5-final';

const STATIC_ASSETS = [
  './',
  'index.html',
  'app.js',
  'favicon.svg',
  'manifest.json',
  'core/constants.js',
  'core/events.js',
  'core/Board.js',
  'core/Game.js',
  'core/Solver.js',
  'core/Generator.js',
  'platform/IRenderer.js',
  'platform/IInput.js',
  'platform/IStorage.js',
  'platform/Platform.js',
  'platforms/web-dom/Renderer.js',
  'platforms/web-dom/Input.js',
  'platforms/web-dom/Storage.js',
  'platforms/web-dom/styles.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
