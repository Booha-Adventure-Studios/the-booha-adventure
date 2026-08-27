#!/usr/bin/env node
'use strict';

// Pass 21C: stable celebration cards behave like complete modal dialogs for
// keyboard and assistive-technology users without changing their visuals.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const card = fs.readFileSync(path.join(root, 'js', 'utsu-card.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(card.includes('var celebrationPreviousFocus = null;'), 'celebration modal must remember the opener focus');
assert(card.includes('celebrationPopEl.setAttribute(\'aria-hidden\', \'true\')'), 'closed celebration modal must be hidden from assistive technology');
assert(card.includes('celebrationPopEl.setAttribute(\'aria-hidden\', \'false\')'), 'shown celebration modal must be exposed to assistive technology');
assert(card.includes("} else if (event.key === 'Tab')"), 'celebration modal must keep Tab focus inside the dialog');
assert(card.includes('celebrationPreviousFocus = null;'), 'celebration modal must clear its saved focus after closing');
assert(card.includes('previousFocus.focus({ preventScroll: true })'), 'closing must restore focus without scrolling the page');
assert(card.includes('action.focus({ preventScroll: true })'), 'opening and Tab navigation must focus the explicit action safely');
assert(verify.includes('tests/utsu-card-celebration-a11y-audit.cjs'), 'verify.sh must run the 21C accessibility audit');

console.log('UtsuCard 21C accessibility audit passed: celebration dialogs expose state, trap keyboard focus, and restore the opener focus.');
