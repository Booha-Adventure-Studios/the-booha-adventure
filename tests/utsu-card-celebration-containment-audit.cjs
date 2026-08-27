#!/usr/bin/env node
'use strict';

// Pass 21D: stable celebration cards contain the modal interaction without
// permanently changing any page-level scroll configuration.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(card.includes('var celebrationPageLock = null;'), 'celebration modal must track its page lock state');
assert(card.includes('function setCelebrationPageLock(locked)'), 'celebration modal needs an explicit containment helper');
assert(card.includes("document.documentElement.style.overflow = 'hidden';"), 'celebration modal must lock the document scroll root');
assert(card.includes("document.body.style.overflow = 'hidden';"), 'celebration modal must lock the body scroll root');
assert(card.includes('documentOverflow: document.documentElement.style.overflow'), 'document overflow must be preserved before locking');
assert(card.includes('bodyOverflow: document.body.style.overflow'), 'body overflow must be preserved before locking');
assert(card.includes('document.documentElement.style.overflow = celebrationPageLock.documentOverflow'), 'document overflow must be restored after closing');
assert(card.includes('document.body.style.overflow = celebrationPageLock.bodyOverflow'), 'body overflow must be restored after closing');
assert(card.includes('setCelebrationPageLock(false);'), 'all celebration close paths must release the page lock');
assert(card.includes('setCelebrationPageLock(true);'), 'opening a celebration must acquire the page lock');
assert(verify.includes('tests/utsu-card-celebration-containment-audit.cjs'), 'verify.sh must run the 21D containment audit');

console.log('UtsuCard 21D containment audit passed: celebration dialogs lock and restore page scrolling safely.');
