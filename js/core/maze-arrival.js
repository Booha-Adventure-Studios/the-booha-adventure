/**
 * maze-arrival.js
 * The Booha Adventure: what a student sees when they arrive at the Maze.
 *
 * Doing the work earns the short, quiet path. It is never a gate: every
 * student can enter the Maze.
 *
 *   Daily Check done today + all 3 Blitz this week, reward not yet earned
 *     → 'congrats'  one popup (with this week's companion). Its tap plays
 *                   the flyover with sound and starts the Maze music, and
 *                   earns the week.
 *   Same, reward already earned this week
 *     → 'guide'     no card and no video: this week's guide flies over the
 *                   still Maze, and tapping it (the reward) starts the music
 *                   and opens the Maze.
 *   Anything missing
 *     → 'reminder'  names exactly what is missing: Go back, Do the Daily
 *                   Check now, or Continue anyway. Continuing plays the
 *                   flyover with sound and music every time and never
 *                   earns the week.
 *
 * The Daily Check counts only when todayState() is 'done': a skip or a
 * failed attempt is not done. The reward lives in the student's save under
 * weekly.mazeReward.earned (the calendar's occurrenceKey), so it is per
 * student and resets with the Sunday-started Tokyo week. The Daily Check is
 * daily, so a student who earned the week on Monday is reminded again on
 * Tuesday until Tuesday's check is done, then gets the guide.
 *
 * If the calendar or the save is unavailable, nothing counts as earned.
 */
(function (root) {
  'use strict';

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

  function dailyCheckDone() {
    try { return !!root.BoohaDailyCheck && root.BoohaDailyCheck.todayState() === 'done'; }
    catch (_) { return false; }
  }

  function rewardEarned() {
    const key = weekKey();
    const s = saveApi();
    if (!key || !s) return false;
    try {
      const data = s.load() || {};
      const reward = data.weekly && data.weekly.mazeReward;
      return !!reward && reward.earned === key;
    } catch (_) { return false; }
  }

  function markRewardEarned() {
    const key = weekKey();
    const s = saveApi();
    if (!key || !s) return false;
    try { return !!s.patchDeep('weekly', 'mazeReward', { earned: key }); }
    catch (_) { return false; }
  }

  function decide({ blitzDone, dcDone, earned }) {
    if (!blitzDone || !dcDone) return 'reminder';
    return earned ? 'guide' : 'congrats';
  }

  function state(blitzDone) {
    const dcDone = dailyCheckDone();
    const earned = rewardEarned();
    return { blitzDone: !!blitzDone, dcDone, earned, mode: decide({ blitzDone: !!blitzDone, dcDone, earned }) };
  }

  root.BoohaMazeArrival = Object.freeze({ decide, state, dailyCheckDone, rewardEarned, markRewardEarned });
})(typeof window !== 'undefined' ? window : globalThis);
