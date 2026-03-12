
/* ═══════════════════════════════════════════════════════════════
   stream-core.js  —  Stream engine (sequential audio play mode)
   FIXES:
   - parseWeekInfo targets stream-week-label (not hidden week-label)
   - fitText allows much larger font sizes
   - prev/next work when paused
   - slowMode uses playbackRate on audio element
   - section colors use curriculum theme colors
   ═══════════════════════════════════════════════════════════════ */
(function () {

const CFG        = window.DECK_CONFIG;
const AUDIO_ROOT = 'https://pub-8d5941f302df44b899ce9d9a4606dcb7.r2.dev/audio-2027';

const searchParams  = new URLSearchParams(window.location.search);
const weekParam     = searchParams.get('week') || '';
const monthMatch    = weekParam.match(/_([a-z]{3})_w/i);
const MONTH_CODE    = monthMatch ? monthMatch[1].toLowerCase() : 'jan';

const STREAM_ROOT     = `${AUDIO_ROOT}/${MONTH_CODE}/${CFG.audioFolder}/`;
const STREAM_PALETTES = CFG.palettes;
const MOTE_COLORS     = CFG.moteColors;

/* ── DOM refs ── */
const enTextEl      = document.getElementById('en-text');
const stripeEl      = document.getElementById('stripe-layer-stream');
const trackCounter  = document.getElementById('track-counter');
const progressFill  = document.getElementById('progress-fill');
const pauseRing     = document.getElementById('pause-ring');
const ringFg        = document.getElementById('ring-fg');
const btnPlayPause  = document.getElementById('btn-playpause');
const btnSlow       = document.getElementById('btn-slow');
const btnPrev       = document.getElementById('btn-prev');
const btnNext       = document.getElementById('btn-next');
const preloadBar    = document.getElementById('preload-bar-stream');
const progressLeft  = document.getElementById('progress-left');
const progressRight = document.getElementById('progress-right');
const sparkL        = document.getElementById('sparkle-layer-stream');
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
   FIX: target stream-week-label — week-label lives in hidden flashcard-ui
════════════════════════════ */
const MO = {jan:'January',feb:'February',mar:'March',apr:'April',may:'May',jun:'June',jul:'July',aug:'August',sep:'September',oct:'October',nov:'November',dec:'December'};
const JP = {jan:'1月',feb:'2月',mar:'3月',apr:'4月',may:'5月',jun:'6月',jul:'7月',aug:'8月',sep:'9月',oct:'10月',nov:'11月',dec:'12月'};

function parseWeekInfo() {
  const el = document.getElementById('stream-week-label');
  if (!el) return 1;

  // Standard format: br_mar_w2
  let m = weekParam.match(/^(?:pb|br|bc)_([a-z]{3})_w(\d)$/i);
  if (m) {
    const mo = m[1].toLowerCase(), wn = Number(m[2]);
    el.innerHTML = `${MO[mo]||mo} Week ${wn} &middot; ${JP[mo]||mo}第${wn}週`;
    return wn;
  }
  // Full format: 2027_w09_mar_w1
  m = weekParam.match(/^(\d{4})_w\d{2}_([a-z]{3})_w(\d)$/i);
  if (m) {
    const mo = m[2].toLowerCase(), wn = Number(m[3]);
    el.innerHTML = `${MO[mo]||mo} Week ${wn} &middot; ${JP[mo]||mo}第${wn}週`;
    return wn;
  }
  el.textContent = 'Weekly Stream';
  return 1;
}

/* ════════════════════════════
   BUILD 45-ITEM WEEK STREAM
════════════════════════════ */
function buildWeekStream(allCards, weekNum) {
  const base = (weekNum - 1) * 15;
  return [
    ...allCards.slice(base,        base + 15),
    ...allCards.slice(60 + base,   75 + base),
    ...allCards.slice(120 + base, 135 + base),
  ];
}

/* ════════════════════════════
   AUDIO PATH
════════════════════════════ */
function getAudioSrc(mp3) {
  if (typeof CFG.getAudioSrc === 'function') return CFG.getAudioSrc(mp3, STREAM_ROOT);
  const parts  = mp3.split('_');
  const prefix = (parts[1] || '')[0];
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

/* FIX: much larger max font — sentences/questions need to be readable */
function fitText(el) {
  el.style.fontSize = '';
  const content  = el.closest('.card-content');
  if (!content) return;
  const cardFace = document.querySelector('.card-face.single') || document.querySelector('.card-face');
  const cardH    = cardFace ? cardFace.offsetHeight : 300;
  const padV     = parseFloat(getComputedStyle(content).paddingTop) * 2;
  const ringH    = pauseRing ? (pauseRing.offsetHeight + 10) : 0;
  const avail    = cardH - padV - ringH - 20;
  const maxPx    = Math.min(72, cardH * 0.22);
  const minPx    = 16;
  let lo = minPx, hi = maxPx, best = minPx;
  for (let s = 0; s < 16; s++) {
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
  if (!sparkL) return;
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
  setTimeout(()=>{ if (sparkL) sparkL.innerHTML=''; },1400);
}

/* ════════════════════════════
   SECTION COLOURS — use curriculum theme colors
════════════════════════════ */
function getSectionInfo(i) {
  const c = CFG.curriculum || 'br';
  const COLS = {
    br: { vocab:'#aaff22', sentences:'#28b4ff', questions:'#ffaa00' },
    pb: { vocab:'#ff88cc', sentences:'#ffb088', questions:'#88ffcc' },
    bc: { vocab:'#00f0ff', sentences:'#4090ff', questions:'#b040ff' },
  };
  const cols = COLS[c] || COLS.br;
  if (i < 15) return { label:'Vocab',     color: cols.vocab };
  if (i < 30) return { label:'Sentences', color: cols.sentences };
  return             { label:'Questions', color: cols.questions };
}

function applySection(color) {
  document.documentElement.style.setProperty('--stream-color', color);
  if (streamLabel)  { streamLabel.style.color = color; streamLabel.style.textShadow = '0 0 12px '+color; }
  if (streamDot)    { streamDot.style.background = color; streamDot.style.boxShadow = '0 0 12px '+color+', 0 0 24px '+color; }
  if (progressFill) { progressFill.style.background = color; progressFill.style.boxShadow = '0 0 10px '+color; }
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
      if (preloadBar) {
        preloadBar.textContent = 'Audio '+loaded+' / '+cards.length;
        if (loaded >= cards.length) preloadBar.classList.add('done');
      }
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
  if (stripeEl)      stripeEl.style.backgroundImage = makeStripe(STREAM_PALETTES[trackIdx % STREAM_PALETTES.length]);
  if (trackCounter)  trackCounter.textContent        = (trackIdx+1)+' / '+TRACKS.length;
  if (progressFill)  progressFill.style.width        = ((trackIdx+1)/TRACKS.length*100).toFixed(1)+'%';
  if (streamLabel)   streamLabel.textContent         = sec.label;
  if (progressLeft)  progressLeft.textContent        = 'Vocab';
  if (progressRight) progressRight.textContent       = 'Questions';
  applySection(sec.color);
  wrapWords(enTextEl, track.en);
  enTextEl.classList.remove('dancing');
  requestAnimationFrame(() => fitText(enTextEl));
  if (pauseRing) pauseRing.classList.remove('visible');
  if (ringFg)    ringFg.style.strokeDashoffset = '0';
}

/* ════════════════════════════
   RING ANIMATION
════════════════════════════ */
function animateRing(durationMs) {
  const start = performance.now();
  cancelAnimationFrame(ringRAF);
  if (ringFg) ringFg.style.strokeDashoffset = '0';
  function step(now) {
    const frac = Math.min((now-start)/durationMs, 1);
    if (ringFg) ringFg.style.strokeDashoffset = (113*frac).toFixed(2);
    if (frac < 1) ringRAF = requestAnimationFrame(step);
  }
  ringRAF = requestAnimationFrame(step);
}

/* ════════════════════════════
   PLAYBACK
════════════════════════════ */
function stopEverything() {
  if (currentAudio) {
    try { currentAudio.pause(); currentAudio.currentTime=0; } catch(e){}
    currentAudio.onended = null;
    currentAudio.onerror = null;
  }
  clearTimeout(pauseTimer);
  cancelAnimationFrame(ringRAF);
  if (pauseRing) pauseRing.classList.remove('visible');
  enTextEl.classList.remove('dancing');
}

function getPauseSeconds(track) {
  if (Number.isFinite(track.pause)) return track.pause * (slowMode ? 2.5 : 1);
  const words = (track.en||'').trim().split(/\s+/).filter(Boolean).length;
  const src   = getAudioSrc(track.mp3);
  let base = src.includes('/vocab/')     ? 1.8 :
             src.includes('/sentences/') ? 2.4 + words * .2 :
             src.includes('/questions/') ? 2.8 + words * .22 :
                                           2.4 + words * .2;
  if (slowMode) base *= 2.5;
  return Math.max(1.6, Math.min(base, 10));
}

function startPause(track) {
  const ms = getPauseSeconds(track) * 1000;
  if (pauseRing) pauseRing.classList.add('visible');
  animateRing(ms);
  pauseTimer = setTimeout(() => {
    if (pauseRing) pauseRing.classList.remove('visible');
    if (isPlaying) playTrack((trackIdx + 1) % TRACKS.length);
  }, ms);
}

function playTrack(i) {
  stopEverything();
  trackIdx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
  const track = TRACKS[trackIdx];
  updateUI(track);

  currentAudio = new Audio(getAudioSrc(track.mp3));
  currentAudio.preload = 'auto';
  /* FIX: slow mode slows the audio itself via playbackRate */
  if (slowMode) currentAudio.playbackRate = 0.75;

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
   FIX: prev/next now work when paused — just update display, don't play
════════════════════════════ */
if (btnPrev) btnPrev.addEventListener('click', () => {
  if (!TRACKS.length) return;
  const i = ((trackIdx - 1) + TRACKS.length) % TRACKS.length;
  if (isPlaying) { playTrack(i); }
  else           { trackIdx = i; updateUI(TRACKS[trackIdx]); }
});

if (btnNext) btnNext.addEventListener('click', () => {
  if (!TRACKS.length) return;
  const i = (trackIdx + 1) % TRACKS.length;
  if (isPlaying) { playTrack(i); }
  else           { trackIdx = i; updateUI(TRACKS[trackIdx]); }
});

btnPlayPause.addEventListener('click', togglePlay);

if (btnSlow) btnSlow.addEventListener('click', () => {
  slowMode = !slowMode;
  btnSlow.classList.toggle('active', slowMode);
  btnSlow.setAttribute('aria-pressed', slowMode);
  /* Apply immediately to any currently playing audio */
  if (currentAudio) currentAudio.playbackRate = slowMode ? 0.75 : 1.0;
});

window.addEventListener('resize', () => {
  if (TRACKS[trackIdx]) requestAnimationFrame(() => fitText(enTextEl));
});

/* ════════════════════════════
   INIT
════════════════════════════ */
(async function init() {
  const weekNum = parseWeekInfo();
  const base    = `/the-booha-adventure/content/${CFG.curriculum}/${CFG.monthDir}/`;

  try {
    const [vocabRes, sentRes, questRes] = await Promise.all([
      fetch(base + 'vocab.json'),
      fetch(base + 'sentences.json'),
      fetch(base + 'questions.json')
    ]);
    const [vocabData, sentData, questData] = await Promise.all([
      vocabRes.json(), sentRes.json(), questRes.json()
    ]);
    const allCards = [
      ...(vocabData.cards  || []),
      ...(sentData.cards   || []),
      ...(questData.cards  || [])
    ];
    if (allCards.length < 180) {
      if (preloadBar) preloadBar.textContent = 'Need 180 cards total (got '+allCards.length+').';
      console.error('[stream-core] Expected 180 cards, got:', allCards.length);
      return;
    }
    TRACKS = buildWeekStream(allCards, weekNum);
  } catch(e) {
    if (preloadBar) preloadBar.textContent = CFG.errorLabel || 'Could not load stream data.';
    console.error('[stream-core] fetch failed:', e);
    return;
  }

  if (!TRACKS.length) {
    if (preloadBar) preloadBar.textContent = 'No stream tracks for this week.';
    return;
  }

  preloadAudio(TRACKS);
  updateUI(TRACKS[0]);
})();

})();
