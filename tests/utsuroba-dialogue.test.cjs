#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js', 'utsuroba-dialogue.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context, { filename: 'utsuroba-dialogue.js' });

const dialogue = context.window.UTSUROBA_DIALOGUE;
const ids = ['ks', 'nto', 'cg', 'bh', 'bk', 'ph'];
assert.ok(dialogue && typeof dialogue === 'object', 'ambient dialogue should export a dialogue table');

for (const id of ids) {
  assert.ok(Array.isArray(dialogue[id]), `${id} needs weekly dialogue variants`);
  assert.strictEqual(dialogue[id].length, 3, `${id} should have three rotating variants`);
  for (const [variantIndex, variant] of dialogue[id].entries()) {
    for (const mode of ['idle', 'offer', 'restored']) {
      const line = variant[mode];
      assert.ok(line && line.en && line.jp, `${id} variant ${variantIndex + 1} needs ${mode} dialogue`);
      assert.ok(line.jp.text && line.jp.readings && Object.keys(line.jp.readings).length > 0,
        `${id} variant ${variantIndex + 1} ${mode} needs furigana readings`);
    }
  }
}

console.log('Utsuroba ambient dialogue tests passed.');
