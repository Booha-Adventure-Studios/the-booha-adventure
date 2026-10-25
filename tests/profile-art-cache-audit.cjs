#!/usr/bin/env node
'use strict';
/*
 * Profile art caching — art replaced in place must reach installed iPads:
 *  1. every medal / trophy / coin / chest URL goes through BoohaProfileArt.url
 *     (one ART_REV in js/core/profile-art.js) and the files exist;
 *  2. the service worker fetches cache-missed static images with no-store,
 *     and only images;
 *  3. profile pages load the lightweight js/core/sw-register.js; world and
 *     game pages do not (a reload there could interrupt a round).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* 1. Shared helper */
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('js/core/profile-art.js'), ctx);
const A = ctx.BoohaProfileArt;
assert.match(A.REV, /^\S+$/, 'ART_REV is set');
assert.strictEqual(A.url('medal-warm-up.webp'), `assets/img/profile/medal-warm-up.webp?v=${A.REV}`);
assert.strictEqual(A.url('x.webp', '/root/'), `/root/assets/img/profile/x.webp?v=${A.REV}`);
assert.strictEqual((read('js/core/profile-art.js').match(/const ART_REV = '/g) || []).length, 1, 'one revision tag');

const pg = read('js/ui/profile-game.js');
const mt = read('js/ui/medal-toast.js');
assert.ok(!/\$\{IMG\}|IMG \+ (?!file)/.test(pg), 'profile-game builds every profile-art URL through profileArt()');
assert.ok(!/IMG \+ (?!file)/.test(mt), 'medal-toast builds every profile-art URL through profileArt()');
assert.match(pg, /BoohaProfileArt\.url\(file\)/);
for (const [name, src] of [['profile-game', pg], ['medal-toast', mt]]) {
  // A local variable with the helper's name would shadow it (temporal dead zone crash).
  assert.strictEqual((src.match(/(const|let|var|function) profileArt\b/g) || []).length, 1, `${name}: profileArt declared once, never shadowed`);
  assert.ok(!/\$\{art\(|[^.\w]art\(/.test(src), `${name}: no calls to a bare art() helper`);
}
assert.match(mt, /BoohaProfileArt\.url\(file, ROOT\)/);
for (const [page, prefix] of [['profile.html', './'], ['index.html', ''], ['maze.html', './'], ['game.html', '/the-booha-adventure/']]) {
  const html = read(page);
  const at = html.indexOf(`<script src="${prefix}js/core/profile-art.js"></script>`);
  assert.ok(at > 0, `${page} loads profile-art.js`);
  assert.ok(at < html.indexOf('js/ui/medal-toast.js'), `${page}: profile-art.js before medal-toast.js`);
}
// Every medal and trophy image named in the data exists.
const names = new Set();
for (const f of ['js/core/weekly-medals.js', 'js/core/trophy-case.js']) {
  for (const m of read(f).matchAll(/img:\s*'([^']+\.webp)'/g)) names.add(m[1]);
}
['pb', 'br', 'bc'].forEach(c => names.add(`medal-${c}-champion.webp`));
for (let i = 1; i <= 9; i++) names.add(`rank-coin-${i}.webp`);
['treasure-chest-open.webp', 'treasure-chest-closed.webp', 'arcade-week-boss.webp'].forEach(n => names.add(n));
for (const n of names) assert.ok(fs.existsSync(path.join(ROOT, 'assets/img/profile', n)), `missing art: ${n}`);

/* 2. Service worker */
const sw = read('sw.js');
const cf = sw.slice(sw.indexOf('async function cacheFirst'), sw.indexOf('async function networkFirst'));
assert.match(sw, /const STATIC_IMAGE = \/\\\.\(webp\|png\|jpe\?g\|gif\|svg\|avif\)\$\/i;/);
assert.match(cf, /isImage \? await fetch\(request, \{ cache: 'no-store' \}\) : await fetch\(request\)/, 'no-store for image misses only');
assert.ok(cf.indexOf('cache.match(request)') < cf.indexOf("cache: 'no-store'"), 'cached images are still served first');
const swr = sw.slice(sw.indexOf('async function staleWhileRevalidate'), sw.indexOf('// Static images are sometimes replaced'));
const nf = sw.slice(sw.indexOf('async function networkFirst'), sw.indexOf('async function offlineFallback'));
assert.ok(!/no-store/.test(nf), 'network-first unchanged');
assert.ok(!/no-store/.test(swr), 'other strategies unchanged');

/* 3. Registration module */
const reg = read('js/core/sw-register.js');
assert.match(reg, /window\.__boohaSwRegister/);
assert.match(reg, /SKIP_WAITING/);
assert.match(reg, /if \(refreshing \|\| !hadController\) return;/, 'no reload on first install');
assert.ok(!/\(\?<[=!]/.test(reg + read('js/core/profile-art.js')), 'no regex lookbehind');
const profiles = ['profile.html', 'adventure-profile.html', 'utsuroba-profile.html', 'muenba-profile.html', 'grimmerglen-profile.html'];
for (const p of profiles) assert.match(read(p), /<script src="\.\/js\/core\/sw-register\.js"><\/script>/, `${p} loads sw-register.js`);
for (const f of fs.readdirSync(ROOT).filter(n => n.endsWith('.html') && !profiles.includes(n))) {
  assert.ok(!read(f).includes('sw-register.js'), `${f} must not load sw-register.js (a reload could interrupt play)`);
}

console.log('Profile art cache audit passed.');
