/**
 * Booha Adventure — weekly Booha skin registry.
 *
 * World scripts ask this registry for an asset instead of knowing where a
 * skin's files live. Unknown, locked, or malformed selections fall back to
 * the original yellow Booha so an incomplete save can never break a world.
 */
const BoohaSkins = (() => {
  'use strict';

  const BASE = 'assets/img/booha_ghost.webp';
  const SKINS = Object.freeze({
    batty: Object.freeze({
      id: 'batty',
      name: 'Batty Booha',
      unlockId: 'booha_skin_batty',
      assets: Object.freeze({
        maze: 'assets/skins/batty_booha/static.png',
        karasuki: 'assets/skins/batty_booha/static.png',
        grimmerglen: 'assets/skins/batty_booha/static.png',
        utsuroba: 'assets/skins/batty_booha/static.png',
        muenba: 'assets/skins/batty_booha/static.png',
        familyRoom: 'assets/skins/batty_booha/static.png',
        marking: 'assets/skins/batty_booha/marking.png',
        hiding: 'assets/skins/batty_booha/hiding.png',
        danceArmsUp: 'assets/skins/batty_booha/dance_arms_up.png',
        danceSway: 'assets/skins/batty_booha/dance_sway.png',
        danceWave: 'assets/skins/batty_booha/dance_wave.png',
      }),
    }),
  });

  function save() {
    return window.BoohaAdventure && BoohaAdventure.save;
  }

  function isUnlocked(id) {
    const skin = SKINS[id];
    if (!skin) return false;
    try {
      return !!(save()?.load()?.weekly?.unlockedBoohaSkins || {})[skin.id];
    } catch (_) { return false; }
  }

  function selectedId() {
    try {
      const id = save()?.load()?.meta?.selectedBoohaSkin;
      return SKINS[id] && isUnlocked(id) ? id : null;
    } catch (_) { return null; }
  }

  function asset(world, role = 'static') {
    const skin = SKINS[selectedId()];
    if (!skin) return null;
    const key = role === 'static' ? world : role;
    return skin.assets[key] || null;
  }

  function unlockAndEquip(id) {
    const skin = SKINS[id];
    const saveFile = save();
    if (!skin || !saveFile) return false;
    const data = saveFile.load();
    if (!data.weekly || typeof data.weekly !== 'object' || Array.isArray(data.weekly)) data.weekly = {};
    if (!data.weekly.unlockedBoohaSkins || typeof data.weekly.unlockedBoohaSkins !== 'object' || Array.isArray(data.weekly.unlockedBoohaSkins)) {
      data.weekly.unlockedBoohaSkins = {};
    }
    if (!data.weekly.unlockedBoohaSkins[skin.id]) {
      data.weekly.unlockedBoohaSkins[skin.id] = { unlockedAt: Date.now() };
    }
    // Remove the pre-weekly storage key if an older save was loaded without
    // passing through the current save-file migration first.
    if (data.unlocks && typeof data.unlocks === 'object') delete data.unlocks[skin.unlockId];
    if (!data.meta || typeof data.meta !== 'object') data.meta = {};
    data.meta.selectedBoohaSkin = skin.id;
    const ok = saveFile.save(data);
    if (ok) {
      document.dispatchEvent(new CustomEvent('booha:skinChanged', { detail: { id: skin.id } }));
      try { window.BoohaSync?.checkpoint('adventure'); } catch (_) {}
    }
    return ok;
  }

  function equip(id) {
    if (!isUnlocked(id)) return false;
    const saveFile = save();
    if (!saveFile) return false;
    return saveFile.patch('meta', { selectedBoohaSkin: id });
  }

  return Object.freeze({ BASE, SKINS, isUnlocked, selectedId, asset, unlockAndEquip, equip });
})();

window.BoohaSkins = BoohaSkins;
