
// js/token.js
// Token gate for The Booha Adventure
// Runs at top of every protected page before content is shown.

(function () {

  const GATE_URL      = 'https://www.bryanharper.tokyo/booha-gate';
  const VERIFY_URL    = 'https://www.bryanharper.tokyo/_functions/verifyToken';
  const GRACE_MS      = 12 * 60 * 60 * 1000; // 12 hours offline grace

  const KEY_TOKEN     = 'booha_token';
  const KEY_EXPIRES   = 'booha_token_expires';
  const KEY_NAME      = 'booha_user_name';
  const KEY_VALIDATED = 'booha_last_validated_at';
  const KEY_FIRST     = 'booha_first_name';
  const KEY_JUKU      = 'booha_is_juku';
  const KEY_USER_ID   = 'booha_userid';

  function clearSession() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_EXPIRES);
    localStorage.removeItem(KEY_NAME);
    localStorage.removeItem(KEY_VALIDATED);
    localStorage.removeItem(KEY_FIRST);
    localStorage.removeItem(KEY_JUKU);
    localStorage.removeItem(KEY_USER_ID);
 }

 // ── Identity gate ─────────────────────────────────────────────────────────
  // Storage keys are scoped to booha_userid, which is written below only after
  // the async verify returns. Systems that read or write the save must wait for
  // this signal, or they operate on the legacy key and can mutate the previous
  // student's data before anyone is identified.

  let _identitySignalled = false;

  function signalIdentityReady() {
    if (_identitySignalled) return;
    _identitySignalled = true;
    window.BOOHA_IDENTITY_READY = true;
    document.dispatchEvent(new Event('booha:identityReady'));
  }

  function redirect(reason) {
    clearSession();
    window.location.replace(GATE_URL + '?reason=' + reason);
  }

  function unlock() {
    document.documentElement.classList.remove('token-checking');
  }

  function handleOffline(token) {
    const last = parseInt(localStorage.getItem(KEY_VALIDATED) || '0', 10);
    const age  = Date.now() - last;

    if (last && age < GRACE_MS) {
      
      // Within grace period — show page with offline banner.
      // booha_userid is already cached from the last successful verify, so
      // identity is known and boot can proceed.
      // Offline grace is valid ONLY with a cached userId. Without one there is
      // no key to write to and nothing can be saved, so treat it as a blocked
      // session rather than letting a student play a lesson into the void.
      if (!localStorage.getItem(KEY_USER_ID)) {
        console.error('[token] Offline with no cached userId — session unavailable.');
        showOfflineBlock();
        waitForConnection(() => redirect('offline'));
        return;
      }
      signalIdentityReady();
      unlock();
      showOfflineBanner();
      
    } else {
      // Grace expired — block and redirect when connection returns
      showOfflineBlock();
      waitForConnection(() => redirect('offline'));
    }
  }

  function showConnectingBanner() {
    if (document.getElementById('booha-connecting-banner')) return;
    const el = document.createElement('div');
    el.id = 'booha-connecting-banner';
    el.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0',
      'background:#334', 'color:#fff',
      'text-align:center', 'padding:8px 16px',
      'font:600 14px/1.4 sans-serif', 'z-index:99999'
    ].join(';');
    el.textContent = 'せつぞくちゅう… / Connecting — saves are paused.';
    document.body.appendChild(el);
  }

  function clearConnectingBanner() {
    const el = document.getElementById('booha-connecting-banner');
    if (el) el.remove();
  }

  function showIdentityBanner() {
    const el = document.createElement('div');
    el.id = 'booha-identity-banner';
    el.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0',
      'background:#8a5a00', 'color:#fff',
      'text-align:center', 'padding:8px 16px',
      'font:600 14px/1.4 sans-serif', 'z-index:99999'
    ].join(';');
    el.textContent = 'Save identity unavailable — tell your teacher.';
    document.body.appendChild(el);
  }

  function showOfflineBanner() {
    const el = document.createElement('div');
    el.id = 'booha-offline-banner';
    el.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0',
      'background:#b00020', 'color:#fff',
      'text-align:center', 'padding:8px 16px',
      'font:600 14px/1.4 sans-serif', 'z-index:99999'
    ].join(';');
    el.textContent = 'No connection — playing from last session.';
    document.body.appendChild(el);
  }

  function showOfflineBlock() {
    document.documentElement.style.background    = '#000';
    document.documentElement.style.visibility   = 'visible';
    document.body.style.cssText = [
      'background:#000', 'color:#fff', 'margin:0',
      'display:flex', 'align-items:center', 'justify-content:center',
      'height:100vh', 'font:400 18px/1.6 sans-serif', 'text-align:center'
    ].join(';');
    document.body.innerHTML =
      '<div><p>接続が必要です</p><p>Connection needed to verify your session.</p></div>';
  }

  function waitForConnection(cb) {
    const check = setInterval(() => {
      if (navigator.onLine) {
        clearInterval(check);
        cb();
      }
    }, 3000);
  }

  // ── Install overlay ───────────────────────────────────────────────────────

  const INSTALL_KEY = 'booha_install_shown';

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  }

  function showInstallOverlay() {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'booha-install-overlay';
      overlay.style.cssText = [
        'position:fixed', 'inset:0', 'background:#0e0f1a',
        'color:#fff', 'z-index:99998',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'padding:32px', 'text-align:center',
        'font:400 16px/1.6 "DM Sans",sans-serif'
      ].join(';');

      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const deferBtn = `<button id="booha-install-skip"
        style="margin-top:24px;padding:12px 28px;background:transparent;
        border:1px solid #555;color:#aaa;border-radius:8px;
        font:400 14px sans-serif;cursor:pointer;">
        続ける / Continue anyway
      </button>`;

      let installBtn = '';
      let deferPromptRef = null;

      if (isIOS) {
        overlay.innerHTML = `
          <p style="font-size:22px;margin-bottom:8px;">📲</p>
          <p style="font-size:18px;font-weight:600;margin-bottom:8px;">
            ホーム画面に追加してね<br>Add to Home Screen
          </p>
          <p style="color:#aaa;max-width:320px;">
            Safari の <strong>共有ボタン</strong>（□↑）をタップして<br>
            「ホーム画面に追加」を選んでください。<br><br>
            Tap the <strong>Share button</strong> (□↑) in Safari,<br>
            then choose <em>Add to Home Screen</em>.
          </p>
          ${deferBtn}`;
      } else {
        installBtn = `<button id="booha-install-btn"
          style="margin-top:24px;padding:14px 32px;background:#6c63ff;
          border:none;color:#fff;border-radius:10px;
          font:600 16px sans-serif;cursor:pointer;">
          ホーム画面に追加 / Install
        </button>`;
        overlay.innerHTML = `
          <p style="font-size:22px;margin-bottom:8px;">📲</p>
          <p style="font-size:18px;font-weight:600;margin-bottom:8px;">
            ホーム画面に追加してね<br>Add to Home Screen
          </p>
          <p style="color:#aaa;max-width:320px;">
            アプリとして保存すると、もっと楽しめます。<br>
            Save it as an app for the best experience.
          </p>
          ${installBtn}
          ${deferBtn}`;
      }

      document.body.appendChild(overlay);
      unlock(); // show overlay, still blocks game content underneath

      // Android install prompt
      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferPromptRef = e;
        const btn = document.getElementById('booha-install-btn');
        if (btn) {
          btn.addEventListener('click', async () => {
            deferPromptRef.prompt();
            await deferPromptRef.userChoice;
            localStorage.setItem(INSTALL_KEY, '1');
            overlay.remove();
            resolve();
          });
        }
      });

      document.getElementById('booha-install-skip')
        ?.addEventListener('click', () => {
          localStorage.setItem(INSTALL_KEY, '1');
          overlay.remove();
          resolve();
        });
    });
  }

  // ── Main boot ─────────────────────────────────────────────────────────────

  async function boot() {
    const token = localStorage.getItem(KEY_TOKEN);

    if (!token) {
      redirect('missing');
      return;
    }

    // Offline handling
    if (!navigator.onLine) {
      handleOffline(token);
      return;
    }

    // Slow verify gets a visible, self-clearing state. School wifi trips the
    // 8s boot fallback regularly; a terminal error screen would just train
    // students to reload past it.
    const slowTimer = setTimeout(showConnectingBanner, 4000);

    // Validate with Wix
    let data;
    try {
      const res = await fetch(`${VERIFY_URL}?token=${encodeURIComponent(token)}`);
      data = await res.json();
      
   } catch (err) {
      // Network error — treat as offline
      clearTimeout(slowTimer);
      clearConnectingBanner();
      handleOffline(token);
      return;
    }
    clearTimeout(slowTimer);
    clearConnectingBanner();

    if (!data.ok) {
      const reason = (data.reason || 'invalid').toLowerCase();
      redirect(reason);
      return;
    }

    // Valid — update storage
    localStorage.setItem(KEY_VALIDATED, String(Date.now()));
    if (data.expiresAt) localStorage.setItem(KEY_EXPIRES, data.expiresAt);
    
   if (data.displayName) {
      localStorage.setItem(KEY_NAME, data.displayName);
      localStorage.setItem(KEY_FIRST, data.displayName.split(' ')[0]);
    }
    localStorage.setItem(KEY_JUKU, data.isJuku === true ? '1' : '0');

    if (data.userId) {
      localStorage.setItem(KEY_USER_ID, data.userId);
    } else {
      // Not fatal — a lockout over a save-keying field would be worse than
      // degrading to the old behaviour. But it must never be silent.
      console.error('[token] No userId in verify response — saves stay on the legacy key.');
      localStorage.removeItem(KEY_USER_ID);
      showIdentityBanner();
    }

    signalIdentityReady();

    // Install overlay — once only, not in standalone
    if (!isStandalone() && !localStorage.getItem(INSTALL_KEY)) {
      await showInstallOverlay();
    }

    unlock();
  }

  boot();

})();
