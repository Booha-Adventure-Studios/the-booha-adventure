#!/usr/bin/env node
'use strict';

// Pass 4: long-form world music must not be constructed during initial boot.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cases = [
  {
    file: 'js/karasuki.js',
    track: 'assets/audio/karasuki-music.mp3',
    factory: 'ensureKarasukiMusic',
    play: 'playKarasukiMusic',
  },
  {
    file: 'js/utsuroba.js',
    track: './assets/audio/utsuroba-music.mp3',
    factory: 'ensureUtsurobaMusic',
    play: 'playUtsurobaMusic',
  },
  {
    file: 'happy_house.html',
    track: 'assets/happy_house/happy-house.mp3',
    factory: 'ensureHappyHouseBgm',
    play: 'startBGM',
  },
];

cases.forEach(({ file, track, factory, play }) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert(source.includes(`new Audio('${track}')`), `${file} must retain its world music track`);
  assert(source.includes(`function ${factory}()`), `${file} must define a lazy music factory`);
  assert(source.includes(`${factory}().play()`), `${file} must create music at playback time`);
  assert(source.includes(play), `${file} must retain its playback entry point`);
  assert(!source.includes(`const music = new Audio('${track}')`), `${file} must not eagerly construct its music element`);
  assert(!source.includes(`const bgm = new Audio('${track}')`), `${file} must not eagerly construct its BGM element`);
});

const utsuroba = fs.readFileSync(path.join(root, 'js/utsuroba.js'), 'utf8');
assert(utsuroba.includes("new Audio('./assets/audio/boo-dance.mp3')"), 'Utsuroba must retain its celebration track');
assert(utsuroba.includes('function ensureUtsurobaDanceAudio()'), 'Utsuroba celebration audio must also be lazy');
assert(utsuroba.includes('ensureUtsurobaDanceAudio()'), 'Utsuroba must create the celebration track only when celebration starts');

console.log('Pass 4 audit passed: Karasuki, Utsuroba, and Happy House world music are deferred until playback.');
