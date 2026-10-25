/*
 * Karasuki Cards — Pass 2b: the card introduction overlay and the teaser
 * banner copy. DOM only; rules live in js/karasuki-cards.js and the map
 * takeover lives in js/karasuki.js.
 *
 * Copy is narrator voice (not the Wanderer's) so it fits every host,
 * including Wanderers who cannot talk. Pre-Boo (pb) gets hiragana; other
 * tracks get kanji with furigana. The Wanderer's own line comes from
 * js/karasuki-wanderer-data.js, the single source of truth.
 */
(function () {
  'use strict';

  const KIND = {
    friendly:    { accent: '#F2C14E', ink: '#2A1A0E', en: 'FRIENDLY',    jp: 'やさしい' },
    mischievous: { accent: '#FF8AD0', ink: '#24102E', en: 'MISCHIEVOUS', jp: 'いたずら' },
    dangerous:   { accent: '#FF6B74', ink: '#1A0B0D', en: 'DANGEROUS',   jp: 'きけん' },
  };

  // [english, japanese (kanji), furigana map, pre-boo hiragana]
  const TEASER_LEAD = ['Something has changed in Karasuki.', 'カラスキーで、何かが変わった。',
    { '何': 'なに', '変': 'か' }, 'カラスキーで、なにかが かわった。'];
  const TEASER = {
    locked: ["Finish this week's Blitz to find out why.", '今週のブリッツを終えると、その理由がわかる。',
      { '今週': 'こんしゅう', '終': 'お', '理由': 'りゆう' }, 'こんしゅうの ブリッツを おえると、りゆうが わかるよ。'],
    tomorrow: ['Come back tomorrow. You have one more try this week.', 'あしたまた来てね。今週は、あと1回チャレンジできるよ。',
      { '来': 'き', '今週': 'こんしゅう', '回': 'かい' }, 'あした また きてね。こんしゅうは あと 1かい チャレンジできるよ。'],
    outOfAttempts: ["Try again next week, after next week's Blitz.", '来週のブリッツのあとで、またチャレンジしよう。',
      { '来週': 'らいしゅう' }, 'らいしゅうの ブリッツの あとで、また チャレンジしよう。'],
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function furi(text, map) {
    return window.UtsuFurigana && window.UtsuFurigana.sentence ? window.UtsuFurigana.sentence(text, map) : esc(text);
  }
  function jpLine(entry, preBoo) { return preBoo ? esc(entry[3]) : furi(entry[1], entry[2]); }
  function motionReduced() {
    const root = document.documentElement;
    return root.getAttribute('data-motion') === 'reduced'
      || (root.getAttribute('data-power') && root.getAttribute('data-power') !== 'full')
      || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // The card stays face down until it is won (the reveal is Pass 2c).
  function backWidth() {
    const mq = q => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
    if (mq('(max-height:520px)')) return Math.round(Math.min(150, window.innerWidth * 0.26));
    if (mq('(max-width:560px) and (min-height:521px)')) return 130;
    return Math.round(Math.min(200, window.innerWidth * 0.30));
  }

  /** Banner for the normal story popup when the host is a teaser. */
  function teaserHTML(phase, curriculum) {
    const second = TEASER[phase];
    if (!second) return '';
    const preBoo = curriculum === 'pb';
    return `<p class="kc-teaser-en">${esc(TEASER_LEAD[0])} ${esc(second[0])}</p>`
      + `<p class="kc-teaser-jp" lang="ja">${jpLine(TEASER_LEAD, preBoo)}<br>${jpLine(second, preBoo)}</p>`;
  }

  let overlay = null;
  let lastFocus = null;
  let current = null;

  function injectStyles() {
    if (document.getElementById('kc-encounter-style')) return;
    const style = document.createElement('style');
    style.id = 'kc-encounter-style';
    style.textContent = `
#kc-encounter{position:fixed;inset:0;z-index:9200;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.82);padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box;opacity:0;transition:opacity .25s ease}
#kc-encounter.is-open{display:flex}
#kc-encounter.is-visible{opacity:1}
#kc-encounter .kc-box{position:relative;display:flex;gap:22px;align-items:center;max-width:min(760px,96vw);max-height:92vh;overflow-y:auto;box-sizing:border-box;padding:22px 24px;border-radius:12px;background:#080810;color:#fff;font-family:Georgia,serif;transform:translateY(10px) scale(.98);transition:transform .25s ease}
#kc-encounter.is-visible .kc-box{transform:none}
#kc-encounter.kc-still,#kc-encounter.kc-still .kc-box{transition:none}
#kc-encounter .kc-art{flex:0 0 auto;align-self:center;border-radius:18px;line-height:0}
#kc-encounter .kc-copy{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:10px;text-align:left}
#kc-encounter .kc-eyebrow{margin:0;font:800 11px/1.3 system-ui,sans-serif;letter-spacing:.14em}
#kc-encounter .kc-title{margin:0;font-size:clamp(1.15rem,3.2vw,1.6rem);line-height:1.2}
#kc-encounter .kc-jp{margin:0;font-size:clamp(.88rem,2.4vw,1rem);line-height:1.9;opacity:.92}
#kc-encounter .kc-quote{margin:0;padding-left:12px;border-left:2px solid currentColor;font-style:italic;font-size:.95rem;line-height:1.5}
#kc-encounter .kc-quote span{display:block;font-style:normal;font-size:.86rem;opacity:.85;margin-top:2px}
#kc-encounter .kc-tries{margin:0;font:600 13px/1.5 system-ui,sans-serif;color:#d8d2e6}
#kc-encounter .kc-note{margin:0;font:600 13px/1.5 system-ui,sans-serif;color:#ffd166}
#kc-encounter .kc-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
#kc-encounter .kc-actions button{min-height:48px;padding:0 20px;border-radius:12px;font:800 16px/1.2 system-ui,sans-serif;cursor:pointer}
#kc-encounter .kc-start{border:0}
#kc-encounter .kc-later{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.35)}
#kc-encounter .kc-actions small{display:block;font-weight:700;font-size:12px;opacity:.85}
@media (max-height:520px){#kc-encounter .kc-box{padding:14px 18px;gap:16px}#kc-encounter .kc-quote{display:none}}
@media (max-width:560px) and (min-height:521px){#kc-encounter .kc-box{flex-direction:column;align-items:stretch}}
.kc-teaser{margin:0 0 16px;padding:10px 12px;border-radius:8px;background:rgba(201,184,255,.1);border:1px solid rgba(201,184,255,.35);text-align:left}
.kc-teaser p{margin:0;color:#ece6ff;font-size:.9rem;line-height:1.6}
.kc-teaser .kc-teaser-jp{margin-top:4px;line-height:1.9}`;
    document.head.appendChild(style);
  }

  function build() {
    if (overlay) return overlay;
    injectStyles();
    overlay = document.createElement('div');
    overlay.id = 'kc-encounter';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'kc-title');
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) close(); });
    return overlay;
  }

  /**
   * opts: { name, nameJP, furigana, kind, card: { art, no }, comment: { en, jp, furigana },
   *         status: KarasukiCards.status(), curriculum, onStart, onClose }
   */
  function open(opts) {
    const o = opts || {};
    const st = o.status || {};
    const kind = KIND[o.kind] || KIND.friendly;
    const preBoo = o.curriculum === 'pb';
    const inProgress = st.phase === 'inProgress';
    const name = esc(o.name);
    const nameJP = furi(o.nameJP || '', o.furigana || {});
    const comment = o.comment || {};
    const eyebrow = st.surprise ? 'SOMETHING HAS CHANGED' : `KARASUKI CARD · ${kind.en}`;
    const title = inProgress ? `${name}'s challenge is waiting!` : `${name} has a challenge for you!`;
    const titleJP = inProgress
      ? (preBoo ? `${nameJP}の チャレンジが まってるよ!` : `${nameJP}${furi('のチャレンジが待ってるよ!', { '待': 'ま' })}`)
      : (preBoo ? `${nameJP}から チャレンジだよ!` : `${nameJP}からのチャレンジ!`);
    const howEN = inProgress
      ? `Round ${Math.min(10, (st.round || 0) + 1)} of 10 · ${st.score || 0} right so far.`
      : `A word will appear, then hide. Type it from memory. Get 8 out of 10 to win ${name}'s card.`;
    const howJP = inProgress
      ? (preBoo ? `10もんの うち ${st.round || 0}もん おわったよ。` : furi(`10問のうち${st.round || 0}問おわったよ。`, { '問': 'もん' }))
      : (preBoo ? 'ことばが でてきて、すぐに かくれるよ。おぼえて タイプしよう。10もんの うち 8もん せいかいで、カードが もらえるよ!'
        : furi('ことばが出てきて、すぐにかくれるよ。おぼえて、タイプしよう。10問のうち8問せいかいで、カードがもらえる!', { '出': 'で', '問': 'もん' }));
    const tries = inProgress ? '' : `Try ${st.nextTry || 1} of 2 this week · one try a day`;
    const triesJP = inProgress ? '' : (preBoo ? `こんしゅう ${st.nextTry || 1}かいめ(1しゅうかんに 2かい・1にち 1かい)`
      : furi('今週は2回まで(1日1回)', { '今週': 'こんしゅう', '回': 'かい', '日': 'にち' }));
    const quote = comment.en
      ? `<p class="kc-quote" style="color:${kind.accent}">“${esc(comment.en)}”<span style="color:#fff" lang="ja">${furi(comment.jp || '', comment.furigana || {})}</span></p>`
      : '';
    const art = window.KarasukiCardFace
      ? `<div class="kc-art" style="box-shadow:0 0 0 3px ${kind.accent},0 0 30px ${kind.accent}66">${window.KarasukiCardFace.back({ width: backWidth() })}</div>`
      : '';

    build();
    current = o;
    overlay.className = 'is-open' + (motionReduced() ? ' kc-still' : '');
    overlay.innerHTML = `
      <div class="kc-box" style="border:1px solid ${kind.accent}66;box-shadow:0 0 0 1px ${kind.accent}33,0 0 40px ${kind.accent}44">
        ${art}
        <div class="kc-copy">
          <p class="kc-eyebrow" style="color:${kind.accent}">${esc(eyebrow)}</p>
          <h2 class="kc-title" id="kc-title" style="color:${kind.accent}">${title}</h2>
          <p class="kc-jp" lang="ja">${titleJP}</p>
          <p class="kc-jp">${esc(howEN)}<br><span lang="ja">${howJP}</span></p>
          ${quote}
          ${tries ? `<p class="kc-tries">${esc(tries)}<br><span lang="ja">${triesJP}</span></p>` : ''}
          <p class="kc-note" hidden></p>
          <div class="kc-actions">
            <button type="button" class="kc-start" style="background:${kind.accent};color:${kind.ink}">${inProgress ? 'Continue' : 'Start'}<small lang="ja">${inProgress ? 'つづける' : 'はじめる'}</small></button>
            <button type="button" class="kc-later">Not now<small lang="ja">あとで</small></button>
          </div>
        </div>
      </div>`;
    lastFocus = document.activeElement;
    overlay.querySelector('.kc-later').addEventListener('click', close);
    overlay.querySelector('.kc-start').addEventListener('click', () => {
      if (typeof o.onStart === 'function') { o.onStart(); return; }
      const note = overlay.querySelector('.kc-note');
      note.textContent = 'The 10-round challenge arrives in Pass 2c.';
      note.hidden = false;
    });
    requestAnimationFrame(() => { if (overlay) overlay.classList.add('is-visible'); });
    const start = overlay.querySelector('.kc-start');
    if (start) start.focus({ preventScroll: true });
    if (window.UtsuSfx && typeof window.UtsuSfx.popupOpen === 'function') window.UtsuSfx.popupOpen();
  }

  function isOpen() { return !!overlay && overlay.classList.contains('is-open'); }

  function close() {
    if (!isOpen()) return;
    const done = current && current.onClose;
    current = null;
    overlay.classList.remove('is-visible');
    const finish = () => { if (overlay) { overlay.className = ''; overlay.innerHTML = ''; } };
    if (motionReduced()) finish(); else setTimeout(finish, 250);
    if (window.UtsuSfx && typeof window.UtsuSfx.popupClose === 'function') window.UtsuSfx.popupClose();
    if (lastFocus && typeof lastFocus.focus === 'function') { try { lastFocus.focus({ preventScroll: true }); } catch (_) {} }
    if (typeof done === 'function') done();
  }

  window.KarasukiCardEncounter = Object.freeze({ open, close, isOpen, teaserHTML, KIND });
})();
