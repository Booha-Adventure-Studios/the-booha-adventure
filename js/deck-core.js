
/* ═══════════════════════════════════════════════════════════════
   deck-core.js  —  Flashcard engine (vocab, sentences, questions)
   Reads window.DECK_CONFIG which study-deck.html sets from the
   URL params + CURRICULUM_REGISTRY lookup.

   FIXES applied:
   - fetch() now uses CFG.jsonUrl (built by bootstrap with correct month path)
     instead of a hardcoded path that duplicated/diverged from bootstrap
   - console.log shows the actual URL being fetched
   ═══════════════════════════════════════════════════════════════ */
(function () {

const CFG        = window.DECK_CONFIG;
const AUDIO_ROOT = 'https://pub-8d5941f302df44b899ce9d9a4606dcb7.r2.dev/audio-2027';

const searchParams = new URLSearchParams(window.location.search);
const weekParam    = searchParams.get('week') || '';

const monthMatch = weekParam.match(/_([a-z]{3})_w/i);

const MONTH_MAP = {
  jan:'january', feb:'february', mar:'march', apr:'april',
  may:'may', jun:'june', jul:'july', aug:'august',
  sep:'september', oct:'october', nov:'november', dec:'december'
};

const MONTH_CODE = monthMatch ? monthMatch[1].toLowerCase() : 'jan';
const MONTH      = MONTH_MAP[MONTH_CODE] || 'january';
const AUDIO_BASE = `${AUDIO_ROOT}/${MONTH_CODE}/${CFG.audioFolder}/${CFG.audioSub}/`;

/* FIX: log the actual URL that will be fetched (CFG.jsonUrl set by bootstrap) */
console.log('[deck-core] JSON URL:', CFG.jsonUrl);
console.log('[deck-core] Audio base:', AUDIO_BASE);

const WEEK_RANGES = { w1:[1,15], w2:[16,30], w3:[31,45], w4:[46,60] };

const PALETTES = (CFG.palettes && CFG.palettes.length)
  ? CFG.palettes
  : [
      ['#ff8fd8','#ffc04d','#7dd3fc','#86efac'],
      ['#f9a8d4','#fde68a','#93c5fd','#c4b5fd'],
      ['#fca5a5','#fdba74','#fcd34d','#86efac'],
      ['#a5b4fc','#67e8f9','#f9a8d4','#fde68a']
    ];

const MOTE_COLORS = (CFG.moteColors && CFG.moteColors.length)
  ? CFG.moteColors
  : ['#ffffff','#ffe08a','#ffd1f4','#aee7ff'];


/* ── DOM refs ── */
const scene      = document.getElementById('card-scene');
const enEl       = document.getElementById('en-word') || document.getElementById('en-sentence');
const kanjiEl    = document.getElementById('jp-kanji');
const hiraEl     = document.getElementById('jp-hira');
const sfEl       = document.getElementById('stripe-front');
const sbEl       = document.getElementById('stripe-back');
const counter    = document.getElementById('card-counter');
const sparkL     = document.getElementById('sparkle-layer');
const preloadBar = document.getElementById('preload-bar');
const btnPlay    = document.getElementById('btn-play');
const toast      = document.getElementById('warning-toast');

/* ── State ── */
let CARDS      = [];
let audioCache = {};
let idx        = 0;
let flipped    = false;
let playLocked = false;
let toastTimer = null;

/* ════════════════════════════
   BACK BUTTON
════════════════════════════ */
function goBack() {
  const wp     = searchParams.get('week') || '';
  const target = CFG.navTarget + (wp ? `?week=${encodeURIComponent(wp)}` : '');
  sessionStorage.setItem(CFG.navKey, '1');
  window.location.assign(target);
}
document.getElementById('btn-close').addEventListener('click', goBack);

/* ════════════════════════════
   WEEK LABEL
════════════════════════════ */
const MO = {jan:'January',feb:'February',mar:'March',apr:'April',may:'May',jun:'June',jul:'July',aug:'August',sep:'September',oct:'October',nov:'November',dec:'December'};
const JP = {jan:'1月',feb:'2月',mar:'3月',apr:'4月',may:'5月',jun:'6月',jul:'7月',aug:'8月',sep:'9月',oct:'10月',nov:'11月',dec:'12月'};

function prettyWeek(str) {
  const m = str.match(/_([a-z]{3})_w(\d)$/i);
  if (!m) return '';
  const mo = m[1].toLowerCase(), wn = m[2];
  return (MO[mo]||mo)+' Week '+wn+' &middot; '+(JP[mo]||mo)+'第'+wn+'週';
}

function getWeekKey() {
  const label = prettyWeek(weekParam);
  if (label) {
    document.getElementById('week-label').innerHTML = label;
    const m = weekParam.match(/_w(\d)$/i);
    return m ? 'w' + m[1] : 'w1';
  }
  const folder = window.location.pathname.split('/').slice(-2, -1)[0] || '';
  const lbl    = prettyWeek(folder);
  if (lbl) document.getElementById('week-label').innerHTML = lbl;
  const m2 = folder.match(/_w(\d)$/i);
  return m2 ? 'w' + m2[1] : 'w1';
}

/* ════════════════════════════
   HELPERS
════════════════════════════ */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function makeStripe(colors) {
  const band = 40, stops = [];
  colors.forEach((c, i) => { const s = i*band; stops.push(c+' '+s+'px '+(s+band)+'px'); });
  const doubled = stops.concat(stops.map(s => s.replace(/(\d+)px/g, (_,n) => (+n+band*colors.length)+'px')));
  return 'repeating-linear-gradient(180deg,'+doubled.join(',')+')';
}

function wrapLetters(el, text) {
  el.innerHTML = text.split('').map((ch, i) =>
    ch === ' ' ? ' ' :
    '<span class="letter" style="--dance-delay:' + (i*.06).toFixed(2) + 's;--dance-dur:' + (.45+Math.random()*.25).toFixed(2) + 's">' + ch + '</span>'
  ).join('');
}

function wrapWords(el, text) {
  el.innerHTML = text.split(' ').map((w, i) =>
    '<span class="word" style="--wdel:' + (i*.07).toFixed(2) + 's;--wd:' + (.42+Math.random()*.22).toFixed(2) + 's">' + w + '</span>'
  ).join(' ');
}

function burstMotes() {
  sparkL.innerHTML = '';
  for (let i = 0; i < 22; i++) {
    const m  = document.createElement('div');
    m.className = 'mote';
    const sz = 5+Math.random()*10, x = 8+Math.random()*84, y = 20+Math.random()*60;
    const tx = (Math.random()-.5)*80+'px', ty = -(20+Math.random()*70)+'px';
    const md = (.5+Math.random()*.6)+'s';
    const mc = MOTE_COLORS[Math.floor(Math.random()*MOTE_COLORS.length)];
    m.style.cssText = `width:${sz}px;height:${sz}px;left:${x}%;top:${y}%;--tx:${tx};--ty:${ty};--md:${md};--mc:${mc};animation-delay:${(Math.random()*.12).toFixed(2)}s`;
    sparkL.appendChild(m);
  }
  setTimeout(() => { sparkL.innerHTML = ''; }, 1400);
}

/* ════════════════════════════
   FIT FUNCTIONS
════════════════════════════ */
function fitWord(el, container) {
  const availW = container.clientWidth * 0.9;
  const availH = container.clientHeight * 0.58;
  const maxPx  = Math.min(96, scene.offsetHeight * 0.24);
  let lo = 16, hi = maxPx, best = 16;
  for (let s = 0; s < 16; s++) {
    const mid = Math.round((lo+hi)/2);
    el.style.fontSize = mid+'px';
    if (el.scrollWidth <= availW+2 && el.scrollHeight <= availH+2) { best=mid; lo=mid+1; }
    else hi=mid-1;
  }
  el.style.fontSize = best+'px';
}

function fitSentence(el, container) {
  const cardH = scene.offsetHeight;
  const padV  = parseFloat(getComputedStyle(container).paddingTop) * 2;
  const avail = cardH - padV - 16;
  const maxPx = Math.min(46, cardH * 0.13);
  let lo = 13, hi = maxPx, best = 13;
  for (let s = 0; s < 14; s++) {
    const mid = Math.round((lo+hi)/2);
    el.style.fontSize = mid+'px';
    if (el.scrollHeight <= avail) { best=mid; lo=mid+1; }
    else hi=mid-1;
  }
  el.style.fontSize = best+'px';
}

function fitJapanesePair(kEl, hEl, container) {
  const isVocab = CFG.deckMode === 'vocab';
  const RATIO   = isVocab ? 1.9 : 1.7;
  const cardH   = scene.offsetHeight;
  const padV    = parseFloat(getComputedStyle(container).paddingTop) * 2;
  const gapPx   = parseFloat(getComputedStyle(container).gap) || 12;
  const avail   = cardH - padV - gapPx - 20;
  const maxK    = isVocab ? Math.min(60, cardH*.18) : Math.min(44, cardH*.12);
  const minK    = isVocab ? 14 : 12;
  let lo = minK, hi = maxK, bestK = minK;
  for (let s = 0; s < 16; s++) {
    const midK = Math.round((lo+hi)/2);
    const midH = Math.max(isVocab?11:10, Math.round(midK/RATIO));
    kEl.style.fontSize = midK+'px';
    hEl.style.fontSize = midH+'px';
    if (kEl.scrollHeight+hEl.scrollHeight+gapPx <= avail) { bestK=midK; lo=midK+1; }
    else hi=midK-1;
  }
  kEl.style.fontSize = bestK+'px';
  hEl.style.fontSize = Math.max(isVocab?11:10, Math.round(bestK/RATIO))+'px';
}

/* ════════════════════════════
   SHOW CARD
════════════════════════════ */
function showCard() {
  const card   = CARDS[idx];
  const stripe = makeStripe(PALETTES[idx % PALETTES.length]);
  sfEl.style.backgroundImage = stripe;
  sbEl.style.backgroundImage = stripe;

  CFG.deckMode === 'vocab' ? wrapLetters(enEl, card.en) : wrapWords(enEl, card.en);
  enEl.classList.remove('dancing');
  kanjiEl.textContent = card.jp;
  hiraEl.textContent  = card.hira;
  counter.textContent = (idx+1) + ' / ' + CARDS.length;
  scene.classList.toggle('flipped', flipped);

  requestAnimationFrame(() => {
    const fc = document.querySelector('.card-front .content');
    const bc = document.querySelector('.card-back .content');
    if (fc) CFG.deckMode === 'vocab' ? fitWord(enEl, fc) : fitSentence(enEl, fc);
    if (bc) fitJapanesePair(kanjiEl, hiraEl, bc);
  });
}

/* ════════════════════════════
   AUDIO
════════════════════════════ */
function preloadAudio(cards) {
  let loaded = 0;
  audioCache = {};
  cards.forEach(card => {
    const a = new Audio();
    a.preload = 'auto';
    a.src = AUDIO_BASE + card.mp3;
    const done = () => {
      loaded++;
      preloadBar.textContent = 'Audio ' + loaded + ' / ' + cards.length;
      if (loaded >= cards.length) preloadBar.classList.add('done');
    };
    a.addEventListener('canplaythrough', done, { once:true });
    a.addEventListener('error',          done, { once:true });
    a.load();
    audioCache[card.mp3] = a;
  });
}

function showWarning() {
  if (toastTimer) clearTimeout(toastTimer);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function unlockPlay() {
  playLocked = false;
  btnPlay.classList.remove('locked');
  enEl.classList.remove('dancing');
}

function stopAudio() {
  const a = audioCache[CARDS[idx]?.mp3];
  if (a) { try { a.pause(); a.currentTime=0; } catch(e){} }
  unlockPlay();
}

function playAudio() {
  if (playLocked) { showWarning(); return; }
  const card = CARDS[idx];
  if (!card) return;
  const a = audioCache[card.mp3];
  if (!a) return;
  playLocked = true;
  btnPlay.classList.add('locked');
  enEl.classList.add('dancing');
  burstMotes();
  a.currentTime = 0;
  a.onended = unlockPlay;
  a.onerror = unlockPlay;
  a.play().catch(unlockPlay);
}

/* ════════════════════════════
   NAVIGATION
════════════════════════════ */
function goNext() { stopAudio(); idx=(idx+1)%CARDS.length; flipped=false; showCard(); }
function goPrev() { stopAudio(); idx=(idx-1+CARDS.length)%CARDS.length; flipped=false; showCard(); }
function doFlip() { flipped=!flipped; scene.classList.toggle('flipped',flipped); }

document.getElementById('btn-prev').addEventListener('click', goPrev);
document.getElementById('btn-next').addEventListener('click', goNext);
document.getElementById('btn-flip').addEventListener('click', doFlip);
btnPlay.addEventListener('click', playAudio);
scene.addEventListener('click', doFlip);
window.addEventListener('resize', () => { if (CARDS.length) showCard(); });

/* ════════════════════════════
   INIT
   FIX: use CFG.jsonUrl (built by bootstrap) — no more hardcoded path
════════════════════════════ */
(async function init() {
  const weekKey  = getWeekKey();
  const [lo, hi] = WEEK_RANGES[weekKey] || WEEK_RANGES.w1;

  try {
    const res  = await fetch(CFG.jsonUrl);
    const data = await res.json();
    CARDS = (data.cards || []).filter(c => c.n >= lo && c.n <= hi);
  } catch(e) {
    preloadBar.textContent = CFG.errorLabel || 'Could not load data.';
    console.error('[deck-core] fetch failed:', e);
    return;
  }

  if (!CARDS.length) { preloadBar.textContent = 'No cards for ' + weekKey; return; }
  shuffle(CARDS);
  preloadAudio(CARDS);
  showCard();
})();

})();
