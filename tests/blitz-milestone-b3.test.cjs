const fs = require('fs');
const assert = require('assert');

// B3: a big streak moment at 3/6/9/12/15 in each game's own motif, equally strong.
const engine = fs.readFileSync('js/blitz-engine.js', 'utf8');
const verify = fs.readFileSync('verify.sh', 'utf8');

// Fired from the live (non-legacy) streak path, right after the streak sound.
assert.match(engine, /playSceneSfx\('streak', \{ threshold: eventThreshold \}\);\s*sceneFill\.milestone\?\.\(eventThreshold\);/,
  'every threshold hit triggers the scene milestone');

// One shared strength rule for all three games.
assert.match(engine, /const milestoneMs = \(threshold\) => \(threshold >= 15 \? 1300 : 1000\);/, 'same length in every game');
assert.match(engine, /const milestoneCount = \(threshold\) => \(isLowPower\(\) \? 10 : 16\) \+ \(threshold >= 9 \? 6 : 0\);/, 'same piece count in every game');

// Each motif has a milestone that uses the shared helpers.
const fill = engine.slice(engine.indexOf('function mountSceneFill(overlay, scene)'), engine.indexOf('function mountSceneFill(overlay, scene)') + 40000);
const spooky = fill.slice(fill.indexOf("if (kind === 'spooky-fog')"), fill.indexOf('const positions = fillConfig.positions'));
assert.match(spooky, /milestone\(threshold\) \{\s*flashFill\(milestoneMs\(threshold\)\);/, 'Sentence: colour flash');
assert.match(spooky, /'#ff6ccf'/, 'Sentence: pink smoke');
assert.match(spooky, /piece\.classList\.add\('is-smoke'\)/, 'Sentence: smoke pieces');
const generic = fill.slice(fill.indexOf('milestone(threshold) {', fill.indexOf('const positions = fillConfig.positions')));
assert.match(generic, /flashFill\(milestoneMs\(threshold\)\);/, 'Vocab and Question: colour flash');
assert.match(generic, /if \(isFirefly\) \{[\s\S]*?piece\.classList\.add\('is-firefly'\)[\s\S]*?return;\s*\}/, 'Question: firefly swarm');
assert.match(generic, /piece\.classList\.add\('is-bulb'\)/, 'Vocab: bulb sparks off the sign');

// Moving pieces follow Blitz Pop; they can never break a run or linger.
const pieces = fill.slice(fill.indexOf('const milestonePieces = '), fill.indexOf("if (kind === 'spooky-fog')"));
assert.match(pieces, /if \(!popMotionOk\(overlay\)\) return;/, 'pieces off for reduced motion and minimal power');
assert.match(pieces, /catch \(_\)/, 'decoration only');
assert.match(pieces, /setTimeout\(\(\) => piece\.remove\(\), ms \+ 400\);/, 'pieces never linger');
assert.doesNotMatch(pieces, /await|new Promise/, 'nothing waits on the milestone');

// The colour flash runs at every power tier; only the bulb chase stops on minimal power and reduced motion.
for (const sel of [
  /\.blitz-scene-fill-circus\.milestone-flash \.booha-blitz-scene-fill-item \{/,
  /\.blitz-scene-fill-spooky\.milestone-flash::after \{/,
  /\.blitz-scene-fill-fireflies\.milestone-flash \.booha-blitz-scene-fill-item\.is-lit \{/,
]) assert.match(engine, sel, `flash rule ${sel}`);
assert.match(engine, /\.blitz-compositor:not\(\.low-power\) \.blitz-scene-fill-circus\.milestone-flash \.booha-blitz-scene-fill-item \{\s*animation: boohaBlitzMilestoneBulb/, 'bulb chase off at minimal power');
assert.match(engine, /\.blitz-scene-fill-circus\.milestone-flash \.booha-blitz-scene-fill-item \{\s*animation: none;\s*\}/, 'bulb chase off for reduced motion');
assert.match(engine, /\.blitz-compositor\.low-power \.booha-blitz-milestone-piece \{ display: none; \}/, 'no pieces at minimal power');

// Pace untouched.
assert.match(engine, /: \(config\.nextDelay \|\| 200\);/, 'the 200 ms next-question pace is unchanged');
assert.match(verify, /tests\/blitz-milestone-b3\.test\.cjs/, 'verify.sh runs this test');

console.log('Blitz milestone B3 passed: lightbulbs, pink smoke and fireflies at 3/6/9/12/15, equally strong.');
