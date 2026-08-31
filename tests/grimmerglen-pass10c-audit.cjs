// Pass 10C: leaving Grimmerglen returns Booha to Karasuki room_14, the
// room containing the Grimmerglen entrance.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const grimmerglen = fs.readFileSync(path.join(root, 'js', 'grimmerglen.js'), 'utf8');
const karasuki = fs.readFileSync(path.join(root, 'js', 'karasuki.js'), 'utf8');
const verify = fs.readFileSync(path.join(root, 'verify.sh'), 'utf8');

assert(grimmerglen.includes("sessionStorage.setItem('grimmerglen_return_room', 'room_14')"),
  'Grimmerglen exit must remember Karasuki room_14 as the landing room');
assert(grimmerglen.includes("window.location.href = 'karasuki.html'"),
  'Grimmerglen exit must navigate back to Karasuki');
assert(karasuki.includes("sessionStorage.getItem('grimmerglen_return_room')"),
  'Karasuki must consume the Grimmerglen return handoff');
assert(karasuki.includes("sessionStorage.removeItem('grimmerglen_return_room')"),
  'Karasuki must clear the consumed Grimmerglen return handoff');
assert(karasuki.includes("'grimmerglen_return_room'"),
  'Karasuki must trust the Grimmerglen return as a valid entry');
assert(verify.includes('tests/grimmerglen-pass10c-audit.cjs'),
  'verify.sh must run the Grimmerglen return-handoff audit');

console.log('Grimmerglen Pass 10C audit passed: exit handoff returns to Karasuki room_14 and is accepted by the entry guard.');
