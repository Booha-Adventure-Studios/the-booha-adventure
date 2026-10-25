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
assert.match(c, /#kcc\.kcc-still \.kcc-flip\.is-flipped\{transform:none\}/);

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
