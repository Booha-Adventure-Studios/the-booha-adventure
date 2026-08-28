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
  var activeFilter = 'all';

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

  function updateSummary(items, foundRecords, foundCount) {
    var foundEl = document.getElementById('collection-found-count');
    var totalEl = document.getElementById('collection-total-count');
    var visitsEl = document.getElementById('collection-total-visits');
    if (foundEl) foundEl.textContent = String(foundCount);
    if (totalEl) totalEl.textContent = String(items.length);
    if (visitsEl) visitsEl.textContent = String(items.reduce(function (total, item) {
      var record = foundRecords[item.id];
      return total + (record ? Math.max(1, Number(record.visits) || 1) : 0);
    }, 0));
  }

  function visibleItems(items, foundRecords) {
    if (activeFilter === 'found') return items.filter(function (item) { return !!foundRecords[item.id]; });
    if (activeFilter === 'unfound') return items.filter(function (item) { return !foundRecords[item.id]; });
    return items;
  }

  function syncFilters() {
    document.querySelectorAll('[data-collection-filter]').forEach(function (button) {
      var selected = button.getAttribute('data-collection-filter') === activeFilter;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function render() {
    var grid = document.getElementById('wanderer-grid');
    var countEl = document.getElementById('wanderer-count');
    var source = window.KARASUKI_WANDERER_DATA || {};
    if (!grid || !countEl) return;

    var items = Object.keys(source).map(function (name, index) {
      return Object.assign({ name: name, index: index }, source[name]);
    });
    var foundRecords = records();
    var foundCount = items.reduce(function (total, item) {
      return total + (foundRecords[item.id] ? 1 : 0);
    }, 0);
    countEl.textContent = foundCount + ' / ' + items.length;
    updateSummary(items, foundRecords, foundCount);
    syncFilters();
    grid.innerHTML = visibleItems(items, foundRecords).map(function (item) {
      var record = foundRecords[item.id];
      var found = !!record;
      var visits = Math.max(1, Number(record && record.visits) || 1);
      var color = ['#ff79d7','#ffd166','#ffaa5e','#a8edff','#b2ffda','#fff176','#d49aff','#88ff88','#ff9eb5'][item.index % 9];
      var number = String(item.index + 1).padStart(2, '0');
      var title = found ? item.name : 'Wanderer #' + number;
      var state = found ? 'FOUND' : 'NOT YET FOUND';
      var comment = found ? '<p class="wanderer-comment">' + esc(item.en) + '</p><p class="wanderer-comment-jp">' + furigana(item) + '</p><p class="wanderer-visits">VISITS · ' + visits + '</p>' : '';
      return '<article class="wanderer-tile ' + (found ? 'found' : 'locked') + '" style="--tile-color:' + color + '" aria-label="' + esc(title) + ', ' + state + '">' +
        '<div class="wanderer-index">#' + number + '</div><div class="wanderer-top"><img class="wanderer-portrait" src="assets/img/wanderers/' + imageSlug(item) + '-1.webp" alt="" width="58" height="58" loading="lazy" decoding="async"><div class="wanderer-name"><div class="wanderer-name-en">' + esc(title) + '</div><div class="wanderer-state">' + state + '</div></div></div>' + comment +
        '</article>';
    }).join('');
  }

  function init() {
    document.querySelectorAll('[data-collection-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        var next = button.getAttribute('data-collection-filter');
        if (next === 'all' || next === 'found' || next === 'unfound') activeFilter = next;
        render();
      });
    });
    render();
    document.addEventListener('booha:saved', render);
    document.addEventListener('booha:weeklyReset', render);
  }

  if (window.BOOHA_READY) init();
  else document.addEventListener('booha:ready', init, { once: true });
})();
