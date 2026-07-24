
// js/juku-engine.js
// English Juku — the clock. Load AFTER calendar.js and juku-config.js.
//
// Core principle: THERE ARE NO TIMERS. The wall clock (Tokyo) is the only
// state. Phase is derived from (now − slot start) every second. Refresh,
// crash, or late arrival all self-heal because nothing is counted, only read.

(function () {
  'use strict';

  const CFG = window.JUKU_CONFIG;
  const SAVE_BASE   = 'booha_juku_save';
  const JUKU_EPOCH  = 2;     // key generation, independent of ADVENTURE_EPOCH
  const SLOT_KEY    = 'booha_juku_slot';   // sessionStorage: today's chosen slot
  const KEY_USER_ID = 'booha_userid';

  // Juku records are scoped to the logged-in student. There is deliberately
  // NO legacy adoption here: Juku runs on shared classroom tablets, where
  // inheriting an anonymous record would attribute one student's exam to
  // another. An unidentified student gets a clean record instead.
  function jukuUid() {
    try { return localStorage.getItem(KEY_USER_ID) || ''; } catch (e) { return ''; }
  }
  
  // Null when unidentified — juku.html is token-gated, so no identity means a
  // broken session. An assessment record written to an unscoped key on a shared
  // classroom tablet attributes one student's exam to another.
  function saveKey() {
    const uid = jukuUid();
    return uid ? `${SAVE_BASE}:v${JUKU_EPOCH}:${uid}` : null;
  }

  // ── Tokyo clock ──────────────────────────────────────────
  // Week arithmetic stays in calendar.js (the authority). Time-of-day in
  // Tokyo is computed here via Intl so device timezone settings are ignored.
  // Dev time machine (b_1730) applies an offset anchored at activation, so
  // the overridden clock still advances in real time.

  let _tmOffsetMs = 0;   // 0 = real time

  function tokyoNow() {
    const real = new Date(Date.now() + _tmOffsetMs);
    // Parts of "now" as seen in Asia/Tokyo
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).formatToParts(real);
    const get = t => parts.find(p => p.type === t).value;
    return {
      y: +get('year'), mo: +get('month'), d: +get('day'),
      h: +get('hour') % 24, mi: +get('minute'), s: +get('second'),
      dateStr: `${get('year')}-${get('month')}-${get('day')}`,
      minOfDay: (+get('hour') % 24) * 60 + (+get('minute')),
      secOfDay: (+get('hour') % 24) * 3600 + (+get('minute')) * 60 + (+get('second'))
    };
  }

  // ── Schedule math ────────────────────────────────────────

  function parseHM(hm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ''));
    if (!m || +m[1] > 23 || +m[2] > 59) {
      throw new Error(`[JUKU] Invalid schedule time: ${String(hm)}`);
    }
    return (+m[1]) * 60 + (+m[2]);   // minutes from midnight
  }

  const TOTAL_MIN = CFG.phases.reduce((a, p) => a + p.min, 0);

  // Cumulative start minute of each phase within the lesson
  const PHASE_OFFSETS = (() => {
    let acc = 0;
    return CFG.phases.map(p => { const o = acc; acc += p.min; return o; });
  })();

  // Resolve engine state for a slot at a given Tokyo second-of-day.
  // Returns { state, phase?, phaseIdx?, phaseElapsedSec?, phaseRemainSec?,
  //           lessonElapsedSec?, secToStart? }
  // state: 'before' | 'lobby' | 'phase' | 'closed'
  function resolve(slot, tk) {
    const startSec = parseHM(slot.start) * 60;
    const lobbySec = startSec - CFG.lobbyOpenMin * 60;
    const endSec   = startSec + TOTAL_MIN * 60;
    const now      = tk.secOfDay;

    if (now < lobbySec) return { state: 'before', secToStart: startSec - now };
    if (now < startSec) return { state: 'lobby',  secToStart: startSec - now };
    if (now >= endSec)  return { state: 'closed' };

    const lessonElapsedSec = now - startSec;
    const lessonElapsedMin = lessonElapsedSec / 60;
    let idx = CFG.phases.length - 1;
    for (let i = 0; i < CFG.phases.length; i++) {
      if (lessonElapsedMin < PHASE_OFFSETS[i] + CFG.phases[i].min) { idx = i; break; }
    }
    const phaseStartSec = PHASE_OFFSETS[idx] * 60;
    return {
      state: 'phase',
      phase: CFG.phases[idx],
      phaseIdx: idx,
      lessonElapsedSec,
      phaseElapsedSec: lessonElapsedSec - phaseStartSec,
      phaseRemainSec: (PHASE_OFFSETS[idx] + CFG.phases[idx].min) * 60 - lessonElapsedSec
    };
  }

  // ── Slot selection ───────────────────────────────────────
  // Chosen slot persists for the day in sessionStorage. If exactly one
  // slot's window contains "now", it is auto-selected (a student opening
  // the app mid-class lands in their lesson without a menu).

  let _slot = null;

  function loadSlotChoice(tk) {
    try {
      const raw = sessionStorage.getItem(SLOT_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj.date !== tk.dateStr) { sessionStorage.removeItem(SLOT_KEY); return null; }
      return CFG.slots.find(s => s.id === obj.id) || null;
    } catch (e) { return null; }
  }

  function selectSlot(id) {
    const tk = tokyoNow();
    const slot = CFG.slots.find(s => s.id === id);
    if (!slot) return null;
    _slot = slot;
    try {
      sessionStorage.setItem(SLOT_KEY, JSON.stringify({ id: slot.id, date: tk.dateStr }));
    } catch (e) {}
    return slot;
  }

  function autoSlot(tk) {
    const live = CFG.slots.filter(s => {
      const r = resolve(s, tk);
      return r.state === 'phase' || r.state === 'lobby';
    });
    return live.length === 1 ? live[0] : null;
  }

  // ── Seeded RNG (mulberry32 over a string hash) ───────────
 // Broadcast phases: seed = weekId   (every device identical)
  // Test phases:      seed = booha_userid — stable for the life of the
  //                   account, so a re-login no longer reshuffles order.

  function hashStr(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  function rng(seedStr) {
    let a = hashStr(seedStr) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(arr, seedStr) {
    const r = rng(seedStr);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function studentSeedBase() {
    // Per-student and stable for the life of the account: the Wix record _id.
    // Replaces the token, which rotated on every login and reshuffled question
    // order mid-term, and whose 'anon' fallback collided across all devices.
    return jukuUid() || (localStorage.getItem('booha_token') || 'anon');
  }

  // ── Save file (booha_juku_save) ──────────────────────────
  // Its own key: the Juku world is quarantined from booha_save entirely.
  // Items are written the moment they are committed; the report is
  // computed once in the results phase and then locked.

  function loadSave() {
    const k = saveKey();
    try {
      const s = JSON.parse((k && localStorage.getItem(k)) || '{"v":1,"weeks":{}}');
      if (!s.v) s.v = 1;
      if (!s.weeks) s.weeks = {};
      return s;
    }
    catch (e) {
      // Preserve malformed records before a later successful write replaces
      // the active key. The quarantined raw blob can be recovered manually.
      console.error('[JUKU] Save parse failed; quarantining raw data:', e);
      try {
        const raw = k && localStorage.getItem(k);
        if (raw) localStorage.setItem(`${k}:corrupt:${Date.now()}`, raw);
      } catch (_) {}
      return { v: 1, weeks: {} };
    }
  }
  
  function writeSave(s) {
    
    const k = saveKey();
    if (!k) {
      console.error('[JUKU] Save write BLOCKED — no identity.');
      document.dispatchEvent(new CustomEvent('juku:saveFailed', { detail: { error: 'NO_IDENTITY' } }));
      return false;
    }
    
    try {
      localStorage.setItem(k, JSON.stringify(s));
      document.dispatchEvent(new Event('juku:saved'));
      return true;
      
    } catch (e) {
      // Quota or private-mode failure. Silently swallowing this meant a student
      // could sit a full 90-minute exam with nothing being recorded.
      console.error('[JUKU] Save write FAILED:', e);
      document.dispatchEvent(new CustomEvent('juku:saveFailed', { detail: { error: String(e) } }));
      return false;
    }
  }

 function weekRecord() {
    // calendar.js is the week authority — never derive weeks here.
    // Records key by week + slot: a shared tablet serving the 17:00 and
    // 19:00 classes on the same day can never collide.
    if (!window.CALENDAR || typeof CALENDAR.getCurrentCurriculumWeek !== 'function') {
      throw new Error('[JUKU] Cannot open a week record before CALENDAR is ready.');
    }
    if (!_slot) {
      throw new Error('[JUKU] Cannot open a week record before a class slot is selected.');
    }
    const uid = jukuUid();
    if (!uid) {
      throw new Error('[JUKU] Cannot open a week record without a student identity.');
    }

    const cw = window.CALENDAR.getCurrentCurriculumWeek();
    const slotId = _slot.id;
    const key    = `${cw.weekId}|${slotId}|${uid}`;
   
    const s = loadSave();
    if (!s.weeks[key]) {
      s.weeks[key] = {
        weekId: cw.weekId, monthSlug: cw.monthSlug, weekNumber: cw.weekNumber,
        slot: _slot ? _slot.id : null,
        survey: null, prediction: null,
        sections: {}, behavioral: {}, report: null
      };
      writeSave(s);
    }
    return { save: s, week: s.weeks[key], weekId: cw.weekId };
  }
  

// Returns null when the write did not land. Callers in the answer-commit
  // path MUST check: a mutated in-memory object with no successful write is
  // exactly the state where a student sees an accepted answer that was never
  // recorded. writeSave() dispatches juku:saveFailed for the banner; the null
  // return is what lets the commit flow refuse to advance.
  function patchWeek(fn) {
    const rec = weekRecord();
    if (!rec) return null;
    fn(rec.week);
    return writeSave(rec.save) ? rec.week : null;
  }

  // ── Tick loop ────────────────────────────────────────────
  // Re-render on phase change; per-second update callbacks otherwise.

  let _lastKey = '';
  let _onPhaseChange = null;  // (resolution, slot) => void   full re-render
  let _onTick = null;         // (resolution, slot, tk) => void  countdown updates

  function tick() {
    const tk = tokyoNow();
    if (!_slot) _slot = loadSlotChoice(tk) || autoSlot(tk);

    const res = _slot ? resolve(_slot, tk) : { state: 'menu' };
    const key = _slot
      ? `${_slot.id}|${res.state}|${res.phaseIdx !== undefined ? res.phaseIdx : ''}`
      : 'menu';

    if (key !== _lastKey) {
      _lastKey = key;
      if (_onPhaseChange) _onPhaseChange(res, _slot);
    }
    if (_onTick) _onTick(res, _slot, tk);
  }

  function start(onPhaseChange, onTick) {
    _onPhaseChange = onPhaseChange;
    _onTick = onTick;
    tick();
    setInterval(tick, 1000);
  }

  // ── Dev time machine ─────────────────────────────────────
  // b_1730('17:25')  → clock jumps to 17:25 Tokyo today and keeps running
  // b_1730_off()     → back to real time
  // Console-only; not enumerable; affects display only, never the save's
  // integrity rules (a report already written stays written).

  Object.defineProperty(window, 'b_1730', {
    enumerable: false,
    value: function (hm) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || ''));
      if (!m) { console.log('usage: b_1730("17:25")'); return false; }
      _tmOffsetMs = 0;                       // measure from real Tokyo now
      const tk = tokyoNow();
      const targetSec = ((+m[1]) * 60 + (+m[2])) * 60;
      _tmOffsetMs = (targetSec - tk.secOfDay) * 1000;
      _lastKey = '';                          // force re-render
      tick();
      console.log('⏰ juku clock →', hm, '(Tokyo, still advancing)');
      return true;
    }
  });

  Object.defineProperty(window, 'b_1730_off', {
    enumerable: false,
    value: function () {
      _tmOffsetMs = 0; _lastKey = ''; tick();
      console.log('⏰ juku clock → real time');
      return true;
    }
  });

  // ── Public API ───────────────────────────────────────────
 window.JUKU = {
    saveKey,          // for sync-client.js — see save-file.js note
    tokyoNow, resolve, selectSlot, autoSlot,
    
    seededShuffle, rng, studentSeedBase,
    loadSave, weekRecord, patchWeek,
    start,
    TOTAL_MIN, PHASE_OFFSETS,
    get slot() { return _slot; },
    clearSlot() { _slot = null; _lastKey = ''; try { sessionStorage.removeItem(SLOT_KEY); } catch (e) {} }
  };

})();
