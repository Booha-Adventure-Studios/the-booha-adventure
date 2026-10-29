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
  const HALLOWEEN_PALETTE = Object.freeze({
    orange: '#e8731f',
    purple: '#9b63e8',
    lime: '#a8e63d',
    black: '#070710',
  });
  const HALLOWEEN_GLOW = Object.freeze({
    orange: '#ff7a00',
    purple: '#b44dff',
    lime: '#9dff3a',
  });
  const CHRISTMAS_PALETTE = Object.freeze({
    red: '#c7354b',
    green: '#267448',
    white: '#fffaf0',
    gold: '#f2c95c',
    // Legacy semantic names keep existing shared world consumers working.
    orange: '#c7354b',
    purple: '#267448',
    lime: '#fffaf0',
    black: '#07130f',
  });
  const CHRISTMAS_GLOW = Object.freeze({
    red: '#ff6f78',
    green: '#55d486',
    white: '#ffffff',
    gold: '#ffe9a3',
    // Legacy semantic names keep existing shared world consumers working.
    orange: '#ff6f78',
    purple: '#55d486',
    lime: '#ffe9a3',
  });
  const HALLOWEEN_KARASUKI = Object.freeze({
    kind: 'barba',
    name: 'Barba',
    nameJp: 'バルバ',
    asset: 'assets/img/wanderers/barba.webp',
    color: '#b44dff',
    popupLabel: 'BARBA SAYS',
    popupLabelJp: 'バルバからのひとこと',
    lines: Object.freeze([
      Object.freeze({
        en: '{name}, hello! Did you know? West Virginia has stories about Mothman, a tall winged figure with red eyes.',
        jp: '{name}、こんにちは！ しってる？ ウェストバージニアには、あかい 目と つばさを もつ、おおきな モスマンの おはなしが あるよ。',
        furigana: Object.freeze({ '目': 'め' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? New Jersey legends tell of the Jersey Devil, a winged creature from the Pine Barrens.',
        jp: '{name}、こんにちは！ しってる？ ニュージャージーには、パイン・バレンズに すむ、つばさの ある ジャージー・デビルの 伝説が あるよ。',
        furigana: Object.freeze({ '伝説': 'でんせつ' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? A Tennessee legend tells of the Bell Witch, a spirit who spoke to the Bell family.',
        jp: '{name}、こんにちは！ しってる？ テネシーには、ベル家の 人たちに 話しかけた、ベル・ウィッチの 伝説が あるよ。',
        furigana: Object.freeze({ '家': 'け', '人': 'ひと', '話': 'はな', '伝説': 'でんせつ' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? In Appalachian campfire stories, a lonely hunter hears a creature ask for its tail back.',
        jp: '{name}、こんにちは！ しってる？ アパラチアの たき火の おはなしでは、ひとりの かりゅうどが、しっぽを かえしてと いう けものに あうよ。',
        furigana: Object.freeze({ '火': 'ひ' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? Maryland folklore describes the Snallygaster as a sky monster with a sharp beak and tentacles.',
        jp: '{name}、こんにちは！ しってる？ メリーランドの 伝説では、スナリーギャスターは、とがった くちばしと しょく手を もつ 空の かいぶつだよ。',
        furigana: Object.freeze({ '伝説': 'でんせつ', '手': 'しゅ', '空': 'そら' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? Pennsylvania stories say the shy Squonk hides in the forest and dissolves into tears when caught.',
        jp: '{name}、こんにちは！ しってる？ ペンシルベニアの おはなしでは、はずかしがりやの スクォンクは 森に かくれ、つかまると なみだに とけるよ。',
        furigana: Object.freeze({ '森': 'もり' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? Wisconsin has stories about a wolf-like creature seen along quiet country roads.',
        jp: '{name}、こんにちは！ しってる？ ウィスコンシンには、しずかな 田舎道で 見られた、オオカミの ような けものの おはなしが あるよ。',
        furigana: Object.freeze({ '田舎道': 'いなかみち', '見': 'み' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? West Virginia witnesses described the Flatwoods Monster as a tall figure with glowing eyes.',
        jp: '{name}、こんにちは！ しってる？ ウェストバージニアには、ひかる 目を もつ、おおきな フラットウッズ・モンスターの おはなしが あるよ。',
        furigana: Object.freeze({ '目': 'め' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? Wisconsin lumberjack tales describe the Hodag as a spiky monster with glowing eyes.',
        jp: '{name}、こんにちは！ しってる？ ウィスコンシンの きこりの おはなしには、ひかる 目と せなかの とげを もつ ホダグが でてくるよ。',
        furigana: Object.freeze({ '目': 'め' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? Arkansas and Missouri legends tell of the Ozark Howler, a horned beast with a chilling call.',
        jp: '{name}、こんにちは！ しってる？ アーカンソーと ミズーリには、つのを もつ けものの おそろしい なきごえの 伝説が あるよ。',
        furigana: Object.freeze({ '伝説': 'でんせつ' }),
      }),
    ]),
  });
  const CHRISTMAS_KARASUKI = Object.freeze({
    kind: 'grubb',
    name: 'Grubb',
    nameJp: 'グラブ',
    asset: 'assets/skins/grubb_booha/karasuki.webp',
    color: CHRISTMAS_GLOW.gold,
    popupLabel: 'GRUBB SAYS',
    popupLabelJp: 'グラブからのひとこと',
    lines: Object.freeze([
      Object.freeze({
        en: '{name}, hello! Did you know? In the U.S., many families leave cookies and milk for Santa.',
        jp: '{name}、こんにちは！ しってる？ アメリカでは、サンタさんに クッキーと ミルクを おいておく 家が おおいよ。',
        furigana: Object.freeze({ '家': 'いえ' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? In England, people pull Christmas crackers. Pop! There is a paper hat inside.',
        jp: '{name}、こんにちは！ しってる？ イギリスでは クリスマス・クラッカーを ひっぱるよ。ポン！ なかに かみの ぼうしが はいってるよ。',
        furigana: Object.freeze({}),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? Reindeer can see some kinds of light that people cannot see.',
        jp: '{name}、こんにちは！ しってる？ トナカイは、人には 見えない ひかりを 見られることが あるよ。',
        furigana: Object.freeze({ '人': 'ひと', '見': 'み' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? Evergreen trees stay green through the winter.',
        jp: '{name}、こんにちは！ しってる？ もみの木などの 常緑樹は、冬も みどりのままだよ。',
        furigana: Object.freeze({ '木': 'き', '常緑樹': 'じょうりょくじゅ', '冬': 'ふゆ' }),
      }),
      Object.freeze({
        en: '{name}, hello! Did you know? Snowflakes have six sides, and every one is different.',
        jp: '{name}、こんにちは！ しってる？ ゆきの 結晶は 六つの はしが あって、一つずつ ちがうよ。',
        furigana: Object.freeze({ '結晶': 'けっしょう', '六': 'むっ', '一': 'ひと' }),
      }),
    ]),
  });
  // One shared table keeps the checkpoint/room atmosphere aligned across
  // Maze, Karasuki, and Utsuroba. October is the Halloween orange/purple
  // month; December has an explicit Christmas red/green pair instead of a fallback.
  const MONTH_COLORS = Object.freeze([
    Object.freeze(['#ff3bbd', '#ff79d7']),
    Object.freeze(['#ff6b3b', '#ffaa5e']),
    Object.freeze(['#3bc8ff', '#a8edff']),
    Object.freeze(['#3bffee', '#b2ffda']),
    Object.freeze(['#ffd700', '#fff176']),
    Object.freeze(['#3b6fff', '#90aaff']),
    Object.freeze(['#a03bff', '#d49aff']),
    Object.freeze(['#ff9f3b', '#ffd08a']),
    Object.freeze(['#3bffee', '#a8fff8']),
    Object.freeze([HALLOWEEN_GLOW.orange, HALLOWEEN_GLOW.purple]),
    Object.freeze(['#ff3b6f', '#ff85a1']),
    Object.freeze(['#e53935', '#43d17b']),
  ]);
  const POSE_KEYS = Object.freeze([
    'maze', 'karasuki', 'grimmerglen', 'utsuroba', 'muenba', 'familyRoom',
    'marking', 'hiding', 'danceArmsUp', 'danceSway', 'danceWave',
  ]);
  // Mascots are seasonal visitors, not weekly player skins. They need one
  // everyday sprite plus an optional warmer Karasuki interaction pose, not
  // the full gameplay/dance set required by an unlockable character.
  const MASCOT_POSE_KEYS = Object.freeze(['static', 'karasuki']);
  const BLITZ_GAME_TYPES = Object.freeze(['vocab', 'sentences', 'questions']);
  const BLITZ_CURRICULA = Object.freeze(['pb', 'br', 'bc']);
  function makeSeasonalUnlockable(id, name, nameJp, enabled = false) {
    const folder = `assets/skins/${id}_booha`;
    return Object.freeze({
      id,
      seasonId: 'christmas-2026',
      enabled,
      name: `${name} Booha`,
      nameJp: `${nameJp}・ブーハー`,
      unlockId: `booha_skin_${id}`,
      assets: Object.freeze({
        maze: `${folder}/static.webp`,
        karasuki: `${folder}/static.webp`,
        grimmerglen: `${folder}/static.webp`,
        utsuroba: `${folder}/static.webp`,
        muenba: `${folder}/static.webp`,
        familyRoom: `${folder}/static.webp`,
        marking: `${folder}/marking.webp`,
        hiding: `${folder}/hiding.webp`,
        danceArmsUp: `${folder}/dance_arms_up.webp`,
        danceSway: `${folder}/dance_sway.webp`,
        danceWave: `${folder}/dance_wave.webp`,
      }),
    });
  }
  const SKINS = Object.freeze({
    batty: Object.freeze({
      id: 'batty',
      seasonId: 'halloween-2026',
      enabled: true,
      name: 'Batty Booha',
      nameJp: 'バッティー・ブーハー',
      unlockId: 'booha_skin_batty',
      assets: Object.freeze({
        maze: 'assets/skins/batty_booha/static.webp',
        karasuki: 'assets/skins/batty_booha/static.webp',
        grimmerglen: 'assets/skins/batty_booha/static.webp',
        utsuroba: 'assets/skins/batty_booha/static.webp',
        muenba: 'assets/skins/batty_booha/static.webp',
        familyRoom: 'assets/skins/batty_booha/static.webp',
        marking: 'assets/skins/batty_booha/marking.webp',
        hiding: 'assets/skins/batty_booha/hiding.webp',
        danceArmsUp: 'assets/skins/batty_booha/dance_arms_up.webp',
        danceSway: 'assets/skins/batty_booha/dance_sway.webp',
        danceWave: 'assets/skins/batty_booha/dance_wave.webp',
      }),
    }),
    mummington: Object.freeze({
      id: 'mummington',
      seasonId: 'halloween-2026',
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
      seasonId: 'halloween-2026',
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
      seasonId: 'halloween-2026',
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
      seasonId: 'halloween-2026',
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
      seasonId: 'halloween-2026',
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
    grubb: Object.freeze({
      id: 'grubb',
      kind: 'mascot',
      seasonId: 'christmas-2026',
      enabled: true,
      name: 'Grubb',
      nameJp: 'グラブ',
      assets: Object.freeze({
        static: 'assets/skins/grubb_booha/static.webp',
        karasuki: 'assets/skins/grubb_booha/karasuki.webp',
      }),
    }),
    // Art-complete unlockables are enabled one at a time as their full pose
    // sets land. The schedule is defined up front, but missing art can never
    // become a playable selection by accident.
    thumpkin: makeSeasonalUnlockable('thumpkin', 'Thumpkin', 'ソンプキン', true),
    crumbly: makeSeasonalUnlockable('crumbly', 'Crumbly', 'クランブリー', true),
    gnasher: makeSeasonalUnlockable('gnasher', 'Gnasher', 'ナーシャー', true),
    waddlesworth: makeSeasonalUnlockable('waddlesworth', 'Waddlesworth', 'ワードルスワース', true),
    snaggle: makeSeasonalUnlockable('snaggle', 'Snaggle', 'スナグル', true),
    tinkerplunk: makeSeasonalUnlockable('tinkerplunk', 'Tinkerplunk', 'ティンカープランク', true),
    oats: makeSeasonalUnlockable('oats', 'Oats', 'オーツ', true),
    quillock: makeSeasonalUnlockable('quillock', 'Quillock', 'クウィラック', true),
  });

  const seasonDefinitions = {
    'halloween-2026': Object.freeze({
      id: 'halloween-2026',
      themeId: 'halloween',
      name: 'Halloween',
      collectionJp: 'ハロウィンのなかま',
      // Halloween unlocks are assigned to the six Sunday-started occurrences
      // from September 20 through October 25, 2026.
      startDate: '2026-09-20',
      endDate: '2026-10-31',
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
      palette: HALLOWEEN_PALETTE,
      glow: HALLOWEEN_GLOW,
      checkpointSparkWeeks: Object.freeze([37, 38, 39, 40]),
      seasonalVisitor: Object.freeze({
        kind: 'bat',
        asset: 'assets/img/seasonal-bat.webp',
        color: HALLOWEEN_GLOW.lime,
        requires: 'blitz-triple',
      }),
      seasonalKarasuki: HALLOWEEN_KARASUKI,
    }),
    'christmas-2026': Object.freeze({
      id: 'christmas-2026',
      themeId: 'christmas',
      name: 'Christmas',
      collectionJp: 'クリスマスのなかま',
      mascotId: 'grubb',
      // Eight player characters run from Nov 1 through Jan 2. The fifth
      // Sunday occurrence repeats Week 4's content but still gets its own
      // weekly save bucket through the calendar occurrence key.
      startDate: '2026-11-01',
      endDate: '2027-01-02',
      rotationStartOccurrenceKey: '2026-11-01|november-w1',
      characterIds: Object.freeze([
        'thumpkin', 'crumbly', 'gnasher', 'waddlesworth',
        'snaggle', 'tinkerplunk', 'oats', 'quillock',
      ]),
      weeklyCharacterIds: Object.freeze({
        '2026-11-01': 'thumpkin',
        '2026-11-08': 'crumbly',
        '2026-11-15': 'gnasher',
        '2026-11-22': 'waddlesworth',
        '2026-11-29': 'waddlesworth',
        '2026-12-06': 'snaggle',
        '2026-12-13': 'tinkerplunk',
        '2026-12-20': 'oats',
        '2026-12-27': 'quillock',
      }),
      // Grubb is the seasonal mascot, not a weekly reward. He is visible on
      // the landing page and in Daily Check throughout the whole season.
      menuSchedule: Object.freeze([
        Object.freeze({ start: '2026-11-01', end: '2027-01-02', characterId: 'grubb' }),
      ]),
      palette: CHRISTMAS_PALETTE,
      glow: CHRISTMAS_GLOW,
      seasonalKarasuki: CHRISTMAS_KARASUKI,
    }),
  };
  // Keep the old unversioned lookup working for existing world code while
  // canonical season IDs remain year-scoped for collection storage.
  Object.defineProperty(seasonDefinitions, 'halloween', {
    value: seasonDefinitions['halloween-2026'],
    enumerable: false,
  });
  Object.defineProperty(seasonDefinitions, 'christmas', {
    value: seasonDefinitions['christmas-2026'],
    enumerable: false,
  });
  const SEASONS = Object.freeze(seasonDefinitions);

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

  function currentSeasonId() {
    return seasonIdForDate();
  }

  function seasonIdForDate(dateKey = currentDateKey()) {
    const date = String(dateKey || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return Object.keys(SEASONS).find((id) => {
      const season = SEASONS[id];
      return (!season.startDate || date >= season.startDate) &&
        (!season.endDate || date <= season.endDate);
    }) || null;
  }

  function canonicalSeasonId(id) {
    if (id === 'halloween') return 'halloween-2026';
    if (id === 'christmas') return 'christmas-2026';
    return id;
  }

  function rotationCharacterId(seasonId = currentSeasonId(), occurrenceKey = currentWeekKey()) {
    const season = getSeason(seasonId);
    if (!season || !season.characterIds.length) return null;
    const firstAvailableId = season.characterIds.find(id => isAvailable(id)) || null;
    const anchor = String(season.rotationStartOccurrenceKey || '').split('|')[0];
    const current = String(occurrenceKey || '').split('|')[0];
    const anchorMs = Date.parse(`${anchor}T00:00:00Z`);
    const currentMs = Date.parse(`${current}T00:00:00Z`);
    if (!Number.isFinite(anchorMs) || !Number.isFinite(currentMs)) {
      return firstAvailableId;
    }
    if (season.startDate && current < season.startDate) return null;
    if (season.endDate && current > season.endDate) return null;
    if (currentMs < anchorMs) return null;
    const scheduledId = season.weeklyCharacterIds?.[current];
    if (scheduledId && season.characterIds.includes(scheduledId)) {
      return isAvailable(scheduledId) ? scheduledId : null;
    }
    const weekIndex = Math.floor((currentMs - anchorMs) / (7 * 24 * 60 * 60 * 1000));
    const fallbackId = season.characterIds[weekIndex % season.characterIds.length];
    return isAvailable(fallbackId) ? fallbackId : null;
  }

  function menuCharacterId(seasonId = currentSeasonId(), dateKey = currentDateKey()) {
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

  function getSeason(id = currentSeasonId()) {
    return SEASONS[canonicalSeasonId(id)] || null;
  }

  function monthColorsForWeek(weekNumber) {
    const week = Number(weekNumber);
    const monthIndex = Number.isFinite(week)
      ? Math.max(0, Math.min(11, Math.floor((week - 1) / 4)))
      : 0;
    return MONTH_COLORS[monthIndex];
  }

  function seasonalVisitor(seasonId = seasonIdForDate()) {
    return getSeason(seasonId)?.seasonalVisitor || null;
  }

  function seasonalKarasuki(seasonId = seasonIdForDate()) {
    return getSeason(seasonId)?.seasonalKarasuki || null;
  }

  function seasonMascot(seasonId = seasonIdForDate()) {
    const mascotId = getSeason(seasonId)?.mascotId;
    return mascotId && isMascot(mascotId) ? get(mascotId) : null;
  }

  function mascotAsset(role = 'static', seasonId = seasonIdForDate()) {
    const mascot = seasonMascot(seasonId);
    if (!mascot || !isAvailable(mascot.id)) return null;
    return mascot.assets[role] || mascot.assets.static || null;
  }

  function applySeasonTheme(seasonId = seasonIdForDate()) {
    if (typeof document === 'undefined' || !document.documentElement) return null;
    const season = getSeason(seasonId);
    if (!season || !season.palette) return null;
    const root = document.documentElement;
    // Existing Halloween presentation CSS uses the stable theme key. The
    // season object itself remains year-scoped for rewards and collection.
    root.dataset.season = season.themeId || season.id;
    const vars = {
      orange: '--season-orange',
      purple: '--season-purple',
      lime: '--season-lime',
      black: '--season-black',
      red: '--season-red',
      green: '--season-green',
      white: '--season-white',
      gold: '--season-gold',
    };
    Object.keys(vars).forEach(key => {
      if (season.palette[key]) root.style.setProperty(vars[key], season.palette[key]);
    });
    return season.id;
  }

  function hasCompleteAssetSet(id) {
    const skin = get(id);
    return !!skin && !isMascot(id) && POSE_KEYS.every(key => typeof skin.assets[key] === 'string' && skin.assets[key]);
  }

  function isMascot(id) {
    return get(id)?.kind === 'mascot';
  }

  function hasCompleteMascotAssetSet(id) {
    const skin = get(id);
    return !!skin && isMascot(id) && MASCOT_POSE_KEYS.every(key =>
      typeof skin.assets[key] === 'string' && skin.assets[key]
    );
  }

  function isAvailable(id) {
    const skin = get(id);
    return !!skin && skin.enabled === true && (isMascot(id)
      ? hasCompleteMascotAssetSet(id)
      : hasCompleteAssetSet(id));
  }

  function seasonCharacters(seasonId = currentSeasonId()) {
    const season = getSeason(seasonId);
    if (!season) return [];
    return season.characterIds.map(id => get(id)).filter(Boolean);
  }

  function availableCharacters(seasonId = currentSeasonId()) {
    return seasonCharacters(seasonId).filter(skin => isAvailable(skin.id));
  }

  function nextAvailableId(id, seasonId = currentSeasonId()) {
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

  // Weekly unlocks are intentionally temporary, but the Records shelf needs
  // a small permanent collection history so earned seasonal characters remain
  // visible after the Sunday rollover clears the active reward bucket.
  function collectionKey(skin) {
    return `${skin.seasonId}:${skin.id}`;
  }

  function migrateCollection(data) {
    const collection = data?.meta?.boohaSkinCollection;
    if (!collection || typeof collection !== 'object' || Array.isArray(collection)) return false;
    let changed = false;
    Object.entries(collection).forEach(([storedKey, entry]) => {
      const skinId = storedKey.includes(':') ? storedKey.slice(storedKey.lastIndexOf(':') + 1) : storedKey;
      const skin = get(skinId);
      if (!skin) return;
      const storedSeasonId = typeof entry?.seasonId === 'string'
        ? canonicalSeasonId(entry.seasonId)
        : skin.seasonId;
      const key = `${storedSeasonId}:${skin.id}`;
      if (storedKey === key) return;
      if (!collection[key]) collection[key] = { ...(entry || {}), seasonId: storedSeasonId };
      delete collection[storedKey];
      changed = true;
    });
    return changed;
  }

  function isCollected(id) {
    const skin = get(id);
    if (!skin) return false;
    try {
      const saveFile = save();
      const data = saveFile?.load();
      const changed = migrateCollection(data);
      if (changed) saveFile.save(data);
      return !!data?.meta?.boohaSkinCollection?.[collectionKey(skin)];
    } catch (_) { return false; }
  }

  function collectedSkinIds(seasonId = currentSeasonId()) {
    return seasonCharacters(seasonId)
      .filter(skin => isCollected(skin.id))
      .map(skin => skin.id);
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
    migrateCollection(data);
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
    if (!data.meta.boohaSkinCollection || typeof data.meta.boohaSkinCollection !== 'object' || Array.isArray(data.meta.boohaSkinCollection)) {
      data.meta.boohaSkinCollection = {};
    }
    const key = collectionKey(skin);
    if (!data.meta.boohaSkinCollection[key]) {
      data.meta.boohaSkinCollection[key] = { unlockedAt: Date.now(), seasonId: skin.seasonId };
    }
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

  // The Maze reveal popup is a one-time moment per weekly unlock. The unlock
  // itself can now happen when the third Blitz clears, so the popup needs its
  // own "seen" mark instead of using "not unlocked yet" as its trigger.
  function isRevealSeen(id) {
    try {
      return !!save()?.load()?.weekly?.unlockedBoohaSkins?.[id]?.revealSeenAt;
    } catch (_) { return false; }
  }

  function markRevealSeen(id) {
    const saveFile = save();
    if (!saveFile) return false;
    const data = saveFile.load();
    const entry = data?.weekly?.unlockedBoohaSkins?.[id];
    if (!entry || typeof entry !== 'object') return false;
    if (entry.revealSeenAt) return true;
    entry.revealSeenAt = Date.now();
    return saveFile.save(data);
  }

  function equip(id) {
    if (!isUnlocked(id)) return false;
    const saveFile = save();
    if (!saveFile) return false;
    return saveFile.patch('meta', { selectedBoohaSkin: id });
  }

  return Object.freeze({
    BASE,
    get CURRENT_SEASON_ID() { return currentSeasonId(); },
    currentSeasonId,
    POSE_KEYS,
    MASCOT_POSE_KEYS,
    MONTH_COLORS,
    hasCurrentBlitzTriple,
    SKINS,
    SEASONS,
    get,
    getSeason,
    hasCompleteAssetSet,
    hasCompleteMascotAssetSet,
    isMascot,
    isAvailable,
    seasonCharacters,
    collectedSkinIds,
    availableCharacters,
    nextAvailableId,
    seasonIdForDate,
    rotationCharacterId,
    menuCharacterId,
    monthColorsForWeek,
    seasonalVisitor,
    seasonalKarasuki,
    seasonMascot,
    mascotAsset,
    applySeasonTheme,
    unlock,
    isUnlocked,
    isRevealSeen,
    markRevealSeen,
    isCollected,
    selectedId,
    asset,
    unlockAndEquip,
    equip,
  });
})();

window.BoohaSkins = BoohaSkins;
BoohaSkins.applySeasonTheme();
