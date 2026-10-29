#!/usr/bin/env node
'use strict';
/*
 * Karasuki Cards Pass 2c/5 — challenge screen contracts: the on-screen
 * keyboard (Pass 5), the reading countdown, both
 * timers, timeout submits, interruption grace + policy, Leave, iPad keyboard
 * focus, reveal with the shared face, motion rules, and Karasuki wiring.
 * (Full play-throughs are checked in the browser; see the pass notes.)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const c = read('js/karasuki-card-challenge.js');
const k = read('js/karasuki.js');

const fn = (src, name) => {
  const start = src.search(new RegExp(`(async )?function ${name}\\(`));
  assert.ok(start >= 0, `${name} should exist`);
  const open = src.indexOf('{', src.indexOf(')', start));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
};

/* Pass 5: no system keyboard — the shared on-screen keyboard, no text input */
assert.ok(!/<input\b|<textarea\b|contenteditable/i.test(c), 'no text input anywhere: the iPad keyboard, QuickType and autofill never appear');
assert.ok(!/focusInput|kcc-input/.test(c), 'the old keyboard-focus workaround is gone');
const html = read('karasuki.html');
assert.ok(html.indexOf('js/booha-keys.js') > 0 && html.indexOf('js/booha-keys.js') < html.indexOf('js/karasuki-card-challenge.js'), 'karasuki.html loads the shared keyboard before the challenge');
const sh = fn(c, 'shell');
assert.match(sh, /keys = window\.BoohaKeys\.create\(\{\s*className: 'kcc-keys',\s*marks: \["'", '-'\],\s*okHTML: 'OK<small lang="ja">けってい<\/small>',\s*onKey,\s*\}\);/, 'Karasuki keyboard: apostrophe, hyphen, OK けってい');
assert.match(sh, /\$\('\.kcc-stage'\)\.appendChild\(keys\.el\)/);
const tint = c.match(/const KEYS_TINT = \{([\s\S]*?)\n  \};/)[1];
for (const kind of ['friendly', 'mischievous', 'dangerous']) assert.match(tint, new RegExp(`${kind}: \\{ kc: '#[0-9A-F]{6}', kd: '#[0-9A-F]{6}', cap: '#[0-9A-F]{6}', cap2: '#[0-9A-F]{6}' \\}`), `${kind} keyboard tint`);
assert.match(tint, /friendly: \{ kc: '#F2C14E'/);
assert.match(tint, /mischievous: \{ kc: '#FF8AD0', kd: '#A64BD6'/);
assert.match(tint, /dangerous: \{ kc: '#FF6B74', kd: '#C3303B'/);
assert.match(sh, /--kc:\$\{tint\.kc\};--kd:\$\{tint\.kd\};--cap:\$\{tint\.cap\};--cap2:\$\{tint\.cap2\}/, 'the kind tint reaches the keyboard through CSS variables');
const ok = fn(c, 'onKey');
assert.match(ok, /if \(!run \|\| run\.phase !== 'type'\) return false;/, 'keys only type during TYPE');
assert.match(ok, /if \(k === 'ok'\) \{ submit\(\); return true; \}/);
assert.match(ok, /run\.typed\.length < MAX_TYPED/);
const kd = fn(c, 'onKeydown');
assert.match(kd, /const k = keys\.keyFromEvent\(e\);/, 'physical keys map through the shared keyboard (shortcuts like Cmd+V are never keys)');
assert.match(kd, /e\.preventDefault\(\);/);
assert.match(kd, /if \(run\.phase === 'type'\) keys\.tap\(k\);/, 'physical keys only type during TYPE');
assert.match(fn(c, 'open'), /document\.addEventListener\('keydown', onKeydown\)/);
assert.match(fn(c, 'close'), /document\.removeEventListener\('keydown', onKeydown\)/);
assert.match(fn(c, 'submit'), /K\(\)\.answer\(run\.typed\)/, 'the typed keys are what gets checked');
const cssAll = c.slice(c.indexOf('style.textContent = `'), c.indexOf('`;', c.indexOf('style.textContent = `')));
assert.match(cssAll, /#kcc \.kcc-keys\{width:min\(800px,100%\);margin-top:auto\}/, 'layout only: keycaps live in js/booha-keys.js');
assert.ok(!/\.kcc-key\b|\.bk-key/.test(cssAll), 'no keycap styles duplicated here');
/* Reading screen vs typing screen */
assert.match(cssAll, /#kcc \.kcc-stage\.is-read \.kcc-meter,#kcc \.kcc-stage\.is-read \.kcc-answer,#kcc \.kcc-stage\.is-read \.kcc-keys/, 'the reading screen never shows the keyboard, answer box or bar');
assert.match(cssAll, /#kcc \.kcc-stage\.is-type \.kcc-word,#kcc \.kcc-stage\.is-type \.kcc-clock/, 'the typing screen hides the word and the countdown');
const nr = fn(c, 'nextRound');
assert.match(nr, /mode\('read'\);/);
assert.match(nr, /Read and remember! · /);
assert.ok(!/meterTo\(/.test(nr), 'reading uses the countdown ring, not the bar');
const tp = fn(c, 'typePhase');
assert.match(tp, /stopClock\(\);/);
assert.match(tp, /mode\('type'\);/);
assert.match(tp, /Now type it! · /);
const rp = fn(c, 'resumePhase');
assert.match(rp, /if \(run\.phase === 'type'\) meterTo\(/, 'the bar belongs to typing');
assert.match(rp, /if \(run\.phase === 'show'\) ringTo\(/, 'the ring belongs to reading');
assert.match(fn(c, 'pausePhase'), /stopClock\(\);/, 'the countdown pauses with the round');
assert.match(fn(c, 'ringTo'), /transform/);
assert.match(fn(c, 'clockTick'), /Math\.ceil\(lookLeft\(\) \/ 1000\)/, '3·2·1 counts whole seconds of look time');
assert.match(read('js/utsu-sfx.js'), /keyTap: function/);

/* Both timers come from the rules; the type timer submits what was typed */
assert.match(fn(c, 'nextRound'), /K\(\)\.lookMs\(run\.word, opts\.curriculum\)/);
assert.match(fn(c, 'nextRound'), /run\.phaseLeft = look - fade;/, 'the fade happens inside the look time');
assert.match(fn(c, 'nextRound'), /startPhase\('fade', fade, typePhase\)/);
assert.match(fn(c, 'typePhase'), /startPhase\('type', K\(\)\.typeMs\(run\.word, opts\.curriculum\), submit\)/);

/* Interruptions: grace, pause/resume, policy from the rules module */
assert.match(c, /const GRACE_MS = 2000;/);
const vis = fn(c, 'onVisibility');
assert.match(vis, /pausePhase\(\)/);
assert.match(vis, /if \(away <= GRACE_MS\) resumePhase\(\);/);
assert.match(vis, /else interrupted\(K\(\)\.interrupt\(\)\);/);
assert.match(fn(c, 'open'), /document\.addEventListener\('visibilitychange', onVisibility\)/);
assert.match(fn(c, 'close'), /document\.removeEventListener\('visibilitychange', onVisibility\)/);
assert.match(fn(c, 'leave'), /run\.phase === 'show' \|\| run\.phase === 'fade' \|\| run\.phase === 'type'/, 'Leave only interrupts a live round');
assert.match(fn(c, 'open'), /const r = K\(\)\.resume\(\);/, 'Continue uses resume (mid-round: interruption; between rounds: free)');
assert.match(fn(c, 'nextRound'), /K\(\)\.begin\(\)/, 'each round is marked live before the word shows');

/* Reveal: shared face, face down first, flip, reduced-motion crossfade */
const rev = fn(c, 'reveal');
assert.match(rev, /face\.fromRegistry\(outcome\.hostId/);
assert.match(rev, /face\.back\(/);
assert.match(rev, /classList\.add\('is-flipped'\)/);
assert.match(c, /-webkit-backface-visibility:hidden/);
assert.match(c, /#kcc\.kcc-still \.kcc-flip\.is-flipped,#kcc\.kcc-still \.kcc-flip\.is-flipped\.is-landed\{transform:none\}/, 'reduced motion: no 3D flip or pop');

/* Pass 4a: cinematic reveal — unskippable, timer-driven, button at the end */
const T = {};
for (const m of c.match(/const REVEAL = Object\.freeze\(\{([^}]*)\}\)/)[1].matchAll(/(\w+): (\d+)/g)) T[m[1]] = Number(m[2]);
assert.deepStrictEqual(Object.keys(T), ['hush', 'rise', 'shake', 'flip', 'land', 'title', 'line', 'count', 'button']);
Object.values(T).reduce((prev, v) => { assert.ok(v >= prev, 'beats are in order'); return v; }, -1);
assert.ok(T.button >= 3000 && T.button <= 4000, `reveal lasts 3–4 s (got ${T.button} ms)`);
assert.ok(!/addEventListener\(['"](webkit)?(animationend|transitionend)|on(animationend|transitionend)\s*=/i.test(c), 'driven by timers only, never animation/transition events');
assert.match(rev, /<button type="button" class="kcc-btn kcc-r"[^>]*hidden>/, 'binder button starts hidden');
assert.match(rev, /at\(REVEAL\.button, \(\) => \{\s*const btn = \$\('\.kcc-btn'\);\s*btn\.hidden = false;/, 'button appears only at the end');
assert.strictEqual((rev.match(/addEventListener\(/g) || []).length, 1, 'the only listener in the reveal is the binder button (taps cannot skip)');
assert.match(rev, /btn\.addEventListener\('click'/);
for (const cue of ["sfx('cardHush')", "sfx('cardCharge')", "sfx('cardWhoosh')", 'UtsuSfx.cardReveal(opts.kind)', "sfx2('cardTick', i)"]) {
  assert.ok(rev.includes(cue), `reveal plays ${cue}`);
}
assert.match(rev, /if \(calm\) return;/, 'reduced motion skips rays and sparks');
assert.match(c, /#kcc \.kcc-side\.kcc-back\{position:relative;transform:rotateY\(0deg\)\}/, 'back keeps its own 3D plane so the face stays hidden during the shake');
assert.match(rev, /if \(!calm\) \$\('\.kcc-shake'\)\.classList\.add\('is-shaking'\)/, 'reduced motion skips the shake');
assert.match(fn(c, 'close'), /clearReveal\(\);/, 'closing clears every reveal timer');
assert.match(rev, /window\.__devRevealFast \? 0\.25 : 1/, 'dev 4× toggle');
assert.match(k, /id="dev-reveal-fast"/, 'the 4× toggle lives in the dev panel');

/* Reveal voices: shared context, capped gain, compressor bus, kind stings */
const sfxSrc = read('js/utsu-sfx.js');
for (const name of ['cardHush', 'cardCharge', 'cardWhoosh', 'cardReveal', 'cardTick']) {
  assert.match(sfxSrc, new RegExp(`${name}: function`), `UtsuSfx.${name}`);
}
const revealSfx = sfxSrc.slice(sfxSrc.indexOf('cardReveal: function'), sfxSrc.indexOf('cardTick: function'));
assert.match(revealSfx, /kind === 'dangerous'/);
assert.match(revealSfx, /kind === 'mischievous'/);
assert.match(sfxSrc, /function capped\(g\) \{ return Math\.min\(SFX_MAX_GAIN/, 'reveal voices use the shared gain cap');
assert.match(sfxSrc, /gain\.connect\(cardBus\(c\)\)/, 'reveal voices go through the compressor bus');
assert.ok(!/new (window\.)?(webkit)?AudioContext/.test(sfxSrc.replace(/if \(!ctx\) ctx = new AC\(\);/, '')), 'one shared AudioContext');

/* Motion: transitions/animations touch opacity and transform only */
const css = c.slice(c.indexOf('style.textContent = `'), c.indexOf('`;', c.indexOf('style.textContent = `')));
for (const m of css.matchAll(/transition:([^;}]+)/g)) {
  const t = m[1].trim();
  if (t === 'none !important' || t === 'none') continue;
  t.split(/,(?![^(]*\))/).forEach(part => assert.ok(/^(opacity|transform) /.test(part.trim()), `transition must be opacity/transform: ${part}`));
}
const kf = css.match(/@keyframes kcc-in\{([^}]*\})\}/);
assert.ok(kf && /^to\{opacity:1;transform:none\}$/.test(kf[1]), 'letter animation is opacity/transform');
for (const m of css.matchAll(/@keyframes ([\w-]+)\{((?:[^{}]*\{[^}]*\})*)\}/g)) {
  for (const decl of m[2].matchAll(/\{([^}]*)\}/g)) {
    decl[1].split(';').filter(Boolean).forEach(d => assert.ok(/^(opacity|transform):/.test(d.trim()), `@keyframes ${m[1]} animates ${d}`));
  }
}
assert.match(fn(c, 'meterTo'), /transform/);
assert.ok(!/\(\?<[=!]/.test(c), 'no regex lookbehind');
assert.match(fn(c, 'still'), /data-motion/);

/* Karasuki wiring */
assert.match(k, /KarasukiCardEncounter\.close\(\);\s*KarasukiCardChallenge\.open\(challenge\);/);
assert.match(k, /onStart: host\.dev \|\| !window\.KarasukiCardChallenge \? undefined :/, 'dev-forced states never start a real attempt');
assert.match(k, /mode: host\.status\.phase === 'inProgress' \? 'continue' : 'start'/);
assert.match(fn(k, 'anyModalOpen'), /isCardChallengeOpen\(\)/);
assert.match(fn(k, 'staticFrameOverlayOpen'), /isCardChallengeOpen\(\)/);

console.log('Karasuki card challenge audit passed.');
