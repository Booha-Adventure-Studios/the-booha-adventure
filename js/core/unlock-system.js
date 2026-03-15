
/**
 * unlock-system.js
 * The Booha Adventure — Unlock System
 * Defines unlock conditions and evaluates them against save data.
 * Unlocks are fired once and stored permanently.
 */

const BoohaUnlockSystem = (() => {
  'use strict';

  /**
   * UNLOCK DEFINITIONS — completion-only triggers.
   *
   * Since scores are per-curriculum, completion checks use the full saveId
   * e.g. "bc:vocab_tap". Milestone unlocks count across all curriculums.
   *
   * Helper: isGameDone(curriculum, baseId)
   */
  function _done(curriculum, baseId) {
    return BoohaAdventure.scores.isCompleted(
      BoohaAdventure.registry.saveId(curriculum, baseId)
    );
  }

  function _totalCompleted() {
    return BoohaAdventure.scores.totalCompleted();
  }

  const UNLOCKS = [
    // ── First ever completion ─────────────────────────────────────────────
    {
      id:          'first_game',
      name:        'Adventure Begins!',
      description: 'Complete your first game.',
      condition()  { return _totalCompleted() >= 1; },
    },

    // ── BC curriculum ─────────────────────────────────────────────────────
    { id: 'bc:ask_sentence',  name: 'BC: Ask a Sentence',  description: 'Complete Ask a Sentence (BC).',  condition() { return _done('bc','ask_sentence'); } },
    { id: 'bc:say_sentence',  name: 'BC: Say a Sentence',  description: 'Complete Say a Sentence (BC).',  condition() { return _done('bc','say_sentence'); } },
    { id: 'bc:say_word',      name: 'BC: Say a Word',      description: 'Complete Say a Word (BC).',      condition() { return _done('bc','say_word'); } },
    { id: 'bc:sentence_order',name: 'BC: Sentence Order',  description: 'Complete Sentence Order (BC).',  condition() { return _done('bc','sentence_order'); } },
    { id: 'bc:sentence_speed',name: 'BC: Sentence Speed',  description: 'Complete Sentence Speed (BC).',  condition() { return _done('bc','sentence_speed'); } },
    { id: 'bc:sentence_tap',  name: 'BC: Sentence Tap',    description: 'Complete Sentence Tap (BC).',    condition() { return _done('bc','sentence_tap'); } },
    { id: 'bc:spell_word',    name: 'BC: Spell a Word',    description: 'Complete Spell a Word (BC).',    condition() { return _done('bc','spell_word'); } },
    { id: 'bc:vocab_speed',   name: 'BC: Vocab Speed',     description: 'Complete Vocab Speed (BC).',     condition() { return _done('bc','vocab_speed'); } },
    { id: 'bc:vocab_tap',     name: 'BC: Vocab Tap',       description: 'Complete Vocab Tap (BC).',       condition() { return _done('bc','vocab_tap'); } },

    // ── BR curriculum ─────────────────────────────────────────────────────
    { id: 'br:ask_sentence',  name: 'BR: Ask a Sentence',  description: 'Complete Ask a Sentence (BR).',  condition() { return _done('br','ask_sentence'); } },
    { id: 'br:say_sentence',  name: 'BR: Say a Sentence',  description: 'Complete Say a Sentence (BR).',  condition() { return _done('br','say_sentence'); } },
    { id: 'br:say_word',      name: 'BR: Say a Word',      description: 'Complete Say a Word (BR).',      condition() { return _done('br','say_word'); } },
    { id: 'br:sentence_order',name: 'BR: Sentence Order',  description: 'Complete Sentence Order (BR).',  condition() { return _done('br','sentence_order'); } },
    { id: 'br:sentence_speed',name: 'BR: Sentence Speed',  description: 'Complete Sentence Speed (BR).',  condition() { return _done('br','sentence_speed'); } },
    { id: 'br:sentence_tap',  name: 'BR: Sentence Tap',    description: 'Complete Sentence Tap (BR).',    condition() { return _done('br','sentence_tap'); } },
    { id: 'br:spell_word',    name: 'BR: Spell a Word',    description: 'Complete Spell a Word (BR).',    condition() { return _done('br','spell_word'); } },
    { id: 'br:vocab_speed',   name: 'BR: Vocab Speed',     description: 'Complete Vocab Speed (BR).',     condition() { return _done('br','vocab_speed'); } },
    { id: 'br:vocab_tap',     name: 'BR: Vocab Tap',       description: 'Complete Vocab Tap (BR).',       condition() { return _done('br','vocab_tap'); } },

    // ── PB curriculum ─────────────────────────────────────────────────────
    { id: 'pb:ask_sentence',  name: 'PB: Ask a Sentence',  description: 'Complete Ask a Sentence (PB).',  condition() { return _done('pb','ask_sentence'); } },
    { id: 'pb:say_sentence',  name: 'PB: Say a Sentence',  description: 'Complete Say a Sentence (PB).',  condition() { return _done('pb','say_sentence'); } },
    { id: 'pb:say_word',      name: 'PB: Say a Word',      description: 'Complete Say a Word (PB).',      condition() { return _done('pb','say_word'); } },
    { id: 'pb:sentence_order',name: 'PB: Sentence Order',  description: 'Complete Sentence Order (PB).',  condition() { return _done('pb','sentence_order'); } },
    { id: 'pb:sentence_speed',name: 'PB: Sentence Speed',  description: 'Complete Sentence Speed (PB).',  condition() { return _done('pb','sentence_speed'); } },
    { id: 'pb:sentence_tap',  name: 'PB: Sentence Tap',    description: 'Complete Sentence Tap (PB).',    condition() { return _done('pb','sentence_tap'); } },
    { id: 'pb:spell_word',    name: 'PB: Spell a Word',    description: 'Complete Spell a Word (PB).',    condition() { return _done('pb','spell_word'); } },
    { id: 'pb:vocab_speed',   name: 'PB: Vocab Speed',     description: 'Complete Vocab Speed (PB).',     condition() { return _done('pb','vocab_speed'); } },
    { id: 'pb:vocab_tap',     name: 'PB: Vocab Tap',       description: 'Complete Vocab Tap (PB).',       condition() { return _done('pb','vocab_tap'); } },

    // ── Curriculum completion milestones ──────────────────────────────────
    {
      id:          'bc:all_complete',
      name:        'BC Champion!',
      description: 'Complete all 9 BC games.',
      condition()  {
        return BoohaAdventure.registry.getForCurriculum('bc')
          .every(g => BoohaAdventure.scores.isCompleted(g.saveId));
      },
    },
    {
      id:          'br:all_complete',
      name:        'BR Champion!',
      description: 'Complete all 9 BR games.',
      condition()  {
        return BoohaAdventure.registry.getForCurriculum('br')
          .every(g => BoohaAdventure.scores.isCompleted(g.saveId));
      },
    },
    {
      id:          'pb:all_complete',
      name:        'PB Champion!',
      description: 'Complete all 9 PB games.',
      condition()  {
        return BoohaAdventure.registry.getForCurriculum('pb')
          .every(g => BoohaAdventure.scores.isCompleted(g.saveId));
      },
    },

    // ── Core milestone — any one curriculum fully cleared ─────────────────
    {
      id:          'any_curriculum_complete',
      name:        'Curriculum Complete!',
      description: 'Complete all 9 games in any curriculum.',
      condition()  {
        return BoohaAdventure.registry.CURRICULUMS.some(c =>
          BoohaAdventure.scores.totalCompletedFor(c) >= 9
        );
      },
    },

    // ── Bonus milestone — all curriculums ─────────────────────────────────
    {
      id:          'all_complete',
      name:        'Booha Master!',
      description: 'Complete all 27 games across all curriculums.',
      condition()  { return _totalCompleted() >= 27; },
    },
  ];

  const _byId = {};
  UNLOCKS.forEach(u => { _byId[u.id] = u; });

  // ── Read unlock state ─────────────────────────────────────────────────────
  function _getUnlocks() {
    return BoohaAdventure.save.load().unlocks || {};
  }

  function isUnlocked(id) {
    return !!_getUnlocks()[id];
  }

  // ── Check all conditions and fire new unlocks ─────────────────────────────
  function checkAll() {
    const current = _getUnlocks();
    const newUnlocks = [];

    UNLOCKS.forEach(u => {
      if (current[u.id]) return; // already unlocked
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

    return newUnlocks;
  }

  // ── Force unlock (for testing / admin) ───────────────────────────────────
  function forceUnlock(id) {
    const current = _getUnlocks();
    current[id] = { unlockedAt: Date.now(), forced: true };
    BoohaAdventure.save.patch('unlocks', current);
  }

  function getAll() {
    return UNLOCKS.map(u => ({
      ...u,
      unlocked: isUnlocked(u.id),
      unlockedAt: (_getUnlocks()[u.id] || {}).unlockedAt || null,
    }));
  }

  // ── System interface ──────────────────────────────────────────────────────
  const api = {
    isUnlocked,
    checkAll,
    forceUnlock,
    getAll,
    init() {
      // Run a check on page load to catch any missed unlocks
      checkAll();
    }
  };

  BoohaAdventure.registerSystem('unlockSystem', api);
  return api;
})();

window.BoohaUnlockSystem = BoohaUnlockSystem;
