#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const syncClient = fs.readFileSync(path.join(root, 'js', 'sync-client.js'), 'utf8');

assert.match(syncClient, /SESSION_RESTORE_KEY/,
  'sync must keep same-tab restore state in a dedicated session key');
assert.match(syncClient, /SESSION_RESTORE_TTL_MS = 15 \* 60 \* 1000/,
  'same-tab restore shortcut must expire instead of becoming permanent');
assert.match(syncClient, /tokenFingerprint/,
  'same-tab restore state must be bound to the current token without storing the raw token');
assert.match(syncClient, /record\.userId !== uid\(\)/,
  'same-tab restore state must be bound to the current student');
assert.match(syncClient, /function canSkipSessionRestore\(blobs\)/,
  'sync must centralize the same-tab restore decision');
assert.match(syncClient, /isEffectivelyDirty\(blob, readLocal\(blob\)\)/,
  'dirty local progress must force normal cloud reconciliation');
assert.match(syncClient, /_blockedByConflict \|\| _meta\.blocked \|\| _meta\.conflict/,
  'conflicted sync state must force normal cloud reconciliation');
assert.match(syncClient, /if \(canSkipSessionRestore\(blobs\)\)/,
  'restore must use the bounded same-tab shortcut');
assert.match(syncClient, /markSessionRestored\(blobs\)/,
  'successful full restore must record the session shortcut');
assert.match(syncClient, /invalidateSessionRestore\(\);/,
  'conflicts must invalidate the shortcut');
const setDirtyBlock = syncClient.match(
  /function setDirty\(blob\) \{[\s\S]*?\n  \}/
);
assert.ok(setDirtyBlock, 'sync must keep a dedicated setDirty function');
assert.doesNotMatch(
  setDirtyBlock[0],
  /invalidateSessionRestore\(\);/,
  'dirty local work must rely on the dirty check and preserve the session marker after a successful push'
);

console.log('Sync session-restore audit passed: the shortcut is bounded, identity-bound, and fail-safe for dirty/conflicted progress.');
