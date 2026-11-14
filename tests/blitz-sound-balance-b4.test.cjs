const fs = require('fs');
const assert = require('assert');

// B4: each game's right, wrong and milestone sounds play at the same perceived
// volume as the other two games' (a simple A-weighted energy model), and the
// milestone sounds share one shape so none is bigger than another.
const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

const maps = [...engine.matchAll(/sfx: Object\.freeze\(\{ start: '([^']+)', correct: '([^']+)', streak: '([^']+)', wrong: '([^']+)', finish: '([^']+)' \}\)/g)]
  .map(([, start, correct, streak, wrong, finish]) => ({ start, correct, streak, wrong, finish }));
assert.strictEqual(maps.length, 3, 'three scene sound maps');
assert.deepStrictEqual(maps.map(m => m.streak), ['bulb-chase', 'smoke-swell', 'firefly-twinkle'],
  'milestone sounds match the scenes: lightbulbs, pink smoke, fireflies');

function cue(name) {
  const re = new RegExp(`'?${name}'?: \\{ notes: (?:steps\\()?\\[([^\\]]+)\\]\\)?, spacing: [\\d.]+, duration: ([\\d.]+), type: '(\\w+)', peak: ([\\d.]+)(?:, attack: ([\\d.]+))? \\}`);
  const m = engine.match(re);
  assert.ok(m, `cue ${name} has fixed notes, duration, type and peak`);
  return { notes: m[1].split(',').map(Number), duration: Number(m[2]), type: m[3], peak: Number(m[4]), attack: Number(m[5] || 0.01), stepped: m[0].includes('steps(') };
}
function aWeightDb(f) {
  const f2 = f * f;
  const ra = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2));
  return 20 * Math.log10(ra) + 2;
}
function loudness({ notes, duration, type, peak, attack }) {
  let energy = 0;
  for (const f of notes) {
    const parts = type === 'sine' ? [[f, 1]] : [1, 3, 5, 7].map(n => [f * n, (8 / Math.PI ** 2) / n ** 2]);
    const k = Math.log(peak / 1e-4) / (duration - attack);
    const env = peak ** 2 / (2 * k);
    for (const [fr, a] of parts) energy += env * (a ** 2) / 2 * 10 ** (aWeightDb(fr) / 10);
  }
  return 10 * Math.log10(energy);
}
const spread = (xs) => Math.max(...xs) - Math.min(...xs);

const correct = maps.map(m => loudness(cue(m.correct)));
const wrong = maps.map(m => loudness(cue(m.wrong)));
assert.ok(spread(correct) <= 1.5, `right-answer sounds within 1.5 dB across games (got ${spread(correct).toFixed(1)})`);
assert.ok(spread(wrong) <= 1.5, `wrong-answer sounds within 1.5 dB across games (got ${spread(wrong).toFixed(1)})`);
for (let i = 0; i < 3; i++) {
  assert.ok(wrong[i] <= correct[i], 'a wrong answer is never louder than a right one');
  assert.ok(correct[i] - wrong[i] <= 6, 'but a wrong answer is still clearly heard');
}

// Milestone cues: same shape, same note counts per threshold, same balance.
const streakCues = maps.map(m => cue(m.streak));
for (const c of streakCues) {
  assert.ok(c.stepped, 'milestone notes grow with the threshold');
  assert.strictEqual(c.notes.length, 5, 'five notes available (3 at ×3/×6, 4 at ×9/×12, 5 at ×15)');
  assert.strictEqual(c.duration, streakCues[0].duration, 'same note length in every game');
}
assert.match(engine, /const steps = \(list\) => list\.slice\(0, threshold >= 15 \? 5 : threshold >= 9 \? 4 : 3\);/, 'one shared note-count rule');
for (const n of [3, 4, 5]) {
  const levels = streakCues.map(c => loudness({ ...c, notes: c.notes.slice(0, n) }));
  assert.ok(spread(levels) <= 1.5, `milestone sounds with ${n} notes within 1.5 dB across games (got ${spread(levels).toFixed(1)})`);
}
assert.match(engine, /exponentialRampToValueAtTime\(cues\.peak \* intensity, startAt \+ \(cues\.attack \|\| 0\.01\)\);/, 'per-cue attack is honoured');
assert.match(verify, /tests\/blitz-sound-balance-b4\.test\.cjs/, 'verify.sh runs this test');

console.log(`Blitz sound balance B4 passed: right ${correct.map(x => x.toFixed(1)).join('/')} dB, wrong ${wrong.map(x => x.toFixed(1)).join('/')} dB, milestones matched.`);
