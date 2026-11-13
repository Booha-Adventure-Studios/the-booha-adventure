#!/usr/bin/env node
'use strict';

// Label pass (2026-11-08): reward labels explain themselves where they appear.
//  · Score card: "Sharp" is hidden at 0 and, when earned, bilingual with its
//    meaning (fast correct answers, +25 points each).
//  · Daily Check streak: the seasonal candy/gift count always says it is the
//    check-in streak, worded the same on the result and the opening stamp.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 1. Score-card chips ──
{
  const sandbox = { window: {}, document: {}, console };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(read('js/game-scorecard.js'), sandbox);
  // Copy out of the vm realm so deepStrictEqual compares plain arrays.
  const chips = (run, crown) => JSON.parse(JSON.stringify(sandbox.window.BoohaScorecard.runChips(run, crown)));
  const texts = (run, crown) => chips(run, crown).map(c => c.text);

  assert.deepStrictEqual(texts({ maxCombo: 4, sharp: 0 }), ['Best combo 4'], 'no Sharp chip at 0');
  assert.deepStrictEqual(texts({ maxCombo: 4 }), ['Best combo 4'], 'no Sharp chip when missing');
  const one = chips({ maxCombo: 2, sharp: 1 }).find(c => /Sharp/.test(c.text));
  assert.strictEqual(one.text, 'はやい ×1 · Sharp', 'bilingual Sharp chip');
  assert.match(one.aria, /1 fast correct answer, \+25 points each/, 'singular, with its meaning');
  const three = chips({ maxCombo: 9, sharp: 3 }, true);
  assert.deepStrictEqual(three.map(c => c.text), ['Best combo 9', 'はやい ×3 · Sharp', '♛ Crown']);
  assert.match(three[1].aria, /3 fast correct answers, \+25 points each\. はやく せいかい 3かい/);
  assert(!/'Sharp ' \+ run\.sharp/.test(read('js/game-scorecard.js')), 'the old bare "Sharp N" label is gone');
  // The +25 in the label must match the real rule.
  assert.match(read('js/game-utils.js'), /\(sharp \? 25 : 0\)/, 'Sharp is still worth 25 points');
}

// ── 2. Daily Check streak label ──
{
  const ctx = {
    window: {}, console,
    document: { addEventListener() {}, dispatchEvent() {}, documentElement: { dataset: { season: 'christmas' } } },
    CustomEvent: function () {}, setTimeout: fn => fn(),
  };
  ctx.window = ctx;
  vm.runInNewContext(read('js/core/media-config.js'), ctx); // pages load media-config.js first
  vm.runInNewContext(read('js/daily-check.js'), ctx);
  const label = ctx.BoohaDailyCheck.streakLabel;
  assert.strictEqual(label(1), 'チェックれんぞく · ギフト 1個', 'uses the page season by default');
  assert.strictEqual(label(3, 'halloween'), 'チェックれんぞく · キャンディ 3個');
  assert.strictEqual(label(5, 'christmas'), 'チェックれんぞく · ギフト 5個');
  assert.strictEqual(label(2, ''), 'チェックれんぞく ✓ 2日');
  assert.strictEqual(label(-1, ''), 'チェックれんぞく ✓ 0日');

  // Both screens use the helper; no hand-built seasonal counts remain.
  const dc = read('js/daily-check.js');
  const html = read('index.html');
  assert.match(dc, /streakEl\.textContent = streakLabel\(st\);/, 'Daily Check result uses streakLabel');
  assert.match(html, /stamp\.textContent = BoohaDailyCheck\.streakLabel\(count\);/, 'opening stamp uses streakLabel');
  for (const [src, name] of [[dc, 'daily-check.js'], [html, 'index.html']]) {
    assert(!/`ギフト \$\{|'ギフト ' \+|`キャンディ \$\{|'キャンディ ' \+|'❄ ' \+/.test(src.replace(/function streakLabel[\s\S]*?\n  \}\n/, '')),
      `${name}: no seasonal streak text outside streakLabel`);
  }
}

console.log('Labels pass audit passed: Sharp hidden at 0 and explained; one streak label on the result and the stamp.');
