/*
 * Karasuki Cards (カラスキーカード) — Pass 2a: rules, save state, word
 * snapshot and answer checking. No DOM and no drawing here; Karasuki's
 * host takeover (Pass 2b) and the challenge screen (Pass 2c) call this.
 *
 * Save: data.karasukiCards (permanent, per student — never device-wide).
 * Week-scoped counters reset lazily by comparing the stored occurrence key
 * with CALENDAR's, so resetWeekly() never has to know about cards and a
 * failed host survives the Sunday rollover.
 *
 *   hostId            current host card id (persists until won)
 *   week              occurrence key the attempt counter belongs to
 *   attemptsThisWeek  attempts STARTED this week (max RULES.attemptsPerWeek)
 *   lastAttemptDay    Tokyo day key of the last start (one start per day)
 *   wonWeek           occurrence key of the last win (one card per week)
 *   attempt           the attempt in progress, or null:
 *                       { hostId, week, day, try, startedAt, words, cursor,
 *                         round, results, interruptions }
 *                     `interruptions` is kept apart from failure state.
 *   lastResult        { hostId, passed, score, try, at, week } or null
 *   won               { [cardId]: { cardId, lv, wonAt, try, score, week } }
 */
(function (root) {
  'use strict';

  const RULES = Object.freeze({
    rounds: 10,
    passScore: 8,
    attemptsPerWeek: 2,
    interruptionCap: 2,     // restarts allowed per attempt; the next one is a miss
    snapshotSize: 14,       // 10 rounds + 2 restarts + spares
    typoMinLetters: 7,      // one slip allowed only from 7 letters
    reviewWeeksMin: 1,
    reviewWeeksMax: 6,
    wordsPerWeek: 15,
  });

  // Provisional timings (ms); tuned in Pass 2c on real iPads.
  const TIMING = Object.freeze({
    lookBase: 1200, lookPerLetter: 220, lookMin: 1800, lookMax: 5000,
    typeBase: 5000, typePerLetter: 700, typeMin: 7000, typeMax: 20000,
    preBooLook: 1.5, preBooType: 1.25,
  });

  const PHASE = Object.freeze({
    IN_PROGRESS: 'inProgress',
    ALL_WON: 'allWon',
    WON_THIS_WEEK: 'wonThisWeek',
    LOCKED: 'locked',             // Blitz 3/3 not done this week
    OUT_OF_ATTEMPTS: 'outOfAttempts',
    TOMORROW: 'tomorrow',         // already started an attempt today
    READY: 'ready',
  });

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function count(v) { return Number.isSafeInteger(v) && v > 0 ? v : 0; }

  /* ── State ─────────────────────────────────────────────────────────── */

  function defaultState() {
    return {
      schema: 1,
      hostId: null,
      week: '',
      attemptsThisWeek: 0,
      lastAttemptDay: '',
      wonWeek: '',
      attempt: null,
      lastResult: null,
      won: {},
    };
  }

  function normalizeAttempt(a) {
    if (!isObj(a) || !str(a.hostId) || !Array.isArray(a.words) || !a.words.length) return null;
    const words = a.words
      .filter(w => isObj(w) && str(w.en))
      .map(w => ({ en: w.en, jp: str(w.jp), hira: str(w.hira) }));
    if (!words.length) return null;
    return {
      hostId: a.hostId,
      week: str(a.week),
      day: str(a.day),
      try: Math.max(1, count(a.try)),
      startedAt: Number(a.startedAt) || 0,
      words,
      cursor: count(a.cursor),
      round: Math.min(RULES.rounds, count(a.round)),
      results: Array.isArray(a.results)
        ? a.results.filter(isObj).map(r => ({ w: str(r.w), ok: r.ok === true, why: str(r.why) }))
        : [],
      interruptions: count(a.interruptions),
    };
  }

  function normalizeState(raw) {
    const s = defaultState();
    if (!isObj(raw)) return s;
    s.hostId = str(raw.hostId) || null;
    s.week = str(raw.week);
    s.attemptsThisWeek = Math.min(RULES.attemptsPerWeek, count(raw.attemptsThisWeek));
    s.lastAttemptDay = str(raw.lastAttemptDay);
    s.wonWeek = str(raw.wonWeek);
    s.attempt = normalizeAttempt(raw.attempt);
    s.lastResult = isObj(raw.lastResult) ? { ...raw.lastResult } : null;
    if (isObj(raw.won)) {
      Object.keys(raw.won).forEach(id => {
        const w = raw.won[id];
        if (!isObj(w)) return;
        s.won[id] = {
          cardId: id,
          lv: Math.max(1, count(w.lv)),
          wonAt: Number(w.wonAt) || 0,
          try: Math.max(1, count(w.try)),
          score: count(w.score),
          week: str(w.week),
        };
      });
    }
    return s;
  }

  /* ── Registry ──────────────────────────────────────────────────────── */

  function registry(cards) {
    const list = Array.isArray(cards) ? cards : (Array.isArray(root.KARASUKI_CARDS) ? root.KARASUKI_CARDS : []);
    return list.slice().sort((a, b) => a.no - b.no);
  }
  function getCard(id, cards) { return registry(cards).find(c => c.id === id) || null; }
  function isShipped(card) { return !!(card && card.art); }

  /** Current host: the stored one while it is still unwon, otherwise the
   *  lowest-numbered shipped card the student has not won. Mutates state. */
  function resolveHost(state, cards) {
    const held = state.hostId && getCard(state.hostId, cards);
    if (isShipped(held) && !state.won[held.id]) return held.id;
    const next = registry(cards).find(c => isShipped(c) && !state.won[c.id]);
    state.hostId = next ? next.id : null;
    return state.hostId;
  }

  function rollWeek(state, weekKey) {
    if (weekKey && state.week !== weekKey) {
      state.week = weekKey;
      state.attemptsThisWeek = 0;
    }
  }

  /* ── Status ────────────────────────────────────────────────────────── */

  /** ctx: { weekKey, todayKey, blitzTriple }. Pure: works on a copy. */
  function status(rawState, ctx, cards) {
    const s = normalizeState(rawState);
    rollWeek(s, ctx.weekKey);
    const hostId = s.attempt ? s.attempt.hostId : resolveHost(s, cards);
    const attemptsLeft = Math.max(0, RULES.attemptsPerWeek - s.attemptsThisWeek);
    let phase;
    if (s.attempt) phase = PHASE.IN_PROGRESS;
    else if (!hostId) phase = PHASE.ALL_WON;
    else if (ctx.weekKey && s.wonWeek === ctx.weekKey) phase = PHASE.WON_THIS_WEEK;
    else if (!ctx.blitzTriple) phase = PHASE.LOCKED;
    else if (attemptsLeft <= 0) phase = PHASE.OUT_OF_ATTEMPTS;
    else if (ctx.todayKey && s.lastAttemptDay === ctx.todayKey) phase = PHASE.TOMORROW;
    else phase = PHASE.READY;
    return {
      phase,
      hostId,
      hostActive: phase === PHASE.READY || phase === PHASE.IN_PROGRESS,
      attemptsLeft,
      nextTry: s.attemptsThisWeek + 1,
      round: s.attempt ? s.attempt.round : 0,
      score: s.attempt ? s.attempt.results.filter(r => r.ok).length : 0,
    };
  }

  /* ── Attempt lifecycle (all mutate the state passed in) ────────────── */

  function startAttempt(state, ctx, words, now, cards) {
    const st = status(state, ctx, cards);
    if (st.phase !== PHASE.READY) return { ok: false, error: st.phase };
    const clean = (Array.isArray(words) ? words : [])
      .filter(w => isObj(w) && str(w.en))
      .slice(0, RULES.snapshotSize)
      .map(w => ({ en: w.en, jp: str(w.jp), hira: str(w.hira) }));
    if (clean.length < RULES.rounds) return { ok: false, error: 'notEnoughWords' };
    rollWeek(state, ctx.weekKey);
    resolveHost(state, cards);
    state.attemptsThisWeek += 1;
    state.lastAttemptDay = ctx.todayKey || '';
    state.attempt = {
      hostId: st.hostId,
      week: ctx.weekKey || '',
      day: ctx.todayKey || '',
      try: state.attemptsThisWeek,
      startedAt: now,
      words: clean,
      cursor: 0,
      round: 0,
      results: [],
      interruptions: 0,
    };
    return { ok: true, attempt: state.attempt };
  }

  /** The word for the current round. Restarts move to a fresh word. */
  function currentWord(state) {
    const a = state.attempt;
    if (!a) return null;
    return a.words[a.cursor % a.words.length];
  }

  function record(state, word, ok, why, now) {
    const a = state.attempt;
    a.results.push({ w: word.en, ok, why });
    a.cursor += 1;
    a.round += 1;
    return a.round >= RULES.rounds ? finish(state, now) : null;
  }

  function finish(state, now) {
    const a = state.attempt;
    const score = a.results.filter(r => r.ok).length;
    const passed = score >= RULES.passScore;
    if (passed) {
      state.won[a.hostId] = { cardId: a.hostId, lv: 1, wonAt: now, try: a.try, score, week: a.week };
      state.wonWeek = a.week;
      state.hostId = null;
    } else {
      state.hostId = a.hostId;   // a failed host stays the host
    }
    state.lastResult = { hostId: a.hostId, passed, score, try: a.try, at: now, week: a.week };
    state.attempt = null;
    return state.lastResult;
  }

  /** A submitted answer (including an empty one when the type timer ends). */
  function submitAnswer(state, typed, now, echo) {
    if (!state.attempt) return { ok: false, error: 'noAttempt' };
    const word = currentWord(state);
    const verdict = checkAnswer(word.en, typed, echo);
    const correct = verdict !== 'wrong';
    const outcome = record(state, word, correct, correct ? verdict : 'wrong', now);
    return { ok: true, word, verdict, correct, done: !!outcome, outcome };
  }

  /** The iPad left the round (visibilitychange, reload). Within the cap the
   *  round restarts with a fresh word and nothing is lost; past it, the
   *  round counts as a miss. Never consumes an attempt by itself. */
  function interruptRound(state, now) {
    const a = state.attempt;
    if (!a) return { ok: false, error: 'noAttempt' };
    if (a.interruptions < RULES.interruptionCap) {
      a.interruptions += 1;
      a.cursor += 1;
      return { ok: true, kind: 'restart', interruptions: a.interruptions, word: currentWord(state) };
    }
    const word = currentWord(state);
    const outcome = record(state, word, false, 'left', now);
    return { ok: true, kind: 'miss', word, done: !!outcome, outcome };
  }

  /** An attempt left open across a Sunday rollover is closed: unanswered
   *  rounds count as misses. Returns the outcome, or null if nothing to do. */
  function expireStale(state, ctx, now) {
    const a = state.attempt;
    if (!a || !ctx.weekKey || !a.week || a.week === ctx.weekKey) return null;
    while (state.attempt && state.attempt.round < RULES.rounds) {
      const outcome = record(state, currentWord(state), false, 'expired', now);
      if (outcome) return outcome;
    }
    return state.attempt ? finish(state, now) : null;
  }

  /* ── Answer check (reuses Echo's normalizer and edit distance) ─────── */

  function letters(s) { return String(s || '').replace(/[^a-z]/g, '').length; }

  /** 'exact' | 'near' | 'wrong'. Case-insensitive; exact for short words;
   *  one slip (a swapped pair counts as one) only for 7+ letters. */
  function checkAnswer(target, typed, echo) {
    const E = echo || root.EchoLogic;
    if (!E || typeof E.normalize !== 'function') throw new Error('[KarasukiCards] EchoLogic is not loaded');
    const got = E.normalize(typed);
    if (!got) return 'wrong';
    let near = false;
    for (const t of E.targetsOf(target)) {
      if (got === t) return 'exact';
      if (letters(t) >= RULES.typoMinLetters && E.distance(got, t) <= 1) near = true;
    }
    return near ? 'near' : 'wrong';
  }

  /* ── Timers ────────────────────────────────────────────────────────── */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lookMs(word, curriculum) {
    const n = letters(String(word).toLowerCase());
    const ms = clamp(TIMING.lookBase + TIMING.lookPerLetter * n, TIMING.lookMin, TIMING.lookMax);
    return Math.round(curriculum === 'pb' ? ms * TIMING.preBooLook : ms);
  }
  function typeMs(word, curriculum) {
    const n = letters(String(word).toLowerCase());
    const ms = clamp(TIMING.typeBase + TIMING.typePerLetter * n, TIMING.typeMin, TIMING.typeMax);
    return Math.round(curriculum === 'pb' ? ms * TIMING.preBooType : ms);
  }

  /* ── Word snapshot ─────────────────────────────────────────────────── */

  /** Small seeded RNG so tests (and a teacher's replay) are repeatable. */
  function seededRng(seed) {
    let h = 1779033703 ^ String(seed).length;
    for (let i = 0; i < String(seed).length; i++) {
      h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  function firstForm(en) { return String(en || '').split(/[／/]/)[0].trim(); }
  function wordCount(en) { return en.split(/\s+/).filter(Boolean).length; }
  function typeable(en) { return /^[A-Za-z][A-Za-z' -]*[A-Za-z]$/.test(en); }

  /**
   * pools: [{ weeksAgo, cards: [{ en, jp, hira }] }]. Recent weeks weigh
   * more (weight = maxWeeks + 1 - weeksAgo). Single words are preferred;
   * two-word phrases fill in only when there are not enough single words.
   */
  function pickWords(pools, rng, size) {
    const want = size || RULES.snapshotSize;
    const random = typeof rng === 'function' ? rng : Math.random;
    const maxAgo = Math.max(RULES.reviewWeeksMax, ...pools.map(p => p.weeksAgo || 0));
    const seen = new Set();
    const tiers = [[], []];
    pools.forEach(pool => {
      const weight = Math.max(1, maxAgo + 1 - (pool.weeksAgo || 0));
      (pool.cards || []).forEach(card => {
        const en = firstForm(card && card.en);
        const key = en.toLowerCase();
        if (!en || seen.has(key) || !typeable(en) || letters(key) < 2) return;
        const words = wordCount(en);
        if (words > 2 || letters(key) > 16) return;
        seen.add(key);
        tiers[words === 1 ? 0 : 1].push({
          item: { en, jp: str(card.jp), hira: str(card.hira), weeksAgo: pool.weeksAgo || 0 },
          weight,
        });
      });
    });
    const out = [];
    for (const tier of tiers) {
      const bag = tier.slice();
      while (out.length < want && bag.length) {
        const total = bag.reduce((sum, c) => sum + c.weight, 0);
        let roll = random() * total;
        let index = 0;
        while (index < bag.length - 1 && roll >= bag[index].weight) { roll -= bag[index].weight; index++; }
        out.push(bag.splice(index, 1)[0].item);
      }
    }
    return out;
  }

  function sliceForWeek(cards, weekNumber) {
    const lo = (weekNumber - 1) * RULES.wordsPerWeek + 1;
    const hi = weekNumber * RULES.wordsPerWeek;
    return (cards || []).filter(c => c && c.n >= lo && c.n <= hi);
  }

  /** Curriculum weeks before the current one, de-duplicated (a fifth
   *  calendar week reuses Week 4's content). */
  function previousWeeks(calendar, now) {
    const current = calendar.getCurrentCurriculumWeek(now);
    const seen = new Set([`${current.monthSlug}-w${Math.min(current.weekNumber, 4)}`]);
    const weeks = [];
    for (let ago = RULES.reviewWeeksMin; ago <= RULES.reviewWeeksMax; ago++) {
      const start = new Date(current.weekStart + 'T12:00:00Z');
      start.setUTCDate(start.getUTCDate() - ago * 7);
      const cw = calendar.getCurrentCurriculumWeek(start);
      const weekNumber = Math.min(cw.weekNumber || 1, 4);
      const id = `${cw.monthSlug}-w${weekNumber}`;
      if (seen.has(id)) continue;
      seen.add(id);
      weeks.push({ monthSlug: cw.monthSlug, weekNumber, weeksAgo: ago });
    }
    return { current: { monthSlug: current.monthSlug, weekNumber: Math.min(current.weekNumber, 4), weeksAgo: 0 }, weeks };
  }

  /**
   * Builds the snapshot for a new attempt. Falls back to the current week
   * when previous decks fail to load. Resolves [] if nothing usable loads.
   * opts: { fetchJson(url) → Promise<json>, calendar, now, rng }
   */
  async function loadSnapshotWords(curriculum, opts) {
    const o = opts || {};
    const calendar = o.calendar || root.CALENDAR;
    const fetchJson = o.fetchJson || (url => fetch(url).then(r => {
      if (!r.ok) throw new Error(`${url} ${r.status}`);
      return r.json();
    }));
    const curr = ['pb', 'br', 'bc'].includes(curriculum) ? curriculum : 'pb';
    const plan = previousWeeks(calendar, o.now || new Date());
    const months = new Map();
    const loadMonth = slug => {
      if (!months.has(slug)) {
        months.set(slug, fetchJson(`content/${curr}/${slug}/vocab.json`)
          .then(d => (d && Array.isArray(d.cards) ? d.cards : []))
          .catch(() => null));
      }
      return months.get(slug);
    };
    const pools = [];
    for (const week of plan.weeks) {
      const cards = await loadMonth(week.monthSlug);
      if (cards) pools.push({ weeksAgo: week.weeksAgo, cards: sliceForWeek(cards, week.weekNumber) });
    }
    let words = pickWords(pools, o.rng);
    if (words.length < RULES.rounds) {
      const cards = await loadMonth(plan.current.monthSlug);
      if (cards) words = pickWords(pools.concat([{ weeksAgo: 0, cards: sliceForWeek(cards, plan.current.weekNumber) }]), o.rng);
    }
    return words.length >= RULES.rounds ? words : [];
  }

  /* ── Save adapter (browser) ────────────────────────────────────────── */

  function saveApi() { return root.BoohaAdventure && root.BoohaAdventure.save; }

  function context(data, now) {
    const calendar = root.CALENDAR;
    let weekKey = '';
    let todayKey = '';
    try {
      const cw = calendar.getCurrentCurriculumWeek(now);
      weekKey = calendar.getCurriculumWeekOccurrenceKey ? calendar.getCurriculumWeekOccurrenceKey(cw) : cw.occurrenceKey;
      todayKey = calendar.getTodayKey(now);
    } catch (e) { /* weekKey stays '' — status then never unlocks */ }
    const skins = root.BoohaSkins;
    const blitzTriple = !!(skins && typeof skins.hasCurrentBlitzTriple === 'function' && skins.hasCurrentBlitzTriple(data));
    return { weekKey, todayKey, blitzTriple };
  }

  /** Load → mutate data.karasukiCards → save, in one step. */
  function transact(mutator) {
    const api = saveApi();
    if (!api) return { ok: false, error: 'noSave' };
    const data = api.load();
    const state = normalizeState(data.karasukiCards);
    const now = Date.now();
    const ctx = context(data, new Date(now));
    const expired = expireStale(state, ctx, now);
    const result = mutator(state, ctx, now, data);
    const before = JSON.stringify(data.karasukiCards || null);
    resolveHost(state, undefined);
    if (state.attempt) state.hostId = state.attempt.hostId;
    data.karasukiCards = state;
    if (JSON.stringify(state) !== before && !api.save(data)) {
      return { ok: false, error: 'saveFailed' };
    }
    return Object.assign({ expired }, result);
  }

  const KarasukiCards = Object.freeze({
    RULES, TIMING, PHASE,
    // pure
    defaultState, normalizeState, registry, getCard, isShipped, resolveHost,
    status, startAttempt, currentWord, submitAnswer, interruptRound, expireStale,
    checkAnswer, lookMs, typeMs, seededRng, pickWords, sliceForWeek,
    previousWeeks, loadSnapshotWords,
    // save-backed (current student)
    current() { return transact((s, ctx) => ({ ok: true, ...status(s, ctx) })); },
    start(words) { return transact((s, ctx, now) => startAttempt(s, ctx, words, now)); },
    answer(typed) { return transact((s, ctx, now) => submitAnswer(s, typed, now)); },
    interrupt() { return transact((s, ctx, now) => interruptRound(s, now)); },
    word() { return transact(s => ({ ok: true, word: currentWord(s) })); },
    wonCards() {
      const api = saveApi();
      const state = normalizeState(api ? api.load().karasukiCards : null);
      return registry().filter(c => state.won[c.id]).map(c => ({ ...c, ...state.won[c.id] }));
    },
  });

  root.KarasukiCards = KarasukiCards;
})(typeof window !== 'undefined' ? window : globalThis);
