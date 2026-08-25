
/**
 * unlock-system.js
 * The Booha Adventure — Unlock System
 * v2: adds weekly bonus game unlock checker (≥70 in all 9 games of any curriculum).
 * Permanent achievements are unchanged and never reset.
 */

const BoohaUnlockSystem = (() => {
  'use strict';

  // ── Permanent achievement helpers ─────────────────────────────────────────
  function _done(curriculum, baseId) {
    return BoohaAdventure.scores.isCompleted(
      BoohaAdventure.registry.saveId(curriculum, baseId)
    );
  }
  function _totalCompleted() {
    return BoohaAdventure.scores.totalCompleted();
  }

  // Muenba (Pass 6) reads its own progress bucket directly rather than
  // through score-system.js/game-registry.js — like Utsuroba, it's an
  // output world with a self-contained save section, not a scored
  // curriculum game, so it was never registered there.
  function _muenba() {
    const save = BoohaAdventure.save.load();
    return save.muenba || {};
  }
  function _muenbaGhostsFoundCount() {
    const found = _muenba().ghostsFound;
    return found && typeof found === 'object' ? Object.keys(found).length : 0;
  }

  // ── Permanent UNLOCKS (achievements — never reset) ────────────────────────
  const UNLOCKS = [
    {
      id:         'first_game',
      name:       'Adventure Begins!',
      description:'Complete your first game.',
      condition() { return _totalCompleted() >= 1; },
    },
    // BC
    { id:'bc:ask_question',   name:'BC: Ask the Question',   description:'Complete Ask the Question (BC).',   condition() { return _done('bc','ask_question'); } },
    { id:'bc:say_sentence',   name:'BC: Say a Sentence',   description:'Complete Say a Sentence (BC).',   condition() { return _done('bc','say_sentence'); } },
    { id:'bc:say_word',       name:'BC: Say a Word',       description:'Complete Say a Word (BC).',       condition() { return _done('bc','say_word'); } },
    { id:'bc:sentence_order', name:'BC: Sentence Order',   description:'Complete Sentence Order (BC).',   condition() { return _done('bc','sentence_order'); } },
    { id:'bc:sentence_speed', name:'BC: Sentence Speed',   description:'Complete Sentence Speed (BC).',   condition() { return _done('bc','sentence_speed'); } },
    { id:'bc:sentence_tap',   name:'BC: Sentence Tap',     description:'Complete Sentence Tap (BC).',     condition() { return _done('bc','sentence_tap'); } },
    { id:'bc:spell_word',     name:'BC: Spell a Word',     description:'Complete Spell a Word (BC).',     condition() { return _done('bc','spell_word'); } },
    { id:'bc:vocab_speed',    name:'BC: Vocab Speed',      description:'Complete Vocab Speed (BC).',      condition() { return _done('bc','vocab_speed'); } },
    { id:'bc:vocab_tap',      name:'BC: Vocab Tap',        description:'Complete Vocab Tap (BC).',        condition() { return _done('bc','vocab_tap'); } },
    // BR
    { id:'br:ask_question',   name:'BR: Ask the Question',   description:'Complete Ask the Question (BR).',   condition() { return _done('br','ask_question'); } },
    { id:'br:say_sentence',   name:'BR: Say a Sentence',   description:'Complete Say a Sentence (BR).',   condition() { return _done('br','say_sentence'); } },
    { id:'br:say_word',       name:'BR: Say a Word',       description:'Complete Say a Word (BR).',       condition() { return _done('br','say_word'); } },
    { id:'br:sentence_order', name:'BR: Sentence Order',   description:'Complete Sentence Order (BR).',   condition() { return _done('br','sentence_order'); } },
    { id:'br:sentence_speed', name:'BR: Sentence Speed',   description:'Complete Sentence Speed (BR).',   condition() { return _done('br','sentence_speed'); } },
    { id:'br:sentence_tap',   name:'BR: Sentence Tap',     description:'Complete Sentence Tap (BR).',     condition() { return _done('br','sentence_tap'); } },
    { id:'br:spell_word',     name:'BR: Spell a Word',     description:'Complete Spell a Word (BR).',     condition() { return _done('br','spell_word'); } },
    { id:'br:vocab_speed',    name:'BR: Vocab Speed',      description:'Complete Vocab Speed (BR).',      condition() { return _done('br','vocab_speed'); } },
    { id:'br:vocab_tap',      name:'BR: Vocab Tap',        description:'Complete Vocab Tap (BR).',        condition() { return _done('br','vocab_tap'); } },
    // PB
    { id:'pb:ask_question',   name:'PB: Ask the Question',   description:'Complete Ask the Question (PB).',   condition() { return _done('pb','ask_question'); } },
    { id:'pb:say_sentence',   name:'PB: Say a Sentence',   description:'Complete Say a Sentence (PB).',   condition() { return _done('pb','say_sentence'); } },
    { id:'pb:say_word',       name:'PB: Say a Word',       description:'Complete Say a Word (PB).',       condition() { return _done('pb','say_word'); } },
    { id:'pb:sentence_order', name:'PB: Sentence Order',   description:'Complete Sentence Order (PB).',   condition() { return _done('pb','sentence_order'); } },
    { id:'pb:sentence_speed', name:'PB: Sentence Speed',   description:'Complete Sentence Speed (PB).',   condition() { return _done('pb','sentence_speed'); } },
    { id:'pb:sentence_tap',   name:'PB: Sentence Tap',     description:'Complete Sentence Tap (PB).',     condition() { return _done('pb','sentence_tap'); } },
    { id:'pb:spell_word',     name:'PB: Spell a Word',     description:'Complete Spell a Word (PB).',     condition() { return _done('pb','spell_word'); } },
    { id:'pb:vocab_speed',    name:'PB: Vocab Speed',      description:'Complete Vocab Speed (PB).',      condition() { return _done('pb','vocab_speed'); } },
    { id:'pb:vocab_tap',      name:'PB: Vocab Tap',        description:'Complete Vocab Tap (PB).',        condition() { return _done('pb','vocab_tap'); } },
    // Milestones
    {
      id:'bc:all_complete', name:'BC Champion!', description:'Complete all 9 BC games.',
      condition() { return BoohaAdventure.registry.getForCurriculum('bc').every(g => BoohaAdventure.scores.isCompleted(g.saveId)); },
    },
    {
      id:'br:all_complete', name:'BR Champion!', description:'Complete all 9 BR games.',
      condition() { return BoohaAdventure.registry.getForCurriculum('br').every(g => BoohaAdventure.scores.isCompleted(g.saveId)); },
    },
    {
      id:'pb:all_complete', name:'PB Champion!', description:'Complete all 9 PB games.',
      condition() { return BoohaAdventure.registry.getForCurriculum('pb').every(g => BoohaAdventure.scores.isCompleted(g.saveId)); },
    },
    {
      id:'any_curriculum_complete', name:'Curriculum Complete!',
      description:'Complete all 9 games in any curriculum.',
      condition() { return BoohaAdventure.registry.CURRICULUMS.some(c => BoohaAdventure.scores.totalCompletedFor(c) >= 9); },
    },
    {
      id:'all_complete', name:'Booha Master!',
      description:'Complete all 27 games across all curriculums.',
      condition() { return _totalCompleted() >= 27; },
    },
    // Muenba. "Nuppi's Trust" is earned by entering the cemetery; the other
    // two wait on the actual capture loop to fire. GHOSTS_TOTAL is
    // hardcoded rather than read from muenba-data.js, since that file
    // isn't loaded on every page unlock-system.js runs on — bump this if
    // Pass 9 adds more huntable ghosts.
    {
      id:'muenba:first_briefing', name:"Nuppi's Trust",
      description:"Visit Nuppi in Muenba for the first time.",
      condition() {
        const rooms = _muenba().visitedRooms;
        return !!(rooms && typeof rooms === 'object' && Object.keys(rooms).length >= 1);
      },
    },
    {
      id:'muenba:first_ghost', name:'First Ghost Caught',
      description:'Catch your first ghost in Muenba.',
      condition() { return _muenbaGhostsFoundCount() >= 1; },
    },
    {
      id:'muenba:cleared', name:'Muenba Cleared',
      description:'Catch every ghost in Muenba.',
      condition() { return _muenbaGhostsFoundCount() >= 5; }, // GHOSTS_TOTAL = 5
    },
  ];

  function _getUnlocks() {
    return BoohaAdventure.save.load().unlocks || {};
  }

  // ── Weekly Output-world gate ────────────────────────────────────────────
  /**
   * Returns true when the student has completed all nine games for at least
   * one curriculum during the current week.
   *
   * This is intentionally separate from the permanent achievement unlocks
   * above. The Output-world doors are a weekly readiness gate, not a lifetime
   * achievement, so they must read weeklyCompletedFor() rather than
   * scores.isCompleted().
   */
  function isWeeklyWorldGateOpen() {
    if (window.__devAllGames || window.__devUtsuroba || window.__devMuenba) return true;

    try {
      const scores = window.BoohaAdventure && window.BoohaAdventure.scores;
      if (!scores || typeof scores.weeklyCompletedFor !== 'function') return false;

      return ['bc', 'br', 'pb'].some(curriculum =>
        scores.weeklyCompletedFor(curriculum) >= 9
      );
    } catch (_) {
      return false;
    }
  }

  // ── Muenba weekly world gate ────────────────────────────────────────────
  /**
   * Muenba is now a live output world. It shares Utsuroba's weekly rule:
   * complete all nine maze games in one curriculum during the current week.
   * The shared gate reads the week-scoped score bucket, so the next weekly
   * reset closes Muenba again without touching permanent achievements.
   */
  function isMuenbaUnlocked() {
    if (window.__devMuenba) return true;
    return isWeeklyWorldGateOpen();
  }

  function isUnlocked(id) {
    return !!_getUnlocks()[id];
  }

  function checkAll() {
    const current    = _getUnlocks();
    const newUnlocks = [];
    UNLOCKS.forEach(u => {
      if (current[u.id]) return;
      try {
        if (u.condition()) {
          current[u.id] = { unlockedAt: Date.now() };
          newUnlocks.push(u);
        }
      } catch (e) {
        console.warn(`[BoohaUnlockSystem] Condition error for "${u.id}":`, e);
      }
    });
    if (newUnlocks.length > 0) {
      BoohaAdventure.save.patch('unlocks', current);
      newUnlocks.forEach(u => {
        document.dispatchEvent(new CustomEvent('booha:unlocked', { detail: u }));
      });
    }

    // Also run the weekly bonus game check
    checkWeeklyBonusGames();

    return newUnlocks;
  }

  // ── Weekly bonus game unlock ──────────────────────────────────────────────
const BONUS_GAMES = [
    'booha_invaders',
    'booha_blocks',
    'feed_booha',
    'booha_destruction',
  ];

  function checkWeeklyBonusGames() {
    const registry  = BoohaAdventure.registry;
    const scores    = BoohaAdventure.scores;
    if (!registry || !scores) return;

    const data   = BoohaAdventure.save.load();
    const weekly = data.weekly || {};
    const wStars = weekly.gameStars || {};
    const bonus  = weekly.unlockedBonusGames || {};

    // Already unlocked this week — nothing to do
    if (bonus[BONUS_GAMES[0]]) return;

    // Check each curriculum
    const qualified = registry.CURRICULUMS.some(curriculum => {
      const games = registry.getForCurriculum(curriculum);
      return games.every(g => (wStars[g.saveId] || 0) >= 2);
    });

    if (!qualified) return;

    // Unlock all bonus games — use patchDeep to avoid clobbering other weekly data
    BONUS_GAMES.forEach(id => { bonus[id] = true; });
    BoohaAdventure.save.patchDeep('weekly', 'unlockedBonusGames', bonus);

    document.dispatchEvent(new CustomEvent('booha:bonusGamesUnlocked', {
      detail: { games: BONUS_GAMES }
    }));
    console.log('[BoohaUnlockSystem] Bonus games unlocked for this week!');
  }

  function isBonusGameUnlocked(bonusId) {
    const data = BoohaAdventure.save.load();
    return !!(data.weekly && data.weekly.unlockedBonusGames && data.weekly.unlockedBonusGames[bonusId]);
  }

  // ── Force unlock (testing) ────────────────────────────────────────────────
  function forceUnlock(id) {
    const current = _getUnlocks();
    current[id] = { unlockedAt: Date.now(), forced: true };
    BoohaAdventure.save.patch('unlocks', current);
  }

  function getAll() {
    return UNLOCKS.map(u => ({
      ...u,
      unlocked:   isUnlocked(u.id),
      unlockedAt: (_getUnlocks()[u.id] || {}).unlockedAt || null,
    }));
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    isUnlocked,
    isWeeklyWorldGateOpen,
    isMuenbaUnlocked,
    checkAll,
    checkWeeklyBonusGames,
    isBonusGameUnlocked,
    BONUS_GAMES,
    forceUnlock,
    getAll,
    init() { checkAll(); },
  };

  BoohaAdventure.registerSystem('unlockSystem', api);
  return api;
})();

window.BoohaUnlockSystem = BoohaUnlockSystem;
