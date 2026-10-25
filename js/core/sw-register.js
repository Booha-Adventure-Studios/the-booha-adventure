/**
 * sw-register.js
 * The Booha Adventure — lightweight service-worker registration for pages
 * other than index.html (which keeps js/pwa-init.js and its install prompt).
 *
 * Registers ./sw.js, activates a waiting worker at once, and reloads the page
 * once when a NEW worker takes control, so fresh pages and art appear without
 * the student having to return to the home page.
 *
 * Load it only where a one-time reload is harmless (the profile pages). World
 * and game pages are left out on purpose: a reload there could interrupt a
 * round (a Karasuki card challenge would count it as an interruption).
 */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator) || window.__boohaSwRegister) return;
  window.__boohaSwRegister = true;

  // Resolve sw.js next to the app root, whatever the page's folder.
  const script = document.currentScript;
  const swUrl = script && script.src
    ? script.src.replace(/js\/core\/sw-register\.js(\?.*)?$/, 'sw.js')
    : './sw.js';

  // First install (no controller yet) must not trigger a reload.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    window.location.reload();
  });

  function register() {
    navigator.serviceWorker.register(swUrl)
      .then(reg => {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(err => console.warn('[SW] registration failed:', err));
  }

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
})();
