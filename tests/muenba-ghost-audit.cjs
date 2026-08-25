#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'muenba.js'), 'utf8');

assert(source.includes('const GHOST_NOTICE_DELAY_MS = 2000;'), 'sight-angry ghosts must wait exactly two seconds before screaming');
assert(source.includes('const GHOST_CARRY_CHASE_SPEED = 1.35;'), 'carrying-energy chases must be only slightly faster');
assert(source.includes('if (carryingStolenEnergy) return \'sight\';'), 'carrying energy must make every ghost sight-angry');
assert(source.includes("if (!carryingStolenEnergy && ghostId === target) return 'friendly';"), 'the assigned hunt ghost must stay quiet during an ordinary hunt');
assert(source.includes('chaseSpeed: carryingEnergy ? GHOST_CARRY_CHASE_SPEED : GHOST_CHASE_SPEED,'), 'ghosts must remember the carried-energy chase speed');
assert(source.includes('moveGhostToward(g, state.x, state.y, g.chaseSpeed || GHOST_CHASE_SPEED);'), 'chasing must use the carried-energy speed when active');
assert(source.includes("if (g.hostility === 'sight' && !g.screaming)"), 'sight-angry ghosts must use the delayed notice path');

console.log('Muenba ghost audit passed: two-second tension, quiet hunt target, and faster carried-energy chases.');
