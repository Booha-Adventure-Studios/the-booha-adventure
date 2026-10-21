/**
 * adventure-game.js
 * The Booha Adventure — Adventure profile ("candy moon arcade").
 *
 * Mounts (adventure-profile.html):
 *   #adv-title        "<NAME>の ぼうけん"
 *   #adv-score        collection ring: wanderers + skins + arcade records
 *   #adv-closet       seasonal skin closet
 *   #adv-travelers    Nuppi and seasonal travelers the player has tapped
 *
 * Skins: only this week's skin can be worn (after the Blitz triple), so past
 * skins show as collected trophies. A weekly skin that was missed is gone for
 * good and shows as locked.
 */
const BoohaAdventureGame = (() => {
  'use strict';

  const BLITZ_TYPES = ['vocab', 'sentences', 'questions'];
  const SEASON_STYLE = {
    halloween: { jp: 'ハロウィン', cls: 'halloween' },
    christmas: { jp: 'クリスマス', cls: 'christmas' },
  };
  const TRAVELERS = [
    { id: 'nuppi', name: 'Nuppi', img: 'assets/img/wanderers/nuppi-1.webp', note: 'いつも たびしてる', always: true },
    { id: 'barba', name: 'Barba', img: 'assets/img/wanderers/barba.webp', seasonId: 'halloween-2026', note: 'ハロウィン 2026' },
  ];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function fallback(host, label, error) {
    console.error(`[AdventureGame] ${label} failed:`, error);
    if (host) host.innerHTML = `<div class="adv-fallback" role="status"><strong>${esc(label)} is temporarily unavailable.</strong><small>Try refreshing this page.</small></div>`;
  }

  function todayKey() {
    try { return window.CALENDAR && CALENDAR.getTodayKey ? CALENDAR.getTodayKey() : new Date().toISOString().slice(0, 10); } catch (_) { return ''; }
  }

  function weekKey() {
    try {
      const cw = CALENDAR.getCurrentCurriculumWeek();
      return { key: CALENDAR.getCurriculumWeekOccurrenceKey ? CALENDAR.getCurriculumWeekOccurrenceKey(cw) : cw.occurrenceKey, start: cw.weekStart };
    } catch (_) {
      return { key: '', start: '' };
    }
  }

  function shortDate(key) {
    const m = String(key || '').match(/^\d{4}-(\d{2})-(\d{2})/);
    return m ? `${Number(m[1])}/${Number(m[2])}` : '';
  }

  /** Blitz clears this week in the best curriculum (for the weekly skin). */
  function blitzCount(data) {
    const blitz = data && data.meta && data.meta.blitz;
    const wk = weekKey().key;
    if (!isObject(blitz) || !wk || blitz.weeklyKey !== wk || !isObject(blitz.weekly)) return 0;
    let best = 0;
    ['pb', 'br', 'bc'].forEach(curr => {
      best = Math.max(best, BLITZ_TYPES.filter(type => !!(blitz.weekly[type] && blitz.weekly[type][curr])).length);
    });
    return best;
  }

  function seasons() {
    const S = window.BoohaSkins;
    if (!S || !S.SEASONS) return [];
    return Object.keys(S.SEASONS).map(id => S.SEASONS[id]).filter(Boolean)
      .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  }

  function skinStates(data) {
    const S = window.BoohaSkins;
    const today = todayKey();
    const wk = weekKey();
    const selected = S.selectedId ? S.selectedId() : null;
    return seasons().map(season => {
      const chars = S.seasonCharacters ? S.seasonCharacters(season.id) : [];
      const weekly = season.weeklyCharacterIds || {};
      const dateFor = id => Object.keys(weekly).sort().find(date => weekly[date] === id) || null;
      const current = S.rotationCharacterId ? S.rotationCharacterId(season.id) : null;
      const started = !season.startDate || today >= season.startDate;
      const skins = chars.map(skin => {
        const date = dateFor(skin.id);
        const collected = S.isCollected ? S.isCollected(skin.id) : false;
        let state;
        if (selected === skin.id) state = 'wearing';
        else if (S.isUnlocked && S.isUnlocked(skin.id)) state = 'wearable';
        else if (collected) state = 'owned';
        else if (current === skin.id && started) state = 'thisweek';
        else if (date && wk.start && date < wk.start) state = 'missed';
        else state = 'soon';
        return { id: skin.id, name: skin.name.replace(/ Booha$/, ''), src: skin.assets.maze || skin.assets.static, date, collected: collected || state === 'wearing' || state === 'wearable', state };
      });
      const mascot = season.mascotId && S.get ? S.get(season.mascotId) : null;
      return { season, started, skins, mascot };
    });
  }

  /* ── renderers ──────────────────────────────────────────────── */

  function renderTitle() {
    const el = document.getElementById('adv-title');
    if (!el) return;
    let name = '';
    try { name = (localStorage.getItem('booha_first_name') || '').trim().slice(0, 12).toUpperCase(); } catch (_) {}
    el.textContent = name ? `${name}の ぼうけん` : 'ぼくの ぼうけん';
  }

  function renderScore(data, closet) {
    const host = document.getElementById('adv-score');
    if (!host) return;
    const source = window.KARASUKI_WANDERER_DATA || {};
    const wanderers = isObject(data.collection) && isObject(data.collection.wanderers) ? data.collection.wanderers : {};
    const total = Object.keys(source).length;
    const found = Object.keys(source).filter(name => wanderers[source[name].id]).length;
    const skinsAll = closet.reduce((n, c) => n + c.skins.length, 0);
    const skinsGot = closet.reduce((n, c) => n + c.skins.filter(s => s.collected).length, 0);
    let arcadeAll = 0;
    let arcadePlayed = 0;
    try {
      const R = BoohaAdventure.registry;
      const S = BoohaAdventure.scores;
      R.getBonusGames().forEach(g => {
        arcadeAll++;
        if (S.getEntry(g.saveId).attempts > 0) arcadePlayed++;
      });
    } catch (_) {}
    const all = total + skinsAll + arcadeAll;
    const pct = all ? Math.round((found + skinsGot + arcadePlayed) / all * 100) : 0;
    host.innerHTML = `
      <div class="adv-ring" style="--pct:${pct}%">
        <div class="adv-ring-inner"><b>${pct}%</b><span>コレクション</span></div>
      </div>
      <div class="adv-score-rows">
        <a class="adv-score-row lime" href="#atlas"><span>たびびと</span><b>${found}/${total}</b></a>
        <a class="adv-score-row pink" href="#closet"><span>スキン</span><b>${skinsGot}/${skinsAll}</b></a>
        <a class="adv-score-row cyan" href="#arcade"><span>アーケード きろく</span><b>${arcadePlayed}/${arcadeAll}</b></a>
      </div>`;
  }

  const TAG = {
    wearing: 'きている！',
    wearable: 'きる',
    owned: 'ゲット！',
    missed: 'ロック',
    soon: '',
  };

  // First visit to the closet: explain once that missed skins are gone but
  // this week's skin can still be earned.
  const CLOSET_INTRO_KEY = 'booha_closet_intro_v1';
  function closetIntroSeen() {
    try { return localStorage.getItem(CLOSET_INTRO_KEY) === '1'; } catch (_) { return true; }
  }

  function renderCloset(data, closet) {
    const host = document.getElementById('adv-closet');
    if (!host) return;
    const blitz = blitzCount(data);
    const got = closet.reduce((n, c) => n + c.skins.filter(s => s.collected).length, 0);
    const all = closet.reduce((n, c) => n + c.skins.length, 0);
    const NOW_FIRST = { wearing: 0, wearable: 0, thisweek: 0 };
    const shelves = closet.map(({ season, started, skins: allSkins, mascot }) => {
      // This week's skin (the one a student can still get) leads its shelf.
      const skins = allSkins.slice().sort((a, b) => (a.state in NOW_FIRST ? 0 : 1) - (b.state in NOW_FIRST ? 0 : 1));
      const mascotSrc = mascot && mascot.assets ? mascot.assets.static : '';
      const style = SEASON_STYLE[season.themeId] || { jp: season.name, cls: 'other' };
      const year = String(season.startDate || '').slice(0, 4);
      if (!started) {
        return `
          <div class="closet-shelf soon ${style.cls}">
            <div class="closet-head"><span>${esc(style.jp)} ${esc(year)}</span><b>${esc(shortDate(season.startDate))} から！</b></div>
            <div class="closet-preview">
              ${mascot ? `<img class="closet-mascot" src="${esc(mascot.assets.static)}" alt="${esc(mascot.name)}" width="70" height="70" loading="lazy" decoding="async">` : ''}
              <div><p>${mascot ? `${esc(mascot.name)} が やってくる！ ` : ''}あたらしい スキン ${skins.length}こ</p>
              <div class="closet-silhouettes">${skins.map(s => `<img src="${esc(s.src)}" alt="" width="26" height="26" loading="lazy" decoding="async" data-fallback="${esc(mascotSrc)}">`).join('')}</div></div>
            </div>
          </div>`;
      }
      return `
        <div class="closet-shelf ${style.cls}">
          <div class="closet-head"><span>${esc(style.jp)} ${esc(year)}</span><b>${skins.filter(s => s.collected).length} / ${skins.length}</b></div>
          <span class="closet-rail" aria-hidden="true"></span>
          <div class="closet-grid">
            ${skins.map(s => {
              const label = s.state === 'thisweek' ? `Blitz ${blitz}/3` : s.state === 'soon' ? (s.date ? `${shortDate(s.date)}〜` : 'まだ') : TAG[s.state];
              const action = s.state === 'wearable'
                ? `<button type="button" class="closet-tag wearable" data-equip="${esc(s.id)}">きる</button>`
                : `<span class="closet-tag ${s.state}">${esc(label)}</span>`;
              return `
              <div class="closet-skin ${s.state}${s.state in NOW_FIRST ? ' now' : ''}">
                <span class="closet-hanger" aria-hidden="true"></span>
                ${s.state === 'thisweek' ? '<span class="closet-now-tag">こんしゅう！</span>' : ''}
                <img src="${esc(s.src)}" alt="${esc(s.name)} Booha${s.collected ? '' : ' (not collected)'}" width="72" height="72" loading="lazy" decoding="async" data-fallback="${esc(mascotSrc)}">
                <span class="closet-name">${esc(s.name)}</span>
                ${action}
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');
    host.innerHTML = `
      <div class="adv-head">
        <div><h2>ワードローブ</h2><span class="adv-kicker pink">SKIN CLOSET</span></div>
        <b class="adv-head-num pink">${got}/${all}</b>
      </div>
      ${closetIntroSeen() ? '' : `<div class="closet-intro" role="note">
        <b>スキンは 1しゅうかんに 1つ！</b>
        <p>みのがした スキンは もう もどって こないよ。でも こんしゅうの スキンは まだ まにあう！ Blitz を 3つ クリアしよう。</p>
        <button type="button" class="closet-intro-ok" data-closet-intro>わかった！</button>
      </div>`}
      <p class="adv-note"${closetIntroSeen() ? '' : ' hidden'}>こんしゅうの スキンは Blitz を 3つ クリアすると きられるよ。みのがした スキンは もう もどって こないよ！</p>
      ${shelves || '<p class="adv-note">スキンは まだ ないよ。</p>'}`;
    // Art for later skins may not exist yet. Show the season mascot as a
    // dashed "coming soon" silhouette instead; if that fails too, a "?".
    host.querySelectorAll('.closet-shelf img').forEach(img => {
      function toQuestion() {
        const q = document.createElement('span');
        q.className = img.classList.contains('closet-mascot') ? 'closet-q mascot' : 'closet-q';
        q.textContent = '?';
        q.setAttribute('aria-hidden', 'true');
        img.replaceWith(q);
      }
      img.addEventListener('error', function onError() {
        const fb = img.getAttribute('data-fallback');
        if (fb && img.getAttribute('src') !== fb) {
          img.classList.add('closet-ph');
          const skin = img.closest('.closet-skin');
          if (skin) skin.classList.add('placeholder');
          img.setAttribute('src', fb);
          return;
        }
        img.removeEventListener('error', onError);
        toQuestion();
      });
    });
    const introOk = host.querySelector('[data-closet-intro]');
    if (introOk) introOk.addEventListener('click', () => {
      try { localStorage.setItem(CLOSET_INTRO_KEY, '1'); } catch (_) {}
      const card = introOk.closest('.closet-intro');
      if (card) card.remove();
      const note = host.querySelector('.adv-note[hidden]');
      if (note) note.hidden = false;
    });
    host.querySelectorAll('[data-equip]').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          if (window.BoohaSkins && BoohaSkins.equip(btn.getAttribute('data-equip'))) render();
        } catch (e) { console.warn('[AdventureGame] equip failed:', e); }
      });
    });
  }

  function renderTravelers() {
    const host = document.getElementById('adv-travelers');
    if (!host) return;
    const met = window.BoohaTravelers ? BoohaTravelers.all() : {};
    let season = null;
    try { season = window.BoohaSkins && BoohaSkins.seasonIdForDate ? BoohaSkins.seasonIdForDate() : null; } catch (_) {}
    const cards = TRAVELERS.filter(t => t.always || met[t.id] || t.seasonId === season).map(t => {
      const rec = met[t.id];
      if (!rec) return `<div class="adv-traveler unknown"><span class="adv-q" aria-hidden="true">?</span><b>???</b><span>${esc(t.always ? 'からすき や むえんば で' : t.note)}</span></div>`;
      return `<div class="adv-traveler ${t.always ? 'always' : 'seasonal'}"><img src="${esc(t.img)}" alt="${esc(t.name)}" width="70" height="70" loading="lazy" decoding="async"><b>${esc(t.name)}</b><span>${esc(t.note)} · ×${Number(rec.visits) || 1}</span></div>`;
    });
    cards.push('<div class="adv-traveler unknown"><span class="adv-q" aria-hidden="true">?</span><b>???</b><span>つぎの きせつに…</span></div>');
    host.innerHTML = `
      <div class="adv-head"><div><h2>たびの なかま</h2><span class="adv-kicker cyan">TRAVELERS · SEASONAL GUESTS</span></div></div>
      <div class="adv-traveler-row">${cards.join('')}</div>`;
  }

  function render() {
    renderTitle();
    let data = {};
    try { data = BoohaAdventure.save.load() || {}; } catch (_) {}
    let closet = [];
    try { closet = window.BoohaSkins ? skinStates(data) : []; } catch (e) { console.warn('[AdventureGame] skins unavailable:', e); }
    [
      [() => renderScore(data, closet), 'adv-score', 'Collection score'],
      [() => renderCloset(data, closet), 'adv-closet', 'Skin closet'],
      [renderTravelers, 'adv-travelers', 'Travelers'],
    ].forEach(([fn, id, label]) => {
      try { fn(); } catch (error) { fallback(document.getElementById(id), label, error); }
    });
  }

  if (window.BOOHA_READY) render();
  else document.addEventListener('booha:ready', render, { once: true });
  document.addEventListener('booha:saved', render);
  document.addEventListener('booha:weeklyReset', render);

  return { render, _test: { skinStates, blitzCount } };
})();

window.BoohaAdventureGame = BoohaAdventureGame;
