#!/usr/bin/env node
'use strict';

// Pass 20J: every Wanderer celebration gets the same protected art frame,
// while the return/new copy stays compact enough to reveal tall portraits.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(card.includes('width:min(340px,74vw);height:min(360px,42vh)'), 'Wanderers need one shared large portrait frame');
assert(card.includes('width:100%;height:100%;object-fit:contain'), 'portrait art must stay inside the shared frame');
assert(card.includes('.utsu-celebration-card.is-compact-copy .utsu-celebration-copy'), 'Wanderer copy needs a compact overlay variant');
assert(card.includes('.utsu-celebration-card.is-compact-copy .utsu-celebration-action'), 'compact copy must keep the action above the artwork');
assert((karasuki.match(/copyCompact: true/g) || []).length >= 2, 'New and returning Wanderer cards must both use compact copy');
assert(karasuki.includes("title: 'HELLO AGAIN!'"), 'return celebration must remain present');
assert(karasuki.includes("title: 'NEW WANDERER FOUND!'"), 'discovery celebration must remain present');
assert(sw.includes("pages:  'booha-pages-2026-371'"), 'page cache must include the current consistency-pass bump');
assert(verify.includes('tests/karasuki-wanderer-consistency-audit.cjs'), 'verify.sh must run the consistency audit');

console.log('Karasuki 20J consistency audit passed: New and returning Wanderers share a large safe frame with compact foreground copy for tall portraits.');
