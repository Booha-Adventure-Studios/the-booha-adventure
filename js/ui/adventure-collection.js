/*
 * Adventure profile collection view.
 *
 * The collection is permanent. The weekly Karasuki roster is intentionally
 * not consulted here, so a found wanderer remains visible after Monday reset.
 */
(function () {
  'use strict';

  var IMAGE_SLUGS = {
    'gorogui': 'gorogane',
    'mister-happy': 'mr_happy',
    'tom-katsu': 'tom_katsu',
    'sumiyo-horaguchi': 'sumiyo_horaguchi',
    'takachika-green': 'takachika_green',
    'october-moriyama': 'october_moriyama',
    'jubei-tsukigase': 'tsukigase_jubei',
    'kara-ageha': 'kara-ageha',
    'jinguru-kan': 'jinguru-kan',
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function imageSlug(item) {
    return IMAGE_SLUGS[item.id] || item.id.replace(/-/g, '_');
  }

  function records() {
    try {
      var data = window.BoohaAdventure && BoohaAdventure.save
        ? BoohaAdventure.save.load() : null;
      var collection = data && data.collection && data.collection.wanderers;
      if (!collection || typeof collection !== 'object' || Array.isArray(collection)) return {};
      return collection;
    } catch (_) {
      return {};
    }
  }

  function furigana(item) {
    var map = item && item.furigana && typeof item.furigana === 'object' ? item.furigana : {};
    return window.UtsuFurigana && typeof UtsuFurigana.sentence === 'function'
      ? UtsuFurigana.sentence(item.jp, map) : esc(item.jp);
  }

  function render() {
    var grid = document.getElementById('wanderer-grid');
    var countEl = document.getElementById('wanderer-count');
    var source = window.KARASUKI_WANDERER_DATA || {};
    if (!grid || !countEl) return;

    var items = Object.keys(source).map(function (name) {
      return Object.assign({ name: name }, source[name]);
    });
    var foundRecords = records();
    var foundCount = items.reduce(function (total, item) {
      return total + (foundRecords[item.id] ? 1 : 0);
    }, 0);
    countEl.textContent = foundCount + ' / ' + items.length;
    grid.innerHTML = items.map(function (item, index) {
      var record = foundRecords[item.id];
      var found = !!record;
      var visits = Math.max(1, Number(record && record.visits) || 1);
      var color = ['#ff79d7','#ffd166','#ffaa5e','#a8edff','#b2ffda','#fff176','#d49aff','#88ff88','#ff9eb5'][index % 9];
      var title = found ? item.name : 'Wanderer #' + String(index + 1).padStart(2, '0');
      var state = found ? 'FOUND' : 'NOT YET FOUND';
      var comment = found ? '<p class="wanderer-comment">' + esc(item.en) + '</p><p class="wanderer-comment-jp">' + furigana(item) + '</p><p class="wanderer-visits">VISITS · ' + visits + '</p>' : '';
      return '<article class="wanderer-tile ' + (found ? 'found' : 'locked') + '" style="--tile-color:' + color + '" aria-label="' + esc(title) + ', ' + state + '">' +
        '<div class="wanderer-top"><img class="wanderer-portrait" src="assets/img/wanderers/' + imageSlug(item) + '-1.png" alt="" loading="lazy"><div class="wanderer-name"><div class="wanderer-name-en">' + esc(title) + '</div><div class="wanderer-state">' + state + '</div></div></div>' + comment +
        '</article>';
    }).join('');
  }

  function init() {
    render();
    document.addEventListener('booha:saved', render);
    document.addEventListener('booha:weeklyReset', render);
  }

  if (window.BOOHA_READY) init();
  else document.addEventListener('booha:ready', init, { once: true });
})();
