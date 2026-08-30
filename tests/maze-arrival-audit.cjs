#!/usr/bin/env node
'use strict';

// Pass 23E: show the landing burst before any checkpoint or tree popup opens.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const maze = fs.readFileSync(path.join(root, 'maze.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert(maze.includes('const ARRIVAL_POPUP_DELAY_MS = 650;'), 'arrival celebration must have a visible hold');
assert(maze.includes('function queueArrivalPopup(openPopup)'), 'arrivals must use one shared popup queue');
assert(maze.includes('setTravelLock(true);\n  window.setTimeout(()=>{'), 'input must stay locked during the arrival hold');
assert(maze.includes('setTravelLock(false);\n    openPopup();'), 'the popup must open only after the arrival hold');

const intro = maze.indexOf('addGhostFlightBurst(ghostIX,ghostIY,20);\n      queueArrivalPopup(()=>showPopupAtCP(startCP));');
assert(intro >= 0, 'initial Maze arrival must burst before its first checkpoint popup');

const normal = maze.indexOf('addGhostFlightBurst(ghostIX,ghostIY,20);\n        queueArrivalPopup(()=>{');
assert(normal >= 0, 'normal arrivals must burst before their popup callback');

assert(sw.includes('booha-pages-2026-377'), 'service-worker page cache must include the current page bump');
assert(sw.includes('booha-assets-2026-439'), 'service-worker asset cache must include the current asset bump');

console.log('Maze 23E arrival audit passed: landing bursts are visible before popups open.');
