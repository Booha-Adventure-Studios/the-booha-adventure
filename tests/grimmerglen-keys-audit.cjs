#!/usr/bin/env node
'use strict';
/*
 * Grimmerglen Pass G2 — Marietta's typing uses the shared on-screen keyboard
 * (js/booha-keys.js) instead of the iPad keyboard. Checks grading (commas
 * and capitals never matter), display capitals ("I", names from the
 * answer), the keyboard set-up (apostrophe + comma, hold-to-delete, Check),
 * the dock and panel inset, and that the keys leave with the panel.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const typing = read('js/grimmerglen-typing.js');
const runtime = read('js/grimmerglen.js');
const html = read('grimmerglen.html');

/* Load the typing engine and the Grimmerglen data in a stub page */
const stubEl = () => ({ style: {}, setAttribute() {}, appendChild() {} });
const document = { getElementById: () => null, createElement: stubEl, head: { appendChild() {} }, documentElement: { style: { setProperty() {} }, getAttribute: () => null } };
const window = { document };
const ctx = vm.createContext({ window, document, setTimeout, clearTimeout, setInterval, clearInterval, console });
vm.runInContext(read('js/grimmerglen-data.js'), ctx);
vm.runInContext(typing, ctx);
const T = window.GrimmerglenTyping;
const D = window.GRIMMERGLEN_DATA;

/* Grading: commas and capitals never matter; terminal punctuation neither */
assert.strictEqual(T.normalizeAnswer('I gave October the book, hoping'), T.normalizeAnswer('i gave october the book hoping'));
assert.ok(T.matchesAny('I hugged my teddy bear whenever the night felt spooky although I heard Gorogui outside',
  ['I hugged my teddy bear whenever the night felt spooky, although I heard Gorogui outside']), 'a missing comma is still right');
assert.ok(T.matchesAny("Im happy", ["i'm happy"]), 'apostrophes still optional');
assert.ok(!T.matchesAny('i am happy', ["i'm happy"]));

/* Every memory answer can be typed on these keys: letters, space, ' and , */
const answers = [];
(function walk(o) {
  if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'accepted' && Array.isArray(v)) answers.push(...v); else walk(v); }
})(D);
assert.ok(answers.length >= 40, `found the memory answers (${answers.length})`);
for (const a of answers) assert.ok(/^[A-Za-z ',’]+$/.test(a.replace(/[.!?]+$/, '')), `typeable on the keyboard: ${a}`);
const maxTyped = Number(typing.match(/const MAX_TYPED = (\d+);/)[1]);
const longest = Math.max(...answers.map(a => a.length));
assert.ok(maxTyped >= longest + 20, `room for the longest answer (${longest}) plus slips; MAX_TYPED ${maxTyped}`);

/* Display capitals: first letter, I / I'm, and names from the exercise */
const names = T.namesOf({ accepted: ['i made this banner with my friend jamariko'], answerEn: "I hung this banner in Jamariko's purple room.", options: ["I gave October the book"] });
assert.strictEqual(names.jamariko, 'Jamariko');
assert.strictEqual(names.october, 'October');
assert.ok(!names.hung && !names.i, 'sentence-first words and I are not names');
assert.strictEqual(T.displayAnswer("i'm happy", {}), "I'm happy");
assert.strictEqual(T.displayAnswer('yes i think so', {}), 'Yes I think so');
assert.strictEqual(T.displayAnswer("in jamariko's room, i", names), "In Jamariko's room, I");
assert.strictEqual(T.displayAnswer('jamar', names), 'Jamar', 'partial names are not capitalised mid-sentence…');
assert.strictEqual(T.displayAnswer('the jamar', names), 'The jamar', '…only finished ones');
assert.strictEqual(T.displayAnswer('', names), '');
assert.ok(T.matchesAny(T.displayAnswer('i made this banner with my friend jamariko', names), ['i made this banner with my friend jamariko']), 'capitals never change grading');

/* The widget: no text field, the answer box, Check on the keyboard */
const widget = typing.slice(typing.indexOf('function renderExercise('), typing.indexOf('function injectStyles('));
assert.ok(!/<input\b|<textarea\b|contenteditable/i.test(widget), 'no text field');
assert.ok(!/mgty-submit/.test(typing), 'Check lives on the keyboard');
assert.match(widget, /class="mgty-answer" role="textbox" aria-readonly="true" aria-label="Type your answer"/);
assert.match(widget, /active = entry;\s*entry\.show\(\);\s*showKeys\(\);/, 'rendering an exercise brings up the keys');
assert.match(widget, /if \(matchesAny\(value, ex\.accepted\)\)/);

/* The keyboard: Marietta's set-up */
const build = typing.slice(typing.indexOf('function buildDock('), typing.indexOf('function showKeys('));
assert.match(build, /marks: \["'", ','\]/, 'apostrophe and comma keys');
assert.match(build, /okHTML: `Check<small lang="ja">たしかめる<\/small>`/);
assert.match(build, /repeatBack: true/, 'hold backspace to keep deleting long sentences');
assert.match(build, /document\.addEventListener\('keydown', onKeydown\)/, 'a physical keyboard still types');
assert.match(typing.slice(typing.indexOf('function onKeydown('), typing.indexOf('// ── Exercise widget')), /keys\.keyFromEvent\(event\)/);
for (const v of ['--kc:#ff9fc2', '--cap:#fffdf9', '--cap2:#ffeef6', '--kt:#5a2a48', '--kok:#fff']) assert.ok(typing.includes(v), `Marietta keyboard colour ${v}`);
assert.match(typing, /#mgty-keys-dock \.bk-key\.is-ok\{background:linear-gradient\(135deg,#ff8fc0,#ffd166\)/, 'Check matches the old pink-to-gold button');

/* Dock: slides with transform/opacity, reports its height, leaves with the panel */
assert.match(typing, /#mgty-keys-dock\{[^}]*transition:transform \.3s ease-out,opacity \.22s ease-out;\}/);
assert.match(typing, /#mgty-keys-dock\.is-still\{transform:none;\}/, 'reduced motion: fade only');
assert.match(typing, /setProperty\('--grimmerglen-keys-inset'/);
assert.match(typing.slice(typing.indexOf('function hideKeys('), typing.indexOf('function exerciseLive(')), /setKeysInset\(0\)/);
assert.match(typing.slice(typing.indexOf('function exerciseLive('), typing.indexOf('function onKey(')), /classList\.contains\('open'\)/, 'keys hide when the card closes');
assert.match(typing.slice(typing.indexOf('function onKey('), typing.indexOf('function onKeydown(')), /if \(!exerciseLive\(\)\) \{ hideKeys\(\); return false; \}/);
assert.match(typing.slice(typing.indexOf('function celebrateCorrect('), typing.indexOf('function shakeWrong(')), /hideKeys\(\);/, 'a right answer puts the keys away');
assert.match(runtime.slice(runtime.indexOf('function closeMariettaPanel('), runtime.indexOf('function unlockGrimmerglenNavigation(')), /window\.GrimmerglenTyping\?\.hideKeyboard\?\.\(\)/);
assert.ok((runtime.match(/var\(--grimmerglen-keys-inset,0px\)/g) || []).length >= 4, "Marietta's panel sits above the keys (bottom and max-height, both layouts)");
assert.match(runtime, /#grimmerglen-marietta-panel \{ box-sizing:border-box; bottom:/, 'panel padding counts inside its max-height, so it never pokes above the screen');
assert.match(widget, /if \(refs\.feedbackEl\.classList\.contains\('is-wrong'\)\) \{ refs\.feedbackEl\.textContent = '';/, 'typing again clears "Not quite"');
assert.ok(html.indexOf('js/booha-keys.js') > 0 && html.indexOf('js/booha-keys.js') < html.indexOf('js/grimmerglen-typing.js'), 'grimmerglen.html loads the shared keyboard first');
assert.ok(html.indexOf('js/utsu-sfx.js') > 0, 'key clicks come from UtsuSfx.keyTap');
assert.ok(!/\(\?<[=!]/.test(typing), 'no regex lookbehind');

console.log('Grimmerglen on-screen keyboard audit passed.');
