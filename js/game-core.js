
/* ══════════════════════════════════════════════════════════════
   game-core.js  —  Game deck bootstrap
   Reads URL: curriculum/br/game.html?week=br_mar_w2&game=vocab-tap
   Builds window.GAME_CONFIG, then dynamically loads the game engine.
   ══════════════════════════════════════════════════════════════ */
(async function () {

const AUDIO_ROOT = 'https://pub-8d5941f302df44b899ce9d9a4606dcb7.r2.dev/audio-2027';
const BASE       = '/the-booha-adventure';

/* ── URL params ── */
const sp       = new URLSearchParams(window.location.search);
const weekParam = sp.get('week') || '';
const gameName  = sp.get('game') || '';

/* ── Parse curriculum, month, week number ── */
const slugMatch = weekParam.match(/^(pb|br|bc)_([a-z]{3})_w(\d)$/i);
if (!slugMatch) { showError('Bad week param: ' + weekParam); return; }

const curriculum = slugMatch[1].toLowerCase();
const monthShort = slugMatch[2].toLowerCase();
const weekNum    = Number(slugMatch[3]);

const MONTH_MAP = {
  jan:'january', feb:'february', mar:'march',    apr:'april',
  may:'may',     jun:'june',     jul:'july',      aug:'august',
  sep:'september',oct:'october', nov:'november',  dec:'december'
};
const MONTH_LABEL_JP = {
  jan:'1月', feb:'2月', mar:'3月',  apr:'4月',
  may:'5月', jun:'6月', jul:'7月',  aug:'8月',
  sep:'9月', oct:'10月',nov:'11月', dec:'12月'
};

const monthFull  = MONTH_MAP[monthShort]  || monthShort;
const monthLabel = monthShort.charAt(0).toUpperCase() + monthShort.slice(1);
const weekLabel  = `${monthLabel} Week ${weekNum}`;
const weekLabelJP= `${MONTH_LABEL_JP[monthShort] || monthShort}第${weekNum}週`;

/* ── Curriculum registry ── */
const REGISTRY = {
  br: {
    audioFolder: 'boo_riculum',
    navTarget:   `${BASE}/curriculum/br/game-index.html`,
    navKey:      'booha_br_game_open',
    errorLabel:  'Boo-riculum data could not load.',
    theme: {
      primary: '#aaff22',
      secondary: '#0088ff',
      accent:  '#ff2288',
      amber:   '#ffaa00',
      bg:      '#081a04',
    }
  },
  pb: {
    audioFolder: 'pre_boo',
    navTarget:   `${BASE}/curriculum/pb/game-index.html`,
    navKey:      'booha_pb_game_open',
    errorLabel:  'Pre-Boo data could not load.',
    theme: {
      primary: '#ff6eb4',
      secondary: '#cc88ff',
      accent:  '#88ffcc',
      amber:   '#ffb088',
      bg:      '#16081f',
    }
  },
  bc: {
    audioFolder: 'boo_continuum',
    navTarget:   `${BASE}/curriculum/bc/game-index.html`,
    navKey:      'booha_bc_game_open',
    errorLabel:  'Boo Continuum data could not load.',
    theme: {
      primary: '#00f0ff',
      secondary: '#0055ff',
      accent:  '#aa00ff',
      amber:   '#ff9900',
      bg:      '#03080f',
    }
  }
};

const reg = REGISTRY[curriculum];
if (!reg) { showError('Unknown curriculum: ' + curriculum); return; }

/* ── Game → JSON type mapping ── */
const GAME_JSON = {
  'vocab-tap':      'vocab',
  'spell-word':     'vocab',
  'vocab-speed':    'vocab',
  'say-word':       'vocab',
  'sentence-tap':   'sentences',
  'sentence-order': 'sentences',
  'sentence-speed': 'sentences',
  'say-sentence':   'sentences',
  'ask-question':   'questions',
};

const jsonType = GAME_JSON[gameName];
if (!jsonType) { showError('Unknown game: ' + gameName); return; }

/* ── Fetch data ── */
const contentBase = `${BASE}/content/${curriculum}/${monthFull}/`;

let cards = [];
try {
  const res  = await fetch(contentBase + jsonType + '.json');
  const data = await res.json();
  cards = data.cards || [];
} catch(e) {
  showError(reg.errorLabel);
  return;
}

if (!cards.length) { showError('No cards found.'); return; }

/* ── Slice week's 15 cards ── */
const base15 = (weekNum - 1) * 15;
const weekCards = cards.slice(base15, base15 + 15);

if (!weekCards.length) { showError(`No cards for week ${weekNum}.`); return; }

/* ── Build audio base URL ── */
const audioBase = `${AUDIO_ROOT}/${monthShort}/${reg.audioFolder}/${jsonType}/`;
const sfxBase   = `${BASE}/assets/audio/`;

/* ══════════════════════════════════════════════════════════════
   GAME_CONFIG  — everything a game engine needs
   ══════════════════════════════════════════════════════════════ */
window.GAME_CONFIG = {
  curriculum,
  gameName,
  weekParam,
  weekLabel,
  weekLabelJP,
  weekNum,
  monthShort,
  monthFull,
  jsonType,
  cards:      weekCards,   // 15 items [{id,en,jp,hira,mp3}, ...]
  audioBase,               // R2 URL prefix for content audio
  sfxBase,                 // /assets/audio/ for ding/fart/results
  navTarget:  reg.navTarget,
  navKey:     reg.navKey,
  theme:      reg.theme,
  errorLabel: reg.errorLabel,
};

/* ── Apply curriculum theme to <html> ── */
document.documentElement.setAttribute('data-curriculum', curriculum);

/* ── Update any week-label placeholders already in the shell ── */
document.querySelectorAll('[data-week-label]').forEach(el => el.textContent = weekLabel);
document.querySelectorAll('[data-week-label-jp]').forEach(el => el.textContent = weekLabelJP);

/* ── Dynamically load the game engine ── */
const scriptSrc = `${BASE}/js/games/${gameName}.js`;
const s = document.createElement('script');
s.src = scriptSrc;
s.onerror = () => showError(`Could not load game engine: ${gameName}.js`);
document.body.appendChild(s);

/* ── Error helper ── */
function showError(msg) {
  const el = document.getElementById('game-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else    { console.error('[game-core]', msg); }
}

})();
