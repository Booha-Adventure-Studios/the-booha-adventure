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
        maze: 'assets/skins/mummington_booha/static.webp',
        karasuki: 'assets/skins/mummington_booha/static.webp',
        grimmerglen: 'assets/skins/mummington_booha/static.webp',
        utsuroba: 'assets/skins/mummington_booha/static.webp',
        muenba: 'assets/skins/mummington_booha/static.webp',
        familyRoom: 'assets/skins/mummington_booha/static.webp',
        marking: 'assets/skins/mummington_booha/marking.webp',
        hiding: 'assets/skins/mummington_booha/hiding.webp',
        danceArmsUp: 'assets/skins/mummington_booha/dance_arms_up.webp',
        danceSway: 'assets/skins/mummington_booha/dance_sway.webp',
        danceWave: 'assets/skins/mummington_booha/dance_wave.webp',
      }),
    }),
    mortisa: Object.freeze({
      id: 'mortisa',
      seasonId: 'halloween',
      enabled: true,
      name: 'Mortisa Booha',
      nameJp: 'モーティサ・ブーハー',
      unlockId: 'booha_skin_mortisa',
      assets: Object.freeze({
        maze: 'assets/skins/mortisa_booha/static.webp',
        karasuki: 'assets/skins/mortisa_booha/static.webp',
        grimmerglen: 'assets/skins/mortisa_booha/static.webp',
        utsuroba: 'assets/skins/mortisa_booha/static.webp',
        muenba: 'assets/skins/mortisa_booha/static.webp',
        familyRoom: 'assets/skins/mortisa_booha/static.webp',
        marking: 'assets/skins/mortisa_booha/marking.webp',
        hiding: 'assets/skins/mortisa_booha/hiding.webp',
        danceArmsUp: 'assets/skins/mortisa_booha/dance_arms_up.webp',
        danceSway: 'assets/skins/mortisa_booha/dance_sway.webp',
        danceWave: 'assets/skins/mortisa_booha/dance_wave.webp',
      }),
    }),
    doomlet: Object.freeze({
      id: 'doomlet',
      seasonId: 'halloween',
      enabled: true,
      name: 'Doomlet Booha',
      nameJp: 'ドゥームレット・ブーハー',
      unlockId: 'booha_skin_doomlet',
      assets: Object.freeze({
        maze: 'assets/skins/doomlet_booha/static.webp',
        karasuki: 'assets/skins/doomlet_booha/static.webp',
        grimmerglen: 'assets/skins/doomlet_booha/static.webp',
        utsuroba: 'assets/skins/doomlet_booha/static.webp',
        muenba: 'assets/skins/doomlet_booha/static.webp',
        familyRoom: 'assets/skins/doomlet_booha/static.webp',
        marking: 'assets/skins/doomlet_booha/marking.webp',
        hiding: 'assets/skins/doomlet_booha/hiding.webp',
        danceArmsUp: 'assets/skins/doomlet_booha/dance_arms_up.webp',
        danceSway: 'assets/skins/doomlet_booha/dance_sway.webp',
        danceWave: 'assets/skins/doomlet_booha/dance_wave.webp',
      }),
    }),
    hazel: Object.freeze({
      id: 'hazel',
      seasonId: 'halloween',
      enabled: true,
      name: 'Hazel Booha',
      nameJp: 'ヘイゼル・ブーハー',
      unlockId: 'booha_skin_hazel',
      assets: Object.freeze({
        maze: 'assets/skins/hazel_booha/static.webp',
        karasuki: 'assets/skins/hazel_booha/static.webp',
        grimmerglen: 'assets/skins/hazel_booha/static.webp',
        utsuroba: 'assets/skins/hazel_booha/static.webp',
        muenba: 'assets/skins/hazel_booha/static.webp',
        familyRoom: 'assets/skins/hazel_booha/static.webp',
        marking: 'assets/skins/hazel_booha/marking.webp',
        hiding: 'assets/skins/hazel_booha/hiding.webp',
        danceArmsUp: 'assets/skins/hazel_booha/dance_arms_up.webp',
        danceSway: 'assets/skins/hazel_booha/dance_sway.webp',
        danceWave: 'assets/skins/hazel_booha/dance_wave.webp',
      }),
    }),
    mister_happy: Object.freeze({
      id: 'mister_happy',
      seasonId: 'halloween',
      enabled: true,
      name: 'Mister Happy Booha',
      nameJp: 'ミスター・ハッピー・ブーハー',
      unlockId: 'booha_skin_mister_happy',
      assets: Object.freeze({
        maze: 'assets/skins/mister_happy_booha/static.webp',
        karasuki: 'assets/skins/mister_happy_booha/static.webp',
        grimmerglen: 'assets/skins/mister_happy_booha/static.webp',
        utsuroba: 'assets/skins/mister_happy_booha/static.webp',
        muenba: 'assets/skins/mister_happy_booha/static.webp',
        familyRoom: 'assets/skins/mister_happy_booha/static.webp',
        marking: 'assets/skins/mister_happy_booha/marking.webp',
        hiding: 'assets/skins/mister_happy_booha/hiding.webp',
        danceArmsUp: 'assets/skins/mister_happy_booha/dance_arms_up.webp',
        danceSway: 'assets/skins/mister_happy_booha/dance_sway.webp',
        danceWave: 'assets/skins/mister_happy_booha/dance_wave.webp',
      }),
    }),
  });

  const SEASONS = Object.freeze({
    halloween: Object.freeze({
      id: 'halloween',
      name: 'Halloween',
      // Halloween unlocks are assigned to the six Sunday-started occurrences
      // from September 20 through October 25, 2026.
      rotationStartOccurrenceKey: '2026-09-20|september-w3',
      characterIds: Object.freeze([
        'batty', 'mummington', 'mortisa', 'doomlet', 'hazel', 'mister_happy',
      ]),
      weeklyCharacterIds: Object.freeze({
        '2026-09-20': 'batty',
        '2026-09-27': 'mummington',
        '2026-10-04': 'mortisa',
        '2026-10-11': 'doomlet',
        '2026-10-18': 'hazel',
        '2026-10-25': 'mister_happy',
      }),
      // The landing menu is seasonal decoration, not a reward gate. Batty
      // appears there from September 27 through Halloween week even when the
      // student has not completed the Blitz games.
      menuSchedule: Object.freeze([
        Object.freeze({ start: '2026-09-27', end: '2026-10-31', characterId: 'batty' }),
      ]),
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

  function currentDateKey() {
    try {
      if (typeof window.CALENDAR?.getTodayKey === 'function') return window.CALENDAR.getTodayKey();
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date());
      const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
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
    const scheduledId = season.weeklyCharacterIds?.[current];
    if (scheduledId && season.characterIds.includes(scheduledId)) return scheduledId;
    const weekIndex = Math.floor((currentMs - anchorMs) / (7 * 24 * 60 * 60 * 1000));
    return season.characterIds[weekIndex % season.characterIds.length];
  }

  function menuCharacterId(seasonId = CURRENT_SEASON_ID, dateKey = currentDateKey()) {
    const season = getSeason(seasonId);
    const date = String(dateKey || '').slice(0, 10);
    const entry = (season?.menuSchedule || []).find(item => date >= item.start && date <= item.end);
    return entry && isAvailable(entry.characterId) ? entry.characterId : null;
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

  function unlock(id) {
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
    return saveFile.save(data);
  }

  function unlockAndEquip(id) {
    const skin = get(id);
    const saveFile = save();
    if (!skin || !unlock(id) || !saveFile) return false;
    const data = saveFile.load();
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
    menuCharacterId,
    unlock,
    isUnlocked,
    selectedId,
    asset,
    unlockAndEquip,
    equip,
  });
})();

window.BoohaSkins = BoohaSkins;
