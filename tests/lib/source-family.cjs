'use strict';

// Read a file together with the parts split off from it (its "family"), so
// text-contract tests keep passing when code moves between the main file and
// its parts. Families are declared in tests/source-families.json.
//
//   const { readFamily } = require('./lib/source-family.cjs');
//   const karasuki = readFamily('js/karasuki.js');   // main file + its parts
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { families } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'source-families.json'), 'utf8'));

function partsOf(file) {
  return Array.isArray(families[file]) ? families[file].slice() : [];
}

function readFamily(file) {
  return [file, ...partsOf(file)]
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n');
}

module.exports = { readFamily, partsOf, families };
