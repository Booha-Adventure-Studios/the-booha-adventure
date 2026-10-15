#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');

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

function classList() {
  const names = new Set();
  return {
    add(name) { names.add(name); },
    remove(name) { names.delete(name); },
    has(name) { return names.has(name); },
  };
}

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    dispatch(type, event = {}) {
      let prevented = false;
      event.preventDefault = () => { prevented = true; };
      listeners.get(type)?.(event);
      return prevented;
    },
    listeners,
  };
}

const windowTarget = eventTarget();
const root = { classList: classList() };
const body = { classList: classList() };
const document = { documentElement: root, body };
const bindLock = new Function('window', 'document', `${extractFunction(engine, 'bindBlitzInteractionLock')}; return bindBlitzInteractionLock;`)(windowTarget, document);
const overlay = eventTarget();

const release = bindLock(overlay);
assert.strictEqual(root.classList.has('blitz-active'), true, 'Blitz should mark the document root while active');
assert.strictEqual(body.classList.has('blitz-active'), true, 'Blitz should mark the body while active');
assert.strictEqual(windowTarget.listeners.size, 4, 'Blitz should install three Safari gesture guards and one touch guard');

assert.strictEqual(windowTarget.dispatch('gesturestart'), true, 'gesturestart must be cancelled during Blitz');
assert.strictEqual(windowTarget.dispatch('gesturechange'), true, 'gesturechange must be cancelled during Blitz');
assert.strictEqual(windowTarget.dispatch('gestureend'), true, 'gestureend must be cancelled during Blitz');
assert.strictEqual(windowTarget.dispatch('touchmove', { touches: [{}, {}] }), true, 'multi-touch movement must be cancelled during Blitz');
assert.strictEqual(windowTarget.dispatch('touchmove', { touches: [{}] }), false, 'single-finger touch movement must remain available to controls');

release();
assert.strictEqual(root.classList.has('blitz-active'), false, 'Blitz cleanup must release the document root lock');
assert.strictEqual(body.classList.has('blitz-active'), false, 'Blitz cleanup must release the body lock');
assert.strictEqual(windowTarget.listeners.size, 0, 'Blitz cleanup must remove every gesture guard');

console.log('Blitz input-lock runtime test passed.');
