#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(ROOT, 'js/karasuki-wanderer-data.js'), 'utf8');
const saveSource = fs.readFileSync(path.join(ROOT, 'js/core/save-file.js'), 'utf8');
const karasukiSource = fs.readFileSync(path.join(ROOT, 'js/karasuki.js'), 'utf8');

const expectedNames = [
  'Ichi', 'Mister Happy', 'Tom Katsu', 'Uhibon', 'Jacki', 'Jamariko', 'San', 'Gorogui', 'Sumiyo Horaguchi',
  'Amekuro', 'Snakuma', 'Robert', 'Jeffrey', 'Johnny', 'Nulvane', 'Ni', 'Columbus', 'October Moriyama',
  'Takachika Green', 'Pugoo', 'Ena Yamakage', 'Jubei Tsukigase', 'Denoying', 'Poopika', 'Whistler', 'Woozlebock', 'Tanoshiika',
  'Mikachan', 'Kara Ageha', 'Jinguru Kan', 'Oboteruyo', 'Mimasayuki', 'Mouhitome', 'Yūkan', 'Chillicothe', 'Shoganai',
];

const objectSource = dataSource.replace(/^\/\*[\s\S]*?\*\/\s*/, '').replace(/^window\.KARASUKI_WANDERER_DATA\s*=\s*/, '').replace(/;\s*$/, '');
const data = Function(`"use strict"; return (${objectSource});`)();

assert.deepStrictEqual(Object.keys(data), expectedNames, 'collection data should follow the 36-wanderer order');
for (const name of expectedNames) {
  const entry = data[name];
  assert.ok(entry && entry.id, `${name} should have a stable collection id`);
  assert.ok(entry.en && entry.jp, `${name} should have English and Japanese comments`);
  assert.ok(entry.furigana && typeof entry.furigana === 'object', `${name} should have a furigana map`);
}

assert.match(saveSource, /collection:\s*\{[\s\S]*?wanderers:\s*\{\}/,
  'save defaults should keep wanderer records in the permanent collection');
assert.match(saveSource, /Array\.isArray\(save\.collection\.wanderers\)/,
  'save migration should handle the earlier wanderer array scaffold');
assert.match(karasukiSource, /firstFoundAt:[\s\S]*?lastFoundAt:/,
  'Karasuki should preserve first-found and latest-visit timestamps');
assert.match(karasukiSource, /visits:\s*Math\.max\(0, Number\(previous\.visits\)/,
  'Karasuki should increment the permanent visit counter');

console.log('Karasuki wanderer collection tests passed.');
