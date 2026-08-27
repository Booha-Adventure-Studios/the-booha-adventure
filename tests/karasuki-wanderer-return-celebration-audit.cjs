#!/usr/bin/env node
'use strict';

// Pass 20C: returning Wanderers receive a stable welcome-back celebration.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');

function sourceSection(startName, endName) {
  const start = source.indexOf(`function ${startName}`);
  const end = source.indexOf(`function ${endName}`, start + 1);
  assert(start >= 0 && end > start, `could not inspect ${startName} return contract`);
  return source.slice(start, end);
}

const returning = sourceSection('showWandererReturn', 'showKarasukiArrival');
const visitFlow = sourceSection('openWandererPop', 'closeWandererPop');

assert(returning.includes('showCelebrationPop'), 'returning Wanderers must use the stable celebration card');
assert(!returning.includes('showRewardPop'), 'returning Wanderers must not use the transient pickup toast');
assert(returning.includes("title: 'HELLO AGAIN!'"), 'return celebration needs the Hello Again title');
assert(returning.includes('sub: "I\'m back."'), 'return celebration needs the English welcome-back line');
assert(returning.includes('translationHTML: jp'), 'return celebration must place furigana-ready Japanese under English');
assert(returning.includes('portraitSrc: wandererCelebrationPortrait(w)'), 'return celebration must show the Wanderer portrait');
assert(returning.includes("portraitAlt: `${w.name} wanderer returning`"), 'return portrait must have an accessible label');
assert(returning.includes('accent: WANDERER_RETURN_ACCENT'), 'return celebration needs a distinct accent palette');
assert(returning.includes('glow: WANDERER_RETURN_GLOW'), 'return celebration needs a distinct glow palette');
assert(returning.includes("actionLabel: 'Say hello'"), 'return celebration needs an explicit readable action');
assert(returning.includes('UtsuFurigana.sentence'), 'return celebration must use the shared furigana renderer');

assert(visitFlow.includes('if (visit && visit.firstVisit) showWandererDiscovery(w);'), 'first visits must retain discovery behavior');
assert(visitFlow.includes('else if (visit && Number(visit.visits) > 1) showWandererReturn(w);'), 'later visits must trigger the welcome-back celebration');
assert(source.includes("const WANDERER_RETURN_ACCENT = '#7dd3fc';"), 'return palette must be authored and stable');
assert(source.includes("const WANDERER_RETURN_GLOW   = 'rgba(125,211,252,.46)';"), 'return glow must be authored and stable');
assert(card.includes('function showCelebrationPop(opts)'), 'return celebration must rely on the shared stable card foundation');

console.log('Karasuki 20C return celebration audit passed: later Wanderer visits use a distinct stable Hello Again card with portrait, furigana, and explicit dismissal.');
