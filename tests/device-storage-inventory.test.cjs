#!/usr/bin/env node
'use strict';

// Whole-codebase storage inventory (Nov 2026). Every localStorage and
// sessionStorage key the app reads, writes or removes must be classified
// below. A new key fails this test until someone decides where it belongs.
// Source-based only: key names and code shape, never stored values.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');

const LOCAL = {
  // Identity: written and cleared by js/token.js on every sign-in, rejection
  // and logout; other files may read them.
  identity: ['booha_token', 'booha_userid', 'booha_token_expires', 'booha_first_name',
    'booha_is_juku', 'booha_last_validated_at', 'booha_last_curr'],
  // Device preferences: about the iPad, not about a student.
  // booha_profile_curr only picks the curriculum tab the profile opens to.
  devicePreference: ['booha_utsu_jp', 'booha_menu_sfx_muted', 'booha_invaders_muted',
    'booha_destruction_muted', 'booha_profile_curr'],
  // Device infrastructure.
  deviceInfrastructure: ['booha_device:v1', 'booha_install_shown'],
  // Shared UX and navigation flags (not progress, not identity).
  sharedUx: ['booha_closet_intro_v1', 'hh_return_scene'],
  // Shared local arcade records: intentionally per-iPad. booha_hiscore stores
  // a number only; per-student Invaders records live in the save.
  sharedArcade: ['booha_hiscore', 'booha_blocks_lb_v2'],
  // Shared local multiplayer records: classmates' names are intentionally
  // visible, always escaped, and labelled "RECORDS ON THIS iPAD".
  sharedMultiplayer: ['booha_liar_machine', 'booha_snap_test_records'],
  // Developer switch.
  dev: ['booha_dev_worlds'],
  // Retired: removal only, never read, written or migrated.
  retired: ['booha_blocks_name', 'booha_destruction_round_records_v1',
    'booha_destruction_roster_unlocks_v1', 'booha_week_sealed_seen'],
};

const SESSION = {
  // Per-tab navigation and return state.
  navigation: ['booha_active_ghost', 'booha_active_week', 'booha_bonus_return_room',
    'booha_deck_open', 'booha_juku_slot', 'booha_reopen_popup', 'booha_return_ghost',
    'booha_return_ix', 'booha_return_iy', 'booha_return_to_checkpoint', 'booha_return_to_hub',
    'booha_return_week', 'booha_scroll_to_blitz', 'grimmerglen_return_room',
    'happy_house_return_room', 'karasuki_return_room', 'karasuki_return_wrong_orb',
    'muenba_return_room', 'utsuroba_return_room', 'uhibon-lang'],
  // Sync session restore record, bound to a fingerprint of the current token.
  syncSession: ['booha_sync_session:v1'],
  dev: ['booha_dev_session'],
};

// Keys built at runtime: (file, argument up to the first ')') → category. Each one is scoped to
// the signed-in student or is a removal of a classified key list.
const DYNAMIC = new Map(Object.entries({
  'index.html|openingKey': 'local:studentScoped (booha:halloween-opening:<date>:<userid>)',
  'js/core/save-file.js|k': 'local:studentScoped (adventure save, keyed by userid)',
  'js/core/save-file.js|_key(': 'local:studentScoped (adventure save, keyed by userid)',
  'js/juku-engine.js|k': 'local:studentScoped (Juku save, keyed by userid)',
  'js/juku-engine.js|`${k}:corrupt:…': 'local:studentScoped (corrupt-save backup of the userid save)',
  'js/sync-client.js|k': 'local:studentScoped (sync blob, keyed by userid)',
  'js/sync-client.js|key': 'local:studentScoped (sync lease/recovery, keyed by userid)',
  'js/sync-client.js|metaKey(': 'local:studentScoped (sync meta, keyed by userid)',
  'js/sync-client.js|pendingRecoveryKey(blob': 'local:studentScoped (keyed by userid)',
  'js/sync-client.js|`${META_BASE}:conflict:…': 'local:studentScoped (keyed by userid)',
  'js/token.js|key': 'local:identity (legacy name keys cleared by token.js)',
  'js/destruction_1.js|key': 'local:retired (removal of the listed retired keys)',
  'js/core/homework-store.js|key': 'local:retired (clearLegacy removes legacy homework prefixes)',
  'js/daily-check.js|mirrorKey(day': 'session:studentScoped (booha_dc_events:<userid>:<day>)',
  'js/daily-check.js|mirrorKey(ev.day': 'session:studentScoped (booha_dc_events:<userid>:<day>)',
  'js/karasuki.js|key': 'session:navigation (return-room keys listed above)',
  'game.html|cfg.navKey': 'session:navigation (per-curriculum scroll keys)',
  'js/deck-core.js|CFG.navKey': 'session:navigation (per-curriculum scroll keys)',
  'js/stream-core.js|CFG.navKey': 'session:navigation (per-curriculum scroll keys)',
}));

// Storage reached through a local alias (receiver name → allowed file).
const ALIASES = new Map([
  ['js/core/homework-store.js|ls', 'localStorage'],
  ['js/maze-seasonal-unlock.js|storage', 'localStorage'],
]);
// Only this file may enumerate storage keys, and only to remove legacy keys.
const ENUMERATORS = new Set(['js/core/homework-store.js']);

const localClass = new Map();
for (const [cat, keys] of Object.entries(LOCAL)) keys.forEach((k) => localClass.set(k, cat));
const sessionClass = new Map();
for (const [cat, keys] of Object.entries(SESSION)) keys.forEach((k) => sessionClass.set(k, cat));

const files = childProcess.execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8').split('\0')
  .filter((f) => /\.(m?js|html)$/.test(f) && !f.startsWith('tests/') && !f.startsWith('tools/'))
  .filter((f) => fs.existsSync(path.join(root, f)));

const CALL = /([\w$][\w$.?]*?)\??\.(getItem|setItem|removeItem)\(\s*([^,)]+)/g;
const problems = [];
const seen = { local: new Set(), session: new Set(), dynamic: new Set() };
const dump = process.env.STORAGE_INVENTORY_DUMP === '1';

function constantsOf(src) {
  const out = new Map();
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"]([^'"]+)['"]/g)) out.set(m[1], m[2]);
  for (const m of src.matchAll(/\b([A-Z_][A-Z0-9_]*)\s*[:=]\s*['"]([^'"]+)['"]/g)) if (!out.has(m[1])) out.set(m[1], m[2]);
  return out;
}

for (const file of files) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const consts = constantsOf(src);
  for (const m of src.matchAll(CALL)) {
    const receiver = m[1];
    const op = m[2];
    const arg = m[3].trim();
    const line = src.slice(0, m.index).split('\n').length;
    let storage = /sessionStorage$/.test(receiver) ? 'session' : /localStorage$/.test(receiver) ? 'local' : null;
    if (!storage) {
      const alias = ALIASES.get(`${file}|${receiver.split('.').pop()}`);
      if (!alias) { problems.push(`${file}:${line}: ${receiver}.${op}() is not a known storage alias`); continue; }
      storage = alias === 'sessionStorage' ? 'session' : 'local';
    }
    const literal = arg.match(/^['"`]([^'"`$]+)['"`]$/);
    const key = literal ? literal[1] : consts.get(arg);
    if (key) {
      const cls = (storage === 'local' ? localClass : sessionClass).get(key);
      seen[storage].add(key);
      if (dump) console.log(`${storage}\t${key}\t${cls || 'UNCLASSIFIED'}\t${file}:${line}`);
      if (!cls) problems.push(`${file}:${line}: unclassified ${storage}Storage key "${key}"`);
      else if (cls === 'retired' && op !== 'removeItem') problems.push(`${file}:${line}: retired key "${key}" may only be removed`);
      continue;
    }
    // Template keys are identified by their fixed prefix plus first placeholder.
    const tpl = arg.startsWith('`')
      ? arg.slice(0, arg.indexOf('${')) + '${' + arg.slice(arg.indexOf('${') + 2).split('}')[0] + '}' +
        (arg.includes(':corrupt:') ? ':corrupt:…' : arg.includes(':conflict:') ? ':conflict:…' : '')
      : arg.replace(/\s+/g, '');
    const id = `${file}|${tpl}`;
    seen.dynamic.add(id);
    if (dump) console.log(`${storage}\tDYNAMIC\t${DYNAMIC.get(id) || 'UNCLASSIFIED'}\t${id}`);
    if (!DYNAMIC.has(id)) problems.push(`${file}:${line}: unclassified dynamic ${storage}Storage key ${id}`);
  }
  const enumerates = /(?:localStorage|sessionStorage|\bls|\bstorage)\.key\(/.test(src) ||
    /Object\.keys\(\s*(?:window\.)?(?:local|session)Storage/.test(src);
  if (enumerates && !ENUMERATORS.has(file)) problems.push(`${file}: enumerates storage keys`);
  if (/(?:localStorage|sessionStorage)\??\.clear\s*\(/.test(src)) problems.push(`${file}: clears all storage`);
}

if (!dump) {
  // Every classified key is still in use (keeps the inventory honest).
  // Retired keys may be removed through a list rather than a literal call, so
  // they only need to appear in source; the per-call rule above already
  // rejects any non-removal use.
  const allSource = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  for (const k of LOCAL.retired) {
    seen.local.add(k);
    if (!allSource.includes(`'${k}'`)) problems.push(`retired key "${k}" is no longer removed anywhere`);
  }
  for (const k of localClass.keys()) if (!seen.local.has(k)) problems.push(`classified localStorage key "${k}" is no longer used; remove it from the inventory`);
  for (const k of sessionClass.keys()) if (!seen.session.has(k)) problems.push(`classified sessionStorage key "${k}" is no longer used; remove it from the inventory`);
  for (const k of DYNAMIC.keys()) if (!seen.dynamic.has(k)) problems.push(`dynamic entry "${k}" no longer matches code; update the inventory`);
}

assert.deepStrictEqual(problems, [], problems.join('\n'));
console.log(`Storage inventory passed: ${seen.local.size} localStorage + ${seen.session.size} sessionStorage keys classified, ${seen.dynamic.size} runtime-built keys scoped, 1 removal-only enumerator.`);
