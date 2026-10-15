#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'blitz-engine.js'), 'utf8');

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

const bindViewportMetrics = new Function(
  'window',
  `${extractFunction(source, 'bindViewportMetrics')}; return bindViewportMetrics;`
);
const windowListeners = new Map();
const viewportListeners = new Map();
const visualViewport = {
  width: 1024,
  height: 700,
  scale: 1,
  addEventListener(type, listener) { viewportListeners.set(type, listener); },
  removeEventListener(type, listener) {
    if (viewportListeners.get(type) === listener) viewportListeners.delete(type);
  }
};
const fakeWindow = {
  innerWidth: 1024,
  innerHeight: 700,
  visualViewport,
  addEventListener(type, listener) { windowListeners.set(type, listener); },
  removeEventListener(type, listener) {
    if (windowListeners.get(type) === listener) windowListeners.delete(type);
  }
};
const values = new Map();
const overlay = {
  style: { setProperty(name, value) { values.set(name, value); } }
};

const unbind = bindViewportMetrics(fakeWindow)(overlay);
assert.strictEqual(values.get('--blitz-viewport-width'), '1024px');
assert.strictEqual(values.get('--blitz-viewport-height'), '700px');

visualViewport.width = 820;
visualViewport.height = 560;
viewportListeners.get('resize')();
assert.strictEqual(values.get('--blitz-viewport-width'), '820px');
assert.strictEqual(values.get('--blitz-viewport-height'), '560px');

visualViewport.scale = 2;
visualViewport.width = 410;
visualViewport.height = 280;
viewportListeners.get('resize')();
assert.strictEqual(values.get('--blitz-viewport-width'), '820px', 'pinch zoom must not shrink the Blitz overlay');
assert.strictEqual(values.get('--blitz-viewport-height'), '560px', 'pinch zoom must not squash the Blitz overlay');

visualViewport.scale = 1;
viewportListeners.get('resize')();
assert.strictEqual(values.get('--blitz-viewport-width'), '410px', 'viewport metrics should refresh after zoom settles');
assert.strictEqual(values.get('--blitz-viewport-height'), '280px', 'viewport height should refresh after zoom settles');

unbind();
assert.strictEqual(windowListeners.size, 0, 'viewport cleanup should remove window listeners');
assert.strictEqual(viewportListeners.size, 0, 'viewport cleanup should remove visualViewport listeners');

console.log('Blitz viewport runtime test passed.');
