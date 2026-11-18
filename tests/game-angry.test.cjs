#!/usr/bin/env node
'use strict';

// "Booha is angry! No sound." (js/game-angry.js): what trips it, that it
// silences effects but keeps the English voice on a cooldown, that honest
// play and typing never trip it, and that bail-outs carry to the next game.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SRC = read('js/game-angry.js');

function load({ game = 'say-word', store = {}, clock = { t: 1000 } } = {}) {
  const listeners = {};
  const doc = {
    documentElement: { classList: { add() {} } },
    head: { appendChild() {} },
    body: { appendChild() {} },
    createElement: () => ({ set textContent(v) {}, set innerHTML(v) {}, querySelector: () => ({ classList: { add() {}, remove() {} }, offsetWidth: 0 }), setAttribute() {}, classList: { add() {} } }),
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent() {},
  };
  const win = {
    location: { search: `?week=pb_nov_w3&game=${game}` },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    BOOHA_MEDIA: { audioRoot: 'https://audio.example/' },
    GAME_CONFIG: { audioBase: 'https://audio.example/nov/', sfxBase: '/sfx/' },
    addEventListener: (type, fn) => { (listeners['win:' + type] = listeners['win:' + type] || []).push(fn); },
    document: doc,
  };
  // A tiny run, like GAME_UTILS.createRun.
  win.GAME_UTILS = { createRun: () => ({ ready() {}, hit() {}, miss() {}, recover() {}, summary() { return {}; }, reset() {} }) };
  const RealDate = Date;
  const FakeDate = function () { return new RealDate(clock.t); };
  FakeDate.now = () => clock.t;
  const ctx = { window: win, document: doc, location: win.location, localStorage: win.localStorage, URLSearchParams, Intl, JSON, Math, Date: FakeDate, Promise, Error, console, setTimeout, CustomEvent: function () {} };
  win.window = win;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const tap = target => (listeners.pointerdown || []).forEach(fn => fn({ target }));
  const pagehide = () => (listeners['win:pagehide'] || []).forEach(fn => fn());
  return { A: win.BoohaAngry, U: win.GAME_UTILS, clock, store, tap, pagehide };
}
const button = { closest: sel => (/button/.test(sel) ? {} : null) };
const key = { closest: sel => (/\.bk-key/.test(sel) ? {} : /button/.test(sel) ? {} : null) };

// ── Mashing ───────────────────────────────────────────────────────────────
{
  const t = load();
  for (let i = 0; i < 9; i++) { t.clock.t += 400; t.tap(button); }
  assert.strictEqual(t.A.isAngry(), false, 'steady taps never trip it');
  for (let i = 0; i < 10; i++) { t.clock.t += 120; t.tap(button); }
  assert.strictEqual(t.A.isAngry(), true, '10 taps in 2.5 s trips it');
  assert.strictEqual(t.A.reason(), 'mashing');
}
{
  const t = load();
  for (let i = 0; i < 40; i++) { t.clock.t += 60; t.tap(key); }
  assert.strictEqual(t.A.isAngry(), false, "typing on Booha's keyboard never counts");
}
{
  const t = load({ game: 'spell-word' });
  for (let i = 0; i < 14; i++) { t.clock.t += 150; t.tap(button); }
  assert.strictEqual(t.A.isAngry(), false, 'tile games allow fast tile taps');
}

// ── Instant wrong answers ─────────────────────────────────────────────────
{
  const t = load();
  const run = t.U.createRun();
  for (let i = 0; i < 3; i++) { run.ready(); t.clock.t += 1200; run.miss(); }
  assert.strictEqual(t.A.isAngry(), false, 'wrong answers after reading time are honest mistakes');
  for (let i = 0; i < 3; i++) { run.ready(); t.clock.t += 200; run.miss(); }
  assert.strictEqual(t.A.reason(), 'instant wrong answers', '3 instant wrong answers trip it');
}
{
  const t = load({ game: 'vocab-speed' });
  const run = t.U.createRun();
  for (let i = 0; i < 4; i++) { run.ready(); t.clock.t += 300; run.miss(); }
  assert.strictEqual(t.A.isAngry(), false, 'speed games need 5 instant wrongs');
}

// ── The English voice: always on, never spammable ─────────────────────────
{
  const t = load();
  const v = 'https://audio.example/nov/a.mp3';
  t.A.voiceStart(v); t.A.voiceEnd(v);
  assert.strictEqual(t.A.voiceOk(v), true, 'no cooldown for players who are not silly');
  t.A.trip('test');
  assert.strictEqual(t.A.voiceOk('https://audio.example/nov/b.mp3'), true, 'a new question always plays');
  t.A.voiceStart(v);
  assert.strictEqual(t.A.voiceOk(v), false, 'no restarting while it plays');
  t.clock.t += 500; t.A.voiceEnd(v);
  t.clock.t += 2000;
  assert.strictEqual(t.A.voiceOk(v), false, 'a rest after it ends');
  t.clock.t += 1001;
  assert.strictEqual(t.A.voiceOk(v), true, 'then it can play again');
  assert.strictEqual(t.A.COOLDOWN_MS, 3000);
}

// ── Bail-outs carry to the next game, once ────────────────────────────────
{
  const store = {}, clock = { t: Date.UTC(2026, 10, 18, 3) };
  const t = load({ store, clock });
  for (let n = 0; n < 2; n++) {
    const run = t.U.createRun();
    for (let i = 0; i < 6; i++) { run.ready(); t.clock.t += 900; i === 0 ? run.hit() : run.miss(); }
    run.summary();
  }
  assert.strictEqual(t.A.isAngry(), false, 'bail-outs do not punish the run they ended');
  const next = load({ store, clock });
  assert.deepStrictEqual([next.A.isAngry(), next.A.reason()], [true, 'bail-outs'], 'the next game starts angry');
  assert.strictEqual(load({ store, clock }).A.isAngry(), false, 'and only that one');
}
{
  const store = {}, clock = { t: Date.UTC(2026, 10, 18, 3) };
  const t = load({ store, clock });
  for (let n = 0; n < 3; n++) {
    const run = t.U.createRun();
    for (let i = 0; i < 4; i++) { run.ready(); t.clock.t += 2400; run.miss(); }
    run.summary();
  }
  assert.strictEqual(load({ store, clock }).A.isAngry(), false, 'a slow, honest struggle is never a bail-out');
}
{
  const store = {}, clock = { t: Date.UTC(2026, 10, 18, 3) };
  const t = load({ store, clock });
  const r1 = t.U.createRun(); for (let i = 0; i < 3; i++) { r1.ready(); t.clock.t += 500; r1.miss(); } t.pagehide();
  const t2 = load({ store, clock });
  const r2 = t2.U.createRun(); for (let i = 0; i < 3; i++) { r2.ready(); t2.clock.t += 500; r2.miss(); } t2.pagehide();
  assert.strictEqual(load({ store, clock }).A.isAngry(), true, 'leaving early after silly answers counts too');
}

// ── Wiring and words ──────────────────────────────────────────────────────
const html = read('game.html');
const at = html.indexOf('js/game-angry.js');
assert.ok(at > html.indexOf('js/game-utils.js') && at > html.indexOf('js/game-pop.js') && at < html.indexOf('js/game-core.js'), 'game.html loads it after the sound code and before any game starts');
assert.ok(SRC.includes('Booha is angry! No sound.') && SRC.includes('ブーハーが おこってるよ！おとは なし。'), 'the badge words, English and Japanese');
assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(SRC.slice(SRC.indexOf("el.innerHTML = '<span>Booha"), SRC.indexOf("bar = el.querySelector"))), 'no emoji on the badge');
assert.match(SRC, /if \(angry\) this\.muted = true;/, 'effect clips go quiet');
const poo = read('games/poopika.js');
assert.match(poo, /out\.__boohaVoice = true;/, "Poopika's Web Audio voice is marked as voice");
assert.match(poo, /if \(!auto && A && !A\.voiceOk\(card\.mp3\)\) return;/, 'a tapped Poopika replay waits out the cooldown');

console.log('Booha is angry passed: mashing, instant wrongs and bail-outs trip it; honest play, typing and tile taps do not; effects go silent; the English voice stays on with a 3 s cooldown.');
