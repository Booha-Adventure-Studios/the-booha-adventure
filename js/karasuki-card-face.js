/*
 * Karasuki Cards — the shared card face and card back (Pass 2b.1).
 *
 * One renderer for every place a card appears: the win reveal (2c), the
 * binder shelf and tap-to-zoom (3). Built as page elements, not canvas, so
 * text stays sharp, furigana works, and later effects (holo sheen) can use
 * opacity/transform only.
 *
 * Layout is authored at 380×570 (2:3, the art's ratio) and scaled to any
 * width with one transform, so every card is pixel-identical at any size.
 * Copy comes from js/karasuki-wanderer-data.js (single source of truth).
 *
 *   KarasukiCardFace.face({ card, name, nameJP, furigana, kind, comment, result, width, info })
 *   KarasukiCardFace.back({ width })
 *   KarasukiCardFace.fromRegistry(cardId, { result, width, info })   // looks up the copy
 *   KarasukiCardFace.setInfo(element, on)     // slide the info panel up/down
 *   KarasukiCardFace.shine(element)           // play the kind foil once (Pass C2)
 *   KarasukiCardFace.foil(element, x)         // hold the foil at x (0–1); null ends
 *
 * Pass C1 — full-art face: the art fills the card; the Lv. / kind / No.
 * badges and a slim name ribbon always show. The quote, Japanese line and
 * stats live in an info panel that slides up over the art (info: true, or
 * setInfo) and away again, so the character is never hidden for long.
 *
 * Pass C2 — kind foil: friendly cards catch a soft gold glint, mischievous
 * cards a candy rainbow shimmer, dangerous cards a dim red flicker at the
 * edges. It plays once (shine) when a card lands or opens, and follows the
 * finger (foil) when a big card is dragged. Transform/opacity only; with
 * reduced motion the shine is a still glint that fades.
 */
(function () {
  'use strict';

  const W = 380;
  const H = 570;
  const SHINE_MS = 1300;
  const BACK = () => window.KARASUKI_CARD_BACK || 'assets/img/cards/karasuki-card-back.webp';

  const KIND_LABEL = {
    friendly:    ['FRIENDLY', 'やさしい'],
    mischievous: ['MISCHIEVOUS', 'いたずら'],
    dangerous:   ['DANGEROUS', 'きけん'],
  };
  const ICON = {
    friendly: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
    mischievous: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 12c0-1.7 1.3-3 3-3s3 1.3 3 3-1.8 5-6 5-7-3-7-7 3.5-7.5 8-7.5"/><path d="M19 3.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>',
    dangerous: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function furi(text, map) {
    return window.UtsuFurigana && window.UtsuFurigana.sentence ? window.UtsuFurigana.sentence(text, map || {}) : esc(text);
  }
  function tokyoDate(ms) {
    if (!ms) return '';
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
        .format(new Date(ms)).replace(/-/g, '.');
    } catch (_) { return ''; }
  }
  function ordinal(n) { return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`; }
  function no(n) { return `No. ${String(n || 0).padStart(2, '0')}`; }

  const CSS = `
.kcf-fit{position:relative;flex:0 0 auto;display:inline-block;vertical-align:top}
.kcf,.kcb{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;overflow:hidden;box-sizing:border-box;font-family:'Nunito',system-ui,-apple-system,sans-serif;text-align:left;-webkit-font-smoothing:antialiased}
.kcf *,.kcb *{box-sizing:border-box}
.kcf,.kcb{line-height:1.35;letter-spacing:normal;font-weight:600;text-shadow:none}
.kcf p,.kcf span,.kcf b,.kcf small{margin:0;padding:0}
.kcf .kcf-art{position:absolute;left:12px;top:12px;right:12px;bottom:12px;overflow:hidden}
.kcf .kcf-art img{width:100%;height:100%;object-fit:cover;display:block}
.kcf .kcf-shade{position:absolute;left:12px;top:12px;right:12px;height:96px}
.kcf .kcf-lv{position:absolute;left:22px;top:22px;width:50px;height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;border:3px solid}
.kcf .kcf-lv small{font-size:10px;font-weight:800;letter-spacing:.04em}
.kcf .kcf-lv b{font-family:'Grenze',Georgia,serif;font-size:22px;font-weight:700}
.kcf .kcf-kind{position:absolute;left:82px;top:33px;display:flex;align-items:center;gap:6px;padding:5px 11px 5px 8px;font-size:11px;font-weight:800;letter-spacing:.1em;line-height:1.2}
.kcf .kcf-kind span:last-child{font-family:'Zen Maru Gothic','Hiragino Maru Gothic ProN',sans-serif;letter-spacing:0}
.kcf .kcf-no{position:absolute;right:24px;top:28px;font-family:'Grenze',Georgia,serif;font-size:22px;font-weight:700;line-height:1}
.kcf .kcf-fade{position:absolute;left:12px;right:12px;bottom:12px;height:150px;pointer-events:none}
.kcf .kcf-plate{position:absolute;z-index:1;left:12px;right:12px;bottom:12px;padding:12px 18px 14px;display:flex;flex-direction:column;gap:8px;transform:translateY(calc(100% - 78px));transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.kcf .kcf-plate::before{content:"";position:absolute;left:0;top:0;right:0;bottom:0;z-index:-1;opacity:0;transition:opacity .35s ease}
.kcf .kcf-detail{display:flex;flex-direction:column;gap:8px;opacity:0;transition:opacity .3s ease}
.kcf.is-info .kcf-plate{transform:none}
.kcf.is-info .kcf-plate::before,.kcf.is-info .kcf-detail{opacity:1}
.kcf .kcf-name,.kcf .kcf-namejp{text-shadow:0 2px 6px rgba(0,0,0,.75)}
@media (prefers-reduced-motion:reduce){.kcf .kcf-plate{transition:none}}
html[data-motion="reduced"] .kcf .kcf-plate,html[data-power]:not([data-power="full"]) .kcf .kcf-plate{transition:none}
.kcf .kcf-head{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}
.kcf .kcf-names{display:flex;flex-direction:column;gap:2px;min-width:0}
.kcf .kcf-name{margin:0;font-family:'Grenze',Georgia,serif;font-size:30px;font-weight:700;line-height:1}
.kcf .kcf-name.is-long{font-size:26px}
.kcf .kcf-namejp,.kcf .kcf-quotejp{margin:0;font-family:'Zen Maru Gothic','Hiragino Maru Gothic ProN',sans-serif;font-weight:500}
.kcf .kcf-namejp{font-size:14px;line-height:1.4}
.kcf .kcf-quote{margin:0;font-size:15px;font-style:italic;font-weight:600;line-height:1.35}
.kcf .kcf-quotejp{font-size:14px;line-height:1.55}
.kcf ruby rt{font-size:8px !important;opacity:.9}
.kcf .kcf-rarity{display:flex;gap:4px;padding-bottom:7px;flex:0 0 auto}
.kcf .kcf-rarity i{display:block;width:9px;height:9px;transform:rotate(45deg);border:1.5px solid}
.kcf .kcf-rule{height:1px}
.kcf .kcf-result{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:600}
.kcf .kcf-result b{font-size:16px;font-weight:800}
.kcf .kcf-result span{line-height:1.3}
.kcf .kcf-result .kcf-try{display:inline-block;padding:3px 9px;border:1.5px solid;font-weight:800;line-height:1.2}

.kcf--friendly{border-radius:20px;background:#D9A441;box-shadow:inset 0 0 0 2px #F6D27A,inset 0 0 0 9px #B9822A;color:#FFF8EC}
.kcf--friendly .kcf-art{border-radius:12px;background:#2A1A0E}
.kcf--friendly .kcf-shade{border-radius:12px 12px 0 0;background:linear-gradient(rgba(20,12,4,.78),rgba(20,12,4,0))}
.kcf--friendly .kcf-lv{border-radius:50%;background:#2A1A0E;border-color:#F2C14E}
.kcf--friendly .kcf-lv small{color:#F2C14E}
.kcf--friendly .kcf-kind{border-radius:999px;background:#F2C14E;color:#2A1A0E}
.kcf--friendly .kcf-fade{border-radius:0 0 12px 12px;background:linear-gradient(rgba(20,12,4,0),rgba(20,12,4,.88))}
.kcf--friendly .kcf-plate,.kcf--friendly .kcf-plate::before{border-radius:0 0 12px 12px}
.kcf--friendly .kcf-plate::before{background:rgba(42,26,14,.95);border-top:2px solid #F2C14E}
.kcf--friendly .kcf-name{color:#FFE6A8}
.kcf--friendly .kcf-namejp,.kcf--friendly .kcf-quotejp,.kcf--friendly .kcf-result{color:#F6E3BC}
.kcf--friendly .kcf-rule{background:rgba(242,193,78,.4)}
.kcf--friendly .kcf-try{border-radius:999px;border-color:#F2C14E;color:#FFE6A8}
.kcf--friendly .kcf-rarity i{border-color:#8C6A3A}.kcf--friendly .kcf-rarity i.on{background:#F2C14E;border-color:#F2C14E}

.kcf--mischievous{background:repeating-linear-gradient(135deg,#A64BD6 0 14px,#FF7AC6 14px 28px);-webkit-clip-path:polygon(22px 0,calc(100% - 22px) 0,100% 22px,100% calc(100% - 22px),calc(100% - 22px) 100%,22px 100%,0 calc(100% - 22px),0 22px);clip-path:polygon(22px 0,calc(100% - 22px) 0,100% 22px,100% calc(100% - 22px),calc(100% - 22px) 100%,22px 100%,0 calc(100% - 22px),0 22px);color:#FFF5FB}
.kcf--mischievous .kcf-art{background:#24102E;box-shadow:inset 0 0 0 2px #FFD1EC;-webkit-clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px);clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px)}
.kcf--mischievous .kcf-shade{background:linear-gradient(rgba(36,16,46,.8),rgba(36,16,46,0))}
.kcf--mischievous .kcf-lv{border-radius:14px;transform:rotate(-9deg);background:#24102E;border-color:#FF8AD0}
.kcf--mischievous .kcf-lv small{color:#FF8AD0}
.kcf--mischievous .kcf-kind{border-radius:6px;transform:rotate(-2deg);background:#FF8AD0;color:#24102E}
.kcf--mischievous .kcf-fade{background:linear-gradient(rgba(36,16,46,0),rgba(36,16,46,.88))}
.kcf--mischievous .kcf-plate::before{background:rgba(36,16,46,.95);border-top:2px dashed #FF8AD0}
.kcf--mischievous .kcf-plate{-webkit-clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px));clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px));padding-bottom:16px}
.kcf--mischievous .kcf-name{color:#FFB8E3}
.kcf--mischievous .kcf-namejp,.kcf--mischievous .kcf-quotejp,.kcf--mischievous .kcf-result{color:#FFD1EC}
.kcf--mischievous .kcf-rule{background:rgba(255,138,208,.4)}
.kcf--mischievous .kcf-try{border-radius:6px;border-color:#FF8AD0;color:#FFB8E3}
.kcf--mischievous .kcf-rarity i{border-color:#7E4B8F}.kcf--mischievous .kcf-rarity i.on{background:#FF8AD0;border-color:#FF8AD0}

.kcf--dangerous{background:#1B1D23;-webkit-clip-path:polygon(0 10px,10px 0,46% 0,49% 6px,53% 0,calc(100% - 4px) 0,100% 14px,100% 61%,calc(100% - 5px) 64%,100% 67%,100% calc(100% - 10px),calc(100% - 10px) 100%,28% 100%,25% calc(100% - 6px),22% 100%,6px 100%,0 calc(100% - 4px),0 34%,5px 37%,0 40%);clip-path:polygon(0 10px,10px 0,46% 0,49% 6px,53% 0,calc(100% - 4px) 0,100% 14px,100% 61%,calc(100% - 5px) 64%,100% 67%,100% calc(100% - 10px),calc(100% - 10px) 100%,28% 100%,25% calc(100% - 6px),22% 100%,6px 100%,0 calc(100% - 4px),0 34%,5px 37%,0 40%);color:#F3ECEC}
.kcf--dangerous .kcf-line{position:absolute;left:9px;top:9px;right:9px;bottom:9px;border:2px solid #8E1F28}
.kcf--dangerous .kcf-art{left:14px;top:14px;right:14px;bottom:14px;background:#0C0B10}
.kcf--dangerous .kcf-art::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 70px 18px rgba(0,0,0,.85)}
.kcf--dangerous .kcf-shade{left:14px;top:14px;right:14px;background:linear-gradient(rgba(8,7,10,.85),rgba(8,7,10,0))}
.kcf--dangerous .kcf-lv{border:0;left:22px;top:22px}
.kcf--dangerous .kcf-lv::before{content:"";position:absolute;left:4px;top:4px;width:42px;height:42px;transform:rotate(45deg);background:#0C0B10;border:3px solid #C3303B;box-sizing:border-box}
.kcf--dangerous .kcf-lv small,.kcf--dangerous .kcf-lv b{position:relative}
.kcf--dangerous .kcf-lv small{color:#FF6B74;font-size:9px}
.kcf--dangerous .kcf-lv b{font-size:20px}
.kcf--dangerous .kcf-kind{left:84px;background:#C3303B;color:#fff}
.kcf--dangerous .kcf-no{right:26px}
.kcf--dangerous .kcf-fade{left:14px;right:14px;bottom:14px;background:linear-gradient(rgba(8,7,10,0),rgba(8,7,10,.9))}
.kcf--dangerous .kcf-plate{left:14px;right:14px;bottom:14px}
.kcf--dangerous .kcf-plate::before{background:rgba(12,11,16,.96);border-top:2px solid #C3303B}
.kcf--dangerous .kcf-name{color:#F3D6D8;font-size:28px}
.kcf--dangerous .kcf-name.is-long{font-size:26px}
.kcf--dangerous .kcf-namejp,.kcf--dangerous .kcf-quotejp,.kcf--dangerous .kcf-result{color:#C9B8BA}
.kcf--dangerous .kcf-rule{background:rgba(195,48,59,.5)}
.kcf--dangerous .kcf-try{border-color:#C3303B;color:#F3D6D8}
.kcf--dangerous .kcf-rarity i{border-color:#6B4A4E}.kcf--dangerous .kcf-rarity i.on{background:#FF6B74;border-color:#FF6B74}

.kcf .kcf-foil{position:absolute;left:0;top:0;right:0;bottom:0;z-index:2;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .35s ease}
.kcf .kcf-foil i{position:absolute;top:-20%;bottom:-20%;left:0;width:45%;transform:translateX(-130%) skewX(-18deg)}
.kcf.is-shine .kcf-foil,.kcf.is-foil .kcf-foil{opacity:1;transition:opacity .15s ease}
.kcf.is-shine .kcf-foil i{animation:kcf-sweep 1.1s ease-in-out 1 both}
@keyframes kcf-sweep{from{transform:translateX(-130%) skewX(-18deg)}to{transform:translateX(260%) skewX(-18deg)}}
.kcf--friendly .kcf-foil i{background:linear-gradient(90deg,rgba(255,226,150,0),rgba(255,226,150,.45) 35%,rgba(255,252,235,.7) 50%,rgba(255,226,150,.45) 65%,rgba(255,226,150,0))}
.kcf--mischievous .kcf-foil i{width:70%;background:linear-gradient(90deg,rgba(255,138,208,0),rgba(255,138,208,.38) 20%,rgba(255,232,120,.38) 40%,rgba(130,236,255,.38) 60%,rgba(190,130,255,.38) 80%,rgba(190,130,255,0))}
.kcf--dangerous .kcf-foil i{top:0;bottom:0;left:0;right:0;width:auto;transform:none;box-shadow:inset 0 0 44px 10px rgba(255,40,60,.6),inset 0 0 0 2px rgba(255,90,100,.5);opacity:0}
.kcf--dangerous.is-shine .kcf-foil i{animation:kcf-flicker 1.2s linear 1 both}
@keyframes kcf-flicker{0%{opacity:0}12%{opacity:.85}22%{opacity:.25}34%{opacity:.9}48%{opacity:.4}62%{opacity:.75}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.kcf.is-shine .kcf-foil i{animation:none;transform:translateX(80%) skewX(-18deg)}.kcf--dangerous.is-shine .kcf-foil i{animation:none;transform:none;opacity:.6}}
html[data-motion="reduced"] .kcf.is-shine .kcf-foil i,html[data-power]:not([data-power="full"]) .kcf.is-shine .kcf-foil i{animation:none;transform:translateX(80%) skewX(-18deg)}
html[data-motion="reduced"] .kcf--dangerous.is-shine .kcf-foil i,html[data-power]:not([data-power="full"]) .kcf--dangerous.is-shine .kcf-foil i{animation:none;transform:none;opacity:.6}

.kcb{border-radius:18px;background:#1A0F24;box-shadow:inset 0 0 0 2px rgba(242,193,78,.55)}
.kcb img{display:block;width:100%;height:100%;object-fit:cover}

#kcf-preview{position:fixed;inset:0;z-index:10000;display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;justify-content:center;align-content:flex-start;padding:16px;overflow:auto;-webkit-overflow-scrolling:touch;background:rgba(0,0,0,.94)}`;

  function ensureStyles() {
    if (document.getElementById('kcf-style')) return;
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Grenze:wght@600;700&family=Nunito:ital,wght@0,600;0,800;1,600&family=Zen+Maru+Gothic:wght@500;700&display=swap';
    document.head.appendChild(fonts);
    const style = document.createElement('style');
    style.id = 'kcf-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function fit(width, inner, label) {
    const w = Math.max(60, Math.round(Number(width) || W));
    const s = (w / W).toFixed(4);
    return `<div class="kcf-fit" role="img" aria-label="${esc(label)}" style="width:${w}px;height:${Math.round(w * H / W)}px">`
      + inner.replace('class="kc', `style="transform:scale(${s})" class="kc`) + '</div>';
  }

  /**
   * result: { score, wonAt, try } for a won card; omit for a face with no
   * personal strip (reserved for previews).
   */
  function face(o) {
    ensureStyles();
    const kind = KIND_LABEL[o.kind] ? o.kind : 'friendly';
    const card = o.card || {};
    const comment = o.comment || {};
    const r = o.result;
    const rarity = Math.max(1, Math.min(3, Number(o.rarity) || 1));
    const pips = [1, 2, 3].map(i => `<i class="${i <= rarity ? 'on' : ''}"></i>`).join('');
    const result = r ? `
        <div class="kcf-rule"></div>
        <div class="kcf-result">
          <span>Words recalled <b>${esc(r.score)} / 10</b></span>
          <span>${esc(tokyoDate(r.wonAt))}</span>
          <span class="kcf-try">${esc(ordinal(Number(r.try) || 1))} try</span>
        </div>` : '';
    const inner = `<div class="kcf kcf--${kind}${o.info ? ' is-info' : ''}">
      ${kind === 'dangerous' ? '<div class="kcf-line"></div>' : ''}
      <div class="kcf-art">${card.art ? `<img src="${esc(card.art)}" alt="" decoding="async" loading="lazy">` : ''}</div>
      <div class="kcf-fade"></div>
      <div class="kcf-shade"></div>
      <div class="kcf-lv"><small>Lv.</small><b>1</b></div>
      <div class="kcf-kind">${ICON[kind]}<span>${KIND_LABEL[kind][0]}</span><span lang="ja">${KIND_LABEL[kind][1]}</span></div>
      <div class="kcf-no">${esc(no(card.no))}</div>
      <div class="kcf-plate">
        <div class="kcf-head">
          <div class="kcf-names">
            <p class="kcf-name${String(o.name || '').length > 14 ? ' is-long' : ''}">${esc(o.name)}</p>
            <p class="kcf-namejp" lang="ja">${furi(o.nameJP || '', o.furigana)}</p>
          </div>
          <div class="kcf-rarity" aria-hidden="true">${pips}</div>
        </div>
        <div class="kcf-detail">
          ${comment.en ? `<p class="kcf-quote">“${esc(comment.en)}”</p>` : ''}
          ${comment.jp ? `<p class="kcf-quotejp" lang="ja">${furi(comment.jp, comment.furigana)}</p>` : ''}
          ${result}
        </div>
      </div>
      <div class="kcf-foil" aria-hidden="true"><i></i></div>
    </div>`;
    const label = `${o.name} — ${no(card.no)}, Lv.1, ${KIND_LABEL[kind][0].toLowerCase()} card` + (r ? `, ${r.score} of 10 words` : '');
    return fit(o.width, inner, label);
  }

  function back(o) {
    ensureStyles();
    const inner = `<div class="kcb"><img src="${esc(BACK())}" alt="" decoding="async"></div>`;
    return fit((o || {}).width, inner, 'A Karasuki card, face down');
  }

  /** Face options for a registry card: name, Japanese name, kind, flavour line. */
  function optionsFor(cardId, opts) {
    const o = opts || {};
    const card = window.KarasukiCards ? window.KarasukiCards.getCard(cardId) : null;
    if (!card) return null;
    const comment = (window.KARASUKI_WANDERER_DATA || {})[card.name] || {};
    return {
      card, name: card.name, nameJP: card.nameJP || '', furigana: Object.assign({}, card.nameFurigana),
      kind: comment.kind, comment, result: o.result, width: o.width, info: !!o.info,
    };
  }
  function fromRegistry(cardId, opts) {
    const o = optionsFor(cardId, opts);
    return o ? face(o) : '';
  }

  /** Show (on: true) or hide the info panel of the face inside element.
   *  Returns the new state; on omitted toggles. */
  function setInfo(element, on) {
    const f = element && (element.classList && element.classList.contains('kcf') ? element : element.querySelector && element.querySelector('.kcf'));
    if (!f) return false;
    const next = on === undefined ? !f.classList.contains('is-info') : !!on;
    f.classList.toggle('is-info', next);
    return next;
  }

  function faceIn(element) {
    return element && (element.classList && element.classList.contains('kcf') ? element : element.querySelector && element.querySelector('.kcf'));
  }

  /** Play the kind foil across the face inside element, once. */
  function shine(element) {
    const f = faceIn(element);
    if (!f) return false;
    f.classList.remove('is-shine');
    void f.offsetWidth;                      // restart the sweep
    f.classList.add('is-shine');
    clearTimeout(f.shineTimer);
    f.shineTimer = setTimeout(() => f.classList.remove('is-shine'), SHINE_MS);
    return true;
  }

  /** Hold the foil at x (0 = left edge, 1 = right) while a card is dragged;
   *  null lets it fade away. Dangerous cards glow stronger toward the edges. */
  function foil(element, x) {
    const f = faceIn(element);
    const band = f && f.querySelector('.kcf-foil i');
    if (!band) return false;
    if (x == null) {
      f.classList.remove('is-foil');
      band.style.transform = '';
      band.style.opacity = '';
      return true;
    }
    const t = Math.max(0, Math.min(1, Number(x) || 0));
    f.classList.add('is-foil');
    if (f.classList.contains('kcf--dangerous')) band.style.opacity = (0.2 + 0.7 * Math.abs(t - 0.5) * 2).toFixed(2);
    else band.style.transform = `translateX(${(-130 + 390 * t).toFixed(1)}%) skewX(-18deg)`;
    return true;
  }

  /** Teacher preview: every shipped face (sample results) plus the back. */
  function preview(entries) {
    ensureStyles();
    if (!entries && window.KarasukiCards) {
      const K = window.KarasukiCards;
      entries = K.registry().filter(K.isShipped).map((c, i) =>
        optionsFor(c.id, { result: { score: 8 + (i % 3), wonAt: Date.now(), try: 1 + (i % 2) } }));
      // Every face twice: full art, then with its info panel up.
      entries = entries.reduce((all, e) => all.concat([e, Object.assign({}, e, { info: true })]), []);
    }
    const old = document.getElementById('kcf-preview');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'kcf-preview';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Card face preview (tap to close)');
    box.innerHTML = back({ width: 220 }) + (entries || []).map(e => face(Object.assign({}, e, { width: e.width || 220 }))).join('');
    box.addEventListener('click', () => box.remove());
    document.body.appendChild(box);
    return box;
  }

  window.KarasukiCardFace = Object.freeze({ W, H, SHINE_MS, face, back, fromRegistry, setInfo, shine, foil, preview, tokyoDate });
})();
