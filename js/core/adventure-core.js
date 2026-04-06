
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

    // Diagnostic log — remove once weekly reset is confirmed working
    const _diagData = saveFile.load();
    console.log('[BoohaAdventure] Weekly check:', {
      hasCalendar: !!window.CALENDAR,
      weekKey,
      storedKey: (_diagData.meta && _diagData.meta.lastWeeklyKey) || ''
    });

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

    console.log(`[BoohaAdventure] v${VERSION} ready. Systems: ${Object.keys(_systems).join(', ')}`);
    document.dispatchEvent(new CustomEvent('booha:ready', { detail: { version: VERSION } }));
  }

  // ── Auto-init on DOM ready ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
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
