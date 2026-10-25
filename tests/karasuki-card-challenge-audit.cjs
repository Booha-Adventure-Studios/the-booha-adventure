#!/usr/bin/env node
'use strict';
/*
 * Karasuki Cards Pass 2c — challenge screen contracts: input friction, both
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

/* Input friction */
for (const attr of ['autocomplete="off"', 'autocorrect="off"', 'autocapitalize="off"', 'spellcheck="false"', 'enterkeyhint="done"']) {
  assert.ok(c.includes(attr), `input has ${attr}`);
}
assert.match(c, /addEventListener\('paste', reject\)/);
assert.match(c, /addEventListener\('drop', reject\)/);
assert.match(c, /insertFromPaste/);
assert.match(c, /if \(run && run\.phase !== 'type'\) input\.value = '';/, 'typing during SHOW is discarded');
assert.match(c, /font:700 24px/, 'input text ≥16px so iOS does not zoom');

/* Both timers come from the rules; the type timer submits what was typed */
assert.match(fn(c, 'nextRound'), /K\(\)\.lookMs\(run\.word, opts\.curriculum\)/);
assert.match(fn(c, 'nextRound'), /run\.phaseLeft = look - fade;/, 'the fade happens inside the look time');
assert.match(fn(c, 'nextRound'), /startPhase\('fade', fade, typePhase\)/);
assert.match(fn(c, 'typePhase'), /startPhase\('type', K\(\)\.typeMs\(run\.word, opts\.curriculum\), submit\)/);
assert.match(fn(c, 'submit'), /K\(\)\.answer\(input\.value\)/);

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

/* iPad keyboard: focus inside the tap, before any await */
const openSrc = fn(c, 'open');
assert.ok(openSrc.indexOf('focusInput();') > 0 && openSrc.indexOf('focusInput();') < openSrc.indexOf('await '), 'input focused before the first await');

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
