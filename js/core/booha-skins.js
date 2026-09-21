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
  const CURRENT_SEASON_ID = 'halloween';
  const POSE_KEYS = Object.freeze([
    'maze', 'karasuki', 'grimmerglen', 'utsuroba', 'muenba', 'familyRoom',
    'marking', 'hiding', 'danceArmsUp', 'danceSway', 'danceWave',
  ]);
  const BLITZ_GAME_TYPES = Object.freeze(['vocab', 'sentences', 'questions']);
  const BLITZ_CURRICULA = Object.freeze(['pb', 'br', 'bc']);
  const SKINS = Object.freeze({
    batty: Object.freeze({
      id: 'batty',
      seasonId: 'halloween',
      enabled: true,
      name: 'Batty Booha',
      nameJp: 'バッティー・ブーハー',
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
    mummington: Object.freeze({
      id: 'mummington',
      seasonId: 'halloween',
      enabled: true,
      name: 'Mummington Booha',
      nameJp: 'マミングトン ブーハー',
      unlockId: 'booha_skin_mummington',
      assets: Object.freeze({
        maze: 'assets/skins/mummington_booha/static.png',
        karasuki: 'assets/skins/mummington_booha/static.png',
        grimmerglen: 'assets/skins/mummington_booha/static.png',
        utsuroba: 'assets/skins/mummington_booha/static.png',
        muenba: 'assets/skins/mummington_booha/static.png',
        familyRoom: 'assets/skins/mummington_booha/static.png',
        marking: 'assets/skins/mummington_booha/marking.png',
        hiding: 'assets/skins/mummington_booha/hiding.png',
        danceArmsUp: 'assets/skins/mummington_booha/dance_arms_up.png',
        danceSway: 'assets/skins/mummington_booha/dance_sway.png',
        danceWave: 'assets/skins/mummington_booha/dance_wave.png',
      }),
    }),
  });

  const SEASONS = Object.freeze({
    halloween: Object.freeze({
      id: 'halloween',
      name: 'Halloween',
      rotationStartOccurrenceKey: '2026-09-20|september-w4',
      characterIds: Object.freeze(['batty', 'mummington']),
    }),
  });

  function save() {
    return window.BoohaAdventure && BoohaAdventure.save;
  }

  function currentWeekKey() {
    try {
      const calendar = window.CALENDAR;
      const week = calendar?.getCurrentCurriculumWeek?.();
      return calendar?.getCurriculumWeekOccurrenceKey?.(week) || week?.occurrenceKey || '';
    } catch (_) { return ''; }
  }

  function rotationCharacterId(seasonId = CURRENT_SEASON_ID, occurrenceKey = currentWeekKey()) {
    const season = getSeason(seasonId);
    if (!season || !season.characterIds.length) return null;
    const anchor = String(season.rotationStartOccurrenceKey || '').split('|')[0];
    const current = String(occurrenceKey || '').split('|')[0];
    const anchorMs = Date.parse(`${anchor}T00:00:00Z`);
    const currentMs = Date.parse(`${current}T00:00:00Z`);
    if (!Number.isFinite(anchorMs) || !Number.isFinite(currentMs) || currentMs < anchorMs) {
      return season.characterIds[0];
    }
    const weekIndex = Math.floor((currentMs - anchorMs) / (7 * 24 * 60 * 60 * 1000));
    return season.characterIds[weekIndex % season.characterIds.length];
  }

  function hasCurrentBlitzTriple(data) {
    const blitz = data?.meta?.blitz;
    const weekKey = currentWeekKey();
    if (!blitz || typeof blitz !== 'object' || !weekKey || blitz.weeklyKey !== weekKey) return false;
    const weekly = blitz.weekly;
    if (!weekly || typeof weekly !== 'object' || Array.isArray(weekly)) return false;
    return BLITZ_CURRICULA.some(curriculum =>
      BLITZ_GAME_TYPES.every(type => !!weekly[type]?.[curriculum])
    );
  }

  function get(id) {
    return SKINS[id] || null;
  }

  function getSeason(id = CURRENT_SEASON_ID) {
    return SEASONS[id] || null;
  }

  function hasCompleteAssetSet(id) {
    const skin = get(id);
    return !!skin && POSE_KEYS.every(key => typeof skin.assets[key] === 'string' && skin.assets[key]);
  }

  function isAvailable(id) {
    const skin = get(id);
    return !!skin && skin.enabled === true && hasCompleteAssetSet(id);
  }

  function seasonCharacters(seasonId = CURRENT_SEASON_ID) {
    const season = getSeason(seasonId);
    if (!season) return [];
    return season.characterIds.map(id => get(id)).filter(Boolean);
  }

  function availableCharacters(seasonId = CURRENT_SEASON_ID) {
    return seasonCharacters(seasonId).filter(skin => isAvailable(skin.id));
  }

  function nextAvailableId(id, seasonId = CURRENT_SEASON_ID) {
    const characters = availableCharacters(seasonId);
    if (!characters.length) return null;
    const index = characters.findIndex(skin => skin.id === id);
    return characters[(index + 1 + characters.length) % characters.length].id;
  }

  function isUnlocked(id) {
    const skin = get(id);
    if (!skin) return false;
    try {
      const data = save()?.load();
      return rotationCharacterId(skin.seasonId) === id &&
        !!(data?.weekly?.unlockedBoohaSkins || {})[id] && hasCurrentBlitzTriple(data);
    } catch (_) { return false; }
  }

  function selectedId() {
    try {
      const id = save()?.load()?.meta?.selectedBoohaSkin;
      return isAvailable(id) && isUnlocked(id) ? id : null;
    } catch (_) { return null; }
  }

  function asset(world, role = 'static') {
    const skin = SKINS[selectedId()];
    if (!skin) return null;
    const key = role === 'static' ? world : role;
    return skin.assets[key] || null;
  }

  function unlockAndEquip(id) {
    const skin = get(id);
    const saveFile = save();
    if (!skin || !isAvailable(id) || !saveFile) return false;
    const data = saveFile.load();
    if (rotationCharacterId(skin.seasonId) !== id || !hasCurrentBlitzTriple(data)) return false;
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

  return Object.freeze({
    BASE,
    CURRENT_SEASON_ID,
    POSE_KEYS,
    hasCurrentBlitzTriple,
    SKINS,
    SEASONS,
    get,
    getSeason,
    hasCompleteAssetSet,
    isAvailable,
    seasonCharacters,
    availableCharacters,
    nextAvailableId,
    rotationCharacterId,
    isUnlocked,
    selectedId,
    asset,
    unlockAndEquip,
    equip,
  });
})();

window.BoohaSkins = BoohaSkins;
