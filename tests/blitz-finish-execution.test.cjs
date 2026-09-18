#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'blitz-engine.js'), 'utf8');
const start = source.indexOf('      function showWin(ms) {');
const end = source.indexOf('      const cleanupAndClose', start);
assert(start >= 0 && end > start, 'showWin() must remain present in the shared engine');
const showWinSource = source.slice(start, end).trim();

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  toggle(name, force) {
    const next = force === undefined ? !this.values.has(name) : Boolean(force);
    if (next) this.values.add(name); else this.values.delete(name);
    return next;
  }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor() {
    this.classList = new FakeClassList();
    this.style = { setProperty: (name, value) => { this.style[name] = value; } };
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.attributes = {};
    this.children = {};
  }
  querySelector(selector) { return this.children[selector] || null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
}

function makeFinishDom() {
  const winScreen = new FakeElement();
  for (const key of ['winName', 'winScream', 'winJp', 'winTime', 'winRecord', 'winBest', 'winDelta', 'playAgain', 'winClose']) {
    winScreen.children[key] = new FakeElement();
  }
  return {
    winScreen,
    overlay: new FakeElement(),
    finalCard: {
      streak: new FakeElement(),
      headline: new FakeElement(),
      residual: new FakeElement(),
      perfect: new FakeElement(),
      hold: new FakeElement(),
    },
  };
}

function runFinish({ perfect = true, isRecord = false, dispatchError = false } = {}) {
  const dom = makeFinishDom();
  const events = [];
  let saveCalls = 0;
  const context = {
    console: { ...console, error: () => {} },
    performance: { now: () => 1234 },
    current: perfect ? 2 : 1,
    initialQueueLength: 2,
    speedTarget: { bestMs: 900, targetMs: 1200 },
    streak: perfect ? 2 : 1,
    bestStreak: perfect ? 2 : 1,
    mistakeCount: perfect ? 0 : 1,
    feedbackState: 'playing',
    runIsActive: true,
    climaxTimer: null,
    runEpoch: 1,
    REDUCED_MOTION: false,
    visibilityPaused: false,
    monthSlug: 'january',
    weekNumber: 1,
    curr: 'pb',
    overlay: dom.overlay,
    winScreen: dom.winScreen,
    finalCard: dom.finalCard,
    FINAL_CARD_HOLD_MS: 4000,
    palette: {
      name: 'Pre-Boo', accent: '#ff6fb5', glow: 'rgba(255,111,181,.62)', timerColor: '#fff0a8',
      rewardColors: ['#fffbe1', '#ffe27a'], rewardGlow: 'rgba(255,184,72,.72)', streak: { label: 'STREAK' },
    },
    config: {
      apiName: 'Test Blitz', gameType: 'vocab', legacyKey: 'blitzVocab', saveId: 'vocab',
      winCopy: { record: 'RECORD', clear: 'CLEAR', jp: 'クリア!' },
    },
    selector: key => key,
    makeWeekId: () => 'test-week',
    saveBestTime: () => { saveCalls++; return { isWeeklyRecord: false, isAllTimeRecord: isRecord, oldRecord: isRecord ? null : { ms: 900 }, saveFailed: false }; },
    getBestScore: () => ({ ms: 900, name: 'PLAYER' }),
    getWeeklyScore: () => ({ ms: 900 }),
    getPlayerName: () => 'PLAYER',
    escapeHtml: value => String(value),
    progressColorFor: () => ({ css: '#ff6fb5', lightness: 54 }),
    fmtTime: ms => `${(ms / 1000).toFixed(2)}s`,
    speedBandFor: (ms, targetMs) => ms <= targetMs * 0.75 ? 'elite' : ms <= targetMs ? 'target' : 'clear',
    document: { dispatchEvent: event => { events.push(event); if (dispatchError) throw new Error('listener failure'); } },
    CustomEvent: function CustomEvent(type, init) { return { type, ...init }; },
    setTimeout: () => 1,
    clearTimeout: () => {},
    emitPerfectFlash: () => {}, emitFinishFlash: () => {}, playFinalStinger: () => {}, startFinalHold: () => {}, celebrate: () => {},
  };
  context.spotlight = { playerName: 'PLAYER', nameplate: new FakeElement(), announce: () => {} };

  const showWin = vm.runInNewContext(`(${showWinSource})`, context);
  assert.doesNotThrow(() => showWin(1234), 'showWin() must not throw');
  return { dom, events, saveCalls };
}

const perfect = runFinish();
assert(perfect.dom.winScreen.classList.contains('show'), 'perfect finish screen must be visible');
assert.strictEqual(perfect.dom.winScreen.children.winRecord.textContent, '',
  'a non-record clear must not show the NEW BEST TIME header');
assert.strictEqual(perfect.events.length, 1, 'perfect run must emit one completion event');
assert.strictEqual(perfect.events[0].detail.completed, true);
assert.strictEqual(perfect.events[0].detail.mistakes, 0);
assert.strictEqual(perfect.saveCalls, 1, 'perfect run must save its PB');

const record = runFinish({ isRecord: true });
assert.match(record.dom.winScreen.children.winRecord.innerHTML, /NEW.*BEST.*TIME/);

const failed = runFinish({ perfect: false });
assert(!failed.dom.winScreen.classList.contains('show'), 'failed run must not show a completion card');
assert.strictEqual(failed.events.length, 0, 'failed run must not emit completion');
assert.strictEqual(failed.saveCalls, 0, 'failed run must not save a PB');

const fallback = runFinish({ dispatchError: true });
for (const key of ['playAgain', 'winClose']) {
  assert.strictEqual(fallback.dom.winScreen.children[key].disabled, false,
    `finish fallback must leave ${key} enabled`);
}

console.log('Blitz finish execution test passed: perfect, record, failed, and fallback paths are safe.');
