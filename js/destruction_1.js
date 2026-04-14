
/* =====================================================
   BOOHA DESTRUCTION  —  destruction_1.js  (v4)

   CHANGES FROM v3:
   1. Block traits & resist system
      - cloneBlock() reads def.traits[] and def.resist{}
      - hasTrait(), getResist(), powerBlocked() helpers
      - damageBlock() accepts power param; skips/scales damage
      - blockCollide() passes power; checks immune before FX
      - updateBurning() checks burnimmune before tick
   2. Visual feedback on resistant/immune blocks
      - drawBlocks() renders a tinted border on blocks with traits
      - Colour-coded per dominant immunity type
   ===================================================== */
(() => {
  'use strict';

  const CFG    = window.BOOHA_CFG   || {};
  const ASSETS = CFG.assets         || {};
  const AUDIO  = CFG.audio          || {};

  // ── Layout constants ────────────────────────────────
  const W = 1280, H = 720;
  const FLOOR_Y    = H - 80;
  const SLING_X    = 190;
  const SLING_Y    = FLOOR_Y - 118;
  const MAX_PULL   = 148;
  const B_RADIUS   = 34;
  const GRAVITY    = 0.48;
  const AIR        = 0.999;
  const BOUNCE     = 0.72;
  const MIN_IMPACT = 3.8;
  const REST_THR   = 0.35;
  const SETTLE_NEED = 38;
  const NEXT_MS    = 950;
  const CARD_MS    = 3400;
  const HIT_COOL   = 90;

  const SUPPORT_OVERLAP = 0.30;
  const FALL_CRUSH_SPEED = 9;
  const FLOOR_THRESHOLD = 6;

  const IS_MOBILE = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    || window.innerWidth < 768;
  const BURST_SCALE = IS_MOBILE ? 0.65 : 1.0;

  // ── Canvas ──────────────────────────────────────────
  const canvas = document.getElementById(CFG.canvasId || 'gameCanvas');
  if (!canvas) { console.error('Booha: no canvas'); return; }
  const ctx = canvas.getContext('2d');
  canvas.width  = W;
  canvas.height = H;

  // ── Phase enum ──────────────────────────────────────
  const P = { TITLE:'title', PLAY:'play', WIN:'win', FAIL:'fail' };

  // ── FX pools ────────────────────────────────────────
  const sparks      = [];
  const waves       = [];
  const dusts       = [];
  const confetti    = [];
  const powers      = [];
  const scorchMarks = [];
  const shake       = { v:0, decay:0.87 };

  const CAP = {
    sparks: IS_MOBILE ? 120 : 180,
    waves:  IS_MOBILE ? 20  : 30,
    dusts:  IS_MOBILE ? 28  : 40,
    confetti: IS_MOBILE ? 180 : 280,
    damageConfetti: IS_MOBILE ? 50 : 80,
    scorchMarks: 12
  };
  function pushCapped(arr, cap, item) { if (arr.length < cap) arr.push(item); }

  // ── Landscape lock overlay ───────────────────────────
  let rotateOverlay = null;
  function ensureRotateOverlay() {
    if (rotateOverlay) return;
    rotateOverlay = document.createElement('div');
    rotateOverlay.id = 'booha-rotate';
    Object.assign(rotateOverlay.style, {
      position:'fixed',top:'0',left:'0',width:'100%',height:'100%',
      background:'#0c0a12',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',zIndex:'9999',
      fontFamily:'system-ui,sans-serif',color:'#fff',gap:'24px'
    });
    rotateOverlay.innerHTML = `
      <div style="font-size:72px;animation:rotSpin 2s ease-in-out infinite alternate">📱</div>
      <div style="font-size:22px;font-weight:bold;letter-spacing:2px">ROTATE TO PLAY</div>
      <div style="font-size:14px;opacity:0.5">Booha Destruction requires landscape mode</div>
      <style>@keyframes rotSpin{0%{transform:rotate(-90deg)}100%{transform:rotate(0deg)}}</style>
    `;
    document.body.appendChild(rotateOverlay);
  }
  function checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) { ensureRotateOverlay(); rotateOverlay.style.display = 'flex'; }
    else if (rotateOverlay) rotateOverlay.style.display = 'none';
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  checkOrientation();

  // ── Audio ────────────────────────────────────────────
  let AC = null;
  function getAC() {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  const audioBuffers = {};
  async function loadBuffer(key, src) {
    if (!src || audioBuffers[key]) return;
    try {
      const res = await fetch(src);
      const ab  = await res.arrayBuffer();
      audioBuffers[key] = await getAC().decodeAudioData(ab);
    } catch(e) {}
  }
  function playBuffer(key, vol=1) {
    const buf = audioBuffers[key]; if (!buf) return;
    try {
      const ac = getAC(), src = ac.createBufferSource(), gain = ac.createGain();
      src.buffer = buf; gain.gain.value = Math.max(0, Math.min(1, vol));
      src.connect(gain); gain.connect(ac.destination); src.start();
    } catch(e) {}
  }
  const SFX_POOL_SIZE = 5;
  const sfxPool = {};
  function getSFXNode(src) {
    if (!sfxPool[src]) sfxPool[src] = Array.from({length: SFX_POOL_SIZE}, () => new Audio(src));
    const pool = sfxPool[src];
    const free = pool.find(a => a.ended || (a.paused && a.currentTime === 0));
    if (free) return free;
    pool.sort((a, b) => b.currentTime - a.currentTime);
    const oldest = pool[0]; oldest.pause(); oldest.currentTime = 0; return oldest;
  }
  function playSFX(src, vol=1, rate=1) {
    if (!src) return;
    try {
      const a = getSFXNode(src);
      a.volume = Math.max(0, Math.min(1, vol));
      a.playbackRate = rate; a.currentTime = 0; a.play().catch(()=>{});
    } catch(e) {}
  }
  function synthPop(freq=500, vol=0.3, dur=0.08) {
    try {
      const ac = getAC(), o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination); o.type = 'sine';
      o.frequency.setValueAtTime(freq, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(freq * 0.38, ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.start(ac.currentTime); o.stop(ac.currentTime + dur + 0.01);
    } catch(e) {}
  }
  function celebPops(baseFreq=420) {
    [0,55,120,195,280].forEach((d,i) => setTimeout(() => synthPop(baseFreq + i*100, 0.26, 0.09), d));
  }

  // ── Booha roster ────────────────────────────────────
  const ROSTER = [
    { id:'booha', name:'Yellow Booha', jpName:'イエローブーハー',
      img:'./assets/images/booha_helmet.png',
      sfx:'./assets/audio/boo-boo.mp3', stock:5, power:'normal',
      desc:'Classic. Reliable. Friendly.',
      jp:'ベーシックであんていしたブーハーです。',
      tip:'Aim for the middle of tall stacks — the ricochet does the work.',
      conf:{cols:['#fff','#ffe','#ddf','#fdd','#dfd','#ffd'],sh:['circle','star','sparkle'],sz:[4,10],burst:65,spin:true}},
    { id:'heavy', name:'Heavy Booha', jpName:'ヘビーブーハー',
      img:'./assets/images/heavy_booha.png',
      sfx:'./assets/audio/boo-heavy.mp3', stock:3, power:'heavy',
      desc:'2× damage. Craters on landing.',
      jp:'とても強く、かたいブロックをこわします。',
      tip:'Drop it from high up — vertical hits compress blocks hardest.',
      conf:{cols:['#f60','#f90','#fc0','#f40','#fa0','#c30'],sh:['chunk','rect','circle'],sz:[7,18],burst:90,spin:false}},
    { id:'rock', name:'Rock Booha', jpName:'ロックブーハー',
      img:'./assets/images/rock_booha.png',
      sfx:'./assets/audio/boo-rock.mp3', stock:2, power:'rock',
      desc:'Pierces one block. Keeps going.',
      jp:'ブロックをつきぬけて、さらに進みます。',
      tip:'Angle through multiple blocks in a line for chain damage.',
      conf:{cols:['#9ab','#cde','#678','#e0e','#456','#abc'],sh:['shard','rect','crystal'],sz:[5,13],burst:58,spin:true}},
    { id:'ice', name:'Ice Booha', jpName:'アイスブーハー',
      img:'./assets/images/ice_booha.png',
      sfx:'./assets/audio/boo-ice.mp3', stock:2, power:'ice',
      desc:'Freezes blocks. They shatter.',
      jp:'ブロックをこおらせます。こおったブロックはこわれやすいです。',
      tip:'Freeze a structural base block — when it shatters, everything above falls.',
      conf:{cols:['#aef','#dff','#8df','#fff','#bcf','#6df'],sh:['crystal','sparkle','star'],sz:[4,12],burst:80,spin:true}},
    { id:'fire', name:'Fire Booha', jpName:'ファイアブーハー',
      img:'./assets/images/fire_booha.png',
      sfx:'./assets/audio/boo-fire.mp3', stock:2, power:'fire',
      desc:'Burns nearby blocks over time.',
      jp:'まわりのブロックをだんだんもやします。',
      tip:'Hit a central block — the burn spreads to everything within range.',
      conf:{cols:['#f22','#f70','#fa0','#fe0','#f50','#f33'],sh:['flame','circle','sparkle'],sz:[5,14],burst:105,spin:false}},
    { id:'princess', name:'Princess Booha', jpName:'プリンセスブーハー',
      img:'./assets/images/princess_booha.png',
      sfx:'./assets/audio/boo-princess.mp3', stock:1, power:'princess',
      desc:'Light & bouncy. Spawns 3 minis on first hit!',
      jp:'あたると、ちいさいブーハーに３つに分かれます。',
      tip:'The minis scatter unpredictably — hit a dense cluster for max chaos.',
      conf:{cols:['#f8c','#fae','#c4a','#fde','#fff','#fbd'],sh:['heart','star','sparkle','circle'],sz:[4,11],burst:125,spin:true}},
    { id:'rainbow', name:'Rainbow Booha', jpName:'レインボーブーハー',
      img:'./assets/images/rainbow_booha.png',
      sfx:'./assets/audio/boo-rainbow.mp3', stock:1, power:'rainbow',
      desc:'Turns blocks to glass. Shimmer trail.',
      jp:'ブロックをガラスに変えます。',
      tip:'Glass breaks with one hit — convert a whole wall, then finish it off.',
      conf:{cols:['#f06','#f80','#ff0','#0f6','#08f','#80f','#f0f'],sh:['sparkle','star','crystal'],sz:[5,13],burst:130,spin:true}},
    { id:'nightmare', name:'Nightmare Booha', jpName:'ナイトメアブーハー',
      img:'./assets/images/nightmare_booha.png',
      sfx:'./assets/audio/boo-nightmare.mp3', stock:1, power:'nightmare',
      desc:'Teleports behind the target!',
      jp:'ブロックのうしろにテレポートします。',
      tip:'Works best when blocks are clustered — it warps to the nearest surviving block.',
      conf:{cols:['#508','#80c','#b0f','#d4f','#304','#f0f'],sh:['shard','star','sparkle'],sz:[4,13],burst:88,spin:true}},
    { id:'monster', name:'Monster Booha', jpName:'モンスターブーハー',
      img:'./assets/images/monster_booha.png',
      sfx:'./assets/audio/boo-monster.mp3', stock:1, power:'monster',
      desc:'Grows with every bounce. HUGE settle.',
      jp:'はねるたびに大きくなります。',
      tip:'Let it bounce off the floor a few times before it hits the blocks.',
      conf:{cols:['#0c4','#4f8','#cf0','#0f6','#3a0','#8f0'],sh:['chunk','circle','sparkle'],sz:[6,16],burst:95,spin:false}},
    { id:'ultimate', name:'Ultimate Booha', jpName:'アルティメットブーハー',
      img:'./assets/images/ultimate_booha.png',
      sfx:'./assets/audio/boo-ultimate.mp3', stock:1, power:'ultimate',
      desc:'On settle — EVERYTHING in range explodes!',
      jp:'ばくはつして、まわりをすべてこわします。',
      tip:'Land it dead-center in the structure for maximum blast radius.',
      conf:{cols:['#f08','#f80','#ff0','#0fa','#08f','#c0f','#f48','#4fc'],sh:['star','heart','crystal','sparkle','flame'],sz:[5,16],burst:170,spin:true}},
  ];

  const SX=14, SY=70, SW=52, SH=52, SGAP=5;
  const bst = {
    sel: 0,
    stocks: ROSTER.map(b => b.stock),
    imgs: new Array(ROSTER.length).fill(null),
    totalShots() { return ROSTER.reduce((a,b) => a + b.stock, 0); }
  };

  // ── Main game state ─────────────────────────────────
  const gs = {
    phase: P.TITLE,
    round: 0, roundN: 1,
    running: false,
    dragging: false, pullPlayed: false,
    lastHit: 0, flash: 0, bestShot: 0,
    pct: 0, totalBlocks: 0, brokenBlocks: 0,
    ghostsLeft: 0,
    shotLock: false,
    booha: null,
    blocks: [],
    debTimer: 0,
    cardTimer: 0,
    cardTitle: '', cardSub: '', cardAccent: '#fff',
    scale: 1, offX: 0, offY: 0,
    imgs: { bg: null },
    fireTrail: [],
    minis: [],
    frozen: new Map(),
    bounces: 0,
    isLastBooha: false,
    timeScale: 1,
    nightmareFlicker: false,
    nightmareFlickerTimer: 0,
    monsterExplodeStage: 0,
    damageConfetti: [],

    roundTransitionTimer: null,
    roundToken: 0,
  };

  function queueNextRound(fn, delay) {
    clearTimeout(gs.roundTransitionTimer);
    const token = gs.roundToken;
    gs.roundTransitionTimer = setTimeout(() => {
      if (gs.roundToken !== token) return;
      fn();
    }, delay);
  }

  const LEVELS = window.BOOHA_DESTRUCTION_LEVELS || [];
  if (!LEVELS.length) console.error('Booha: no levels');

  // ── Helpers ─────────────────────────────────────────
  const rnd   = (a=0, b=1) => a + Math.random() * (b - a);
  const clamp = (n, mn, mx) => Math.max(mn, Math.min(mx, n));
  const dist  = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const pick  = arr => arr[Math.floor(Math.random() * arr.length)];

  function offscreen(x, y, r=0) {
    return x + r < -20 || x - r > W + 20 || y + r < -20 || y - r > H + 100;
  }

  function hexRGB(hex) {
    const h = hex.replace('#','');
    return h.length === 3
      ? [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)]
      : [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  function lighten(hex,a){ const[r,g,b]=hexRGB(hex); return `rgb(${clamp((r+a*255)|0,0,255)},${clamp((g+a*255)|0,0,255)},${clamp((b+a*255)|0,0,255)})`; }
  function darken(hex,a){ return lighten(hex,-a); }

  // ── Material palette ────────────────────────────────
  const MAT = {
    wood:  {base:'#c8895a',mid:'#96532c',dark:'#5e2e10',edge:'#e8a870',spark:'#f0b870',chip:'#d49050',grain:true},
    stone: {base:'#8a939f',mid:'#626b76',dark:'#3d4450',edge:'#b0bac5',spark:'#ccd4de',chip:'#9aaab8',grain:false},
    glass: {base:'#b7ecff',mid:'#70caee',dark:'#3898bb',edge:'#e0f8ff',spark:'#e8faff',chip:'#a0d8ef',grain:false},
    soft:  {base:'#f8c0e0',mid:'#e080b8',dark:'#b04080',edge:'#ffddee',spark:'#ffd0ec',chip:'#eeaad0',grain:false},
    ice:   {base:'#d0f8ff',mid:'#80d8f8',dark:'#3898cc',edge:'#eeffff',spark:'#ccf8ff',chip:'#a0e8f8',grain:false},
    fire:  {base:'#ff9944',mid:'#cc5500',dark:'#882200',edge:'#ffbb66',spark:'#ffcc44',chip:'#ff8833',grain:false},
  };
 // ── Resist glow colours (per power) ─────────────────
  const RESIST_COLORS = {
    fire:     '#ff4400',
    ice:      '#00ccff',
    heavy:    '#ffaa00',
    rock:     '#888888',
    rainbow:  '#88ff44',
    ultimate: '#ff00ff',
  };


   
  function matFill(block) {
    if (block.frozen) return '#b8f0ff';
    const m = MAT[block.material] || MAT.wood;
    if (!block.maxHp || block.maxHp <= 1) return m.base;
    const r = clamp(block.hp / block.maxHp, 0, 1);
    return r > 0.66 ? m.base : r > 0.33 ? m.mid : m.dark;
  }

  // ── Image loader ────────────────────────────────────
  function loadImg(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const img = new Image();
      img.onload = () => res(img); img.onerror = () => res(null); img.src = src;
    });
  }
  async function preload() {
    gs.imgs.bg = await loadImg(ASSETS.bg);
    const imgs = await Promise.all(ROSTER.map(b => loadImg(b.img)));
    imgs.forEach((img, i) => { bst.imgs[i] = img; });
    await Promise.all(ROSTER.map(b => loadBuffer(b.id, b.sfx)));
  }

  // ── Audio helpers ────────────────────────────────────
  function sndPull()   { if (gs.pullPlayed) return; gs.pullPlayed = true; playSFX(AUDIO.pull, 0.5, 0.98+rnd()*0.06); }
  function sndLaunch() {
    playSFX(AUDIO.launch, 0.88, 0.98+rnd()*0.06);
    const r = ROSTER[bst.sel];
    if (r) setTimeout(() => playBuffer(r.id, 0.85), 55);
  }
  function sndHit(mat, spd) {
    const now = performance.now(); if (now - gs.lastHit < HIT_COOL) return;
    gs.lastHit = now;
    const src = mat==='stone'?AUDIO.stone : mat==='glass'?AUDIO.glass : mat==='soft'?AUDIO.soft : AUDIO.wood;
    const volMult = gs.booha?.power === 'monster' ? Math.min(2, 1 + gs.bounces * 0.15) : 1;
    playSFX(src, Math.max(0.2, Math.min(1, spd/14)) * volMult, 0.92+rnd()*0.18);
    gs.flash = 1;
  }
  function sndBreak() { playSFX(AUDIO.break, 0.95, 0.94+rnd()*0.08); }
  function sndRub()   { playSFX(AUDIO.rubble, 0.55, 0.98+rnd()*0.08); setTimeout(() => playSFX(AUDIO.rubble, 0.28, 1.07), 130); }
  function sndGnd(s)  { if (s < 12) return; playSFX(AUDIO.ground, Math.min(0.9, s/22), 0.96+rnd()*0.08); }
  function sndWin()   { playSFX(AUDIO.win,  1, 1); }
  function sndFail()  { playSFX(AUDIO.fail, 0.85, 1); }

  // ── FX Spawners ──────────────────────────────────────
  function spawnSparks(x, y, mat, spd, n=8) {
    const m = MAT[mat] || MAT.wood;
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI*2), mag = rnd(1.5, Math.min(12, spd*0.7)), chip = mat!=='glass' && rnd()<0.4;
      pushCapped(sparks, CAP.sparks, {x, y, vx:Math.cos(a)*mag, vy:Math.sin(a)*mag-rnd(0,3),
        life:1, r:chip?rnd(2.5,5):rnd(1,2.5), col:rnd()<0.5?m.spark:m.chip,
        type:chip?'chip':'dot', grav:chip?0.28:0.12, rot:rnd(0,Math.PI*2), rotV:rnd(-0.2,0.2)});
    }
  }
  function spawnGlass(x, y, w, h) {
    for (let i = 0, n = 10+~~rnd(0,8); i < n; i++) {
      const a = rnd(0,Math.PI*2), mag = rnd(3,14);
      pushCapped(sparks, CAP.sparks, {x:x+rnd(-w*0.4,w*0.4), y:y+rnd(-h*0.4,h*0.4),
        vx:Math.cos(a)*mag, vy:Math.sin(a)*mag-rnd(1,5),
        life:1, r:rnd(4,12), col:'#b7ecff', type:'shard', grav:0.32,
        rot:rnd(0,Math.PI*2), rotV:rnd(-0.35,0.35), alpha:0.85});
    }
  }
  function spawnIce(x, y, w, h) {
    for (let i = 0; i < 14; i++) {
      const a = rnd(0,Math.PI*2), mag = rnd(2,9);
      pushCapped(sparks, CAP.sparks, {x:x+rnd(-w*0.3,w*0.3), y:y+rnd(-h*0.3,h*0.3),
        vx:Math.cos(a)*mag, vy:Math.sin(a)*mag-rnd(0,4),
        life:1, r:rnd(3,10), col:pick(['#aaeeff','#ddf8ff','#88ddff','#ffffff']), type:'shard', grav:0.25,
        rot:rnd(0,Math.PI*2), rotV:rnd(-0.3,0.3), alpha:0.9});
    }
  }
  function spawnDust(x, y)          { pushCapped(dusts, CAP.dusts, {x, y, r:4, maxR:rnd(28,48), life:1}); }
  function spawnWave(x, y, col, maxR=60) { pushCapped(waves, CAP.waves, {x, y, r:4, maxR, life:1, col}); }
  function spawnScorch(x, y) {
    pushCapped(scorchMarks, CAP.scorchMarks, {x, y, r:rnd(12,22), life:1, decay:0.005});
  }
  function addShake(v) { shake.v = Math.max(shake.v, v); }
  function spawnRingCrack(x, y) {
    pushCapped(waves, CAP.waves, {x, y, r:2, maxR:55, life:1, col:'#ffffff', thick:3});
    pushCapped(waves, CAP.waves, {x, y, r:4, maxR:38, life:1, col:'#aaeeff', thick:2});
  }

  function spawnEmber(x, y) {
    pushCapped(sparks, CAP.sparks, {x, y, vx:rnd(-1.5,1.5), vy:rnd(-2.5,-0.5), life:1, r:rnd(2,5),
      col:pick(['#ff6600','#ff9900','#ffcc00','#ff3300']), type:'dot', grav:0.05+rnd()*0.04,
      rot:0, rotV:0, decay:rnd(0.025,0.05)});
  }
  function spawnRainbow(x, y) {
    const hue = (performance.now()*0.3) % 360;
    pushCapped(sparks, CAP.sparks, {x, y, vx:rnd(-0.3,0.3), vy:rnd(-0.2,0.1), life:1, r:rnd(4,9),
      col:`hsl(${hue},100%,70%)`, type:'dot', grav:0.02, rot:0, rotV:0, decay:rnd(0.012,0.022)});
  }
  function spawnTeleport(x, y) {
    for (let i = 0; i < 30; i++) {
      const a = rnd(0,Math.PI*2), mag = rnd(5,22);
      pushCapped(sparks, CAP.sparks, {x, y, vx:Math.cos(a)*mag, vy:Math.sin(a)*mag, life:1,
        r:rnd(3,9), col:pick(['#550088','#bb00ff','#ff00ff','#220033']), type:'dot', grav:0.15, rot:0, rotV:0});
    }
    pushCapped(waves, CAP.waves, {x, y, r:10, maxR:100, life:1, col:'#bb00ff'});
    addShake(8);
  }

// ── CLANG labels ─────────────────────────────────────
  const clangLabels = [];

  function spawnClangLabel(x, y) {
    clangLabels.push({
      x, y: y - 20,
      vy: -1.2,
      life: 1,
      text: pick(['CLANG!', 'NOPE!', 'IMMUNE!']),
    });
  }

  function updateClangLabels() {
    for (let i = clangLabels.length - 1; i >= 0; i--) {
      const c = clangLabels[i];
      c.y += c.vy;
      c.vy *= 0.92;
      c.life -= 0.028;
      if (c.life <= 0) clangLabels.splice(i, 1);
    }
  }

  function drawClangLabels() {
    for (const c of clangLabels) {
      ctx.save();
      ctx.globalAlpha = clamp(c.life, 0, 1);
      ctx.font = 'bold 18px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 4;
      ctx.strokeText(c.text, c.x, c.y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(c.text, c.x, c.y);
      ctx.restore();
    }
  }



   
  function spawnDetonation(x, y) {
    for (let i = 0; i < 80; i++) {
      const a = rnd(0,Math.PI*2), mag = rnd(8,32);
      pushCapped(sparks, CAP.sparks, {x, y, vx:Math.cos(a)*mag, vy:Math.sin(a)*mag-rnd(0,5), life:1,
        r:rnd(4,14), col:pick(['#ff0088','#ff8800','#ffff00','#00ffaa','#0088ff','#cc00ff']),
        type:'dot', grav:0.2, rot:rnd(0,Math.PI*2), rotV:rnd(-0.3,0.3)});
    }
    [60,90,130].forEach(maxR => pushCapped(waves, CAP.waves, {x, y, r:4, maxR, life:1, col:'#ffffff'}));
    addShake(16);
  }
  function spawnChipTrail(x, y, vx, vy) {
    const ang = Math.atan2(-vy, -vx);
    for (let i = 0; i < 2; i++) {
      const spread = rnd(-0.8, 0.8);
      pushCapped(sparks, CAP.sparks, {x, y,
        vx:Math.cos(ang+spread)*rnd(2,7), vy:Math.sin(ang+spread)*rnd(2,7),
        life:1, r:rnd(1.5,4), col:pick(['#9ab','#cde','#678','#aaa']),
        type:'chip', grav:0.3, rot:rnd(0,Math.PI*2), rotV:rnd(-0.3,0.3), decay:rnd(0.04,0.07)});
    }
  }
  function spawnHeavyDust(x, y) {
    pushCapped(dusts, CAP.dusts, {x:x+rnd(-8,8), y, r:rnd(3,7), maxR:rnd(12,20), life:0.7, falling:true, vy:rnd(1,3)});
  }
  function spawnIceVapor(x, y) {
    pushCapped(sparks, CAP.sparks, {x, y:y+rnd(-4,4), vx:rnd(-1,1), vy:rnd(-1.5,-0.2),
      life:0.6, r:rnd(4,9), col:pick(['#d0f8ff','#aaeeff','#ffffff']),
      type:'dot', grav:-0.02, rot:0, rotV:0, decay:rnd(0.025,0.05), alpha:0.5});
  }
  function spawnGhostTrail(x, y, ri) {
    pushCapped(sparks, CAP.sparks, {x, y, vx:0, vy:0, life:0.55, r:B_RADIUS*1.4,
      col:'#9900ff', type:'ghost', grav:0, rot:0, rotV:0, decay:rnd(0.04,0.07), ri});
  }

  // ── v4: Trait / resist helpers ───────────────────────
  function hasTrait(block, trait) {
    return Array.isArray(block.traits) && block.traits.includes(trait);
  }

  function getResist(block, power) {
    return block.resist && typeof block.resist[power] === 'number'
      ? block.resist[power]
      : 1;
  }

  // Returns true if the hit/effect should be fully blocked.
  // mode: 'hit' | 'burn' | 'freeze' | 'convert'
  function powerBlocked(block, power, mode='hit') {
    if (!block) return false;
    if (mode === 'burn'    && hasTrait(block, 'burnimmune'))    return true;
    if (mode === 'freeze'  && hasTrait(block, 'freezeimmune')) return true;
    if (mode === 'convert' && hasTrait(block, 'convertimmune')) return true;

    if (mode === 'hit') {
      if (power === 'fire'      && hasTrait(block, 'fireproof'))     return true;
      if (power === 'ultimate'  && hasTrait(block, 'ultimateproof')) return true;
      if (power === 'ice'       && hasTrait(block, 'iceproof'))      return true;
      if (power === 'heavy'     && hasTrait(block, 'heavyproof'))    return true;
      if (power === 'rock'      && hasTrait(block, 'rockproof'))     return true;
      if (power === 'rainbow'   && hasTrait(block, 'rainbowproof'))  return true;
    }
    return false;
  }

  // Returns a colour to tint the block border based on its dominant trait.
  // Used by drawBlocks() for visual teaching.
function traitGlowColor(block) {
    if (!block.traits || !block.traits.length) {
      // Resist-only blocks: pick color based on strongest resist key
      if (block.resist) {
        const keys = Object.keys(block.resist);
        if (!keys.length) return null;
        // Lowest value = strongest resistance
        const dominant = keys.reduce((a, b) => block.resist[a] <= block.resist[b] ? a : b);
        return RESIST_COLORS[dominant] || '#dddddd';
      }
      return null;
    }
    if (hasTrait(block, 'ultimateproof')) return '#ff00ff';
    if (hasTrait(block, 'fireproof'))     return '#ff4400';
    if (hasTrait(block, 'iceproof'))      return '#00ccff';
    if (hasTrait(block, 'heavyproof'))    return '#ffaa00';
    if (hasTrait(block, 'rockproof'))     return '#888888';
    if (hasTrait(block, 'rainbowproof'))  return '#88ff44';
    if (hasTrait(block, 'burnimmune'))    return '#ff6600';
    if (hasTrait(block, 'freezeimmune'))  return '#aaddff';
    if (hasTrait(block, 'convertimmune')) return '#ccff88';
    // Has traits but none matched above — fall back to resist dominant
    if (block.resist) {
      const keys = Object.keys(block.resist);
      if (keys.length) {
        const dominant = keys.reduce((a, b) => block.resist[a] <= block.resist[b] ? a : b);
        return RESIST_COLORS[dominant] || '#dddddd';
      }
    }
    return '#dddddd';
  }
  // ── Death explosions ─────────────────────────────────
  function triggerDeathExplosion(b) {
    const x = b.x, y = b.y, power = b.power, ri = b.ri;
    const isLast  = gs.isLastBooha;
    const scale   = (isLast ? 1.6 : 1) * BURST_SCALE;
    const token   = gs.roundToken;

    switch (power) {
      case 'heavy': {
        addShake(10 * scale);
        for (let i = 0; i < ~~(55 * scale); i++) {
          const ang = rnd(-Math.PI, 0), mag = rnd(3,15);
          pushCapped(confetti, CAP.confetti, {
            x:x+rnd(-20,20), y, vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag-rnd(2,8),
            life:1, decay:rnd(0.004,0.01), r:rnd(8,18),
            col:pick(['#f60','#f90','#fc0','#f40','#5a3010','#888']),
            sh:pick(['chunk','rect']), grav:rnd(0.5,0.9), bounce:0.45, bounced:false,
            rot:rnd(0,Math.PI*2), rotV:rnd(-0.08,0.08),
            wob:0, wobS:0, wobA:0, pls:0, plsS:0,
            sticky:rnd()<0.35, dustOnLand:true,
          });
        }
        pushCapped(waves, CAP.waves, {x, y:FLOOR_Y, r:4, maxR:90*scale, life:1, col:'#cc5500'});
        spawnDust(x-30,FLOOR_Y); spawnDust(x,FLOOR_Y); spawnDust(x+30,FLOOR_Y);
        break;
      }
      case 'ice': {
        addShake(7 * scale);
        for (let i = 0; i < ~~(60 * scale); i++) {
          const ang = rnd(-Math.PI, 0), mag = rnd(4,14);
          pushCapped(confetti, CAP.confetti, {
            x:x+rnd(-12,12), y, vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag,
            life:1, decay:rnd(0.002,0.006), r:rnd(5,14),
            col:pick(['#aef','#dff','#8df','#fff','#bcf','#6df']), sh:'crystal',
            grav:0.02, gravRamp:0.005, gravDelay:60, gravDelayT:0, dropGrav:0.55,
            rot:rnd(0,Math.PI*2), rotV:rnd(-0.15,0.15),
            wob:0, wobS:0, wobA:0, pls:0, plsS:0, bounce:0.2, bounced:false,
          });
        }
        gs.flash = 1.4;
        spawnRingCrack(x, y);
        break;
      }
      case 'fire': {
        addShake(8 * scale);
        for (let i = 0; i < ~~(80 * scale); i++) {
          const ang = rnd(-Math.PI, 0), mag = rnd(5,18);
          const dmgEnabled = rnd() < 0.4;
          const dc = {
            x:x+rnd(-15,15), y, vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag-rnd(1,4),
            life:1, decay:rnd(0.006,0.015), r:rnd(3,9),
            col:pick(['#f22','#f70','#fa0','#fe0','#f50']), sh:'flame',
            grav:rnd(0.04,0.1), rot:rnd(0,Math.PI*2), rotV:rnd(-0.3,0.3),
            wob:rnd(0,Math.PI*2), wobS:rnd(0.08,0.16), wobA:rnd(1,3),
            pls:rnd(0,Math.PI*2), plsS:rnd(0.15,0.25),
            bounce:0.3, bounced:false, hitOnce:false, power:'fire',
          };
          if (dmgEnabled) pushCapped(gs.damageConfetti, CAP.damageConfetti, dc);
          else            pushCapped(confetti, CAP.confetti, dc);
        }
        spawnScorch(x, y);
        pushCapped(waves, CAP.waves, {x, y, r:4, maxR:75*scale, life:1, col:'#ff6600'});
        break;
      }
      case 'princess': {
        addShake(4 * scale);
        for (let i = 0; i < ~~(70 * scale); i++) {
          const spread = rnd(-0.9,0.9), floatSpd = rnd(2.5,8);
          pushCapped(confetti, CAP.confetti, {
            x:x+rnd(-25,25), y, vx:spread*rnd(1,4), vy:-floatSpd,
            life:1, decay:rnd(0.008,0.016), r:rnd(5,12),
            col:pick(['#f8c','#fae','#c4a','#fde','#fff','#fbd','#ff88aa']), sh:'heart',
            grav:-0.04, gravRamp:0,
            rot:rnd(0,Math.PI*2), rotV:rnd(-0.12,0.12),
            wob:rnd(0,Math.PI*2), wobS:rnd(0.05,0.1), wobA:rnd(1,2.5),
            pls:rnd(0,Math.PI*2), plsS:rnd(0.12,0.22),
            popAt:rnd(0.4,0.75), popped:false,
          });
        }
        pushCapped(waves, CAP.waves, {x, y, r:4, maxR:55*scale, life:1, col:'#ff88cc'});
        break;
      }
      case 'rainbow': {
        addShake(7 * scale);
        const hues = [0, 30, 60, 120, 200, 270, 320];
        hues.forEach((h, i) => {
          setTimeout(() => {
            if (gs.roundToken !== token) return;
            pushCapped(waves, CAP.waves, {x, y, r:4, maxR:(80+i*12)*scale, life:1, col:`hsl(${h},100%,65%)`, thick:5-i*0.5});
          }, i * 18);
        });
        setTimeout(() => {
          if (gs.roundToken !== token) return;
          const cnt = ~~(90 * scale);
          for (let i = 0; i < cnt; i++) {
            const ang = rnd(-Math.PI, 0), mag = rnd(6,16), hue = rnd(0,360);
            const dc = {
              x:x+rnd(-18,18), y, vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag-rnd(2,6),
              life:1, decay:rnd(0.007,0.016), r:rnd(4,11),
              col:`hsl(${hue},100%,65%)`, sh:pick(['sparkle','star','crystal']),
              grav:rnd(0.12,0.22), rot:rnd(0,Math.PI*2), rotV:rnd(-0.2,0.2),
              wob:rnd(0,Math.PI*2), wobS:rnd(0.06,0.14), wobA:rnd(0.5,2.5),
              pls:rnd(0,Math.PI*2), plsS:rnd(0.12,0.22),
              damaging:rnd()<0.25, hitOnce:false, bounce:0.25, bounced:false,
            };
            if (dc.damaging) pushCapped(gs.damageConfetti, CAP.damageConfetti, dc);
            else             pushCapped(confetti, CAP.confetti, dc);
          }
        }, 130);
        break;
      }
      case 'nightmare': {
        gs.nightmareFlicker = true;
        gs.nightmareFlickerTimer = 45;
        setTimeout(() => {
          if (gs.roundToken !== token) return;
          gs.nightmareFlicker = false;
          gs.flash = 1.8;
          addShake(9 * scale);
          const bx = gs.blocks.filter(bl => !bl.broken).map(bl => bl.x);
          const spawnX = bx.length ? Math.max(...bx) + 40 : W * 0.75;
          const spawnY = FLOOR_Y - 80;
          for (let i = 0; i < ~~(70 * scale); i++) {
            const ang = rnd(-Math.PI*0.9, -Math.PI*0.1), mag = rnd(5,18);
            pushCapped(confetti, CAP.confetti, {
              x:spawnX+rnd(-20,20), y:spawnY,
              vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag,
              life:1, decay:rnd(0.007,0.016), r:rnd(4,12),
              col:pick(['#508','#80c','#b0f','#d4f','#304','#f0f','#fff']),
              sh:pick(['shard','star','sparkle']), grav:rnd(0.14,0.28),
              rot:rnd(0,Math.PI*2), rotV:rnd(-0.2,0.2),
              wob:rnd(0,Math.PI*2), wobS:rnd(0.06,0.14), wobA:rnd(0.5,2.5),
              pls:rnd(0,Math.PI*2), plsS:rnd(0.12,0.22),
              bounce:0.25, bounced:false,
            });
          }
          spawnTeleport(spawnX, spawnY);
          celebPops(300);
        }, 480);
        return;
      }
      case 'monster': {
        const stages = [
          {delay:0,   count:20, magMax:10, rMax:8,  shakeV:5},
          {delay:180, count:35, magMax:18, rMax:13, shakeV:9},
          {delay:380, count:~~(60*scale), magMax:28, rMax:20, shakeV:14},
        ];
        stages.forEach(({delay, count, magMax, rMax, shakeV}) => {
          setTimeout(() => {
            if (gs.roundToken !== token) return;
            addShake(shakeV);
            for (let i = 0; i < count; i++) {
              const ang = rnd(-Math.PI,0), mag = rnd(3, magMax);
              pushCapped(confetti, CAP.confetti, {
                x:x+rnd(-20,20), y,
                vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag-rnd(1,5),
                life:1, decay:rnd(0.006,0.014), r:rnd(4, rMax),
                col:pick(['#0c4','#4f8','#cf0','#0f6','#3a0','#8f0','#44ff88']),
                sh:pick(['chunk','circle','sparkle']), grav:rnd(0.18,0.32),
                rot:rnd(0,Math.PI*2), rotV:rnd(-0.2,0.2),
                wob:rnd(0,Math.PI*2), wobS:rnd(0.06,0.14), wobA:rnd(0.5,2.5),
                pls:rnd(0,Math.PI*2), plsS:rnd(0.12,0.22),
                bounce:0.35, bounced:false,
              });
            }
            pushCapped(waves, CAP.waves, {x, y, r:4, maxR:(50+count)*scale, life:1, col:'#44ff88'});
            synthPop(200+delay*0.5, 0.3, 0.12);
          }, delay);
        });
        break;
      }
      case 'ultimate': {
        addShake(18 * scale);
         
        gs.blocks.forEach((block, idx) => {
        if (block.broken) return;
        if (dist(x, y, block.x, block.y) > 220) return;
        if (powerBlocked(block, 'ultimate', 'hit')) return;
        if (block.hp >= block.maxHp && !block.falling) return;
           
          const m = MAT[block.material] || MAT.wood;
          const cnt = ~~(rnd(8,18));
          for (let i = 0; i < cnt; i++) {
            const ang = rnd(0, Math.PI*2), mag = rnd(4,16);
            const dc = {
              x:block.x+rnd(-block.w*0.5,block.w*0.5),
              y:block.y+rnd(-block.h*0.5,block.h*0.5),
              vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag-rnd(1,6),
              life:1, decay:rnd(0.006,0.014), r:rnd(4,12),
              col:pick([m.base,m.mid,m.spark,m.chip]),
              sh:pick(['chunk','shard','rect','sparkle']), grav:rnd(0.15,0.3),
              rot:rnd(0,Math.PI*2), rotV:rnd(-0.25,0.25),
              wob:rnd(0,Math.PI*2), wobS:rnd(0.06,0.14), wobA:rnd(0.5,2),
              pls:rnd(0,Math.PI*2), plsS:rnd(0.12,0.22),
              damaging:true, hitOnce:false, bounce:0.28, bounced:false, power:'ultimate',
            };
            pushCapped(gs.damageConfetti, CAP.damageConfetti, dc);
          }
          damageBlock(block, block.hp, block.x, block.y, 20, idx, false, 'ultimate');
        });
        gs.pct = (gs.brokenBlocks / gs.totalBlocks) * 100;
        const cnt2 = ~~(130 * scale);
        for (let i = 0; i < cnt2; i++) {
          const ang = rnd(-Math.PI,0), mag = rnd(8,26);
          pushCapped(confetti, CAP.confetti, {
            x:x+rnd(-30,30), y, vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag-rnd(2,8),
            life:1, decay:rnd(0.005,0.013), r:rnd(5,16),
            col:pick(['#f08','#f80','#ff0','#0fa','#08f','#c0f','#f48','#4fc','#fff']),
            sh:pick(['star','heart','crystal','sparkle','flame']), grav:rnd(0.14,0.26),
            rot:rnd(0,Math.PI*2), rotV:rnd(-0.25,0.25),
            wob:rnd(0,Math.PI*2), wobS:rnd(0.06,0.14), wobA:rnd(0.5,2.5),
            pls:rnd(0,Math.PI*2), plsS:rnd(0.12,0.22),
            bounce:0.3, bounced:false,
          });
        }
        spawnDetonation(x, y);
        celebPops(700);
        break;
      }
      default: {
        const r2 = ROSTER[ri], cfg = r2.conf;
        const cnt = ~~(cfg.burst * scale);
        for (let i = 0; i < cnt; i++) {
          const ang = rnd(-Math.PI,0), mag = rnd(4,16);
          pushCapped(confetti, CAP.confetti, {
            x:x+rnd(-20,20), y, vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag-rnd(2,7),
            life:1, decay:rnd(0.008,0.018), r:rnd(cfg.sz[0], cfg.sz[1]),
            col:pick(cfg.cols), sh:pick(cfg.sh), grav:rnd(0.14,0.28),
            rot:rnd(0,Math.PI*2), rotV:cfg.spin?rnd(-0.2,0.2):0,
            wob:rnd(0,Math.PI*2), wobS:rnd(0.06,0.14), wobA:rnd(0.5,2.5),
            pls:rnd(0,Math.PI*2), plsS:rnd(0.12,0.22),
            bounce:rnd(0.2,0.45), bounced:false,
          });
        }
        addShake(6 * scale);
      }
    }
    if (power !== 'nightmare' && power !== 'monster') {
      celebPops(power==='princess'?500 : power==='ultimate'?700 : 420);
    }
  }

  // ── Pre-explosion tell ───────────────────────────────
  function initTell(b) {
    b.tell = {phase:'squash', t:0, maxT:8};
    b.tellScaleX = 1; b.tellScaleY = 1; b.tellGlow = 0;
    addShake(2.5);
  }
  function updateTell(b) {
    if (!b.tell) return false;
    const tell = b.tell;
    tell.t++;
    if (tell.phase === 'squash') {
      const p = tell.t / tell.maxT;
      b.tellScaleX = 1 + Math.sin(p*Math.PI)*0.28;
      b.tellScaleY = 1 - Math.sin(p*Math.PI)*0.18;
      b.tellGlow   = Math.sin(p*Math.PI)*0.7;
      if (tell.t >= tell.maxT) { tell.phase='pause'; tell.t=0; tell.maxT=12; addShake(3.5); }
    } else if (tell.phase === 'pause') {
      b.tellScaleX = 1.15; b.tellScaleY = 0.88;
      b.tellGlow = 0.9 + rnd()*0.1;
      gs.flash = Math.max(gs.flash, 0.4);
      if (tell.t >= tell.maxT) {
        tell.phase = 'done'; b.tell = null;
        b.tellScaleX = 1; b.tellScaleY = 1; b.tellGlow = 0;
        return true;
      }
    }
    return false;
  }

  // ── Block x-range index ──────────────────────────────
  let blockXIndex = [];
  let blockIndexDirty = false;
  function markIndexDirty() { blockIndexDirty = true; }
  function buildBlockIndex() {
    blockXIndex = gs.blocks
      .map((b, i) => ({x:b.x, halfW:b.w*0.55, idx:i}))
      .sort((a,b) => a.x - b.x);
    blockIndexDirty = false;
  }
  function flushBlockIndex() {
    if (blockIndexDirty) buildBlockIndex();
  }

  // ── Structural collapse ──────────────────────────────
  function isBlockSupported(block, idx) {
    if (block.y + block.h / 2 >= FLOOR_Y - FLOOR_THRESHOLD) return true;
    const myLeft   = block.x - block.w / 2;
    const myRight  = block.x + block.w / 2;
    const myBottom = block.y + block.h / 2;
    for (let i = 0; i < gs.blocks.length; i++) {
      if (i === idx) continue;
      const other = gs.blocks[i];
      if (other.broken || other.falling) continue;
      const otherTop = other.y - other.h / 2;
      if (Math.abs(otherTop - myBottom) > 16) continue;
      const oLeft  = other.x - other.w / 2;
      const oRight = other.x + other.w / 2;
      const overlapLeft  = Math.max(myLeft,  oLeft);
      const overlapRight = Math.min(myRight, oRight);
      const overlap = overlapRight - overlapLeft;
      const minWidth = Math.min(block.w, other.w);
      if (overlap >= minWidth * SUPPORT_OVERLAP) return true;
    }
    return false;
  }

  function checkSupport() {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < gs.blocks.length; i++) {
        const block = gs.blocks[i];
        if (block.broken || block.falling) continue;
        if (!isBlockSupported(block, i)) {
          block.falling = true;
          block.vy = block.vy || 0;
          changed = true;
          spawnDust(block.x, block.y + block.h / 2);
          addShake(1.5);
        }
      }
    }
  }

  // ── Confetti update ──────────────────────────────────
  function updateConfetti() {
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      if (c.gravDelay !== undefined) {
        c.gravDelayT = (c.gravDelayT || 0) + 1;
        if (c.gravDelayT > (c.gravDelay || 60))
          c.grav = Math.min(c.dropGrav || 0.55, c.grav + (c.gravRamp || 0.008));
      }
      c.vy += c.grav; c.wob += (c.wobS||0); c.pls += (c.plsS||0);
      c.x += c.vx + Math.sin(c.wob)*(c.wobA||0); c.y += c.vy;
      c.vx *= 0.987; c.rot += (c.rotV||0);
      if (c.y + c.r > FLOOR_Y) {
        if (!c.bounced) {
          c.bounced = true; c.vy *= -(c.bounce||0.25); c.vx *= 0.72; c.y = FLOOR_Y - c.r;
          if (c.dustOnLand) spawnDust(c.x, FLOOR_Y);
          if (c.sticky) { c.vx=0; c.vy=0; c.grav=0; }
        } else { c.vy *= -0.18; c.vx *= 0.8; c.y = FLOOR_Y-c.r; c.life -= 0.04; }
      }
      if (c.sh==='heart' && !c.popped && c.life < (c.popAt||0.55)) {
        c.popped = true;
        for (let j = 0; j < 6; j++) {
          const ang=rnd(0,Math.PI*2), mag=rnd(2,7);
          pushCapped(confetti, CAP.confetti, {
            x:c.x, y:c.y, vx:Math.cos(ang)*mag, vy:Math.sin(ang)*mag,
            life:0.7, decay:rnd(0.025,0.045), r:rnd(2,5),
            col:pick(['#f8c','#fae','#fbd','#fff','#ff88aa']),
            sh:'sparkle', grav:0.08, rot:rnd(0,Math.PI*2), rotV:rnd(-0.3,0.3),
            wob:0, wobS:0, wobA:0, pls:0, plsS:0, bounce:0.3, bounced:false,
          });
        }
        synthPop(600+rnd()*200, 0.12, 0.06);
      }
      c.life -= (c.decay||0.014);
      if (c.y > H+200) c.life = 0;
      if (c.life <= 0) confetti.splice(i, 1);
    }

    for (let i = gs.damageConfetti.length - 1; i >= 0; i--) {
      const c = gs.damageConfetti[i];
      if (c.gravDelay !== undefined) {
        c.gravDelayT = (c.gravDelayT||0) + 1;
        if (c.gravDelayT > (c.gravDelay||60))
          c.grav = Math.min(c.dropGrav||0.55, c.grav + (c.gravRamp||0.008));
      }
      c.vy += c.grav; c.wob += (c.wobS||0); c.pls += (c.plsS||0);
      c.x += c.vx + Math.sin(c.wob)*(c.wobA||0); c.y += c.vy;
      c.vx *= 0.987; c.rot += (c.rotV||0);
      if (c.y + c.r > FLOOR_Y) {
        if (!c.bounced) {
          c.bounced = true; c.vy *= -(c.bounce||0.25); c.vx *= 0.72; c.y = FLOOR_Y-c.r;
        } else { c.vy *= -0.15; c.y = FLOOR_Y-c.r; c.life -= 0.05; }
      }

      if (!c.hitOnce) {
        const cx = c.x, cr = c.r;
        let lo = 0, hi = blockXIndex.length;
        while (lo < hi) { const m = (lo+hi)>>1; if (blockXIndex[m].x + blockXIndex[m].halfW < cx - cr) lo=m+1; else hi=m; }
        for (let j = lo; j < blockXIndex.length; j++) {
          const entry = blockXIndex[j];
          if (entry.x - entry.halfW > cx + cr) break;
          const block = gs.blocks[entry.idx];
          if (!block || block.broken) continue;
          if (dist(cx, c.y, block.x, block.y) < entry.halfW + cr) {
            damageBlock(block, 1, cx, c.y, 5, entry.idx, false, c.power || null);
            c.hitOnce = true;
            break;
          }
        }
      }

      c.life -= (c.decay||0.014);
      if (c.life <= 0) gs.damageConfetti.splice(i, 1);
    }
  }

  function drawConfetti() {
    for (const c of confetti) {
      if (offscreen(c.x, c.y, c.r)) continue;
      ctx.save();
      ctx.globalAlpha = clamp(c.life, 0, 1) * (c.alpha||1);
      ctx.fillStyle = c.col;
      ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      drawConfettiShape(c);
      ctx.restore();
    }
    for (const c of gs.damageConfetti) {
      if (offscreen(c.x, c.y, c.r)) continue;
      ctx.save();
      ctx.globalAlpha = clamp(c.life, 0, 1) * (c.alpha||1);
      ctx.fillStyle = c.col;
      ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      drawConfettiShape(c);
      ctx.restore();
    }
  }

  function drawConfettiShape(c) {
    switch(c.sh){
      case 'circle':  ctx.beginPath();ctx.ellipse(0,0,c.r,c.r*0.5,0,0,Math.PI*2);ctx.fill();break;
      case 'rect':    ctx.fillRect(-c.r*0.55,-c.r*0.35,c.r*1.1,c.r*0.7);break;
      case 'star': {
        ctx.beginPath();
        for(let s=0;s<10;s++){const R=s%2?c.r*0.42:c.r,a=s*Math.PI/5-Math.PI/2;s?ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R):ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R);}
        ctx.closePath();ctx.fill();break;}
      case 'sparkle':{
        const pf=0.38+0.28*Math.sin(c.pls||0),r2=c.r*pf;
        ctx.beginPath();ctx.moveTo(0,-c.r);ctx.lineTo(r2*0.25,-r2*0.25);ctx.lineTo(c.r,0);ctx.lineTo(r2*0.25,r2*0.25);ctx.lineTo(0,c.r);ctx.lineTo(-r2*0.25,r2*0.25);ctx.lineTo(-c.r,0);ctx.lineTo(-r2*0.25,-r2*0.25);ctx.closePath();ctx.fill();break;}
      case 'heart':{
        ctx.beginPath();ctx.moveTo(0,c.r*0.35);ctx.bezierCurveTo(-c.r,-c.r*0.1,-c.r,-c.r*0.9,0,-c.r*0.5);ctx.bezierCurveTo(c.r,-c.r*0.9,c.r,-c.r*0.1,0,c.r*0.35);ctx.closePath();ctx.fill();break;}
      case 'shard':   {ctx.beginPath();ctx.moveTo(0,-c.r);ctx.lineTo(c.r*0.55,c.r*0.5);ctx.lineTo(-c.r*0.55,c.r*0.35);ctx.closePath();ctx.fill();break;}
      case 'crystal': {ctx.beginPath();ctx.moveTo(0,-c.r);ctx.lineTo(c.r*0.4,0);ctx.lineTo(0,c.r);ctx.lineTo(-c.r*0.4,0);ctx.closePath();ctx.fill();break;}
      case 'chunk':   {ctx.beginPath();ctx.moveTo(-c.r*0.5,-c.r*0.6);ctx.lineTo(c.r*0.6,-c.r*0.4);ctx.lineTo(c.r*0.4,c.r*0.5);ctx.lineTo(-c.r*0.6,c.r*0.3);ctx.closePath();ctx.fill();break;}
      case 'flame':   {ctx.beginPath();ctx.moveTo(0,c.r*0.5);ctx.quadraticCurveTo(c.r*0.8,0,c.r*0.3,-c.r*0.6);ctx.quadraticCurveTo(0,-c.r,-c.r*0.3,-c.r*0.6);ctx.quadraticCurveTo(-c.r*0.8,0,0,c.r*0.5);ctx.closePath();ctx.fill();break;}
      default:        ctx.beginPath();ctx.arc(0,0,c.r,0,Math.PI*2);ctx.fill();
    }
  }

  // ── Crack system ────────────────────────────────────
  const CRACKS = new Map();
  function getCracks(block, idx) {
    if (!CRACKS.has(idx)) {
      const w=block.w, h=block.h;
      const ml=(n,maxL)=>Array.from({length:n},()=>{
        const ox=rnd(-w*0.35,w*0.35),oy=rnd(-h*0.35,h*0.35),a=rnd(0,Math.PI*2),l=rnd(maxL*0.4,maxL);
        return{x1:ox,y1:oy,x2:ox+Math.cos(a)*l,y2:oy+Math.sin(a)*l,
          br:rnd()<0.4?{x:ox+Math.cos(a)*l*0.5,y:oy+Math.sin(a)*l*0.5,a:a+rnd(0.4,1.1)*(rnd()<0.5?1:-1),l:l*rnd(0.3,0.55)}:null};
      });
      CRACKS.set(idx,{minor:ml(3,Math.min(w,h)*0.35),mid:ml(5,Math.min(w,h)*0.55),heavy:ml(8,Math.min(w,h)*0.75)});
    }
    return CRACKS.get(idx);
  }
  function drawCracks(block, idx) {
    if (block.broken || block.maxHp<=1) return;
    const r = clamp(block.hp/block.maxHp, 0, 1); if (r>=1) return;
    const{minor,mid,heavy} = getCracks(block, idx);
    const lines = r<0.34?[...minor,...mid,...heavy] : r<0.67?[...minor,...mid] : minor;
    const alpha = r<0.34?0.75 : r<0.67?0.55 : 0.35;
    ctx.save(); ctx.globalAlpha=alpha; ctx.strokeStyle='rgba(0,0,0,0.65)'; ctx.lineWidth=1; ctx.lineCap='round';
    rrClip(ctx, block.x-block.w/2, block.y-block.h/2, block.w, block.h, 8);
    for (const l of lines) {
      ctx.beginPath(); ctx.moveTo(block.x+l.x1,block.y+l.y1); ctx.lineTo(block.x+l.x2,block.y+l.y2); ctx.stroke();
      if (l.br) { ctx.beginPath(); ctx.moveTo(block.x+l.br.x,block.y+l.br.y); ctx.lineTo(block.x+l.br.x+Math.cos(l.br.a)*l.br.l,block.y+l.br.y+Math.sin(l.br.a)*l.br.l); ctx.stroke(); }
    }
    ctx.restore();
  }

  // ── Atomic round management ──────────────────────────
  function resetRound() {
    sparks.length=0; waves.length=0; dusts.length=0; confetti.length=0;
    powers.length=0; scorchMarks.length=0;
    CRACKS.clear(); shake.v=0;
    gs.dragging=false; gs.pullPlayed=false; gs.bestShot=0; gs.pct=0; gs.brokenBlocks=0;
    gs.debTimer=0; gs.shotLock=false; gs.flash=0;
    gs.fireTrail=[]; gs.minis=[]; gs.frozen=new Map(); gs.bounces=0;
    gs.isLastBooha=false; gs.timeScale=1;
    gs.nightmareFlicker=false; gs.nightmareFlickerTimer=0;
    gs.damageConfetti=[];
    bst.stocks=ROSTER.map(b => b.stock);
    bst.sel=0;
    gs.ghostsLeft=bst.totalShots();
    blockIndexDirty = false;
  }

  function loadRound(idx) {
    clearTimeout(gs.roundTransitionTimer);
    gs.roundTransitionTimer = null;
    gs.roundToken++;

    resetRound();
    gs.round  = clamp(idx, 0, LEVELS.length - 1);
    gs.roundN = gs.round + 1;

    const lvl = LEVELS[gs.round];
    gs.blocks      = lvl.blocks.map((def, i) => cloneBlock(def, i));
    gs.totalBlocks = gs.blocks.length;
    buildBlockIndex();
    gs.booha   = makeBooha();
    gs.running = false;
  }

  function startRound() { gs.running=true; gs.phase=P.PLAY; }

  function showCard(phase, title, sub, accent) {
    gs.phase    = phase;
    gs.cardTitle= title; gs.cardSub=sub; gs.cardAccent=accent;
    gs.cardTimer= CARD_MS;
    gs.running  = false;
    gs.booha    = null; gs.minis=[]; gs.damageConfetti=[];
    gs.fireTrail= []; gs.frozen=new Map();
    sparks.length=0; waves.length=0; dusts.length=0;
    scorchMarks.length=0; shake.v=0;
  }

  function advanceRound() {
    const next = (gs.round + 1) % LEVELS.length;
    loadRound(next);
    startRound();
  }

  // ── Game objects ────────────────────────────────────
  function makeBooha(rosterIdx) {
    const ri = rosterIdx ?? bst.sel;
    const r  = ROSTER[ri];
    const radius = r.power==='heavy'    ? B_RADIUS*1.35
                 : r.power==='princess' ? B_RADIUS*0.78
                 : B_RADIUS;
    return {
      launched:false, x:SLING_X, y:SLING_Y, vx:0, vy:0,
      radius, baseRadius:radius,
      settledF:0, confettiFired:false, damageThisShot:0,
      ri, power:r.power,
      piercedOnce:false, spawnedMinis:false,
      trailTimer:0, lifeFrames:0, maxLifeFrames:420,
      tell:null, tellScaleX:1, tellScaleY:1, tellGlow:0,
      _teleported:false,
      impactCompress:0, impactCompressDir:0,
    };
  }

  // v4: cloneBlock reads traits and resist from level def
  function cloneBlock(def, idx) {
    const y = typeof def.floorOffset==='number' ? FLOOR_Y-def.floorOffset : def.y;
    CRACKS.delete(idx);
    return {
      x:def.x, y, w:def.w, h:def.h, material:def.material||'wood',
      hp:def.hp||1, maxHp:def.hp||1,
      broken:false,
      falling:false,
      shake:0, vy:0, fallen:false, hitFlash:0,
      frozen:false, burning:false, burnTimer:0, ringCrack:false, compressY:0,
       
      // v4: trait & resist system
      traits: Array.isArray(def.traits) ? [...def.traits] : [],
      resist: def.resist ? {...def.resist} : {},
      burnBoost: def.burnBoost === true,
      burnStacks: 0,
    };
  }

  // ── Power helpers ────────────────────────────────────
  function applyFireBurn(block) {
    if (block.broken) return;
    if (powerBlocked(block, 'fire', 'burn')) return;
    // Stack-based: first hit ignites, second hit enables damage ticks
    block.burnStacks = (block.burnStacks || 0) + 1;
    if (block.burnStacks === 1) {
      // First hit — ignite only, no damage yet
      block.burning = true;
      block.burnTimer = block.burnBoost ? 160 : 120;
      block.burnDamageEnabled = false;
    } else {
      // Second hit — enable real damage ticks
      block.burnDamageEnabled = true;
      // Refresh timer so it doesn't immediately expire
      block.burnTimer = Math.max(block.burnTimer, block.burnBoost ? 120 : 80);
    }
  }

  // v4: updateBurning checks burnimmune before ticking
  function updateBurning() {
    gs.blocks.forEach((block, idx) => {
      if (!block.burning || block.broken) return;
      if (powerBlocked(block, 'fire', 'burn')) { block.burning = false; return; }
      block.burnTimer--;
      const tickRate = block.burnBoost ? 28 : 40;
      if (block.burnTimer % tickRate === 0 && block.hp > 0) {
        // Ignited but not stacked — smoke and embers only, no damage
        if (!block.burnDamageEnabled) {
          spawnEmber(block.x + rnd(-block.w/2, block.w/2), block.y - block.h/2);
          spawnEmber(block.x + rnd(-block.w/2, block.w/2), block.y - block.h/2);
        } else {
          // Second stack — real damage ticks
          damageBlock(block, 1, block.x, block.y, 8, idx, false, 'fire');
          spawnEmber(block.x + rnd(-block.w/2, block.w/2), block.y - block.h/2);
          // Spread boost: spread fire faster to nearby blocks
          if (block.burnBoost) {
            gs.blocks.forEach(other => {
              if (!other.broken && other !== block &&
                  dist(other.x, other.y, block.x, block.y) < 70) {
                applyFireBurn(other);
              }
            });
          }
        }
      }
      if (block.burnTimer <= 0) {
        block.burning = false;
        block.burnStacks = 0;
        block.burnDamageEnabled = false;
      }
    });
  }

   
  function updateFrozen() {
    for (const [idx, frames] of gs.frozen.entries()) {
      if (frames<=0) {
        const block = gs.blocks[idx];
        gs.frozen.delete(idx);
        if (block && !block.broken) {
          block.frozen=false;
          damageBlock(block, block.hp, block.x, block.y, 18, idx, true, 'ice');
          spawnIce(block.x, block.y, block.w, block.h);
        }
      } else gs.frozen.set(idx, frames-1);
    }
  }

// ── v4: Block damage ─────────────────────────────────
  // power param (string|null): the Booha power causing this damage.
  // Checks powerBlocked() and applies resist scalar before dealing damage.
  function damageBlock(block, amount, hx, hy, spd, idx, doSFX=true, power=null) {
    if (block.broken || block.frozen) return;

    // Check full immunity first
    if (power && powerBlocked(block, power, 'hit')) {
      spawnWave(hx, hy, '#ffffff', 26);
      block.hitFlash = 0.35;
      addShake(1.5);
      return;
    }

    // Apply damage resistance (scalar 0–1 means less damage)
    const resist = power ? getResist(block, power) : 1;
    const actualAmount = amount * resist;
    if (actualAmount <= 0) return;

    block.hp -= actualAmount;
    block.shake=1; block.hitFlash=1;
    const mat=block.material, m=MAT[mat]||MAT.wood;
    spawnSparks(hx, hy, mat, spd, ~~(6+spd*0.5));
    spawnWave(hx, hy, m.spark, 35+spd*2);
    if (spd>10) addShake(Math.min(6, spd*0.4));
    if (block.hp<=0) {
      block.broken=true; gs.brokenBlocks++;
      gs.pct=(gs.brokenBlocks/gs.totalBlocks)*100;
      if (gs.booha) { gs.booha.damageThisShot=gs.pct; gs.bestShot=Math.max(gs.bestShot,gs.pct); }
      if (mat==='glass') { spawnGlass(block.x,block.y,block.w,block.h); spawnWave(block.x,block.y,'#b7ecff',70); }
      else { spawnSparks(block.x,block.y,mat,spd+4,20); spawnWave(block.x,block.y,m.spark,60); }
      if (gs.pct>50 && rnd()<0.35) {
        const nearby=gs.blocks.filter(bl=>!bl.broken&&dist(bl.x,bl.y,block.x,block.y)<120);
        nearby.slice(0,2).forEach(nb=>{spawnSparks(nb.x,nb.y,nb.material,spd*0.6,8);nb.hitFlash=0.5;});
      }
      addShake(Math.min(10, spd*0.6+4));
      if (doSFX) sndBreak();
      gs.debTimer=18;
      markIndexDirty();
      checkSupport();
    }
  }

   
 // ── v4: Block collision ─────────────────────────────
  function blockCollide(block, idx) {
    const b=gs.booha; if(!b||!b.launched||block.broken) return;
    if (b.tell) return;
    const cx=clamp(b.x,block.x-block.w/2,block.x+block.w/2);
    const cy=clamp(b.y,block.y-block.h/2,block.y+block.h/2);
    const dx=b.x-cx, dy=b.y-cy, dsq=dx*dx+dy*dy;
    if (dsq>b.radius*b.radius) return;
    const spd=Math.hypot(b.vx,b.vy);
    if (spd<MIN_IMPACT) return;
    sndHit(block.material, spd);
    const power=b.power;

    // v4: immunity checks
    const fireImmune     = powerBlocked(block, 'fire',     'hit');
    const iceImmune      = powerBlocked(block, 'ice',      'hit') || powerBlocked(block, 'ice',     'freeze');
    const rainbowImmune  = powerBlocked(block, 'rainbow',  'hit') || powerBlocked(block, 'rainbow', 'convert');
    const ultimateImmune = powerBlocked(block, 'ultimate', 'hit');
    const heavyImmune    = powerBlocked(block, 'heavy',    'hit');
    const rockImmune     = powerBlocked(block, 'rock',     'hit');

    const fullyBlocked =
      (power==='fire'      && fireImmune)     ||
      (power==='ultimate'  && ultimateImmune) ||
      (power==='heavy'     && heavyImmune)    ||
      (power==='rock'      && rockImmune)     ||
      (power==='ice'       && iceImmune)      ||
      (power==='rainbow'   && rainbowImmune);

    if (fullyBlocked) {
      spawnWave(cx, cy, '#ffffff', 32);
      spawnWave(cx, cy, traitGlowColor(block) || '#ffffff', 22);
      for (let i = 0; i < 10; i++) {
        const a = rnd(0, Math.PI*2), mag = rnd(2, 7);
        pushCapped(sparks, CAP.sparks, {
          x: cx, y: cy,
          vx: Math.cos(a)*mag, vy: Math.sin(a)*mag - rnd(1, 3),
          life: 1, r: rnd(2, 5),
          col: traitGlowColor(block) || '#ffffff',
          type: 'dot', grav: 0.18, rot: 0, rotV: 0,
          decay: rnd(0.03, 0.06)
        });
      }
      block.hitFlash = 0.6;
      addShake(2.5);
      synthPop(900 + rnd()*200, 0.18, 0.06);
      spawnClangLabel(cx, cy);
      const nx=dx===0&&dy===0?1:dx/Math.sqrt(dsq||1), ny=dx===0&&dy===0?0:dy/Math.sqrt(dsq||1);
      const dot=b.vx*nx+b.vy*ny;
      b.vx=(b.vx-2*dot*nx)*BOUNCE; b.vy=(b.vy-2*dot*ny)*BOUNCE;
      if(Math.abs(dx)>Math.abs(dy)) b.x=cx+nx*(b.radius+1); else b.y=cy+ny*(b.radius+1);
      return;
    }

     
    // Special effects — only reach here if not fully blocked
    if (power==='ice')      { spawnRingCrack(cx,cy); block.ringCrack=true; }
    if (power==='fire')     { spawnScorch(cx,cy); }
    if (power==='heavy')    { block.compressY=6; }
    if (power==='princess') { b.impactCompress=1; b.impactCompressDir=Math.atan2(dy,dx); }
    if (power==='nightmare'){ setTimeout(()=>sndHit(block.material,spd),160); }

    if (power==='ice' && !block.frozen) {
      block.frozen=true; gs.frozen.set(idx,90);
      spawnWave(cx,cy,'#aaeeff',50); spawnSparks(cx,cy,'ice',spd,10); addShake(4);
    }
    if (power==='rainbow' && block.material!=='glass') {
      block.material='glass'; block.hp=1; block.maxHp=1;
      spawnWave(cx,cy,'#ff88ff',55);
    }
    if (power==='princess' && !b.spawnedMinis) {
      b.spawnedMinis=true;
      for (let m=0;m<3;m++) {
        const ang=-Math.PI*0.5+rnd(-0.6,0.6);
        gs.minis.push({isMini:true, x:cx, y:cy, vx:Math.cos(ang)*rnd(8,14), vy:Math.sin(ang)*rnd(8,14)-rnd(3,6), radius:B_RADIUS*0.45, launched:true, life:1, ri:b.ri});
      }
    }

    // Damage
    let dmg=0;
    if      (power==='heavy')                   dmg=2;
    else if (power==='ice'||power==='rainbow')  dmg=0;
    else dmg = block.material==='stone'?(spd>11?1:0) : block.material==='glass'?1 : block.material==='soft'?(spd>5?1:0) : (spd>7?1:0);
    if (dmg>0) damageBlock(block,dmg,cx,cy,spd,idx,true,power);

    // Fire spread
    if (power==='fire') {
    gs.blocks.forEach((blk,i)=>{
    if(!blk.broken && dist(blk.x,blk.y,block.x,block.y)<80) applyFireBurn(blk);
   });
 }

    if (power==='rock'&&!b.piercedOnce) { b.piercedOnce=true; return; }
    if (power==='monster') { gs.bounces++; b.radius=Math.min(b.baseRadius*(1+gs.bounces*0.22),B_RADIUS*2.8); }

    const nx=dx===0&&dy===0?1:dx/Math.sqrt(dsq||1), ny=dx===0&&dy===0?0:dy/Math.sqrt(dsq||1);
    const dot=b.vx*nx+b.vy*ny;
    b.vx=(b.vx-2*dot*nx)*BOUNCE; b.vy=(b.vy-2*dot*ny)*BOUNCE;
    if(Math.abs(dx)>Math.abs(dy)) b.x=cx+nx*(b.radius+1); else b.y=cy+ny*(b.radius+1);
  }

  function miniCollide(mini) {
    for (let i=0;i<gs.blocks.length;i++) {
      const block=gs.blocks[i]; if(block.broken)continue;
      const cx=clamp(mini.x,block.x-block.w/2,block.x+block.w/2);
      const cy=clamp(mini.y,block.y-block.h/2,block.y+block.h/2);
      if(dist(mini.x,mini.y,cx,cy)<mini.radius){
        damageBlock(block,1,cx,cy,Math.hypot(mini.vx,mini.vy),i,true,null);
        const nx=(mini.x-cx)||1, ny=(mini.y-cy)||0, l=Math.hypot(nx,ny)||1;
        mini.vx=(mini.vx-2*(mini.vx*(nx/l)+mini.vy*(ny/l))*(nx/l))*0.65;
        mini.vy=(mini.vy-2*(mini.vx*(nx/l)+mini.vy*(ny/l))*(ny/l))*0.65;
      }
    }
  }

  // ── updateBlocks ─────────────────────────────────────
  function updateBlocks() {
    flushBlockIndex();
    let anyFallingLanded = false;

    for (let i = 0; i < gs.blocks.length; i++) {
      const block = gs.blocks[i];

      if (block.broken) {
        block.vy += GRAVITY * 0.6;
        block.y  += block.vy;
        if (!block.fallen && block.y + block.h / 2 >= FLOOR_Y) {
          block.y = FLOOR_Y - block.h / 2;
          block.fallen = true;
          const s = Math.abs(block.vy); sndGnd(s);
          if (s > 6) {
            spawnDust(block.x, FLOOR_Y);
            spawnDust(block.x + rnd(-20,20), FLOOR_Y);
            spawnSparks(block.x, FLOOR_Y, block.material, s, 6);
          }
          block.vy *= -0.18;
        }
        block.vy *= 0.985;
        if (block.compressY > 0) { block.compressY *= 0.7; if (block.compressY < 0.5) block.compressY = 0; }
        block.shake *= 0.84; block.hitFlash *= 0.88;
        continue;
      }

      if (block.falling) {
        block.vy += GRAVITY;
        block.y  += block.vy;

        if (block.y + block.h / 2 >= FLOOR_Y) {
          block.y   = FLOOR_Y - block.h / 2;
          const spd = Math.abs(block.vy);
          block.vy  = 0;
          block.falling = false;
          anyFallingLanded = true;

          sndGnd(spd);
          if (spd > 4) {
            spawnDust(block.x, FLOOR_Y);
            addShake(Math.min(5, spd * 0.25));
            spawnSparks(block.x, FLOOR_Y, block.material, spd, 5);
          }
          if (spd >= FALL_CRUSH_SPEED) {
            const crushDmg = spd >= FALL_CRUSH_SPEED * 1.8 ? 2 : 1;
            damageBlock(block, crushDmg, block.x, block.y, spd, i, true, null);
          }
        } else {
          for (let j = 0; j < gs.blocks.length; j++) {
            if (i === j) continue;
            const other = gs.blocks[j];
            if (other.broken || other.falling) continue;

            const otherTop    = other.y - other.h / 2;
            const blockBottom = block.y + block.h / 2;

            if (blockBottom >= otherTop && blockBottom <= otherTop + block.vy + 2) {
              const overlapL = Math.max(block.x - block.w/2, other.x - other.w/2);
              const overlapR = Math.min(block.x + block.w/2, other.x + other.w/2);
              if (overlapR - overlapL > block.w * SUPPORT_OVERLAP) {
                const spd = Math.abs(block.vy);
                block.y   = otherTop - block.h / 2;
                block.vy  = 0;
                block.falling = false;
                anyFallingLanded = true;

                sndGnd(spd);
                if (spd > 4) {
                  spawnDust(block.x, otherTop);
                  addShake(Math.min(4, spd * 0.2));
                }
                if (spd >= FALL_CRUSH_SPEED) {
                  const crushDmg = spd >= FALL_CRUSH_SPEED * 1.8 ? 2 : 1;
                  damageBlock(other, crushDmg, other.x, other.y, spd, j, true, null);
                }
                break;
              }
            }
          }
        }
      }

      if (block.compressY > 0) { block.compressY *= 0.7; if (block.compressY < 0.5) block.compressY = 0; }
      block.shake   *= 0.84;
      block.hitFlash *= 0.88;
    }

    if (anyFallingLanded) {
      markIndexDirty();
      checkSupport();
    }

    if (gs.debTimer > 0) { if (gs.debTimer === 18) sndRub(); gs.debTimer--; }
    updateBurning();
    updateFrozen();

    for (let i = scorchMarks.length - 1; i >= 0; i--) {
      scorchMarks[i].life -= scorchMarks[i].decay;
      if (scorchMarks[i].life <= 0) scorchMarks.splice(i, 1);
    }
  }

  function updateMinis() {
    for(let i=gs.minis.length-1;i>=0;i--){
      const m=gs.minis[i];
      m.vy+=GRAVITY; m.vx*=AIR; m.vy*=AIR; m.x+=m.vx; m.y+=m.vy;
      if(m.y+m.radius>=FLOOR_Y){m.y=FLOOR_Y-m.radius;m.vy*=-0.35;m.vx*=0.8;m.life-=0.12;}
      if(m.x<0||m.x>W)m.life-=0.2;
      miniCollide(m); m.life-=0.008;
      if(m.life<=0)gs.minis.splice(i,1);
    }
  }
  function updateNightmareFlicker() {
    if(!gs.nightmareFlicker)return;
    gs.nightmareFlickerTimer--;
    if(gs.nightmareFlickerTimer<=0)gs.nightmareFlicker=false;
  }

  // ── Update: booha ────────────────────────────────────
  function updateBooha() {
    const b=gs.booha; if(!b||!b.launched)return;
    if(b.tell){
      const fire=updateTell(b);
      if(fire){ b.confettiFired=true; triggerDeathExplosion(b); queueNextRound(()=>finishShot(), NEXT_MS); }
      return;
    }
    if(b.launched&&!b.confettiFired&&!gs.shotLock){
      b.lifeFrames++;
      if(b.lifeFrames>=b.maxLifeFrames){
        b.y=FLOOR_Y-b.radius; b.vx=0; b.vy=0;
        if(b.power==='nightmare'){
          b.confettiFired=true; triggerDeathExplosion(b);
          queueNextRound(()=>finishShot(), NEXT_MS+600);
        } else { initTell(b); }
        return;
      }
    }
    if(b.power==='nightmare'&&!b._teleported){
      b._teleported=true;
      const target=gs.blocks.find(bl=>!bl.broken);
      if(target){
        spawnTeleport(b.x,b.y);
        b.x=target.x+target.w*0.5+60; b.y=target.y;
        b.vx=-Math.abs(b.vx)*1.4-rnd()*3; b.vy=rnd(-4,2);
        spawnTeleport(b.x,b.y);
      }
    }
    const ts=gs.timeScale;
    b.vy+=GRAVITY*ts; b.vx*=Math.pow(AIR,ts); b.vy*=Math.pow(AIR,ts);
    b.x+=b.vx*ts; b.y+=b.vy*ts;
    b.trailTimer++;
    const tt=b.trailTimer;
    switch(b.power){
      case 'heavy':     if(tt%4===0)spawnHeavyDust(b.x,b.y); break;
      case 'rock':      if(tt%3===0)spawnChipTrail(b.x,b.y,b.vx,b.vy); break;
      case 'ice':       if(tt%3===0)spawnIceVapor(b.x,b.y); break;
      case 'fire':      if(rnd()<0.45)spawnEmber(b.x,b.y); break;
      case 'rainbow':   if(tt%2===0){const so=Math.sin(tt*0.18)*12;spawnRainbow(b.x,b.y+so);} break;
      case 'nightmare': if(tt%5===0)spawnGhostTrail(b.x-b.vx*3,b.y-b.vy*3,b.ri); break;
      case 'monster':   if(tt%3===0){const thk=1+gs.bounces*0.5;for(let i=0;i<thk;i++)spawnEmber(b.x+rnd(-4,4),b.y+rnd(-4,4));} break;
      case 'princess':  if(tt%4===0)pushCapped(sparks,CAP.sparks,{x:b.x+rnd(-8,8),y:b.y+rnd(-8,8),vx:rnd(-1,1),vy:rnd(-1,0.5),life:0.8,r:rnd(2,5),col:pick(['#f8c','#fae','#fff']),type:'dot',grav:0.02,rot:0,rotV:0,decay:rnd(0.025,0.045)}); break;
    }
    if(b.impactCompress>0){b.impactCompress*=0.8;if(b.impactCompress<0.05)b.impactCompress=0;}
    if(b.x-b.radius<0){b.x=b.radius;b.vx*=-BOUNCE;}
    if(b.x+b.radius>W){b.x=W-b.radius;b.vx*=-BOUNCE;}
    if(b.y+b.radius>=FLOOR_Y){
      const s=Math.abs(b.vy)*ts;
      if(s>8){sndGnd(s);spawnDust(b.x,FLOOR_Y);addShake(Math.min(4,s*0.2)*(gs.isLastBooha?1.8:1));}
      b.y=FLOOR_Y-b.radius; b.vy*=-0.38; b.vx*=0.86;
      if(b.power==='heavy'&&s>10){for(let i=0;i<20;i++)spawnSparks(b.x,FLOOR_Y,'stone',s,1);addShake(8*(gs.isLastBooha?1.8:1));}
      if(b.power==='monster'){gs.bounces++;b.radius=Math.min(b.baseRadius*(1+gs.bounces*0.22),B_RADIUS*2.8);}
    }
    for(let i=0;i<gs.blocks.length;i++)blockCollide(gs.blocks[i],i);
    const spd=Math.hypot(b.vx,b.vy), onFloor=Math.abs(b.y-(FLOOR_Y-b.radius))<3;
    if(spd<REST_THR&&onFloor){
      b.vx*=0.985; b.vy*=0.985; b.settledF++;
      if(!b.confettiFired&&b.settledF>=SETTLE_NEED){
        if(!b.tell&&b.power!=='nightmare'){
          initTell(b);
        } else if(b.power==='nightmare'&&!b.confettiFired){
          b.confettiFired=true; triggerDeathExplosion(b);
          queueNextRound(()=>finishShot(), NEXT_MS+600);
        }
        if(b.power==='ultimate'&&!b.confettiFired){
          b.confettiFired=true; initTell(b); spawnDetonation(b.x,b.y);
           
          gs.blocks.forEach((block,i)=>{
          if(!block.broken&&dist(b.x,b.y,block.x,block.y)<220) {
          if(!powerBlocked(block,'ultimate','hit') && (block.hp < block.maxHp || block.falling))
          damageBlock(block,block.hp,block.x,block.y,20,i,false,'ultimate');
       }
     });
           
          gs.pct=(gs.brokenBlocks/gs.totalBlocks)*100;
        }
      }
    } else b.settledF=0;
    if(gs.isLastBooha&&b.launched&&gs.timeScale>0.55)gs.timeScale=Math.max(0.55,gs.timeScale-0.008);
    if((b.y>H+200||b.x<-200||b.x>W+200)&&!gs.shotLock)finishShot();
  }

  // ── finishShot ───────────────────────────────────────
  function finishShot() {
    if (gs.shotLock) return;
    gs.shotLock=true;
    gs.timeScale=1;
    const shotsLeft=bst.stocks.reduce((a,v)=>a+v,0);
    gs.ghostsLeft=shotsLeft;
    gs.pct=(gs.brokenBlocks/Math.max(1,gs.totalBlocks))*100;
    const target=(LEVELS[gs.round]?.targetPercent)||100;
    if (gs.pct>=target) {
      sndWin();
      const r=ROSTER[bst.sel], cfg=r.conf, cnt=~~(cfg.burst*1.4*BURST_SCALE);
      for(let i=0;i<cnt;i++){
        const ang=rnd(-Math.PI*0.85,-Math.PI*0.15), mag=rnd(4,20);
        pushCapped(confetti,CAP.confetti,{
          x:W/2+rnd(-60,60),y:H*0.28,vx:Math.cos(ang)*mag,vy:Math.sin(ang)*mag,
          life:1,decay:rnd(0.006,0.014),r:rnd(cfg.sz[0],cfg.sz[1]),
          col:pick(cfg.cols),sh:pick(cfg.sh),grav:rnd(0.14,0.28),
          rot:rnd(0,Math.PI*2),rotV:cfg.spin?rnd(-0.2,0.2):0,
          wob:rnd(0,Math.PI*2),wobS:rnd(0.06,0.14),wobA:rnd(0.5,2.5),
          pls:rnd(0,Math.PI*2),plsS:rnd(0.12,0.22),
          bounce:rnd(0.2,0.45),bounced:false,
        });
      }
      celebPops(500);
      showCard(P.WIN, `ROUND ${gs.roundN} CLEAR!`, 'Smashed it! 🎉', '#ffdd44');
      queueNextRound(advanceRound, CARD_MS);
    } else if (shotsLeft<=0) {
      sndFail();
      showCard(P.FAIL, 'ROUND OVER', `${Math.round(gs.pct)}% destruction — so close!`, '#ff6666');
      queueNextRound(()=>{loadRound(gs.round);startRound();}, CARD_MS+700);
    } else {
      gs.shotLock=false;
      advanceSelector();
      const remaining=bst.stocks.reduce((a,v)=>a+v,0);
      gs.isLastBooha=remaining<=1; gs.timeScale=1;
      gs.booha=makeBooha(); gs.bounces=0;
      gs.fireTrail=[]; gs.minis=[]; gs.frozen=new Map(); gs.damageConfetti=[];
    }
  }
  function advanceSelector() {
    for(let i=0;i<ROSTER.length;i++){const t=(bst.sel+i)%ROSTER.length;if(bst.stocks[t]>0){bst.sel=t;return;}}
  }

  // ── FX update ────────────────────────────────────────
  function updateFX() {
    if (gs.phase === P.WIN || gs.phase === P.FAIL) {
      updateConfetti();
      return;
    }
    for(let i=sparks.length-1;i>=0;i--){
      const p=sparks[i];
      p.vy+=p.grav; p.x+=p.vx; p.y+=p.vy; p.vx*=0.97;
      if(p.rot!==undefined)p.rot+=p.rotV;
      p.life-=(p.decay||0.025)+0.005*rnd();
      if(p.y>FLOOR_Y-p.r&&(p.type==='chip'||p.type==='shard')){p.y=FLOOR_Y-p.r;p.vy*=-0.38;p.vx*=0.78;if(Math.abs(p.vy)>5)spawnDust(p.x,FLOOR_Y);}
      if(p.life<=0)sparks.splice(i,1);
    }
    for(let i=waves.length-1;i>=0;i--){const w=waves[i];w.r+=(w.maxR-w.r)*0.18;w.life-=0.07;if(w.life<=0)waves.splice(i,1);}
    for(let i=dusts.length-1;i>=0;i--){
      const d=dusts[i];
      if(d.falling){d.y=(d.y||0)+(d.vy||2);}
      d.r+=(d.maxR-d.r)*0.12; d.life-=0.05; if(d.life<=0)dusts.splice(i,1);
    }
    shake.v*=shake.decay;
    updateConfetti();
    updateMinis();
    updateNightmareFlicker();
    updateClangLabels();
  }

  // ── Input ────────────────────────────────────────────
  function worldPt(evt) {
    const r=canvas.getBoundingClientRect();
    const cx=evt.touches?evt.touches[0].clientX:evt.clientX;
    const cy=evt.touches?evt.touches[0].clientY:evt.clientY;
    return {x:(cx-r.left)*(W/r.width), y:(cy-r.top)*(H/r.height)};
  }
  function selHit(px,py){for(let i=0;i<ROSTER.length;i++){const sy=SY+i*(SH+SGAP);if(px>=SX&&px<=SX+SW&&py>=sy&&py<=sy+SH)return i;}return -1;}
  function htStart(px,py){const bx=W/2-140,by=H/2+10;return px>=bx&&px<=bx+280&&py>=by&&py<=by+70;}
  function htAction(px,py){const bx=W/2-130,by=H*0.62;return px>=bx&&px<=bx+260&&py>=by&&py<=by+58;}
  function htHelp(px,py){return px>=W-48&&px<=W-8&&py>=8&&py<=48;}

  function onDown(evt){
    getAC();
    const p=worldPt(evt);
    if(htHelp(p.x,p.y)&&(gs.phase===P.TITLE||gs.phase===P.PLAY)){openHelp();evt.preventDefault();return;}
    if(gs.phase===P.TITLE){if(htStart(p.x,p.y)){loadRound(0);startRound();}evt.preventDefault();return;}
    if(gs.phase===P.WIN||gs.phase===P.FAIL){
      if(htAction(p.x,p.y)){if(gs.phase===P.WIN)advanceRound();else{loadRound(gs.round);startRound();}}
      evt.preventDefault();return;
    }
    const slot=selHit(p.x,p.y);
    if(slot!==-1&&bst.stocks[slot]>0&&!gs.shotLock){
      bst.sel=slot;if(gs.booha&&!gs.booha.launched)gs.booha=makeBooha();
      evt.preventDefault();evt.stopPropagation();return;
    }
    if(!gs.booha||gs.booha.launched||gs.shotLock)return;
    if(!gs.running)startRound();
    if(dist(p.x,p.y,gs.booha.x,gs.booha.y)>gs.booha.radius+24)return;
    gs.dragging=true;gs.pullPlayed=false;sndPull();
    evt.preventDefault();evt.stopPropagation();
  }
  function onMove(evt){
    if(!gs.dragging||!gs.booha||gs.booha.launched)return;
    const p=worldPt(evt);
    const dx=p.x-SLING_X,dy=p.y-SLING_Y,d=Math.min(MAX_PULL,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);
    gs.booha.x=SLING_X+Math.cos(a)*d;
    gs.booha.y=Math.min(SLING_Y+Math.sin(a)*d,FLOOR_Y-gs.booha.radius-4);
    evt.preventDefault();
  }
  function onUp(evt){
    if(!gs.dragging)return;
    gs.dragging=false;gs.pullPlayed=false;
    if(!gs.booha||gs.booha.launched||gs.shotLock)return;
    const dx=SLING_X-gs.booha.x,dy=SLING_Y-gs.booha.y,mag=Math.hypot(dx,dy);
    if(mag<12){gs.booha.x=SLING_X;gs.booha.y=SLING_Y;return;}
    bst.stocks[bst.sel]=Math.max(0,bst.stocks[bst.sel]-1);
    gs.booha.vx=dx*0.19;gs.booha.vy=dy*0.19;gs.booha.launched=true;gs.booha.damageThisShot=0;
    const remaining=bst.stocks.reduce((a,v)=>a+v,0);
    gs.isLastBooha=remaining===0;
    if(gs.isLastBooha){addShake(5);gs.timeScale=0.8;}
    sndLaunch();
  }

  // ── Draw helpers ─────────────────────────────────────
  function rr(c,x,y,w,h,r,fill,stroke){
    c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
    if(fill)c.fill();if(stroke)c.stroke();
  }
  function rrClip(c,x,y,w,h,r){
    c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();c.clip();
  }

  // ── Draw: Background ─────────────────────────────────
  function drawBG(){
    if(gs.imgs.bg){ctx.drawImage(gs.imgs.bg,0,0,W,H);}
    else{
      const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1e1c2a');g.addColorStop(1,'#0c0a12');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    }
    ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(0,H-80,W,80);
    if(gs.nightmareFlicker){
      const flk=(gs.nightmareFlickerTimer%8<4)?0.18:0;
      if(flk>0){ctx.fillStyle=`rgba(80,0,128,${flk})`;ctx.fillRect(0,0,W,H);}
    }
  }
  function drawScorchMarks(){
    for(const s of scorchMarks){
      if(offscreen(s.x,s.y,s.r))continue;
      ctx.save();ctx.globalAlpha=s.life*0.55;
      const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r);
      sg.addColorStop(0,'rgba(0,0,0,0.8)');sg.addColorStop(0.5,'rgba(80,20,0,0.4)');sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=sg;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  function drawSling(){
    const b=gs.booha||makeBooha(0);
    const baseX=SLING_X,baseY=FLOOR_Y+4,topY=SLING_Y-52,lx=SLING_X-26,rx=SLING_X+26;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.ellipse(baseX,baseY+7,14,5,0,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fill();
    const wg=ctx.createLinearGradient(baseX-18,0,baseX+18,0);
    wg.addColorStop(0,'#3a2210');wg.addColorStop(0.35,'#5c3318');wg.addColorStop(0.65,'#6e3e1e');wg.addColorStop(1,'#3a2210');
    for(const[sx,ex]of[[-6,lx],[6,rx]]){
      ctx.beginPath();ctx.moveTo(baseX+sx,baseY);ctx.quadraticCurveTo(baseX+sx*4.5,baseY-80,ex,topY);
      ctx.lineWidth=18;ctx.strokeStyle='#2a1608';ctx.stroke();
      ctx.lineWidth=13;ctx.strokeStyle=wg;ctx.stroke();
    }
    ctx.beginPath();ctx.moveTo(baseX,baseY);ctx.lineTo(baseX,baseY-45);
    ctx.lineWidth=20;ctx.strokeStyle='#2a1608';ctx.stroke();ctx.lineWidth=15;ctx.strokeStyle=wg;ctx.stroke();
    ctx.globalAlpha=0.18;ctx.strokeStyle='#e8a060';ctx.lineWidth=2;
    for(const[gsx,gex]of[[-3,lx+2],[3,rx-2]]){ctx.beginPath();ctx.moveTo(baseX+gsx,baseY-10);ctx.quadraticCurveTo(baseX+gsx*8,baseY-75,gex,topY+10);ctx.stroke();}
    ctx.globalAlpha=1;
    for(const[kx,ky]of[[lx,topY],[rx,topY]]){
      ctx.beginPath();ctx.arc(kx,ky,9,0,Math.PI*2);ctx.fillStyle='#2a1608';ctx.fill();
      ctx.beginPath();ctx.arc(kx,ky,7,0,Math.PI*2);ctx.fillStyle='#6e3e1e';ctx.fill();
      ctx.beginPath();ctx.arc(kx-2,ky-2,3,0,Math.PI*2);ctx.fillStyle='rgba(220,160,80,0.38)';ctx.fill();
      ctx.beginPath();ctx.arc(kx,ky,7,0,Math.PI*2);ctx.strokeStyle='#1a0e04';ctx.lineWidth=1.5;ctx.stroke();
    }
    if(!b.launched){
      const bx=gs.dragging?b.x:SLING_X,by=gs.dragging?b.y:SLING_Y;
      const stretch=Math.hypot(bx-SLING_X,by-SLING_Y)/MAX_PULL,bw=Math.max(2.5,6-stretch*3);
      ctx.globalAlpha=0.6;ctx.strokeStyle='#4a2a18';ctx.lineWidth=bw+2;
      ctx.beginPath();ctx.moveTo(lx,topY);ctx.lineTo(bx,by);ctx.stroke();
      ctx.beginPath();ctx.moveTo(rx,topY);ctx.lineTo(bx,by);ctx.stroke();
      ctx.globalAlpha=1;
      const eg=ctx.createLinearGradient(lx,topY,bx,by);
      eg.addColorStop(0,'#8b5a30');eg.addColorStop(0.5,'#c07838');eg.addColorStop(1,'#8b5a30');
      ctx.strokeStyle=eg;ctx.lineWidth=bw;
      ctx.beginPath();ctx.moveTo(lx,topY);ctx.lineTo(bx,by);ctx.stroke();
      ctx.beginPath();ctx.moveTo(rx,topY);ctx.lineTo(bx,by);ctx.stroke();
      if(!gs.dragging){ctx.fillStyle='#5c3018';ctx.strokeStyle='#3a1e08';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(bx,by,12,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    }
    ctx.restore();
  }
  function drawBooha(){
    const b=gs.booha; if(!b)return;
    if(b.power==='nightmare'&&gs.nightmareFlicker)return;
    if(b.power==='monster'&&gs.bounces>0){ctx.save();ctx.globalAlpha=0.3;ctx.shadowColor='#44ff44';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fillStyle='#22aa22';ctx.fill();ctx.restore();}
    if(b.power==='ice'){ctx.save();ctx.globalAlpha=0.35;ctx.beginPath();ctx.arc(b.x,b.y,b.radius+4,0,Math.PI*2);ctx.fillStyle='#aaeeff';ctx.fill();ctx.restore();}
    if(b.power==='rainbow'){const hue=(performance.now()*0.25)%360;ctx.save();ctx.globalAlpha=0.4;ctx.beginPath();ctx.arc(b.x,b.y,b.radius+6,0,Math.PI*2);ctx.fillStyle=`hsl(${hue},100%,65%)`;ctx.fill();ctx.restore();}
    if(b.tellGlow>0){ctx.save();ctx.globalAlpha=b.tellGlow*0.85;ctx.shadowColor='#ffffff';ctx.shadowBlur=30*b.tellGlow;ctx.beginPath();ctx.arc(b.x,b.y,b.radius*b.tellScaleX*1.1,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fill();ctx.restore();}
    if(gs.isLastBooha&&b.launched){const pulse=0.5+0.5*Math.sin(performance.now()*0.006);ctx.save();ctx.globalAlpha=0.3*pulse;ctx.shadowColor='#ffdd44';ctx.shadowBlur=22;ctx.beginPath();ctx.arc(b.x,b.y,b.radius+10,0,Math.PI*2);ctx.fillStyle='#ffdd44';ctx.fill();ctx.restore();}
    const img=bst.imgs[b.ri];
    ctx.save();ctx.translate(b.x,b.y);
    if(b.launched)ctx.rotate(Math.atan2(b.vy,b.vx)*0.2);
    ctx.scale(b.tellScaleX||1,b.tellScaleY||1);
    if(b.impactCompress>0){const ic=b.impactCompress;ctx.scale(1+ic*0.3,1-ic*0.2);}
    if(img){ctx.drawImage(img,-b.radius*1.4,-b.radius*1.4,b.radius*2.8,b.radius*2.8);}
    else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,b.radius,Math.PI,0,false);ctx.lineTo(b.radius,22);ctx.quadraticCurveTo(0,b.radius+12,-b.radius,22);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
  function drawGhostSparks(){
    for(const p of sparks){
      if(p.type!=='ghost')continue;
      ctx.save();ctx.globalAlpha=clamp(p.life,0,1)*0.35;
      const img=bst.imgs[p.ri];
      if(img)ctx.drawImage(img,p.x-p.r,p.y-p.r,p.r*2,p.r*2);
      else{ctx.beginPath();ctx.arc(p.x,p.y,p.r*0.5,0,Math.PI*2);ctx.fillStyle='#9900ff';ctx.fill();}
      ctx.restore();
    }
  }
  function drawMinis(){
    for(const m of gs.minis){
      ctx.save();ctx.globalAlpha=clamp(m.life,0,1)*0.85;
      const img=bst.imgs[m.ri];
      if(img)ctx.drawImage(img,m.x-m.radius*1.4,m.y-m.radius*1.4,m.radius*2.8,m.radius*2.8);
      else{ctx.fillStyle='#ffaacc';ctx.beginPath();ctx.arc(m.x,m.y,m.radius,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
  }

  // v4: drawBlocks — adds trait glow border on immune/resistant blocks
  function drawBlocks(){
    for(let i=0;i<gs.blocks.length;i++){
      const block=gs.blocks[i];
      if(offscreen(block.x,block.y,Math.max(block.w,block.h)))continue;
      const sx=(rnd()-0.5)*8*block.shake,sy=(rnd()-0.5)*6*block.shake;
      const compY=block.compressY||0;
      const bx=block.x-block.w/2,by=block.y-block.h/2+compY,bw=block.w,bh=block.h-compY;
      const m=MAT[block.material]||MAT.wood;

      ctx.save();
      ctx.globalAlpha = block.broken ? 0.28 : (block.falling ? 0.88 : 1);
      ctx.translate(sx, sy);

      if (block.falling) {
        const tilt = clamp(block.vy * 0.012, -0.26, 0.26);
        ctx.translate(block.x, block.y);
        ctx.rotate(tilt);
        ctx.translate(-block.x, -block.y);
      }

      if(block.frozen){
        ctx.fillStyle='#c0f0ff';ctx.strokeStyle='#88ddff';ctx.lineWidth=2;rr(ctx,bx,by,bw,bh,8,true,true);
        ctx.globalAlpha*=0.5;ctx.fillStyle='rgba(170,240,255,0.4)';rr(ctx,bx,by,bw,bh,8,true,false);ctx.restore();continue;
      }
      if(block.burning&&!block.broken){ctx.save();ctx.globalAlpha=(block.burnTimer/120)*0.4;ctx.fillStyle='#ff6600';rr(ctx,bx-2,by-2,bw+4,bh+4,10,true,false);ctx.restore();}
      const fg=ctx.createLinearGradient(bx,by,bx,by+bh);
      fg.addColorStop(0,lighten(matFill(block),0.12));fg.addColorStop(0.5,matFill(block));fg.addColorStop(1,darken(matFill(block),0.14));
      ctx.fillStyle=fg;ctx.strokeStyle=darken(m.edge,0.3);ctx.lineWidth=2;rr(ctx,bx,by,bw,bh,8,true,true);
      if(!block.broken){
        ctx.save();ctx.globalAlpha=0.3;ctx.fillStyle=m.edge;rrClip(ctx,bx,by,bw,bh,8);ctx.fillRect(bx,by,bw,5);ctx.restore();
        ctx.save();ctx.globalAlpha=0.14;ctx.fillStyle=m.edge;rrClip(ctx,bx,by,bw,bh,8);ctx.fillRect(bx,by,4,bh);ctx.restore();
        if(m.grain){ctx.save();ctx.globalAlpha=0.09;ctx.strokeStyle='rgba(255,210,160,0.5)';ctx.lineWidth=1;rrClip(ctx,bx,by,bw,bh,8);for(let g=0;g<bh;g+=8){ctx.beginPath();ctx.moveTo(bx,by+g+rnd(-1,1));ctx.lineTo(bx+bw,by+g+rnd(-1,1));ctx.stroke();}ctx.restore();}
        if(block.material==='glass'){ctx.save();ctx.globalAlpha=0.22;const sg=ctx.createLinearGradient(bx,by,bx+bw*0.7,by+bh*0.7);sg.addColorStop(0,'rgba(255,255,255,0.9)');sg.addColorStop(0.5,'rgba(255,255,255,0)');ctx.fillStyle=sg;rrClip(ctx,bx,by,bw,bh,8);ctx.fillRect(bx,by,bw,bh);ctx.restore();}
        if(block.material==='stone'){ctx.save();ctx.globalAlpha=0.08;rrClip(ctx,bx,by,bw,bh,8);for(let d=0;d<~~(bw*bh/200);d++){ctx.beginPath();ctx.arc(bx+rnd(6,bw-6),by+rnd(6,bh-6),rnd(1,2.5),0,Math.PI*2);ctx.fillStyle=rnd()<0.5?'rgba(255,255,255,0.8)':'rgba(0,0,0,0.6)';ctx.fill();}ctx.restore();}
        if(block.material==='soft'){ctx.save();ctx.globalAlpha=0.13;rrClip(ctx,bx,by,bw,bh,8);for(let d=0;d<6;d++){ctx.beginPath();ctx.arc(bx+rnd(6,bw-6),by+rnd(6,bh-6),rnd(1.5,3),0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.9)';ctx.fill();}ctx.restore();}
      }
      if(!block.broken&&block.maxHp>1){
        const hr=clamp(block.hp/block.maxHp,0,1);
        ctx.fillStyle='rgba(0,0,0,0.35)';rr(ctx,bx+8,by+bh-12,bw-16,7,3,true,false);
        ctx.fillStyle=hr>0.66?'#44ee77':hr>0.33?'#ffcc33':'#ff4444';rr(ctx,bx+8,by+bh-12,(bw-16)*hr,7,3,true,false);
      }
      if(block.hitFlash>0){ctx.fillStyle=`rgba(255,255,255,${0.42*block.hitFlash})`;rr(ctx,bx,by,bw,bh,8,true,false);}
      ctx.strokeStyle='rgba(0,0,0,0.25)';ctx.lineWidth=1.5;rr(ctx,bx+1.5,by+1.5,bw-3,bh-3,7,false,true);

      // v4: trait glow — pulsing coloured border signals immunity to player
      if (!block.broken) {
        const glowCol = traitGlowColor(block);
        if (glowCol) {
          const pulse = 0.45 + 0.35 * Math.sin(performance.now() * 0.004 + i);
          ctx.save();
          ctx.globalAlpha = pulse * 0.72;
          ctx.strokeStyle = glowCol;
          ctx.lineWidth = 3.5;
          ctx.shadowColor = glowCol;
          ctx.shadowBlur = 8;
          rr(ctx, bx - 1, by - 1, bw + 2, bh + 2, 9, false, true);
          ctx.restore();
        }
      }

      ctx.restore();
      if(!block.broken)drawCracks(block,i);
    }
  }

  function drawTraj(){
    if(!gs.dragging||!gs.booha)return;
    const b=gs.booha;let tx=b.x,ty=b.y,tvx=(SLING_X-b.x)*0.19,tvy=(SLING_Y-b.y)*0.19;
    ctx.save();
    for(let i=0;i<22;i++){tvy+=GRAVITY;tvx*=AIR;tvy*=AIR;tx+=tvx;ty+=tvy;
      ctx.globalAlpha=(1-i/22)*0.55;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(tx,ty,Math.max(1.5,5.5-i*0.2),0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function drawGround(){
    ctx.save();const g=ctx.createLinearGradient(0,FLOOR_Y-8,0,FLOOR_Y+20);
    g.addColorStop(0,'rgba(255,255,255,0.28)');g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.fillRect(0,FLOOR_Y-8,W,16);ctx.restore();
  }
  function drawFXBehind(){
    for(const d of dusts){if(offscreen(d.x,d.y||0,d.r))continue;ctx.save();ctx.globalAlpha=d.life*0.22;ctx.beginPath();ctx.arc(d.x,d.y||0,d.r,0,Math.PI*2);ctx.fillStyle='rgba(200,190,180,0.5)';ctx.fill();ctx.restore();}
    for(const w of waves){if(offscreen(w.x,w.y,w.r))continue;ctx.save();ctx.globalAlpha=w.life*0.7;ctx.strokeStyle=w.col;ctx.lineWidth=(w.thick||2.5)*w.life;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
  function drawFXFront(){
    drawGhostSparks();
    for(const p of sparks){
      if(p.type==='ghost')continue;
      if(offscreen(p.x,p.y,p.r))continue;
      ctx.save();ctx.globalAlpha=clamp(p.life,0,1)*(p.alpha||1);ctx.fillStyle=p.col;
      ctx.translate(p.x,p.y);if(p.rot!==undefined)ctx.rotate(p.rot);
      if(p.type==='shard'){const s=p.r;ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*0.7,s*0.6);ctx.lineTo(-s*0.7,s*0.4);ctx.closePath();ctx.fillStyle=p.col;ctx.strokeStyle='rgba(180,240,255,0.6)';ctx.lineWidth=0.8;ctx.fill();ctx.stroke();}
      else if(p.type==='chip'){ctx.fillRect(-p.r*0.6,-p.r*0.4,p.r*1.2,p.r*0.8);}
      else{ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    drawScorchMarks();
    drawClangLabels();
  }
  function drawFlash(){
    if(gs.flash<=0)return;
    ctx.save();ctx.fillStyle=`rgba(255,255,255,${0.07*gs.flash})`;ctx.fillRect(0,0,W,H);ctx.restore();
    gs.flash*=0.84;
  }

  function drawHelpButton(){
    if(gs.phase!==P.TITLE&&gs.phase!==P.PLAY)return;
    ctx.save();
    ctx.fillStyle='rgba(255,255,255,0.12)';ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1.5;
    rr(ctx,W-46,10,36,36,8,true,true);
    ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='bold 18px system-ui,sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',W-28,28);
    ctx.restore();
  }

  function drawSelector(){
    ctx.save();
    for(let i=0;i<ROSTER.length;i++){
      const sx=SX,sy=SY+i*(SH+SGAP);
      const stock=bst.stocks[i],isSel=i===bst.sel,isAvail=stock>0;
      ctx.save();ctx.globalAlpha=isSel?0.92:0.62;
      ctx.fillStyle=isSel?'rgba(255,255,255,0.16)':'rgba(8,6,16,0.62)';
      ctx.strokeStyle=isSel?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.07)';ctx.lineWidth=isSel?2:1;
      rr(ctx,sx,sy,SW,SH,10,true,true);ctx.restore();
      const img=bst.imgs[i];
      ctx.save();ctx.globalAlpha=isAvail?(isSel?1:0.68):0.18;
      if(img)ctx.drawImage(img,sx+4,sy+4,SW-8,SH-18);
      else{ctx.beginPath();ctx.arc(sx+SW/2,sy+SH/2-6,14,0,Math.PI*2);ctx.fillStyle='#aaa';ctx.fill();}
      ctx.restore();
      const bw=stock>=10?22:16;
      ctx.save();ctx.globalAlpha=isAvail?1:0.35;
      ctx.fillStyle=isAvail?(isSel?'#fff':'rgba(255,255,255,0.55)'):'rgba(255,255,255,0.15)';
      ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.lineWidth=1;rr(ctx,sx+SW-bw-2,sy+SH-14,bw,12,6,true,true);
      ctx.fillStyle=isAvail?(isSel?'#111':'#333'):'#888';ctx.font='bold 8px system-ui,sans-serif';ctx.textBaseline='middle';
      ctx.fillText(String(stock),sx+SW-bw*0.5-2,sy+SH-8);ctx.restore();
      if(isSel){
        const pulse=0.5+0.5*Math.sin(performance.now()*0.004);
        ctx.save();ctx.globalAlpha=0.25*pulse;ctx.strokeStyle='#fff';ctx.lineWidth=3;rr(ctx,sx-2,sy-2,SW+4,SH+4,12,false,true);ctx.restore();
        const r=ROSTER[i];
        ctx.save();ctx.globalAlpha=0.65;ctx.fillStyle='#fff';ctx.font='bold 10px system-ui,sans-serif';
        ctx.fillText(r.name,sx,sy+SH+14);ctx.restore();
        ctx.save();ctx.globalAlpha=0.45;ctx.fillStyle='#ffe';ctx.font='9px system-ui,sans-serif';
        const words=r.desc.split(' ');let line='',dy=0;
        for(const w of words){const test=line?line+' '+w:w;if(ctx.measureText(test).width>SW*2.2&&line){ctx.fillText(line,sx,sy+SH+26+dy);line=w;dy+=11;}else line=test;}
        if(line)ctx.fillText(line,sx,sy+SH+26+dy);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function drawHUD(){
    ctx.save();ctx.textBaseline='middle';
    if(gs.isLastBooha&&gs.phase===P.PLAY){
      const pulse=0.5+0.5*Math.sin(performance.now()*0.005);
      ctx.save();ctx.globalAlpha=0.22*pulse;ctx.strokeStyle='#ff4444';ctx.lineWidth=6;ctx.strokeRect(0,0,W,H);ctx.restore();
    }
    const barW=W*clamp(gs.pct/100,0,1);
    ctx.save();ctx.globalAlpha=0.55;ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(0,3,W,5);
    const pg=ctx.createLinearGradient(0,0,W,0);
    pg.addColorStop(0,'#ff7cfb');pg.addColorStop(0.5,'#7cfff8');pg.addColorStop(1,'#ffdf80');
    ctx.fillStyle=pg;ctx.fillRect(0,3,barW,5);ctx.restore();
    ctx.save();ctx.globalAlpha=0.88;ctx.fillStyle='rgba(8,6,16,0.75)';ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;rr(ctx,SX,12,SW,50,10,true,true);ctx.restore();
    ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='bold 9px system-ui,sans-serif';ctx.fillText('ROUND',SX+SW/2-ctx.measureText('ROUND').width/2,24);
    ctx.fillStyle='#fff';ctx.font='bold 20px system-ui,sans-serif';ctx.fillText(String(gs.roundN),SX+SW/2-ctx.measureText(String(gs.roundN)).width/2,44);
    const pills=[
      {label:'SHOTS',  value:String(gs.ghostsLeft), accent:gs.isLastBooha?'#ff4444':'#ff9f7f'},
      {label:'DAMAGE', value:`${Math.round(gs.pct)}%`, accent:'#7cfff8'},
      {label:'TARGET', value:`${(LEVELS[gs.round]?.targetPercent||100)}%`, accent:'#ffdf80'}
    ];
    const pw=90,ph=44,pg2=10;let px=W-14-pills.length*(pw+pg2)+pg2;
    for(const pill of pills){
      ctx.save();ctx.globalAlpha=0.85;ctx.fillStyle='rgba(8,6,16,0.72)';ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;rr(ctx,px,12,pw,ph,10,true,true);ctx.restore();
      ctx.fillStyle='rgba(255,255,255,0.45)';ctx.font='bold 9px system-ui,sans-serif';ctx.fillText(pill.label,px+pw/2-ctx.measureText(pill.label).width/2,12+13);
      ctx.fillStyle=pill.accent;ctx.font='bold 16px system-ui,sans-serif';ctx.fillText(pill.value,px+pw/2-ctx.measureText(pill.value).width/2,12+31);
      px+=pw+pg2;
    }
    ctx.restore();
    drawSelector();
    drawHelpButton();
  }

  function drawTitle(){
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='bold 76px system-ui,sans-serif';ctx.fillStyle='#fff';
    ctx.shadowColor='#aaa';ctx.shadowBlur=12;ctx.fillText('BOOHA',W/2,H/2-115);ctx.shadowBlur=0;
    ctx.font='bold 40px system-ui,sans-serif';ctx.fillStyle='#ffdd44';ctx.shadowColor='#ffaa00';ctx.shadowBlur=12;
    ctx.fillText('DESTRUCTION',W/2,H/2-58);ctx.shadowBlur=0;
    ctx.font='15px system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.fillText('Pull your Booha back and let fly. Smash everything!',W/2,H/2-16);
    const bx=W/2-140,by=H/2+10,bw=280,bh=70;
    const bg=ctx.createLinearGradient(bx,by,bx,by+bh);bg.addColorStop(0,'#ffe566');bg.addColorStop(1,'#ff9900');
    ctx.shadowColor='#ffdd44';ctx.shadowBlur=18;
    ctx.fillStyle=bg;rr(ctx,bx,by,bw,bh,18,true,false);ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=2;rr(ctx,bx,by,bw,bh,18,false,true);
    ctx.fillStyle='#1a0e00';ctx.font='bold 30px system-ui,sans-serif';ctx.fillText('START',W/2,by+bh/2);
    ctx.font='13px system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.38)';
    ctx.fillText(`${LEVELS.length} rounds · ${ROSTER.length} Booha types`,W/2,H/2+108);
    ctx.restore();
    drawHelpButton();
  }
  function drawCard(){
    const win=gs.phase===P.WIN;
    ctx.fillStyle=win?'rgba(0,18,0,0.62)':'rgba(28,0,0,0.62)';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='bold 70px system-ui,sans-serif';ctx.fillStyle=gs.cardAccent;
    ctx.shadowColor=gs.cardAccent;ctx.shadowBlur=28;ctx.fillText(gs.cardTitle,W/2,H/2-88);ctx.shadowBlur=0;
    ctx.font='20px system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.75)';ctx.fillText(gs.cardSub,W/2,H/2-28);
    ctx.font='14px system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.fillText(`${Math.round(gs.pct)}% destruction  ·  Best shot ${Math.round(gs.bestShot)}%`,W/2,H/2+18);
    const bx=W/2-130,by=H*0.62,bw=260,bh=58;
    const bg=ctx.createLinearGradient(bx,by,bx,by+bh);
    bg.addColorStop(0,win?'#44ff88':'#ff9944');bg.addColorStop(1,win?'#009944':'#cc4400');
    ctx.shadowColor=win?'#44ff88':'#ff6600';ctx.shadowBlur=16;
    ctx.fillStyle=bg;rr(ctx,bx,by,bw,bh,16,true,false);ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1.5;rr(ctx,bx,by,bw,bh,16,false,true);
    ctx.fillStyle='#fff';ctx.font='bold 24px system-ui,sans-serif';
    ctx.fillText(win?'NEXT ROUND →':'TRY AGAIN',W/2,by+bh/2);
    if(gs.cardTimer>0){ctx.font='11px system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.28)';ctx.fillText(`Auto in ${Math.ceil(gs.cardTimer/1000)}s`,W/2,by+bh+20);}
    ctx.restore();
  }

  // ── Render ───────────────────────────────────────────
  function render(){
    const sx=shake.v>0.3?(rnd()-0.5)*shake.v*2:0,sy=shake.v>0.3?(rnd()-0.5)*shake.v*1.4:0;
    ctx.save();if(sx||sy)ctx.translate(sx,sy);
    ctx.clearRect(-10,-10,W+20,H+20);
    drawBG();
    drawFXBehind();
    if(gs.phase!==P.TITLE){drawTraj();drawBlocks();drawGround();drawSling();drawBooha();drawMinis();}
    drawFXFront();drawConfetti();drawFlash();
    ctx.restore();
    if(gs.phase===P.TITLE)drawTitle();
    else if(gs.phase===P.WIN||gs.phase===P.FAIL){drawHUD();drawCard();}
    else drawHUD();
  }

  // ── Main loop ────────────────────────────────────────
  let lastT=0;
  function tick(now){
    const dt=Math.min(now-lastT,50);lastT=now;
    if(gs.cardTimer>0)gs.cardTimer=Math.max(0,gs.cardTimer-dt);
    if(gs.phase===P.PLAY){updateFX();updateBlocks();updateBooha();}
    else updateFX();
    render();
    requestAnimationFrame(tick);
  }

  // ── Resize ───────────────────────────────────────────
  function resize(){
    const vw=window.innerWidth,vh=window.innerHeight;
    const scale=Math.min(vw/W,vh/H);
    canvas.style.width=W*scale+'px';canvas.style.height=H*scale+'px';
    canvas.style.left=((vw-W*scale)/2)+'px';canvas.style.top=((vh-H*scale)/2)+'px';
    gs.scale=scale;
  }

  // ── Help modal ───────────────────────────────────────
  let helpOpen = false;
  let helpIdx  = 0;
  let helpEl   = null;

  function buildHelpModal() {
    if (helpEl) return;
    helpEl = document.createElement('div');
    helpEl.id = 'booha-help';
    Object.assign(helpEl.style, {
      position:'fixed', inset:'0', background:'rgba(8,5,20,0.88)',
      display:'none', alignItems:'center', justifyContent:'center',
      zIndex:'8888', fontFamily:'system-ui,sans-serif',
    });
    helpEl.innerHTML = `
      <div id="bh-panel" style="
        background:linear-gradient(160deg,#1a1230,#0d0820);
        border:1px solid rgba(255,255,255,0.14);
        border-radius:20px;padding:32px 28px;width:340px;max-width:90vw;
        box-shadow:0 0 60px rgba(0,0,0,0.7);position:relative;text-align:center;
      ">
        <button id="bh-close" style="
          position:absolute;top:12px;right:14px;background:none;border:none;
          color:rgba(255,255,255,0.5);font-size:22px;cursor:pointer;line-height:1;
        ">✕</button>
        <div style="font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.35);margin-bottom:18px;text-transform:uppercase">Booha Guide</div>
        <img id="bh-img" src="" style="width:90px;height:90px;object-fit:contain;margin-bottom:12px;" />
        <div id="bh-name" style="font-size:26px;font-weight:800;color:#fff;line-height:1.1;margin-bottom:2px;"></div>
        <div id="bh-jp-name" style="font-size:13px;color:rgba(255,255,255,0.68);margin-bottom:8px;letter-spacing:0.5px;"></div>
        <div id="bh-power" style="font-size:12px;letter-spacing:2px;color:#aaa;text-transform:uppercase;margin-bottom:14px;"></div>
        <div id="bh-desc" style="font-size:14px;color:rgba(255,255,255,0.75);margin-bottom:10px;line-height:1.5;"></div>
        <div id="bh-tip" style="
          font-size:12px;color:#ffdd88;background:rgba(255,200,0,0.08);
          border:1px solid rgba(255,200,0,0.2);border-radius:8px;
          padding:8px 12px;margin-bottom:22px;line-height:1.5;
        "></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <button id="bh-prev" style="
            background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
            color:#fff;font-size:20px;border-radius:10px;width:44px;height:44px;
            cursor:pointer;display:flex;align-items:center;justify-content:center;
          ">‹</button>
          <div id="bh-dots" style="display:flex;gap:6px;"></div>
          <button id="bh-next" style="
            background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
            color:#fff;font-size:20px;border-radius:10px;width:44px;height:44px;
            cursor:pointer;display:flex;align-items:center;justify-content:center;
          ">›</button>
        </div>
      </div>
    `;
    document.body.appendChild(helpEl);
    document.getElementById('bh-close').onclick = closeHelp;
    document.getElementById('bh-prev').onclick  = () => { helpIdx=(helpIdx-1+ROSTER.length)%ROSTER.length; refreshHelp(); };
    document.getElementById('bh-next').onclick  = () => { helpIdx=(helpIdx+1)%ROSTER.length; refreshHelp(); };
    helpEl.addEventListener('click', e => { if(e.target===helpEl) closeHelp(); });
    document.addEventListener('keydown', onHelpKey);
  }
  function onHelpKey(e) {
    if (!helpOpen) return;
    if (e.key==='ArrowLeft')  { helpIdx=(helpIdx-1+ROSTER.length)%ROSTER.length; refreshHelp(); }
    if (e.key==='ArrowRight') { helpIdx=(helpIdx+1)%ROSTER.length; refreshHelp(); }
    if (e.key==='Escape')     closeHelp();
  }
  function refreshHelp() {
    const r = ROSTER[helpIdx];
    const imgEl    = document.getElementById('bh-img');
    const nameEl   = document.getElementById('bh-name');
    const jpNameEl = document.getElementById('bh-jp-name');
    const powerEl  = document.getElementById('bh-power');
    const descEl   = document.getElementById('bh-desc');
    const tipEl    = document.getElementById('bh-tip');
    const dotsEl   = document.getElementById('bh-dots');
    if (r.img) { imgEl.src = r.img; imgEl.style.display = ''; }
    else        { imgEl.style.display = 'none'; }
    nameEl.textContent   = r.name;
    if (jpNameEl) jpNameEl.textContent = r.jpName || '';
    powerEl.textContent  = r.power.toUpperCase();
    descEl.innerHTML     = r.desc + '<br><span style="font-size:12px;opacity:0.7;">' + (r.jp || '') + '</span>';
    tipEl.textContent    = '\u{1F4A1} ' + (r.tip || '');
    dotsEl.innerHTML = '';
    ROSTER.forEach((_, i) => {
      const dot = document.createElement('div');
      Object.assign(dot.style, {
        width:'6px', height:'6px', borderRadius:'50%',
        background: i === helpIdx ? '#fff' : 'rgba(255,255,255,0.25)',
        cursor:'pointer', transition:'background 0.15s',
      });
      dot.onclick = () => { helpIdx = i; refreshHelp(); };
      dotsEl.appendChild(dot);
    });
  }
  function openHelp() {
    buildHelpModal();
    helpIdx = bst.sel;
    refreshHelp();
    helpEl.style.display = 'flex';
    helpOpen = true;
  }
  function closeHelp() {
    if (helpEl) helpEl.style.display = 'none';
    helpOpen = false;
  }

  // ── Boot ─────────────────────────────────────────────
  async function boot(){
    resize();
    window.addEventListener('resize',resize);
    canvas.addEventListener('mousedown',  onDown);
    window.addEventListener('mousemove',  onMove);
    window.addEventListener('mouseup',    onUp);
    canvas.addEventListener('touchstart', onDown, {passive:false});
    window.addEventListener('touchmove',  onMove, {passive:false});
    window.addEventListener('touchend',   onUp,   {passive:false});
    await preload();
    loadRound(0);
    gs.phase=P.TITLE;
    requestAnimationFrame(tick);
  }

  boot();
})();
