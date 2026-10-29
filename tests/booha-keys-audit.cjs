#!/usr/bin/env node
'use strict';
/*
 * Grimmerglen Pass G1 — the shared on-screen keyboard (js/booha-keys.js),
 * first built for the Karasuki card challenge. Checks the keys it builds,
 * physical-key mapping, touch handling for older iPads (pointerdown, iOS 12
 * touchstart fallback), ≥44 px keys, colours via CSS variables, and motion
 * rules. Runs the module in a small stub DOM; full play-throughs are
 * checked in the browser.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/booha-keys.js'), 'utf8');

/* ── Load in a stub DOM ─────────────────────────────────────────────── */
function load({ pointer = true, motion = null } = {}) {
  const styles = [];
  const made = [];
  const sounds = [];
  const el = () => {
    const listeners = {};
    const node = {
      className: '', innerHTML: '', attrs: {}, textContent: '', id: '',
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(type, fn, opt) { (listeners[type] = listeners[type] || []).push({ fn, opt }); },
      querySelectorAll() { return []; },
      contains() { return true; },
      listeners,
    };
    made.push(node);
    return node;
  };
  const document = {
    documentElement: { getAttribute: k => (k === 'data-motion' ? motion : null) },
    getElementById: id => styles.find(s => s.id === id) || null,
    createElement: () => el(),
    head: { appendChild: n => styles.push(n) },
  };
  const winListeners = {};
  const window = {
    document,
    addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
    removeEventListener(type, fn) { winListeners[type] = (winListeners[type] || []).filter(f => f !== fn); },
    matchMedia: () => ({ matches: false }),
    UtsuSfx: { keyTap: k => sounds.push(k) },
  };
  if (pointer) window.PointerEvent = function () {};
  const ctx = { window, document, setTimeout, clearTimeout, setInterval, clearInterval, console };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { K: window.BoohaKeys, styles, made, sounds, winListeners };
}

/* Keys: QWERTY a–z, the caller's marks, space, backspace, OK — real buttons */
const { K, styles, sounds } = load();
const typed = [];
const kb = K.create({ className: 'kcc-keys', marks: ["'", '-'], okHTML: 'OK<small lang="ja">けってい</small>', onKey: k => { typed.push(k); return k !== 'z'; } });
const html = kb.el.innerHTML;
const letters = (html.match(/data-k="([a-z])"/g) || []).map(m => m.slice(8, 9));
assert.strictEqual(letters.join(''), 'qwertyuiopasdfghjklzxcvbnm', 'QWERTY order, all 26 letters once');
for (const [k, aria] of [['&#39;', 'apostrophe'], ['-', 'hyphen'], [' ', 'space'], ['back', 'backspace'], ['ok', 'OK']]) {
  assert.ok(html.includes(`data-k="${k}" aria-label="${aria}"`), `bottom row has ${aria} with an aria-label`);
}
assert.ok(html.indexOf('data-k="&#39;"') < html.indexOf('data-k="-"') && html.indexOf('data-k="-"') < html.indexOf('data-k=" "'), 'marks in order, before space');
assert.strictEqual((html.match(/<button type="button" class="bk-key/g) || []).length, 31, '31 real buttons');
assert.ok(html.includes('OK<small lang="ja">けってい</small>'));
assert.match(kb.el.className, /^bk-keys kcc-keys$/);
assert.strictEqual(kb.el.attrs.role, 'group');
assert.strictEqual(K.create({ marks: [',', "'"] }).el.innerHTML.includes('data-k="," aria-label="comma"'), true, 'other games can choose their marks');

/* Taps: pointerdown, preventDefault, onKey decides; OK makes no click sound */
assert.ok(kb.el.listeners.pointerdown, 'taps act on pointerdown');
assert.ok(!kb.el.listeners.touchstart, 'no duplicate touch handler when Pointer Events exist');
assert.strictEqual(kb.tap('a'), true);
assert.strictEqual(kb.tap('z'), false, 'onKey returning false ignores the key');
kb.tap('back'); kb.tap('ok');
assert.deepStrictEqual(typed.slice(), ['a', 'z', 'back', 'ok']);
assert.deepStrictEqual(sounds.slice(), ['', 'back'], 'a click per key, a lower one for backspace, none for OK or ignored keys');
let prevented = false;
const pressed = [];
const btn = { getAttribute: () => 'q', classList: { add: c => pressed.push(c), remove() {} } };
kb.el.listeners.pointerdown[0].fn({ target: { closest: () => btn }, cancelable: true, preventDefault() { prevented = true; } });
assert.ok(prevented, 'a tap never focuses, zooms or selects');
assert.strictEqual(typed[typed.length - 1], 'q');
assert.deepStrictEqual(pressed.slice(), ['is-down'], 'the tapped key glows');
const before = typed.length;
kb.el.listeners.click[0].fn({ detail: 1, target: { closest: () => btn }, cancelable: true, preventDefault() {} });
assert.strictEqual(typed.length, before, 'the click after a tap does not type twice');
kb.el.listeners.click[0].fn({ detail: 0, target: { closest: () => btn }, cancelable: true, preventDefault() {} });
assert.strictEqual(typed.length, before + 1, 'a focused key still works from a keyboard or switch control');

/* Hold backspace to keep deleting (opt-in: Grimmerglen sentences) */
(async () => {
  const r = load();
  let deletes = 0;
  const hold = r.K.create({ repeatBack: true, onKey: k => { if (k === 'back') deletes++; return true; } });
  assert.ok(r.winListeners.pointerup && r.winListeners.touchend, 'lifting a finger anywhere stops the repeat');
  const back = { getAttribute: () => 'back', classList: { add() {}, remove() {} } };
  hold.el.listeners.pointerdown[0].fn({ type: 'pointerdown', target: { closest: () => back }, cancelable: true, preventDefault() {} });
  await new Promise(res => setTimeout(res, 700));
  r.winListeners.pointerup.forEach(fn => fn());
  const held = deletes;
  await new Promise(res => setTimeout(res, 250));
  assert.ok(held >= 3, `holding deletes repeatedly (got ${held})`);
  assert.strictEqual(deletes, held, 'lifting stops the repeat');
  hold.destroy();
  assert.strictEqual((r.winListeners.pointerup || []).length, 0, 'destroy removes the window listeners');
  const once = load();
  let n = 0;
  const plain = once.K.create({ onKey: () => { n++; return true; } });
  assert.ok(!once.winListeners.pointerup, 'no repeat unless asked (Karasuki)');
  plain.el.listeners.pointerdown[0].fn({ type: 'pointerdown', target: { closest: () => back }, cancelable: true, preventDefault() {} });
  await new Promise(res => setTimeout(res, 600));
  assert.strictEqual(n, 1);
  console.log('Booha shared keyboard audit passed.');
})().catch(e => { console.error(e); process.exit(1); });

/* iOS 12 (no Pointer Events): touchstart with passive:false, plus mouse */
const old = load({ pointer: false }).K.create({});
assert.ok(old.el.listeners.touchstart && old.el.listeners.touchstart[0].opt && old.el.listeners.touchstart[0].opt.passive === false, 'iOS 12 fallback: touchstart, not passive');
assert.ok(old.el.listeners.mousedown && !old.el.listeners.pointerdown);

/* Physical keys map to keys on this keyboard only */
const ev = (key, mods) => Object.assign({ key }, mods || {});
const map = e => kb.keyFromEvent(e);
assert.strictEqual(map(ev('A')), 'a');
assert.strictEqual(map(ev('Enter')), 'ok');
assert.strictEqual(map(ev('Backspace')), 'back');
assert.strictEqual(map(ev(' ')), ' ');
assert.strictEqual(map(ev('-')), '-');
assert.strictEqual(map(ev("'")), "'");
assert.strictEqual(map(ev('’')), "'", 'a curly apostrophe types the apostrophe key');
assert.strictEqual(map(ev(',')), null, 'no comma key on this keyboard → ignored');
assert.strictEqual(map(ev('1')), null);
assert.strictEqual(map(ev('Tab')), null);
assert.strictEqual(map(ev('v', { metaKey: true })), null, 'Cmd+V paste is never a key');
assert.strictEqual(map(ev('v', { ctrlKey: true })), null);
assert.strictEqual(K.keyFor(ev(','), [',']), ',');

/* Reduced motion keeps the glow, drops the movement */
assert.match(load({ motion: 'reduced' }).K.create({}).el.className, /\bbk-still\b/);
assert.ok(!/\bbk-still\b/.test(K.create({}).el.className));

/* Styles: one injected sheet; ≥44 px keys; touch-safe; colours by variable */
assert.strictEqual(styles.length, 1, 'styles injected once');
const css = styles[0].textContent;
const keysRule = css.match(/\.bk-keys\{([^}]*)\}/)[1];
for (const prop of ['touch-action:manipulation', 'user-select:none', '-webkit-touch-callout:none', '--kh:56px']) assert.ok(keysRule.includes(prop), `keyboard has ${prop}`);
assert.match(css.match(/@media \(max-height:500px\)\{([\s\S]*?)\n\}/)[1], /--kh:44px/, 'phone landscape keys stay 44 px');
assert.match(css, /\.bk-key\{[^}]*height:var\(--kh\)/);
for (const v of ['--kc', '--kd', '--cap', '--cap2', '--kt,', '--kok,', '--kbg,', '--kshadow,']) assert.ok(css.includes(`var(${v}`), `colour comes from ${v}`);
assert.match(css, /\.bk-still \.bk-key\.is-down\{transform:none\}/);
for (const m of css.matchAll(/transition:([^;}]+)/g)) {
  m[1].split(/,(?![^(]*\))/).forEach(part => assert.ok(/^(opacity|transform) /.test(part.trim()), `transition must be opacity/transform: ${part}`));
}
assert.ok(!/@keyframes/.test(css), 'no keyframe animation in the keys');
assert.ok(!/\(\?<[=!]/.test(src), 'no regex lookbehind');

