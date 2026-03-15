
/**
 * adventure-core.js
 * The Booha Adventure — Core System Hub
 * Initializes and connects all subsystems. Include this first on every page.
 */

const BoohaAdventure = (() => {
  'use strict';

  const VERSION = '1.0.0';
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

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    if (_initialized) return;
    _initialized = true;

    // Boot all registered systems in order
    const bootOrder = [
      'saveFile', 'saveUtils', 'saveCode',
      'gameRegistry', 'weekSystem',
      'scoreSystem', 'unlockSystem', 'statsSystem', 'collectibleSystem',
      'pageState',
      'saveMenu', 'memoryCodeUI'
    ];

    bootOrder.forEach(name => {
      if (_systems[name]) _bootSystem(name, _systems[name]);
    });

    // Boot any remaining systems not in the explicit order
    Object.keys(_systems).forEach(name => {
      if (!bootOrder.includes(name)) _bootSystem(name, _systems[name]);
    });

    console.log(`[BoohaAdventure] v${VERSION} ready. Systems: ${Object.keys(_systems).join(', ')}`);
    document.dispatchEvent(new CustomEvent('booha:ready', { detail: { version: VERSION } }));
  }

  // ── Auto-init on DOM ready ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded (script added late)
    setTimeout(init, 0);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    VERSION,
    registerSystem,
    getSystem,
    init,

    // Convenience getters
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

// Make globally available
window.BoohaAdventure = BoohaAdventure;
