const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const save = read('js/core/save-file.js');
const helper = read('js/core/curriculum.js');
const token = read('js/token.js');
const index = read('index.html');
const daily = read('js/daily-check.js');
const blitz = read('js/blitz-engine.js');
const maze = read('js/maze-seasonal-unlock.js');

assert.match(save, /curriculum:\s+null/, 'save defaults must include meta.curriculum');
assert.match(save, /\['pb', 'br', 'bc'\]\.includes\(save\.meta\.curriculum\)/,
  'save migration must validate the curriculum enum');
assert.match(helper, /function get\(\)/, 'curriculum helper must expose get');
assert.match(helper, /function set\(code\)/, 'curriculum helper must expose set');
assert.match(helper, /function ensureDefault\(\)/, 'curriculum helper must expose the quiet Pre-Boo default');
assert.match(helper, /function hydrateMirror\(\)/, 'curriculum helper must hydrate after sync');
assert.match(token, /KEY_CURRICULUM\s*=\s*'booha_last_curr'/,
  'token gate must own the local curriculum key');
assert.match(token, /removeItem\(KEY_CURRICULUM\)/,
  'login cleanup must clear the local curriculum mirror');
assert.match(token, /booha:syncReady[\s\S]*?hydrateMirror\?\.\(\) \|\| window\.BoohaCurriculum\?\.ensureDefault\?\.\(\)/,
  'sync-ready must hydrate the saved curriculum or initialize Pre-Boo');
assert.match(index, /js\/core\/curriculum\.js/, 'hub must load the curriculum helper');
assert.match(index, /BoohaCurriculum\?\.get\?\.\(\) \|\| 'pb'/,
  'hub Blitz state must start from the saved curriculum');
assert.match(index, /const savedCurr = window\.BoohaCurriculum\?\.get\?\.\(\) \|\| 'pb';[\s\S]*?navigateToCurriculum\(wk\.weekId, savedCurr\)/,
  'week taps must use the remembered curriculum or quiet Pre-Boo default');
assert.doesNotMatch(index, /maybeOpenInitialCurriculumPicker|mode: 'initial'/,
  'first hub load must not interrupt students with a curriculum picker');
assert.match(index, /mode === 'change'/, 'picker must support change mode');
assert.match(index, /renderHomeworkTrack\(window\.BoohaCurriculum\?\.get\?\.\(\) \|\| 'pb'\)/,
  'homework must open on the saved curriculum');
assert.match(daily, /BoohaCurriculum\?\.get/, 'daily check must read the saved curriculum');
assert.match(blitz, /BoohaCurriculum\?\.get/, 'Blitz records must read the saved curriculum');
assert.match(maze, /BoohaCurriculum\?\.get/, 'seasonal Blitz state must read the saved curriculum');

console.log('curriculum state audit: passed');
