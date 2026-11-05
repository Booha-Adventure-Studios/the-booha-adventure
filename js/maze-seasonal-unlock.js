/*
 * maze-seasonal-unlock.js
 *
 * The Maze's weekly Blitz unlock decision and announcement controller.  The
 * page supplies its save, skin, and DOM dependencies so this logic can run in
 * a small isolated harness as well as in the Maze page.
 */
(function (global) {
  'use strict';

  const COPY = Object.freeze({
    batty: Object.freeze({
      kickerEn: 'A NEW FRIEND HAS ARRIVED',
      kickerJp: '<ruby>新<rt>あたら</rt></ruby>しい <ruby>友<rt>とも</rt></ruby>だちが <ruby>来<rt>き</rt></ruby>たよ',
      titleEn: 'You Unlocked Batty Booha!',
      titleJp: 'バッティー・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Tap Batty Booha to equip your new traveling friend.',
      copyJp: 'バッティー・ブーハーを タップして、あたらしい おともだちを <ruby>身<rt>み</rt></ruby>につけよう。',
      buttonEn: 'EQUIP BATTY BOOHA',
      buttonJp: 'バッティー・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    mummington: Object.freeze({
      kickerEn: 'A NEW FRIEND HAS ARRIVED',
      kickerJp: '<ruby>新<rt>あたら</rt></ruby>しい <ruby>友<rt>とも</rt></ruby>だちが <ruby>来<rt>き</rt></ruby>たよ',
      titleEn: 'You Unlocked Mummington Booha!',
      titleJp: 'マミングトン ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Tap Mummington Booha to equip your new traveling friend.',
      copyJp: 'マミングトン ブーハーを タップして、あたらしい おともだちを <ruby>身<rt>み</rt></ruby>につけよう。',
      buttonEn: 'EQUIP MUMMINGTON BOOHA',
      buttonJp: 'マミングトン ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    mortisa: Object.freeze({
      kickerEn: 'A NEW FRIEND HAS ARRIVED',
      kickerJp: '<ruby>新<rt>あたら</rt></ruby>しい <ruby>友<rt>とも</rt></ruby>だちが <ruby>来<rt>き</rt></ruby>たよ',
      titleEn: 'You Unlocked Mortisa Booha!',
      titleJp: 'モーティサ・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Tap Mortisa Booha to equip your new traveling friend.',
      copyJp: 'モーティサ・ブーハーを タップして、あたらしい おともだちを <ruby>身<rt>み</rt></ruby>につけよう。',
      buttonEn: 'EQUIP MORTISA BOOHA',
      buttonJp: 'モーティサ・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    doomlet: Object.freeze({
      kickerEn: 'A NEW FRIEND HAS ARRIVED',
      kickerJp: '<ruby>新<rt>あたら</rt></ruby>しい <ruby>友<rt>とも</rt></ruby>だちが <ruby>来<rt>き</rt></ruby>たよ',
      titleEn: 'You Unlocked Doomlet Booha!',
      titleJp: 'ドゥームレット・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Tap Doomlet Booha to equip your new traveling friend.',
      copyJp: 'ドゥームレット・ブーハーを タップして、あたらしい おともだちを <ruby>身<rt>み</rt></ruby>につけよう。',
      buttonEn: 'EQUIP DOOMLET BOOHA',
      buttonJp: 'ドゥームレット・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    hazel: Object.freeze({
      kickerEn: 'A NEW FRIEND HAS ARRIVED',
      kickerJp: '<ruby>新<rt>あたら</rt></ruby>しい <ruby>友<rt>とも</rt></ruby>だちが <ruby>来<rt>き</rt></ruby>たよ',
      titleEn: 'You Unlocked Hazel Booha!',
      titleJp: 'ヘイゼル・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Tap Hazel Booha to equip your new traveling friend.',
      copyJp: 'ヘイゼル・ブーハーを タップして、あたらしい おともだちを <ruby>身<rt>み</rt></ruby>につけよう。',
      buttonEn: 'EQUIP HAZEL BOOHA',
      buttonJp: 'ヘイゼル・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    mister_happy: Object.freeze({
      kickerEn: 'A NEW FRIEND HAS ARRIVED',
      kickerJp: '<ruby>新<rt>あたら</rt></ruby>しい <ruby>友<rt>とも</rt></ruby>だちが <ruby>来<rt>き</rt></ruby>たよ',
      titleEn: 'You Unlocked Mister Happy Booha!',
      titleJp: 'ミスター・ハッピー・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Tap Mister Happy Booha to equip your new traveling friend.',
      copyJp: 'ミスター・ハッピー・ブーハーを タップして、あたらしい おともだちを <ruby>身<rt>み</rt></ruby>につけよう。',
      buttonEn: 'EQUIP MISTER HAPPY BOOHA',
      buttonJp: 'ミスター・ハッピー・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    // ── Christmas 2026 (Nov 1 – Jan 2), one per weekly reward ──
    thumpkin: Object.freeze({
      kickerEn: 'A FLUFFY FRIEND HOPPED IN!',
      kickerJp: 'ふわふわの <ruby>友<rt>とも</rt></ruby>だちが ぴょんと <ruby>来<rt>き</rt></ruby>たよ！',
      titleEn: 'You Unlocked Thumpkin Booha!',
      titleJp: 'ソンプキン・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Thumpkin put on a warm scarf just for the trip. Tap to hop along together!',
      copyJp: 'ソンプキンは ぽかぽか マフラーで じゅんび ばっちり！ タップして いっしょに ぴょんぴょん いこう！',
      buttonEn: 'EQUIP THUMPKIN BOOHA',
      buttonJp: 'ソンプキン・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    crumbly: Object.freeze({
      kickerEn: 'FRESH FROM THE OVEN!',
      kickerJp: 'オーブンから やきたて！',
      titleEn: 'You Unlocked Crumbly Booha!',
      titleJp: 'クランブリー・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Crumbly smells like cookies and smiles all day long. Tap to take Crumbly with you!',
      copyJp: 'クランブリーは クッキーの あまい におい。いつも にこにこ！ タップして いっしょに いこう！',
      buttonEn: 'EQUIP CRUMBLY BOOHA',
      buttonJp: 'クランブリー・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    gnasher: Object.freeze({
      kickerEn: 'A REINDEER FRIEND LANDED!',
      kickerJp: 'トナカイの <ruby>友<rt>とも</rt></ruby>だちが おりてきたよ！',
      titleEn: 'You Unlocked Gnasher Booha!',
      titleJp: 'ナーシャー・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Gnasher practiced flying all year. Tap to fly through the maze together!',
      copyJp: 'ナーシャーは いちねんじゅう とぶ れんしゅうを したよ。タップして いっしょに めいろを とぼう！',
      buttonEn: 'EQUIP GNASHER BOOHA',
      buttonJp: 'ナーシャー・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    waddlesworth: Object.freeze({
      kickerEn: 'A PENGUIN WADDLED IN!',
      kickerJp: 'ペンギンが よちよち <ruby>来<rt>き</rt></ruby>たよ！',
      titleEn: 'You Unlocked Waddlesworth Booha!',
      titleJp: 'ワードルスワース・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Waddlesworth loves snow, hats, and you! Tap to waddle along together.',
      copyJp: 'ワードルスワースは ゆきと ぼうしと きみが だいすき！ タップして いっしょに よちよち あるこう。',
      buttonEn: 'EQUIP WADDLESWORTH BOOHA',
      buttonJp: 'ワードルスワース・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    snaggle: Object.freeze({
      kickerEn: 'JINGLE, JINGLE! A LITTLE HELPER IS HERE!',
      kickerJp: 'ジングル ジングル！ ちいさな おてつだいさんが <ruby>来<rt>き</rt></ruby>たよ！',
      titleEn: 'You Unlocked Snaggle Booha!',
      titleJp: 'スナグル・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Snaggle\'s bell rings when a secret is close. Tap to go exploring together!',
      copyJp: 'スナグルの すずは ひみつが ちかいと なるよ。タップして いっしょに たんけんしよう！',
      buttonEn: 'EQUIP SNAGGLE BOOHA',
      buttonJp: 'スナグル・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    tinkerplunk: Object.freeze({
      kickerEn: 'HO HO HO! A VERY SPECIAL GUEST!',
      kickerJp: 'ホー ホー ホー！ とくべつな おきゃくさまだよ！',
      titleEn: 'You Unlocked Tinkerplunk Booha!',
      titleJp: 'ティンカープランク・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Tinkerplunk checked the list twice, and you\'re on it! Tap to share smiles together.',
      copyJp: 'ティンカープランクは リストを 2かい チェック。きみの なまえも あったよ！ タップして いっしょに えがおを とどけよう！',
      buttonEn: 'EQUIP TINKERPLUNK BOOHA',
      buttonJp: 'ティンカープランク・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    oats: Object.freeze({
      kickerEn: 'A COZY FRIEND HAS ARRIVED!',
      kickerJp: 'ぽかぽかの <ruby>友<rt>とも</rt></ruby>だちが <ruby>来<rt>き</rt></ruby>たよ！',
      titleEn: 'You Unlocked Oats Booha!',
      titleJp: 'オーツ・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Oats is prickly on the outside and snuggly on the inside. Tap to stay warm together!',
      copyJp: 'オーツは そとは ちくちく、なかは ふわふわ。タップして いっしょに あったまろう！',
      buttonEn: 'EQUIP OATS BOOHA',
      buttonJp: 'オーツ・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
    quillock: Object.freeze({
      kickerEn: 'A SPARKLY FRIEND LIT UP!',
      kickerJp: 'キラキラの <ruby>友<rt>とも</rt></ruby>だちが ひかったよ！',
      titleEn: 'You Unlocked Quillock Booha!',
      titleJp: 'クウィラック・ブーハーを <ruby>解放<rt>かいほう</rt></ruby>したよ！',
      copyEn: 'Quillock borrowed the lights from the tree. Tap to light up the maze together!',
      copyJp: 'クウィラックは ツリーの ライトを かりてきたよ。タップして いっしょに めいろを てらそう！',
      buttonEn: 'EQUIP QUILLOCK BOOHA',
      buttonJp: 'クウィラック・ブーハーを <ruby>装備<rt>そうび</rt></ruby>',
    }),
  });

  // Any character without hand-written copy still gets a reveal, built from
  // its own names, so a new season can never silently skip the popup.
  // English goes in via textContent; the Japanese name is escaped because
  // the *Jp fields are written with innerHTML (they carry <ruby>).
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function copyFor(id, skin) {
    if (COPY[id]) return COPY[id];
    const name = String((skin && skin.name) || '').trim();
    if (!name) return null;
    const nameJp = escapeHtml(String((skin && skin.nameJp) || name).trim());
    return Object.freeze({
      kickerEn: 'A NEW FRIEND HAS ARRIVED',
      kickerJp: '<ruby>新<rt>あたら</rt></ruby>しい <ruby>友<rt>とも</rt></ruby>だちが <ruby>来<rt>き</rt></ruby>たよ',
      titleEn: `You Unlocked ${name}!`,
      titleJp: `${nameJp}を <ruby>解放<rt>かいほう</rt></ruby>したよ！`,
      copyEn: `Tap ${name} to equip your new traveling friend.`,
      copyJp: `${nameJp}を タップして、あたらしい おともだちを <ruby>身<rt>み</rt></ruby>につけよう。`,
      buttonEn: `EQUIP ${name.toUpperCase()}`,
      buttonJp: `${nameJp}を <ruby>装備<rt>そうび</rt></ruby>`,
    });
  }

  function create(options) {
    options = options || {};
    const calendar = options.calendar || global.CALENDAR || {};
    const storage = options.storage || global.localStorage;
    const skins = options.skins || global.BoohaSkins;
    const getCurrentWeek = options.getCurrentWeek || (() => calendar.getCurrentCurriculumWeek?.());
    const getSave = options.getSave || (() => global.BoohaAdventure?.save?.load?.() || {});
    const ui = options.ui || {};
    const raf = options.requestAnimationFrame || global.requestAnimationFrame || (callback => callback());
    const schedule = options.setTimeout || global.setTimeout;
    let popupShown = false;
    let unlockId = null;

    function currentBlitzCurriculum() {
      try {
        const curr = global.BoohaCurriculum?.get?.() || storage.getItem('booha_last_curr') || '';
        return ['pb', 'br', 'bc'].includes(curr) ? curr : 'pb';
      } catch (_) { return 'pb'; }
    }

    function readBlitzCompletionState() {
      const state = { progress: { vocab: false, sentences: false, questions: false }, completedCurriculum: null };
      try {
        const cw = getCurrentWeek();
        const weekId = calendar.getCurriculumWeekOccurrenceKey?.(cw) || cw.occurrenceKey ||
          `${cw.monthSlug}:w${cw.weekNumber}`;
        const save = getSave() || {};
        const blitz = save.meta?.blitz || {};
        const weekly = blitz.weekly || {};
        if (blitz.weeklyKey !== weekId) return state;
        const curricula = ['pb', 'br', 'bc'];
        state.completedCurriculum = curricula.find(curr =>
          ['vocab', 'sentences', 'questions'].every(type => !!weekly[type]?.[curr])
        ) || null;
        const displayCurriculum = state.completedCurriculum || currentBlitzCurriculum();
        ['vocab', 'sentences', 'questions'].forEach(type => {
          state.progress[type] = !!weekly[type]?.[displayCurriculum];
        });
      } catch (_) {}
      return state;
    }

    function blitzTripleCompleteForAnyCurriculum() {
      return !!readBlitzCompletionState().completedCurriculum;
    }

    function closeSeasonalUnlockPopup() {
      ui.popup?.classList.remove('visible');
      ui.scrim?.classList.remove('show');
      schedule(() => ui.popup?.classList.remove('show'), 440);
    }

    function prepareSeasonalUnlockPopup(id) {
      const skin = skins?.get(id);
      const copy = copyFor(id, skin);
      if (!copy || !skin || !ui.popup) return false;
      const setLeadText = (selector, value) => {
        const el = ui.popup.querySelector(selector);
        if (!el) return;
        const jp = el.querySelector('.batty-jp');
        el.textContent = value;
        if (jp) el.appendChild(jp);
      };
      const setHTML = (selector, value) => {
        const el = ui.popup.querySelector(selector);
        if (el) el.innerHTML = value;
      };
      setLeadText('.batty-kicker', copy.kickerEn);
      setHTML('.batty-kicker .batty-jp', copy.kickerJp);
      setLeadText('#battyUnlockTitle', copy.titleEn);
      setHTML('#battyUnlockTitle .batty-jp', copy.titleJp);
      setLeadText('#battyUnlockCopy', copy.copyEn);
      setHTML('#battyUnlockCopy .batty-jp', copy.copyJp);
      setLeadText('#battyEquipTextButton', copy.buttonEn);
      setHTML('#battyEquipTextButton .batty-jp', copy.buttonJp);
      if (ui.art) {
        ui.art.src = skin.assets.maze;
        ui.art.alt = skin.name;
      }
      ui.equipButton?.setAttribute('aria-label', `Equip ${skin.name}`);
      ui.popup.dataset.skinId = id;
      return true;
    }

    function equipSeasonalFromUnlockPopup() {
      if (!unlockId || !skins?.unlockAndEquip?.(unlockId)) return;
      // The reveal counts as seen only once the student acts on it. If they
      // leave or reload before tapping, it shows again on the next visit.
      skins.markRevealSeen?.(unlockId);
      options.applyEquippedMazeSkin?.();
      closeSeasonalUnlockPopup();
    }

    function maybeShowSeasonalUnlockPopup() {
      if (popupShown || !skins) return;
      const id = skins.rotationCharacterId?.();
      if (!id || !blitzTripleCompleteForAnyCurriculum()) return;
      // Blitz now unlocks the character itself; Maze shows the reveal once.
      if (skins.isUnlocked?.(id) && skins.isRevealSeen?.(id)) return;
      if (!prepareSeasonalUnlockPopup(id)) return;
      if (!skins.isUnlocked?.(id) && (typeof skins.unlock !== 'function' || !skins.unlock(id))) return;
      // Not marked seen here: see equipSeasonalFromUnlockPopup().
      unlockId = id;
      popupShown = true;
      ui.scrim?.classList.add('show');
      ui.popup?.classList.add('show');
      raf(() => raf(() => ui.popup?.classList.add('visible')));
    }

    function reset() {
      popupShown = false;
      unlockId = null;
      closeSeasonalUnlockPopup();
    }

    return {
      currentBlitzCurriculum,
      readBlitzCompletionState,
      blitzTripleCompleteForAnyCurriculum,
      closeSeasonalUnlockPopup,
      prepareSeasonalUnlockPopup,
      equipSeasonalFromUnlockPopup,
      maybeShowSeasonalUnlockPopup,
      reset,
    };
  }

  global.MazeSeasonalUnlock = Object.freeze({ COPY, copyFor, create });
})(window);
