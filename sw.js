
// ============================================================
//  Booha Adventure — Service Worker - I blast the pages/assets/decks in current_cache
//  sw.js
// ============================================================

const CURRENT_CACHES = {
  // Profile consolidation Pass 1: ship the canonical progress page and its
  // moved progress renderer to returning players.
  pages:  'booha-pages-2026-372',
  // js/ is served cache-first (see ASSET_PREFIXES below), so once a device
  // caches a script it never re-fetches it until this string changes.
  // Profile consolidation Pass 1: profile-progress.js is a new cache-first
  // asset, so invalidate the previous script bundle.
  // Connected-doors pass: bumped for js/karasuki.js's UTSUROBA_LOCKED_COPY
  // wording fix. Bump this string on every future /js/-touching fix, not
  // just this one.
  // Wanderer furigana pass (js/karasuki.js), bumped per batch since each
  // lands as its own commit and prior bumps keep shipping to origin/main
  // before the next batch is ready: -351 (Pass 1+2), -352 (Pass 3), -353
  // (committed before Pass 4 landed) — this bump is for Pass 4, the final
  // batch (all 36 wanderers now covered).
  // Wanderer collection profile renderer (Pass 4).
  // Profile Pass 1: remove floating world doors and ship the shared SVG icon set.
  // Shared index assets are now used by all migrated pages; invalidate the
  // prior PNG-serving asset cache after the 22F WebP migration.
  // Karasuki 24A/24B/24C/24D: room, wanderer, and Observer artwork now use
  // genuine transparent WebP assets without duplicate Observer copies.
  // Karasuki 24E also migrates its shared popup/profile artwork.
  // Karasuki 24F gives first-time Wanderer discoveries a gold sparkle state.
  // Utsuroba 25A converts its 15 room backgrounds to genuine WebP.
  // Utsuroba 25B converts its 12 transparent drifter sprites to lossless WebP.
  // Utsuroba 25C defers drifter and dance artwork requests until needed.
  // Utsuroba 25D converts its three transparent dance poses to lossless WebP.
  // Muenba 26A converts its 15 room backgrounds to genuine WebP.
  // Muenba 26B converts its seven transparent ghost sprites to lossless WebP.
  // Muenba 26C converts its remaining transparent support art to lossless WebP.
  // Muenba 26D fixes and defers the shared WebP dance art until celebration.
  // Muenba 26F adds longer textured procedural danger voices to the shared SFX script.
  // Destruction goofy-SFX pass rebuilds js/destruction_1.js's procedural material
  // sounds and drops the pull/launch/wood/stone/soft mp3s from preload.
  // Karasuki popup pass: js/karasuki.js drops "I'm back in Karasuki", fixes the
  // mobile celebration-card overlap in js/utsu-card.js, and wires bespoke
  // nuppiOpen()/observerOpen() cues (js/utsu-sfx.js) into the Nuppi/Observer popups.
  // Destruction goofy-SFX v2: louder across the board, more differentiated
  // per-material character, and the pull sound rebuilt from a stuck-prone
  // held drone into short self-terminating creak pulses.
  // Muenba 27A adds state-aware phone orientation handling to js/muenba.js.
  // Muenba 27B keeps popup focus and layout cycles anchored at the first line.
  // Muenba 27D gives the active rhythm stage an explicit portrait surface.
  // Muenba 27E requests landscape again before exploration resumes.
  // Muenba 27G aligns phone orientation and popup height with visualViewport.
  // Muenba scream asset pass right-sizes six mono MP3 one-shots for the
  // upcoming shared sample-loader pass.
  // Muenba 28A adds the shared decoded sample-loader and pitch variation API.
  // Muenba 28B adds staggered authored scream playback, decay, and danger-state cleanup.
  // Destruction goofy-SFX v3: modal-synthesis rewrite of the pull/creak,
  // block hit/break, and bounce sounds (static-partial materials vs.
  // pitch-bending gesture sounds), based on a reference implementation
  // the user supplied.
  // Destruction goofy-SFX v4: snappier slingshot release, more-bodied
  // stone, a slightly slower block-impact cadence, a live rolling/
  // sliding friction loop, staggered tower-collapse landing impacts,
  // and nine distinct per-power death-explosion sounds.
  // Destruction goofy-SFX v5: normalized hit-sound loudness across all
  // four materials, opened up soft/rubber's muffled lowpass so it's
  // finally audible, louder break/shatter debris on every material,
  // and roughly doubled every death-explosion sound.
  // Destruction real-audio pass: material hit/break/pull/snap/rubble/
  // death sounds are now right-sized recorded MP3 clips instead of
  // WebAudio synthesis; the floor-bounce sound stays procedural.
  assets: 'booha-assets-2026-414',
  decks:  'booha-decks-2026-310',
};

const PAGE_CACHE  = CURRENT_CACHES.pages;
const ASSET_CACHE = CURRENT_CACHES.assets;
const DECK_CACHE  = CURRENT_CACHES.decks;

const BASE = '/the-booha-adventure';

// ── Core html pages in the repo───────────────────────────────────────────────
const CORE_FILES = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/adventure-profile.html`,
  `${BASE}/profile.html`,
  `${BASE}/utsuroba-profile.html`,
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
  `${BASE}/muenba.html`,
  `${BASE}/curriculum/bc/games-index.html`,
  `${BASE}/curriculum/bc/study-index.html`,
  `${BASE}/curriculum/br/games-index.html`,
  `${BASE}/curriculum/br/study-index.html`,
  `${BASE}/curriculum/pb/games-index.html`,
  `${BASE}/curriculum/pb/study-index.html`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/icon-maskable-512.png`,
  `${BASE}/juku.html`,
  `${BASE}/assets/img/juku-logo.png`,
];

// Static images are fetched from ASSET_CACHE, so these must be pre-cached
// there rather than added to CORE_FILES (which belongs to PAGE_CACHE).
const CORE_ASSETS = [
  `${BASE}/js/utsu-sfx.js`,
  `${BASE}/assets/img/background-1.webp`,
  `${BASE}/assets/img/booha_ghost.webp`,
  `${BASE}/assets/img/profile.webp`,
  `${BASE}/assets/img/pre-boo.webp`,
  `${BASE}/assets/img/boo-tree.webp`,
  `${BASE}/assets/img/cont-tree.webp`,
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
//  INSTALL — pre-cache core files - Keep chacking this
// ============================================================
self.addEventListener('install', (event) => {
  const precachePages = caches.open(PAGE_CACHE)
    .then((cache) => {
      console.log('[SW] Pre-caching core files');
      return cache.addAll(CORE_FILES);
    })
    .catch((err) => {
      console.warn('[SW] Some core files could not be cached:', err);
    });
  const precacheAssets = caches.open(ASSET_CACHE)
    .then((cache) => {
      console.log('[SW] Pre-caching index image assets');
      return cache.addAll(CORE_ASSETS);
    })
    .catch((err) => {
      console.warn('[SW] Some index image assets could not be cached:', err);
    });
  event.waitUntil(Promise.all([precachePages, precacheAssets]).then(() => self.skipWaiting()));
});

// ============================================================
//  ACTIVATE — clean up old caches - Checked 06/26
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
//  FETCH that SHIT — routing strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  const path = url.pathname;

  // Only handle requests under our base path
  if (!path.startsWith(BASE)) return;

  // Juku preflights must see the published assessment before class. Keep the
  // last verified response as the offline fallback, but do not let a stale
  // cache silently win while the network is available.
  if (url.searchParams.get('juku') === '1') {
    event.respondWith(networkFirst(request, DECK_CACHE));
    return;
  }

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
