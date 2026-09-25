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
  });

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
        const curr = storage.getItem('booha_last_curr') || '';
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
      const copy = COPY[id];
      const skin = skins?.get(id);
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
      options.applyEquippedMazeSkin?.();
      closeSeasonalUnlockPopup();
    }

    function maybeShowSeasonalUnlockPopup() {
      if (popupShown || !skins) return;
      const id = skins.rotationCharacterId?.();
      if (!id || skins.isUnlocked?.(id) || !blitzTripleCompleteForAnyCurriculum()) return;
      if (!prepareSeasonalUnlockPopup(id)) return;
      if (typeof skins.unlock !== 'function' || !skins.unlock(id)) return;
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

  global.MazeSeasonalUnlock = Object.freeze({ COPY, create });
})(window);
