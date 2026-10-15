#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'grimmerglen.js'), 'utf8');

function extractFunction(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `could not find ${name}`);
  const open = text.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`could not close ${name}`);
}

const panel = {
  scrollTop: 99,
  classList: {
    additions: 0,
    add(name) {
      assert.strictEqual(name, 'open');
      this.additions += 1;
    }
  }
};
const state = { clickTarget: 'marietta', moving: true };
let sfxOpens = 0;
let dialogueRenders = 0;

const openPanel = new Function('deps', `
  const {
    mariettaPanel, performance, window, state,
    hasMariettaIntroBeenSeenThisWeek, renderMariettaQuestBriefing,
    renderMariettaDialogue, finishMariettaIntroduction,
    hasMariettaIntroEverBeenSeen, skipMariettaIntroduction
  } = deps;
  let mariettaPanelOpen = false;
  let mariettaPanelCooldown = 0;
  let carriedObject = null;
  ${extractFunction(source, 'openMariettaPanel')}
  return { open: openMariettaPanel, isOpen: () => mariettaPanelOpen };
`)({
  mariettaPanel: panel,
  performance: { now: () => 1000 },
  window: { UtsuSfx: { panelOpen: () => { sfxOpens += 1; } } },
  state,
  hasMariettaIntroBeenSeenThisWeek: () => true,
  renderMariettaQuestBriefing: () => { dialogueRenders += 1; },
  renderMariettaDialogue: () => { dialogueRenders += 1; },
  finishMariettaIntroduction: () => {},
  hasMariettaIntroEverBeenSeen: () => true,
  skipMariettaIntroduction: () => {}
});

for (let i = 0; i < 10; i += 1) openPanel.open();

assert.strictEqual(sfxOpens, 1, 'repeated open attempts should play the open effect once');
assert.strictEqual(dialogueRenders, 1, 'repeated open attempts should render the panel once');
assert.strictEqual(panel.classList.additions, 1, 'repeated open attempts should add the open class once');
assert.strictEqual(panel.scrollTop, 0, 'opening the panel should reset its scroll position');
assert.strictEqual(state.clickTarget, null, 'opening the panel should clear the movement target');
assert.strictEqual(state.moving, false, 'opening the panel should stop movement');
assert.strictEqual(openPanel.isOpen(), true, 'the panel should remain open after repeated attempts');

console.log('Grimmerglen popup runtime test passed.');
