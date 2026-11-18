/* ══════════════════════════════════════════════════════════════
   game-angry.js — "Booha is angry! No sound."

   A few students mash buttons or bail out of games to make noise in
   class. When a run looks like that, Booha gets angry: every sound
   effect and all music go silent for the rest of the game, and a badge
   says why. The English audio keeps working (it is the lesson), but the
   same clip cannot be replayed until 3 seconds after it ends, so it
   cannot be used to make noise either. Honest players never see this.

   What makes Booha angry (one of these is enough):
     • Instant wrong answers: 3 wrong answers each given within 0.7 s of
       the question appearing (speed games: 5 within 0.35 s).
     • Mashing: 10 taps on buttons within 2.5 s (tile and pair games: 16).
       Booha's keyboard and drawing pads never count.
     • Bail-outs: twice in one day, a run ended or abandoned with almost
       nothing right at no-reading speed (≤ 20% first-try, typical answer
       under 1.5 s). The next game starts angry. Counted per student
       (booha_userid), never across a shared iPad.

   How the silence works: on the game page every Web Audio sound reaches
   the speakers through one effects bus, and this file turns that bus
   down. Plain <audio> clips are effects unless they come from the
   curriculum audio host (the English voice). Nothing in the nine games
   or the extras needed to change, except Poopika's own Web Audio voice,
   which marks itself as voice.

   Loaded by game.html after game-utils.js and game-pop.js, before
   game-core.js. Exposes window.BoohaAngry.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.BoohaAngry) return;

  const COOLDOWN_MS = 3000;
  const FAST = { ms: 700, count: 3 };
  const FAST_SPEED = { ms: 350, count: 5 };
  const MASH = { taps: 10, windowMs: 2500 };
  const MASH_TILES = { taps: 16, windowMs: 2500 };
  const BAIL = { firstTry: 0.2, medianMs: 1500, perDay: 2, minAnswers: 2 };
  const SPEED_GAMES = ['vocab-speed', 'sentence-speed'];
  const TILE_GAMES = ['spell-word', 'sentence-order', 'vocab-tap', 'sentence-tap'];
  const BAIL_KEY = 'booha-angry-bails';
  const LOG_KEY = 'booha-angry-log';

  const game = (() => { try { return new URLSearchParams(location.search).get('game') || ''; } catch (_) { return ''; } })();
  const week = (() => { try { return new URLSearchParams(location.search).get('week') || ''; } catch (_) { return ''; } })();
  let angry = false, reason = '';

  function tokyoDay() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date()); }
    catch (_) { return new Date().toISOString().slice(0, 10); }
  }
  // Per student: classroom iPads are shared, so one student's bail-outs must
  // never mute the next student. Keys are <base>:<booha_userid>; with no
  // signed-in student nothing is read or written (no shared fallback).
  function studentKey(base) {
    let uid = '';
    try { uid = localStorage.getItem('booha_userid') || ''; } catch (_) {}
    return uid ? `${base}:${uid}` : null;
  }
  function readJSON(base, fallback) {
    const key = studentKey(base);
    if (!key) return fallback;
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (_) { return fallback; }
  }
  function writeJSON(base, value) {
    const key = studentKey(base);
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  /* ── The effects bus: every Web Audio sound goes through it ─────────── */
  const buses = new WeakMap();
  const AN = window.AudioNode;
  const origConnect = AN && AN.prototype.connect;
  function busFor(ctx) {
    let bus = buses.get(ctx);
    if (!bus) {
      bus = ctx.createGain();
      bus.__boohaBus = true;
      bus.gain.value = angry ? 0 : 1;
      origConnect.call(bus, ctx.destination);
      buses.set(ctx, bus);
      busList.push(bus);
    }
    return bus;
  }
  const busList = [];
  if (origConnect) {
    AN.prototype.connect = function (dest) {
      if (dest && dest.context && dest === dest.context.destination && !this.__boohaVoice && !this.__boohaBus) {
        const args = Array.prototype.slice.call(arguments, 1);
        origConnect.apply(this, [busFor(dest.context)].concat(args));
        return dest;
      }
      return origConnect.apply(this, arguments);
    };
  }

  /* ── <audio> clips: voice keeps playing (with a cooldown), effects go quiet ── */
  // The English voice is anything served from the curriculum audio host
  // (the host of GAME_CONFIG.audioBase); sound effects come from this site.
  function voiceHost() {
    const base = window.GAME_CONFIG && GAME_CONFIG.audioBase;
    if (!base) return '';
    try { return new URL(base, location.href).origin + '/'; } catch (_) { return ''; }
  }
  function isVoiceSrc(src) {
    const host = voiceHost();
    return !!src && !!host && host !== (location.origin + '/') && String(src).indexOf(host) === 0;
  }
  const voice = { key: '', playing: 0, endedAt: 0 };
  function voiceOk(key) {
    if (!angry) return true;
    if (key !== voice.key) return true;                       // a new question always plays
    if (voice.playing) return false;                          // no restarting mid-clip
    return Date.now() - voice.endedAt >= COOLDOWN_MS;         // and a rest after it ends
  }
  function voiceStart(key) { voice.key = key; voice.playing++; }
  function voiceEnd(key) {
    if (key === voice.key && voice.playing > 0) voice.playing--;
    if (key === voice.key && !voice.playing) { voice.endedAt = Date.now(); if (angry) Badge.cool(); }
  }
  const quietEls = [];
  const HME = window.HTMLMediaElement;
  const origPlay = HME && HME.prototype.play;
  if (origPlay) {
    HME.prototype.play = function () {
      const src = this.currentSrc || this.src || '';
      if (isVoiceSrc(src)) {
        if (!voiceOk(src)) {
          return Promise.reject(typeof DOMException === 'function' ? new DOMException('Booha is angry', 'NotAllowedError') : new Error('Booha is angry'));
        }
        if (!this.__boohaTracked) {
          this.__boohaTracked = true;
          let on = false;
          const stop = () => { if (on) { on = false; voiceEnd(this.__boohaKey); } };
          this.addEventListener('playing', () => { if (!on) { on = true; voiceStart(this.__boohaKey); } });
          this.addEventListener('ended', stop);
          this.addEventListener('pause', stop);
          this.addEventListener('error', stop);
        }
        this.__boohaKey = src;
        voice.key = src;
      } else {
        if (angry) this.muted = true;
        quietEls.push(this);
        if (quietEls.length > 40) quietEls.shift();
      }
      return origPlay.apply(this, arguments);
    };
  }

  /* ── The badge ──────────────────────────────────────────────────────── */
  const Badge = (function () {
    let el = null, bar = null;
    function make() {
      if (el) return;
      const css = document.createElement('style');
      css.textContent = `
.booha-angry{position:fixed;z-index:9400;top:calc(env(safe-area-inset-top,0px) + 66px);right:10px;max-width:min(300px,calc(100vw - 20px));
  padding:8px 12px 9px;border-radius:14px;background:#7a1d12;border:2px solid #ff8a5c;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.35);
  font:900 14px/1.25 var(--game-font-body,system-ui,sans-serif);text-align:left;pointer-events:none;animation:boohaAngryIn .45s cubic-bezier(.3,1.6,.5,1) both}
.booha-angry span{display:block}
.booha-angry .jp{margin-top:2px;font-size:12px;font-weight:700;opacity:.92}
.booha-angry i{display:block;height:4px;margin-top:6px;border-radius:2px;background:rgba(255,255,255,.18);overflow:hidden}
.booha-angry i b{display:block;height:100%;width:0;background:#ffd2bd;border-radius:2px}
.booha-angry i b.run{animation:boohaAngryCool ${COOLDOWN_MS}ms linear forwards}
@keyframes boohaAngryIn{0%{transform:scale(.4) rotate(-8deg);opacity:0}60%{transform:scale(1.08) rotate(2deg);opacity:1}100%{transform:none}}
@keyframes boohaAngryCool{from{width:100%}to{width:0}}
@media (prefers-reduced-motion:reduce){.booha-angry{animation:none}}`;
      document.head.appendChild(css);
      el = document.createElement('div');
      el.className = 'booha-angry';
      el.setAttribute('role', 'status');
      el.innerHTML = '<span>Booha is angry! No sound.</span><span class="jp">ブーハーが おこってるよ！おとは なし。</span><i aria-hidden="true"><b></b></i>';
      bar = el.querySelector('i b');
      document.body.appendChild(el);
    }
    return {
      show() { if (document.body) make(); else document.addEventListener('DOMContentLoaded', make, { once: true }); },
      cool() { if (!bar) return; bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); },
    };
  })();

  /* ── Getting angry ──────────────────────────────────────────────────── */
  function trip(why) {
    if (angry) return false;
    angry = true; reason = why;
    busList.forEach(bus => { try { bus.gain.setTargetAtTime(0, bus.context.currentTime, 0.02); } catch (_) { bus.gain.value = 0; } });
    quietEls.forEach(a => { try { a.muted = true; } catch (_) {} });
    document.documentElement.classList.add('booha-angry-on');
    Badge.show();
    const log = readJSON(LOG_KEY, []);
    log.push({ at: Date.now(), day: tokyoDay(), game, week, reason: why });
    writeJSON(LOG_KEY, log.slice(-30));
    try { document.dispatchEvent(new CustomEvent('booha:angry', { detail: { reason: why, game } })); } catch (_) {}
    return true;
  }

  // Bail-outs earlier today: this game starts angry.
  (function startAngryAfterBails() {
    const b = readJSON(BAIL_KEY, null);
    if (b && b.day === tokyoDay() && b.count >= BAIL.perDay && !b.applied) {
      b.applied = true; writeJSON(BAIL_KEY, b);
      trip('bail-outs');
    }
  })();
  function recordBail() {
    const day = tokyoDay();
    let b = readJSON(BAIL_KEY, null);
    if (!b || b.day !== day || b.applied) b = { day, count: 0 };
    b.count++;
    writeJSON(BAIL_KEY, b);
  }

  /* ── Watching the run ───────────────────────────────────────────────── */
  const isSpeed = SPEED_GAMES.includes(game);
  const fastRule = isSpeed ? FAST_SPEED : FAST;
  const runs = [];
  function watchRun(run) {
    const w = { readyAt: 0, card: null, answered: 0, firstTry: 0, times: [], fastWrong: 0, finished: false };
    runs.push(w);
    const wrap = (name, fn) => {
      const orig = run[name];
      if (typeof orig !== 'function') return;
      run[name] = function () { try { fn.apply(null, arguments); } catch (_) {} return orig.apply(run, arguments); };
    };
    const first = () => {
      if (!w.card) w.card = { acted: false, missed: false };
      if (w.card.acted) return false;
      w.card.acted = true; w.answered++;
      if (w.readyAt) w.times.push(Date.now() - w.readyAt);
      return true;
    };
    wrap('ready', () => { w.readyAt = Date.now(); w.card = { acted: false, missed: false }; });
    wrap('hit', () => { const f = first(); if (f && !w.card.missed) w.firstTry++; });
    wrap('miss', () => {
      first();
      w.card.missed = true;
      if (w.readyAt && Date.now() - w.readyAt < fastRule.ms && ++w.fastWrong >= fastRule.count) trip('instant wrong answers');
    });
    wrap('recover', () => { first(); });
    wrap('summary', () => {
      if (w.finished) return;
      w.finished = true;
      if (silly(w)) recordBail();
    });
    wrap('reset', () => { w.readyAt = 0; w.card = null; w.answered = 0; w.firstTry = 0; w.times = []; w.fastWrong = 0; w.finished = false; });
    return run;
  }
  function median(a) { if (!a.length) return Infinity; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
  function silly(w) {
    if (w.answered < BAIL.minAnswers) return false;
    return w.firstTry / w.answered <= BAIL.firstTry && median(w.times) < BAIL.medianMs;
  }
  window.addEventListener('pagehide', () => {
    runs.forEach(w => { if (!w.finished && silly(w)) { w.finished = true; recordBail(); } });
  });
  const U = window.GAME_UTILS;
  if (U && typeof U.createRun === 'function' && !U.createRun.__boohaWatched) {
    const origCreate = U.createRun;
    U.createRun = function () { return watchRun(origCreate.apply(U, arguments)); };
    U.createRun.__boohaWatched = true;
  }

  /* ── Mashing ────────────────────────────────────────────────────────── */
  const mashRule = TILE_GAMES.includes(game) ? MASH_TILES : MASH;
  const taps = [];
  document.addEventListener('pointerdown', event => {
    if (angry) return;
    const t = event.target;
    if (!t || !t.closest) return;
    if (t.closest('.bk-key, canvas, .booha-angry')) return;      // typing and drawing never count
    if (!t.closest('button, [role="button"]')) return;
    const now = Date.now();
    taps.push(now);
    while (taps.length && now - taps[0] > mashRule.windowMs) taps.shift();
    if (taps.length >= mashRule.taps) trip('mashing');
  }, { capture: true, passive: true });

  window.BoohaAngry = {
    isAngry: () => angry,
    reason: () => reason,
    trip,
    voiceOk, voiceStart, voiceEnd,
    COOLDOWN_MS,
    rules: { FAST, FAST_SPEED, MASH, MASH_TILES, BAIL },
  };
})();
