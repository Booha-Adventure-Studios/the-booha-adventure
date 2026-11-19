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

// Audio Pass 3: standalone bonus pages.
{
  const blocks = fs.readFileSync(path.join(root, 'booha_blocks.html'), 'utf8');
  const feedPage = fs.readFileSync(path.join(root, 'feed_booha.html'), 'utf8');
  const feed = fs.readFileSync(path.join(root, 'js', 'feed_booha_1.js'), 'utf8');
  const jingle = fs.readFileSync(path.join(root, 'js', 'bonus-jingle.js'), 'utf8');
  assert(blocks.includes('<script src="./js/booha-sfx.js"></script>') && blocks.includes('<script src="./js/bonus-jingle.js"></script>'), 'Blocks loads the shared engine and the end jingle');
  assert(!blocks.includes('bgmAudio.volume=0;'), 'Blocks must not unlock with volume 0 (iPad ignores it; the music blips)');
  assert(/const els=\[bgmAudio,dangerAudio,goAudio\];[\s\S]*?a\.muted=true/.test(blocks), 'Blocks unlocks music, danger and game-over muted inside the start tap');
  assert(/function playSFX\(f,v=1\)\{ if\(!audioUnlocked\) return; if\(playBuffered\(f,v\)\) return;/.test(blocks), 'Blocks SFX prefer decoded buffers');
  assert(blocks.includes('if(!playBuffered(SFX.gameOver,.95))'), 'Blocks game over prefers the decoded buffer');
  assert(/BoohaBonusJingle\.play\(\{stars,newBest:prevBest>0&&score>prevBest\}\)/.test(blocks), 'Blocks plays the star-following end jingle');
  assert(feedPage.indexOf('<script src="./js/booha-sfx.js"></script>') > -1 && feedPage.indexOf('<script src="./js/booha-sfx.js"></script>') < feedPage.indexOf('<script src="./js/feed_booha_1.js"></script>'), 'Feed Booha loads the shared engine first');
  assert(/S\.isRunning\(\) && S\.has\('feed:' \+ file\)/.test(feed), 'Feed Booha eat sounds prefer decoded buffers');
  assert(!/function playFile\(|function stopFile\(/.test(feed), 'unused Feed Booha file helpers stay removed');
  assert(feed.includes("audioCtx.state !== 'running' && audioCtx.state !== 'closed'"), 'Feed Booha resumes from any non-running state');
  assert(sw.includes('${BASE}/js/bonus-jingle.js'), 'service worker precaches the bonus jingle');
  assert(jingle.includes("c.state !== 'running'"), 'the bonus jingle never starts late');
  const vm = require('vm');
  const sb = { window: {} }; sb.window.window = sb.window;
  vm.runInNewContext(jingle, sb);
  const T = sb.window.BoohaBonusJingle.tune;
  const top = n => Math.max(...T(n, false).filter(e => e.kind === 'pop').map(e => e.note));
  assert(top(3) > top(2) && top(2) > top(1) && top(1) > top(0), 'the end jingle climbs with the stars');
  assert(T(2, true).length > T(2, false).length, 'a new best adds a sparkle run');
}

// Audio Pass 4: music volume that works on iPad.
{
  const vm = require('vm');
  const engine = fs.readFileSync(path.join(root, 'js', 'booha-sfx.js'), 'utf8');
  const run = (ios) => {
    const routed = [];
    const ctx = {
      state: 'running', destination: {},
      createGain() { return { gain: { value: 1 }, connect() {} }; },
      createMediaElementSource(el) { routed.push(el); return { connect() {} }; },
    };
    const doc = {
      addEventListener() {}, removeEventListener() {}, visibilityState: 'visible',
      createElement() { let v = 1; return { get volume() { return v; }, set volume(x) { if (!ios) v = x; } }; },
    };
    const win = { addEventListener() {}, document: doc, AudioContext: function () { return ctx; } };
    win.window = win;
    vm.runInNewContext(engine, { window: win, document: doc, navigator: {}, console, setTimeout, Map, WeakMap, Promise });
    const el = { volume: 1 };
    win.BoohaSFX.setVolume(el, 0.3);
    win.BoohaSFX.setVolume(el, 0.6);
    return { routed, el };
  };
  const ipad = run(true), desk = run(false);
  assert.strictEqual(ipad.routed.length, 1, 'iPad: the element is routed through a gain once');
  assert.strictEqual(desk.routed.length, 0, 'desktop: the element keeps its own volume (no routing)');
  assert.strictEqual(desk.el.volume, 0.6, 'desktop: volume lands on the element');
  const tracks = {
    'js/muenba.js': ['setTrackVolume(music, MUENBA_MUSIC_VOLUME)', 'setTrackVolume(music, MUENBA_SCREAM_DUCK_VOLUME)', 'setTrackVolume(dangerRhythmMusic', 'setTrackVolume(muenbaDance'],
    'js/grimmerglen.js': ['setTrackVolume(grimmerglenMusic', 'setTrackVolume(grimmerglenDance', 'setTrackVolume(boohaChangeAudio, 0)'],
    'js/utsuroba.js': ['setTrackVolume(music, 0.65)', 'setTrackVolume(booDance'],
    'js/karasuki.js': ['setTrackVolume(music, 0.65)'],
    'js/invaders-engine.js': ['setTrackVolume(bossBgm, 0.9)', 'setTrackVolume(bgm, 0.6)'],
    'booha_blocks.html': ['setTrackVolume(bgmAudio,0.28)', 'setTrackVolume(dangerAudio,0.55)', 'setTrackVolume(goAudio,0.95)'],
    'happy_house.html': ['setTrackVolume(bgm, 0.65)'],
  };
  for (const [file, calls] of Object.entries(tracks)) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    calls.forEach(c => assert(src.includes(c), `${file} must set music volume through setTrackVolume: ${c}`));
    assert(src.includes('BoohaSFX.setVolume'), `${file} must route through BoohaSFX.setVolume`);
  }
  for (const page of ['booha_invaders.html', 'happy_house.html']) {
    assert(fs.readFileSync(path.join(root, page), 'utf8').includes('<script src="./js/booha-sfx.js"></script>'), `${page} must load the shared engine`);
  }
}

console.log('Index 22D SFX audit passed: shared WebAudio is audibly boosted, capped, and varied across hub controls.');
