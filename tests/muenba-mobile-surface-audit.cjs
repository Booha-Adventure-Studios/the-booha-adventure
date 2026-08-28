const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'muenba.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes("const popupOpen = lobbyOpen || captureOpen || returnPortalOpen;"),
  'Muenba must derive the mobile surface lock from all popup states');
assert(source.includes("document.documentElement.classList.toggle('muenba-popup-open', popupOpen);"),
  'Muenba must expose popup ownership as a document state');
assert(source.includes('html.muenba-popup-open,\n      html.muenba-popup-open body'),
  'the document must disable scroll chaining while a popup is open');
assert(source.includes('#muenba-lobby-overlay,\n      #muenba-capture-overlay,\n      #muenba-return-overlay'),
  'all Muenba popup surfaces must share the mobile scroll guard');
assert(source.includes('overscroll-behavior-y:contain; touch-action:pan-y;'),
  'popup surfaces must retain vertical card scrolling without browser pull-to-refresh chaining');
assert(source.includes('.muenba-lobby-box,\n      .muenba-return-box { overscroll-behavior:contain;'),
  'nested popup cards must contain their own scroll boundary');

console.log('Muenba 27F mobile-surface audit passed: popup scrolling is isolated from page bounce and pull-to-refresh.');
