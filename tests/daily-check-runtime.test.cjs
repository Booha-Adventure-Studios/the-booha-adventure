#!/usr/bin/env node
'use strict';

// Run the actual Daily Check module with a deliberately small DOM shim. This
// covers content loading, deterministic day construction, the full tap path,
// and the save/completion boundary without requiring a browser dependency.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/daily-check.js'), 'utf8');

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this.className = '';
    this.dataset = {};
    this.style = {
      cssText: '',
      setProperty() {},
    };
    this.attributes = {};
    this._textContent = '';
  }

  set textContent(value) {
    this._textContent = String(value ?? '');
    this.children = [];
  }

  get textContent() { return this._textContent; }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }

  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }

  click() {
    for (const handler of this.listeners.click || []) handler({
      clientX: 0,
      clientY: 0,
      target: this,
    });
  }

  get classList() {
    const names = () => new Set(String(this.className || '').split(/\s+/).filter(Boolean));
    const write = set => { this.className = [...set].join(' '); };
    return {
      add: (...items) => { const set = names(); items.forEach(item => set.add(item)); write(set); },
      remove: (...items) => { const set = names(); items.forEach(item => set.delete(item)); write(set); },
      toggle: (item, force) => {
        const set = names();
        const next = force === undefined ? !set.has(item) : Boolean(force);
        if (next) set.add(item); else set.delete(item);
        write(set);
        return next;
      },
      contains: item => names().has(item),
    };
  }

  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }

  animate() { return { onfinish: null }; }
}

class FakeAudio extends FakeElement {
  constructor() {
    super('audio');
    this.paused = true;
    this.currentTime = 0;
    this.src = '';
  }

  pause() { this.paused = true; }
  play() { this.paused = false; return Promise.resolve(); }
}

function makeStorage() {
  const values = new Map([['booha_last_curr', 'pb']]);
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

function makeCards(prefix) {
  return Array.from({ length: 15 }, (_, index) => ({
    n: index + 1,
    en: `${prefix} answer ${index + 1}`,
    jp: `${prefix} 日本語 ${index + 1}`,
    hira: `${prefix} ひらがな ${index + 1}`,
    mp3: `${prefix}-${index + 1}.mp3`,
  }));
}

const save = {
  meta: { checkIn: {} },
};
let checkpointCount = 0;
const saveFile = {
  load() { return save; },
  patch(section, patch) {
    save[section] = Object.assign(save[section] || {}, patch);
    return true;
  },
};

const body = new FakeElement('body');
const head = new FakeElement('head');
const documentElement = new FakeElement('html');
documentElement.dataset.season = 'default';
const document = {
  body,
  head,
  documentElement,
  createElement(tagName) { return tagName === 'audio' ? new FakeAudio() : new FakeElement(tagName); },
  getElementById() { return null; },
  dispatchEvent() {},
};

const contentResponses = new Map();
for (const type of ['vocab', 'sentences', 'questions']) {
  contentResponses.set(`content/pb/september/${type}.json`, {
    ok: true,
    async json() { return { cards: makeCards(type) }; },
  });
}

function findDescendant(root, predicate) {
  for (const child of root.children) {
    if (predicate(child)) return child;
    const nested = findDescendant(child, predicate);
    if (nested) return nested;
  }
  return null;
}

const context = {
  console,
  Date,
  document,
  localStorage: makeStorage(),
  fetch(url) {
    const response = contentResponses.get(url);
    if (!response) return Promise.reject(new Error(`unexpected fetch: ${url}`));
    return Promise.resolve(response);
  },
  setTimeout(callback) { callback(); return 1; },
  clearTimeout() {},
  requestAnimationFrame(callback) { callback(); },
  Audio: FakeAudio,
  CustomEvent: class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  },
  window: {},
  CALENDAR: {
    getTodayKey() { return '2026-09-25'; },
    getCurrentCurriculumWeek() {
      return { monthSlug: 'september', weekNumber: 1, weekId: 'september-w1', weekStart: '2026-09-20' };
    },
  },
  BoohaSaveFile: saveFile,
  BoohaSync: { checkpoint() { checkpointCount++; } },
};
context.window = context;
context.window.BoohaSaveFile = saveFile;
context.window.BoohaSync = context.BoohaSync;
context.window.Audio = FakeAudio;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'js/daily-check.js' });
const daily = context.window.BoohaDailyCheck;

(async () => {
  const content = await daily.loadContent('pb');
  assert.strictEqual(content.sets.vocab.length, 15);
  assert.strictEqual(content.sets.sentences.length, 15);
  assert.strictEqual(content.sets.questions.length, 15);

  const day = daily.buildDay(content);
  assert.deepStrictEqual(Object.fromEntries(Object.entries(day.picks).map(([key, items]) => [key, items.length])), {
    vocab: 5, sentences: 5, questions: 5,
  });
  assert.strictEqual(day.quiz.length, 5);
  assert.ok(day.quiz.every(question => question.choices.length === 4));

  assert.strictEqual(daily.markSkip('pb'), true);
  assert.strictEqual(daily.todaySummary().st, 'skip');
  assert.strictEqual(daily.markDone(80, 'pb'), true);
  assert.deepStrictEqual({ ...daily.todaySummary() }, {
    key: '2026-09-25', st: 'done', done: true, first: 80, best: 80,
    attempts: 1, hasRetakes: false, curr: 'pb',
  });
  assert.strictEqual(daily.markDone(100, 'pb'), true);
  assert.strictEqual(daily.todaySummary().best, 100);
  assert.strictEqual(daily.todaySummary().attempts, 2);
  assert.strictEqual(daily.streak(), 1);

  let completionPct = null;
  daily.run({
    curr: 'pb',
    recordSkipOnCancel: false,
    onDone(pct) { completionPct = pct; },
  });
  await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));

  const root = body.children.find(child => child.className.includes('dc-root'));
  assert.ok(root, 'Daily Check runner must mount its real overlay');

  // Five cards in each of the three review sections.
  for (let i = 0; i < 15; i += 1) {
    const next = root.children.find(child => child.classList.contains('dc-btn'));
    assert.ok(next, `review card ${i + 1} must expose a next button; children: ${root.children.map(child => child.className).join(',')}`);
    next.click();
  }

  // The five quiz choices advance through the real timer callback (immediate
  // in this harness), regardless of whether the first choice is correct.
  for (let i = 0; i < 5; i += 1) {
    const choice = findDescendant(root, child => child.classList.contains('dc-choice'));
    assert.ok(choice, `quiz question ${i + 1} must expose choices; children: ${root.children.map(child => child.className).join(',')}`);
    choice.click();
  }

  const finish = root.children.find(child => child.classList.contains('dc-btn'));
  assert.ok(finish, 'completed quiz must expose its completion button');
  finish.click();
  assert.strictEqual(typeof completionPct, 'number');
  assert.strictEqual(daily.todaySummary().attempts, 3);
  assert.ok(checkpointCount >= 3, 'Daily Check completion and retakes must checkpoint Adventure sync');

  console.log('Daily Check runtime passed: content loading, day construction, skip/first-attempt/retake records, full 15-card runner, five-question quiz, completion, and sync checkpoint hold.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
