#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(runtime.includes('function ensureGrimmerglenObjectImage(type)'),
  'Grimmerglen must define an on-demand collectible image loader');
assert(!/Object\.keys\(DATA\.collectibles \|\| \{\}\)\.forEach\(type => \{\s*const image = new Image\(\)/.test(runtime),
  'collectible images must not all be constructed at module load');
assert(runtime.includes('const image = ensureGrimmerglenObjectImage(object.type);'),
  'visible collectible objects must request their image on demand');
assert(runtime.includes('const image = ensureGrimmerglenObjectImage(carriedObject.type);'),
  'carried collectible objects must request their image on demand');
assert(verify.includes('tests/grimmerglen-collectible-image-lifecycle-audit.cjs'),
  'verify.sh must run the Grimmerglen collectible-image lifecycle audit');

console.log('Grimmerglen collectible image lifecycle audit passed: collectible art is requested on demand, not eagerly at world entry.');
