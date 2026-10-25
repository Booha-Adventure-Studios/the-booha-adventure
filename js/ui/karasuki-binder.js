/**
 * karasuki-binder.js
 * The Booha Adventure — Karasuki Cards binder (Pass 3), adventure-profile.html.
 *
 * Mounts #karasuki-cards. The section stays hidden until the student has won
 * a card, and it only ever talks about cards they own: no counts or totals,
 * no empty slots, no hints about what is still out there.
 *
 *   shelf     won cards in card-number order, swipeable, filter by kind
 *   NEW       until the card is first opened here (karasukiCards.won[id].viewedAt,
 *             in the student's own save — never device-wide)
 *   zoom      tap a card to see it large; arrows step through the shelf
 *
 * Faces come from js/karasuki-card-face.js, the same renderer as the reveal.
 */
const BoohaKarasukiBinder = (() => {
  'use strict';

  const FILTERS = [
    ['all', 'すべて', 'ALL'],
    ['friendly', 'なかよし', 'FRIENDLY'],
    ['mischievous', 'いたずら', 'MISCHIEVOUS'],
    ['dangerous', 'きけん', 'DANGEROUS'],
  ];
  let filter = 'all';
  let zoom = null;
  let lastFocus = null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function injectStyles() {
    if (document.getElementById('kb-style')) return;
    const style = document.createElement('style');
    style.id = 'kb-style';
    style.textContent = `
.cards-section .kb-intro{margin:0 0 12px;font-size:13px;line-height:1.7;color:var(--muted,#c9b0d8)}
.cards-section .kb-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.cards-section .kb-filter{min-height:44px;padding:0 14px;border-radius:999px;border:1.5px solid var(--line,#3a2a50);background:transparent;color:var(--ink,#fdf2ff);font:700 13px/1.2 var(--font-body,'Zen Maru Gothic',sans-serif);cursor:pointer}
.cards-section .kb-filter[aria-pressed="true"]{background:var(--ink,#fdf2ff);color:var(--night,#120a24);border-color:var(--ink,#fdf2ff)}
.cards-section .kb-filter.friendly{border-color:#F2C14E}.cards-section .kb-filter.mischievous{border-color:#FF8AD0}.cards-section .kb-filter.dangerous{border-color:#FF6B74}
.cards-section .kb-shelf{display:flex;gap:16px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:12px 4px 16px;border-radius:16px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px var(--line,#3a2a50)}
.cards-section .kb-card{position:relative;flex:0 0 auto;scroll-snap-align:start;padding:0;border:0;background:none;cursor:pointer;line-height:0;border-radius:12px}
.cards-section .kb-card:focus-visible{outline:3px solid var(--cyan,#3de8ff);outline-offset:4px}
.cards-section .kb-new{position:absolute;top:-8px;right:-6px;z-index:2;padding:4px 9px;border-radius:999px;background:var(--lemon,#ffe45c);color:#120a24;font:900 11px/1 var(--font-body,sans-serif);letter-spacing:.06em;box-shadow:0 2px 8px rgba(0,0,0,.4)}
.cards-section .kb-empty{margin:0;padding:24px 8px;font-size:13px;color:var(--muted,#c9b0d8)}
#kb-zoom{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;gap:12px;padding:16px;background:rgba(8,4,16,.92);opacity:0;transition:opacity .2s ease}
#kb-zoom.is-visible{opacity:1}
#kb-zoom .kb-zoom-card{line-height:0;transform:scale(.96);transition:transform .2s ease}
#kb-zoom.is-visible .kb-zoom-card{transform:none}
#kb-zoom button{flex:0 0 auto;min-width:48px;min-height:48px;border-radius:999px;border:1.5px solid rgba(255,255,255,.35);background:rgba(0,0,0,.4);color:#fff;font:800 20px/1 system-ui,sans-serif;cursor:pointer}
#kb-zoom button:disabled{opacity:.25;cursor:default}
#kb-zoom .kb-close{position:absolute;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));font-size:15px;padding:0 16px}
#kb-zoom .kb-close small{display:block;font-size:11px;opacity:.85}`;
    document.head.appendChild(style);
  }

  function state() {
    const K = window.KarasukiCards;
    const api = window.BoohaAdventure && BoohaAdventure.save;
    if (!K || !api) return null;
    return K.normalizeState(api.load().karasukiCards);
  }

  function owned() {
    const s = state();
    const K = window.KarasukiCards;
    if (!s || !K) return [];
    const data = window.KARASUKI_WANDERER_DATA || {};
    return K.registry()
      .filter(c => s.won[c.id])
      .map(c => Object.assign({}, c, {
        won: s.won[c.id],
        kind: ((data[c.name] || {}).kind) || 'friendly',
      }));
  }

  function faceFor(card, width) {
    const w = card.won;
    return window.KarasukiCardFace.fromRegistry(card.id, { width, result: { score: w.score, wonAt: w.wonAt, try: w.try } });
  }

  function shelfWidth() { return window.innerWidth >= 700 ? 160 : 140; }

  function render() {
    const host = document.getElementById('karasuki-cards');
    if (!host || !window.KarasukiCardFace) return;
    const cards = owned();
    // Hidden entirely until the first card is won — no hints before that.
    host.hidden = cards.length === 0;
    if (!cards.length) { host.innerHTML = ''; return; }
    injectStyles();
    const count = kind => cards.filter(c => c.kind === kind).length;
    const shown = cards.filter(c => filter === 'all' || c.kind === filter);
    const width = shelfWidth();
    const chips = FILTERS
      .filter(([key]) => key === 'all' || count(key) > 0)
      .map(([key, jp, en]) => `<button type="button" class="kb-filter ${key}" data-kb-filter="${key}" aria-pressed="${filter === key}">${jp} ${en}</button>`)
      .join('');
    host.innerHTML = `
      <div class="adv-head">
        <div><h2 id="cards-title">カラスキーカード</h2><span class="adv-kicker pink">KARASUKI CARDS · Cards Won</span></div>
      </div>
      <p class="kb-intro">Win a Wanderer's card in Karasuki after this week's Blitz. Tap a card to see it big.<br>
        <span lang="ja">カードを タップすると、<ruby>大<rt>おお</rt></ruby>きく <ruby>見<rt>み</rt></ruby>られるよ。</span></p>
      <div class="kb-filters" role="group" aria-label="Filter cards">${chips}</div>
      <div class="kb-shelf" role="group" aria-label="Your Karasuki cards">
        ${shown.map(c => `
          <button type="button" class="kb-card" data-kb-card="${esc(c.id)}" aria-label="Open ${esc(c.name)}'s card${c.won.viewedAt ? '' : ' (new)'}">
            ${c.won.viewedAt ? '' : '<span class="kb-new" aria-hidden="true">NEW</span>'}
            ${faceFor(c, width)}
          </button>`).join('') || '<p class="kb-empty">No cards of this kind yet. · まだ ないよ。</p>'}
      </div>`;
    host.querySelectorAll('[data-kb-filter]').forEach(btn => btn.addEventListener('click', () => {
      filter = btn.getAttribute('data-kb-filter');
      render();
      const again = host.querySelector(`[data-kb-filter="${filter}"]`);
      if (again) again.focus();
    }));
    host.querySelectorAll('[data-kb-card]').forEach(btn => btn.addEventListener('click', () => open(btn.getAttribute('data-kb-card'))));
  }

  /* ── zoom ─────────────────────────────────────────────────────── */

  function zoomWidth() {
    return Math.round(Math.max(160, Math.min(380, (window.innerHeight - 48) * 2 / 3, window.innerWidth - 150)));
  }

  function open(cardId) {
    const list = owned().filter(c => filter === 'all' || c.kind === filter);
    const index = list.findIndex(c => c.id === cardId);
    if (index < 0) return;
    lastFocus = document.activeElement;
    zoom = { list, index };
    if (!document.getElementById('kb-zoom')) {
      const el = document.createElement('div');
      el.id = 'kb-zoom';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.addEventListener('click', e => { if (e.target === el) close(); });
      document.body.appendChild(el);
      document.addEventListener('keydown', onKey);
    }
    show();
    requestAnimationFrame(() => { const el = document.getElementById('kb-zoom'); if (el) el.classList.add('is-visible'); });
  }

  function show() {
    const el = document.getElementById('kb-zoom');
    const card = zoom.list[zoom.index];
    el.setAttribute('aria-label', `${card.name}'s card`);
    el.innerHTML = `
      <button type="button" class="kb-prev" aria-label="Previous card" ${zoom.index === 0 ? 'disabled' : ''}>‹</button>
      <div class="kb-zoom-card">${faceFor(card, zoomWidth())}</div>
      <button type="button" class="kb-next" aria-label="Next card" ${zoom.index === zoom.list.length - 1 ? 'disabled' : ''}>›</button>
      <button type="button" class="kb-close">Close<small lang="ja">とじる</small></button>`;
    el.querySelector('.kb-prev').addEventListener('click', () => step(-1));
    el.querySelector('.kb-next').addEventListener('click', () => step(1));
    el.querySelector('.kb-close').addEventListener('click', close);
    el.querySelector('.kb-close').focus({ preventScroll: true });
    // Opening a card is what clears its NEW tag (saved per student).
    if (!card.won.viewedAt && window.KarasukiCards) {
      try { KarasukiCards.viewed(card.id); card.won.viewedAt = Date.now(); } catch (e) { console.warn('[KarasukiBinder] viewed write failed:', e); }
    }
  }

  function step(delta) {
    if (!zoom) return;
    const next = zoom.index + delta;
    if (next < 0 || next >= zoom.list.length) return;
    zoom.index = next;
    show();
  }

  function onKey(e) {
    if (!zoom) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  function close() {
    const el = document.getElementById('kb-zoom');
    zoom = null;
    if (el) el.remove();
    document.removeEventListener('keydown', onKey);
    render();   // NEW tags update
    const target = lastFocus && lastFocus.getAttribute && lastFocus.getAttribute('data-kb-card');
    const again = target && document.querySelector(`[data-kb-card="${target}"]`);
    if (again) again.focus({ preventScroll: true });
  }

  function boot() {
    try { render(); } catch (e) {
      console.error('[KarasukiBinder] render failed:', e);
      const host = document.getElementById('karasuki-cards');
      if (host) host.hidden = true;
    }
  }

  if (window.BOOHA_READY) boot();
  else document.addEventListener('booha:ready', boot, { once: true });

  return { render, open, close };
})();

window.BoohaKarasukiBinder = BoohaKarasukiBinder;
