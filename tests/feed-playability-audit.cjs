#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'js/feed_booha_levels_1.js'), 'utf8'),
  context,
  { filename: 'js/feed_booha_levels_1.js' }
);

const levels = context.window.FEED_BOOHA_LEVELS;
const FLOOR_Y = 900;
const CANDY_R = 26;
const GRAVITY = 0.45;
const AIR_DRAG = 0.999;
const MAGNET_DIST = 140;
const MAGNET_FORCE = 0.40;
const FRAME_MS = 16.667;

function permutations(items) {
  if (items.length < 2) return [items.slice()];
  const result = [];
  items.forEach((item, index) => {
    const rest = items.slice(0, index).concat(items.slice(index + 1));
    permutations(rest).forEach(tail => result.push([item].concat(tail)));
  });
  return result;
}

function simulate(level, order, gap) {
  const ropeCount = level.ropes.length;
  const avgX = ropeCount > 1
    ? level.ropes.reduce((sum, rope) => sum + rope.anchor.x, 0) / ropeCount
    : level.candy.x;
  const kickVx = typeof level.launchVx === 'number'
    ? level.launchVx
    : ropeCount > 1
      ? (avgX >= 270 ? -1 : 1) * 6
      : (level.candy.x >= 270 ? -1 : 1) * 5.5;
  const candy = { x: level.candy.x, y: level.candy.y, vx: kickVx, vy: 0, attached: true };
  const ropes = level.ropes.map(rope => ({
    ...rope,
    cut: false,
    pending: false,
    releaseAt: 0,
    length: Math.hypot(level.candy.x - rope.anchor.x, level.candy.y - rope.anchor.y)
  }));
  const bounces = (level.objects || []).filter(object => object.type === 'bounce')
    .map(object => ({ ...object, used: false }));
  const fans = (level.objects || []).filter(object => object.type === 'fan')
    .map(object => ({ ...object, fanTimer: 0 }));
  let boohaX = level.booha.x;
  let boohaDir = level.booha.range
    ? (level.booha.x <= (level.booha.range.min + level.booha.range.max) / 2 ? 1 : -1)
    : 0;
  const cutFrames = order.map((_, index) => index * gap);

  function activeRopes() { return ropes.filter(rope => !rope.cut); }

  function cutRope(index, frame) {
    const rope = ropes[index];
    if (!rope || rope.cut || rope.pending) return;
    if (rope.type === 'delayed') {
      rope.pending = true;
      rope.releaseAt = frame * FRAME_MS + (rope.delayMs || 400);
    } else {
      rope.cut = true;
      if (!activeRopes().length) candy.attached = false;
    }
  }

  function updateAttached() {
    const active = activeRopes();
    if (!active.length) { candy.attached = false; return; }
    const subDt = FRAME_MS / 3;
    for (let step = 0; step < 3; step++) {
      candy.vy += GRAVITY * subDt / FRAME_MS;
      candy.x += candy.vx * subDt / FRAME_MS;
      candy.y += candy.vy * subDt / FRAME_MS;
      for (const rope of active) {
        const dx = candy.x - rope.anchor.x;
        const dy = candy.y - rope.anchor.y;
        const distance = Math.hypot(dx, dy);
        const length = rope.length || 120;
        if (distance < 0.001 || distance <= length) continue;
        const over = (distance - length) / distance;
        candy.x -= dx * over;
        candy.y -= dy * over;
        const nx = dx / distance;
        const ny = dy / distance;
        const velocity = candy.vx * nx + candy.vy * ny;
        if (velocity > 0) { candy.vx -= velocity * nx; candy.vy -= velocity * ny; }
      }
    }
    candy.vx *= AIR_DRAG;
    candy.vy *= AIR_DRAG;
  }

  for (let frame = 0; frame < 240; frame++) {
    if (level.booha.behavior === 'horizontal') {
      boohaX += level.booha.speed * boohaDir;
      if (boohaX <= level.booha.range.min || boohaX >= level.booha.range.max) boohaDir *= -1;
    }
    ropes.forEach(rope => {
      if (rope.pending && frame * FRAME_MS >= rope.releaseAt) {
        rope.pending = false;
        rope.cut = true;
        if (!activeRopes().length) candy.attached = false;
      }
    });
    cutFrames.forEach((cutFrame, index) => { if (frame === cutFrame) cutRope(order[index], frame); });

    if (candy.attached) {
      updateAttached();
    } else {
      candy.vy += GRAVITY;
      candy.x += candy.vx;
      candy.y += candy.vy;
      candy.vx *= AIR_DRAG;
      candy.vy *= AIR_DRAG;

      for (const object of bounces) {
        if (object.used) continue;
        const left = object.x - object.width / 2;
        const right = object.x + object.width / 2;
        const top = object.y - object.height / 2;
        const previousBottom = candy.y - candy.vy + CANDY_R;
        const crossedTop = previousBottom <= top && candy.y + CANDY_R >= top;
        const insideLandingBand = candy.y + CANDY_R >= top && candy.y + CANDY_R <= top + 22;
        if (candy.x + CANDY_R > left && candy.x - CANDY_R < right &&
            (crossedTop || insideLandingBand) && candy.vy > 0) {
          object.used = true;
          candy.y = top - CANDY_R;
          candy.vy = -Math.max(10, Math.abs(candy.vy) * 0.95);
          candy.vx = candy.vx * 1.02 + (object.pushX || 0);
        }
      }

      for (const fan of fans) {
        if (Math.hypot(candy.x - fan.x, candy.y - fan.y) < 52) fan.fanTimer = 600;
        if (fan.fanTimer <= 0) continue;
        const scale = FRAME_MS / 16.667;
        if (fan.direction === 'right') candy.vx += 0.32 * scale;
        if (fan.direction === 'left') candy.vx -= 0.32 * scale;
        if (fan.direction === 'up') candy.vy -= 0.38 * scale;
        fan.fanTimer -= FRAME_MS;
      }

      const dx = boohaX - candy.x;
      const dy = level.booha.y - 12 - candy.y;
      const distance = Math.hypot(dx, dy);
      const leavingPlayfield = candy.x < CANDY_R * 2 || candy.x > 540 - CANDY_R * 2;
      if ((candy.y >= FLOOR_Y - 220 || leavingPlayfield) && distance > 0) {
        candy.vx = dx * 0.10;
        candy.vy = dy * 0.10;
      } else if (distance > 0 && distance < MAGNET_DIST) {
        const strength = MAGNET_FORCE * (1 - distance / MAGNET_DIST);
        candy.vx += dx / distance * strength;
        candy.vy += dy / distance * strength;
      }
      if (distance < 52) return true;
    }
    if (candy.y > FLOOR_Y + 50 || candy.x < -80 || candy.x > 620) break;
  }
  return false;
}

const failures = [];
for (const level of levels) {
  const orders = permutations(level.ropes.map((_, index) => index));
  let playable = false;
  for (const order of orders) {
    for (const gap of [0, 8, 15, 25, 35]) {
      if (simulate(level, order, gap)) { playable = true; break; }
    }
    if (playable) break;
  }
  if (!playable) failures.push(level.id);
}

assert.deepStrictEqual(failures, [], `unplayable Feed Booha levels: ${failures.join(', ')}`);
console.log(`Feed Booha playability audit passed: ${levels.length} levels`);
