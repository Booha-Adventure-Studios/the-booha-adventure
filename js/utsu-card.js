/* ═══════════════════════════════════════════
   UTSU CARD — shared "parchment card" popup component
   Round 2, Pass 1 (see claude/utsuroba-audit-and-pass-plan.md)

   Before this pass, four separate popups each hand-copied the same
   cream/tan parchment recipe via inline style.cssText: the drifter
   drawer panel (#utsuroba-drifter-panel in utsuroba.js), the memory-box
   pickup panel (#orb-panel in karasuki.js), the post-celebration
   thank-you panel (utsuroba.js), and the wrong-memory toast (utsuroba.js).
   That's why "improve the look" meant editing four places, and why every
   drifter's card looked identical regardless of voice.

   This file is the one shared definition. It's loaded by BOTH
   utsuroba.html and karasuki.html (alongside utsuroba-episodes.js, which
   both pages already share), and injects its styles immediately on load
   — callers don't need to remember to call anything.

   Usage:
     - Give a popup element `class="utsu-card"` for a full-width bottom
       sheet (orb panel, thank-you panel), or `class="utsu-card is-floating"`
       for a centered, capped-height drawer (the drifter panel).
     - Toggle `.open` to slide it in/out — same convention every surface
       already used.
     - Content inside uses the shared `.dp-*` classes (handle, inner,
       portrait, body, close-x, name-en, name-kanji, divider, line-en,
       line-jp, status, btns, btn.yes/.no) — one definition, reused by
       all four surfaces instead of four copies.
     - Call `UtsuCard.motifForDrifter(drifter)` to get a drifter's motif
       key, then `UtsuCard.ringFor(motif)` / `UtsuCard.glowFor(motif)` and
       set them as the `--card-ring` / `--card-glow` custom properties on
       the popup element for a per-drifter accent color (portrait border,
       card border/glow) — the same lantern/candy/reflection/thorn/ribbon
       language already used by orbs (karasuki.js ORB_MOTIF_COLORS) and
       the reading-modal portrait ring (utsuroba-reading.js MOTIF_COLORS).
*/
(function () {
  'use strict';

  var MOTIF_RING = {
    lantern:    '#ffd966',
    candy:      '#ff85a1',
    reflection: '#a8edff',
    thorn:      '#d9503a',
    ribbon:     '#d9a8ff',
  };
  var MOTIF_GLOW = {
    lantern:    'rgba(255,217,102,.45)',
    candy:      'rgba(255,133,161,.45)',
    reflection: 'rgba(168,237,255,.45)',
    thorn:      'rgba(217,80,58,.45)',
    ribbon:     'rgba(217,168,255,.45)',
  };

  /* Static fallback for the moment a popup opens before
     UTSUROBA_EPISODES has resolved (or for a drifter with no episode
     yet). Matches each drifter's live worldEcho.motif exactly — checked
     against content/utsuroba/episodes/*.json at the time this was
     written: ks→lantern, nto→candy, cg→reflection, bh→reflection,
     bk→thorn, ph→ribbon. If a drifter's motif ever changes in the
     episode JSON, the live lookup below picks it up automatically —
     this table only matters for that first-paint race. */
  var DRIFTER_MOTIF_FALLBACK = { ks: 'lantern', nto: 'candy', cg: 'reflection', bh: 'reflection', bk: 'thorn', ph: 'ribbon' };

  function motifForDrifter(drifter) {
    if (!drifter) return null;
    try {
      var episode = window.UTSUROBA_EPISODES && drifter.episodeId ? window.UTSUROBA_EPISODES[drifter.episodeId] : null;
      var motif = episode && episode.worldEcho && episode.worldEcho.motif;
      if (motif && MOTIF_RING[motif]) return motif;
    } catch (_) {}
    return DRIFTER_MOTIF_FALLBACK[drifter.id] || null;
  }

  function ringFor(motif) { return MOTIF_RING[motif] || '#c8b48a'; }
  function glowFor(motif) { return MOTIF_GLOW[motif] || 'transparent'; }

  function injectStyles() {
    if (document.getElementById('utsu-card-styles')) return;
    var s = document.createElement('style');
    s.id = 'utsu-card-styles';
    s.textContent = `
      /* ── card shell ── */
      .utsu-card{position:fixed;left:0;right:0;bottom:0;z-index:9200;pointer-events:none;
        background:linear-gradient(180deg,#f7f2e8 0%,#ede5d0 100%);
        border-top:2px solid var(--card-ring,#c8b48a);border-radius:18px 18px 0 0;
        box-shadow:0 -6px 32px rgba(0,0,0,.48),0 0 22px var(--card-glow,transparent);
        font-family:'Georgia',serif;transform:translateY(100%);
        transition:transform .34s cubic-bezier(.22,1,.36,1);}
      .utsu-card.open{transform:translateY(0);pointer-events:auto;}
      /* Pass 1 fix: the old drifter-panel-only sizing had mobile
         (52vh) BIGGER relative to viewport than desktop (42vh) —
         backwards for a screen with less room to spare. Both
         breakpoints now share the same vh fraction, with a lower
         absolute px cap on mobile so it's never proportionally larger. */
      /* Round 2 Pass 16 ("razzle-dazzle"): a distinct, bouncier entrance
         just for the drifter drawer — the bottom-sheet variant (orb
         panel, thank-you panel) keeps its original ease-out since it
         wasn't part of this ask. */
      .utsu-card.is-floating{left:50%;right:auto;bottom:clamp(10px,2.5vh,22px);
        width:min(560px,calc(100vw - 24px));max-height:min(38vh,300px);overflow:auto;
        border-radius:16px;border:1.5px solid var(--card-ring,#c8b48a);
        border-top:1.5px solid var(--card-ring,#c8b48a);
        box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 20px var(--card-glow,transparent);
        transform:translate(-50%,calc(100% + 20px));z-index:9100;
        transition:transform .5s cubic-bezier(.34,1.56,.64,1);}
      .utsu-card.is-floating.open{transform:translate(-50%,0);}
      @media(max-width:700px){.utsu-card.is-floating{width:calc(100vw - 16px);max-height:min(38vh,260px);bottom:8px;}}

      /* ── shared content classes (dp-* — same names every surface uses) ── */
      .dp-handle{width:36px;height:4px;border-radius:2px;background:var(--card-ring,#c0aa80);opacity:.7;margin:9px auto 0;}
      .dp-inner{display:flex;align-items:flex-start;gap:clamp(10px,2.5vw,16px);padding:10px clamp(13px,3vw,20px) 13px;}
      /* Optional wrapper + halo (opt-in via markup — only the drifter
         panel template uses these two classes today) that flashes a
         motif-colored glow behind the portrait once, right as the panel
         settles open. */
      .dp-portrait-wrap{position:relative;flex-shrink:0;}
      .dp-portrait-halo{position:absolute;inset:-11px;border-radius:50%;pointer-events:none;
        background:radial-gradient(circle,var(--card-glow,rgba(200,180,138,.5)) 0%,transparent 72%);opacity:0;}
      .utsu-card.is-floating.open .dp-portrait-halo{animation:dpPortraitHalo .9s ease-out .12s 1;}
      @keyframes dpPortraitHalo{0%{opacity:0;transform:scale(.4);}32%{opacity:1;}100%{opacity:0;transform:scale(1.7);}}
      .dp-portrait{flex-shrink:0;width:clamp(54px,9vw,76px);height:clamp(54px,9vw,76px);border-radius:9px;
        border:1.5px solid var(--card-ring,#c8b48a);background:#e8dfc8;display:flex;align-items:center;
        justify-content:center;overflow:hidden;box-shadow:0 0 10px var(--card-glow,transparent);}
      .dp-portrait img{width:100%;height:100%;object-fit:contain;display:block;transition:opacity .16s ease;}
      .dp-body{flex:1;min-width:0;position:relative;}
      .dp-close-x{position:absolute;top:0;right:0;background:transparent;border:none;cursor:pointer;font-size:.92rem;color:#b8a070;padding:2px 5px;line-height:1;}
      .dp-close-x:hover{color:#5a3010;}
      .dp-name-en{font-size:clamp(.6rem,1.6vw,.72rem);color:#9a7850;letter-spacing:.13em;text-transform:uppercase;margin:0 0 2px;}
      .dp-name-kanji{font-size:clamp(.9rem,2.4vw,1.06rem);color:#1e140a;font-weight:700;margin:0 0 1px;}
      .dp-divider{width:40px;height:1px;background:var(--card-ring,#c8b48a);opacity:.8;margin:0 0 8px;}
      .dp-line-en{font-size:clamp(.76rem,1.9vw,.86rem);color:#181004;line-height:1.45;margin:0 0 2px;}
      .dp-line-jp{font-size:clamp(.68rem,1.7vw,.78rem);color:#6a5030;line-height:1.5;margin:0 0 4px;}
      .dp-status{font-size:clamp(.66rem,1.6vw,.76rem);color:#806040;line-height:1.4;margin:0 0 7px;font-style:italic;}
      .dp-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:7px;}
      .dp-btn{font-family:'Georgia',serif;font-size:clamp(.7rem,1.7vw,.8rem);letter-spacing:.05em;cursor:pointer;padding:7px 14px;border-radius:6px;transition:all .16s;}
      .dp-btn.yes{background:linear-gradient(135deg,#2e1c08,#1c1004);border:1px solid #4a3010;color:#fbe9c4;box-shadow:0 0 10px var(--card-glow,transparent);}
      .dp-btn.yes:hover{filter:brightness(1.15);}
      .dp-btn.no{background:transparent;border:1px solid #b8a478;color:#8a6c44;}
      .dp-btn.no:hover{border-color:#806030;color:#4a2c08;}
      @media(max-width:700px){.dp-inner{padding:9px 12px 12px}.dp-portrait{width:52px;height:52px}.dp-btn{padding:6px 12px}}

      /* ── small centered toast card (wrong-memory message) ── */
      .utsu-toast-card{background:linear-gradient(180deg,#f7f2e8 0%,#ede5d0 100%);
        border:1.5px solid #c8b48a;border-radius:12px;padding:20px 32px;
        box-shadow:0 8px 30px rgba(0,0,0,.4);font-family:'Georgia',serif;max-width:min(360px,86vw);}
      /* Round 2 Pass 16: a small "no" shake, chained after the card's own
         pop-in (utsuPopIn, defined in utsuroba.js) via the caller's
         animation list — reads instantly as "wrong" before a kid even
         gets to the text. */
      @keyframes utsuToastShake{0%,100%{transform:translateX(0);}20%{transform:translateX(-7px);}
        40%{transform:translateX(6px);}60%{transform:translateX(-4px);}80%{transform:translateX(2px);}}

      /* ── HUD chip: corner status widgets (Round 2 Pass 2) ──
         Replaces three near-identical bordered-rectangle "food label"
         boxes (Utsuroba's Three Echoes tracker, Karasuki's mirror of it,
         and Karasuki's Memory Trail hint) with one shared shape — a
         parchment-tag notch instead of a plain rectangle — and an
         icon-first layout instead of stacked label rows. Two color
         variants match each widget's existing identity: default purple
         ("memory"), .is-trail gold/brown ("treasure map"). */
      .utsu-hud-chip{position:fixed;top:14px;z-index:7000;display:flex;align-items:center;gap:9px;
        padding:8px 15px 8px 15px;max-width:min(340px,calc(100vw - 28px));
        background:rgba(9,0,18,.86);border:1px solid rgba(216,168,255,.42);
        box-shadow:0 0 16px rgba(100,30,160,.2);color:#f1d9ff;font-family:'Georgia',serif;
        clip-path:polygon(16px 0,100% 0,100% 100%,0 100%,0 16px);}
      .utsu-hud-chip.is-left{left:14px;}
      .utsu-hud-chip.is-right{right:14px;}
      .utsu-hud-chip.is-passive{pointer-events:none;}
      .utsu-hud-chip.is-trail{background:rgba(29,19,6,.9);border-color:rgba(255,217,102,.55);
        box-shadow:0 0 14px rgba(180,130,10,.22);color:#fff4cf;}

      .utsu-hud-chip-icon{flex-shrink:0;width:32px;height:32px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;font-size:16px;
        background:rgba(255,255,255,.08);}
      .utsu-hud-chip.is-trail .utsu-hud-chip-icon{background:rgba(255,217,102,.14);}
      /* Round 2 Pass 14 fix: was a 9px badge tucked in the icon's corner —
         too small to actually read as "a counter" (user feedback: "should
         be bigger... something that looks like a counter"). Now a proper
         standalone pill between the icon and the hint text, sized to be
         legible at a glance. */
      .utsu-hud-chip-count{flex-shrink:0;background:#2a1a06;
        border:1.5px solid rgba(255,217,102,.65);color:#fff4cf;font:800 .82rem/1 'Georgia',serif;
        padding:4px 9px;border-radius:11px;white-space:nowrap;letter-spacing:.02em;}
      .utsu-hud-chip:not(.is-trail) .utsu-hud-chip-count{background:#1f0f33;border-color:rgba(216,168,255,.6);color:#f1d9ff;}
      /* Round 2 Pass 16: caller adds .is-bump for one animation cycle
         whenever the number it just wrote is actually higher than the
         last one (see updateTrailHud() in karasuki.js) — a silent
         textContent swap otherwise gives progress no weight at all. */
      .utsu-hud-chip-count.is-bump{animation:hudCountBump .5s cubic-bezier(.34,1.56,.64,1) 1;}
      @keyframes hudCountBump{0%{transform:scale(1);box-shadow:none;}40%{transform:scale(1.32);box-shadow:0 0 14px 2px currentColor;}100%{transform:scale(1);box-shadow:none;}}

      .utsu-hud-chip-text{display:flex;flex-direction:column;gap:1px;min-width:0;}
      /* Round 2 Pass 14 fix: was single-line nowrap+ellipsis, so any hint
         longer than the chip's width just got cut off mid-sentence
         ("...") — flagged directly as unreadable. Now wraps up to two
         lines before clamping, so the actual hint text is readable
         instead of trailing into an ellipsis almost every time. */
      .utsu-hud-chip-primary{font-size:.76rem;font-weight:700;line-height:1.32;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
      .utsu-hud-chip-secondary{font-size:.65rem;line-height:1.3;color:rgba(241,217,255,.55);
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
      .utsu-hud-chip.is-trail .utsu-hud-chip-secondary{color:rgba(255,244,207,.6);}
      /* Round 2 Pass 14: a short, concrete line under the poetic authored
         hint, shown only when Karasuki has actually worked out which exit
         leads toward the target room — it points at the matching exit
         arrow (drawExitArrows(), highlighted gold) rather than repeating
         vague room-lore text. */
      .utsu-hud-chip-nav{display:none;align-items:center;gap:4px;margin-top:2px;
        font-size:.68rem;font-weight:700;color:#ffe9a8;}
      .utsu-hud-chip-nav.is-shown{display:flex;}
      .utsu-hud-chip-nav-arrow{display:inline-block;animation:utsu-nav-bounce 1.1s ease-in-out infinite;}
      @keyframes utsu-nav-bounce{0%,100%{transform:translateX(0);}50%{transform:translateX(3px);}}

      .utsu-hud-chip-dots{display:flex;gap:6px;}
      .utsu-hud-chip-dot{width:26px;height:26px;border-radius:50%;padding:0;display:flex;
        align-items:center;justify-content:center;font-size:12px;background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.28);cursor:default;
        transition:transform .15s,background .15s,border-color .15s;}
      .utsu-hud-chip-dot.is-lit{cursor:pointer;border-color:transparent;}
      .utsu-hud-chip-dot.is-lit:hover,.utsu-hud-chip-dot.is-lit:focus-visible{transform:translateY(-2px);outline:none;}
      .utsu-hud-chip-dot.motif-lantern.is-lit{background:radial-gradient(circle at 35% 30%,#fffde0,#ffd966 55%,#c8860a);box-shadow:0 0 10px rgba(255,217,102,.55);}
      .utsu-hud-chip-dot.motif-candy.is-lit{background:radial-gradient(circle at 35% 30%,#fff0f4,#ff85a1 55%,#c23a5e);box-shadow:0 0 10px rgba(255,133,161,.55);}
      .utsu-hud-chip-dot.motif-reflection.is-lit{background:radial-gradient(circle at 35% 30%,#eafcff,#a8edff 55%,#3b8fbf);box-shadow:0 0 10px rgba(168,237,255,.55);}
      /* Round 2 Pass 16: caller adds .is-just-lit for one render only —
         the render that actually transitions a dot from unlit to lit
         (see renderEchoesTracker() in karasuki.js/utsuroba.js, which
         diffs against the previous render to know which dot is new).
         Without that diff every re-render would replay this, which is
         wrong — it should read as "you just found this," not repeat on
         every room change. */
      .utsu-hud-chip-dot.is-just-lit{animation:hudDotIgnite .6s cubic-bezier(.34,1.56,.64,1) 1;}
      @keyframes hudDotIgnite{0%{transform:scale(.3);filter:brightness(2.2);}55%{transform:scale(1.4);filter:brightness(1.6);}100%{transform:scale(1);filter:brightness(1);}}

      /* ── reward pop: a brief, bigger "you got it" card that appears
         when an orb/memory piece is actually collected (Round 2 Pass 14
         — was previously just a sound + the orb quietly vanishing, easy
         to miss). Motif-themed via --card-ring/--card-glow like the
         parchment cards above. Auto-removed by its caller after a few
         seconds; purely decorative, never blocks input.
         Round 2 Pass 15 ("razzle-dazzle" — the flat fade+slide read as
         "a simple pill"): added a spark burst, an expanding shockwave
         ring around the icon, a one-shot light-sweep across the card,
         and a spring-bounce entrance instead of a linear one. Every
         piece is plain CSS transforms/opacity plus ~10 small DOM nodes
         — no images, no canvas, no new assets. ── */
      .utsu-reward-pop{position:fixed;top:18%;left:50%;transform:translate(-50%,-14px) scale(.72);z-index:7500;
        display:flex;align-items:center;gap:12px;padding:14px 22px;border-radius:16px;
        background:linear-gradient(180deg,#2a1642 0%,#150822 100%);
        border:2px solid var(--card-ring,#d8a8ff);
        box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 10px 34px rgba(0,0,0,.5),0 0 26px var(--card-glow,rgba(216,168,255,.5));
        color:#fbeeff;font-family:'Georgia',serif;pointer-events:none;
        opacity:0;transition:opacity .3s ease,transform .5s cubic-bezier(.34,1.56,.64,1);}
      .utsu-reward-pop.is-shown{opacity:1;transform:translate(-50%,0) scale(1);}
      /* One-shot diagonal light sweep, clipped to the card's own rounded
         corners via its own border-radius (no overflow:hidden needed on
         the card itself, which would otherwise clip the burst below). */
      .utsu-reward-pop::before{content:'';position:absolute;inset:0;border-radius:inherit;
        background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.4) 48%,rgba(255,255,255,.05) 58%,transparent 72%);
        background-size:240% 100%;background-position:160% 0;opacity:0;pointer-events:none;}
      .utsu-reward-pop.is-shown::before{animation:utsuRewardSweep 1.1s ease-out .16s 1;}
      @keyframes utsuRewardSweep{0%{background-position:160% 0;opacity:0;}18%{opacity:1;}100%{background-position:-60% 0;opacity:0;}}
      .utsu-reward-pop-icon-wrap{position:relative;flex-shrink:0;}
      .utsu-reward-pop-ring{position:absolute;inset:-8px;border-radius:50%;
        border:2px solid var(--card-ring,#d8a8ff);opacity:0;pointer-events:none;}
      .utsu-reward-pop.is-shown .utsu-reward-pop-ring{animation:utsuRewardRing .65s ease-out .05s 1;}
      @keyframes utsuRewardRing{0%{opacity:.85;transform:scale(.5);}100%{opacity:0;transform:scale(2.6);}}
      .utsu-reward-pop-icon{flex-shrink:0;width:40px;height:40px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;font-size:20px;
        background:radial-gradient(circle at 35% 30%,#fff7dd,var(--card-ring,#d8a8ff) 65%,#000 130%);
        box-shadow:0 0 14px var(--card-glow,rgba(216,168,255,.6));}
      .utsu-reward-pop-text{display:flex;flex-direction:column;gap:2px;}
      .utsu-reward-pop-title{font-size:.98rem;font-weight:700;}
      .utsu-reward-pop-sub{font-size:.76rem;color:rgba(251,238,255,.68);}
      /* Spark burst: a handful of dots/glyphs spawned fresh per pickup
         (see spawnBurst() below) that fly outward from the card center
         and fade — each carries its own --dx/--dy set inline in JS so
         every pickup's burst looks slightly different. */
      .utsu-reward-pop-burst{position:absolute;inset:0;pointer-events:none;}
      .utsu-reward-spark{position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:50%;
        background:var(--card-ring,#d8a8ff);box-shadow:0 0 6px 1px var(--card-glow,rgba(216,168,255,.7));
        opacity:0;transform:translate(-50%,-50%);
        animation:utsuRewardSpark .8s cubic-bezier(.18,.7,.32,1) forwards;}
      .utsu-reward-spark.is-star{width:auto;height:auto;background:none;box-shadow:none;
        color:var(--card-ring,#d8a8ff);font-size:11px;line-height:1;text-shadow:0 0 5px var(--card-glow,rgba(216,168,255,.7));}
      @keyframes utsuRewardSpark{
        0%{opacity:1;transform:translate(-50%,-50%) translate(0,0) scale(1);}
        100%{opacity:0;transform:translate(-50%,-50%) translate(var(--dx),var(--dy)) scale(.25);}
      }

      @media(max-width:700px){
        .utsu-hud-chip{top:9px;padding:7px 13px 7px 13px;max-width:calc(100vw - 20px);}
        .utsu-hud-chip.is-left{left:9px;}
        .utsu-hud-chip.is-right{right:9px;}
        .utsu-hud-chip-icon{width:28px;height:28px;font-size:14px;}
        .utsu-hud-chip-count{font-size:.72rem;padding:3px 7px;}
        .utsu-hud-chip-dot{width:24px;height:24px;font-size:11px;}
        .utsu-reward-pop{top:14%;padding:11px 16px;gap:9px;}
        .utsu-reward-pop-icon{width:32px;height:32px;font-size:16px;}
        .utsu-reward-pop-title{font-size:.86rem;}
        .utsu-reward-pop-sub{font-size:.68rem;}
      }
      @media (prefers-reduced-motion: reduce) {
        .utsu-reward-pop{transition:opacity .3s ease;}
        .utsu-reward-pop-ring,.utsu-reward-spark,.utsu-reward-pop::before{animation:none !important;opacity:0 !important;}
        .utsu-card.is-floating{transition:transform .34s ease-out;}
        .dp-portrait-halo{animation:none !important;opacity:0 !important;}
        .utsu-hud-chip-count.is-bump,.utsu-hud-chip-dot.is-just-lit{animation:none !important;}
      }
    `;
    document.head.appendChild(s);
  }

  /* Round 2 Pass 14: a brief, bigger "you got it" card for an actual
     pickup — see .utsu-reward-pop above. Before this, collecting a
     memory piece was just a sound plus the orb quietly vanishing off
     the map, easy to miss ("an actual collection should be a bigger
     reward card that pops for a few seconds so the player knows").
     opts: {icon, title, sub, motif, duration}. Reuses one element
     across calls rather than creating a new one per pickup; caller
     doesn't need to track a handle or clean anything up. */
  var rewardPopEl = null;
  var rewardPopHideTimer = null;
  var SPARK_GLYPHS = ['✦', '✧'];

  /* Fills the burst container with a fresh ring of sparks each call —
     angles spread evenly around the card with a little jitter so the
     burst reads as organic rather than a mechanical star pattern, and
     each spark's outward vector is set as an inline --dx/--dy custom
     property so one shared @keyframes rule can drive all of them. */
  function spawnBurst(container) {
    if (!container) return;
    container.innerHTML = '';
    var count = 10;
    for (var i = 0; i < count; i++) {
      var isStar = Math.random() < 0.4;
      var spark = document.createElement(isStar ? 'span' : 'i');
      spark.className = 'utsu-reward-spark' + (isStar ? ' is-star' : '');
      if (isStar) spark.textContent = SPARK_GLYPHS[Math.floor(Math.random() * SPARK_GLYPHS.length)];
      var angle = (Math.PI * 2 * i / count) + (Math.random() * 0.5 - 0.25);
      var dist = 40 + Math.random() * 34;
      spark.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      spark.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
      spark.style.animationDelay = Math.round(Math.random() * 90) + 'ms';
      container.appendChild(spark);
    }
  }

  function showRewardPop(opts) {
    opts = opts || {};
    if (!rewardPopEl) {
      rewardPopEl = document.createElement('div');
      rewardPopEl.className = 'utsu-reward-pop';
      rewardPopEl.innerHTML =
        '<div class="utsu-reward-pop-icon-wrap"><span class="utsu-reward-pop-ring"></span><div class="utsu-reward-pop-icon" aria-hidden="true"></div></div>' +
        '<div class="utsu-reward-pop-text"><span class="utsu-reward-pop-title"></span><span class="utsu-reward-pop-sub"></span></div>' +
        '<div class="utsu-reward-pop-burst" aria-hidden="true"></div>';
      document.body.appendChild(rewardPopEl);
    }
    rewardPopEl.style.setProperty('--card-ring', ringFor(opts.motif));
    rewardPopEl.style.setProperty('--card-glow', glowFor(opts.motif));
    rewardPopEl.querySelector('.utsu-reward-pop-icon').textContent = opts.icon || '✦';
    rewardPopEl.querySelector('.utsu-reward-pop-title').textContent = opts.title || '';
    rewardPopEl.querySelector('.utsu-reward-pop-sub').textContent = opts.sub || '';
    spawnBurst(rewardPopEl.querySelector('.utsu-reward-pop-burst'));
    clearTimeout(rewardPopHideTimer);
    rewardPopEl.classList.remove('is-shown');
    void rewardPopEl.offsetWidth; /* force reflow so re-triggering works on back-to-back pickups */
    requestAnimationFrame(() => rewardPopEl.classList.add('is-shown'));
    rewardPopHideTimer = setTimeout(() => { rewardPopEl.classList.remove('is-shown'); }, opts.duration || 1900);
  }

  injectStyles();

  window.UtsuCard = {
    injectStyles: injectStyles,
    motifForDrifter: motifForDrifter,
    ringFor: ringFor,
    glowFor: glowFor,
    showRewardPop: showRewardPop,
  };
})();
