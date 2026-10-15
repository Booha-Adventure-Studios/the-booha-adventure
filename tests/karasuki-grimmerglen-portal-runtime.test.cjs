#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'karasuki.js'), 'utf8');

function extractFunction(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `could not find ${name}`);
  const open = text.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`could not close ${name}`);
}

let now = 1000;
const metrics = { injectCalls: 0, openCalls: 0 };
const element = () => ({ style: {} });

const runtime = new Function('deps', `
  const {
    document, performance, window,
    metrics,
    state,
    wpopThemeBox, wpopSetIconImage, wpopSetText, wpopSetLock,
    wpopSetActions, openWpopOverlay, closeWpopOverlay,
  } = deps;
  const GRIMMERGLEN_THEME = { accent3: '#8a4bbf', btnBorder: '#e0559e' };
  const GRIMMERGLEN_PORTAL = { roomId: 'room_14', x: 799, y: 199, r: 44 };
  const POPUP_COOLDOWN_MS = 900;
  const grimmerglenUnlocked = () => true;
  let grimmerglenPopOverlay = null;
  let grimmerglenCooldownUntil = 0;
  function injectGrimmerglenPopOverlay() {
    metrics.injectCalls += 1;
    grimmerglenPopOverlay = { style: { display: 'none', background: '' } };
  }
  ${extractFunction(source, 'isGrimmerglenPopupOpen')}
  ${extractFunction(source, 'openGrimmerglenPopup')}
  ${extractFunction(source, 'closeGrimmerglenPopup')}
  ${extractFunction(source, 'clickCheckGrimmerglenPortal')}
  return {
    open: openGrimmerglenPopup,
    close: closeGrimmerglenPopup,
    click: clickCheckGrimmerglenPortal,
    isOpen: isGrimmerglenPopupOpen,
  };
`)({
  document: { getElementById: element },
  performance: { now: () => now },
  window: { UtsuSfx: null },
  metrics,
  state: { roomId: 'room_14' },
  wpopThemeBox() {},
  wpopSetIconImage() {},
  wpopSetText() {},
  wpopSetLock() {},
  wpopSetActions() {},
  openWpopOverlay(overlay) {
    metrics.openCalls += 1;
    overlay.style.display = 'flex';
  },
  closeWpopOverlay(overlay) {
    overlay.style.display = 'none';
  },
});

for (let i = 0; i < 10; i += 1) runtime.open();
assert.strictEqual(metrics.injectCalls, 1, 'Karasuki should create one Grimmerglen popup overlay');
assert.strictEqual(metrics.openCalls, 1, 'repeated direct opens should display the popup once');
assert.strictEqual(runtime.isOpen(), true, 'the popup should remain open after repeated opens');

runtime.click(799, 199);
assert.strictEqual(metrics.openCalls, 1, 'portal clicks must not reopen an already-open popup');

runtime.close();
now = 2000;
assert.strictEqual(runtime.click(799, 199), true, 'a portal click after cooldown should be handled');
assert.strictEqual(metrics.openCalls, 2, 'the portal should open again after the popup closes and cooldown expires');

console.log('Karasuki Grimmerglen portal runtime test passed.');
