
/* ═══════════════════════════════════════════════════════════════
   stream-core.js  —  Stream engine (sequential audio play mode)
   Reads window.DECK_CONFIG which study-deck.html sets from the
   URL params + CURRICULUM_REGISTRY lookup.
   ═══════════════════════════════════════════════════════════════ */
(function () {

const CFG        = window.DECK_CONFIG;
const AUDIO_ROOT = 'https://pub-8d5941f302df44b899ce9d9a4606dcb7.r2.dev/audio-2027';

const searchParams  = new URLSearchParams(window.location.search);
const weekParam     = searchParams.get('week') || '';
const monthMatch    = weekParam.match(/_([a-z]{3})_w/i);
const MONTH         = monthMatch ? monthMatch[1] : 'jan';
const STREAM_ROOT   = `${AUDIO_ROOT}/${MONTH}/${CFG.audioFolder}/`;

const STREAM_PALETTES = CFG.palettes;
const MOTE_COLORS     = CFG.moteColors;

/* ── DOM refs ── */
const enTextEl      = document.getElementById('en-text');
const stripeEl      = document.getElementById('stripe-layer');
const trackCounter  = document.getElementById('track-counter');
const progressFill  = document.getElementById('progress-fill');
const pauseRing     = document.getElementById('pause-ring');
const ringFg        = document.getElementById('ring-fg');
const btnPlayPause  = document.getElementById('btn-playpause');
const btnSlow       = document.getElementById('btn-slow');
const btnPrev       = document.getElementById('btn-prev');
const btnNext       = document.getElementById('btn-next');
const preloadBar    = document.getElementById('preload-bar');
const progressLeft  = document.getElementById('progress-left');
const progressRight = document.getElementById('progress-right');
const sparkL        = document.getElementById('sparkle-layer');
const streamLabel   = document.getElementById('stream-label');
const streamDot     = document.querySelector('.stream-dot');

/* ── State ── */
let TRACKS       = [];
let trackIdx     = 0;
let isPlaying    = false;
let slowMode     = false;
let pauseTimer   = null;
let ringRAF      = null;
let currentAudio = null;

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

function parseWeekInfo() {
  // Full format: 2027_w09_mar_w1
  let m = weekParam.match(/^(\d{4})_w\d{2}_([a-z]{3})_w(\d)$/i);
  if (m) {
    const mo = m[2].toLowerCase(), wn = Number(m[3]);
    document.getElementById('week-label').innerHTML = `${MO[mo]||mo} Week ${wn} &middot; ${JP[mo]||mo}第${wn}週`;
    return wn;
  }
  // Short format: mar_w1
  m = weekParam.match(/^([a-z]{3})_w(\d)$/i);
  if (m) {
    const mo = m[1].toLowerCase(), wn = Number(m[2]);
    document.getElementById('week-label').innerHTML = `${MO[mo]||mo} Week ${wn} &middot; ${JP[mo]||mo}第${wn}週`;
    return wn;
  }
  document.getElementById('week-label').textContent = 'Weekly Stream';
  return 1;
}

/* ════════════════════════════
   BUILD 45-ITEM WEEK STREAM
   JSON layout: 0–59 vocab, 60–119 sentences, 120–179 questions
════════════════════════════ */
function buildWeekStream(allCards, weekNum) {
  const base = (weekNum - 1) * 15;
  return [
    ...allCards.slice(base,       base + 15),
    ...allCards.slice(60 + base,  75 + base),
    ...allCards.slice(120 + base, 135 + base),
  ];
}

/* ════════════════════════════
   AUDIO PATH
   Stream serves from multiple subfolders — detect by filename prefix.
   Prefix convention must match what each curriculum uses.
   Default: br_ prefix → vocab/sentences/questions
   Override CFG.getAudioSrc(mp3) in curriculum-config if needed.
════════════════════════════ */
function getAudioSrc(mp3) {
  if (typeof CFG.getAudioSrc === 'function') return CFG.getAudioSrc(mp3, STREAM_ROOT);
  // Default: detect by filename prefix (works for boo-riculum br_ files)
  const prefix = mp3.split('_')[1] || '';
  if      (prefix === 'v') return STREAM_ROOT + 'vocab/'     + mp3;
  else if (prefix === 's') return STREAM_ROOT + 'sentences/' + mp3;
  else if (prefix === 'q') return STREAM_ROOT + 'questions/' + mp3;
  return STREAM_ROOT + mp3;
}

/* ════════════════════════════
   HELPERS
════════════════════════════ */
function makeStripe(colors) {
  const band = 40, stops = [];
  colors.forEach((c, i) => { const s=i*band; stops.push(c+' '+s+'px '+(s+band)+'px'); });
  const doubled = stops.concat(stops.map(s => s.replace(/(\d+)px/g,(_,n)=>(+n+band*colors.length)+'px')));
  return 'repeating-linear-gradient(180deg,'+doubled.join(',')+')';
}

function fitText(el) {
  el.style.fontSize = '';
  const content = el.closest('.card-content');
  if (!content) return;
  const cardH = document.querySelector('.card-face').offsetHeight;
  const padV  = parseFloat(getComputedStyle(content).paddingTop) * 2;
  const ringH = pauseRing.offsetHeight + 10;
  const avail = cardH - padV - ringH - 16;
  const maxPx = Math.min(48, cardH * 0.13);
  let lo = 15, hi = maxPx, best = 15;
  for (let s = 0; s < 14; s++) {
    const mid = Math.round((lo+hi)/2);
    el.style.fontSize = mid+'px';
    if (el.scrollHeight <= avail) { best=mid; lo=mid+1; }
    else hi=mid-1;
  }
  el.style.fontSize = best+'px';
}

function wrapWords(el, text) {
  el.innerHTML = text.split(' ').map((w,i) =>
    '<span class="word" style="--wdel:'+(i*.07).toFixed(2)+'s;--wd:'+(.4+Math.random()*.2).toFixed(2)+'s">'+w+'</span>'
  ).join(' ');
}

function burstMotes() {
  sparkL.innerHTML = '';
  for (let i = 0; i < 18; i++) {
    const m  = document.createElement('div');
    m.className = 'mote';
    const sz=5+Math.random()*9, x=10+Math.random()*80, y=15+Math.random()*65;
    const tx=(Math.random()-.5)*70+'px', ty=-(18+Math.random()*55)+'px';
    const md=(.45+Math.random()*.55)+'s';
    const mc=MOTE_COLORS[Math.floor(Math.random()*MOTE_COLORS.length)];
    m.style.cssText=`width:${sz}px;height:${sz}px;left:${x}%;top:${y}%;--tx:${tx};--ty:${ty};--md:${md};--mc:${mc};animation-delay:${(Math.random()*.1).toFixed(2)}s`;
    sparkL.appendChild(m);
  }
  setTimeout(()=>{ sparkL.innerHTML=''; },1400);
}

/* ════════════════════════════
   SECTION COLOURS
   Sections: 0–14 vocab, 15–29 sentences, 30–44 questions
════════════════════════════ */
function getSectionInfo(i) {
  if (i < 15) return { label:'Vocab',     color:'#2ecc50' };
  if (i < 30) return { label:'Sentences', color:'#1a8fe0' };
  return             { label:'Questions', color:'#d98c00' };
}

function applySection(color) {
  document.documentElement.style.setProperty('--stream-color', color);
  streamLabel.style.color       = color;
  streamDot.style.background    = color;
  streamDot.style.boxShadow     = '0 0 10px '+color;
  progressFill.style.background = color;
  progressFill.style.boxShadow  = '0 0 8px '+color;
  // also update ring colour in SVG via CSS var
  document.documentElement.style.setProperty('--stream-color', color);
}

/* ════════════════════════════
   PRELOAD
════════════════════════════ */
function preloadAudio(cards) {
  let loaded = 0;
  cards.forEach(card => {
    const a = new Audio();
    a.preload = 'auto';
    a.src = getAudioSrc(card.mp3);
    const done = () => {
      loaded++;
      preloadBar.textContent = 'Audio '+loaded+' / '+cards.length;
      if (loaded >= cards.length) preloadBar.classList.add('done');
    };
    a.addEventListener('canplaythrough', done, {once:true});
    a.addEventListener('error',          done, {once:true});
    a.load();
  });
}

/* ════════════════════════════
   UI UPDATE
════════════════════════════ */
function updateUI(track) {
  const sec = getSectionInfo(trackIdx);
  stripeEl.style.backgroundImage = makeStripe(STREAM_PALETTES[trackIdx % STREAM_PALETTES.length]);
  trackCounter.textContent        = (trackIdx+1)+' / '+TRACKS.length;
  progressFill.style.width        = ((trackIdx+1)/TRACKS.length*100).toFixed(1)+'%';
  streamLabel.textContent         = sec.label;
  progressLeft.textContent        = 'Vocab';
  progressRight.textContent       = 'Questions';
  applySection(sec.color);
  wrapWords(enTextEl, track.en);
  enTextEl.classList.remove('dancing');
  requestAnimationFrame(() => fitText(enTextEl));
  pauseRing.classList.remove('visible');
  ringFg.style.strokeDashoffset = '0';
}

/* ════════════════════════════
   RING ANIMATION
════════════════════════════ */
function animateRing(durationMs) {
  const start = performance.now();
  cancelAnimationFrame(ringRAF);
  ringFg.style.strokeDashoffset = '0';
  function step(now) {
    const frac = Math.min((now-start)/durationMs, 1);
    ringFg.style.strokeDashoffset = (113*frac).toFixed(2);
    if (frac < 1) ringRAF = requestAnimationFrame(step);
  }
  ringRAF = requestAnimationFrame(step);
}

/* ════════════════════════════
   PLAYBACK
════════════════════════════ */
function stopEverything() {
  if (currentAudio) { try { currentAudio.pause(); currentAudio.currentTime=0; } catch(e){} }
  clearTimeout(pauseTimer);
  cancelAnimationFrame(ringRAF);
  pauseRing.classList.remove('visible');
  enTextEl.classList.remove('dancing');
}

function getPauseSeconds(track) {
  if (Number.isFinite(track.pause)) return track.pause * (slowMode ? 2 : 1);
  const words = (track.en||'').trim().split(/\s+/).filter(Boolean).length;
  const src   = getAudioSrc(track.mp3);
  let base = src.includes('/vocab/')     ? 1.6 :
             src.includes('/sentences/') ? 2.2 + words*.22 :
             src.includes('/questions/') ? 2.6 + words*.24 :
                                           2.2 + words*.22;
  if (slowMode) base *= 2;
  return Math.max(1.4, Math.min(base, 8.5));
}

function startPause(track) {
  const ms = getPauseSeconds(track) * 1000;
  pauseRing.classList.add('visible');
  animateRing(ms);
  pauseTimer = setTimeout(() => {
    pauseRing.classList.remove('visible');
    if (isPlaying) playTrack((trackIdx+1) % TRACKS.length);
  }, ms);
}

function playTrack(i) {
  stopEverything();
  trackIdx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
  const track = TRACKS[trackIdx];
  updateUI(track);

  currentAudio = new Audio(getAudioSrc(track.mp3));
  currentAudio.preload = 'auto';
  currentAudio.onended = () => { enTextEl.classList.remove('dancing'); if (isPlaying) startPause(track); };
  currentAudio.onerror = () => { enTextEl.classList.remove('dancing'); if (isPlaying) startPause(track); };
  currentAudio.play().then(() => {
    enTextEl.classList.add('dancing');
    burstMotes();
  }).catch(() => { enTextEl.classList.remove('dancing'); if (isPlaying) startPause(track); });
}

function togglePlay() {
  if (!TRACKS.length) return;
  if (isPlaying) {
    isPlaying = false;
    stopEverything();
    btnPlayPause.innerHTML = '&#9654;';
    btnPlayPause.classList.remove('playing');
    btnPlayPause.setAttribute('aria-label','Play');
  } else {
    isPlaying = true;
    btnPlayPause.innerHTML = '&#9646;&#9646;';
    btnPlayPause.classList.add('playing');
    btnPlayPause.setAttribute('aria-label','Pause');
    playTrack(trackIdx);
  }
}

/* ════════════════════════════
   CONTROLS
════════════════════════════ */
btnPrev.addEventListener('click', () => {
  if (!TRACKS.length) return;
  const i = ((trackIdx-1)+TRACKS.length) % TRACKS.length;
  if (isPlaying) playTrack(i); else { trackIdx=i; updateUI(TRACKS[trackIdx]); }
});
btnNext.addEventListener('click', () => {
  if (!TRACKS.length) return;
  const i = (trackIdx+1) % TRACKS.length;
  if (isPlaying) playTrack(i); else { trackIdx=i; updateUI(TRACKS[trackIdx]); }
});
btnPlayPause.addEventListener('click', togglePlay);
btnSlow.addEventListener('click', () => {
  slowMode = !slowMode;
  btnSlow.classList.toggle('active', slowMode);
  btnSlow.setAttribute('aria-pressed', slowMode);
});
window.addEventListener('resize', () => {
  if (TRACKS[trackIdx]) requestAnimationFrame(() => fitText(enTextEl));
});

/* ════════════════════════════
   INIT
════════════════════════════ */
(async function init() {
  const weekNum = parseWeekInfo();

  try {
    const res      = await fetch(CFG.jsonUrl);
    const data     = await res.json();
    const allCards = data.cards || [];
    if (allCards.length < 180) {
      preloadBar.textContent = CFG.jsonFile + ' needs 180 items.';
      console.error('[stream-core] Expected 180 cards, got:', allCards.length);
      return;
    }
    TRACKS = buildWeekStream(allCards, weekNum);
  } catch(e) {
    preloadBar.textContent = CFG.errorLabel || 'Could not load stream data.';
    console.error('[stream-core] fetch failed:', e);
    return;
  }

  if (!TRACKS.length) { preloadBar.textContent = 'No stream tracks for this week.'; return; }

  preloadAudio(TRACKS);
  updateUI(TRACKS[0]);
})();

})();
