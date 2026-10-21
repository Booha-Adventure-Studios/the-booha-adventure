/*
 * Adventure profile — Wanderer Atlas.
 *
 * The collection is permanent. The weekly Karasuki roster is intentionally
 * not consulted here, so a found wanderer remains visible after Monday reset.
 *
 * Found wanderers are trading cards (number, portrait, category stripe,
 * friendship hearts). Tapping one flips it open: their line in English and
 * Japanese, visits, hearts and the date they first met. Unfound wanderers are
 * "?" cards so nothing is spoiled.
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
  var KINDS = {
    friendly: { jp: 'なかま', en: 'FRIENDLY' },
    mischievous: { jp: 'いたずら', en: 'MISCHIEVOUS' },
    dangerous: { jp: 'きけん', en: 'DANGEROUS' },
  };
  // Friendship hearts are earned slowly: 3, 8 and 15 visits.
  var HEART_STEPS = [3, 8, 15];
  var FILTERS = ['all', 'found', 'unfound', 'friendly', 'mischievous', 'dangerous'];
  var activeFilter = 'all';
  var lastItems = [];
  var lastRecords = {};

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function imageSlug(item) {
    return IMAGE_SLUGS[item.id] || item.id.replace(/-/g, '_');
  }

  function kindOf(item) {
    return KINDS[item && item.kind] ? item.kind : 'friendly';
  }

  function hearts(visits) {
    var n = 0;
    HEART_STEPS.forEach(function (step) { if (visits >= step) n++; });
    return n;
  }

  function nextHeartAt(visits) {
    for (var i = 0; i < HEART_STEPS.length; i++) if (visits < HEART_STEPS[i]) return HEART_STEPS[i];
    return null;
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
    var ring = document.getElementById('atlas-ring');
    if (ring) ring.style.setProperty('--pct', (items.length ? Math.round(foundCount / items.length * 100) : 0) + '%');
    Object.keys(KINDS).forEach(function (kind) {
      var all = items.filter(function (item) { return kindOf(item) === kind; });
      var found = all.filter(function (item) { return !!foundRecords[item.id]; }).length;
      var count = document.getElementById('atlas-count-' + kind);
      var bar = document.getElementById('atlas-bar-' + kind);
      if (count) count.textContent = found + '/' + all.length;
      if (bar) bar.style.width = (all.length ? Math.round(found / all.length * 100) : 0) + '%';
    });
  }

  function visibleItems(items, foundRecords) {
    if (activeFilter === 'found') return items.filter(function (item) { return !!foundRecords[item.id]; });
    if (activeFilter === 'unfound') return items.filter(function (item) { return !foundRecords[item.id]; });
    if (KINDS[activeFilter]) {
      return items.filter(function (item) { return !!foundRecords[item.id] && kindOf(item) === activeFilter; });
    }
    return items;
  }

  function syncFilters() {
    document.querySelectorAll('[data-collection-filter]').forEach(function (button) {
      var selected = button.getAttribute('data-collection-filter') === activeFilter;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function heartText(n) {
    return n ? new Array(n + 1).join('♥') : '';
  }

  function cardHTML(item, record) {
    var number = String(item.index + 1).padStart(2, '0');
    if (!record) {
      return '<article class="wcard unknown" aria-label="Wanderer #' + number + ', NOT YET FOUND">' +
        '<span class="wanderer-index">No.' + number + '</span>' +
        '<span class="wcard-q" aria-hidden="true">?</span>' +
        '<span class="wcard-name">???</span>' +
        '<span class="wcard-hint">ヒント: からすき</span>' +
        '</article>';
    }
    var kind = kindOf(item);
    var visits = Math.max(1, Number(record.visits) || 1);
    var n = hearts(visits);
    return '<button type="button" class="wcard found ' + kind + '" data-wanderer-id="' + esc(item.id) + '" ' +
      'aria-label="' + esc(item.name) + ', ' + KINDS[kind].en.toLowerCase() + ', VISITS ' + visits + '. Open card">' +
      '<span class="wanderer-index">No.' + number + '</span>' +
      '<img class="wcard-img" src="assets/img/wanderers/' + imageSlug(item) + '-1.webp" alt="" width="76" height="76" loading="lazy" decoding="async">' +
      '<span class="wcard-name">' + esc(item.name) + '</span>' +
      '<span class="wcard-stripe">' + KINDS[kind].jp + '</span>' +
      '<span class="wcard-hearts" aria-hidden="true">' + (heartText(n) || '·') + '</span>' +
      '</button>';
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
    lastItems = items;
    lastRecords = foundRecords;
    var foundCount = items.reduce(function (total, item) {
      return total + (foundRecords[item.id] ? 1 : 0);
    }, 0);
    countEl.textContent = foundCount + ' / ' + items.length;
    updateSummary(items, foundRecords, foundCount);
    syncFilters();
    var shown = visibleItems(items, foundRecords);
    grid.innerHTML = shown.length
      ? shown.map(function (item) { return cardHTML(item, foundRecords[item.id]); }).join('')
      : '<p class="wcard-empty">ここに まだ たびびとが いないよ。からすき で さがそう！</p>';
  }

  /* ── flipped card ─────────────────────────────────────────────── */

  var modal = null;
  var returnFocus = null;

  function foundList() {
    return lastItems.filter(function (item) { return !!lastRecords[item.id]; });
  }

  function formatDate(ms) {
    var d = new Date(Number(ms));
    if (!Number(ms) || isNaN(d.getTime())) return '—';
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function openCard(id) {
    var list = foundList();
    var index = list.findIndex(function (item) { return item.id === id; });
    if (index < 0) return;
    var item = list[index];
    var record = lastRecords[item.id] || {};
    var kind = kindOf(item);
    var visits = Math.max(1, Number(record.visits) || 1);
    var n = hearts(visits);
    var next = nextHeartAt(visits);
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'wmodal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'wmodal-name');
      document.body.appendChild(modal);
      modal.addEventListener('click', function (e) { if (e.target === modal) closeCard(); });
      document.addEventListener('keydown', function (e) {
        if (!modal || modal.hidden) return;
        if (e.key === 'Escape') closeCard();
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft') step(-1);
      });
    }
    modal.dataset.id = item.id;
    modal.innerHTML =
      '<div class="wmodal-card ' + kind + '">' +
        '<div class="wmodal-inner">' +
          '<span class="wmodal-holo" aria-hidden="true"></span>' +
          '<div class="wmodal-top"><span class="wanderer-index">No.' + String(item.index + 1).padStart(2, '0') + '</span>' +
          '<span class="wmodal-kind">' + KINDS[kind].jp + ' ' + KINDS[kind].en + '</span></div>' +
          '<img class="wmodal-img" src="assets/img/wanderers/' + imageSlug(item) + '-1.webp" alt="' + esc(item.name) + '" width="170" height="170" decoding="async">' +
          '<h3 class="wmodal-name" id="wmodal-name">' + esc(item.name) + '</h3>' +
          '<div class="wmodal-quote"><p class="wanderer-comment-jp">「' + furigana(item) + '」</p><p class="wanderer-comment">“' + esc(item.en) + '”</p></div>' +
          '<div class="wmodal-stats">' +
            '<div><b>×' + visits + '</b><span>VISITS · あった</span></div>' +
            '<div><b class="hearts">' + (heartText(n) || '—') + '</b><span>' + (next ? 'あと ' + (next - visits) + 'かい' : 'なかよし MAX') + '</span></div>' +
            '<div><b>' + formatDate(record.firstFoundAt) + '</b><span>はじめて あった</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wmodal-nav">' +
        '<button type="button" class="wmodal-step" data-step="-1" aria-label="Previous wanderer">‹</button>' +
        '<button type="button" class="wmodal-close">とじる</button>' +
        '<button type="button" class="wmodal-step" data-step="1" aria-label="Next wanderer">›</button>' +
      '</div>' +
      '<p class="wmodal-rule">♥ 3かい · ♥♥ 8かい · ♥♥♥ 15かい あうと なかよし アップ</p>';
    modal.hidden = false;
    document.documentElement.classList.add('wmodal-open');
    modal.querySelector('.wmodal-close').addEventListener('click', closeCard);
    modal.querySelectorAll('.wmodal-step').forEach(function (b) {
      b.addEventListener('click', function () { step(Number(b.getAttribute('data-step'))); });
    });
    modal.querySelector('.wmodal-close').focus();
  }

  function step(dir) {
    var list = foundList();
    if (!modal || list.length < 2) return;
    var index = list.findIndex(function (item) { return item.id === modal.dataset.id; });
    var next = list[(index + dir + list.length) % list.length];
    openCard(next.id);
  }

  function closeCard() {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.classList.remove('wmodal-open');
    if (returnFocus && document.body.contains(returnFocus)) returnFocus.focus();
  }

  function init() {
    document.querySelectorAll('[data-collection-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        var next = button.getAttribute('data-collection-filter');
        if (FILTERS.indexOf(next) >= 0) activeFilter = next;
        render();
      });
    });
    var grid = document.getElementById('wanderer-grid');
    if (grid) {
      grid.addEventListener('click', function (e) {
        var card = e.target.closest('[data-wanderer-id]');
        if (!card) return;
        returnFocus = card;
        openCard(card.getAttribute('data-wanderer-id'));
      });
    }
    render();
    document.addEventListener('booha:saved', render);
    document.addEventListener('booha:weeklyReset', render);
  }

  window.BoohaWandererAtlas = { render: render, _test: { hearts: hearts, nextHeartAt: nextHeartAt, HEART_STEPS: HEART_STEPS } };

  if (window.BOOHA_READY) init();
  else document.addEventListener('booha:ready', init, { once: true });
})();
