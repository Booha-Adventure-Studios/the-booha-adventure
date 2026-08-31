
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
 * Load AFTER save-file.js on Adventure pages. On juku.html, load after
 * juku-engine.js. Each page reconciles only the blob whose storage engine is
 * present; the other blob is restored when its own world is opened.
 */

window.BoohaSync = (() => {
  'use strict';

  const BASE       = 'https://www.bryanharper.tokyo/_functions';
  const LOAD_URL   = `${BASE}/studentSavesLoad`;
  const PUSH_URL   = `${BASE}/studentSavesPush`;
  const RESOLVE_URL = `${BASE}/studentSavesResolve`;
  const ARCHIVE_URL = `${BASE}/studentSaveRecoveryArchive`;
  const TEACHER_AUTH_URL = `${BASE}/teacherPinVerify`;

  const KEY_TOKEN  = 'booha_token';
  const KEY_USERID = 'booha_userid';
  // v2 is a deliberate sync-metadata epoch. The game saves themselves are
  // untouched; only stale v1 revision bookkeeping is retired. On first v2
  // boot Wix remains authoritative and any displaced local blob is preserved
  // by preserveReplacedLocal() below.
  const META_BASE  = 'booha_sync:v2';
  const DEVICE_KEY = 'booha_device:v1';
  const CHANNEL_NAME = 'booha-sync-tabs-v2';

  const DEBOUNCE_MS = 12000;   // dirty → background push
  const TIMEOUT_MS  = 15000;   // per request
  const LEASE_MS    = 25000;   // fallback cross-tab push lock

  let _meta   = null;
  let _state  = 'idle';        // idle | restoring | ready | blocked
  let _blockedByConflict = false;
  let _conflictResolutionBaseline = 0;
  let _timers = { adventure: null, juku: null };
  let _inflight   = { adventure: null, juku: null };
  let _changeCounter = 0;
  let _channel = null;
  let _conflictRefreshSeq = 0;

  function randomId(prefix) {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return `${prefix}-${window.crypto.randomUUID()}`;
      }
    } catch (e) {}
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  const TAB_ID = randomId('tab');

  /* ── identity + keys ─────────────────────────────────── */

  function uid() {
    try { return localStorage.getItem(KEY_USERID) || ''; } catch (e) { return ''; }
  }
  function token() {
    try { return localStorage.getItem(KEY_TOKEN) || ''; } catch (e) { return ''; }
  }
  function deviceId() {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = randomId('device');
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (e) { return 'device-unavailable'; }
  }
  function pageVisible() {
    return !document.visibilityState || document.visibilityState !== 'hidden';
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

  function availableBlobs() {
    const blobs = [];
    if (window.BoohaSaveFile && BoohaSaveFile.key()) blobs.push('adventure');
    if (window.JUKU && JUKU.saveKey()) blobs.push('juku');
    return blobs;
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

  // A first-time cloud restore may replace progress created before Increment B.
  // Keep that local blob as a separate, timestamped snapshot so the rollout
  // can prefer Wix without making the displaced device data unrecoverable.
  function preserveReplacedLocal(blob) {
    const data = readLocal(blob);
    if (!data) return;
    try {
      const key = `${META_BASE}:replaced:${blob}:${uid()}:${Date.now()}`;
      localStorage.setItem(key, JSON.stringify({
        reason: 'first-cloud-restore',
        savedAt: Date.now(),
        data
      }));
      console.warn(`[sync] ${blob}: pre-sync local progress quarantined as ${key}`);
    } catch (e) {
      // The user explicitly chose Wix as the rollout authority. A full local
      // quota must not turn that one-time migration into a permanent dead end.
      console.error(`[sync] ${blob}: could not quarantine replaced local data:`, e);
    }
  }

  // Conflict resolution is intentionally loss-aware. Whichever copy the
  // teacher does not choose is kept locally under a timestamped recovery key.
  function preserveResolutionCopy(blob, reason, snapshot) {
    if (!snapshot || !snapshot.data) return true;
    try {
      const key = `${META_BASE}:resolution:${blob}:${uid()}:${Date.now()}`;
      localStorage.setItem(key, JSON.stringify({
        reason,
        savedAt: Date.now(),
        deviceId: deviceId(),
        revision: Number(snapshot.revision || 0),
        updatedAt: snapshot.updatedAt || null,
        data: snapshot.data
      }));
      console.warn(`[sync] ${blob}: displaced ${reason} copy preserved as ${key}`);
      return true;
    } catch (e) {
      console.error(`[sync] ${blob}: could not preserve displaced ${reason} copy:`, e);
      return false;
    }
  }

  function clearStoredConflict(blob) {
    try {
      localStorage.removeItem(`${META_BASE}:conflict:${blob}:${uid()}`);
    } catch (e) {}
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
    if (m.checkIn && Object.keys(m.checkIn).length) return false;
    const w = d.weekly || {};
    if (w.completedGames && Object.keys(w.completedGames).length) return false;
    if (w.drifterQuest) return false;
    if (w.worlds?.utsuroba?.drifterQuest) return false;
    if (w.worlds?.utsuroba?.drifters && Object.keys(w.worlds.utsuroba.drifters).length) return false;
    if (w.worlds?.utsuroba?.readingChallenge) return false;
    if (w.worlds?.muenba?.ghostsFound && Object.keys(w.worlds.muenba.ghostsFound).length) return false;
    if (w.worlds?.muenba?.huntGhostOrder && w.worlds.muenba.huntGhostOrder.length) return false;
    if (Number(w.worlds?.muenba?.orbsPending) > 0) return false;
    if (w.worlds?.grimmerglen?.objects && Object.keys(w.worlds.grimmerglen.objects).length) return false;
    if (w.worlds?.grimmerglen?.objectSlots && Object.keys(w.worlds.grimmerglen.objectSlots).length) return false;
    if (w.worlds?.grimmerglen?.activeTargetType || w.worlds?.grimmerglen?.carriedObjectId) return false;
    if (d.collection && (d.collection.wanderers || []).length) return false;
    if (d.unlocks && Object.keys(d.unlocks).length) return false;
    return true;
  }

  /* ── metadata ────────────────────────────────────────── */

  function metaKey() { return `${META_BASE}:${uid()}`; }

  function freshMeta() {
    return {
      adventureRevision: 0, jukuRevision: 0,
      adventureDirty: false, jukuDirty: false,
      adventureSeen: false, jukuSeen: false,
      adventureChangeId: '', jukuChangeId: '',
      adventureSyncedSignature: '', jukuSyncedSignature: '',
      blocked: false, conflict: null, lastSyncAt: 0, lastResolutionAt: 0
    };
  }

  function loadMeta() {
    const fresh = freshMeta();
    try {
      const raw = localStorage.getItem(metaKey());
      if (!raw) return fresh;
      const m = JSON.parse(raw);
      return Object.assign(fresh, m);
    } catch (e) { return fresh; }
  }

  function announce(type, blob) {
    if (!_channel) return;
    try {
      _channel.postMessage({
        type, blob: blob || null, userId: uid(), deviceId: deviceId(),
        sender: TAB_ID, at: Date.now()
      });
    } catch (e) {}
  }

  function saveMeta(type, blob) {
    if (!_meta || !uid()) return;
    try {
      localStorage.setItem(metaKey(), JSON.stringify(_meta));
      announce(type || 'meta', blob);
    }
    catch (e) { console.error('[sync] meta write failed:', e); }
  }

  // Every mutation starts from the shared localStorage copy. A tab must never
  // write its hours-old in-memory revision over a newer revision published by
  // a sibling tab.
  function mutateMeta(fn, type, blob) {
    _meta = loadMeta();
    fn(_meta);
    saveMeta(type, blob);
    return _meta;
  }

  function refreshMeta() {
    _meta = loadMeta();
    return _meta;
  }

  function nextChangeId() {
    _changeCounter++;
    return `${Date.now().toString(36)}:${TAB_ID}:${_changeCounter}`;
  }

  function sameData(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    try { return JSON.stringify(a) === JSON.stringify(b); }
    catch (e) { return false; }
  }

  // Raw JSON equality is too strict for progress. Two devices can hold the
  // same student work while timestamps, harmless session counters, or object
  // key order differ. Those differences were producing teacher-PIN walls at
  // login even when both summaries showed zero games and zero stars.
  const NON_PROGRESS_KEYS = new Set([
    'createdAt', 'updatedAt', 'lastActivityTs', 'lastWeeklyKey',
    'startedAt', 'submittedAt', 'generatedAt', 'savedAt',
    'unlockedAt', 'foundAt', 'ts', 'at'
  ]);

  function progressProjection(blob, value, path) {
    path = path || [];
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        progressProjection(blob, item, path.concat(String(index))));
    }

    const out = {};
    Object.keys(value).sort().forEach(key => {
      if (NON_PROGRESS_KEYS.has(key)) return;
      if (blob === 'adventure' && key === 'playerName' && path.length === 0) return;
      // Session opens are not completed work and must not create a conflict.
      // Keep g (completed games) in the same day record.
      if (blob === 'adventure' && key === 's' &&
          path[0] === 'meta' && path[1] === 'dayLog') return;
      out[key] = progressProjection(blob, value[key], path.concat(key));
    });
    return out;
  }

  function equivalentProgress(blob, a, b) {
    if (sameData(a, b)) return true;
    if (!a || !b) return false;
    try {
      return JSON.stringify(progressProjection(blob, a)) ===
             JSON.stringify(progressProjection(blob, b));
    } catch (e) { return false; }
  }

  // A signature makes the dirty flag self-healing. Even if two JavaScript
  // contexts interleave localStorage writes at the worst possible instant,
  // a later checkpoint/boot can still prove that the local blob differs from
  // the last successfully installed or pushed snapshot.
  function dataSignature(data) {
    if (!data) return '';
    let text;
    try { text = JSON.stringify(data); } catch (e) { return 'unserializable'; }
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${text.length}:${(h >>> 0).toString(36)}`;
  }

  function isEffectivelyDirty(blob, local) {
    if (_meta[blob + 'Dirty']) return true;
    const synced = _meta[blob + 'SyncedSignature'] || '';
    return !!(_meta[blob + 'Seen'] && synced &&
      dataSignature(local) !== synced);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function lockName(blob) {
    return `${META_BASE}:push:${uid()}:${blob}`;
  }

  async function withLeaseLock(blob, work) {
    const key = `${META_BASE}:lease:${uid()}:${blob}`;
    const deadline = Date.now() + LEASE_MS;
    while (Date.now() < deadline) {
      let lease = null;
      try { lease = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
      if (!lease || Number(lease.expiresAt || 0) <= Date.now() || lease.owner === TAB_ID) {
        try {
          localStorage.setItem(key, JSON.stringify({
            owner: TAB_ID, expiresAt: Date.now() + LEASE_MS
          }));
          // A short settlement window closes the usual two-tabs-write-at-once
          // race: only the last candidate still owns the lease afterwards.
          await delay(60 + Math.floor(Math.random() * 80));
          const check = JSON.parse(localStorage.getItem(key) || 'null');
          if (check && check.owner === TAB_ID) {
            const heartbeat = setInterval(() => {
              try {
                const current = JSON.parse(localStorage.getItem(key) || 'null');
                if (current && current.owner === TAB_ID) {
                  current.expiresAt = Date.now() + LEASE_MS;
                  localStorage.setItem(key, JSON.stringify(current));
                }
              } catch (e) {}
            }, 5000);
            try { return await work(); }
            finally {
              clearInterval(heartbeat);
              try {
                const current = JSON.parse(localStorage.getItem(key) || 'null');
                if (current && current.owner === TAB_ID) localStorage.removeItem(key);
              } catch (e) {}
            }
          }
        } catch (e) {
          console.warn('[sync] fallback tab lock unavailable:', e);
          return work();
        }
      }
      await delay(80 + Math.floor(Math.random() * 120));
    }
    console.warn('[sync] another tab still owns the push lock:', blob);
    return false;
  }

  function withPushLock(blob, work) {
    if (navigator.locks && typeof navigator.locks.request === 'function') {
      return navigator.locks.request(lockName(blob), { mode: 'exclusive' }, work);
    }
    return withLeaseLock(blob, work);
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

  // Non-mutating teacher authorization for Juku report finalization. The PIN
  // is sent once to Wix over HTTPS, never cached, logged, or written into
  // either student blob. A successful response authorizes only the in-memory
  // Juku review screen that made this call.
  async function verifyTeacherPin(teacherPin, purpose) {
    const pin = String(teacherPin || '').trim();
    if (!pin || !token()) return { ok: false, reason: 'MISSING_CREDENTIALS' };
    try {
      const result = await post(TEACHER_AUTH_URL, {
        token: token(),
        teacherPin: pin,
        purpose: purpose || 'juku-report-review'
      });
      return result && result.ok === true
        ? { ok: true }
        : { ok: false, reason: result && result.reason || 'PIN_REJECTED' };
    } catch (e) {
      console.error('[sync] teacher PIN verification unavailable:', e);
      return { ok: false, reason: 'NETWORK_ERROR' };
    }
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
        'align-items:center', 'justify-content:flex-start',
        'justify-content:safe center', 'overflow-y:auto',
        '-webkit-overflow-scrolling:touch', 'overscroll-behavior:contain',
        'touch-action:pan-y',
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

  function showRecoveryNotice(blobs) {
    const names = (blobs || []).map(blob =>
      blob === 'juku' ? 'Juku' : 'Adventure').join(' + ');
    if (!names) return;
    const old = document.getElementById('booha-cloud-recovery-notice');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'booha-cloud-recovery-notice';
    el.style.cssText = [
      'position:fixed', 'top:14px', 'left:50%', 'transform:translateX(-50%)',
      'width:min(92vw,520px)', 'z-index:99996',
      'background:#26345c', 'color:#fff', 'border:1px solid #6677b9',
      'border-radius:12px', 'padding:11px 16px', 'text-align:center',
      'box-shadow:0 8px 28px rgba(0,0,0,.45)',
      'font:600 13px/1.45 system-ui,-apple-system,sans-serif'
    ].join(';');
    el.textContent = `${names}: さいしんのオンラインきろくを もどしました。` +
      ' / Latest online progress restored. The other copy was saved safely for your teacher.';
    document.body.appendChild(el);
    setTimeout(() => { if (el.isConnected) el.remove(); }, 8000);
  }

  function queueRecoveryNotice(blob) {
    try {
      const key = `${META_BASE}:recovery-notice:${uid()}`;
      const list = JSON.parse(sessionStorage.getItem(key) || '[]');
      if (!list.includes(blob)) list.push(blob);
      sessionStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  }

  function takeRecoveryNotices() {
    try {
      const key = `${META_BASE}:recovery-notice:${uid()}`;
      const list = JSON.parse(sessionStorage.getItem(key) || '[]');
      sessionStorage.removeItem(key);
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function pendingRecoveryKey(blob) {
    return `${META_BASE}:pending-recovery:${blob}:${uid()}`;
  }

  function recoveryRequestId(blob, data) {
    const signature = dataSignature(data);
    const key = pendingRecoveryKey(blob);
    try {
      const pending = JSON.parse(localStorage.getItem(key) || 'null');
      if (pending && pending.signature === signature && pending.recoveryId) {
        return pending.recoveryId;
      }
    } catch (e) {}

    const recoveryId = randomId('recovery')
      .replace(/[^a-z0-9-]/gi, '')
      .slice(0, 64);
    try {
      localStorage.setItem(key, JSON.stringify({ recoveryId, signature }));
    } catch (e) {}
    return recoveryId;
  }

  function clearPendingRecovery(blob) {
    try { localStorage.removeItem(pendingRecoveryKey(blob)); } catch (e) {}
  }

  /**
   * Store the displaced local blob in Wix BEFORE replacing it. The endpoint
   * derives the student from the token and returns the current authoritative
   * cloud blob, so a cloud revision that changed during recovery is handled
   * without installing stale data.
   */
  async function archiveLocalRecovery(blob, remote, reason, local) {
    const recoveryId = recoveryRequestId(blob, local);
    let res;
    try {
      res = await post(ARCHIVE_URL, {
        token: token(),
        recoveryId,
        blob,
        data: local,
        deviceId: deviceId(),
        localRevision: Number(_meta[blob + 'Revision'] || 0),
        expectedRemoteRevision: revisionOf(remote),
        reason: reason || 'automatic-cloud-recovery'
      });
    } catch (e) {
      console.error(`[sync] ${blob}: Wix recovery archive failed:`, e);
      return null;
    }

    if (!res || res.ok !== true || !res.remote || !res.remote.data) {
      console.error(`[sync] ${blob}: Wix recovery archive rejected:`,
                    res && res.reason);
      return null;
    }

    // Wix is now the durable recovery copy. Keep the old on-device quarantine
    // too when storage allows, but its failure is no longer data loss.
    preserveResolutionCopy(blob, reason || 'automatic-cloud-recovery', {
      data: local,
      revision: Number(_meta[blob + 'Revision'] || 0),
      updatedAt: local.updatedAt || null
    });
    clearPendingRecovery(blob);
    console.warn(`[sync] ${blob}: displaced local copy archived in Wix as ${res.archiveId}.`);
    return res.remote;
  }

  // Cloud is the classroom authority. Before replacing genuinely different
  // unsynced work, archive the complete local blob in Wix. If that archive
  // cannot be confirmed, fail closed instead of erasing the only copy.
  async function installCloudCopy(blob, remote, options) {
    options = options || {};
    if (!remote || !remote.data || typeof remote.data !== 'object') return false;

    refreshMeta();
    const local = readLocal(blob);
    if (options.preserveLocal && local) {
      const archivedSignature = dataSignature(local);
      const currentRemote = await archiveLocalRecovery(
        blob,
        remote,
        options.reason || 'automatic-cloud-recovery',
        local
      );
      if (!currentRemote) return false;
      // Another tab may have saved while the archive request was travelling.
      // That newer snapshot has not been archived, so never replace it.
      if (dataSignature(readLocal(blob)) !== archivedSignature) {
        console.warn(`[sync] ${blob}: local progress changed during recovery; retrying later.`);
        return false;
      }
      remote = currentRemote;
    }

    if (!writeLocal(blob, remote.data)) return false;
    const remoteRevision = revisionOf(remote);
    mutateMeta(m => {
      m[blob + 'Revision'] = remoteRevision;
      m[blob + 'Dirty'] = false;
      m[blob + 'Seen'] = true;
      m[blob + 'SyncedSignature'] = dataSignature(remote.data);
      m.blocked = false;
      m.conflict = null;
      m.lastSyncAt = Date.now();
      if (options.recoveredConflict) m.lastResolutionAt = Date.now();
    }, options.recoveredConflict ? 'resolved' : 'revision', blob);
    clearStoredConflict(blob);
    return true;
  }

  function showRestoring() {
    screen(`<div style="font-size:34px">🌙</div>
      <div style="font-weight:600">ぼうけんを よみこみちゅう…</div>
      <div style="color:#aaa;font-size:14px">Restoring your adventure…</div>`);
  }

  function showFailed(retry) {
    _blockedByConflict = false;
    const el = screen(`<div style="font-size:34px">⚠️</div>
      <div style="font-weight:600">よみこめませんでした</div>
      <div style="color:#aaa;font-size:14px;max-width:320px">
        Could not restore your progress.<br>Check the connection and try again.</div>
      <button id="booha-sync-retry" style="margin-top:10px;padding:12px 30px;
        background:#6c63ff;border:0;color:#fff;border-radius:10px;
        font:600 15px sans-serif;cursor:pointer">もういちど / Retry</button>`);
    el.querySelector('#booha-sync-retry').addEventListener('click', retry);
  }

  function revisionOf(remote) {
    return Number(remote && remote.revision || 0);
  }

  function conflictInfo(blob, localRevision, remoteRevision) {
    const shortDevice = deviceId().replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
    const letter = blob === 'juku' ? 'J' : 'A';
    return {
      blob,
      localRevision: Number(localRevision || 0),
      remoteRevision: Number(remoteRevision || 0),
      deviceCode: shortDevice,
      code: `${letter}-L${Number(localRevision || 0)}-R${Number(remoteRevision || 0)}-${shortDevice}`
    };
  }

  function fmtWhen(ts) {
    const n = Number(ts || 0);
    if (!n) return '—';
    try {
      return new Date(n).toLocaleString('ja-JP', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return '—'; }
  }

  // Give the teacher useful evidence, not just two revision numbers. These
  // summaries are deliberately read-only and use only counts/timestamps from
  // the save; choosing a copy still happens through the guarded resolver.
  function summarizeConflictCopy(blob, data) {
    if (!data || typeof data !== 'object') return ['— なし / none —'];

    if (blob === 'juku') {
      const weeks = data.weeks && typeof data.weeks === 'object'
        ? Object.keys(data.weeks) : [];
      let answers = 0;
      let latest = 0;
      weeks.forEach(key => {
        const week = data.weeks[key] || {};
        const sections = week.sections && typeof week.sections === 'object'
          ? week.sections : {};
        Object.keys(sections).forEach(sectionId => {
          const items = Array.isArray(sections[sectionId] && sections[sectionId].items)
            ? sections[sectionId].items : [];
          answers += items.length;
          items.forEach(item => {
            const at = Number(item && item.at || 0);
            if (at > latest) latest = at;
          });
        });
      });
      return [
        `しゅう / weeks: ${weeks.length}`,
        `こたえ / answers: ${answers}`,
        `さいご / last: ${fmtWhen(latest)}`
      ];
    }

    const scores = data.scores && typeof data.scores === 'object'
      ? data.scores : {};
    const completed = Object.values(scores)
      .filter(entry => entry && entry.completed).length;
    const completedGames =
      data.weekly && data.weekly.completedGames &&
      typeof data.weekly.completedGames === 'object'
        ? Object.keys(data.weekly.completedGames).length : 0;
    return [
      `★ ${Number(data.meta && data.meta.allTimeStars || 0)}`,
      `ゲーム / games: ${completed}`,
      `こんしゅう / this week: ${completedGames}`,
      `さいご / last: ${fmtWhen(data.updatedAt)}`
    ];
  }

  function conflictColumnHTML(title, lines, revision) {
    const rows = lines.map(line =>
      `<div style="color:#c9cee6">${line}</div>`).join('');
    return `<div style="flex:1;min-width:0;background:rgba(255,255,255,.05);
      border-radius:10px;padding:12px;text-align:left;font-size:12.5px;line-height:1.65">
      <div style="font-weight:700;color:#fff;margin-bottom:6px">${title}</div>
      <div style="color:#7f86a8;font:600 11px ui-monospace,monospace;margin-bottom:6px">
        rev ${revision}</div>
      ${rows}</div>`;
  }

  function showConflict(info, notice) {
    if (!_blockedByConflict) {
      _conflictResolutionBaseline = Number(_meta && _meta.lastResolutionAt || 0);
    }
    _blockedByConflict = true;
    info = info || (_meta && _meta.conflict) || conflictInfo('adventure', 0, 0);
    if (!info.deviceCode) {
      info = conflictInfo(info.blob, info.localRevision, info.remoteRevision);
    }
    renderConflictPanel(info, null, notice || '', 'loading');
    refreshConflictPanel(info);
  }

  // A conflict may have sat open while another device advanced the server.
  // Always reload it before enabling either decision. The sequence number
  // prevents a slow, older request from repainting over a newer refresh.
  async function refreshConflictPanel(info) {
    const seq = ++_conflictRefreshSeq;
    let res;
    try {
      res = await post(LOAD_URL, { token: token() });
    } catch (e) {
      if (seq !== _conflictRefreshSeq || !_blockedByConflict) return;
      console.warn('[sync] conflict refresh failed:', e.message);
      renderConflictPanel(
        info, null,
        'Could not check the cloud copy. Check Wi-Fi and retry.',
        'error'
      );
      return;
    }

    if (seq !== _conflictRefreshSeq || !_blockedByConflict) return;
    const remote = res && res.ok === true ? res[info.blob] : null;
    if (!remote || !remote.data || typeof remote.data !== 'object') {
      renderConflictPanel(
        info, null,
        'The cloud copy could not be loaded. Nothing has been changed.',
        'error'
      );
      return;
    }

    refreshMeta();
    const freshInfo = conflictInfo(
      info.blob,
      Number(_meta[info.blob + 'Revision'] || info.localRevision || 0),
      revisionOf(remote)
    );
    renderConflictPanel(freshInfo, remote, '', 'ready');
  }

  function renderConflictPanel(info, remote, notice, loadState) {
    const blob = info.blob;
    const local = readLocal(blob);
    const remoteRevision = remote ? revisionOf(remote) : '…';
    const statusText = notice ||
      (loadState === 'loading' ? 'よみこみちゅう… / checking cloud…' : '');
    const el = screen(`<div style="font-size:34px">🔀</div>
      <div style="font-weight:600">きろくが ふたつ あります</div>
      <div style="color:#aaa;font-size:13.5px;max-width:390px">
        Two different histories exist for this student.<br>
        <b>先生を よんでね / Please call your teacher.</b></div>
      <div style="display:flex;gap:10px;width:min(100%,420px);justify-content:center">
        ${conflictColumnHTML(
          'このデバイス<br>THIS DEVICE',
          summarizeConflictCopy(blob, local),
          info.localRevision
        )}
        ${conflictColumnHTML(
          'クラウド<br>CLOUD',
          summarizeConflictCopy(blob, remote && remote.data),
          remoteRevision
        )}
      </div>
      <div style="color:#7f86a8;font:600 12px/1.4 ui-monospace,monospace">
        DEVICE ${info.deviceCode}<br>${info.code} · ${blob}</div>
      <label for="booha-teacher-pin" style="font-size:12px;color:#b8bdd8">
        先生のリカバリーPIN / Teacher recovery PIN
      </label>
      <input id="booha-teacher-pin" type="password" inputmode="numeric"
        autocomplete="off" maxlength="12" aria-label="Teacher recovery PIN"
        style="width:150px;padding:11px 14px;text-align:center;font-size:20px;
        letter-spacing:5px;border:1px solid #4b5178;border-radius:9px;
        background:#17192a;color:#fff;outline:none">
      <div id="booha-resolve-status" role="status" aria-live="polite"
        style="min-height:20px;color:#ffb3bd;font-size:12px;max-width:390px">
        ${statusText}</div>
      <div style="display:flex;flex-direction:column;gap:9px;width:min(100%,360px)">
        <button id="booha-resolve-local" style="padding:12px 18px;
          background:#9a5b18;border:0;color:#fff;border-radius:10px;
          font:600 14px sans-serif;cursor:pointer">
          このデバイスをのこす / Keep this device
        </button>
        <button id="booha-resolve-cloud" style="padding:12px 18px;
          background:#4e58a8;border:0;color:#fff;border-radius:10px;
          font:600 14px sans-serif;cursor:pointer">
          クラウドにもどす / Restore cloud copy
        </button>
        <button id="booha-resolve-retry" style="display:none;padding:10px 18px;
          background:transparent;border:1px solid #4b5178;color:#c9cee6;
          border-radius:10px;font:600 13px sans-serif;cursor:pointer">
          もういちど / Retry cloud check
        </button>
      </div>
      <div style="color:#777e9f;font-size:11px;max-width:350px">
        The copy not chosen will be preserved for recovery.</div>`);

    const pin = el.querySelector('#booha-teacher-pin');
    const status = el.querySelector('#booha-resolve-status');
    const localBtn = el.querySelector('#booha-resolve-local');
    const cloudBtn = el.querySelector('#booha-resolve-cloud');
    const retryBtn = el.querySelector('#booha-resolve-retry');
    const buttons = [localBtn, cloudBtn];
    let localArmed = false;

    function setBusy(busy) {
      buttons.forEach(button => { button.disabled = busy; button.style.opacity = busy ? '.55' : '1'; });
      pin.disabled = busy;
    }

    if (loadState !== 'ready') {
      setBusy(true);
      if (loadState === 'error') retryBtn.style.display = 'block';
    }

    async function choose(choice) {
      const teacherPin = String(pin.value || '').trim();
      if (!teacherPin) {
        status.textContent = '先生のPINを入力してください / Enter the teacher PIN.';
        pin.focus();
        return;
      }
      setBusy(true);
      status.textContent = 'かくにん中… / Checking…';
      const result = await resolveConflict(info, choice, teacherPin);
      pin.value = '';
      if (result.ok) return;
      if (result.reason === 'RESOLUTION_STALE') {
        showConflict(result.info,
          'Cloud progress changed again. Please review and enter the PIN once more.');
        return;
      }
      setBusy(false);
      if (result.reason === 'RATE_LIMITED') {
        status.textContent = 'Too many attempts. Please wait and try again.';
      } else if (result.reason === 'ARCHIVE_FAILED') {
        status.textContent = 'Could not preserve the displaced copy. Nothing was replaced.';
      } else if (result.reason === 'LOCAL_WRITE_FAILED' ||
                 result.reason === 'INVALID_REMOTE') {
        status.textContent = 'This device could not install the chosen copy. Nothing local was erased.';
      } else if (result.reason === 'NETWORK_ERROR') {
        status.textContent = 'Connection failed. Check Wi-Fi and try again.';
      } else {
        status.textContent = 'PIN was not accepted. Please ask your teacher.';
      }
    }

    localBtn.addEventListener('click', () => {
      if (localBtn.disabled) return;
      if (!localArmed) {
        localArmed = true;
        localBtn.textContent = 'ほんとうに？ / Confirm overwrite cloud';
        localBtn.style.background = '#b0392f';
        status.textContent =
          'クラウドのきろくをうわがきします / This will overwrite the cloud copy.';
        return;
      }
      choose('local');
    });
    cloudBtn.addEventListener('click', () => choose('cloud'));
    retryBtn.addEventListener('click', () => {
      renderConflictPanel(info, null, '', 'loading');
      refreshConflictPanel(info);
    });
  }

  async function resolveConflict(info, choice, teacherPin) {
    const blob = info && info.blob;
    if (!['adventure', 'juku'].includes(blob) ||
        !['local', 'cloud'].includes(choice)) {
      return { ok: false, reason: 'INVALID_RESOLUTION' };
    }

    const localData = readLocal(blob);
    if (!localData) return { ok: false, reason: 'LOCAL_WRITE_FAILED' };

    const body = {
      token: token(),
      blob,
      choice,
      teacherPin,
      expectedRemoteRevision: Number(info.remoteRevision || 0),
      deviceId: deviceId()
    };
    if (choice === 'local') body.data = localData;

    let res;
    try {
      res = await post(RESOLVE_URL, body);
    } catch (e) {
      console.error('[sync] conflict resolution request failed:', e);
      return { ok: false, reason: 'NETWORK_ERROR' };
    }

    if (!res || res.ok !== true) {
      if (res && res.reason === 'RESOLUTION_STALE' && res.remote) {
        refreshMeta();
        const updated = conflictInfo(
          blob,
          Number(_meta[blob + 'Revision'] || info.localRevision || 0),
          revisionOf(res.remote)
        );
        try {
          localStorage.setItem(`${META_BASE}:conflict:${blob}:${uid()}`,
                               JSON.stringify(res.remote));
        } catch (e) {}
        mutateMeta(m => {
          m.blocked = true;
          m.conflict = updated;
        }, 'conflict', blob);
        return { ok: false, reason: 'RESOLUTION_STALE', info: updated };
      }
      return { ok: false, reason: res && res.reason || 'RESOLUTION_REJECTED' };
    }

    let authoritativeData;
    let resolvedRevision = Number(res.revision || 0);
    let archived = true;

    if (choice === 'cloud') {
      const remote = res.remote || {
        data: res.data,
        revision: res.revision,
        updatedAt: res.updatedAt
      };
      if (!remote || !remote.data || typeof remote.data !== 'object') {
        return { ok: false, reason: 'INVALID_REMOTE' };
      }

      // The local copy is still untouched here. If it cannot be quarantined,
      // fail closed rather than erasing the student's offline work.
      archived = preserveResolutionCopy(blob, 'local-displaced-by-cloud', {
        data: localData,
        revision: Number(_meta[blob + 'Revision'] || info.localRevision || 0),
        updatedAt: localData.updatedAt || null
      });
      if (!archived) return { ok: false, reason: 'ARCHIVE_FAILED' };
      if (!writeLocal(blob, remote.data)) {
        return { ok: false, reason: 'LOCAL_WRITE_FAILED' };
      }
      authoritativeData = remote.data;
      resolvedRevision = revisionOf(remote);
    } else {
      // Wix has accepted this exact snapshot. The displaced remote copy is
      // returned by the resolver and preserved locally when storage permits.
      authoritativeData = localData;
      archived = preserveResolutionCopy(
        blob, 'cloud-displaced-by-local', res.displaced
      );
    }

    const authoritativeSignature = dataSignature(authoritativeData);
    const currentLocalSignature = dataSignature(readLocal(blob));
    mutateMeta(m => {
      m[blob + 'Revision'] = resolvedRevision;
      m[blob + 'Dirty'] =
        choice === 'local' && currentLocalSignature !== authoritativeSignature;
      m[blob + 'Seen'] = true;
      m[blob + 'SyncedSignature'] = authoritativeSignature;
      m.blocked = false;
      m.conflict = null;
      m.lastSyncAt = Date.now();
      m.lastResolutionAt = Date.now();
    }, 'resolved', blob);
    if (archived) clearStoredConflict(blob);

    console.warn(`[sync] ${blob}: teacher resolved conflict using ${choice} copy at revision ${resolvedRevision}.`);
    _blockedByConflict = false;
    clearScreen();
    ready();
    refreshMeta();
    if (isEffectivelyDirty(blob, readLocal(blob))) schedulePush(blob);
    return { ok: true, choice, revision: resolvedRevision };
  }

  function showOfflineBlocked() {
    _blockedByConflict = false;
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
    const dirty    = isEffectivelyDirty(blob, local);
    const hasLocal = local !== null && !isEmpty(blob, local);

    if (!remote.data) {
      if (!hasLocal) return { act: 'none' };                 // nothing to claim
      return { act: 'push', base: 0 };                       // seed revision 1
    }

    if (!hasLocal) return { act: 'install' };                // fresh device

    // Rollout rule: this blob predates cloud sync. Wix is authoritative; keep
    // a recovery snapshot only when the local progress is meaningfully
    // different from the cloud copy.
    if (!_meta[blob + 'Seen']) {
      const equivalent = equivalentProgress(blob, remote.data, local);
      if (localRev === 0 && !dirty) {
        return {
          act: 'install',
          preserveLocal: !equivalent,
          recoveredConflict: !equivalent
        };
      }
      return {
        act: 'install',
        preserveLocal: !equivalent,
        recoveredConflict: !equivalent
      };
    }

    if (!dirty) {
      if (remote.revision === localRev) return { act: 'none' };
      if (remote.revision >  localRev) return { act: 'install' };
      // A clean local revision ahead of Wix means revision bookkeeping
      // regressed. Preserve it, but keep the server deterministic.
      return {
        act: 'install', preserveLocal: true, recoveredConflict: true
      };
    }

    if (remote.revision === localRev) return { act: 'push', base: localRev };
    // A different server revision no longer blocks the student at login.
    // Harmless timestamp/order differences simply collapse into the cloud
    // copy. Genuine local work is quarantined first, then cloud continues.
    const equivalent = equivalentProgress(blob, remote.data, local);
    return {
      act: 'install',
      preserveLocal: !equivalent,
      recoveredConflict: !equivalent
    };
  }

  /* ── restore ─────────────────────────────────────────── */

  async function restore() {
    if (_state === 'restoring') return;
    if (!uid() || !token()) { block('no identity'); return; }

    _state = 'restoring';
    _blockedByConflict = false;
    refreshMeta();
    // v2 stored terminal conflict state in localStorage. Under the cloud-first
    // policy, an old blocked flag is migration data—not a reason to reopen the
    // retired teacher decision screen.
    if (_meta.blocked && _meta.conflict) {
      const oldConflictBlob = _meta.conflict.blob;
      mutateMeta(m => {
        m.blocked = false;
        m.conflict = null;
      }, 'conflict-cleared');
      if (oldConflictBlob) clearStoredConflict(oldConflictBlob);
    }
    mutateMeta(m => {
      m.blocked = false;
      m.conflict = null;
    }, 'restore');
    showRestoring();

    const blobs = availableBlobs();
    if (!blobs.length) { block('no local storage engine'); return; }

    if (!navigator.onLine) {
      const hasAny = blobs.some(blob => {
        const local = readLocal(blob);
        return local && !isEmpty(blob, local);
      });
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

    const recoveredBlobs = [];
    for (const blob of blobs) {
      const remote = res[blob] || { data: null, revision: 0 };
      refreshMeta();
      let d = decide(blob, remote);

      // A sibling tab may have saved while the network load was in flight.
      // Re-check immediately before a remote install so that new local work
      // becomes dirty/pushable instead of being overwritten by the response.
      if (d.act === 'install') {
        refreshMeta();
        d = decide(blob, remote);
      }

      if (d.act === 'install') {
        const installed = await installCloudCopy(blob, remote, {
          preserveLocal: !!d.preserveLocal,
          recoveredConflict: !!d.recoveredConflict,
          reason: 'automatic-cloud-recovery-at-login'
        });
        if (!installed) {
          showFailed(() => restore());
          _state = 'blocked';
          return;
        }
        if (d.recoveredConflict) recoveredBlobs.push(blob);
        console.log(`[sync] ${blob}: installed remote revision ${remote.revision}`);

      } else if (d.act === 'push') {
        setDirty(blob);
        const okPush = await pushBlob(blob, d.base);
        if (!okPush) console.warn(`[sync] ${blob}: initial push deferred`);

      } else {
        mutateMeta(m => {
          m[blob + 'Seen'] = true;
          m[blob + 'SyncedSignature'] = dataSignature(readLocal(blob));
          m.blocked = false;
          m.conflict = null;
        }, 'revision', blob);
        clearStoredConflict(blob);
        console.log(`[sync] ${blob}: already in sync (revision ${remote.revision})`);
      }
    }

    mutateMeta(m => { m.lastSyncAt = Date.now(); }, 'ready');
    clearScreen();
    ready();
    const notices = Array.from(new Set(recoveredBlobs.concat(takeRecoveryNotices())));
    if (notices.length) showRecoveryNotice(notices);
    refreshMeta();
    blobs.forEach(blob => {
      if (isEffectivelyDirty(blob, readLocal(blob))) schedulePush(blob);
    });
  }

  function ready() {
    _state = 'ready';
    if (window.BOOHA_SYNC_READY) return;
    window.BOOHA_SYNC_READY = true;
    document.dispatchEvent(new Event('booha:syncReady'));
  }

  function block(why) {
    console.error('[sync] blocked:', why);
    _state = 'blocked';
    showFailed(() => restore());
  }

  /* ── push ────────────────────────────────────────────── */

  async function recoverMatchingConflict(blob, sentData, sentChangeId, base, responseRemote) {
    // If another tab already recorded a newer shared revision while this
    // request was travelling, that tab won the race. Keep any newer dirty flag
    // and let the normal scheduler send the latest shared local blob.
    refreshMeta();
    if (Number(_meta[blob + 'Revision'] || 0) > base && !_meta.blocked) {
      console.log(`[sync] ${blob}: sibling tab already advanced the revision; retrying latest data.`);
      return true;
    }

    let remote = responseRemote || null;
    if (!remote || !remote.data) {
      try {
        const loaded = await post(LOAD_URL, { token: token() });
        if (loaded && loaded.ok) remote = loaded[blob] || null;
      } catch (e) {
        console.warn('[sync] conflict comparison load failed:', e.message);
      }
    }

    // Concurrent uploads with the same meaningful progress are harmless even
    // when timestamps or key order differ. If no newer local save landed,
    // install the server bytes too so raw-signature tracking stays clean.
    if (remote && equivalentProgress(blob, remote.data, sentData)) {
      const remoteRev = revisionOf(remote);
      const remoteSignature = dataSignature(remote.data);
      refreshMeta();
      const unchanged = _meta[blob + 'ChangeId'] === sentChangeId;
      if (unchanged && !writeLocal(blob, remote.data)) return false;
      const latestLocalSignature = dataSignature(readLocal(blob));
      mutateMeta(m => {
        m[blob + 'Revision'] = remoteRev;
        m[blob + 'Dirty'] =
          !unchanged ||
          latestLocalSignature !== remoteSignature;
        m[blob + 'Seen'] = true;
        m[blob + 'SyncedSignature'] = remoteSignature;
        m.blocked = false;
        m.conflict = null;
        m.lastSyncAt = Date.now();
      }, 'revision', blob);
      clearStoredConflict(blob);
      console.log(`[sync] ${blob}: identical concurrent upload adopted at revision ${remoteRev}.`);
      return true;
    }
    return false;
  }

  async function recoverDivergentConflict(blob, responseRemote) {
    let remote = responseRemote || null;
    if (!remote || !remote.data) {
      try {
        const loaded = await post(LOAD_URL, { token: token() });
        if (loaded && loaded.ok) remote = loaded[blob] || null;
      } catch (e) {
        console.warn('[sync] cloud-first recovery load failed:', e.message);
      }
    }
    if (!remote || !remote.data) return false;

    const local = readLocal(blob);
    const equivalent = equivalentProgress(blob, local, remote.data);
    const installed = await installCloudCopy(blob, remote, {
      preserveLocal: !equivalent,
      recoveredConflict: !equivalent,
      reason: 'automatic-cloud-recovery-after-push-conflict'
    });
    if (!installed) return false;

    console.warn(`[sync] ${blob}: cloud revision ${revisionOf(remote)} restored after a divergent push.`);
    if (!equivalent) {
      queueRecoveryNotice(blob);
      setTimeout(() => window.location.reload(), 250);
    }
    return true;
  }

  async function pushBlobLocked(blob, baseOverride) {
    refreshMeta();
    if (_state === 'blocked' || _meta.blocked) return false;
    if (!pageVisible()) return false;        // visible tab becomes the writer

    const data = readLocal(blob);
    if (!data || isEmpty(blob, data)) return false;
    if (!isEffectivelyDirty(blob, data)) return true; // sibling already pushed it

    const sharedBase = Number(_meta[blob + 'Revision'] || 0);
    const base = sharedBase > 0
      ? sharedBase
      : Number(baseOverride !== undefined ? baseOverride : sharedBase);
    const sentChangeId = _meta[blob + 'ChangeId'] || '';
    const sentSignature = dataSignature(data);

    let res;
    try {
      res = await post(PUSH_URL, { token: token(), blob, baseRevision: base, data });
    } catch (e) {
      console.warn('[sync] push failed (will retry):', blob, e.message);
      mutateMeta(m => { m[blob + 'Dirty'] = true; }, 'dirty', blob);
      return false;
    }

    if (res && res.ok) {
      const latestLocalSignature = dataSignature(readLocal(blob));
      mutateMeta(m => {
        m[blob + 'Revision'] = res.revision;
        m[blob + 'Dirty'] =
          m[blob + 'ChangeId'] !== sentChangeId ||
          latestLocalSignature !== sentSignature;
        m[blob + 'Seen'] = true;
        m[blob + 'SyncedSignature'] = sentSignature;
        m.blocked = false;
        m.conflict = null;
        m.lastSyncAt = Date.now();
      }, 'revision', blob);
      clearStoredConflict(blob);
      console.log(`[sync] ${blob}: pushed revision ${res.revision}`);
      return true;
    }

    if (res && res.reason === 'REVISION_CONFLICT') {
      if (await recoverMatchingConflict(
        blob, data, sentChangeId, base, res.remote || null
      )) return true;

      if (await recoverDivergentConflict(blob, res.remote || null)) return true;

      // The server copy could not be loaded or the local recovery archive
      // could not be written. Do not overwrite anything and do not ask the
      // student to choose histories; retain dirty state and retry later.
      console.error(`[sync] ${blob}: cloud-first recovery deferred; local copy retained.`);
      mutateMeta(m => {
        m.blocked = false;
        m.conflict = null;
        m[blob + 'Dirty'] = true;
      }, 'dirty', blob);
      return false;
    }

    console.warn('[sync] push rejected:', blob, res && res.reason);
    mutateMeta(m => { m[blob + 'Dirty'] = true; }, 'dirty', blob);
    return false;
  }

  function pushBlob(blob, baseOverride) {
    refreshMeta();
    if (_state === 'blocked' || _meta.blocked) return Promise.resolve(false);
    if (_inflight[blob]) return _inflight[blob];
    if (!pageVisible()) return Promise.resolve(false);

    _inflight[blob] = withPushLock(
      blob, () => pushBlobLocked(blob, baseOverride)
    ).finally(() => {
      _inflight[blob] = null;
      refreshMeta();
      if (_state === 'ready' && !_meta.blocked &&
          isEffectivelyDirty(blob, readLocal(blob)) && pageVisible()) {
        schedulePush(blob);
      }
    });

    return _inflight[blob];
  }

  /* ── dirty tracking ──────────────────────────────────── */

  function setDirty(blob) {
    const changeId = nextChangeId();
    mutateMeta(m => {
      m[blob + 'Dirty'] = true;
      m[blob + 'ChangeId'] = changeId;
    }, 'dirty', blob);
  }

  function schedulePush(blob) {
    clearTimeout(_timers[blob]);
    if (!pageVisible()) return;
    _timers[blob] = setTimeout(() => pushBlob(blob), DEBOUNCE_MS);
  }

  function markDirty(blob) {
    if (_state !== 'ready' || !availableBlobs().includes(blob)) return;
    setDirty(blob);
    // Adventure writes are sparse and can be followed by a device switch, so
    // trailing debounce prevents ordinary roaming from becoming a conflict.
    // Juku stays checkpoint-only to avoid a network request per exam item.
    if (blob === 'adventure') schedulePush(blob);
  }

  /** Immediate push — call at meaningful boundaries. */
  function checkpoint(blob) {
    if (_state !== 'ready' || !availableBlobs().includes(blob)) {
      return Promise.resolve(false);
    }
    refreshMeta();
    clearTimeout(_timers[blob]);
    if (!isEffectivelyDirty(blob, readLocal(blob))) return Promise.resolve(true);
    return pushBlob(blob);
  }

  document.addEventListener('booha:saved', () => markDirty('adventure'));
  document.addEventListener('juku:saved',  () => markDirty('juku'));

  /* ── same-device tab coordination ────────────────────── */

  function applySharedMeta() {
    if (!uid()) return;
    refreshMeta();

    if (_meta.blocked) {
      const oldBlob = _meta.conflict && _meta.conflict.blob;
      mutateMeta(m => {
        m.blocked = false;
        m.conflict = null;
      }, 'conflict-cleared', oldBlob);
      if (oldBlob) clearStoredConflict(oldBlob);
      if (_state !== 'restoring' && navigator.onLine) restore();
      return;
    }

    if (_blockedByConflict &&
        Number(_meta.lastResolutionAt || 0) > _conflictResolutionBaseline) {
      _blockedByConflict = false;
      clearScreen();
      ready();
    }

    if (_state === 'ready' && pageVisible()) {
      availableBlobs().forEach(blob => {
        if (isEffectivelyDirty(blob, readLocal(blob))) schedulePush(blob);
      });
    }
  }

  function setupCoordination() {
    if (!_channel && typeof window.BroadcastChannel === 'function') {
      try {
        _channel = new window.BroadcastChannel(CHANNEL_NAME);
        _channel.addEventListener('message', event => {
          const msg = event.data || {};
          if (msg.sender === TAB_ID || msg.userId !== uid()) return;
          applySharedMeta();
        });
      } catch (e) {
        console.warn('[sync] BroadcastChannel unavailable; storage events remain active.');
      }
    }
  }

  window.addEventListener('storage', event => {
    if (event.key === metaKey()) applySharedMeta();
  });

  function resumeVisibleTab() {
    if (!pageVisible() || !uid()) return;
    const wasBlocked = _state === 'blocked';
    applySharedMeta();
    if (wasBlocked && _state === 'blocked' && window.BOOHA_SYNC_READY &&
        !_meta.blocked &&
        navigator.onLine) {
      restore();
    }
  }

  document.addEventListener('visibilitychange', resumeVisibleTab);
  window.addEventListener('pageshow', resumeVisibleTab);

  // Do not write metadata from pagehide. An older hidden page doing that was
  // able to overwrite a sibling tab's newer revision—the core classroom bug.
  // Metadata is persisted immediately at every mutation instead.

  /* ── boot ────────────────────────────────────────────── */

  function begin() {
    setupCoordination();
    deviceId(); // establish one stable installation id shared by its tabs
    if (window.BOOHA_IDENTITY_READY) restore();
    else document.addEventListener('booha:identityReady', restore, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin, { once: true });
  } else {
    begin();
  }

  return {
    checkpoint,
    markDirty,
    verifyTeacherPin,
    get state()    { return _state; },
    get meta()     { return _meta; },
    get deviceId() { return deviceId(); },
    restore
  };
})();
