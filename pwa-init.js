
// ============================================================
//  Booha Adventure — PWA Initialisation
//  pwa-init.js  (or paste the contents into index.html)
// ============================================================
(function () {
  'use strict';

  // ── 1. Register Service Worker ──────────────────────────
  if ('serviceWorker' in navigator) {

    // Must be registered before sw.js is registered so it catches
    // the controllerchange that fires when the new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then(reg => {
          console.log('[PWA] Service worker registered, scope:', reg.scope);
          // Waiting SW found (tab was open during a previous deploy)
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Activate immediately — controllerchange fires → page reloads
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch(err => console.error('[PWA] Service worker registration failed:', err));
    });
  }

  // ── 2. Install Prompt ───────────────────────────────────
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    showInstallButton();
  });
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Booha Adventure installed!');
    hideInstallButton();
    deferredPrompt = null;
  });
  function showInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'block';
  }
  function hideInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
  }
  // Called by the Install button's onclick
  window.boohaInstallPWA = async function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    deferredPrompt = null;
    hideInstallButton();
  };
})();
