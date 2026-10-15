#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'sync-client.js'), 'utf8');

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

const key = 'booha_sync_session:v1';
const stored = new Map([[key, JSON.stringify({
  userId: 'student-42',
  tokenFingerprint: 'fingerprint-1',
  restoredAt: 1000,
  blobs: ['adventure']
})]]);
const sessionStorage = {
  getItem(name) { return stored.has(name) ? stored.get(name) : null; },
  setItem(name, value) { stored.set(name, value); }
};

const markSessionRestored = new Function('deps', `
  const { sessionStorage, uid, sessionTokenFingerprint, clock } = deps;
  const SESSION_RESTORE_KEY = '${key}';
  const Date = clock;
  function sessionRestoreRecord() {
    try {
      const record = JSON.parse(sessionStorage.getItem(SESSION_RESTORE_KEY) || 'null');
      return record && typeof record === 'object' ? record : null;
    } catch (e) { return null; }
  }
  ${extractFunction(source, 'markSessionRestored')}
  return markSessionRestored;
`)({
  sessionStorage,
  uid: () => 'student-42',
  sessionTokenFingerprint: () => 'fingerprint-1',
  clock: { now: () => 2000 }
});

// A restore may mark one blob first, then a successful push may mark the
// sibling. The second mark must merge, not replace, the shortcut record.
markSessionRestored(['juku']);
let record = JSON.parse(stored.get(key));
assert.deepStrictEqual(new Set(record.blobs), new Set(['adventure', 'juku']));

markSessionRestored(['adventure']);
record = JSON.parse(stored.get(key));
assert.deepStrictEqual(new Set(record.blobs), new Set(['adventure', 'juku']));
assert.strictEqual(record.userId, 'student-42');
assert.strictEqual(record.tokenFingerprint, 'fingerprint-1');

console.log('Sync session-restore runtime test passed.');
