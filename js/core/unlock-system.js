
/**
 * unlock-system.js
 * The Booha Adventure — Unlock System
 * v2: adds weekly bonus game unlock checker (≥70 in all 9 games of any curriculum).
 * Permanent achievements are unchanged and never reset.
 */

const BoohaUnlockSystem = (() => {
  'use strict';

  // ── Teacher test switch: every world open on THIS browser ────────────────
  // Type in the Inspect console. The switch is watched live on this page:
  //   localStorage.setItem('booha_dev_worlds', '1')   // all worlds open
  //   localStorage.removeItem('booha_dev_worlds')     // back to normal gates
  // It only sets the existing __dev* flags, so the gates read as open but no
  // progress is ever written. A small "DEV · WORLDS OPEN" tag shows while on.
  const DEV_WORLDS_KEY = 'booha_dev_worlds';
  function devWorldsOn() {
    try { return localStorage.getItem(DEV_WORLDS_KEY) === '1'; } catch (_) { return false; }
  }
  function showDevWorldsTag() {
    if (typeof document === 'undefined' || !document.body || typeof document.getElementById !== 'function') return;
    if (document.getElementById('booha-dev-worlds-tag')) return;
    const tag = document.createElement('div');
    tag.id = 'booha-dev-worlds-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = 'DEV · WORLDS OPEN';
    tag.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483000;pointer-events:none;' +
      'padding:3px 8px;border-radius:6px;background:rgba(0,0,0,.78);border:1px solid #ffd700;' +
      'color:#ffd700;font:700 10px/1.4 monospace;letter-spacing:.08em;';
    document.body.appendChild(tag);
  }
  function hideDevWorldsTag() {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
    const tag = document.getElementById('booha-dev-worlds-tag');
    if (tag) tag.remove();
  }
  function syncDevWorldsSwitch() {
    const enabled = devWorldsOn();
    const wasEnabled = window.__devWorldsSwitch === true;
    const changed = window.__devWorldsSwitch !== enabled;
    window.__devWorldsSwitch = enabled;
    if (enabled) {
      window.__devUtsuroba = true;
      window.__devMuenba = true;
      window.__devGrimmerglen = true;
    } else if (wasEnabled) {
      // Only clear flags that this persistent switch supplied. Preserve the
      // individual room-panel flags used by existing teacher tools/tests.
      window.__devUtsuroba = false;
      window.__devMuenba = false;
      window.__devGrimmerglen = false;
    }
    if (enabled) {
      if (document.body) showDevWorldsTag();
      else document.addEventListener('DOMContentLoaded', showDevWorldsTag, { once: true });
    } else {
      hideDevWorldsTag();
    }
    if (changed && document.body && typeof document.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('booha:devWorldsChanged', { detail: { enabled } }));
    }
    return enabled;
  }
  syncDevWorldsSwitch();
  // Same-tab localStorage writes do not emit a storage event. Polling only
  // this small developer key keeps the console switch live without writing
  // progress or requiring a page reload.
  if (window && typeof window.setInterval === 'function') window.setInterval(syncDevWorldsSwitch, 500);

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

  // Grimmerglen stores its memory hunt in a self-contained world bucket, just
  // like Muenba. Keep these helpers data-file independent so the achievement
  // system can safely run on the menus and profile pages before the world
  // manifest is loaded.
  function _grimmerglen() {
    const save = BoohaAdventure.save.load();
    return save.grimmerglen || {};
  }
  function _grimmerglenObjectsFoundCount() {
    const objects = _grimmerglen().objects;
    if (!objects || typeof objects !== 'object') return 0;
    return Object.values(objects).reduce((total, entry) => {
      return total + Math.max(0, Math.min(3, Number(entry && entry.found) || 0));
    }, 0);
  }
  function _grimmerglenMemoriesCompletedCount() {
    const objects = _grimmerglen().objects;
    if (!objects || typeof objects !== 'object') return 0;
    return Object.values(objects).filter(entry => Number(entry && entry.found) >= 3).length;
  }
  function _grimmerglenRoomsVisitedCount() {
    const rooms = _grimmerglen().visitedRooms;
    return rooms && typeof rooms === 'object' ? Object.keys(rooms).length : 0;
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
    // Grimmerglen memory hunt. The world can remain dormant behind its build
    // gate while these lifetime profile achievements are already defined.
    {
      id:'grimmerglen:first_memory', name:'A Memory Found',
      description:'Bring Marietta the first Grimmerglen memory object.',
      condition() { return _grimmerglenObjectsFoundCount() >= 1; },
    },
    {
      id:'grimmerglen:all_memories', name:'Memory Garden Complete',
      description:'Recover all eight Grimmerglen memory threads.',
      condition() { return _grimmerglenMemoriesCompletedCount() >= 8; },
    },
    {
      id:'grimmerglen:rooms_explored', name:'Every Corner Remembered',
      description:'Visit all nine Grimmerglen rooms.',
      condition() { return _grimmerglenRoomsVisitedCount() >= 9; },
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

  // ── Grimmerglen weekly world gate ───────────────────────────────────────
  function isGrimmerglenUnlocked() {
    if (window.__devGrimmerglen) return true;
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
  'family_room',
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
    isGrimmerglenUnlocked,
    checkAll,
    checkWeeklyBonusGames,
    isBonusGameUnlocked,
    devWorldsOn,
    BONUS_GAMES,
    forceUnlock,
    getAll,
    init() { checkAll(); },
  };

  BoohaAdventure.registerSystem('unlockSystem', api);
  return api;
})();

window.BoohaUnlockSystem = BoohaUnlockSystem;
