const fs = require('fs');
const assert = require('assert');

const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

assert.match(engine, /function emitFireWallpaper\(overlay, playerName, threshold = 0\)/,
  'the playful fire milestone should have a dedicated wallpaper emitter');
assert.match(engine, /wallpaper\.className = 'booha-blitz-fire-wallpaper'/,
  'fire feedback should use a contained wallpaper layer');
assert.match(engine, /name\.textContent = playerName/,
  'the wallpaper should repeat the current player name');
assert.match(engine, /overlay\.insertBefore\(wallpaper, overlay\.firstChild\)/,
  'the wallpaper should sit behind the game content');
assert.match(engine, /if \(palette\.feel === 'playful'\) emitFireWallpaper\(overlay, spotlight\.playerName, eventThreshold\)/,
  'only playful fire milestones should trigger the fire wallpaper');
assert.match(engine, /setTimeout\(\(\) => wallpaper\.remove\(\), REDUCED_MOTION \? 520 : 1450\)/,
  'the wallpaper should be short-lived and cleaned up');
assert.match(engine, /\.booha-blitz-fire-wallpaper \{[\s\S]*?pointer-events: none;/,
  'the wallpaper must never block gameplay input');
assert.match(engine, /\.booha-blitz-fire-wallpaper \{[\s\S]*?z-index: 1;/,
  'the wallpaper must remain below the timer, prompt, answers, and streak HUD');
assert.match(engine, /\.booha-blitz-fire-wallpaper \{ animation: none; opacity: \.52; \}/,
  'reduced motion should use a static, restrained fire treatment');
assert.match(verify, /tests\/blitz-pass28-fire-wallpaper-audit\.cjs/,
  'verify.sh must run the Pass 3 fire-wallpaper audit');

console.log('Blitz Pass 3 fire-wallpaper audit passed: playful fire milestones use a short, non-blocking player-name wallpaper instead of a center popup.');
