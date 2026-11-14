/**
 * intro-videos.js
 * The Booha Adventure: intro videos play once per curriculum week.
 *
 * Each intro video (hub, maze flyover, homework tree, Karasuki tree, Happy
 * House, Utsuroba, Muenba) plays on the student's first visit of the week
 * and is skipped on later visits that week. The week is the calendar's own
 * Sunday-started Tokyo week (CALENDAR occurrenceKey). Seen state lives in the
 * student's save under weekly.introsSeen, which the weekly reset clears, and
 * each entry also stores the week key, so a missed reset cannot hide a video
 * for a whole week. Per student, so shared iPads stay correct.
 *
 * If the calendar or the save is unavailable, videos simply play.
 */
(function (root) {
  'use strict';
  const IDS = Object.freeze(['hub', 'maze', 'homework', 'karasuki', 'happyHouse', 'utsuroba', 'muenba']);

  function weekKey() {
    try { return root.CALENDAR.getCurrentCurriculumWeek().occurrenceKey || null; }
    catch (_) { return null; }
  }

  function saveApi() {
    try {
      const s = root.BoohaAdventure && root.BoohaAdventure.save;
      return s && typeof s.load === 'function' && typeof s.patchDeep === 'function' ? s : null;
    } catch (_) { return null; }
  }

  function shouldPlay(id) {
    const key = weekKey();
    const s = saveApi();
    if (!key || !s) return true;
    try {
      const data = s.load() || {};
      const seen = (data.weekly && data.weekly.introsSeen) || {};
      return seen[id] !== key;
    } catch (_) { return true; }
  }

  function markSeen(id) {
    const key = weekKey();
    const s = saveApi();
    if (!key || !s || IDS.indexOf(id) < 0) return false;
    try { return !!s.patchDeep('weekly', 'introsSeen', { [id]: key }); }
    catch (_) { return false; }
  }

  root.BoohaIntroVideos = Object.freeze({ IDS, shouldPlay, markSeen });
})(typeof window !== 'undefined' ? window : globalThis);
