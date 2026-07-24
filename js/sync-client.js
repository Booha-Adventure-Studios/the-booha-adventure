
/**
 * sync-client.js
 * The Booha Adventure — roaming save sync (Increment B)
 *
 * Sits between identity and application boot:
 *
 *   token.js  →  booha:identityReady  →  [ RESTORE ]  →  booha:syncReady  →  init
 *
 * Nothing that touches a save may run before booha:syncReady. That ordering
 * is the whole safety property: a push can never precede a load, so a device
 * can never overwrite the server with state it never reconciled against.
 *
 * Sync metadata lives in its own key, NOT inside either game blob — otherwise
 * every metadata change would change the data being synchronised.
 *
 * Load AFTER save-file.js. Load on every page that loads adventure-core.js.
 */

window.BoohaSync = (() => {
  'use strict';

  const BASE       = 'https://www.bryanharper.tokyo/_functions';
  const LOAD_URL   = `${BASE}/studentSavesLoad`;
  const PUSH_URL   = `${BASE}/studentSavesPush`;

  const KEY_TOKEN  = 'booha_token';
  const KEY_USERID = 'booha_userid';
  const META_BASE  = 'booha_sync:v1';

  const DEBOUNCE_MS = 12000;   // dirty → background push
  const TIMEOUT_MS  = 15000;   // per request

  let _meta   = null;
  let _state  = 'idle';        // idle | restoring | ready | blocked
  let _timers = { adventure: null, juku: null };

  /* ── identity + keys ─────────────────────────────────── */

  function uid() {
    try { return localStorage.getItem(KEY_USERID) || ''; } catch (e) { return ''; }
  }
  function token() {
    try { return localStorage.getItem(KEY_TOKEN) || ''; } catch (e) { return ''; }
  }

  // Delegated — never re-derived here. See save-file.js / juku-engine.js.
  function localKey(blob) {
    try {
      if (blob === 'adventure') {
        return (window.BoohaSaveFile && BoohaSaveFile.key()) || null;
      }
      return (window.JUKU && JUKU.saveKey()) || null;
    } catch (e) { return null; }
  }

  function readLocal(blob) {
    const k = localKey(blob);
    if (!k) return null;
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[sync] local parse failed:', blob, e);
      return null;
    }
  }

  function writeLocal(blob, data) {
    const k = localKey(blob);
    if (!k) return false;
    try {
      localStorage.setItem(k, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[sync] local write failed:', blob, e);
      return false;
    }
  }

  /* ── emptiness ───────────────────────────────────────────
     A device with no progress must NEVER claim revision 1. Doing so would
     let an empty save become the authoritative record and overwrite a real
     one on the student's other device. */

  function isEmpty(blob, d) {
    if (!d) return true;
    if (blob === 'juku') return !d.weeks || Object.keys(d.weeks).length === 0;
    if (d.scores && Object.keys(d.scores).length) return false;
    const m = d.meta || {};
    if (Number(m.allTimeStars) > 0) return false;
    if (m.weekLog && Object.keys(m.weekLog).length) return false;
    if (m.dayLog  && Object.keys(m.dayLog).length)  return false;
    if (d.collection && (d.collection.wanderers || []).length) return false;
    if (d.unlocks && Object.keys(d.unlocks).length) return false;
    return true;
  }

  /* ── metadata ────────────────────────────────────────── */

  function metaKey() { return `${META_BASE}:${uid()}`; }

  function loadMeta() {
    const fresh = { adventureRevision: 0, jukuRevision: 0,
                    adventureDirty: false, jukuDirty: false,
                    lastSyncAt: 0, firstRun: true };
    try {
      const raw = localStorage.getItem(metaKey());
      if (!raw) return fresh;
      const m = JSON.parse(raw);
      m.firstRun = false;
      return Object.assign(fresh, m, { firstRun: false });
    } catch (e) { return fresh; }
  }

  function saveMeta() {
    try { localStorage.setItem(metaKey(), JSON.stringify(_meta)); }
    catch (e) { console.error('[sync] meta write failed:', e); }
  }

  /* ── transport ───────────────────────────────────────── */

  async function post(url, body) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      return await res.json();
    } finally { clearTimeout(t); }
  }

  /* ── screens ─────────────────────────────────────────── */

  function screen(html) {
    let el = document.getElementById('booha-sync-screen');
    if (!el) {
      el = document.createElement('div');
      el.id = 'booha-sync-screen';
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99997',
        'background:#0e0f1a', 'color:#fff',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'text-align:center', 'padding:32px', 'gap:18px',
        'font:400 16px/1.7 system-ui,-apple-system,sans-serif'
      ].join(';');
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    return el;
  }

  function clearScreen() {
    const el = document.getElementById('booha-sync-screen');
    if (el) el.remove();
  }

  function showRestoring() {
    screen(`<div style="font-size:34px">🌙</div>
      <div style="font-weight:600">ぼうけんを よみこみちゅう…</div>
      <div style="color:#aaa;font-size:14px">Restoring your adventure…</div>`);
  }

  function showFailed(retry) {
    const el = screen(`<div style="font-size:34px">⚠️</div>
      <div style="font-weight:600">よみこめませんでした</div>
      <div style="color:#aaa;font-size:14px;max-width:320px">
        Could not restore your progress.<br>Check the connection and try again.</div>
      <button id="booha-sync-retry" style="margin-top:10px;padding:12px 30px;
        background:#6c63ff;border:0;color:#fff;border-radius:10px;
        font:600 15px sans-serif;cursor:pointer">もういちど / Retry</button>`);
    el.querySelector('#booha-sync-retry').addEventListener('click', retry);
  }

  function showConflict() {
    screen(`<div style="font-size:34px">🔀</div>
      <div style="font-weight:600">べつのデバイスで すすめたみたい</div>
      <div style="color:#aaa;font-size:14px;max-width:340px">
        Your progress changed on another device.<br>
        Please tell your teacher before continuing.</div>`);
  }

  function showOfflineBlocked() {
    screen(`<div style="font-size:34px">📡</div>
      <div style="font-weight:600">せつぞくが ひつようです</div>
      <div style="color:#aaa;font-size:14px;max-width:320px">
        This device has no saved progress yet,<br>
        so a connection is needed the first time.</div>`);
  }

  /* ── restore decision ────────────────────────────────────
     The dirty flag is what stops an unconditional install from destroying
     unpushed offline work: identical revisions with dirty set means local
     is remote PLUS changes, so local wins and gets pushed. */

  function decide(blob, remote) {
    const local    = readLocal(blob);
    const localRev = Number(_meta[blob + 'Revision'] || 0);
    const dirty    = !!_meta[blob + 'Dirty'];
    const hasLocal = local !== null && !isEmpty(blob, local);

    if (!remote.data) {
      if (!hasLocal) return { act: 'none' };                 // nothing to claim
      return { act: 'push', base: 0 };                       // seed revision 1
    }

    if (!hasLocal) return { act: 'install' };                // fresh device

    // First run after deploy with content on both sides: we cannot know which
    // is newer, and guessing could erase a term. Surface it.
    if (_meta.firstRun) return { act: 'conflict' };

    if (!dirty) {
      if (remote.revision === localRev) return { act: 'none' };
      if (remote.revision >  localRev) return { act: 'install' };
      return { act: 'conflict' };                            // remote regressed
    }

    if (remote.revision === localRev) return { act: 'push', base: localRev };
    return { act: 'conflict' };
  }

  /* ── restore ─────────────────────────────────────────── */

  async function restore() {
    if (!uid() || !token()) { block('no identity'); return; }

    _state = 'restoring';
    _meta  = loadMeta();
    showRestoring();

    if (!navigator.onLine) {
      const hasAny = readLocal('adventure') || readLocal('juku');
      if (!hasAny) { showOfflineBlocked(); _state = 'blocked'; return; }
      console.warn('[sync] offline — playing from local, will push later.');
      clearScreen();
      ready();
      return;
    }

    let res;
    try {
      res = await post(LOAD_URL, { token: token() });
    } catch (e) {
      console.error('[sync] load failed:', e);
      showFailed(() => restore());
      _state = 'blocked';
      return;
    }

    if (!res || res.ok !== true) {
      console.error('[sync] load rejected:', res && res.reason);
      showFailed(() => restore());
      _state = 'blocked';
      return;
    }

    for (const blob of ['adventure', 'juku']) {
      const remote = res[blob] || { data: null, revision: 0 };
      const d = decide(blob, remote);

      if (d.act === 'install') {
        if (!writeLocal(blob, remote.data)) { showFailed(() => restore()); _state='blocked'; return; }
        _meta[blob + 'Revision'] = remote.revision;
        _meta[blob + 'Dirty']    = false;
        console.log(`[sync] ${blob}: installed remote revision ${remote.revision}`);

      } else if (d.act === 'push') {
        const okPush = await pushBlob(blob, d.base);
        if (!okPush) console.warn(`[sync] ${blob}: initial push deferred`);

      } else if (d.act === 'conflict') {
        console.error(`[sync] ${blob}: CONFLICT — local kept, sync blocked.`);
        try {
          localStorage.setItem(`${META_BASE}:conflict:${blob}:${uid()}`,
                               JSON.stringify(remote));
        } catch (e) {}
        _meta.blocked = true;
        saveMeta();
        showConflict();
        _state = 'blocked';
        return;

      } else {
        console.log(`[sync] ${blob}: already in sync (revision ${remote.revision})`);
      }
    }

    _meta.firstRun  = false;
    _meta.lastSyncAt = Date.now();
    saveMeta();
    clearScreen();
    ready();
  }

  function ready() {
    _state = 'ready';
    window.BOOHA_SYNC_READY = true;
    document.dispatchEvent(new Event('booha:syncReady'));
  }

  function block(why) {
    console.error('[sync] blocked:', why);
    _state = 'blocked';
    showFailed(() => restore());
  }

  /* ── push ────────────────────────────────────────────── */

  async function pushBlob(blob, baseOverride) {
    if (_state === 'blocked' || _meta.blocked) return false;
    const data = readLocal(blob);
    if (!data || isEmpty(blob, data)) return false;

    const base = (baseOverride !== undefined)
      ? baseOverride
      : Number(_meta[blob + 'Revision'] || 0);

    let res;
    try {
      res = await post(PUSH_URL, { token: token(), blob, baseRevision: base, data });
    } catch (e) {
      console.warn('[sync] push failed (will retry):', blob, e.message);
      return false;                       // stays dirty
    }

    if (res && res.ok) {
      _meta[blob + 'Revision'] = res.revision;
      _meta[blob + 'Dirty']    = false;
      _meta.lastSyncAt         = Date.now();
      saveMeta();
      console.log(`[sync] ${blob}: pushed revision ${res.revision}`);
      return true;
    }

    if (res && res.reason === 'REVISION_CONFLICT') {
      console.error(`[sync] ${blob}: push conflict — sync blocked, local intact.`);
      try {
        localStorage.setItem(`${META_BASE}:conflict:${blob}:${uid()}`,
                             JSON.stringify(res.remote || null));
      } catch (e) {}
      _meta.blocked = true;
      saveMeta();
      showConflict();
      _state = 'blocked';
      return false;
    }

    console.warn('[sync] push rejected:', blob, res && res.reason);
    return false;
  }

  /* ── dirty tracking ──────────────────────────────────── */

  function markDirty(blob) {
    if (_state !== 'ready') return;
    _meta[blob + 'Dirty'] = true;
    saveMeta();
    clearTimeout(_timers[blob]);
    _timers[blob] = setTimeout(() => pushBlob(blob), DEBOUNCE_MS);
  }

  /** Immediate push — call at meaningful boundaries. */
  function checkpoint(blob) {
    if (_state !== 'ready') return;
    clearTimeout(_timers[blob]);
    _meta[blob + 'Dirty'] = true;
    saveMeta();
    return pushBlob(blob);
  }

  document.addEventListener('booha:saved', () => markDirty('adventure'));
  document.addEventListener('juku:saved',  () => markDirty('juku'));

  // Best-effort only. iOS frequently kills the page before this completes;
  // the dirty flag surviving in localStorage is the real guarantee.
  window.addEventListener('pagehide', () => {
    if (_state !== 'ready') return;
    ['adventure', 'juku'].forEach(blob => {
      if (!_meta[blob + 'Dirty']) return;
      const data = readLocal(blob);
      if (!data || isEmpty(blob, data)) return;
      try {
        navigator.sendBeacon(PUSH_URL, new Blob([JSON.stringify({
          token: token(), blob,
          baseRevision: Number(_meta[blob + 'Revision'] || 0), data
        })], { type: 'application/json' }));
      } catch (e) {}
    });
  });

  /* ── boot ────────────────────────────────────────────── */

  if (window.BOOHA_IDENTITY_READY) restore();
  else document.addEventListener('booha:identityReady', restore, { once: true });

  return {
    checkpoint,
    markDirty,
    get state()    { return _state; },
    get meta()     { return _meta; },
    restore
  };
})();
