'use strict';

const CACHE_NAME = 'electionguide-ai-app-shell-v1';
const STATIC_ASSETS = ['/', '/css/style.css', '/js/app.js', '/js/chat.js', '/manifest.webmanifest', '/icons/icon.svg'];
const STATIC_ASSET_PATHS = new Set(STATIC_ASSETS);

function isAppShellRequest(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin && STATIC_ASSET_PATHS.has(url.pathname);
}

async function handleAppShellRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw err;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (!isAppShellRequest(event.request)) {
    return;
  }

  event.respondWith(handleAppShellRequest(event.request));
});
