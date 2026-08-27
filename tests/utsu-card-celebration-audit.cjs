#!/usr/bin/env node
'use strict';

// Pass 20A: shared stable celebration-card foundation.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const karasukiPage = fs.readFileSync(path.join(root, 'karasuki.html'), 'utf8');

function sourceSection(startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = endName === 'injectStyles'
    ? source.indexOf('\n  injectStyles();', start + 1)
    : source.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} celebration contract`);
  return source.slice(start, end);
}

const celebration = sourceSection('showCelebrationPop', 'injectStyles');

assert(source.includes('.utsu-celebration-pop{'), 'celebration overlay needs a dedicated shell');
assert(source.includes('display:grid;place-items:center'), 'celebration card must be centered');
assert(source.includes('.utsu-celebration-pop.is-shown'), 'celebration overlay needs an open state');
assert(source.includes('.utsu-celebration-card{'), 'celebration needs a distinct card surface');
assert(source.includes('max-height:min(86vh,720px)'), 'celebration card must remain viewport-safe');
assert(source.includes('.utsu-celebration-portrait'), 'celebration card must support a large portrait');
assert(source.includes('--celebration-ring'), 'celebration card must accept a caller accent color');
assert(source.includes('--celebration-glow'), 'celebration card must accept a caller glow color');
assert(source.includes('prefers-reduced-motion:reduce'), 'celebration must respect reduced motion');

assert(source.includes('function showCelebrationPop(opts)'), 'UtsuCard must expose a stable celebration API');
assert(source.includes('showCelebrationPop: showCelebrationPop'), 'stable celebration API must be public');
assert(source.includes('closeCelebrationPop: closeCelebrationPop'), 'stable celebration API must support explicit closing');
assert(celebration.includes('role="dialog" aria-modal="true"'), 'celebration must be announced as a modal dialog');
assert(celebration.includes('utsu-celebration-close'), 'celebration must provide a visible close control');
assert(celebration.includes('action.onclick'), 'celebration must provide an explicit action');
assert(celebration.includes("actionLabel || 'Continue'"), 'celebration action must have a readable default');
assert(celebration.includes('translation.innerHTML = opts.translationHTML ||'), 'celebration must support furigana-safe authored translation HTML');
assert(celebration.includes('title.textContent = opts.title ||'), 'celebration title must be assigned as text');
assert(celebration.includes('sub.textContent = opts.sub ||'), 'celebration English copy must be assigned as text');
assert(celebration.includes('portraitSrc'), 'celebration must support an authored portrait source');
assert(celebration.includes('portrait.alt = opts.portraitAlt ||'), 'celebration portrait must support accessible alt text');
assert(celebration.includes('onClose'), 'celebration must support a caller close callback');
assert(!celebration.includes('setTimeout('), 'stable celebration must not auto-dismiss under the learner');

// The existing transient pickup notification remains intentionally separate.
assert(source.includes('function showRewardPop(opts)'), 'existing pickup toast must remain available');
assert(source.includes('rewardPopHideTimer = setTimeout'), 'routine pickup toast may remain transient');

assert(karasukiPage.includes("<script src=\"js/utsu-card.js\"></script>"), 'Karasuki must load the shared card foundation');
assert(karasukiPage.includes("<script src=\"js/utsu-furigana.js\"></script>"), 'Karasuki must load the furigana renderer before popup callers');

console.log('UtsuCard 20A celebration audit passed: centered stable modal API, portrait/color hooks, explicit close action, furigana HTML support, and backward-compatible pickup toast.');
