
// ============================================================
//  Booha Adventure — Service Worker
//  sw.js
// ============================================================

const CURRENT_CACHES = {
  pages:  'booha-pages-2026-18',
  assets: 'booha-assets-2026-18',
  decks:  'booha-decks-2026-18',
};

const PAGE_CACHE  = CURRENT_CACHES.pages;
const ASSET_CACHE = CURRENT_CACHES.assets;
const DECK_CACHE  = CURRENT_CACHES.decks;

const BASE = '/the-booha-adventure';

// ── Core pages ───────────────────────────────────────────────
const CORE_FILES = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/adventure-profile.html`,
  `${BASE}/booha_blocks.html`,
  `${BASE}/booha_invaders.html`,
  `${BASE}/feed_booha.html`,
  `${BASE}/booha_destruction.html`,
  `${BASE}/game.html`,
  `${BASE}/homework.html`,
  `${BASE}/karasuki.html`,
  `${BASE}/happy_house.html`,
  `${BASE}/liar_machine.html`,
  `${BASE}/mister_happys_snap_test.html`,
  `${BASE}/maze.html`,
  `${BASE}/study-deck.html`,
  `${BASE}/utsuroba.html`,
  `${BASE}/curriculum/bc/games-index.html`,
  `${BASE}/curriculum/bc/study-index.html`,
  `${BASE}/curriculum/br/games-index.html`,
  `${BASE}/curriculum/br/study-index.html`,
  `${BASE}/curriculum/pb/games-index.html`,
  `${BASE}/curriculum/pb/study-index.html`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/icon-maskable-512.png`,
];

// ── Asset folder prefixes (matched at runtime) ───────────────
const ASSET_PREFIXES = [
  `${BASE}/js/`,
  `${BASE}/theme/`,
  `${BASE}/audio/`,
  `${BASE}/icons/`,
  `${BASE}/assets/`,
];

// ── Study deck / content patterns ────────────────────────────
const DECK_PATTERNS = [
  /\/the-booha-adventure\/content\//,
  /\.json$/,
];

// ============================================================
//  INSTALL — pre-cache core files
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching core files');
        return cache.addAll(CORE_FILES);
      })
      .catch((err) => {
        console.warn('[SW] Some core files could not be cached:', err);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
//  ACTIVATE — clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  const expectedCacheNamesSet = new Set(Object.values(CURRENT_CACHES));

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => !expectedCacheNamesSet.has(cacheName))
            .map((cacheName) => {
              console.log('[SW] Cleaning up obsolete cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================================
//  FETCH — routing strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  const path = url.pathname;

  // Only handle requests under our base path
  if (!path.startsWith(BASE)) return;

  // ── Study decks / JSON → Cache-first, then network ───────
  if (DECK_PATTERNS.some((pattern) => pattern.test(path))) {
    event.respondWith(cacheFirst(request, DECK_CACHE));
    return;
  }

  // ── Static assets → Cache-first, then network ────────────
  if (ASSET_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // ── HTML pages → Network-first, fall back to cache ───────
  if (
    request.headers.get('accept')?.includes('text/html') ||
    path.endsWith('.html') ||
    path === `${BASE}/`
  ) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  // ── Everything else → Stale-while-revalidate ─────────────
  event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
});

// ============================================================
//  Strategy helpers
// ============================================================

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || await fetchPromise || offlineFallback(request);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || offlineFallback(request);
  }
}

async function offlineFallback(request) {
  if (request.headers.get('accept')?.includes('text/html')) {
    const cache = await caches.open(PAGE_CACHE);
    return (
      await cache.match(`${BASE}/index.html`)
    ) || new Response(
      '<h1>Booha Adventure — Offline</h1><p>Please connect to the internet to load this page for the first time.</p>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  return new Response('Offline', { status: 503 });
}

// ============================================================
//  MESSAGE
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.payload ?? [];
    event.waitUntil(
      caches.open(ASSET_CACHE).then((cache) => cache.addAll(urls))
    );
  }
});
