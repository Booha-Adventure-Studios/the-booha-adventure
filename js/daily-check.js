
/* ═══════════════════════════════════════════════════════════════════════
   daily-check.js  —  The Booha Adventure  ·  Daily 5-Minute Check-in
   ─────────────────────────────────────────────────────────────────────
   The daily teaching routine. The opening screen asks for it before the
   first adventure entry each day (2026-11-08 decision); a small, honest
   "Skip today" escape exists, and every skip, close or technical failure is
   kept as an event the Adventure Log shows.

   Flow (≈3–4 min, all tap, no typing):
     5 vocab (tap-through, audio) → 5 sentences → 5 questions → 5-item quiz
     → stamp + small celebration → fade straight to hub.

   Records to  booha_save.meta.checkIn[<todayKey>]  =
       { st:'done'|'skip', pct:<first 0-100|null>, curr, ts:<first ms>,
         retries:[{ pct, curr, ts }, ...] }
   Flat, dayKey-keyed — the exact shape a future Wix sync will lift as-is.
   Only completions live here ('skip' records are legacy, read-only).

   Everything that is NOT a completion goes to
       booha_save.meta.dailyCheckEvents[<eventId>] =
       { day, type, ts, curr, mode?, detail? }
   type: 'student_skip' | 'closed' | 'load_failure' | 'save_failure'.
   A map keyed by unique id (not an array) so syncs merge instead of
   clobbering, and a later completion never erases the history.

   Today's state for the opening screen (todayState):
     'done'    — completed today
     'skipped' — the student confirmed "Skip today" (latest bypass)
     'failed'  — a load or save failure (latest bypass); never "disobedience"
     'pending' — none of the above. Closing with × does NOT grant entry.
   Streak is COMPUTED at read time (see BoohaDailyCheck.streak); never stored.

   House rules honoured:
     · Day key from CALENDAR (Tokyo) ONLY — never the browser clock.
     · checkIn writes go load → mutate → save.patch('meta', fullMeta).
       save.patch is a SHALLOW Object.assign on meta, so a partial object
       would replace whole maps. Events therefore go through addEvents(),
       which merges into meta.dailyCheckEvents via save.patchDeep.
     · Does NOT dispatch booha:gameEnd — day-record.js would miscount this
       as an adventure game and pollute weekly best-pct. Its own record.
     · textContent for every data string. No innerHTML with card data.
     · One persistent <audio>, src swapped — stays unlocked on iOS after the
       first user gesture (the check-in tap that starts the flow).
   ═══════════════════════════════════════════════════════════════════════ */
window.BoohaDailyCheck = (function () {
  'use strict';

  /* ── Config mirrors deck-core / curriculum-config ────────────────────── */
  const AUDIO_ROOT = 'https://pub-8d5941f302df44b899ce9d9a4606dcb7.r2.dev/audio-2027';
  const AUDIO_FOLDER = { pb: 'pre_boo', br: 'boo_riculum', bc: 'boo_continuum' };
  const MON_CODE = {
    january:'jan', february:'feb', march:'mar', april:'apr', may:'may',
    june:'jun', july:'jul', august:'aug', september:'sep', october:'oct',
    november:'nov', december:'dec'
  };
  const TYPES = ['vocab', 'sentences', 'questions'];
  const PER_STEP = 5;      // items shown per section
  const QUIZ_LEN = 5;      // quiz questions
  const QUIZ_CHOICES = 4;  // options per quiz question
  const SPACED_REVIEW_MIN_WEEKS = 3;
  const SPACED_REVIEW_MAX_WEEKS = 8;

  /* ── Seeded RNG (mulberry32 over a string hash) — same as juku-engine ─── */
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

  /* ── Save layer ──────────────────────────────────────────────────────── */
  function todayKey() {
    if (!window.CALENDAR || !CALENDAR.getTodayKey) return null;
    return CALENDAR.getTodayKey();
  }
  function _meta() {
    const save = window.BoohaSaveFile.load();
    const meta = save.meta || {};
    meta.checkIn = meta.checkIn || {};
    return meta;
  }
  /* ── Event log (skips, closes, technical failures) ────────────────────── */
  const EVENT_TYPES = ['student_skip', 'closed', 'load_failure', 'save_failure'];
  // Events that let the student through the opening for the rest of the day.
  const BYPASS_STATE = { student_skip: 'skipped', load_failure: 'failed', save_failure: 'failed' };
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

  // Tab-session mirror: the opening honours a bypass in this tab even when
  // the save itself failed (that is exactly when save_failure is recorded).
  function mirrorKey(day) {
    let uid = '';
    try { uid = localStorage.getItem('booha_userid') || ''; } catch (_) {}
    return 'booha_dc_events:' + uid + ':' + day;
  }
  function mirrorRead(day) {
    try {
      const v = JSON.parse(sessionStorage.getItem(mirrorKey(day)) || '{}');
      return isObj(v) ? v : {};
    } catch (_) { return {}; }
  }
  function mirrorAdd(id, ev) {
    try {
      const m = mirrorRead(ev.day);
      m[id] = ev;
      sessionStorage.setItem(mirrorKey(ev.day), JSON.stringify(m));
    } catch (_) {}
  }
  function savedEvents() {
    try {
      const meta = window.BoohaSaveFile.load().meta || {};
      return isObj(meta.dailyCheckEvents) ? meta.dailyCheckEvents : {};
    } catch (_) { return {}; }
  }
  /* Every event, optionally for one day, oldest first, each with its id. */
  function events(dayKey) {
    const all = Object.assign({}, savedEvents());
    if (dayKey) Object.assign(all, mirrorRead(dayKey));
    return Object.keys(all)
      .map(id => Object.assign({ id }, all[id]))
      .filter(ev => isObj(ev) && EVENT_TYPES.includes(ev.type) && typeof ev.day === 'string' &&
        (!dayKey || ev.day === dayKey))
      .sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0));
  }
  /* Merge events into meta.dailyCheckEvents without touching the rest.
     BoohaSaveFile.patch() is shallow (Object.assign on meta): passing
     { dailyCheckEvents: { id: ev } } would REPLACE the whole map and erase
     every earlier event. patchDeep merges one level down; the fallback
     merges by hand and writes the full meta back. */
  function addEvents(map) {
    const SF = window.BoohaSaveFile;
    if (typeof SF.patchDeep === 'function') return !!SF.patchDeep('meta', 'dailyCheckEvents', map);
    const meta = SF.load().meta || {};
    meta.dailyCheckEvents = Object.assign({}, isObj(meta.dailyCheckEvents) ? meta.dailyCheckEvents : {}, map);
    return !!SF.patch('meta', meta);
  }

  function recordEvent(type, curr, extra) {
    if (!EVENT_TYPES.includes(type)) return null;
    const day = todayKey();
    if (!day) { console.error('[DailyCheck] CALENDAR missing — event not recorded.'); return null; }
    const ts = Date.now();
    const id = day + '_' + ts.toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const ev = { day, type, ts, curr: curr || null };
    if (extra && extra.mode) ev.mode = extra.mode;
    if (extra && isObj(extra.detail)) ev.detail = extra.detail;
    mirrorAdd(id, ev);
    // Never write before identity + cloud restore: on a borrowed device that
    // would land in the previous student's save. The mirror still covers it.
    let saved = false;
    if (window.BOOHA_READY) {
      try { saved = addEvents({ [id]: ev }); } catch (_) {}
      if (saved && window.BoohaSync) {
        try { BoohaSync.checkpoint('adventure'); } catch (e) {}
      }
    }
    document.dispatchEvent(new CustomEvent('booha:dailyCheckEvent', { detail: { id, day, type, saved } }));
    return id;
  }
  // Events recorded before identity was ready live only in the tab mirror;
  // copy today's into the save once it is safe, so the Adventure Log has them.
  function flushMirror() {
    const day = todayKey();
    if (!day || !window.BOOHA_READY) return;
    const saved = savedEvents();
    const missing = {};
    const mirror = mirrorRead(day);
    Object.keys(mirror).forEach(id => { if (!saved[id] && isObj(mirror[id])) missing[id] = mirror[id]; });
    if (!Object.keys(missing).length) return;
    try {
      if (addEvents(missing) && window.BoohaSync) {
        try { BoohaSync.checkpoint('adventure'); } catch (e) {}
      }
    } catch (_) {}
  }
  if (window.BOOHA_READY) setTimeout(flushMirror, 0);
  else if (typeof document.addEventListener === 'function') {
    document.addEventListener('booha:ready', flushMirror, { once: true });
  }

  function todayState() {
    const day = todayKey();
    if (!day) return 'pending';
    if (isDoneToday()) return 'done';
    const bypass = events(day).filter(ev => BYPASS_STATE[ev.type]);
    if (bypass.length) return BYPASS_STATE[bypass[bypass.length - 1].type];
    // Legacy: before 2026-11-08 "Enter anyway" wrote checkIn[day].st = 'skip'.
    const rec = recordFor(day);
    return rec && rec.st === 'skip' ? 'skipped' : 'pending';
  }

  function recordFor(dayKey) {
    return _meta().checkIn[dayKey] || null;
  }
  function isDoneToday() {
    const k = todayKey();
    const r = k && recordFor(k);
    return !!(r && r.st === 'done');
  }
  function summarizeRecord(rec) {
    const retries = rec && Array.isArray(rec.retries) ? rec.retries : [];
    const done = !!(rec && rec.st === 'done');
    const first = done && typeof rec.pct === 'number' ? rec.pct : null;
    const comparable = done ? retries.filter(r =>
      r && typeof r.pct === 'number' &&
      (!rec.curr || !r.curr || r.curr === rec.curr)
    ) : [];
    return {
      done,
      first,
      best: first == null ? null : Math.max(first, ...comparable.map(r => r.pct)),
      attempts: done ? 1 + retries.length : 0,
      hasRetakes: done && retries.length > 0,
      curr: rec && rec.curr ? rec.curr : null
    };
  }
  function todaySummary() {
    const key = todayKey();
    const rec = key ? recordFor(key) : null;
    return Object.assign({ key, st: rec ? rec.st : null, state: todayState() }, summarizeRecord(rec));
  }
  function write(st, pct, curr) {
    const k = todayKey();
    if (!k) {
      console.error('[DailyCheck] CALENDAR missing — not recorded.');
      return false;
    }
    const meta = _meta();
    const existing = meta.checkIn[k] || null;
    const now = Date.now();
    const score = typeof pct === 'number' ? pct : null;

    // A skip must never downgrade a day already completed (protects the streak).
    if (st === 'skip' && existing && existing.st === 'done') return true;

    if (st === 'done' && existing && existing.st === 'done') {
      // First-attempt pct/ts/curr are immutable. Every later completion is a
      // retake, so completion count and streak still advance only once.
      const retries = Array.isArray(existing.retries) ? existing.retries.slice() : [];
      retries.push({ pct: score, curr: curr || null, ts: now });
      meta.checkIn[k] = Object.assign({}, existing, { retries });
    } else {
      // A prior "skip" means "later," not an attempt; the first completion
      // replaces it and establishes the permanent first-attempt evidence.
      meta.checkIn[k] = {
        st,
        pct: score,
        curr: curr || null,
        ts: now,
        retries: []
      };
    }

    const ok = window.BoohaSaveFile.patch('meta', meta);
    if (!ok) return false;
    document.dispatchEvent(new CustomEvent('booha:checkIn', { detail: { day: k, st, pct } }));
    if (window.BoohaSync) {
      try { BoohaSync.checkpoint('adventure'); } catch (e) {
        console.warn('[DailyCheck] Cloud checkpoint will retry later:', e);
      }
    }
    return true;
  }

  /* The streak, labelled the same way everywhere (Daily Check result and the
     opening stamp). Seasons show it as candy or gifts, but always say it is
     the check-in streak, so "ギフト 1個" never reads as an awarded item. */
  function streakLabel(n, season) {
    const count = Math.max(0, Number(n) || 0);
    const s = season === undefined
      ? (typeof document !== 'undefined' && document.documentElement ? document.documentElement.dataset.season : '')
      : season;
    if (s === 'halloween') return `チェックれんぞく · キャンディ ${count}個`;
    if (s === 'christmas') return `チェックれんぞく · ギフト ${count}個`;
    return `チェックれんぞく ✓ ${count}日`;
  }

  /* Consecutive completed check-ins, ending today or yesterday. */
  function streak() {
    const meta = _meta();
    const log = meta.checkIn || {};
    const today = todayKey();
    if (!today) return 0;
    const dayBefore = (key) => {
      const d = new Date(key + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    };
    let cursor = log[today] && log[today].st === 'done'
      ? today : dayBefore(today);
    let n = 0;
    for (;;) {
      if (log[cursor] && log[cursor].st === 'done') {
        n++;
        cursor = dayBefore(cursor);
      }
      else break;
    }
    return n;
  }

  /* ── Curriculum resolution ───────────────────────────────────────────── */
  // The saved curriculum is canonical; the local key remains a compatibility
  // mirror for older pages and is managed by BoohaCurriculum.
  function knownCurr() {
    try {
      return window.BoohaCurriculum?.get?.() || null;
    } catch (_) {
      return null;
    }
  }

  /* ── Content load ────────────────────────────────────────────────────── */
  function weekInfo() {
    const cw = CALENDAR.getCurrentCurriculumWeek();
    const wk = Math.min(cw.weekNumber || 1, 4);       // week 5 clamps to 4
    return {
      monthSlug: cw.monthSlug,
      weekNumber: wk,
      weekId: cw.weekId,
      weekStart: cw.weekStart
    };
  }
  function weekInfoWeeksAgo(current, weeksAgo) {
    const start = new Date(current.weekStart + 'T12:00:00Z');
    start.setUTCDate(start.getUTCDate() - weeksAgo * 7);
    const cw = CALENDAR.getCurrentCurriculumWeek(start);
    const wk = Math.min(cw.weekNumber || 1, 4);
    return { monthSlug: cw.monthSlug, weekNumber: wk, weekId: cw.weekId };
  }
  function sliceForWeek(cards, wk) {
    const lo = (wk - 1) * 15 + 1, hi = wk * 15;
    return (cards || []).filter(c => c.n >= lo && c.n <= hi);
  }
  function audioUrl(curr, type, mp3, monCode) {
    return `${AUDIO_ROOT}/${monCode}/${AUDIO_FOLDER[curr]}/${type}/${mp3}`;
  }
  async function loadSpacedReview(curr, currentWeek) {
    try {
      const weeksAgo = SPACED_REVIEW_MIN_WEEKS + Math.floor(
        rng(`${todayKey()}|${curr}|spaced-week`)() *
        (SPACED_REVIEW_MAX_WEEKS - SPACED_REVIEW_MIN_WEEKS + 1)
      );
      const week = weekInfoWeeksAgo(currentWeek, weeksAgo);
      const url = `content/${curr}/${week.monthSlug}/vocab.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`spaced vocab ${res.status}`);
      const data = await res.json();
      const cards = sliceForWeek(data.cards, week.weekNumber);
      if (cards.length < QUIZ_CHOICES) return null;
      const item = seededShuffle(cards, `${todayKey()}|${curr}|spaced-item`)[0];
      return { item, cards, week, weeksAgo };
    } catch (err) {
      console.warn('[DailyCheck] spaced review unavailable:', err.message);
      return null;
    }
  }
  async function loadContent(curr) {
    const wi = weekInfo();
    const spacedReviewPromise = loadSpacedReview(curr, wi);
    const monCode = MON_CODE[wi.monthSlug] || 'jan';
    // These files are independent. Loading them in parallel changes the wait
    // from three network round trips to the slowest one, which matters on
    // classroom Wi-Fi and older tablets.
    const entries = await Promise.all(TYPES.map(async type => {
      const url = `content/${curr}/${wi.monthSlug}/${type}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${type} ${res.status}`);
      const data = await res.json();
      return [type, sliceForWeek(data.cards, wi.weekNumber)];
    }));
    const out = {};
    entries.forEach(entry => { out[entry[0]] = entry[1]; });
    const spacedReview = await spacedReviewPromise;
    return { curr, monCode, week: wi, sets: out, spacedReview };
  }

  /* Build the day's picks: 5 of each type + a 5-item MIXED quiz drawn from
     those same 15 (so students are tested on exactly what they just reviewed).
     Direction is Japanese → English: prompt = hira (PB) / jp (BR·BC), the four
     choices are English. Distractors are drawn from the SAME type's week pool
     — a one-word vocab answer never sits beside full-sentence distractors,
     which would give the answer away by length.
     Seed = todayKey + curr → fresh daily mix, identical on that student's
     devices, different Mon vs Fri. */
  function buildDay(content) {
    const seedBase = todayKey() + '|' + content.curr;
    const promptKey = content.curr === 'pb' ? 'hira' : 'jp';

    // 5 of each type, tagged with their source type for the quiz + audio path.
    const pick = {};
    const pool = [];
    for (const type of TYPES) {
      const chosen = seededShuffle(content.sets[type], seedBase + '|' + type)
        .slice(0, PER_STEP)
        .map(c => ({ ...c, _type: type }));
      pick[type] = chosen;
      pool.push(...chosen);
    }

    function makeQuizItem(item, sameType, type, seed) {
      const distractors = seededShuffle(
        sameType.filter(c => c.n !== item.n), seed + '|d'
      ).slice(0, QUIZ_CHOICES - 1);
      if (distractors.length < QUIZ_CHOICES - 1) return null;
      const choices = seededShuffle(
        [item, ...distractors], seed + '|c'
      ).map(c => ({ n: c.n, label: c.en }));
      return {
        type,
        prompt: item[promptKey] || item.jp || item.en, // Japanese shown
        mp3: item.mp3,
        answerN: item.n,
        choices,
      };
    }

    // Quiz: 5 mixed items sampled from the 15 the student just saw.
    const quizItems = seededShuffle(pool, seedBase + '|quiz').slice(0, QUIZ_LEN).map(item =>
      makeQuizItem(item, content.sets[item._type], item._type,
        seedBase + '|quiz|' + item._type + item.n)
    );

    // Keep study time fixed: one quiz slot revisits an older vocabulary word
    // instead of adding another card to the three review sections.
    if (content.spacedReview) {
      const review = content.spacedReview;
      const spaced = makeQuizItem(review.item, review.cards, 'vocab',
        seedBase + '|spaced|' + review.item.n);
      if (spaced) {
        spaced.isSpacedReview = true;
        spaced.reviewWeeksAgo = review.weeksAgo;
        const slot = Math.floor(rng(seedBase + '|spaced-slot')() * quizItems.length);
        quizItems[slot] = spaced;
      }
    }

    return { picks: pick, quiz: quizItems, promptKey };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RUNNER (UI)  —  self-contained full-screen overlay.
     Reaches into NOTHING in index.html; talks back only through callbacks:
        run({ curr, mode, onDone(pct), onCancel() })
     index.html decides what those do (fade to hub / play the intro video).
     ═══════════════════════════════════════════════════════════════════════ */

  const CURR_TILES = [
    { id: 'pb', name: 'Pre-Boo',      jp: 'プレブー',            hue: 315 },
    { id: 'br', name: 'Boo-riculum',  jp: 'ブーリキュラム',       hue: 190 },
    { id: 'bc', name: 'Boo-Continuum', jp: 'ブーコンティニュアム', hue: 120 }
  ];
  const SECTION_LABEL = {
    vocab:     { en: 'Words',     jp: 'たんご' },
    sentences: { en: 'Sentences', jp: 'ぶんしょう' },
    questions: { en: 'Questions', jp: 'しつもん' }
  };

  let styleInjected = false;

  /* ── Daily Pop (2026-11-13) ─────────────────────────────────────────────
     Listening gate + bounce. つぎ unlocks only after the card's audio has
     played (sentences/questions add a short "Your turn!" beat so students
     repeat it). Tapping the locked button wobbles it and — at most once per
     card, with a cooldown — Booha pops up with "Hey! Read and listen!".
     The nag gives nothing and speeds nothing, so it can't be farmed.
     If audio fails (offline / blocked) a text-length timer unlocks instead,
     so nobody is ever stuck. Content, quiz, scoring and records unchanged. */
  const GATE_CAP_MS = 12000;         // never wait longer than this for 'ended'
  const SAY_MIN_MS = 1000, SAY_MAX_MS = 4000;
  const NAG_COOLDOWN_MS = 2500;
  const TAP_GRACE_MS = 450;          // laggy double-taps right after a card appears are ignored
  const SILENT_WAV = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
  const POP_CSS = `
    @keyframes dcCardIn{0%{opacity:0;transform:translateY(26px) scale(.86)}
      60%{opacity:1;transform:translateY(-6px) scale(1.04)}80%{transform:translateY(2px) scale(.985)}
      100%{opacity:1;transform:none}}
    .dc-card{animation:dcCardIn .46s cubic-bezier(.3,1.4,.5,1) both;position:relative;}
    .dc-dots{display:flex;gap:14px;margin:0 0 18px;}
    .dc-dots .grp{display:flex;gap:5px;}
    .dc-dot{width:11px;height:11px;border-radius:50%;background:rgba(255,255,255,.2);
      transition:background .25s,box-shadow .25s;}
    .dc-dot.done{background:var(--pink2,#ff79d7);}
    .dc-dot.on{background:var(--pink,#ff3bbd);box-shadow:0 0 0 3px rgba(255,255,255,.18),0 0 14px var(--pink,#ff3bbd);
      animation:dcDotPop .5s cubic-bezier(.3,1.8,.5,1) both;}
    @keyframes dcDotPop{0%{transform:scale(.4)}60%{transform:scale(1.6)}100%{transform:scale(1.25)}}
    .dc-en .dc-w{display:inline-block;transition:color .18s,transform .18s,text-shadow .18s;}
    .dc-en.karaoke{color:rgba(255,255,255,.5);}
    .dc-en.karaoke .dc-w.lit{color:#fff;transform:translateY(-2px);
      text-shadow:0 0 12px var(--pink,#ff3bbd);}
    .dc-en.all-lit{color:#fff;}
    .dc-audio{position:relative;}
    .dc-audio.playing{animation:dcSpk .42s ease-in-out infinite alternate;}
    .dc-audio.playing::after{content:'';position:absolute;inset:-4px;border-radius:50%;
      border:3px solid var(--pink2,#ff79d7);animation:dcWave .84s ease-out infinite;pointer-events:none;}
    @keyframes dcSpk{from{transform:scale(1)}to{transform:scale(1.1)}}
    @keyframes dcWave{from{transform:scale(1);opacity:.9}to{transform:scale(1.9);opacity:0}}
    .dc-audio.nudge{animation:dcNudge 1.2s ease-in-out infinite;}
    @keyframes dcNudge{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
    .dc-turn{position:absolute;right:14px;top:-18px;transform:rotate(-3deg);white-space:nowrap;
      padding:7px 16px;border-radius:999px;font-weight:900;font-size:.98rem;color:#1a0b1f;
      background:linear-gradient(135deg,#ffe36e,#ffb84d);box-shadow:0 6px 18px rgba(255,190,70,.5);
      animation:dcTurnIn .42s cubic-bezier(.3,1.8,.5,1) both,dcTurnBob 1s ease-in-out .42s infinite;pointer-events:none;}
    @keyframes dcTurnIn{0%{opacity:0;transform:rotate(-3deg) scale(.3)}100%{opacity:1;transform:rotate(-3deg) scale(1)}}
    @keyframes dcTurnBob{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(2deg) translateY(-5px)}}
    .dc-btn.dc-next{position:relative;overflow:hidden;}
    .dc-btn .dc-lbl{position:relative;z-index:1;}
    .dc-fill{position:absolute;inset:0;transform-origin:left center;transform:scaleX(0);
      background:linear-gradient(90deg,rgba(255,255,255,.18),rgba(255,255,255,.38));
      transition:transform .25s linear;pointer-events:none;}
    .dc-btn.locked{filter:saturate(.45) brightness(.8);box-shadow:none;}
    .dc-btn.ready{animation:dcReady .5s cubic-bezier(.3,1.8,.5,1) both,dcReadyBob 1.3s ease-in-out .5s infinite;}
    .dc-btn.ready .dc-fill{opacity:0;transition:opacity .3s;}
    @keyframes dcReady{0%{transform:scale(.9)}55%{transform:scale(1.14)}100%{transform:scale(1)}}
    @keyframes dcReadyBob{0%,100%{transform:scale(1)}50%{transform:scale(1.06) translateY(-2px);
      box-shadow:0 10px 30px rgba(255,59,189,.7),0 0 0 6px rgba(255,121,215,.2);}}
    .dc-nag{position:fixed;left:50%;top:9%;z-index:3;display:flex;align-items:center;gap:10px;
      transform:translateX(-50%);pointer-events:none;
      animation:dcNagIn .5s cubic-bezier(.3,1.7,.5,1) both;}
    .dc-nag.out{animation:dcNagOut .3s ease-in both;}
    .dc-nag img{width:78px;height:78px;object-fit:contain;animation:dcNagHop .5s ease-in-out infinite alternate;}
    .dc-nag .bub{position:relative;padding:12px 18px;border-radius:18px;background:#fff;color:#2a0d2e;
      font-weight:900;font-size:1.12rem;line-height:1.3;text-align:left;box-shadow:0 10px 28px rgba(0,0,0,.45);}
    .dc-nag .bub small{display:block;font-size:.86rem;font-weight:800;color:#b0207f;}
    .dc-nag .bub::before{content:'';position:absolute;left:-10px;top:50%;margin-top:-9px;
      border:9px solid transparent;border-right-color:#fff;border-left:0;}
    @keyframes dcNagIn{0%{opacity:0;transform:translateX(-50%) scale(.2) rotate(-12deg)}
      70%{opacity:1;transform:translateX(-50%) scale(1.1) rotate(3deg)}100%{opacity:1;transform:translateX(-50%) scale(1)}}
    @keyframes dcNagOut{to{opacity:0;transform:translateX(-50%) scale(.6) translateY(-20px)}}
    @keyframes dcNagHop{from{transform:translateY(0) rotate(-6deg)}to{transform:translateY(-8px) rotate(6deg)}}
    .dc-banner{position:fixed;left:0;right:0;top:40%;z-index:3;text-align:center;pointer-events:none;
      font-weight:900;font-size:2.4rem;letter-spacing:.04em;color:#fff;
      text-shadow:0 4px 0 var(--pink,#ff3bbd),0 0 30px var(--pink,#ff3bbd);
      animation:dcBanner 1s cubic-bezier(.3,1.5,.5,1) both;}
    .dc-banner small{display:block;font-size:1.05rem;letter-spacing:.2em;text-shadow:0 2px 10px rgba(0,0,0,.6);}
    @keyframes dcBanner{0%{opacity:0;transform:scale(2.6)}22%{opacity:1;transform:scale(.92)}
      34%{transform:scale(1.04)}78%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8) translateY(-30px)}}
    .dc-choice{transition:transform .1s,background .2s,border-color .2s,opacity .2s;}
    .dc-choice.right{animation:dcRight .5s cubic-bezier(.3,1.8,.5,1) both;
      box-shadow:0 0 0 3px rgba(56,224,138,.35),0 0 22px rgba(56,224,138,.45);}
    .dc-choice.wrong{animation:dcShake .4s ease both;}
    @keyframes dcRight{0%{transform:scale(1)}45%{transform:scale(1.07)}100%{transform:scale(1)}}
    @keyframes dcShake{0%,100%{transform:none}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}
      60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}
    .dc-plus{position:absolute;z-index:3;pointer-events:none;font-weight:900;font-size:1.5rem;color:#7dffb4;
      text-shadow:0 2px 0 #0b5a33,0 0 14px rgba(56,224,138,.8);animation:dcPlus .8s ease-out both;}
    @keyframes dcPlus{0%{opacity:0;transform:translate(-50%,0) scale(.5)}25%{opacity:1;transform:translate(-50%,-14px) scale(1.25)}
      100%{opacity:0;transform:translate(-50%,-60px) scale(1)}}
    .dc-result-score.slam{animation:dcSlam .6s cubic-bezier(.3,1.5,.5,1) both;}
    @keyframes dcSlam{0%{opacity:0;transform:scale(3.2) rotate(-8deg)}55%{opacity:1;transform:scale(.88) rotate(2deg)}
      75%{transform:scale(1.08)}100%{transform:scale(1)}}
    .dc-perfect{font-weight:900;font-size:1.4rem;color:#ffe36e;letter-spacing:.08em;margin-top:4px;
      text-shadow:0 0 16px rgba(255,210,80,.8);animation:dcSlam .6s cubic-bezier(.3,1.5,.5,1) .35s both;}
    .dc-ghost.hop{animation:dcHop .7s cubic-bezier(.3,1.6,.5,1) 2,dcFloat 3.4s ease-in-out 1.4s infinite;}
    @keyframes dcHop{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-34px) scale(1.08,.94)}
      70%{transform:translateY(0) scale(1.1,.88)}}
    @media (orientation:landscape) and (max-height:600px){
      .dc-dots{margin-bottom:8px;} .dc-banner{font-size:1.8rem;}
      .dc-turn{top:-14px;font-size:.86rem;padding:5px 12px;}
      .dc-nag{top:10%;} .dc-nag img{width:56px;height:56px;}
    }
    @media (prefers-reduced-motion: reduce){
      .dc-card,.dc-dot.on,.dc-audio.playing,.dc-audio.nudge,.dc-turn,.dc-btn.ready,.dc-nag,.dc-nag img,
      .dc-banner,.dc-choice.right,.dc-choice.wrong,.dc-plus,.dc-result-score.slam,.dc-perfect,.dc-ghost.hop{animation:none;}
      .dc-audio.playing::after{display:none;}
      .dc-nag{transform:translateX(-50%);}
      .dc-banner{opacity:0;}
    }`;

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  /* Tiny WebAudio sound kit — quiet, short, and never over the voice except
     the nag boing. Silently does nothing where WebAudio is missing. */
  let sfxCtx = null;
  function sfxWake() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!sfxCtx) sfxCtx = new AC();
      if (sfxCtx.state === 'suspended' && sfxCtx.resume) sfxCtx.resume().catch(() => {});
      return sfxCtx;
    } catch (e) { return null; }
  }
  function blip(c, type, f0, f1, at, dur, peak) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(c.destination);
    o.start(at); o.stop(at + dur + 0.02);
  }
  function sfx(name, level) {
    const c = sfxWake();
    if (!c || c.state !== 'running') return;
    try {
      const t = c.currentTime + 0.01;
      const up = Math.pow(2, Math.min(7, level || 0) / 12);
      if (name === 'tap') blip(c, 'triangle', 620, 820, t, 0.07, 0.10);
      else if (name === 'unlock') { blip(c, 'triangle', 880, 0, t, 0.09, 0.12); blip(c, 'triangle', 1320, 0, t + 0.07, 0.16, 0.12); }
      else if (name === 'turn') { blip(c, 'sine', 523, 0, t, 0.08, 0.09); blip(c, 'sine', 784, 0, t + 0.07, 0.12, 0.09); }
      else if (name === 'boing') { blip(c, 'sine', 180, 520, t, 0.12, 0.14); blip(c, 'sine', 520, 140, t + 0.12, 0.26, 0.12); }
      else if (name === 'wobble') blip(c, 'square', 160, 120, t, 0.06, 0.04);
      else if (name === 'section') { [392, 523, 659].forEach((f, i) => blip(c, 'triangle', f, 0, t + i * 0.06, 0.14, 0.10)); }
      else if (name === 'right') { [660, 880, 1100].forEach((f, i) => blip(c, 'triangle', f * up, 0, t + i * 0.06, 0.16, 0.12)); }
      else if (name === 'wrong') blip(c, 'square', 220, 150, t, 0.22, 0.05);
      else if (name === 'slam') { blip(c, 'sine', 150, 50, t, 0.32, 0.28); blip(c, 'triangle', 1200, 600, t, 0.08, 0.06); }
      else if (name === 'fanfare') { [523, 659, 784, 1047, 1319].forEach((f, i) => blip(c, 'triangle', f, 0, t + 0.25 + i * 0.09, i === 4 ? 0.5 : 0.16, 0.11)); }
    } catch (e) {}
  }
  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    const css = `
    .dc-root{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;
      align-items:center;justify-content:flex-start;padding:calc(18px + var(--safe-top,0px)) 18px
      calc(18px + var(--safe-bottom,0px));background:var(--bg,#000)
      url('assets/img/background-1.webp') center/cover no-repeat;color:var(--text,#fff);
      font-family:inherit;text-align:center;overflow-x:hidden;overflow-y:auto;
      -webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;
      -webkit-tap-highlight-color:transparent;}
    .dc-root *{box-sizing:border-box;}
    .dc-root::before,.dc-root::after{content:'';flex:1 0 18px;}
    .dc-root>*{flex-shrink:0;}
    .dc-root button{touch-action:manipulation;-webkit-user-select:none;user-select:none;}
    .dc-ghost{width:132px;height:132px;object-fit:contain;
      filter:drop-shadow(0 8px 24px rgba(255,59,189,.45));animation:dcFloat 3.4s ease-in-out infinite;}
    @keyframes dcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
    .dc-title{font-weight:800;font-size:1.5rem;margin:14px 0 4px;letter-spacing:.02em;}
    .dc-sub{color:var(--muted,rgba(255,255,255,.7));font-size:.95rem;margin-bottom:18px;}
    .dc-progress{display:flex;gap:6px;margin:0 0 20px;}
    .dc-pip{width:26px;height:5px;border-radius:3px;background:rgba(255,255,255,.22);transition:background .25s;}
    .dc-pip.on{background:var(--pink,#ff3bbd);}
    .dc-pip.done{background:var(--pink2,#ff79d7);}
    .dc-card{width:min(92vw,520px);background:rgba(20,6,24,.72);border:1px solid rgba(255,121,215,.35);
      border-radius:20px;padding:24px 22px;backdrop-filter:blur(8px);}
    .dc-jp{font-size:1.7rem;font-weight:700;line-height:1.4;margin-bottom:10px;word-break:break-word;}
    .dc-en{font-size:1.05rem;color:var(--muted,rgba(255,255,255,.75));line-height:1.4;
      min-height:1.4em;transition:opacity .2s;}
    .dc-en.hidden{opacity:0;}
    .dc-audio{margin-top:16px;width:60px;height:60px;border-radius:50%;border:none;
      background:linear-gradient(135deg,var(--pink,#ff3bbd),var(--pink2,#ff79d7));color:#fff;
      font-size:1.5rem;cursor:pointer;box-shadow:0 6px 18px rgba(255,59,189,.4);
      transition:transform .12s,opacity .2s;}
    .dc-audio:active{transform:scale(.92);}
    .dc-audio.locked{opacity:.45;}
    .dc-btn{margin-top:22px;min-width:180px;padding:15px 26px;border:none;border-radius:16px;
      font-size:1.05rem;font-weight:800;letter-spacing:.03em;cursor:pointer;color:#fff;
      background:linear-gradient(135deg,var(--pink,#ff3bbd),var(--pink2,#ff79d7));
      box-shadow:0 8px 22px rgba(255,59,189,.45);transition:transform .12s;}
    .dc-btn:active{transform:translateY(2px) scale(.98);}
    .dc-btn.dc-start-ready{animation:dcStartGlow 1.8s ease-in-out infinite;}
    @keyframes dcStartGlow{
      0%,100%{box-shadow:0 8px 22px rgba(255,59,189,.45),0 0 0 0 rgba(255,121,215,0);}
      50%{box-shadow:0 8px 26px rgba(255,59,189,.7),0 0 0 7px rgba(255,121,215,.18),0 0 34px rgba(255,59,189,.55);}
    }
    .dc-btn.ghost{background:transparent;border:1.5px solid rgba(255,255,255,.4);
      box-shadow:none;color:var(--muted,rgba(255,255,255,.8));font-weight:700;}
    .dc-tiles{display:flex;flex-direction:column;gap:12px;width:min(92vw,420px);margin-top:6px;}
    .dc-tile{--h:200deg;display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:18px;
      border:1.5px solid hsla(var(--h),90%,65%,.5);background:hsla(var(--h),80%,30%,.28);
      color:#fff;cursor:pointer;text-align:left;position:relative;transition:transform .12s,border-color .2s,background .2s,box-shadow .2s;}
    .dc-tile:active{transform:scale(.98);}
    .dc-tile.sel{border-color:hsla(var(--h),95%,72%,1);background:hsla(var(--h),85%,42%,.42);
      box-shadow:0 0 0 3px hsla(var(--h),90%,65%,.5),0 0 24px hsla(var(--h),90%,65%,.45);
      transform:translateY(-2px);}
    .dc-tile.sel::after{content:'✓';display:grid;place-items:center;flex:0 0 28px;width:28px;height:28px;
      margin-left:auto;border-radius:50%;background:hsla(var(--h),95%,72%,1);color:#190b22;
      font-size:1.05rem;font-weight:900;box-shadow:0 0 12px hsla(var(--h),90%,75%,.8);}
    .dc-tile .tn{font-weight:800;font-size:1.1rem;}
    .dc-tile .tj{font-size:.85rem;color:var(--muted,rgba(255,255,255,.75));}
    .dc-choices{display:flex;flex-direction:column;gap:11px;width:min(92vw,520px);margin-top:18px;}
    .dc-choice{padding:15px 18px;border-radius:15px;border:1.5px solid rgba(255,255,255,.25);
      background:rgba(255,255,255,.06);color:#fff;font-size:1.02rem;line-height:1.35;cursor:pointer;
      text-align:left;transition:transform .1s,background .2s,border-color .2s;}
    .dc-choice:active{transform:scale(.99);}
    .dc-choice.right{border-color:#38e08a;background:rgba(56,224,138,.22);}
    .dc-choice.wrong{border-color:#ff5a7a;background:rgba(255,90,122,.2);}
    .dc-choice.dim{opacity:.4;}
    .dc-count{position:absolute;top:calc(14px + var(--safe-top,0px));right:18px;
      color:var(--muted,rgba(255,255,255,.6));font-size:.85rem;font-weight:700;}
    .dc-close{position:absolute;top:calc(10px + var(--safe-top,0px));left:14px;width:40px;height:40px;
      border:none;border-radius:50%;background:rgba(0,0,0,.35);color:#fff;font-size:1.2rem;cursor:pointer;}
    .dc-result-score{font-size:3.2rem;font-weight:900;line-height:1;margin:6px 0;}
    .dc-streak{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:8px 16px;
      border-radius:999px;background:rgba(255,121,215,.16);border:1px solid rgba(255,121,215,.4);
      font-weight:800;font-size:1rem;}
    .dc-burst{position:absolute;width:9px;height:9px;border-radius:50%;pointer-events:none;
      will-change:transform,opacity;}
    html[data-season="halloween"] .dc-root{
      --pink:var(--season-orange,#e8731f);--pink2:#ffb45a;
      background:
        radial-gradient(ellipse at 50% 30%,rgba(10,14,34,.55) 0%,rgba(4,6,16,.84) 62%,rgba(2,2,8,.95) 100%),
        var(--bg,#000) url('assets/img/background-1.webp') center/cover no-repeat;}
    html[data-season="halloween"] .dc-card{background:rgba(14,10,26,.78);border-color:rgba(255,170,75,.32);}
    html[data-season="halloween"] .dc-ghost{filter:drop-shadow(0 8px 24px rgba(255,138,42,.4));}
    html[data-season="halloween"] .dc-streak{background:rgba(74,31,69,.5);border-color:rgba(255,170,75,.4);color:#ffc46d;}
    html[data-season="halloween"] .dc-btn.ghost{border-color:rgba(202,185,207,.55);}
    html[data-season="halloween"] .dc-btn:not(.ghost),
    html[data-season="halloween"] .dc-audio{box-shadow:0 8px 22px rgba(232,115,31,.42);}
    html[data-season="christmas"] .dc-root{
      --pink:var(--season-red,#c7354b);--pink2:var(--season-gold,#f2c95c);
      background:
        radial-gradient(circle at 18px 26px,rgba(255,250,240,.8) 0 1.5px,transparent 2.8px),
        radial-gradient(circle at 92px 116px,rgba(255,250,240,.62) 0 2px,transparent 3.5px),
        radial-gradient(ellipse at 50% 30%,rgba(14,45,36,.48) 0%,rgba(5,18,22,.82) 62%,rgba(3,8,8,.95) 100%),
        var(--bg,#000) url('assets/img/background-1.webp') center/cover no-repeat;}
    html[data-season="christmas"] .dc-card{background:rgba(7,28,22,.78);border-color:rgba(38,116,72,.55);}
    html[data-season="christmas"] .dc-ghost{filter:drop-shadow(0 8px 24px rgba(242,201,92,.34));}
    html[data-season="christmas"] .dc-streak{background:rgba(38,116,72,.38);border-color:rgba(242,201,92,.5);color:#fffaf0;}
    html[data-season="christmas"] .dc-btn.ghost{border-color:rgba(255,250,240,.58);}
    html[data-season="christmas"] .dc-btn:not(.ghost),
    html[data-season="christmas"] .dc-audio{box-shadow:0 8px 22px rgba(199,53,75,.42);}
    @media (prefers-reduced-motion: no-preference){
      html[data-season="halloween"] .dc-btn.dc-start-ready{animation-name:dcStartGlowHalloween;}
      html[data-season="christmas"] .dc-btn.dc-start-ready{animation-name:dcStartGlowChristmas;}
    }
    @media (prefers-reduced-motion: reduce){
      html[data-season="halloween"] .dc-btn.dc-start-ready{box-shadow:0 8px 26px rgba(232,115,31,.68),0 0 0 4px rgba(255,180,90,.18),0 0 28px rgba(232,115,31,.45);}
      html[data-season="christmas"] .dc-btn.dc-start-ready{box-shadow:0 8px 26px rgba(201,75,85,.62),0 0 0 4px rgba(244,208,111,.16),0 0 28px rgba(85,212,134,.36);}
    }
    @keyframes dcStartGlowHalloween{
      0%,100%{box-shadow:0 8px 22px rgba(232,115,31,.42),0 0 0 0 rgba(255,180,90,0);}
      50%{box-shadow:0 8px 26px rgba(232,115,31,.68),0 0 0 7px rgba(255,180,90,.18),0 0 34px rgba(232,115,31,.5);}
    }
    @keyframes dcStartGlowChristmas{
      0%,100%{box-shadow:0 8px 22px rgba(201,75,85,.38),0 0 0 0 rgba(244,208,111,0);}
      50%{box-shadow:0 8px 26px rgba(201,75,85,.62),0 0 0 7px rgba(244,208,111,.16),0 0 34px rgba(85,212,134,.42);}
    }
    @media (orientation:landscape) and (max-height:600px){
      html[data-season="halloween"] .dc-ghost{filter:none;}
    }
    @media (orientation:landscape) and (max-height:600px){
      .dc-root{padding-top:calc(8px + var(--safe-top,0px));
        padding-bottom:calc(8px + var(--safe-bottom,0px));}
      .dc-root::before,.dc-root::after{flex-basis:8px;}
      .dc-ghost{width:70px;height:70px;animation:none;filter:none;}
      .dc-title{font-size:1.2rem;margin:5px 0 2px;}
      .dc-sub{font-size:.84rem;margin-bottom:8px;}
      .dc-progress{margin-bottom:9px;}
      .dc-card{padding:14px 18px;}
      .dc-jp{font-size:1.3rem;margin-bottom:6px;}
      .dc-audio{margin-top:9px;width:48px;height:48px;}
      .dc-btn{margin-top:10px;padding:11px 22px;}
      .dc-tiles{width:min(94vw,720px);flex-direction:row;gap:8px;margin-top:2px;}
      .dc-tile{flex:1;min-width:0;padding:11px 12px;}
      .dc-choices{margin-top:10px;gap:8px;}
      .dc-choice{padding:11px 15px;}
    }
    @media (prefers-reduced-motion: reduce){
      .dc-ghost{animation:none;} .dc-burst{display:none;}
      .dc-btn.dc-start-ready{animation:none;box-shadow:0 8px 26px rgba(255,59,189,.7),0 0 0 4px rgba(255,121,215,.18),0 0 28px rgba(255,59,189,.45);}
    }`;
    const el = document.createElement('style');
    el.id = 'dc-styles';
    el.textContent = css + POP_CSS;
    document.head.appendChild(el);
  }

  // Single persistent audio element — stays unlocked on iOS after first gesture.
  let audioEl = null;
  // Whoever is listening right now (one card or one quiz answer). Events from
  // an older card are ignored because the hook is replaced on every card.
  let audioHook = null;
  function getAudio() {
    if (!audioEl) {
      audioEl = new Audio(); audioEl.preload = 'auto';
      const fire = (name) => () => {
        const h = audioHook;
        if (h && typeof h[name] === 'function' && audioEl.src === h.url) h[name](audioEl);
      };
      audioEl.addEventListener('timeupdate', fire('time'));
      audioEl.addEventListener('playing', fire('playing'));
      audioEl.addEventListener('ended', fire('ended'));
      audioEl.addEventListener('error', fire('error'));
    }
    return audioEl;
  }

  let playSeq = 0;
  function playUrl(url, hook) {
    const a = getAudio();
    const seq = ++playSeq;
    audioHook = hook ? Object.assign(hook, { url }) : null;
    try { a.pause(); } catch (e) {}
    try { a.src = url; a.currentTime = 0; } catch (e) {}
    const failed = (err) => {
      if (seq !== playSeq || audioHook !== hook || !hook) return;
      if (err && err.name === 'AbortError') return;          // replaced by a newer play
      if (typeof hook.error === 'function') hook.error(a);
    };
    let p = null;
    try { p = a.play(); } catch (e) { failed(e); return; }
    if (p && typeof p.catch === 'function') p.catch(failed);
  }
  // Unlock the shared <audio> inside a tap so the first card can autoplay
  // after the content loads (iOS needs a gesture-started play()).
  function primeAudio() {
    sfxWake();
    const a = getAudio();
    if (a.src) return;
    try {
      a.src = SILENT_WAV;
      const p = a.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { try { if (a.src === SILENT_WAV) a.pause(); } catch (e) {} }).catch(() => {});
      }
    } catch (e) {}
  }

  function burst(root, x, y) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const season = document.documentElement.dataset.season;
    const colors = season === 'halloween'
      ? ['#ff8a2a', '#ffb45a', '#ffd36e', '#9b63e8', '#c9a6ff']
      : season === 'christmas'
        ? ['#ff6f78', '#f4d06f', '#ffe9a3', '#55d486', '#d8ffe3']
        : ['#ff3bbd', '#ff79d7', '#ffd36e', '#7ef0ff', '#a6ff7e'];
    for (let i = 0; i < 12; i++) {
      const d = document.createElement('div');
      d.className = 'dc-burst';
      d.style.left = x + 'px'; d.style.top = y + 'px';
      d.style.background = colors[i % colors.length];
      root.appendChild(d);
      const ang = (Math.PI * 2 * i) / 12, dist = 40 + Math.random() * 50;
      d.animate(
        [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
         { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0)`, opacity: 0 }],
        { duration: 620, easing: 'cubic-bezier(.2,.7,.3,1)' }
      ).onfinish = () => d.remove();
    }
  }

  function run(opts) {
    opts = opts || {};
    const onDone = typeof opts.onDone === 'function' ? opts.onDone : function () {};
    const onSkip = typeof opts.onSkip === 'function' ? opts.onSkip : function () {};
    const onCancel = typeof opts.onCancel === 'function' ? opts.onCancel : onSkip;
    const fixedCurr = ['pb', 'br', 'bc'].includes(opts.curr) ? opts.curr : null;
    const mode = opts.mode === 'retake' ? 'retake' : 'check';
    // Closing today's first check with × is recorded as 'closed' (it does not
    // let the student through). Journal-launched checks and retakes pass
    // recordSkipOnCancel:false and leave no record.
    const recordCloseOnCancel = opts.recordSkipOnCancel !== false && mode !== 'retake';
    const doneLabel = opts.doneLabel ||
      (mode === 'retake' ? 'ログにもどる' : 'ぼうけんへ');
    injectStyles();

    const root = document.createElement('div');
    root.className = 'dc-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    document.body.appendChild(root);
    document.dispatchEvent(new CustomEvent('booha:dailyCheckVisibility',
      { detail: { open: true } }));

    let closed = false;
    let lastNagAt = 0;
    primeAudio();
    // Timers die with the overlay; callbacks never run after teardown.
    function later(fn, ms) {
      return setTimeout(() => { if (!closed) fn(); }, ms);
    }
    function nag(sayIt) {
      const old = root.querySelector ? root.querySelector('.dc-nag') : null;
      if (old) old.remove();
      const n = document.createElement('div'); n.className = 'dc-nag';
      n.setAttribute('role', 'status');
      const img = ghost(); img.className = '';
      n.appendChild(img);
      const bub = document.createElement('div'); bub.className = 'bub';
      bub.textContent = sayIt ? 'Say it out loud!' : 'Hey! Read and listen!';
      const sm = document.createElement('small');
      sm.textContent = sayIt ? 'こえに だして いってみよう！' : 'よんで、きいてね！';
      bub.appendChild(sm);
      n.appendChild(bub);
      root.appendChild(n);
      sfx('boing');
      later(() => { n.classList.add('out'); later(() => n.remove(), 320); }, 1700);
    }
    function teardown() {
      if (closed) return; closed = true;
      audioHook = null;
      try { getAudio().pause(); } catch (e) {}
      root.remove();
      document.dispatchEvent(new CustomEvent('booha:dailyCheckVisibility',
        { detail: { open: false } }));
    }
    function bailToCancel() {
      // Leaving today's first check records 'closed' (history only — it never
      // grants entry). A journal-launched check or retake records nothing.
      if (recordCloseOnCancel) recordEvent('closed', fixedCurr || knownCurr(), { mode });
      teardown(); onCancel();
    }

    function clear() { root.textContent = ''; }
    function addClose(handler) {
      const b = document.createElement('button');
      b.className = 'dc-close'; b.type = 'button';
      b.setAttribute('aria-label', 'とじる'); b.textContent = '×';
      b.addEventListener('click', handler);
      root.appendChild(b);
    }
    function ghost() {
      const g = document.createElement('img');
      const id = window.BoohaSkins?.menuCharacterId?.();
      const skin = id ? window.BoohaSkins.get(id) : null;
      g.className = 'dc-ghost';
      g.src = skin?.assets?.maze
        || (skin?.kind === 'mascot' ? window.BoohaSkins?.mascotAsset?.('static') : null)
        || 'assets/img/booha_ghost.webp';
      g.alt = skin?.name || 'Booha';
      return g;
    }

    /* ── Step 0: curriculum pick ─────────────────────────────────────── */
    function stepCurriculum() {
      clear();
      addClose(bailToCancel);
      root.appendChild(ghost());
      const t = document.createElement('div'); t.className = 'dc-title';
      t.textContent = 'デイリーチェック'; root.appendChild(t);
      const s = document.createElement('div'); s.className = 'dc-sub';
      s.textContent = 'どのクラス？ / Which class?'; root.appendChild(s);

      const wrap = document.createElement('div'); wrap.className = 'dc-tiles';
      let selected = knownCurr();
      const tiles = {};
      CURR_TILES.forEach(c => {
        const tile = document.createElement('button');
        tile.className = 'dc-tile' + (selected === c.id ? ' sel' : '');
        tile.type = 'button'; tile.style.setProperty('--h', c.hue + 'deg');
        tile.setAttribute('aria-pressed', selected === c.id ? 'true' : 'false');
        const nm = document.createElement('div'); nm.className = 'tn'; nm.textContent = c.name;
        const jp = document.createElement('div'); jp.className = 'tj'; jp.textContent = c.jp;
        const col = document.createElement('div'); col.appendChild(nm); col.appendChild(jp);
        tile.appendChild(col);
        tile.addEventListener('click', () => {
          selected = c.id;
          Object.values(tiles).forEach(x => {
            x.classList.remove('sel');
            x.setAttribute('aria-pressed', 'false');
          });
          tile.classList.add('sel');
          tile.setAttribute('aria-pressed', 'true');
          go.disabled = false;
          go.style.opacity = '1';
          go.classList.add('dc-start-ready');
        });
        tiles[c.id] = tile; wrap.appendChild(tile);
      });
      root.appendChild(wrap);

      const go = document.createElement('button');
      go.className = 'dc-btn' + (selected ? ' dc-start-ready' : '');
      go.type = 'button'; go.textContent = 'はじめる';
      go.disabled = !selected;
      if (!selected) go.style.opacity = '.5';
      go.addEventListener('click', () => {
        if (!selected) return;
        primeAudio();
        if (window.BoohaCurriculum?.set) BoohaCurriculum.set(selected);
        else localStorage.setItem('booha_last_curr', selected);
        stepLoading(selected);
      });
      root.appendChild(go);
    }

    /* ── Loading ─────────────────────────────────────────────────────── */
    function stepLoading(curr) {
      clear();
      root.appendChild(ghost());
      const t = document.createElement('div'); t.className = 'dc-title';
      t.textContent = 'よみこみ中…'; root.appendChild(t);

      loadContent(curr).then(content => {
        const day = buildDay(content);
        // Preload quiz + card audio quietly (best-effort).
        runSections(content, day);
      }).catch(err => {
        console.error('[DailyCheck] load failed:', err);
        // A technical problem, never a skip: the opening lets the student in
        // ("Try Daily Check again" stays available) for the rest of the day.
        recordEvent('load_failure', curr, {
          mode, detail: { message: String((err && err.message) || err || '').slice(0, 120) }
        });
        clear();
        root.appendChild(ghost());
        const m = document.createElement('div'); m.className = 'dc-title';
        m.textContent = 'まだ準備中'; root.appendChild(m);
        const s = document.createElement('div'); s.className = 'dc-sub';
        s.textContent = 'コンテンツをよみこめませんでした。 / Couldn’t load today’s check.'; root.appendChild(s);
        const b = document.createElement('button');
        b.className = 'dc-btn ghost'; b.type = 'button'; b.textContent = 'とじる / CLOSE';
        b.addEventListener('click', () => { teardown(); onCancel(); });
        root.appendChild(b);
      });
    }

    /* ── Tap-through sections ────────────────────────────────────────── */
    function runSections(content, day) {
      const order = ['vocab', 'sentences', 'questions'];
      let si = 0, ci = 0, cardToken = 0;

      function sectionBanner(type) {
        if (reducedMotion()) return;
        const b = document.createElement('div'); b.className = 'dc-banner';
        b.textContent = SECTION_LABEL[type].jp + '!';
        const sm = document.createElement('small'); sm.textContent = SECTION_LABEL[type].en.toUpperCase();
        b.appendChild(sm);
        root.appendChild(b);
        later(() => b.remove(), 1050);
        sfx('section');
      }

      function showCard() {
        clear();
        addClose(bailToCancel);
        const tok = ++cardToken;
        const live = () => tok === cardToken && !closed;
        const type = order[si];
        const cards = day.picks[type];
        const card = cards[ci];
        const shownAt = Date.now();
        const sayPhase = type !== 'vocab';
        let state = 'listen';              // listen → (say) → ready
        let nagShown = false, lastWobble = 0;

        const count = document.createElement('div'); count.className = 'dc-count';
        count.textContent = `${SECTION_LABEL[type].jp} ${ci + 1}/${cards.length}`;
        root.appendChild(count);

        // progress: 15 dots in three groups of five
        const prog = document.createElement('div'); prog.className = 'dc-dots';
        order.forEach((t, k) => {
          const grp = document.createElement('div'); grp.className = 'grp';
          day.picks[t].forEach((_, j) => {
            const d = document.createElement('div');
            d.className = 'dc-dot' + (k < si || (k === si && j < ci) ? ' done' : (k === si && j === ci) ? ' on' : '');
            grp.appendChild(d);
          });
          prog.appendChild(grp);
        });
        root.appendChild(prog);

        const box = document.createElement('div'); box.className = 'dc-card';
        const jp = document.createElement('div'); jp.className = 'dc-jp';
        jp.textContent = (content.curr === 'pb' ? card.hira : card.jp) || card.jp || card.en;
        box.appendChild(jp);
        const en = document.createElement('div'); en.className = 'dc-en karaoke';
        // Word spans for the karaoke light-up; each weighted by its length.
        const words = String(card.en || '').split(/\s+/).filter(Boolean);
        const totalChars = words.reduce((n, w) => n + w.length + 1, 0) || 1;
        const spans = [];
        let acc = 0;
        words.forEach((w, i) => {
          const sp = document.createElement('span'); sp.className = 'dc-w';
          sp.textContent = w;
          sp._at = acc / totalChars;
          acc += w.length + 1;
          spans.push(sp);
          en.appendChild(sp);
          if (i < words.length - 1) en.appendChild(document.createTextNode ? document.createTextNode(' ') : (() => { const t = document.createElement('span'); t.textContent = ' '; return t; })());
        });
        if (!spans.length) en.textContent = card.en || '';
        box.appendChild(en);
        function lightTo(frac) {
          spans.forEach(sp => { if (sp._at <= frac + 0.02) sp.classList.add('lit'); });
        }
        function lightAll() { spans.forEach(sp => sp.classList.add('lit')); en.classList.add('all-lit'); }

        const audioBtn = document.createElement('button');
        audioBtn.className = 'dc-audio'; audioBtn.type = 'button';
        audioBtn.setAttribute('aria-label', 'きく'); audioBtn.textContent = '▶';
        const url = audioUrl(content.curr, type, card.mp3, content.monCode);
        box.appendChild(audioBtn);
        root.appendChild(box);

        const next = document.createElement('button');
        next.className = 'dc-btn dc-next locked'; next.type = 'button';
        const last = (si === order.length - 1) && (ci === cards.length - 1);
        next.textContent = '';
        const lbl = document.createElement('span'); lbl.className = 'dc-lbl';
        lbl.textContent = last ? 'クイズへ' : 'つぎ';
        const fill = document.createElement('span'); fill.className = 'dc-fill';
        next.appendChild(fill); next.appendChild(lbl);
        next.setAttribute('aria-disabled', 'true');
        function fillTo(frac, ms) {
          fill.style.transitionDuration = (ms || 250) + 'ms';
          fill.style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
        }

        let turnEl = null;
        function unlock() {
          if (!live() || state === 'ready') return;
          state = 'ready';
          if (turnEl) { turnEl.remove(); turnEl = null; }
          lightAll();
          fillTo(1, 120);
          next.classList.remove('locked');
          next.classList.add('ready');
          next.setAttribute('aria-disabled', 'false');
          sfx('unlock');
        }
        function audioDone(heardMs) {
          if (!live() || state !== 'listen') return;
          audioBtn.classList.remove('playing');
          lightAll();
          if (!sayPhase) { unlock(); return; }
          state = 'say';
          turnEl = document.createElement('div'); turnEl.className = 'dc-turn';
          turnEl.textContent = '🗣 Your turn! いってみよう！';
          box.appendChild(turnEl);
          sfx('turn');
          const ms = Math.max(SAY_MIN_MS, Math.min(SAY_MAX_MS, heardMs || 0));
          fillTo(1, ms);
          later(() => { if (live()) unlock(); }, ms);
        }
        // No usable audio: light the words over a reading-time estimate instead.
        function fallback() {
          if (!live() || state !== 'listen' || hook.fellBack) return;
          hook.fellBack = true;
          audioBtn.classList.remove('playing');
          audioBtn.classList.add('nudge');
          const ms = Math.max(1000, Math.min(3500, 600 + String(card.en || '').length * 35));
          fillTo(sayPhase ? 0.6 : 0.95, ms);
          spans.forEach(sp => later(() => { if (live()) sp.classList.add('lit'); }, sp._at * ms));
          later(() => audioDone(Math.round(ms / 2)), ms);    // shorter "say it" beat with no voice to copy
        }
        let startAt = 0;
        const hook = {
          playing() { if (!live()) return; startAt = startAt || Date.now(); audioBtn.classList.remove('nudge'); audioBtn.classList.add('playing'); },
          time(a) {
            if (!live()) return;
            const d = a.duration;
            if (!d || !isFinite(d)) return;
            const f = a.currentTime / d;
            lightTo(f);
            if (state === 'listen') fillTo(f * (sayPhase ? 0.6 : 0.95));
          },
          ended(a) {
            if (!live()) return;
            audioBtn.classList.remove('playing');
            const d = a && a.duration && isFinite(a.duration) ? a.duration * 1000 : 0;
            audioDone(d || (startAt ? Date.now() - startAt : 1500));
          },
          error() { fallback(); }
        };

        audioBtn.addEventListener('click', () => {
          sfxWake();
          if (state === 'listen') hook.fellBack = false;
          playUrl(url, hook);
        });

        next.addEventListener('click', () => {
          if (state !== 'ready') {
            if (Date.now() - shownAt < TAP_GRACE_MS) return;     // laggy double tap
            const now = Date.now();
            if (now - lastWobble > 300) {
              lastWobble = now;
              sfx('wobble');
              if (!reducedMotion() && next.animate) next.animate([
                { transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(-9px) rotate(-3deg)' },
                { transform: 'translateX(8px) rotate(3deg)' }, { transform: 'translateX(-4px) rotate(-1deg)' },
                { transform: 'translateX(0) rotate(0)' }], { duration: 320, easing: 'ease-out' });
            }
            if (!nagShown && now - lastNagAt > NAG_COOLDOWN_MS) {
              nagShown = true; lastNagAt = now;
              nag(state === 'say');
            }
            return;
          }
          sfx('tap');
          audioHook = null;
          try { getAudio().pause(); } catch (e) {}
          ci++;
          if (ci >= cards.length) { si++; ci = 0; }
          if (si >= order.length) startQuiz(content, day);
          else showCard();
        });
        root.appendChild(next);

        // Section start: banner first, then the voice.
        const begin = () => {
          if (!live()) return;
          playUrl(url, hook);
          later(() => audioDone(GATE_CAP_MS), GATE_CAP_MS);      // never stuck
        };
        if (ci === 0) { sectionBanner(type); later(begin, reducedMotion() ? 0 : 650); }
        else begin();
      }
      showCard();
    }

    /* ── Quiz ────────────────────────────────────────────────────────── */
    function startQuiz(content, day) {
      let qi = 0, correct = 0, combo = 0, qToken = 0;
      // Spaced-review items come from an older month's audio folder.
      const reviewMon = content.spacedReview && content.spacedReview.week
        ? (MON_CODE[content.spacedReview.week.monthSlug] || content.monCode) : content.monCode;
      function quizAudioUrl(q) {
        if (!q || !q.mp3) return null;
        return audioUrl(content.curr, q.type, q.mp3, q.isSpacedReview ? reviewMon : content.monCode);
      }

      function showQ() {
        clear();
        addClose(bailToCancel);
        const q = day.quiz[qi];

        const count = document.createElement('div'); count.className = 'dc-count';
        count.textContent = `クイズ ${qi + 1}/${day.quiz.length}`;
        root.appendChild(count);

        const box = document.createElement('div'); box.className = 'dc-card';
        const jp = document.createElement('div'); jp.className = 'dc-jp';
        jp.textContent = q.prompt;                    // Japanese prompt
        box.appendChild(jp);
        root.appendChild(box);

        const list = document.createElement('div'); list.className = 'dc-choices';
        let answered = false;
        const tok = ++qToken;
        q.choices.forEach(choice => {
          const b = document.createElement('button');
          b.className = 'dc-choice'; b.type = 'button';
          b.textContent = choice.label;               // English options
          b.addEventListener('click', (ev) => {
            if (answered) return; answered = true;
            const isRight = choice.n === q.answerN;
            if (isRight) {
              correct++;
              combo++;
              b.classList.add('right');
              const r = root.getBoundingClientRect();
              burst(root, ev.clientX - r.left, ev.clientY - r.top);
              sfx('right', (combo - 1) * 2);
              if (!reducedMotion()) {
                const plus = document.createElement('div'); plus.className = 'dc-plus';
                plus.textContent = combo > 1 ? `+1  ×${combo}` : '+1';
                plus.style.left = (ev.clientX - r.left) + 'px';
                plus.style.top = (ev.clientY - r.top - 20) + 'px';
                root.appendChild(plus);
                later(() => plus.remove(), 820);
              }
            } else {
              combo = 0;
              sfx('wrong');
              b.classList.add('wrong');
              Array.from(list.children).forEach(cb => {
                const n = q.choices[Array.from(list.children).indexOf(cb)].n;
                if (n === q.answerN) cb.classList.add('right');
                else if (cb !== b) cb.classList.add('dim');
              });
            }
            // Play the right answer, and let it finish before moving on
            // (capped, and never shorter than the old feedback beat).
            let waitBeat = true, waitVoice = true, moved = false;
            const go = () => {
              if (moved || waitBeat || waitVoice || tok !== qToken || closed) return;
              moved = true;
              audioHook = null;
              qi++;
              if (qi >= day.quiz.length) finish();
              else showQ();
            };
            const voiceDone = () => { waitVoice = false; go(); };
            const qUrl = quizAudioUrl(q);
            if (qUrl) {
              later(() => playUrl(qUrl, { ended: voiceDone, error: voiceDone }), isRight ? 180 : 320);
              later(voiceDone, 5000);
            } else waitVoice = false;
            later(() => { waitBeat = false; go(); }, isRight ? 620 : 1100);
          });
          list.appendChild(b);
        });
        root.appendChild(list);
      }

      function finish() {
        const pct = Math.round((correct / day.quiz.length) * 100);
        let saving = false;

        let saveFailureLogged = false;
        function renderSaveFailure() {
          if (!saveFailureLogged) {
            saveFailureLogged = true;
            recordEvent('save_failure', content.curr, { mode, detail: { pct } });
          }
          clear();
          root.appendChild(ghost());
          const t = document.createElement('div'); t.className = 'dc-title';
          t.textContent = 'まだ保存できていません'; root.appendChild(t);
          const sub = document.createElement('div'); sub.className = 'dc-sub';
          sub.textContent = 'Not saved — please tell your teacher.';
          root.appendChild(sub);
          const b = document.createElement('button');
          b.className = 'dc-btn'; b.type = 'button';
          b.textContent = 'もういちど保存 / RETRY SAVE';
          b.addEventListener('click', persistResult);
          root.appendChild(b);
          // Never a lockout: the student may continue; the failure is logged.
          const later = document.createElement('button');
          later.className = 'dc-btn ghost'; later.type = 'button';
          later.textContent = 'あとで / CONTINUE FOR NOW';
          later.addEventListener('click', () => { teardown(); onCancel(); });
          root.appendChild(later);
        }

        function renderSuccess() {
          const st = streak();
          clear();
          const g = ghost(); root.appendChild(g);
          const t = document.createElement('div'); t.className = 'dc-title';
          t.textContent = 'よくできました！'; root.appendChild(t);
          const sc = document.createElement('div'); sc.className = 'dc-result-score slam';
          sc.textContent = `${correct}/${day.quiz.length}`; root.appendChild(sc);
          if (correct === day.quiz.length) {
            const pf = document.createElement('div'); pf.className = 'dc-perfect';
            pf.textContent = '✨ PERFECT! ✨'; root.appendChild(pf);
          }
          g.classList.add('hop');
          sfx('slam'); sfx('fanfare');
          const sub = document.createElement('div'); sub.className = 'dc-sub';
          sub.textContent = `${pct}%  ·  ${content.curr.toUpperCase()}`; root.appendChild(sub);

          const streakEl = document.createElement('div'); streakEl.className = 'dc-streak';
          streakEl.textContent = streakLabel(st);
          root.appendChild(streakEl);

          const b = document.createElement('button');
          b.className = 'dc-btn'; b.type = 'button'; b.textContent = doneLabel;
          b.style.marginTop = '22px';
          b.addEventListener('click', () => { teardown(); onDone(pct); });
          root.appendChild(b);

          // celebration burst from the ghost
          requestAnimationFrame(() => {
            const r = root.getBoundingClientRect();
            const gr = g.getBoundingClientRect();
            burst(root, gr.left + gr.width / 2 - r.left, gr.top + gr.height / 2 - r.top);
            const sr = sc.getBoundingClientRect();
            later(() => burst(root, sr.left + sr.width / 2 - r.left, sr.top + sr.height / 2 - r.top), 260);
            if (correct === day.quiz.length) {
              later(() => burst(root, sr.left - r.left, sr.top - r.top), 480);
              later(() => burst(root, sr.right - r.left, sr.top - r.top), 620);
            }
          });
        }

        function persistResult() {
          if (saving) return;
          saving = true;
          if (write('done', pct, content.curr)) {
            renderSuccess();
          } else {
            saving = false;
            renderSaveFailure();
          }
        }

        persistResult();
      }

      showQ();
    }

    // Journal retakes are locked to the curriculum of the first attempt.
    // A fresh check still shows the picker when no curriculum was supplied.
    if (fixedCurr) stepLoading(fixedCurr);
    else stepCurriculum();
  }

  /* Parent-facing weekly summary. Week identity (Sun–Sat) comes from CALENDAR;
     we only enumerate the 7 days inside that boundary — no week arithmetic.
     Returns: { days:[{key,st,attempts,isToday,isFuture}],
                doneCount, total:7, accuracyFirst, accuracyBest,
                hasRetakes, streak } */
  function weekSummary() {
    const cw = CALENDAR.getCurrentCurriculumWeek();
    const today = todayKey();
    const meta = _meta();
    const log = meta.checkIn || {};
    // Step 7 days from CALENDAR's weekStart, UTC-safe (mirrors calendar.js).
    const start = new Date(cw.weekStart + 'T00:00:00Z');
    const days = [];
    let doneCount = 0, firstSum = 0, firstN = 0,
        bestSum = 0, bestN = 0, hasRetakes = false;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const rec = log[key] || null;
      const summary = summarizeRecord(rec);
      const dayEvents = events(key);
      const skipped = dayEvents.some(ev => ev.type === 'student_skip') || !!(rec && rec.st === 'skip');
      const tech = dayEvents.some(ev => ev.type === 'load_failure' || ev.type === 'save_failure');
      const st = rec && rec.st === 'done' ? 'done' : skipped ? 'skip' : tech ? 'tech' : null;
      if (st === 'done') {
        doneCount++;
        if (summary.first != null) {
          firstSum += summary.first;
          firstN++;
          bestSum += summary.best;
          bestN++;
        }
        if (summary.hasRetakes) hasRetakes = true;
      }
      days.push({
        key, st, skipped, tech,
        attempts: summary.attempts,
        isToday: key === today,
        isFuture: today ? key > today : false
      });
    }
    const accuracyFirst = firstN ? Math.round(firstSum / firstN) : null;
    const accuracyBest  = bestN  ? Math.round(bestSum / bestN)   : null;
    return {
      days, doneCount, total: 7,
      accuracy: accuracyFirst, // compatibility for existing consumers
      accuracyFirst,
      accuracyBest,
      hasRetakes,
      streak: streak()
    };
  }

  /* ── Public surface ──────────────────────────────────────────────────── */
  return {
    // state
    isDoneToday, recordFor, todaySummary, todayState, streak, streakLabel, knownCurr, todayKey,
    // records
    markDone: (pct, curr) => write('done', pct, curr),
    // "Skip today", confirmed by the student. Never written into checkIn.
    markSkip: (curr) => recordEvent('student_skip', curr),
    recordEvent, events, EVENT_TYPES,
    // content
    loadContent, buildDay, weekInfo, audioUrl, weekSummary,
    // runner
    run,
    // constants
    _cfg: {
      PER_STEP, QUIZ_LEN, QUIZ_CHOICES, TYPES,
      SPACED_REVIEW_MIN_WEEKS, SPACED_REVIEW_MAX_WEEKS
    }
  };
})();
