
/**
 * adventure-core.js
 * The Booha Adventure — Core System Hub
 * v2: adds weekly reset detection using window.CALENDAR at boot.
 */
const BoohaAdventure = (() => {
  'use strict';
  const VERSION = '2.0.0';
  let _initialized = false;

  // ── Subsystem registry ────────────────────────────────────────────────────
  const _systems = {};

  function registerSystem(name, instance) {
    _systems[name] = instance;
    if (_initialized) _bootSystem(name, instance);
  }

  function getSystem(name) {
    if (!_systems[name]) {
      console.warn(`[BoohaAdventure] System "${name}" not found.`);
      return null;
    }
    return _systems[name];
  }

  function _bootSystem(name, instance) {
    if (typeof instance.init === 'function') {
      try {
        instance.init();
      } catch (e) {
        console.error(`[BoohaAdventure] Failed to init system "${name}":`, e);
      }
    }
  }

  // ── Weekly reset key ──────────────────────────────────────────────────────
  /**
   * Returns a string like "2026-march-w3" using window.CALENDAR.
   * This key changes every Monday (new week = new key).
   * If CALENDAR isn't loaded yet, returns null — reset is skipped safely.
   */
  function _getWeekKey() {
    try {
      if (!window.CALENDAR) return null;
      const cw = window.CALENDAR.getCurrentCurriculumWeek();
      return `${cw.year}-${cw.monthSlug}-w${cw.weekNumber}`;
    } catch (e) {
      console.warn('[BoohaAdventure] Could not read week key:', e);
      return null;
    }
  }

  /**
   * Check if the week has changed since last boot.
   * If yes, run the weekly reset and save the new key.
   * This runs after saveFile is booted so the save is readable.
   */
  function _checkWeeklyReset() {
    const saveFile = _systems['saveFile'];
    if (!saveFile) return;

    const weekKey = _getWeekKey();

    

    if (!weekKey) return; // CALENDAR not available, skip

    const data          = saveFile.load();
    const storedKey     = (data.meta && data.meta.lastWeeklyKey) || '';

    if (storedKey === weekKey) return; // same week, nothing to do

    console.log(`[BoohaAdventure] New week detected: ${storedKey} → ${weekKey}. Resetting weekly data.`);

    // Reset weekly section
    saveFile.resetWeekly();

    // Save the new week key into meta
    const updated = saveFile.load();
    if (!updated.meta) updated.meta = {};
    updated.meta.lastWeeklyKey = weekKey;
    saveFile.save(updated);

    document.dispatchEvent(new CustomEvent('booha:newWeek', { detail: { weekKey } }));
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (_initialized) return;
    _initialized = true;

    // Boot order matters — saveFile must come first so the weekly check can read it
    const bootOrder = [
      'saveFile', 'saveUtils', 'saveCode',
      'gameRegistry', 'weekSystem',
      'scoreSystem', 'unlockSystem', 'statsSystem', 'collectibleSystem',
      'pageState',
      'saveMenu', 'memoryCodeUI',
    ];

    bootOrder.forEach(name => {
      if (_systems[name]) _bootSystem(name, _systems[name]);
    });

    // Boot any remaining systems not in the explicit order
    Object.keys(_systems).forEach(name => {
      if (!bootOrder.includes(name)) _bootSystem(name, _systems[name]);
    });

    // ── Weekly reset check — runs after all systems are booted ───────────────
    _checkWeeklyReset();

    // If CALENDAR was not ready yet at boot, retry briefly until it appears.
    if (!window.CALENDAR) {
      let tries = 0;
      const retry = setInterval(() => {
        tries++;

        if (window.CALENDAR) {
          clearInterval(retry);
          _checkWeeklyReset();
          return;
        }

        if (tries >= 30) {
          clearInterval(retry);
          console.warn('[BoohaAdventure] CALENDAR never became ready; weekly reset check skipped.');
        }
      }, 100);
    }

    // ── Auto-submit scores from booha:gameEnd ────────────────────────────────
    document.addEventListener('booha:gameEnd', (e) => {
      const { saveId, score, completed, time } = e.detail || {};
      if (!saveId || score == null) {
        console.warn('[BoohaAdventure] booha:gameEnd missing saveId or score.', e.detail);
        return;
      }
      if (BoohaAdventure.scores) {
        BoohaAdventure.scores.submit(saveId, score, { completed, time });
      } else {
        console.warn('[BoohaAdventure] booha:gameEnd fired before scoreSystem ready.');
      }
    });

    window.BOOHA_READY = true;
    console.log(`[BoohaAdventure] v${VERSION} ready. Systems: ${Object.keys(_systems).join(', ')}`);
    document.dispatchEvent(new CustomEvent('booha:ready', { detail: { version: VERSION } }));
  }

// ── Boot gate: identity before storage ────────────────────────────────────
  // saveFile keys on booha_userid, which token.js writes only after its async
  // verify returns — always after DOMContentLoaded. Booting on DOM ready meant
  // _checkWeeklyReset() could read, reset and rewrite the *legacy* save before
  // the student was known. Wait for the identity signal; fall back on a timer
  // so a page without token.js, or a stalled verify, still boots.

  const IDENTITY_TIMEOUT_MS = 8000;

  function _bootWhenReady() {
    if (window.BOOHA_IDENTITY_READY) { init(); return; }

    let fired = false;
    const go = (why) => {
      if (fired) return;
      fired = true;
      if (why === 'timeout') {
        console.warn('[BoohaAdventure] Identity never signalled — booting on the legacy save key.');
      }
      init();
    };

    document.addEventListener('booha:identityReady', () => go('identity'), { once: true });
    setTimeout(() => go('timeout'), IDENTITY_TIMEOUT_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootWhenReady);
  } else {
    setTimeout(_bootWhenReady, 0);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    VERSION,
    registerSystem,
    getSystem,
    init,
    get save()        { return getSystem('saveFile'); },
    get scores()      { return getSystem('scoreSystem'); },
    get unlocks()     { return getSystem('unlockSystem'); },
    get stats()       { return getSystem('statsSystem'); },
    get collectibles(){ return getSystem('collectibleSystem'); },
    get pageState()   { return getSystem('pageState'); },
    get registry()    { return getSystem('gameRegistry'); },
    get weeks()       { return getSystem('weekSystem'); },
  };
})();

window.BoohaAdventure = BoohaAdventure;
