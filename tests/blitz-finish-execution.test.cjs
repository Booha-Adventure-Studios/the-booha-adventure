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

// Execute the production showWin() body with a small DOM double. This keeps
// the regression test dependency-free while still exercising the finish
// branches and their DOM writes, rather than checking source text only.
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
    this.style = {
      setProperty: (name, value) => { this.style[name] = value; },
      removeProperty: name => { delete this.style[name]; },
    };
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

function runFinish({ recordEligible, isRecord, dispatchError = false }) {
  const dom = makeFinishDom();
  const events = [];
  const testConsole = { ...console, error: () => {} };
  const context = {
    console: testConsole,
    performance: { now: () => 1234 },
    queue: [{ n: 1 }, { n: 2 }],
    initialQueueLength: 2,
    bestStreak: 2,
    mistakeCount: recordEligible ? 0 : 3,
    CLEAN_CLEAR_MAX_MISTAKES: 2,
    runEligibleForRecord: recordEligible,
    runIsActive: true,
    visibilityPaused: false,
    monthSlug: 'january',
    weekNumber: 1,
    curr: 'pb',
    overlay: dom.overlay,
    winScreen: dom.winScreen,
    finalCard: dom.finalCard,
    FINAL_CARD_HOLD_MS: 4000,
    palette: {
      name: 'Pre-Boo',
      accent: '#ff6fb5',
      glow: 'rgba(255,111,181,.62)',
      timerColor: '#fff0a8',
      rewardColors: ['#fffbe1', '#ffe27a'],
      rewardGlow: 'rgba(255,184,72,.72)',
      streak: { label: 'STREAK' },
    },
    config: {
      apiName: 'Test Blitz',
      gameType: 'vocab',
      legacyKey: 'blitzVocab',
      saveId: 'vocab',
      winCopy: { record: 'RECORD', clear: 'CLEAR', jp: 'クリア!' },
    },
    selector: key => key,
    makeWeekId: () => 'test-week',
    saveBestTime: () => ({
      isWeeklyRecord: false,
      isAllTimeRecord: isRecord,
      oldRecord: isRecord ? null : { ms: 900 },
      saveFailed: false,
    }),
    getBestScore: () => ({ ms: 900, name: 'PLAYER' }),
    getWeeklyScore: () => ({ ms: 900 }),
    getPlayerName: () => 'PLAYER',
    fmtTime: ms => `${(ms / 1000).toFixed(2)}s`,
    document: {
      dispatchEvent: event => {
        events.push(event);
        if (dispatchError) throw new Error('listener failure');
      },
    },
    CustomEvent: function CustomEvent(type, init) { return { type, ...init }; },
    emitPerfectFlash: () => {},
    emitFinishFlash: () => {},
    playFinalStinger: () => {},
    startFinalHold: () => {},
    celebrate: () => {},
  };
  context.spotlight = {
    playerName: 'PLAYER',
    nameplate: new FakeElement(),
    announce: () => {},
  };

  const showWin = vm.runInNewContext(`(${showWinSource})`, context);
  assert.doesNotThrow(() => showWin(1234), 'showWin() must not throw for any finish outcome');
  assert(dom.winScreen.classList.contains('show'), 'finish screen must be visible');
  assert(dom.winScreen.children.winRecord.textContent, 'finish result must have non-empty text');
  assert.strictEqual(dom.winScreen.children.winTime.textContent, '1.23s');
  return { dom, events };
}

const record = runFinish({ recordEligible: true, isRecord: true });
assert.match(record.dom.winScreen.children.winRecord.textContent, /NEW BOOHA RECORD/);

const ordinary = runFinish({ recordEligible: true, isRecord: false });
assert.strictEqual(ordinary.dom.winScreen.children.winRecord.textContent, 'PERFECT CLEAR');

const mastery = runFinish({ recordEligible: false, isRecord: false });
assert.strictEqual(mastery.dom.winScreen.children.winRecord.textContent, 'MASTERY CLEAR · NO RECORD');
assert.strictEqual(mastery.events[0].detail.recordEligible, false);

const fallback = runFinish({ recordEligible: true, isRecord: false, dispatchError: true });
for (const key of ['playAgain', 'winClose']) {
  assert.strictEqual(fallback.dom.winScreen.children[key].disabled, false,
    `finish fallback must leave ${key} enabled`);
}

console.log('Blitz finish execution test passed: record, ordinary, mastery, and fallback finishes render safely.');
