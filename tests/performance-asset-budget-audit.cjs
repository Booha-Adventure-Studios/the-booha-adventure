#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const imageRoot = path.join(root, 'assets', 'img');
const familyRoomRoot = path.join(root, 'assets', 'family-room');
const convertedRoots = [
  path.join(imageRoot, 'wanderers'),
  path.join(imageRoot, 'drifters'),
  path.join(imageRoot, 'grimmerglen', 'dance'),
  path.join(imageRoot, 'grimmerglen', 'marietta'),
  path.join(imageRoot, 'muenba', 'ghosts'),
];

function files(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...files(file));
    else if (/\.webp$/i.test(entry.name)) result.push(file);
  }
  return result;
}

function inspect(file) {
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${file} must have a RIFF header`);
  assert.strictEqual(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${file} must have a WebP signature`);
  const chunks = [];
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.subarray(offset, offset + 4).toString('ascii');
    const size = bytes.readUInt32LE(offset + 4);
    chunks.push(type);
    offset += 8 + size + (size % 2);
  }
  return { bytes: bytes.length, chunks, vp8l: chunks.includes('VP8L'), lossy: chunks.includes('VP8 '), alpha: chunks.includes('ALPH') || (chunks.includes('VP8X') && (bytes[20] & 0x10) !== 0) };
}

const all = files(imageRoot);
const records = all.map(file => ({ file, ...inspect(file) }));
const vp8l = records.filter(record => record.vp8l);
const lossy = records.filter(record => record.lossy);
const converted = convertedRoots.flatMap(dir => files(dir)).filter(file => !file.endsWith('kurobane_shizuma-profile.webp'));
for (const file of converted) {
  const record = records.find(candidate => candidate.file === file);
  assert(record.lossy && record.alpha, `${path.relative(root, file)} must retain transparent lossy WebP encoding`);
  assert(record.bytes <= 1.5 * 1024 * 1024, `${path.relative(root, file)} is unexpectedly oversized after conversion`);
}

// Pass 8: the remaining lossless files are intentional and explicit. This
// prevents the deployed image set from quietly accumulating new VP8L files.
const losslessAllowlist = new Set([
  'utsuroba_icon.webp',
  'tree-arch.webp',
  'uhibon/chat-uhi.webp',
  'uhibon/uhi-st.webp',
  'uhibon/uhi-t1.webp',
  'uhibon/uhi-t2.webp',
  'uhibon/uhi-w.webp',
  'grimmerglen/booha_grimmerglen.webp',
  'grimmerglen/booha_grimmerglen_version_0.webp',
  'memory_box.webp',
  'juku-tree.webp',
  'karasuki/observer-1.webp',
  'karasuki/observer-2.webp',
  'muenba/muenba_logo.webp',
  'grimmerglen/collectibles/book.webp',
  'grimmerglen/collectibles/backpack.webp',
  'grimmerglen/collectibles/teddy_bear.webp',
  'grimmerglen/collectibles/pillow.webp',
  'grimmerglen/collectibles/ticket.webp',
  'grimmerglen/collectibles/banner.webp',
  'grimmerglen/collectibles/ball.webp',
  'grimmerglen/collectibles/to_go_coffee_cup.webp',
]);
const actualLossless = new Set(vp8l.map(record => path.relative(imageRoot, record.file)));
assert.deepStrictEqual([...actualLossless].sort(), [...losslessAllowlist].sort(), 'remaining VP8L files must match the intentional lossless allowlist');

// The root conversion keeps the source canvas dimensions and transparency
// contract stable for every live consumer.
const convertedRootDimensions = new Map([
  ['background-1.webp', [1536, 1024, false]],
  ['blue-boo.webp', [1024, 1024, true]],
  ['boo-moon.webp', [1024, 1024, true]],
  ['extra-boo-aqua.webp', [1024, 1024, true]],
  ['extra-boo-candy.webp', [1024, 1024, true]],
  ['extra-boo-gold.webp', [1254, 1254, true]],
  ['extra-boo-lime.webp', [1024, 1024, true]],
  ['extra-boo-mint.webp', [1024, 1024, true]],
  ['extra-boo-orange.webp', [1024, 1024, true]],
  ['extra-boo-peach.webp', [1024, 1024, true]],
  ['extra-boo-rose.webp', [1024, 1024, true]],
  ['extra-boo-sky.webp', [1024, 1024, true]],
  ['extra-boo-violet.webp', [1024, 1024, true]],
  ['green-boo.webp', [1024, 1024, true]],
  ['homework-tree.webp', [1536, 1024, true]],
  ['karasuki1-tree.webp', [1024, 1536, true]],
  ['karasuki2-tree.webp', [1024, 1536, true]],
  ['maze.webp', [1536, 1024, false]],
  ['pink-boo.webp', [1024, 1024, true]],
  ['purple-boo.webp', [1024, 1024, true]],
]);
for (const [relative, [width, height, hasAlpha]] of convertedRootDimensions) {
  const file = path.join(imageRoot, relative);
  const record = records.find(candidate => candidate.file === file);
  assert(record && record.lossy, `${relative} must use lossy VP8 encoding after root conversion`);
  assert.strictEqual(record.alpha, hasAlpha, `${relative} must preserve its transparency contract`);
  const dimensions = childProcess.execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0:s=x', file,
  ], { encoding: 'utf8' }).trim().split('x').map(Number);
  assert.deepStrictEqual(dimensions, [width, height], `${relative} must preserve its exact canvas dimensions`);
}

const losslessDimensions = new Map([
  ['utsuroba_icon.webp', [384, 576]],
  ['tree-arch.webp', [1536, 1024]],
  ['uhibon/chat-uhi.webp', [384, 384]],
  ['uhibon/uhi-st.webp', [384, 384]],
  ['uhibon/uhi-t1.webp', [384, 384]],
  ['uhibon/uhi-t2.webp', [384, 384]],
  ['uhibon/uhi-w.webp', [384, 384]],
]);
for (const [relative, [width, height]] of losslessDimensions) {
  const file = path.join(imageRoot, relative);
  const dimensions = childProcess.execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0:s=x', file,
  ], { encoding: 'utf8' }).trim().split('x').map(Number);
  assert.deepStrictEqual(dimensions, [width, height], `${relative} must keep its production display-resolution canvas`);
}

// Pass 9: use both local ceilings and a global ceiling. The file limits cover
// every deployed image directory, including future files outside convertedRoots.
const directoryBudgets = new Map([
  ['root', 8 * 1024 * 1024],
  ['drifters', 1.8 * 1024 * 1024],
  ['grimmerglen', 12.9 * 1024 * 1024],
  ['karasuki', 3.5 * 1024 * 1024],
  ['muenba', 9.2 * 1024 * 1024],
  ['utsuroba', 5.75 * 1024 * 1024],
  ['wanderers', 11.5 * 1024 * 1024],
  ['profile', 1.6 * 1024 * 1024],
  ['blitz', 1.4 * 1024 * 1024],
  ['menu', 0.5 * 1024 * 1024],
]);
for (const [directory, budget] of directoryBudgets) {
  const bytes = records
    .filter(record => {
      const relative = path.relative(imageRoot, record.file);
      return (relative.includes('/') ? relative.split('/')[0] : 'root') === directory;
    })
    .reduce((sum, record) => sum + record.bytes, 0);
  assert(bytes <= budget, `${directory} image payload exceeds ${budget} bytes (got ${bytes})`);
}
records.forEach(record => {
  const relative = path.relative(imageRoot, record.file);
  if (losslessAllowlist.has(relative)) {
    assert(record.bytes <= 2 * 1024 * 1024, `${relative} exceeds the explicit lossless-file ceiling`);
  } else {
    assert(record.bytes <= 700 * 1024, `${relative} exceeds the deployed per-file image ceiling`);
  }
});

// Trophy Case pass (2026-10-22): count every raster under assets/img, not
// only WebP. Source PNG originals that have a WebP twin are allowed to stay in
// the repo only while nothing in the app references them (so no device ever
// downloads them); any other PNG/JPG/GIF counts toward the budget like a WebP.
const sourceOriginals = new Set([
  'muenba/ghost-orb-background-v1.png',
  'muenba/ghost-orb-jar-v1.png',
  'family-room/flashlight.png',
  'tree-arch.png',
  'hw-background-1.png',
  'uhibon/uhi-w.png',
  'uhibon/uhi-t1.png',
  'uhibon/uhi-t2.png',
  'uhibon/uhi-st.png',
  'uhibon/chat-uhi.png',
]);
const countedRasters = new Map([['juku-logo.png', 100 * 1024]]);
function rasters(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...rasters(file));
    else if (/\.(png|jpe?g|gif)$/i.test(entry.name)) result.push(file);
  }
  return result;
}
function runtimeSources(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'tests', 'assets', 'docs', 'tmp'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) runtimeSources(file, out);
    else if (/\.(js|html|css|json|webmanifest)$/i.test(entry.name)) out.push(file);
  }
  return out;
}
const runtimeText = runtimeSources(root).map(file => fs.readFileSync(file, 'utf8')).join('\n');
let rasterBytes = 0;
for (const file of rasters(imageRoot)) {
  const relative = path.relative(imageRoot, file);
  const bytes = fs.statSync(file).size;
  if (sourceOriginals.has(relative)) {
    assert(!runtimeText.includes(path.basename(relative)),
      `${relative} is a source original and must stay unreferenced (use its WebP twin)`);
    continue;
  }
  assert(countedRasters.has(relative), `${relative} is a non-WebP image; convert it to WebP or allowlist it with a ceiling`);
  assert(bytes <= countedRasters.get(relative), `${relative} exceeds its raster ceiling`);
  rasterBytes += bytes;
}

// Permanent trophy and weekly medal art is drawn at 72px (≈216px on a 3x
// phone): keep every medal small so the profile shelf decodes instantly.
records
  .filter(record => /^profile\/medal-[^/]+\.webp$/.test(path.relative(imageRoot, record.file)))
  .forEach(record => {
    const relative = path.relative(imageRoot, record.file);
    assert(record.bytes <= 48 * 1024, `${relative} exceeds the 48 KiB medal ceiling`);
    const [w, h] = childProcess.execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
      '-of', 'csv=p=0:s=x', record.file,
    ], { encoding: 'utf8' }).trim().split('x').map(Number);
    assert(w <= 256 && h <= 256, `${relative} must be at most 256px (got ${w}x${h})`);
  });

// Smoothness comes from the per-file, per-directory and decode ceilings above
// plus lazy loading; the global total only bounds what a full visit of every
// world eventually downloads. 52 MiB keeps ~1.8 MiB of headroom over today.
const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0) + rasterBytes;
assert(totalBytes <= 52 * 1024 * 1024, `deployed image payload exceeds the 52 MiB performance budget (got ${totalBytes})`);

// Family Room lives outside assets/img, but its images are deployed just the
// same. Keep the six small authored Genkan overlays lossless for crisp alpha
// edges; room bases and Pataskala poses must use the normal 700 KiB ceiling.
const familyRoomFiles = files(familyRoomRoot);
const familyRoomRecords = familyRoomFiles.map(file => ({ file, ...inspect(file) }));
const familyLosslessAllowlist = new Set([
  'family-room/overlays/genkan_coat_turn.webp',
  'family-room/overlays/genkan_door_shadow.webp',
  'family-room/overlays/genkan_shoes_extra.webp',
  'family-room/overlays/genkan_threshold_talisman.webp',
  'family-room/overlays/genkan_umbrella_floor.webp',
  'family-room/overlays/genkan_wet_footprints.webp',
]);
const actualFamilyLossless = new Set(familyRoomRecords
  .filter(record => record.vp8l)
  .map(record => path.relative(path.join(root, 'assets'), record.file)));
assert.deepStrictEqual(
  [...actualFamilyLossless].sort(),
  [...familyLosslessAllowlist].sort(),
  'Family Room lossless WebPs must match the explicit overlay allowlist'
);
familyRoomRecords.forEach(record => {
  const relative = path.relative(path.join(root, 'assets'), record.file);
  assert(record.bytes <= 700 * 1024, `${relative} exceeds the 700 KiB Family Room image budget`);
});
const familyRoomBytes = familyRoomRecords.reduce((sum, record) => sum + record.bytes, 0);
assert(familyRoomBytes <= 3 * 1024 * 1024,
  `Family Room image payload exceeds the 3 MiB directory budget (got ${familyRoomBytes} bytes)`);
console.log(`Asset budget audit passed: VP8L ${vp8l.length} files/${vp8l.reduce((s,r)=>s+r.bytes,0)} bytes; lossy ${lossy.length} files/${lossy.reduce((s,r)=>s+r.bytes,0)} bytes; assets/img and Family Room ceilings pass; deployed image payload ${totalBytes} bytes; Family Room ${familyRoomBytes} bytes.`);
