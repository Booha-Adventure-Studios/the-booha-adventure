#!/usr/bin/env node
'use strict';

// Pass 22D: index controls use the shared lazy WebAudio palette, with audible
// but capped feedback and no new music or audio-file requests.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sfx = fs.readFileSync(path.join(root, 'js', 'utsu-sfx.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(index.includes('<script src="js/utsu-sfx.js"></script>'), 'index must load the shared SFX palette');
assert(index.indexOf('<script src="js/utsu-sfx.js"></script>') < index.indexOf('<script src="pwa-init.js"></script>'), 'shared SFX must load before the remaining app modules');
assert(sw.includes('${BASE}/js/utsu-sfx.js'), 'service worker must precache the shared SFX helper');
assert(sw.includes('const CORE_ASSETS = ['), 'service worker must have an asset precache list for the shared SFX helper');
assert(index.includes('function playIndexSfx(name)'), 'index needs a guarded shared-SFX call helper');
['popupOpen', 'popupClose', 'panelOpen', 'panelClose', 'hubSelect', 'hubPrimary', 'mischiefReward', 'buttonPress'].forEach(name => {
  assert(index.includes(`playIndexSfx('${name}')`), `index must wire ${name} to an intentional control`);
});
assert(sfx.includes('var SFX_GAIN_BOOST = 1.9;'), 'shared SFX should use the audible UI boost');
assert(sfx.includes('var SFX_MAX_GAIN = 0.16;'), 'shared SFX boost must be capped');
assert(sfx.includes('Math.min(SFX_MAX_GAIN, requestedGain * SFX_GAIN_BOOST)'), 'shared SFX gain must use the capped boost');
assert(sfx.includes('hubPrimary: function ()'), 'shared palette needs a distinct primary hub motif');
assert(sfx.includes('hubSelect: function ()'), 'shared palette needs a distinct selection hub motif');
assert(!sfx.includes('new Audio('), 'button palette must not introduce audio-file playback');
assert(verify.includes('tests/index-sfx-audit.cjs'), 'verify.sh must run the 22D index SFX audit');

// Audio Pass 1: one shared engine. utsu-sfx.js uses js/booha-sfx.js's
// context (tap re-unlock after iPad interruptions) on every page that loads it.
for (const page of ['index.html', 'grimmerglen.html', 'adventure-profile.html', 'karasuki.html', 'utsuroba.html', 'muenba.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const engine = html.indexOf('<script src="js/booha-sfx.js"></script>');
  assert(engine > -1 && engine < html.indexOf('<script src="js/utsu-sfx.js"></script>'), `${page} must load booha-sfx.js before utsu-sfx.js`);
}
assert(sfx.includes('window.BoohaSFX.context()'), 'utsu-sfx must share the BoohaSFX context');
assert(sfx.includes("ctx.state !== 'running' && ctx.state !== 'closed'"), "utsu-sfx must resume from iPad's 'interrupted' state too");
assert(sfx.includes('resumed.catch(function () {})'), 'a refused resume must not raise an unhandled rejection');
const toast = fs.readFileSync(path.join(root, 'js', 'ui', 'medal-toast.js'), 'utf8');
// Audio Pass 2: each reward kind has its own jingle on the shared context.
assert(/function playSound\(sound\) \{[\s\S]*?playTune\(toastTune\(sound\)\)/.test(toast), 'medal toast plays a reward jingle');
assert(toast.includes("c.state !== 'running'"), 'a jingle never starts late on a context that is not running');
{
  const vm = require('vm');
  const sb = { window: {}, document: { addEventListener() {}, currentScript: null } }; sb.window.window = sb.window;
  vm.runInNewContext(toast, sb);
  const T = sb.window.BoohaMedalToast.toastTune;
  const len = s => T(s).length;
  const top = s => Math.max(...T(s).filter(e => e.kind === 'pop').map(e => e.note));
  assert(len({ kind: 'medal', tier: 'gold' }) > len({ kind: 'medal', tier: 'silver' }) && len({ kind: 'medal', tier: 'silver' }) > len({ kind: 'medal', tier: 'bronze' }), 'medal jingles grow bronze → silver → gold');
  assert(top({ kind: 'level', level: 9 }) > top({ kind: 'level', level: 5 }) && top({ kind: 'level', level: 5 }) > top({ kind: 'level', level: 1 }), 'level-up climbs with the level');
  assert(T({ kind: 'level', level: 3 }).some(e => e.kind === 'coin'), 'level-up has the coin ka-ching');
  assert(T({ kind: 'find', special: true }).some(e => e.kind === 'bell') && !T({ kind: 'find' }).some(e => e.kind === 'bell'), 'special finds add the low bell');
}
for (const [kind, re] of [['medal', /sound: \{ kind: 'medal', tier: m\.tier \}/], ['level', /sound: \{ kind: 'level', level: level \}/], ['find', /sound: \{ kind: 'find', special:/]]) {
  assert(re.test(toast), `${kind} toasts carry their jingle`);
}
for (const page of ['maze.html', 'profile.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const engine = html.indexOf('<script src="./js/booha-sfx.js"></script>');
  assert(engine > -1 && engine < html.indexOf('<script src="./js/ui/medal-toast.js"></script>'), `${page} must load booha-sfx.js before the medal toast`);
}
const utils = fs.readFileSync(path.join(root, 'js', 'game-utils.js'), 'utf8');
assert(!utils.includes('resultSoundFor'), 'the old result-mp3 helper stays removed');
for (const g of ['spell-word.js', 'sentence-order.js']) {
  assert(!fs.readFileSync(path.join(root, 'games', g), 'utf8').includes('unlockCtx'), `${g} must not create a second AudioContext`);
}
for (const g of ['vocab-speed.js', 'sentence-speed.js']) {
  assert(!fs.readFileSync(path.join(root, 'games', g), 'utf8').includes('resultAudio'), `${g}: unused result audio stays removed`);
}

console.log('Index 22D SFX audit passed: shared WebAudio is audibly boosted, capped, and varied across hub controls.');
