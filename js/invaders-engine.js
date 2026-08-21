
// ═══════════════════════════════════════════════════════════
// BOOHA INVADERS — Engine
// js/invaders-engine.js
//
// Depends on: js/invaders-data.js (must load first)
// ═══════════════════════════════════════════════════════════

window.addEventListener("error", e => {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;z-index:999999;background:#000d;color:#fff;padding:10px;border-radius:10px;font:11px/1.4 system-ui;white-space:pre-wrap";
  d.textContent = "ERROR: " + (e.error?.stack || e.message);
  document.body.appendChild(d);
});

// ════════════════════════════════════════
// GLOBALS
// ════════════════════════════════════════
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });
const DPR_CAP = 2;
let DPR = 1;

const IS_COARSE = !!(window.matchMedia?.("(pointer:coarse)").matches);

let started = false, paused = false, endPlaying = false;
let last = 0, stageTime = 0;
let GAME_SCALE = 1, LOCKED_SCALE = 1;
let _needRotateLast = null, _gateTimer = 0;

// Input
let pointerDown = false, pointerX = null, dragOffsetX = 0;
let playerMoving = false;
const keys = new Set();

// Tilt
let TILT_ENABLED = false;
let tiltGamma = 0, tiltSmooth = 0, tiltBaseline = 0, tiltVx = 0;

// Audio
let bgm = null, bossBgm = null, candySfx = null;
let audioCtx = null, audioMaster = null, audioReady = false;
let audioRetryTimer = 0, lastFireSfxAt = 0;
let bossMusicIdx = 0;

// Boss
let bossAlive = false;

// Safe areas
const SAFE = { top: 0, right: 0 };
const HUD_PAD = 12;
const PAUSE_BTN = { x: 0, y: 0, w: 36, h: 36 };
const PAUSE_EXIT_BTN = { x: 0, y: 0, w: 0, h: 0 };

// Lives / score / combo
let lives = PLAYER_CONFIG.maxLives;
let score = 0, totalKills = 0, highScore = 0;
try { highScore = parseInt(localStorage.getItem("booha_hiscore") || "0") || 0; } catch (_) {}

let combo = 0, comboTimer = 0, comboDisplay = 0, comboPop = 0;

// Friends
const activeFriends = [];
const _seenFriends = new Set();
// Populate img field at load time (runtime-only, not in data file)
const FRIENDS_RUNTIME = FRIENDS_UNLOCK.map(fd => ({ ...fd, img: null }));

// Weapon
let timedWeapon = { level: 0, remaining: 0 };

// BG / overlay
let bgHue = 240;
let bgOverlay = { h:240,s:60,l:30,a:0, th:240,ts:60,tl:30,ta:0 };

// Boss cinematic
let bossCinematic = { active: false, t: 0, phase: "", bossRef: null };

// Milestone
let milestoneAnim = { active: false, t: 0, wave: 0, text: "", subtext: "" };

// Flash
let screenFlash = { alpha: 0, color: "#fff" };

// Shield
let playerShield = 0;

// Hit stop — brief game freeze on kills
let hitStopTimer = 0;

// ════════════════════════════════════════
// VIEWPORT
// ════════════════════════════════════════
function vW() { return Math.floor(window.visualViewport?.width ?? window.innerWidth); }
function vH() { return Math.floor(window.visualViewport?.height ?? window.innerHeight); }
function W()  { return vW(); }
function H()  { return vH(); }
function U()  { return Math.min(vW(), vH()); }
function isLandscape() { return vW() > vH(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b)     { return a + Math.random() * (b - a); }
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function computeGameScale() {
  if (!isLandscape()) return 1;
  const u = U();
  if (u <= 430) return 0.58;
  if (u <= 520) return 0.62;
  return 1;
}
function worldScale() { return started ? LOCKED_SCALE : GAME_SCALE; }

function updateSafeArea() {
  const s = getComputedStyle(document.documentElement);
  SAFE.top   = parseInt(s.getPropertyValue("--safe-top")) || 0;
  SAFE.right = parseInt(s.getPropertyValue("--safe-right")) || 0;
}
(function () {
  const st = document.createElement("style");
  st.textContent = ":root{--safe-top:env(safe-area-inset-top);--safe-right:env(safe-area-inset-right);}";
  document.head.appendChild(st);
})();

function resize() {
  if (started && !paused) return;
  const vw = vW(), vh = vH();
  DPR = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  canvas.style.width  = vw + "px";
  canvas.style.height = vh + "px";
  canvas.width  = Math.floor(vw * DPR);
  canvas.height = Math.floor(vh * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const gw = document.getElementById("gameWrap");
  if (gw) gw.style.transform = `translate(${window.visualViewport?.offsetLeft||0}px,${window.visualViewport?.offsetTop||0}px)`;
}

if (window.visualViewport) {
  visualViewport.addEventListener("resize", resize, { passive: true });
  visualViewport.addEventListener("scroll", resize, { passive: true });
}
addEventListener("resize", () => { scheduleOrientationGate(); updateSafeArea(); });
addEventListener("orientationchange", () => { scheduleOrientationGate(); updateSafeArea(); });
updateSafeArea();

// ════════════════════════════════════════
// ORIENTATION GATE
// ════════════════════════════════════════
const rotateOverlay = document.getElementById("rotateOverlay");

function updateOrientationGate() {
  if (!IS_COARSE) {
    if (rotateOverlay) rotateOverlay.style.display = "none";
    _needRotateLast = false;
    if (!started) GAME_SCALE = computeGameScale();
    return;
  }
  if (!started) GAME_SCALE = computeGameScale();
  const need = !isLandscape();
  if (need === _needRotateLast) return;
  _needRotateLast = need;
  if (rotateOverlay) rotateOverlay.style.display = need ? "flex" : "none";
  if (started) {
    if (need) { paused = true;  pauseAllMusic(); }
    else      { paused = false; resumeAllMusic(); }
  }
}
function scheduleOrientationGate() {
  clearTimeout(_gateTimer);
  _gateTimer = setTimeout(() => { updateSafeArea(); updateOrientationGate(); }, 120);
}
scheduleOrientationGate();

// ════════════════════════════════════════
// AUDIO
// ════════════════════════════════════════
function audioNow() { return audioCtx ? audioCtx.currentTime : 0; }

function ensureAudio() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioContextCtor && !audioCtx) {
      audioCtx = new AudioContextCtor();
      audioMaster = audioCtx.createGain();
      audioMaster.gain.value = 0.52;
      audioMaster.connect(audioCtx.destination);
    }
    if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
    audioReady = true;
  } catch (_) {
    audioReady = false;
  }
}

function playTone(kind) {
  if (!audioReady || !audioCtx || !audioMaster) return;
  const now = audioNow();
  const settings = {
    fire:     { freq: 420, end: 180, dur: 0.055, type: "square", gain: 0.045 },
    weakFire: { freq: 270, end: 120, dur: 0.045, type: "triangle", gain: 0.030 },
    hit:      { freq: 180, end: 95,  dur: 0.075, type: "square", gain: 0.060 },
    kill:     { freq: 520, end: 760, dur: 0.11,  type: "triangle", gain: 0.070 },
    rock:     { freq: 110, end: 65,  dur: 0.12,  type: "sawtooth", gain: 0.075 },
    player:   { freq: 150, end: 55,  dur: 0.20,  type: "sawtooth", gain: 0.11  },
    boss:     { freq: 90,  end: 42,  dur: 0.32,  type: "sawtooth", gain: 0.13  },
    pickup:   { freq: 620, end: 980, dur: 0.16,  type: "triangle", gain: 0.085 },
  }[kind];
  if (!settings) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = settings.type;
    osc.frequency.setValueAtTime(settings.freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, settings.end), now + settings.dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(settings.gain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.dur);
    osc.connect(gain); gain.connect(audioMaster);
    osc.start(now); osc.stop(now + settings.dur + 0.02);
  } catch (_) {}
}

function playSfx(kind) {
  ensureAudio();
  if (kind === "fire" || kind === "weakFire") {
    const now = performance.now();
    if (now - lastFireSfxAt < 85) return;
    lastFireSfxAt = now;
  }
  playTone(kind);
}

function playAudioElement(el) {
  if (!el || !audioReady || paused) return;
  const promise = el.play();
  if (promise?.catch) {
    promise.catch(() => {
      clearTimeout(audioRetryTimer);
      audioRetryTimer = setTimeout(() => {
        if (started && !paused) playAudioElement(el);
      }, 900);
    });
  }
}

function pauseAllMusic() {
  try { if (bgm    && !bgm.paused)    bgm.pause();    } catch (_) {}
  try { if (bossBgm && !bossBgm.paused) bossBgm.pause(); } catch (_) {}
}
function resumeAllMusic() {
  ensureAudio();
  try {
    if (bossAlive && bossBgm) { playAudioElement(bossBgm); return; }
  } catch (_) {}
  try { if (bgm) playAudioElement(bgm); } catch (_) {}
}
function setPaused(on) {
  if (paused === on) return;
  paused = on;
  if (paused) pauseAllMusic(); else resumeAllMusic();
}
function playCandySfx() {
  try {
    ensureAudio();
    if (!candySfx) { playSfx("pickup"); return; }
    const s = candySfx.cloneNode();
    s.volume = 1;
    const promise = s.play();
    if (promise?.catch) promise.catch(() => playSfx("pickup"));
  } catch (_) {}
}
function playLifeloss() {
  playSfx("player");
}
function setBossMusic(on) {
  try {
    if (on) {
      if (bgm) { bgm.pause(); bgm.currentTime = 0; }
      const src = ASSET_PATHS.bossMusic[bossMusicIdx % ASSET_PATHS.bossMusic.length];
      if (!bossBgm || bossBgm._src !== src) {
        if (bossBgm) { try { bossBgm.pause(); } catch (_) {} }
        bossBgm = new Audio(src);
        bossBgm.loop = true; bossBgm.preload = "auto"; bossBgm.volume = 0.9; bossBgm._src = src;
        bossBgm.addEventListener("error", () => {
          if (started && !paused) {
            clearTimeout(audioRetryTimer);
            audioRetryTimer = setTimeout(() => playAudioElement(bossBgm), 900);
          }
        });
      } else {
        bossBgm.pause(); bossBgm.currentTime = 0;
      }
      if (!paused) playAudioElement(bossBgm);
    } else {
      if (bossBgm) { bossBgm.pause(); bossBgm.currentTime = 0; }
      bossMusicIdx = (bossMusicIdx + 1) % ASSET_PATHS.bossMusic.length;
      if (bgm && !paused) playAudioElement(bgm);
    }
  } catch (_) {}
}

// ════════════════════════════════════════
// ASSETS
// ════════════════════════════════════════
const IMG = {};
function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload  = () => res(i);
    i.onerror = () => rej(new Error("Failed: " + src));
    i.src = src;
  });
}

// ════════════════════════════════════════
// ENTITIES
// ════════════════════════════════════════
const player = { x:0, y:0, w:80, h:80, energy:100, glow:0, hitIFrames:0, boost:0 };
const rocks = [], bugs = [], booShots = [], bugShots = [], sparkles = [], candies = [];
const droppers = [];

let booFireTimer = 0, booAutoCD = 0;
let dropperTimer = 0;
let candyTimer   = 4.5;

// Shake
let shakeX = 0, shakeY = 0, shakeDecay = 0, shakeDuration = 0;
function doShake(mag, dur) {
  const duration = dur || 0.3;
  shakeX = Math.max(shakeX, mag || 0);
  shakeY = Math.max(shakeY, mag || 0);
  shakeDecay = Math.max(shakeDecay, duration);
  shakeDuration = Math.max(shakeDuration, duration);
}
function updateShake(dt) {
  if (shakeDecay <= 0) {
    shakeX = shakeY = shakeDuration = 0;
    return;
  }
  shakeDecay = Math.max(0, shakeDecay - Math.max(0, dt));
  if (shakeDecay === 0) shakeX = shakeY = shakeDuration = 0;
}

// ════════════════════════════════════════
// WEAPON HELPERS
// ════════════════════════════════════════
function weaponLevelFromCombo(c) {
  if (c >= WEAPON_COMBO_THRESHOLDS.level4) return 4;
  if (c >= WEAPON_COMBO_THRESHOLDS.level3) return 3;
  if (c >= WEAPON_COMBO_THRESHOLDS.level2) return 2;
  return 1;
}
function weaponLevel() {
  const comboLevel = weaponLevelFromCombo(combo);
  const timedLevel = timedWeapon.remaining > 0 ? timedWeapon.level : 0;
  return clamp(Math.max(comboLevel, timedLevel), 1, 4);
}

// ════════════════════════════════════════
// CANDY WEIGHT HELPER
// ════════════════════════════════════════
function candyWeight(wave) {
  if (wave >= 15) return CANDY_WEIGHTS.chaos;
  if (wave >= 10) return CANDY_WEIGHTS.late;
  if (wave >=  5) return CANDY_WEIGHTS.mid;
  return CANDY_WEIGHTS.early;
}

// ════════════════════════════════════════
// WAVE SYSTEM
// ════════════════════════════════════════
// A brief spawn shield protects the entrance animation without making the
// first minute feel like the player is shooting at untouchable targets.
const DOTTY_SHIELD_POST = 0.65;

const WS = {
  wave:1, groupIdx:0, targetCount:0, spawned:0, killed:0, spawnTimer:0,
  phase:"intro", phaseT:0,
  skillMult:1.0, groupStartT:0, skillDisplay:1.0, skillHeat:0,
};

function parTimeSecs(count, wave) {
  const perEnemy = clamp(1.5 - wave * 0.04, 0.5, 1.5);
  return count * perEnemy;
}
function evaluateGroupSkill(count) {
  if (count <= 0) return;
  const elapsed = stageTime - WS.groupStartT;
  const par     = parTimeSecs(count, WS.wave);
  const ratio   = elapsed / Math.max(0.1, par);
  let delta;
  if (ratio < 1.0) delta = clamp((1 - ratio) * 0.30, 0, 0.30);
  else             delta = -clamp((ratio - 1) * 0.20, 0, 0.20);
  if (combo >= 15) delta += 0.08;
  else if (combo >= 7) delta += 0.04;
  WS.skillMult = clamp(WS.skillMult + delta, SKILL_CONFIG.min, SKILL_CONFIG.max);
  WS.skillHeat = clamp(WS.skillMult - 1.0, 0, 1.0);
}
function waveSpawnInterval(w) {
  const base = clamp(WAVE_SCALE.spawnIntervalBase - WAVE_SCALE.spawnIntervalDropPerWave * (w-1), WAVE_SCALE.spawnIntervalMin, 99);
  return clamp(base / Math.sqrt(WS.skillMult), WAVE_SCALE.spawnIntervalMin, 99);
}
function waveDriftSpeed(w) {
  const base = clamp(WAVE_SCALE.driftBase + WAVE_SCALE.driftGainPerWave * (w-1), 0, WAVE_SCALE.driftMax);
  return clamp(base * WS.skillMult * 0.7, 0, WAVE_SCALE.driftMax * 1.6);
}
function waveFireCooldown(w) {
  const base = clamp(WAVE_SCALE.fireCooldownBase - WAVE_SCALE.fireCooldownDropPerWave * (w-1), WAVE_SCALE.fireCooldownMin, 99);
  return clamp(base / WS.skillMult, WAVE_SCALE.fireCooldownMin * 0.7, 99);
}
function skillBonusHp() {
  for (const tier of [...SKILL_CONFIG.bonusHpTiers].reverse()) {
    if (WS.skillMult >= tier.threshold) return tier.bonus;
  }
  return 0;
}

function isBossWave(w)    { return w % BOSS_CONFIG.every === 0; }
function bossIndexForWave(w) { return Math.floor((w-1) / BOSS_CONFIG.every) + 1; }

function tierForWave(n) {
  for (const t of WAVE_TIERS) if (n >= t.from && n <= t.to) return t;
  return WAVE_TIERS[WAVE_TIERS.length - 1];
}
function tierProgress01(w) {
  const t = tierForWave(w);
  return clamp((w - t.from) / Math.max(1, t.to - t.from), 0, 1);
}
function groupCountForWave(wave, gi) {
  const tier  = tierForWave(wave);
  const base  = tier.groups[gi] ?? tier.groups[tier.groups.length - 1];
  const tp    = tierProgress01(wave);
  const w     = wave;
  const addMax = w <= 4 ? 0 : w <= 10 ? 4 : w <= 20 ? 8 : w <= 30 ? 12 : 16;
  return base + Math.round(tp * addMax);
}
function isMilestoneWave(w) {
  return MILESTONE_WAVES.has(w) && !isBossWave(w);
}

function spawnRocks(wave) {
  wave = wave || 1;
  rocks.length = 0;
  const rCount = ROCK_CONFIG.count;
  const rw = clamp(U() * 0.34, 80, 150) * worldScale();
  const rh = rw * 0.72;
  const gap = Math.max(10, (W() - rCount * rw) / (rCount + 1));
  const rPad = (IS_COARSE && isLandscape())
    ? clamp(U() * 0.10, 10, 30) * worldScale()
    : clamp(U() * 0.18, 24, 60) * worldScale();
  const ry = player.y - rh - rPad;
  const hp = clamp(ROCK_CONFIG.baseHp + wave * ROCK_CONFIG.hpGainPerWave, ROCK_CONFIG.baseHp, ROCK_CONFIG.maxHp);
  for (let i = 0; i < rCount; i++) {
    rocks.push({ x: gap + i * (rw + gap), y: ry, w: rw, h: rh, hp, maxHp: hp, hitT: 0 });
  }
}

function startWave(n) {
  WS.wave = n;
  WS.groupIdx = 0; WS.phaseT = 0; WS.phase = "intro";
  WS.skillMult = clamp(WS.skillMult * SKILL_CONFIG.carryMult + SKILL_CONFIG.carryAdd, SKILL_CONFIG.min, SKILL_CONFIG.max);
  bgHue = (220 + n * 8) % 360;
  updateFriendUnlocks(n);
  spawnRocks(n);
  droppers.length = 0;
  dropperTimer = dropperSpawnInterval(n) + rand(2, 5);
  if (n > 1 && isMilestoneWave(n)) triggerMilestone(n);
  beginGroup();
}
function beginGroup() {
  WS.spawned = 0; WS.killed = 0;
  WS.targetCount = groupCountForWave(WS.wave, WS.groupIdx);
  WS.spawnTimer = 0;
  WS.groupStartT = stageTime;
}
function advanceGroupOrBoss() {
  evaluateGroupSkill(WS.targetCount);
  WS.groupIdx++;
  if (WS.groupIdx >= 4) {
    if (!bossAlive) {
      if (isBossWave(WS.wave)) {
        WS.phase = "boss_cinematic";
        WS.phaseT = 0;
        bugs.length = 0; bugShots.length = 0; booShots.length = 0;
        triggerBossCinematic();
        return;
      }
      WS.phase = "run_done"; return;
    }
    WS.phase = "run_done"; return;
  }
  beginGroup();
}

function updateWaveSystem(dt) {
  dt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.05) : 1/60;
  if (!WS || WS.wave < 1) WS.wave = 1;
  WS.phaseT += dt;
  WS.skillDisplay += (WS.skillMult - WS.skillDisplay) * Math.min(1, dt * 3);
  WS.skillHeat = clamp(WS.skillMult - 1.0, 0, 1.0);

  if (WS.phase === "boss_cinematic") return;
  if (WS.phase === "boss") {
    const boss = bugs.find(b => b.alive && b.isBoss);
    if (!boss) { setBossMusic(false); bossAlive = false; WS.phase = "run_done"; }
    return;
  }
  if (WS.phase === "run_done") { if (WS.phaseT > 1.5) startWave(WS.wave + 1); return; }
  if (WS.phase === "intro")    { if (WS.phaseT >= WAVE_SCALE.introDelaySec) { WS.phase = "card"; WS.phaseT = 0; } return; }
  if (WS.phase === "card")     { if (WS.phaseT >= WAVE_SCALE.waveCardSec)   { WS.phase = "run";  WS.phaseT = 0; WS.spawnTimer = 0; } return; }
  if (WS.phase === "run") {
    if (WS.targetCount > 0 && WS.spawned < WS.targetCount) {
      WS.spawnTimer -= dt;
      if (WS.spawnTimer <= 0) { spawnBug(); WS.spawned++; WS.spawnTimer = waveSpawnInterval(WS.wave); }
    }
    if (WS.targetCount > 0 && WS.killed >= WS.targetCount) advanceGroupOrBoss();
  }
}

// ════════════════════════════════════════
// BOSS CINEMATIC
// ════════════════════════════════════════
function triggerBossCinematic() {
  bossCinematic.active = true;
  droppers.length = 0;
  bossCinematic.t = 0;
  bossCinematic.phase = "flash";
  screenFlash.alpha = 1;
  screenFlash.color = `hsl(${(bgHue + 120) % 360},100%,70%)`;
  doShake(SHAKE_CONFIG.bossCinematic.mag, SHAKE_CONFIG.bossCinematic.dur);
  pauseAllMusic();
}
function updateBossCinematic(dt) {
  if (!bossCinematic.active) return;
  bossCinematic.t += dt;
  if (bossCinematic.phase === "flash" && bossCinematic.t > 0.3) bossCinematic.phase = "text";
  if (bossCinematic.phase === "text"  && bossCinematic.t > 1.8) {
    bossCinematic.phase = "spawn";
    spawnBossDotty();
    setBossMusic(true);
  }
  if (bossCinematic.phase === "spawn" && bossCinematic.t > BOSS_CONFIG.cinematicDur) {
    bossCinematic.active = false;
    WS.phase = "boss";
    bossAlive = true;
  }
}

// ════════════════════════════════════════
// MILESTONE
// ════════════════════════════════════════
function triggerMilestone(wave) {
  const entry = MILESTONE_TEXT[wave] || { en: `WAVE ${wave}!`, jp: "すごい！ / Amazing!" };
  milestoneAnim.active  = true;
  milestoneAnim.t       = 0;
  milestoneAnim.wave    = wave;
  milestoneAnim.text    = entry.en;
  milestoneAnim.subtext = entry.jp;
  screenFlash.alpha = 0.7;
  screenFlash.color = "rgba(255,220,80,1)";
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      for (let j = 0; j < 12; j++) {
        const a   = Math.random() * Math.PI * 2;
        const spd = rand(80, 300);
        sparkles.push({
          x: rand(W() * 0.2, W() * 0.8), y: rand(H() * 0.2, H() * 0.6),
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          life: 0, ttl: rand(0.4, 0.9), size: rand(3, 8),
          kind: ["gold","pink","friend","boss"][Math.floor(Math.random()*4)],
        });
      }
    }, i * 120);
  }
}

// ════════════════════════════════════════
// FRIEND UNLOCKS
// ════════════════════════════════════════
function updateFriendUnlocks(wave) {
  for (const fd of FRIENDS_RUNTIME) {
    if (wave >= fd.wave && !activeFriends.find(f => f.id === fd.id)) {
      activeFriends.push({
        id: fd.id, img: fd.img, color: fd.color, shotColor: fd.shotColor,
        x: player.x||0, y: player.y||0, w: 0, h: 0,
        fireCD: rand(0.6, 1.2), angle: 0, orbitR: 0,
        joinAnim: 0, glow: 0.5, alive: true,
      });
      if (!_seenFriends.has(fd.id)) {
        _seenFriends.add(fd.id);
        const names   = { blue:"Blue-Boo joined!",  green:"Green-Boo joined!",  pink:"Pink-Boo joined!",   purple:"Purple-Boo joined!"  };
        const namesJP = { blue:"ブルー・ブーが なかまになった！", green:"グリーン・ブーが なかまになった！", pink:"ピンク・ブーが なかまになった！", purple:"パープル・ブーが なかまになった！" };
        window._friendToast = { msg: `${names[fd.id]||fd.id} ／ ${namesJP[fd.id]||""}`, color: fd.color, t: 4.0 };
        screenFlash.alpha = 0.25; screenFlash.color = fd.color;
      }
    }
  }
}

function updateFriends(dt) {
  const cx = player.x + player.w / 2;
  const n  = activeFriends.length;
  const isMoving = playerMoving;
  activeFriends.forEach((f, i) => {
    if (!f.alive) return;
    if (f.joinAnim < 1) f.joinAnim = Math.min(1, f.joinAnim + dt * 0.8);
    const orbitSpeedMult = isMoving ? 0.55 : 1.2;
    const orbitRMult     = isMoving ? 1.5  : 0.85;
    f.orbitR  = clamp((player.w * 0.90 + i * player.w * 0.52) * orbitRMult, 40, 220);
    f.angle  += (0.9 + i * 0.22) * dt * orbitSpeedMult;
    const forwardLean = isMoving ? 0 : clamp((combo-7)/20, 0, 1) * player.h * 0.6;
    const targetX  = cx + Math.cos(f.angle + i * Math.PI*2/n) * f.orbitR - f.w/2;
    const targetY  = (player.y + player.h/2) + Math.sin(f.angle + i * Math.PI*2/n) * f.orbitR * 0.45 - f.h/2 - forwardLean;
    const easeSpeed = isMoving ? 0.10 : 0.22;
    const ease      = f.joinAnim;
    f.x = f.x + (targetX - f.x) * easeSpeed * ease;
    f.y = f.y + (targetY - f.y) * easeSpeed * ease;
    f.w = player.w * 0.72; f.h = f.w;
    f.glow = Math.max(0, f.glow - dt*2);
    const fireRateMult = (!isMoving && combo >= 7) ? 0.65 : 1.0;
    f.fireCD = Math.max(0, f.fireCD - dt);
    if (f.fireCD <= 0 && bugs.some(b => b.alive)) {
      fireFriendShot(f);
      f.fireCD = rand(0.5, 1.1) * fireRateMult;
      f.glow   = 0.22;
    }
  });
}

function fireFriendShot(f) {
  const sm  = shotScale();
  const cx  = f.x + f.w/2;
  const wl  = weaponLevel();
  const angles = wl >= 3 ? [-300,-150,0,150,300] : wl >= 2 ? [-200,0,200] : [0];
  for (const vx of angles) {
    booShots.push({ x:cx, y:f.y, vx:vx*sm, vy:-950*sm, isPink:true, isFriend:true, color:f.shotColor||"#a8e8ff", dead:false });
  }
}

// ════════════════════════════════════════
// FORMATIONS
// ════════════════════════════════════════
function canPlaceTarget(tx, ty, bw, bh) {
  for (const b of bugs) {
    if (!b.alive) continue;
    if (Math.abs(tx - (b.tx??b.x)) < bw*0.9 && Math.abs(ty - (b.ty??b.y)) < bh*0.5) return false;
  }
  return true;
}

function pickFormationSlot(bw, bh, groupIdx, spawnedInGroup, totalInGroup) {
  const lanes = 6;
  const laneW = W() / lanes;
  const mobileYOff = (IS_COARSE && isLandscape()) ? -U() * 0.04 : 0;
  const baseY = clamp(U() * 0.18 + mobileYOff, 62, 130);
  const rows  = [baseY, baseY + bh*0.70, baseY + bh*1.30, baseY + bh*2.0];
  const pad   = 8;
  function cx(tx) { return clamp(tx, pad, W()-bw-pad); }
  const formation = groupIdx % 4;
  if (formation === 0) {
    const lane = spawnedInGroup % lanes;
    const tx   = cx(lane * laneW + laneW*0.5 - bw/2);
    const ty   = rows[Math.floor(spawnedInGroup/lanes) % rows.length];
    if (canPlaceTarget(tx, ty, bw, bh)) return { tx, ty };
  } else if (formation === 1) {
    const spread = spawnedInGroup - totalInGroup/2;
    const tx = cx(W()/2 + spread * (laneW*0.85) - bw/2);
    const ty = rows[0] + Math.abs(spread) * bh * 0.55;
    if (canPlaceTarget(tx, ty, bw, bh)) return { tx, ty };
  } else if (formation === 2) {
    const side = spawnedInGroup % 2 === 0 ? 0 : 1;
    const idx  = Math.floor(spawnedInGroup / 2);
    const tx   = cx(side === 0 ? laneW*idx + laneW*0.5 - bw/2 : W() - laneW*(idx+1) + laneW*0.5 - bw/2);
    const ty   = rows[idx % rows.length];
    if (canPlaceTarget(tx, ty, bw, bh)) return { tx, ty };
  } else {
    const tx = cx((spawnedInGroup * laneW * 0.85) % (W()-bw));
    const ty = rows[spawnedInGroup % rows.length];
    if (canPlaceTarget(tx, ty, bw, bh)) return { tx, ty };
  }
  for (let t = 0; t < 20; t++) {
    const lane = (Math.random() * lanes)|0;
    const tx   = cx(lane * laneW + laneW/2 - bw/2);
    const ty   = rows[(Math.random() * rows.length)|0] + rand(0, 18);
    if (canPlaceTarget(tx, ty, bw, bh)) return { tx, ty };
  }
  return { tx: cx(W()*0.5 - bw*0.5), ty: rows[0] };
}

function spawnBug() {
  const bw = clamp(U() * 0.16, 36, 72) * worldScale();
  const bh = bw;
  const slot = pickFormationSlot(bw, bh, WS.groupIdx, WS.spawned, WS.targetCount);
  const { tx, ty } = slot;
  const startX    = clamp(tx + rand(-W()*0.06, W()*0.06), 4, W()-bw-4);
  const startY    = -bh - rand(20, 100);
  const enterDur  = rand(0.8, 1.2);
  const tp = tierProgress01(WS.wave);
  let hp = 1;
  if (WS.wave >= 3 && tp > 0.30) hp = 2;
  if (WS.wave >= 4 && tp > 0.75) hp = 3;
  if (WS.wave >= 5 && WS.groupIdx >= 2) hp += 1;
  hp += skillBonusHp();
  hp = clamp(hp, 1, 7);
  const tintHue = (bgHue + WS.groupIdx * 30) % 360;
  bugs.push({
    x:startX, y:startY, w:bw, h:bh, alive:true,
    hp, maxHp:hp, tintHue,
    enterT:0, enterDur,
    shieldT: enterDur + DOTTY_SHIELD_POST,
    hasShotOnce:false,
    sx:startX, sy:startY, tx, ty,
    bob: rand(0,10),
    driftSpeed: waveDriftSpeed(WS.wave),
    fireCD: rand(waveFireCooldown(WS.wave)*0.75, waveFireCooldown(WS.wave)*1.1),
    glow:0, shakeT:0, shakeMag:0,
    panicking:false, panicT:0,
    hurtFlash:0,
    isBoss:false,
  });
}

// ════════════════════════════════════════
// DROPPERS
// ════════════════════════════════════════
function dropperSpawnInterval(wave) {
  return clamp(DROPPER_CONFIG.intervalBase - wave * DROPPER_CONFIG.intervalDropPerWave, DROPPER_CONFIG.intervalMin, DROPPER_CONFIG.intervalBase);
}
function spawnDropper() {
  if (!started || WS.phase !== "run") return;
  const sm = worldScale();
  const sz = clamp(U() * 0.11, 24, 44) * sm;
  const px = player.x + player.w/2;
  const spread = rand(-DROPPER_CONFIG.aimSpread, DROPPER_CONFIG.aimSpread) * W();
  const tx = clamp(px + spread, sz, W()-sz);
  droppers.push({ x: rand(sz*2, W()-sz*2), y:-sz, tx, w:sz, h:sz, vy:rand(DROPPER_CONFIG.fallSpeedMin, DROPPER_CONFIG.fallSpeedMax), vx:0, dead:false, glowT:0 });
}
function updateDroppers(dt) {
  if (!started) return;
  if (WS.wave >= DROPPER_CONFIG.startWave && WS.phase === "run" && !bossAlive) {
    dropperTimer = Math.max(0, dropperTimer - dt);
    if (dropperTimer <= 0) { spawnDropper(); dropperTimer = dropperSpawnInterval(WS.wave); }
  }
  for (const d of droppers) {
    if (d.dead) continue;
    d.glowT += dt;
    const dx = d.tx - d.x;
    d.vx += (dx * 2.2 - d.vx) * Math.min(1, dt * 3.5);
    d.x  += d.vx * dt;
    d.y  += d.vy * dt;
    d.x   = clamp(d.x, 0, W()-d.w);
    for (const r of rocks) {
      if (r.hp <= 0) continue;
      if (aabb(d.x, d.y, d.w, d.h, r.x, r.y, r.w, r.h)) {
        r.hp = Math.max(0, r.hp - DROPPER_CONFIG.rockDamage);
        r.hitT = 0.28;
        d.dead = true;
        addBigExplosion(r.x + r.w/2, r.y + r.h/2, "boss");
        playSfx("rock");
        doShake(SHAKE_CONFIG.dropperRock.mag, SHAKE_CONFIG.dropperRock.dur);
        screenFlash.alpha = 0.25; screenFlash.color = "#ff8844";
        break;
      }
    }
    if (!d.dead && player.hitIFrames <= 0) {
      if (aabb(d.x, d.y, d.w, d.h, player.x, player.y, player.w, player.h)) {
        d.dead = true;
        player.energy = Math.max(0, player.energy - DROPPER_CONFIG.playerDamage);
        player.hitIFrames = 0.6; player.boost = 0;
        breakCombo();
        addSpark(player.x + player.w/2, player.y + player.h/2, 16, "boss");
        playSfx("player");
        doShake(SHAKE_CONFIG.dropperPlayer.mag, SHAKE_CONFIG.dropperPlayer.dur);
        screenFlash.alpha = 0.4; screenFlash.color = "#ff2244";
        if (player.energy <= 0) {
          lives--;
          if (lives > 0) { player.energy = PLAYER_CONFIG.respawnEnergy; player.hitIFrames = PLAYER_CONFIG.respawnIFrames; playLifeloss(); doShake(SHAKE_CONFIG.lifeLoss.mag, SHAKE_CONFIG.lifeLoss.dur); screenFlash.alpha = 0.9; screenFlash.color = "#ff0000"; bugShots.length = 0; }
        }
      }
    }
    if (d.y > H() + d.h) d.dead = true;
  }
  for (let i = droppers.length-1; i >= 0; i--) if (droppers[i].dead) droppers.splice(i, 1);
}

// ════════════════════════════════════════
// BOSS
// ════════════════════════════════════════
function spawnBossDotty() {
  const baseW = clamp(U() * 0.16, 36, 72) * worldScale();
  const k     = bossIndexForWave(WS.wave);
  const scale = BOSS_CONFIG.baseSize + (k-1) * BOSS_CONFIG.sizeGrowth;
  const bw    = baseW * scale, bh = bw;
  const ty    = clamp(U() * 0.18 + ((IS_COARSE && isLandscape()) ? -U()*0.05 : 0), 90, 190);
  const tx    = W()/2 - bw/2;
  const hp    = BOSS_CONFIG.baseHp + (k-1) * BOSS_CONFIG.hpGainPerBoss;
  bugs.push({
    x: W()/2 - bw/2, y: -bh - 40,
    w: bw, h: bh, alive: true, isBoss: true,
    hp, maxHp: hp, phase: 1, hitsTaken: 0,
    shotDmg: 3 + (k-1),
    enterT: 0, enterDur: 2.2,                   // slower descent than normal bugs
    shieldT: 2.2 + DOTTY_SHIELD_POST,
    hasShotOnce: false,
    sx: W()/2 - bw/2, sy: -bh - 40, tx, ty,
    bob: rand(0, 10),
    driftSpeed: waveDriftSpeed(WS.wave),
    fireCD: 0.5,
    glow: 0.6,                                   // already glowing on entry
    shakeT: 0, shakeMag: 0,
    moveDir: 1, moveSpeed: 0,
    atkPattern: 0, atkTimer: 0,
    tintHue: bgHue,
    hurtFlash: 0,
    _landingShakeDone: false,                    // landing shake fires once on arrival
  });
}

// ════════════════════════════════════════
// FX
// ════════════════════════════════════════
function addSpark(x, y, n=3, kind="gold") {
  if (sparkles.length > 200) return;
  for (let i = 0; i < n; i++) {
    sparkles.push({ x, y, vx:rand(-140,140), vy:rand(-180,50), life:0, ttl:rand(0.16,0.36), size:rand(1.2,3.0), kind });
  }
}
function addBigExplosion(x, y, color="gold") {
  for (let i = 0; i < 36; i++) {
    const a   = Math.random() * Math.PI * 2;
    const spd = rand(80, 320);
    sparkles.push({ x, y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, life:0, ttl:rand(0.3,0.8), size:rand(3,7), kind:color });
  }
}
function dropCandy(forcedType) {
  const pool = candyWeight(WS.wave);
  const type = forcedType || pool[Math.floor(Math.random() * pool.length)];
  candies.push({ x:rand(60, W()-60), y:-30, vx:rand(-25,25), vy:rand(65,95), spin:rand(-2,2), type, dead:false });
}

// ════════════════════════════════════════
// SHOOTING
// ════════════════════════════════════════
function shotScale()  { return (IS_COARSE && isLandscape() && GAME_SCALE < 0.999) ? GAME_SCALE : 1; }
function candyScale() { return shotScale(); }

function nearestBugLean(x0) {
  let best = null, bestD = Infinity;
  for (const b of bugs) {
    if (!b.alive || b.isBoss) continue;
    const dx = (b.x + b.w/2) - x0;
    const d  = Math.abs(dx) + (b.y < 0 ? 99999 : 0);
    if (d < bestD) { bestD = d; best = b; }
  }
  if (!best) return 0;
  return clamp(((best.x + best.w/2) - x0) * 0.15, -200, 200);
}

function fireBooShot(isMoving) {
  const sm   = shotScale();
  const x0   = player.x + player.w/2;
  const y0   = player.y + 6;
  const wl   = weaponLevel();
  const vy   = -920 * sm * (isMoving ? 0.80 : 1.0);
  const lean = clamp(nearestBugLean(x0) * 0.4, -80, 80) * sm;
  function spawn(vx, col, pink) {
    booShots.push({ x:x0, y:y0, vx, vy, isPink:pink||false, isFriend:false, color:col||null, dead:false, isWeak:isMoving });
  }
  if (isMoving) { spawn(lean, null, false); }
  else if (wl <= 1) { spawn(lean, null, false); }
  else if (wl === 2) { spawn(lean,null,false); spawn(-130*sm+lean*0.3,null,false); spawn(130*sm+lean*0.3,null,false); }
  else if (wl === 3) { spawn(lean,null,true); spawn(-170*sm,null,true); spawn(170*sm,null,true); spawn(-85*sm,null,false); spawn(85*sm,null,false); }
  else {
    const cols = ["#ffcc44","#ff66cc","#66ffcc","#cc88ff","#ffaa44","#ff4444","#44ffcc"];
    for (let i = 0; i < 7; i++) spawn(((i-3)*38 + lean*0.2)*sm, cols[i%cols.length], true);
  }
  playSfx(isMoving ? "weakFire" : "fire");
  player.glow = isMoving ? 0.05 : 0.15;
  booFireTimer = 0.12;
}

function canFireNormal() { return booShots.filter(s => !s.isFriend).length === 0; }

function updateFiring(dt) {
  booFireTimer = Math.max(0, booFireTimer - dt);
  if (!started) return;
  if (player.energy <= 0 || paused) return;
  booAutoCD = Math.max(0, booAutoCD - dt);
  if (booAutoCD > 0) return;
  const isMoving = playerMoving;
  if (!isMoving && !canFireNormal()) return;
  fireBooShot(isMoving);
  const comboSpeedup = clamp(combo / 50, 0, 0.45);
  const stillBonus   = isMoving ? 0 : 0.04;
  const cd = clamp(0.48 - comboSpeedup * 0.20 - stillBonus, 0.18, 0.48);
  booAutoCD = isMoving ? cd * 1.45 : cd;
}

function fireBugShot(b) {
  const sm = shotScale();
  bugShots.push({ x:b.x+b.w/2, y:b.y+b.h+6, vx:rand(-60,60)*sm, vy:rand(250,340)*sm, r:rand(7,10)*sm, t:0, dead:false, dmg:b.shotDmg||10 });
  b.glow = 0.20;
}
function fireBossSpread(b) {
  const cx = b.x + b.w/2, cy = b.y + b.h;
  const phase = b.phase;
  const count = phase >= 3 ? 9 : phase === 2 ? 7 : 5;
  const mob   = IS_COARSE ? 0.60 : 1;
  const spd   = (phase >= 3 ? 420 : phase === 2 ? 360 : 290) * mob;
  const span  = Math.PI * (phase >= 3 ? 0.88 : 0.65);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count-1);
    const a = -span/2 + t*span;
    bugShots.push({ x:cx, y:cy, vx:Math.sin(a)*spd, vy:Math.cos(a)*spd, r:9*(IS_COARSE?0.70:1), t:0, dead:false, dmg:b.shotDmg||15 });
  }
  b.glow = 0.40;
}
function fireBossSpiral(b) {
  const cx  = b.x + b.w/2, cy = b.y + b.h/2;
  const spd = 260 * (IS_COARSE ? 0.6 : 1);
  b._spiralAngle = (b._spiralAngle || 0) + Math.PI/6;
  for (let i = 0; i < 12; i++) {
    const a = b._spiralAngle + i * (Math.PI*2/12);
    bugShots.push({ x:cx, y:cy, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd, r:7*(IS_COARSE?0.7:1), t:0, dead:false, dmg:b.shotDmg||12 });
  }
  b.glow = 0.30;
}

// ════════════════════════════════════════
// COMBO
// ════════════════════════════════════════
function registerKill(points) {
  combo++;
  comboTimer   = COMBO_CONFIG.decaySeconds;
  comboPop     = 1;
  comboDisplay = combo;
  const mult   = 1 + Math.floor(combo/5) * 0.5;
  const earned = Math.round((points||10) * mult);
  score       += earned;
  totalKills++;
  window._scorePopups = window._scorePopups || [];
  window._scorePopups.push({ x:player.x+player.w/2, y:player.y-10, val:`+${earned}`, t:1.2, life:0 });
}
function breakCombo() {
  if (combo > 0) { combo = 0; comboTimer = 0; comboDisplay = 0; }
}

// ════════════════════════════════════════
// EASING
// ════════════════════════════════════════
function easeOutCubic(t)   { return 1 - Math.pow(1-t, 3); }
function easeInCubic(t)    { return t*t*t; }
function easeInOutSine(t)  { return -(Math.cos(Math.PI*t) - 1) / 2; }
function easeOutBack(t)    { const c=1.70158,p=c+1; return 1+p*Math.pow(t-1,3)+c*Math.pow(t-1,2); }

// ════════════════════════════════════════
// MAIN UPDATE
// ════════════════════════════════════════
function update(dt) {
  if (player.energy <= 0) return;
  stageTime += dt;

  for (const r of rocks) r.hitT = Math.max(0, (r.hitT || 0) - dt);

  // Timed weapon countdown
  if (timedWeapon.remaining > 0) {
    timedWeapon.remaining = Math.max(0, timedWeapon.remaining - dt);
    if (timedWeapon.remaining === 0) timedWeapon.level = 0;
  }

  // Combo decay
  if (combo > 0) { comboTimer -= dt; if (comboTimer <= 0) breakCombo(); }
  comboPop = Math.max(0, comboPop - dt*7);

  // Screen flash decay
  if (screenFlash.alpha > 0) screenFlash.alpha = Math.max(0, screenFlash.alpha - dt*4);

  // BG overlay smooth
  if (bossAlive || bossCinematic.active) {
    const phase = bugs.find(b => b.alive && b.isBoss)?.phase || 1;
    bgOverlay.th = phase >= 3 ? 0 : phase === 2 ? 15 : 350;
    bgOverlay.ts = 90; bgOverlay.tl = 25; bgOverlay.ta = 0.22;
  } else if (milestoneAnim.active) {
    bgOverlay.th = 45; bgOverlay.ts = 90; bgOverlay.tl = 40; bgOverlay.ta = 0.16;
  } else {
    bgOverlay.th = bgHue; bgOverlay.ts = 65; bgOverlay.tl = 28; bgOverlay.ta = 0.13;
  }
  const ols = Math.min(1, dt * 1.2);
  bgOverlay.h += (bgOverlay.th - bgOverlay.h) * ols;
  bgOverlay.s += (bgOverlay.ts - bgOverlay.s) * ols;
  bgOverlay.l += (bgOverlay.tl - bgOverlay.l) * ols;
  bgOverlay.a += (bgOverlay.ta - bgOverlay.a) * ols;

  // Shield decay
  if (playerShield > 0) playerShield = Math.max(0, playerShield - dt);

  // Boss cinematic freeze
  if (bossCinematic.active) { updateBossCinematic(dt); updateParticles(dt); return; }

  // Milestone timer
  if (milestoneAnim.active) {
    milestoneAnim.t += dt;
    if (milestoneAnim.t > 3.5) milestoneAnim.active = false;
  }

  // Player movement
  const prevX = player.x;
  if (pointerX !== null) {
    const tgt = pointerX - dragOffsetX - player.w/2;
    const pad = IS_COARSE ? 6 : 10;
    const tx  = clamp(tgt, pad, W() - player.w - pad);
    if (IS_COARSE) player.x += (tx - player.x) * 0.35;
    else           player.x  = tx;
  } else {
    if (keys.has("ArrowLeft")  || keys.has("a") || keys.has("A")) player.x -= 430 * dt;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) player.x += 430 * dt;
    if (pointerX === null && TILT_ENABLED) {
      let g = tiltSmooth - tiltBaseline;
      if (Math.abs(g) < TILT_CONFIG.deadZone) g = 0;
      else g = g > 0 ? g - TILT_CONFIG.deadZone : g + TILT_CONFIG.deadZone;
      g = clamp(g, -TILT_CONFIG.maxAngle, TILT_CONFIG.maxAngle);
      const tv   = Math.sign(g / TILT_CONFIG.maxAngle) * Math.pow(Math.abs(g / TILT_CONFIG.maxAngle), 0.65) * TILT_CONFIG.speed;
      const resp = 18; const a = 1 - Math.exp(-resp * dt);
      tiltVx += (tv - tiltVx) * a;
      if (tv === 0) tiltVx = 0;
      player.x = clamp(player.x + tiltVx * dt, 0, W() - player.w);
    }
  }
  player.x = clamp(player.x, 0, W() - player.w);
  playerMoving = Math.abs(player.x - prevX) > 0.35;
  player.y = H() - player.h - 14;
  player.glow        = Math.max(0, player.glow - dt*2.5);
  player.hitIFrames  = Math.max(0, player.hitIFrames - dt);

  // Score popups
  if (window._scorePopups) {
    for (const p of window._scorePopups) { p.life += dt; p.y -= 40*dt; }
    window._scorePopups = window._scorePopups.filter(p => p.life < p.t);
  }

  // Candy timer
  candyTimer -= dt;
  if (candyTimer <= 0 && candies.length === 0) {
    dropCandy();
    candyTimer = rand(CANDY_CONFIG.spawnInterval[0], CANDY_CONFIG.spawnInterval[1]);
  }

  updateFriends(dt);

  // Bugs
  const driftNow = clamp(10 + (stageTime - 18) / 40 * 28, 10, 50);
  for (const b of bugs) {
    if (!b.alive) continue;
    b.shieldT  = Math.max(0, b.shieldT - dt);
    b.glow     = Math.max(0, b.glow - dt*2);
    b.shakeT   = Math.max(0, (b.shakeT||0) - dt);
    if ((b.hurtFlash||0) > 0) b.hurtFlash = Math.max(0, b.hurtFlash - dt);
    b.bob     += dt;

    if (b.isBoss) {
      const pct = b.hp / b.maxHp;
      if (b.phase === 1 && pct <= 0.60) { b.phase=2; doShake(SHAKE_CONFIG.bossPhase.mag,SHAKE_CONFIG.bossPhase.dur); b.glow=0.4; screenFlash.alpha=0.3; screenFlash.color="#ff6644"; }
      if (b.phase === 2 && pct <= 0.25) { b.phase=3; doShake(SHAKE_CONFIG.bossPhase3.mag,SHAKE_CONFIG.bossPhase3.dur); b.glow=0.6; screenFlash.alpha=0.5; screenFlash.color="#ff2244"; }
    }
    if (!b.isBoss && b.panicking) {
      b.panicT = Math.max(0, b.panicT - dt);
      if (b.panicT <= 0) b.panicking = false;
    }

    if (b.enterT < b.enterDur) {
      b.enterT += dt;
      const t = clamp(b.enterT / b.enterDur, 0, 1);
      const curve = Math.sin(t * Math.PI) * (W()*0.012) * (Math.random() < 0.5 ? -1 : 1);
      b.x = b.sx + (b.tx - b.sx) * easeOutCubic(t) + curve*(1-t);
      b.y = b.sy + (b.ty - b.sy) * easeInOutSine(t);
      // Boss landing shake — fires once as it reaches its target position
      if (b.isBoss && !b._landingShakeDone && t >= 0.95) {
        b._landingShakeDone = true;
        doShake(18, 0.35);
        screenFlash.alpha = 0.22; screenFlash.color = "rgba(255,80,80,1)";
      }
      continue;
    }

    let dMult = 1;
    if (player.boost >= 3) dMult = 1.7;
    if (b.panicking)       dMult = 2.5;
    b.driftSpeed = driftNow * dMult;

    if (b.isBoss) {
      if (b.phase === 1) {
        const mob = IS_COARSE ? 0.55 : 1;
        b.x = b.tx + Math.sin(b.bob*0.8) * b.driftSpeed * mob;
        b.y = b.ty + Math.cos(b.bob*1.0) * b.driftSpeed * 0.25 * mob;
      } else if (b.phase === 2) {
        const accel = IS_COARSE ? 160 : 240, vmax = IS_COARSE ? 280 : 460;
        b.moveSpeed = clamp((b.moveSpeed||0) + dt*accel, 0, vmax);
        b.x += (b.moveDir||1) * b.moveSpeed * dt * (IS_COARSE ? 0.75 : 1);
        b.y  = b.ty + Math.sin(b.bob*1.8) * 18;
        if (b.x < 24)           { b.x = 24;          b.moveDir = 1;  }
        if (b.x + b.w > W()-24) { b.x = W()-24-b.w;  b.moveDir = -1; }
      } else {
        const accel = IS_COARSE ? 220 : 340, vmax = IS_COARSE ? 380 : 600;
        b.moveSpeed = clamp((b.moveSpeed||0) + dt*accel, 0, vmax);
        b.x += (b.moveDir||1) * b.moveSpeed * dt * (IS_COARSE ? 0.75 : 1);
        b.y  = b.ty + Math.sin(b.bob*3.5) * 30;
        if (b.x < 16)           { b.x = 16;          b.moveDir = 1;  }
        if (b.x + b.w > W()-16) { b.x = W()-16-b.w;  b.moveDir = -1; }
      }
    } else {
      // Dive attack
      if (b.diving) {
        b.diveT = (b.diveT||0) + dt;
        b.x += b.diveVx * dt;
        b.y += b.diveVy * dt;
        b.diveVy = Math.min(b.diveVy + 800*dt, 900);
        b.x = clamp(b.x, 4, W()-b.w-4);
        b._trailT = (b._trailT||0) + dt;
        if (b._trailT > 0.06) { b._trailT = 0; addSpark(b.x+b.w/2, b.y+b.h*0.8, 1, "boss"); }
        if (b.y > H() - player.h*2.5) {
          b.diving = false; b.diveT = 0;
          b.y = b.ty; b.x = b.tx;
          b.diveCD = rand(8, 16);
        }
        continue;
      }
      if (!b.panicking && b.shieldT <= 0 && b.hasShotOnce) {
        b.diveCD = Math.max(0, (b.diveCD||rand(6,14)) - dt);
        if (b.diveCD <= 0 && Math.random() < 0.004) {
          b.diving  = true; b.diveT = 0;
          const dx  = (player.x + player.w/2) - (b.x + b.w/2);
          b.diveVx  = dx * 0.9 + rand(-60, 60);
          b.diveVy  = rand(280, 420);
          b.diveCD  = rand(10, 18);
          b.glow    = 0.35;
        }
      }
      if (b.panicking) {
        b.x = b.tx + Math.sin(b.bob*2.8 + b.x) * b.driftSpeed * 1.8;
        b.y = b.ty + Math.cos(b.bob*3.0) * b.driftSpeed * 0.5;
      } else {
        b.x = b.tx + Math.sin(b.bob*0.9) * b.driftSpeed;
        b.y = b.ty + Math.cos(b.bob*1.1) * b.driftSpeed * 0.32;
      }
      b.x = clamp(b.x, 4, W()-b.w-4);
    }

    const fireRamp = clamp((stageTime - 12) / 40, 0, 1);
    let base = 3.2 - fireRamp * 1.5;
    if (player.boost >= 3) base *= 0.55;

    if (b.shieldT === 0 && !b.hasShotOnce) {
      b.isBoss ? fireBossSpread(b) : fireBugShot(b);
      b.hasShotOnce = true;
      b.fireCD = rand(base, base + 0.9);
    }
    if (b.shieldT > 0 || !b.hasShotOnce) continue;

    let fireDt = dt;
    if (b.isBoss && b.phase >= 2) fireDt *= IS_COARSE ? 1.2 : 1.7;
    if (b.isBoss && b.phase >= 3) fireDt *= IS_COARSE ? 1.3 : 1.8;
    b.fireCD -= fireDt;

    if (b.fireCD <= 0) {
      if (b.isBoss) {
        if (b.phase >= 2) {
          b.atkPattern = (b.atkPattern+1) % 3;
          if (b.atkPattern === 0) fireBossSpread(b);
          else if (b.atkPattern === 1) fireBugShot(b);
          else if (b.phase >= 3)  fireBossSpiral(b);
          else fireBossSpread(b);
        } else { fireBossSpread(b); }
      } else { fireBugShot(b); }
      b.fireCD = rand(base, base + 0.9);
      b.fireCD = Math.max(IS_COARSE ? 0.9 : 0.55, b.fireCD);
    }
  }
}

function updateDiveCollisions() {
  if (player.hitIFrames > 0) return;
  for (const b of bugs) {
    if (!b.alive || !b.diving || b.isBoss) continue;
    if (!aabb(b.x, b.y, b.w, b.h, player.x, player.y, player.w, player.h)) continue;
    player.energy    = Math.max(0, player.energy - 18);
    player.hitIFrames = 0.7;
    player.boost     = 0;
    breakCombo();
    b.alive = false; WS.killed++;
    addSpark(player.x+player.w/2, player.y+player.h/2, 18, "slime");
    addSpark(b.x+b.w/2, b.y+b.h/2, 12, "boss");
    playSfx("player");
    doShake(SHAKE_CONFIG.playerHit.mag, SHAKE_CONFIG.playerHit.dur);
    screenFlash.alpha = 0.35; screenFlash.color = "#ff2244";
    if (player.energy <= 0) {
      lives--;
      if (lives > 0) { player.energy = PLAYER_CONFIG.respawnEnergy; player.hitIFrames = PLAYER_CONFIG.respawnIFrames; playLifeloss(); doShake(SHAKE_CONFIG.lifeLoss.mag, SHAKE_CONFIG.lifeLoss.dur); screenFlash.alpha = 0.9; screenFlash.color = "#ff0000"; bugShots.length = 0; }
    }
  }
}

// ════════════════════════════════════════
// PROJECTILES
// ════════════════════════════════════════
function updateProjectiles(dt) {
  const doTrail = ((updateProjectiles._f = (updateProjectiles._f||0) + 1) % 2 === 0);
  for (const s of booShots) {
    if (s.dead) continue;
    s.y += s.vy * dt; s.x += (s.vx||0) * dt;
    if (doTrail && !s.isWeak) {
      if (s.isFriend)    addSpark(s.x, s.y+8, 1, "friend");
      else if (s.isPink) addSpark(s.x, s.y+8, 1, "pink");
      else               addSpark(s.x, s.y+8, 1, "gold");
    }
    for (const b of bugs) {
      if (!b.alive || s.dead) continue;
      if (!aabb(s.x-5, s.y-12, 10, 20, b.x, b.y, b.w, b.h)) continue;
      if (b.shieldT > 0) { s.dead = true; addSpark(b.x+b.w/2, b.y+b.h/2, 20, "gold"); break; }
      const dmg = s.isPink || s.isFriend ? 2 : 1;
      b.hp -= dmg; b.hitsTaken = (b.hitsTaken||0) + 1;
      b.shakeT = b.isBoss ? 0.18 : 0.10; b.shakeMag = b.isBoss ? 8 : 4;
      b.hurtFlash = DOTTY_SPRITES.hurtFlashDur; // trigger hurt sprite
      s.dead = true;
      playSfx(b.isBoss ? "boss" : "hit");
      addSpark(b.x+b.w/2, b.y+b.h/2, b.isBoss?16:10, s.isFriend?"friend":s.isPink?"pink":"gold");
      if (b.isBoss) {
        hitStopTimer = Math.max(hitStopTimer, HIT_STOP.bossHit);
        if (b.hitsTaken % 3 === 0) fireBossSpread(b);
      } else {
        hitStopTimer = Math.max(hitStopTimer, HIT_STOP.normalKill * 0.5); // half-stop on normal hit
      }
      if (b.hp <= 0) {
        b.alive = false; WS.killed++;
        playSfx("kill");
        const pts = b.isBoss ? 500 : 10 + WS.wave * 2;
        registerKill(pts);
        if (b.isBoss) {
          // Staged boss death — small pops then the big bang
          hitStopTimer = Math.max(hitStopTimer, HIT_STOP.bossDeath);
          const bcx = b.x+b.w/2, bcy = b.y+b.h/2;
          for (let pi = 0; pi < BOSS_DEATH.popCount; pi++) {
            setTimeout(() => {
              const ox = rand(-b.w*BOSS_DEATH.popSpread, b.w*BOSS_DEATH.popSpread);
              const oy = rand(-b.h*BOSS_DEATH.popSpread, b.h*BOSS_DEATH.popSpread);
              addBigExplosion(bcx+ox, bcy+oy, "boss");
              doShake(6, 0.08);
            }, pi * BOSS_DEATH.popInterval * 1000);
          }
          setTimeout(() => {
            addBigExplosion(bcx, bcy, "boss");
            screenFlash.alpha = 0.9; screenFlash.color = "#fff";
            doShake(SHAKE_CONFIG.bossDeath.mag, SHAKE_CONFIG.bossDeath.dur);
          }, BOSS_DEATH.bigDelay * 1000);
          score += WS.wave * 100;
        } else {
          hitStopTimer = Math.max(hitStopTimer, HIT_STOP.normalKill);
          addSpark(b.x+b.w/2, b.y+b.h/2, 18, s.isFriend?"friend":s.isPink?"pink":"gold");
          for (const nb of bugs) {
            if (!nb.alive || nb.isBoss) continue;
            const dx = nb.x - b.x, dy = nb.y - b.y;
            if (Math.sqrt(dx*dx+dy*dy) < b.w*2.5) { nb.panicking = true; nb.panicT = rand(0.6,1.4); }
          }
        }
      }
      break;
    }
    if (s.y < -60 || s.x < -80 || s.x > W()+80) s.dead = true;
  }

  for (const bl of bugShots) {
    if (bl.dead) continue;
    bl.t += dt;
    bl.x += bl.vx * (1 + Math.sin(bl.t*5)*0.6) * dt;
    bl.y += bl.vy * dt;
    for (const r of rocks) {
      if (r.hp <= 0) continue;
      if (aabb(bl.x-bl.r, bl.y-bl.r, bl.r*2, bl.r*2, r.x, r.y, r.w, r.h)) {
        r.hp = Math.max(0, r.hp - ROCK_CONFIG.shotDamage);
        r.hitT = 0.16;
        bl.dead = true; addSpark(bl.x, bl.y, 4, "slime"); playSfx("rock"); break;
      }
    }
    if (!bl.dead && player.hitIFrames <= 0) {
      if (aabb(bl.x-bl.r, bl.y-bl.r, bl.r*2, bl.r*2, player.x, player.y, player.w, player.h)) {
        bl.dead = true;
        if (playerShield > 0) {
          playerShield = 0;
          addSpark(player.x+player.w/2, player.y+player.h/2, 20, "friend");
          screenFlash.alpha = 0.3; screenFlash.color = "rgba(100,200,255,1)";
          player.hitIFrames = 0.4;
        } else {
          const dmg = bl.dmg || 10;
          player.energy = Math.max(0, player.energy - dmg);
          player.hitIFrames = PLAYER_CONFIG.iFramesDuration; player.boost = 0;
          breakCombo();
          addSpark(player.x+player.w/2, player.y+player.h/2, 14, "slime");
          playSfx("player");
          doShake(SHAKE_CONFIG.bugHit.mag, SHAKE_CONFIG.bugHit.dur);
          screenFlash.alpha = 0.4; screenFlash.color = "#ff2244";
          if (player.energy <= 0) {
            lives--;
            if (lives > 0) { player.energy = PLAYER_CONFIG.respawnEnergy; player.hitIFrames = PLAYER_CONFIG.respawnIFrames; playLifeloss(); doShake(SHAKE_CONFIG.lifeLoss.mag, SHAKE_CONFIG.lifeLoss.dur); screenFlash.alpha = 0.9; screenFlash.color = "#ff0000"; bugShots.length = 0; }
          }
        }
      }
    }
    if (bl.y > H()+80) bl.dead = true;
  }

  for (let i = booShots.length-1; i >= 0; i--) if (booShots[i].dead) booShots.splice(i,1);
  for (let i = bugShots.length-1; i >= 0; i--) if (bugShots[i].dead) bugShots.splice(i,1);
  for (let i = bugs.length-1;     i >= 0; i--) if (!bugs[i].alive)   bugs.splice(i,1);
}

function updateCandy(dt) {
  const doTrail = ((updateCandy._f = (updateCandy._f||0)+1) % 3 === 0);
  for (const c of candies) {
    if (c.dead) continue;
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (doTrail) {
      if (c.type==="pink")                   addSpark(c.x, c.y, 1, "pink");
      else if (c.type==="blue")              addSpark(c.x, c.y, 1, "friend");
      else if (c.type==="gold"||c.type==="star") addSpark(c.x, c.y, 1, "gold");
    }
    const cm = candyScale(), cs = 36*cm;
    if (aabb(c.x-cs/2, c.y-cs/2, cs, cs, player.x, player.y, player.w, player.h)) {
      c.dead = true; playCandySfx(); player.glow = 0.14;
      addSpark(player.x+player.w/2, player.y, 24, "pink");
      if (c.type==="pink") {
        player.boost  = clamp((player.boost||0)+1, 0, 3);
        player.energy = Math.min(100, player.energy + 30);
      } else if (c.type==="blue") {
        timedWeapon.level = 2; timedWeapon.remaining = CANDY_CONFIG.timedWeaponSecs;
        player.energy = Math.min(100, player.energy + 15);
        window._candyToast = { msg:`3x SHOT — ${CANDY_CONFIG.timedWeaponSecs}秒（びょう）！`, color:"rgba(100,200,255,1)", t:2.5 };
      } else if (c.type==="star") {
        timedWeapon.level = 3; timedWeapon.remaining = CANDY_CONFIG.timedWeaponSecs;
        player.energy = Math.min(100, player.energy + 15);
        window._candyToast = { msg:`5x SHOT — ${CANDY_CONFIG.timedWeaponSecs}秒（びょう）！`, color:"rgba(255,255,100,1)", t:2.5 };
      } else if (c.type==="gold") {
        score += 500;
        screenFlash.alpha = 0.7; screenFlash.color = "#ffdd44";
        for (const b of bugs) { if (!b.alive || b.isBoss) continue; addBigExplosion(b.x+b.w/2, b.y+b.h/2,"gold"); b.alive=false; WS.killed++; registerKill(10); }
      } else if (c.type==="green") {
        playerShield = CANDY_CONFIG.shieldDuration;
        player.energy = Math.min(100, player.energy + 20);
        screenFlash.alpha = 0.2; screenFlash.color = "rgba(80,255,160,1)";
      }
    }
    if (c.y > H()+60) c.dead = true;
  }
  for (let i = candies.length-1; i >= 0; i--) if (candies[i].dead) candies.splice(i,1);
}

function updateParticles(dt) {
  for (const p of sparkles) { p.life += dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 300*dt; }
  for (let i = sparkles.length-1; i >= 0; i--) if (sparkles[i].life >= sparkles[i].ttl) sparkles.splice(i,1);
}

// ════════════════════════════════════════
// DRAW HELPERS
// ════════════════════════════════════════
function drawCover(img) {
  const rct = canvas.getBoundingClientRect();
  const dw = rct.width, dh = rct.height;
  const s  = Math.max(dw/img.width, dh/img.height);
  const iw = img.width*s, ih = img.height*s;
  ctx.drawImage(img, (dw-iw)/2, (dh-ih)/2, iw, ih);
}
function drawGlow(x, y, r, alpha, color) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); ctx.restore();
}
function roundRect(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

function drawBackground() {
  if (IMG.bg) { drawCover(IMG.bg); }
  else { ctx.fillStyle = `hsl(${bgHue},30%,5%)`; ctx.fillRect(0,0,W(),H()); }
  if (bgOverlay.a > 0.01) {
    const h = Math.round(bgOverlay.h), s = Math.round(bgOverlay.s), l = Math.round(bgOverlay.l);
    const aEdge   = Math.min(bgOverlay.a * 1.6, 0.38);
    const aCenter = bgOverlay.a * 0.18;
    const cx = W()/2, cy = H()/2, rad = Math.max(W(),H()) * 0.85;
    const grad = ctx.createRadialGradient(cx,cy,rad*0.1,cx,cy,rad);
    grad.addColorStop(0, `hsla(${h},${s}%,${l}%,${aCenter.toFixed(3)})`);
    grad.addColorStop(1, `hsla(${h},${s}%,${l}%,${aEdge.toFixed(3)})`);
    ctx.fillStyle = grad; ctx.fillRect(0,0,W(),H());
  }
}

// ════════════════════════════════════════
// HUD
// ════════════════════════════════════════
function drawWaveCounter() {
  if (!started) return;
  const t = performance.now()/1000;
  const pulse = 0.5 + 0.5*Math.sin(t*2.5);
  const isBoss = bossAlive || bossCinematic.active;
  const bx = W()/2, by = SAFE.top + HUD_PAD;
  const sz = clamp(W()*0.030, 13, 22);
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.font = `900 ${sz}px system-ui,sans-serif`;
  if (isBoss) {
    ctx.shadowBlur = 12 + pulse*8; ctx.shadowColor = "rgba(255,60,60,0.9)";
    ctx.fillStyle  = `rgba(255,${Math.round(60+pulse*40)},60,1)`;
    const k = bossIndexForWave(WS.wave);
    ctx.fillText(`BOSS WAVE ${WS.wave} ` + ("★".repeat(Math.min(k,4))), bx, by);
  } else {
    ctx.shadowBlur = 8; ctx.shadowColor = "rgba(255,200,80,0.6)";
    ctx.fillStyle  = "rgba(255,255,255,0.92)";
    ctx.fillText(`WAVE  ${WS.wave}`, bx, by);
  }
  ctx.restore();
}

function drawScoreHUD() {
  if (!started) return;
  const rx = W() - SAFE.right - HUD_PAD, by = SAFE.top + HUD_PAD;
  const sz  = clamp(W()*0.028, 11, 18);
  const hsz = clamp(W()*0.020,  9, 13);
  ctx.save();
  ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.font = `900 ${sz}px system-ui,sans-serif`;
  ctx.shadowBlur = 10; ctx.shadowColor = "rgba(255,200,80,0.7)"; ctx.fillStyle = "rgba(255,220,80,0.97)";
  ctx.fillText(score.toLocaleString(), rx, by);
  ctx.font = `700 ${hsz}px system-ui,sans-serif`;
  ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`BEST: ${Math.max(score,highScore).toLocaleString()}`, rx, by+sz+3);
  ctx.fillStyle = "rgba(255,180,80,0.65)";
  ctx.fillText(`KILLS: ${totalKills}`, rx, by+sz+hsz+7);
  ctx.restore();
}

function drawWaveBanner() {
  if (!started || WS.phase !== "card") return;
  const dur      = Math.max(0.001, WAVE_SCALE.waveCardSec);
  const pauseSec = 1.2;
  const moveSec  = Math.max(0.001, dur - pauseSec);
  const enterSec = moveSec * 0.60;
  const exitSec  = Math.max(0.001, moveSec - enterSec);
  const t        = clamp(WS.phaseT, 0, dur);
  let dropP = 0;
  if (t < enterSec)              dropP = easeOutBack(t / enterSec);
  else if (t < enterSec+pauseSec) dropP = 1;
  else                            dropP = 1 - easeInCubic((t - enterSec - pauseSec) / exitSec);

  const isBoss   = isBossWave(WS.wave);
  const bigText  = isBoss ? `!! BOSS INCOMING !!` : `NEXT WAVE`;
  const waveNum  = `${WS.wave}`;
  const sub      = isBoss ? `ボスが くるよ！きをつけて！` : `ドッティが くるよ！`;
  const bigSize  = clamp(W()*0.065, 30, 62);
  const numSize  = clamp(W()*0.24,  80, 200);
  const subSize  = clamp(W()*0.030, 13, 22);
  const cardH    = numSize*1.15 + bigSize*1.4 + subSize*2.0 + 24;
  const cardW    = clamp(W()*0.80, 280, 640);
  const cardX    = W()/2 - cardW/2;
  const cardY    = (-cardH-20) + (H()/2 - cardH/2 - (-cardH-20)) * dropP;

  ctx.save();
  const cardGrad = ctx.createLinearGradient(cardX,cardY,cardX+cardW,cardY+cardH);
  if (isBoss) { cardGrad.addColorStop(0,"rgba(80,10,10,0.96)"); cardGrad.addColorStop(0.5,"rgba(50,0,0,0.98)"); cardGrad.addColorStop(1,"rgba(80,20,10,0.96)"); }
  else        { cardGrad.addColorStop(0,"rgba(10,10,60,0.95)"); cardGrad.addColorStop(0.5,"rgba(5,5,40,0.98)");  cardGrad.addColorStop(1,"rgba(15,5,60,0.95)"); }
  roundRect(cardX,cardY,cardW,cardH,22); ctx.fillStyle = cardGrad; ctx.fill();
  ctx.strokeStyle = isBoss ? "rgba(255,60,60,0.7)" : "rgba(255,100,220,0.6)"; ctx.lineWidth = 2;
  roundRect(cardX,cardY,cardW,cardH,22); ctx.stroke();

  ctx.globalCompositeOperation = "lighter";
  const gc = isBoss ? "rgba(255,80,80,0.35)" : "rgba(120,100,255,0.32)";
  ctx.globalAlpha = dropP;
  for (let r = cardH*0.9; r > 0; r -= 16) { ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(W()/2, cardY+cardH/2, r, 0, Math.PI*2); ctx.fill(); }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;

  const innerX = W()/2;
  let iy = cardY + 16;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.font = `900 ${bigSize}px system-ui,sans-serif`;
  const labelShadow = isBoss ? "rgba(255,60,60,1)" : "rgba(140,100,255,1)";
  ctx.lineWidth = bigSize*0.09; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(bigText,innerX,iy);
  ctx.shadowBlur = 28; ctx.shadowColor = labelShadow; ctx.fillStyle = "#ffffff"; ctx.fillText(bigText,innerX,iy);
  iy += bigSize * 1.15;

  ctx.font = `900 ${numSize}px system-ui,sans-serif`;
  ctx.shadowBlur = clamp(numSize*0.55,28,80); ctx.shadowColor = isBoss?"rgba(255,80,80,1)":"rgba(255,200,80,1)";
  ctx.lineWidth = numSize*0.09; ctx.strokeStyle = "rgba(0,0,0,0.88)"; ctx.strokeText(waveNum,innerX,iy);
  ctx.fillStyle = "#ffffff"; ctx.fillText(waveNum,innerX,iy);
  iy += numSize * 0.98;

  ctx.font = `800 ${subSize}px system-ui,sans-serif`;
  ctx.lineWidth = subSize*0.12; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(sub,innerX,iy);
  ctx.shadowBlur = 14; ctx.shadowColor = "rgba(180,255,200,0.9)"; ctx.fillStyle = "rgba(210,255,220,0.96)"; ctx.fillText(sub,innerX,iy);
  ctx.restore();
}

function drawBossCinematic() {
  if (!bossCinematic.active) return;
  const t = bossCinematic.t;
  if (bossCinematic.phase === "flash") {
    const a = clamp(1 - t/0.3, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = screenFlash.color; ctx.fillRect(0,0,W(),H()); ctx.restore();
    return;
  }
  const textA = clamp((t - 0.3) / 0.4, 0, 1);
  if (textA <= 0) return;
  const k = bossIndexForWave(WS.wave);
  const bigSize = clamp(W()*0.090, 40, 88);
  const subSize = clamp(W()*0.040, 18, 36);
  const vig = ctx.createRadialGradient(W()/2,H()/2,H()*0.2,W()/2,H()/2,H()*0.8);
  vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,0.7)");
  ctx.save(); ctx.globalAlpha = textA*0.8; ctx.fillStyle = vig; ctx.fillRect(0,0,W(),H()); ctx.restore();
  const scl = textA < 0.5 ? easeOutBack(textA*2) : 1;
  ctx.save();
  ctx.translate(W()/2,H()/2); ctx.scale(scl,scl); ctx.translate(-W()/2,-H()/2);
  ctx.globalAlpha = textA; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const ts = performance.now()/1000;
  const flicker = 0.85 + 0.15*Math.sin(ts*20);
  ctx.font = `900 ${bigSize}px system-ui,sans-serif`;
  ctx.shadowBlur = 40; ctx.shadowColor = "rgba(255,40,40,0.95)";
  ctx.fillStyle  = `rgba(255,${Math.round(flicker*60)},60,1)`;
  ctx.lineWidth  = bigSize*0.04; ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.strokeText(`!! BOSS ${k>1?"★".repeat(Math.min(k,4)):"ARRIVES"} !!`, W()/2, H()/2-subSize*1.2);
  ctx.fillText(`!! BOSS ${k>1?"★".repeat(Math.min(k,4)):"ARRIVES"} !!`, W()/2, H()/2-subSize*1.2);
  ctx.font = `900 ${subSize}px system-ui,sans-serif`;
  ctx.shadowBlur = 20; ctx.shadowColor = "rgba(255,200,80,0.8)"; ctx.fillStyle = "rgba(255,220,80,0.97)";
  ctx.fillText(`WAVE ${WS.wave} — DOTTY BOSS #${k}`, W()/2, H()/2+subSize*0.5);
  ctx.font = `900 ${subSize*0.75}px system-ui,sans-serif`;
  ctx.fillStyle = "rgba(255,200,200,0.85)";
  ctx.fillText("ボスが あらわれた！たたかえ！", W()/2, H()/2+subSize*2.2);
  ctx.restore();
}

function drawMilestone() {
  if (!milestoneAnim.active) return;
  const t = milestoneAnim.t;
  const a = t < 0.4 ? t/0.4 : t > 2.8 ? clamp(1-(t-2.8)/0.7,0,1) : 1;
  const bigSize = clamp(W()*0.085, 36, 80);
  const subSize = clamp(W()*0.034, 14, 26);
  const scl = t < 0.4 ? easeOutBack(t/0.4) : 1;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(W()/2, H()*0.42); ctx.scale(scl,scl); ctx.translate(-W()/2,-H()*0.42);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `900 ${bigSize}px system-ui,sans-serif`;
  ctx.shadowBlur = 30; ctx.shadowColor = "rgba(255,220,80,0.95)";
  ctx.lineWidth = bigSize*0.06; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.strokeText(milestoneAnim.text,W()/2,H()*0.42);
  ctx.fillStyle = "rgba(255,220,80,0.99)"; ctx.fillText(milestoneAnim.text,W()/2,H()*0.42);
  ctx.font = `800 ${subSize}px system-ui,sans-serif`;
  ctx.shadowBlur = 14; ctx.shadowColor = "rgba(185,255,207,0.8)"; ctx.fillStyle = "rgba(185,255,207,0.95)";
  ctx.fillText(milestoneAnim.subtext, W()/2, H()*0.42+bigSize*1.0);
  ctx.restore();
}

function drawBossHealthBar() {
  const boss = bugs.find(b => b.alive && b.isBoss);
  if (!boss) return;
  const pct = Math.max(0, boss.hp/boss.maxHp);
  const bw = clamp(W()*0.62,240,560), bh = 16;
  const bx = W()/2 - bw/2, by = SAFE.top + HUD_PAD + 28;
  const t  = performance.now()/1000;
  ctx.save();
  ctx.font = "900 13px system-ui,sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const k = bossIndexForWave(WS.wave);
  ctx.fillText(`★ DOTTY BOSS ${k>1?"★".repeat(k):""}`, W()/2, by+2);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; roundRect(bx,by+14,bw,bh,bh/2); ctx.fill();
  const phase = boss.phase||1;
  let fillColor;
  if (phase >= 3) { const p=0.5+0.5*Math.sin(t*8); fillColor=`rgba(255,${Math.round(p*60)},${Math.round(p*80)},0.95)`; }
  else if (phase===2) { fillColor="rgba(255,100,60,0.92)"; }
  else                { fillColor="rgba(255,100,220,0.92)"; }
  ctx.fillStyle = fillColor;
  if (pct > 0) { roundRect(bx,by+14,bw*pct,bh,bh/2); ctx.fill(); }
  ctx.strokeStyle = "rgba(255,255,255,0.20)"; ctx.lineWidth = 2; roundRect(bx,by+14,bw,bh,bh/2); ctx.stroke();
  ctx.restore();
}

function drawComboHUD() {
  if (!started || combo < 2) return;
  const wl = weaponLevel();
  const t  = performance.now()/1000;
  const impactScale = 1 + comboPop*0.55*Math.exp(-comboPop*2.5);
  const idlePulse   = comboPop < 0.05 ? (1 + 0.06*Math.sin(t*5)) : 1;
  const finalScale  = impactScale * idlePulse;
  const cx = W()/2, cy = SAFE.top + HUD_PAD + 46;
  const wlColors = ["#fff","#ffee22","#ff7700","#ff2299","#cc22ff"];
  const col  = wlColors[Math.min(wl-1,4)];
  const big  = clamp(W()*0.058, 24, 44);
  if (comboPop > 0.7) {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (comboPop-0.7)/0.3*0.5;
    ctx.strokeStyle = col; ctx.lineWidth = clamp(big*0.3,4,10); ctx.shadowBlur = 30; ctx.shadowColor = col;
    ctx.beginPath(); ctx.arc(cx,cy+big*0.5,big*1.2,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  ctx.save();
  ctx.translate(cx,cy); ctx.scale(finalScale,finalScale);
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.font = `900 ${big}px system-ui,sans-serif`;
  ctx.lineWidth = big*0.15; ctx.strokeStyle = "rgba(0,0,0,0.92)"; ctx.strokeText(`${combo}×`,0,0);
  ctx.shadowBlur = comboPop>0.1?48:20; ctx.shadowColor = col; ctx.fillStyle = col; ctx.fillText(`${combo}×`,0,0);
  if (wl > 1) {
    const labels = ["","DOUBLE","TRIPLE","CHAOS","★ULTRA★"];
    const lbl    = labels[Math.min(wl-1,4)];
    const sz     = clamp(W()*0.025, 10, 18);
    ctx.font     = `900 ${sz}px system-ui,sans-serif`;
    const lw     = ctx.measureText(lbl).width + 18;
    ctx.fillStyle = col; ctx.globalAlpha = 0.22 + 0.10*Math.sin(t*6);
    roundRect(-lw/2,big*1.05,lw,sz+8,5); ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = sz*0.16; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.strokeText(lbl,0,big*1.14);
    ctx.shadowBlur = 18; ctx.shadowColor = col; ctx.fillStyle = col; ctx.fillText(lbl,0,big*1.14);
  }
  if (combo > 0 && comboTimer > 0) {
    const barW = clamp(W()*0.12,50,100), barH = 4;
    const pct  = comboTimer / COMBO_CONFIG.decaySeconds;
    const barY = big*2.0 + (wl>1?clamp(W()*0.025,10,18)*1.6:0);
    ctx.globalAlpha = 0.45; ctx.fillStyle = "rgba(255,255,255,0.12)"; roundRect(-barW/2,barY,barW,barH,2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.shadowBlur = pct>0.3?10:4; roundRect(-barW/2,barY,barW*pct,barH,2); ctx.fill();
  }
  ctx.restore();
}

function drawEnergyBar() {
  const bx = 16, by = SAFE.top + HUD_PAD, bw = 140, bh = 14;
  const t   = performance.now()/1000;
  const pct = player.energy / 100;
  const SEGMENTS = 5;
  if (!drawEnergyBar._hitFlash)   drawEnergyBar._hitFlash   = 0;
  if (!drawEnergyBar._prevEnergy) drawEnergyBar._prevEnergy = player.energy;
  if (player.energy < drawEnergyBar._prevEnergy) drawEnergyBar._hitFlash = 1.0;
  drawEnergyBar._prevEnergy = player.energy;
  drawEnergyBar._hitFlash   = Math.max(0, drawEnergyBar._hitFlash - 0.08);
  const hf = drawEnergyBar._hitFlash;
  const danger = pct < 0.25;
  const pulse  = danger ? (0.65 + 0.35*Math.sin(t*8)) : 1;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)"; roundRect(bx-1,by-1,bw+2,bh+2,bh/2+1); ctx.fill();
  const segW = bw / SEGMENTS;
  for (let i = 1; i < SEGMENTS; i++) { ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(bx+segW*i-1,by,2,bh); }
  if (hf > 0) { ctx.globalAlpha=hf*0.5; ctx.fillStyle="rgba(255,255,255,0.9)"; roundRect(bx,by,bw*Math.max(pct,0),bh,bh/2); ctx.fill(); ctx.globalAlpha=1; }
  const col = pct>0.5?"#ffcc33":pct>0.25?"#ff8833":"#ff2244";
  ctx.globalAlpha=pulse; ctx.fillStyle=col;
  ctx.shadowBlur = danger?12+8*Math.sin(t*8):6; ctx.shadowColor=col;
  if (pct > 0) { roundRect(bx,by,bw*pct,bh,bh/2); ctx.fill(); }
  ctx.shadowBlur=0; ctx.globalAlpha=1;
  for (let i=1;i<SEGMENTS;i++) { const nx=bx+segW*i; if(nx<bx+bw*pct){ctx.fillStyle="rgba(0,0,0,0.4)";ctx.fillRect(nx-1,by,2,bh);} }
  ctx.strokeStyle=danger?`rgba(255,80,80,${0.5+0.5*pulse})`:"rgba(255,255,255,0.18)"; ctx.lineWidth=1.5; roundRect(bx,by,bw,bh,bh/2); ctx.stroke();
  ctx.shadowBlur=0; ctx.font="700 10px system-ui,sans-serif";
  ctx.fillStyle=danger?`rgba(255,100,100,${pulse})`:"rgba(255,255,255,0.65)"; ctx.textBaseline="top"; ctx.fillText("BOOHA",bx,by+bh+3);
  for (let i=0;i<PLAYER_CONFIG.maxLives;i++) {
    const lx=bx+52+i*14, ly=by+bh+7, filled=i<lives;
    ctx.beginPath(); ctx.arc(lx,ly,4,0,Math.PI*2);
    if (filled) { ctx.shadowBlur=8; ctx.shadowColor="rgba(255,100,200,0.9)"; ctx.fillStyle="rgba(255,100,200,0.95)"; }
    else        { ctx.shadowBlur=0; ctx.fillStyle="rgba(255,255,255,0.18)"; }
    ctx.fill();
  }
  if (playerShield>0) {
    const sp=clamp(playerShield/8,0,1), shieldPulse=0.6+0.4*Math.sin(t*9);
    ctx.globalAlpha=shieldPulse; ctx.strokeStyle="rgba(100,200,255,0.9)"; ctx.lineWidth=2; ctx.shadowBlur=10; ctx.shadowColor="rgba(100,200,255,0.8)";
    roundRect(bx,by,bw,bh,bh/2); ctx.stroke();
    ctx.globalAlpha=0.22*shieldPulse; ctx.fillStyle="rgba(100,200,255,1)"; roundRect(bx,by,bw*sp,bh,bh/2); ctx.fill();
    ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.font="700 10px system-ui,sans-serif"; ctx.fillStyle=`rgba(100,220,255,${shieldPulse})`; ctx.fillText("🛡",bx+bw+6,by+2);
  }
  ctx.restore();
}

function drawTimedWeaponHUD() {
  if (timedWeapon.remaining <= 0) return;
  const t     = performance.now()/1000;
  const pulse = 0.5 + 0.5*Math.sin(t*6);
  const isStar  = timedWeapon.level >= 3;
  const col   = isStar ? "rgba(255,255,80,1)" : "rgba(100,200,255,1)";
  const glow  = isStar ? "rgba(255,255,80,0.7)" : "rgba(100,200,255,0.7)";
  const label = isStar ? "5x SHOT" : "3x SHOT";
  const bx = 16, by = SAFE.top + HUD_PAD + 56, barW = 100;
  const pct  = timedWeapon.remaining / CANDY_CONFIG.timedWeaponSecs;
  const secs = Math.ceil(timedWeapon.remaining);
  ctx.save();
  ctx.textBaseline = "top"; ctx.font = "900 11px system-ui,sans-serif";
  ctx.shadowBlur = 8+pulse*5; ctx.shadowColor=glow; ctx.fillStyle=col; ctx.globalAlpha=0.9+pulse*0.1;
  ctx.fillText(`${label} ${secs}s`, bx, by);
  const barY = by+14; ctx.globalAlpha=1;
  ctx.fillStyle="rgba(0,0,0,0.45)"; roundRect(bx,barY,barW,4,2); ctx.fill();
  ctx.fillStyle=col; ctx.shadowBlur=isStar?12:7; roundRect(bx,barY,barW*pct,4,2); ctx.fill();
  ctx.restore();
  if (window._candyToast) {
    const ct = window._candyToast; ct.t -= 1/60;
    if (ct.t <= 0) { window._candyToast = null; }
    else {
      const a = Math.min(1, ct.t/0.5);
      ctx.save(); ctx.globalAlpha=a; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font=`900 ${clamp(W()*0.042,17,26)}px system-ui,sans-serif`;
      ctx.shadowBlur=20; ctx.shadowColor=ct.color; ctx.fillStyle=ct.color;
      ctx.fillText(ct.msg, W()/2, H()*0.55); ctx.restore();
    }
  }
}

function drawSkillHeat() {
  if (!started) return;
  const sm = WS.skillDisplay;
  if (sm < 1.05) return;
  const heat = WS.skillHeat;
  const t    = performance.now()/1000;
  const bx   = 16, by = SAFE.top + HUD_PAD + 38;
  const label = sm>=1.9?"★ CHAOS":sm>=1.6?"HOT!!":sm>=1.3?"HEATED":"WARM";
  const sz    = clamp(W()*0.022, 9, 15);
  const pulse = 0.5 + 0.5*Math.sin(t*(4+heat*6));
  const r=255, g=Math.round((1-heat)*180);
  const col   = `rgba(${r},${g},40,0.95)`;
  ctx.save();
  ctx.font=`900 ${sz}px system-ui,sans-serif`; ctx.textBaseline="top";
  ctx.shadowBlur=clamp(pulse*heat*24,0,28); ctx.shadowColor=col; ctx.fillStyle=col; ctx.globalAlpha=0.75+pulse*0.25;
  ctx.fillText(`!! ${label}`, bx, by); ctx.restore();
}

function drawPauseButton() {
  const sz  = clamp(W()*0.028,11,18);
  const hsz = clamp(W()*0.020, 9,13);
  const killsY = SAFE.top + HUD_PAD + sz + hsz + 7;
  PAUSE_BTN.w=34; PAUSE_BTN.h=34;
  PAUSE_BTN.x=W()-SAFE.right-HUD_PAD-PAUSE_BTN.w;
  PAUSE_BTN.y=killsY+hsz+10;
  const cx=PAUSE_BTN.x+PAUSE_BTN.w/2, cy=PAUSE_BTN.y+PAUSE_BTN.h/2;
  ctx.save();
  ctx.shadowBlur=10; ctx.shadowColor="rgba(100,100,255,.5)";
  const g=ctx.createRadialGradient(cx-3,cy-3,3,cx,cy,17);
  g.addColorStop(0,"#8fd3ff"); g.addColorStop(1,"#7a5cff");
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,17,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.fillRect(cx-5,cy-6,3,12); ctx.fillRect(cx+2,cy-6,3,12);
  ctx.restore();
}

function drawScorePopups() {
  if (!window._scorePopups) return;
  for (const p of window._scorePopups) {
    const a = clamp(1-p.life/p.t,0,1) * clamp(p.life*5,0,1);
    ctx.save(); ctx.globalAlpha=a; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font=`900 ${clamp(W()*0.030,13,20)}px system-ui,sans-serif`;
    ctx.shadowBlur=12; ctx.shadowColor="rgba(255,220,80,0.9)"; ctx.fillStyle="rgba(255,220,80,1)";
    ctx.fillText(p.val, p.x, p.y); ctx.restore();
  }
}

function drawFriendUnlockToast() {
  if (!window._friendToast) return;
  const ft = window._friendToast; ft.t -= 1/60;
  if (ft.t <= 0) { window._friendToast = null; return; }
  const a = Math.min(1, ft.t/0.8);
  ctx.save(); ctx.globalAlpha=a; ctx.font=`900 ${clamp(W()*0.040,16,24)}px system-ui,sans-serif`;
  ctx.textAlign="center"; ctx.fillStyle=ft.color||"#fff"; ctx.shadowBlur=18; ctx.shadowColor=ft.color||"#fff";
  ctx.fillText(ft.msg, W()/2, H()*0.62); ctx.restore();
}

function drawFriends() {
  for (const f of activeFriends) {
    if (!f.alive) return;
    if (f.glow > 0) drawGlow(f.x+f.w/2, f.y+f.h/2, f.w*0.6, (f.glow/0.18)*0.25, f.color);
    const img = f.img || IMG.booIdle;
    if (img) {
      ctx.save(); ctx.globalAlpha=f.joinAnim; ctx.drawImage(img,f.x,f.y,f.w,f.h);
      ctx.globalCompositeOperation="multiply"; ctx.globalAlpha=f.joinAnim*0.35;
      ctx.fillStyle=f.color; ctx.fillRect(f.x,f.y,f.w,f.h); ctx.restore();
    }
  }
}

function drawDroppers() {
  const t = performance.now()/1000;
  for (const d of droppers) {
    if (d.dead) continue;
    const cx=d.x+d.w/2, cy=d.y+d.h/2;
    const pulse=0.6+0.4*Math.sin(t*10+d.glowT*3);
    drawGlow(cx,cy,d.w*0.9,0.30+pulse*0.15,"rgba(255,100,30,0.9)");
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*3+d.glowT);
    ctx.fillStyle=`rgba(255,${Math.round(60+pulse*40)},20,0.95)`;
    ctx.shadowBlur=16; ctx.shadowColor="rgba(255,80,20,0.9)";
    const s=d.w*0.42; ctx.fillRect(-s,-s,s*2,s*2);
    ctx.rotate(Math.PI/4); ctx.fillStyle=`rgba(255,220,80,${0.7+pulse*0.3})`; ctx.shadowColor="rgba(255,220,80,0.8)";
    const sc=d.w*0.22; ctx.fillRect(-sc,-sc,sc*2,sc*2); ctx.restore();
    ctx.save(); ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font=`900 ${Math.round(d.w*0.45)}px system-ui,sans-serif`;
    ctx.fillStyle="#fff"; ctx.shadowBlur=8; ctx.shadowColor="#000";
    ctx.fillText("!",cx,cy); ctx.restore();
  }
}

function drawPauseOverlay() {
  const t  = performance.now()/1000;
  const cx = W()/2;
  ctx.save(); ctx.fillStyle="rgba(0,0,0,0.82)"; ctx.fillRect(0,0,W(),H());
  ctx.globalCompositeOperation="lighter";
  for (let i=3;i>0;i--) {
    const r=W()*0.35*i+Math.sin(t*0.7+i)*18, a=0.04/i;
    ctx.strokeStyle=`hsla(${(t*30+i*80)%360},100%,65%,${a})`; ctx.lineWidth=clamp(W()*0.015,4,14)*i;
    ctx.beginPath(); ctx.arc(cx,H()*0.38,r,0,Math.PI*2); ctx.stroke();
  }
  ctx.globalCompositeOperation="source-over";
  const titleSize=clamp(W()*0.115,44,90), pulse=0.5+0.5*Math.sin(t*4);
  ctx.save(); ctx.translate(cx,H()*0.18); ctx.scale(1+pulse*0.04,1+pulse*0.04);
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.font=`900 ${titleSize}px system-ui,sans-serif`;
  ctx.lineWidth=titleSize*0.10; ctx.strokeStyle=`hsl(${(t*60)%360},100%,50%)`;
  ctx.shadowBlur=40+pulse*20; ctx.shadowColor=`hsl(${(t*60)%360},100%,65%)`; ctx.strokeText("PAUSE",0,0);
  ctx.shadowBlur=20; ctx.shadowColor="#fff"; ctx.fillStyle="#fff"; ctx.fillText("PAUSE",0,0);
  const subSize=clamp(W()*0.036,14,24);
  ctx.font=`900 ${subSize}px system-ui,sans-serif`; ctx.shadowBlur=14; ctx.shadowColor="rgba(255,220,80,.9)"; ctx.fillStyle="rgba(255,220,80,.95)";
  ctx.fillText("一時停止（いちじていし）",0,titleSize*0.72); ctx.restore();

  const cardW=clamp(W()*0.72,240,480), cardH=clamp(H()*0.16,62,96), cardX=cx-cardW/2, cardY=H()*0.34;
  ctx.save(); ctx.fillStyle="rgba(255,255,255,0.06)"; roundRect(cardX,cardY,cardW,cardH,16); ctx.fill();
  ctx.strokeStyle=`hsla(${(t*40+120)%360},80%,65%,0.4)`; ctx.lineWidth=1.5; roundRect(cardX,cardY,cardW,cardH,16); ctx.stroke();
  ctx.textAlign="center"; ctx.textBaseline="middle";
  const ssz=clamp(W()*0.040,16,28);
  ctx.font=`900 ${ssz}px system-ui,sans-serif`; ctx.shadowBlur=16; ctx.shadowColor="rgba(255,220,80,.9)"; ctx.fillStyle="rgba(255,220,80,1)";
  ctx.fillText(score.toLocaleString(),cx,cardY+cardH*0.30);
  const dtsz=clamp(W()*0.024,10,16);
  ctx.font=`700 ${dtsz}px system-ui,sans-serif`; ctx.shadowBlur=0; ctx.fillStyle="rgba(255,255,255,.75)";
  ctx.fillText(`Wave ${WS.wave}（ウェーブ）  ·  ${totalKills} Kills（キル）`,cx,cardY+cardH*0.68); ctx.restore();

  const btnW=clamp(W()*0.52,180,340), btnH=clamp(H()*0.075,44,58), btnX=cx-btnW/2, resumeY=H()*0.57;
  const rg=ctx.createLinearGradient(btnX,resumeY,btnX+btnW,resumeY);
  rg.addColorStop(0,`hsl(${(t*40)%360},100%,55%)`); rg.addColorStop(0.5,`hsl(${(t*40+60)%360},100%,65%)`); rg.addColorStop(1,`hsl(${(t*40+120)%360},100%,55%)`);
  ctx.save(); ctx.shadowBlur=24+pulse*12; ctx.shadowColor=`hsl(${(t*40+60)%360},100%,65%)`; ctx.fillStyle=rg;
  roundRect(btnX,resumeY,btnW,btnH,btnH/2); ctx.fill();
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.shadowBlur=0;
  const rfsz=clamp(W()*0.038,15,24); ctx.font=`900 ${rfsz}px system-ui,sans-serif`; ctx.fillStyle="#000";
  ctx.fillText("▶  RESUME  /  もどる",cx,resumeY+btnH/2); ctx.restore();

  const exitW=clamp(W()*0.52,180,340), exitH=clamp(H()*0.065,38,52), exitX=cx-exitW/2;
  const exitY=resumeY+btnH+clamp(H()*0.020,10,18);
  PAUSE_EXIT_BTN.x=exitX; PAUSE_EXIT_BTN.y=exitY; PAUSE_EXIT_BTN.w=exitW; PAUSE_EXIT_BTN.h=exitH;
  ctx.save(); ctx.fillStyle="rgba(255,255,255,0.07)"; ctx.strokeStyle="rgba(255,80,80,0.60)"; ctx.lineWidth=1.5;
  roundRect(exitX,exitY,exitW,exitH,exitH/2); ctx.fill(); ctx.stroke();
  ctx.textAlign="center"; ctx.textBaseline="middle";
  const exsz=clamp(W()*0.030,12,20); ctx.font=`900 ${exsz}px system-ui,sans-serif`;
  ctx.shadowBlur=10; ctx.shadowColor="rgba(255,80,80,.8)"; ctx.fillStyle="rgba(255,120,120,.95)";
  ctx.fillText("EXIT  /  森（もり）へもどる",cx,exitY+exitH/2); ctx.restore();

  const hintsz=clamp(W()*0.022,9,14);
  ctx.save(); ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.font=`600 ${hintsz}px system-ui,sans-serif`;
  ctx.fillStyle="rgba(255,255,255,0.35)";
  ctx.fillText("Tap anywhere else to resume  /  他をタップしてもどる",cx,exitY+exitH+clamp(H()*0.025,12,22));
  ctx.restore(); ctx.restore();
}

function getStarRating() {
  for (const tier of STAR_RATING_WAVES) { if (WS.wave >= tier.wave) return tier.stars; }
  return 0;
}

function drawGameOver() {
  const t     = performance.now()/1000;
  const stars = getStarRating();
  const newHigh = score > highScore;
  ctx.save(); ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(0,0,W(),H());
  ctx.textAlign="center"; ctx.textBaseline="middle"; const cx=W()/2;
  ctx.font="900 44px system-ui,sans-serif"; ctx.shadowBlur=30; ctx.shadowColor="rgba(255,80,80,0.9)"; ctx.fillStyle="rgba(255,255,255,0.97)";
  ctx.fillText("GAME OVER",cx,H()*0.18);
  const starSize=clamp(W()*0.10,28,58), starY=H()*0.34;
  for (let i=0;i<3;i++) {
    const filled=i<stars, sx=cx+(i-1)*starSize*1.5, pulse=filled?(0.9+0.1*Math.sin(t*3+i*1.2)):1;
    ctx.save(); ctx.translate(sx,starY); ctx.scale(pulse,pulse);
    ctx.font=`${starSize}px system-ui,sans-serif`; ctx.textBaseline="middle"; ctx.textAlign="center";
    ctx.shadowBlur=filled?20:0; ctx.shadowColor="rgba(255,220,80,1)"; ctx.globalAlpha=filled?1:0.2;
    ctx.fillText("★",0,0); ctx.restore();
  }
  const entry = STAR_LABELS[stars] || STAR_LABELS[0];
  ctx.font=`800 ${clamp(W()*0.035,14,22)}px system-ui,sans-serif`; ctx.shadowBlur=8; ctx.shadowColor="rgba(255,220,80,0.7)"; ctx.fillStyle="rgba(255,220,80,0.95)";
  ctx.fillText(`${entry.jp} ${entry.en}`,cx,H()*0.46);
  ctx.font=`900 ${clamp(W()*0.060,22,48)}px system-ui,sans-serif`; ctx.shadowBlur=16; ctx.shadowColor="rgba(255,200,80,0.8)"; ctx.fillStyle="rgba(255,220,80,1)";
  ctx.fillText(score.toLocaleString(),cx,H()*0.55);
  ctx.font=`700 ${clamp(W()*0.025,11,16)}px system-ui,sans-serif`; ctx.fillStyle="rgba(255,255,255,0.65)";
  ctx.fillText(`WAVE ${WS.wave}  •  KILLS ${totalKills}  •  BEST ${Math.max(score,highScore).toLocaleString()}`,cx,H()*0.62);
  if (newHigh) {
    const p=0.5+0.5*Math.sin(t*5);
    ctx.font=`900 ${clamp(W()*0.040,16,28)}px system-ui,sans-serif`; ctx.shadowBlur=20+p*10; ctx.shadowColor="rgba(255,220,80,1)"; ctx.fillStyle=`rgba(255,${Math.round(200+p*55)},80,1)`;
    ctx.fillText("🏆 NEW HIGH SCORE! 🏆",cx,H()*0.69);
  }
  ctx.font=`700 ${clamp(W()*0.028,12,18)}px system-ui,sans-serif`; ctx.shadowBlur=0; ctx.fillStyle="rgba(255,255,255,0.65)";
  ctx.fillText("Press R to Restart  /  タップで リスタート",cx,H()*0.78);
  ctx.restore();
}

function drawScreenFlash() {
  if (screenFlash.alpha <= 0) return;
  ctx.save(); ctx.globalAlpha=screenFlash.alpha; ctx.fillStyle=screenFlash.color; ctx.fillRect(0,0,W(),H()); ctx.restore();
}

// ════════════════════════════════════════
// MAIN DRAW
// ════════════════════════════════════════
function draw() {
  let sx=0, sy=0;
  if (shakeDecay > 0 && shakeDuration > 0) {
    const envelope = clamp(shakeDecay / shakeDuration, 0, 1);
    sx = rand(-shakeX, shakeX) * envelope;
    sy = rand(-shakeY, shakeY) * envelope;
  }
  ctx.save(); ctx.translate(sx,sy);
  drawBackground();

  // Rocks
  for (const r of rocks) {
    if (r.hp <= 0) continue;
    const pct = r.hp / (r.maxHp||20);
    const idx = clamp(Math.floor((1-pct)*4),0,3);
    const img = IMG.rocks?.[idx];
    if (img) ctx.drawImage(img, r.x, r.y, r.w, r.h);
    else { ctx.fillStyle=`rgba(${Math.round(80+pct*80)},70,50,0.9)`; roundRect(r.x,r.y,r.w,r.h,8); ctx.fill(); }
    if (r.hitT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.65, r.hitT * 2.3);
      ctx.fillStyle = "#fff1b0";
      roundRect(r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      ctx.restore();
    }
    if (pct < 0.99) {
      const bx=r.x+r.w*0.1, bw=r.w*0.8, bh=4, by=r.y+r.h+3;
      ctx.fillStyle="rgba(0,0,0,0.4)"; roundRect(bx,by,bw,bh,2); ctx.fill();
      const col=pct>0.5?"#88ff88":pct>0.25?"#ffcc44":"#ff4444"; ctx.fillStyle=col; roundRect(bx,by,bw*pct,bh,2); ctx.fill();
    }
  }

  // Bugs
  for (const b of bugs) {
    if (!b.alive) continue;
    let bsx=0, bsy=0;
    if (b.shakeT > 0) { const m=b.shakeMag||5; bsx=rand(-m,m); bsy=rand(-m,m); }
    const bx=b.x+bsx, by=b.y+bsy;
    const bcx=bx+b.w/2, bcy=by+b.h/2;

    // ── SHADOW ──
    // Soft ellipse beneath each Dotty. Opacity grows as they drift lower (closer to player).
    {
      const proximity = clamp((by - U()*0.15) / (H()*0.5), 0, 1);
      const sa = SHADOW_CONFIG.alphaBase + proximity * SHADOW_CONFIG.alphaBoost;
      const sw = b.w * SHADOW_CONFIG.xScale;
      const sh = b.w * SHADOW_CONFIG.yScale;
      const sy = by + b.h + SHADOW_CONFIG.yOffset;
      ctx.save();
      ctx.globalAlpha = sa * (b.diving ? 0.4 : 1); // fade shadow while diving
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.ellipse(bcx, sy, sw/2, sh/2, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // ── GLOW ──
    if (b.diving) { drawGlow(bcx,bcy,b.w*0.7,0.35,"rgba(255,50,50,0.8)"); }
    else if (b.glow > 0) {
      const gc = b.isBoss ? "rgba(255,80,80,0.7)" : "rgba(120,255,200,0.6)";
      drawGlow(bcx,bcy,b.w*0.6,(b.glow/0.4)*0.28,gc);
    }
    if (b.isBoss && b.phase>=3) {
      const ts=performance.now()/1000, p=0.5+0.5*Math.sin(ts*8);
      drawGlow(bcx,bcy,b.w*0.85,p*0.25,"rgba(255,40,40,0.7)");
    }

    // ── SPRITE SELECTION ──
    // Normal bug:  hurtFlash active → bugHurt, else bugNormal
    // Boss:        phase >= 2      → bugBoss,  else bugNormal
    // Fallback:    bugNormal if specific sprite missing
    const isHurt = (b.hurtFlash||0) > 0;
    let sprite;
    if (b.isBoss) {
      sprite = (b.phase >= 2 && IMG.bugBoss) ? IMG.bugBoss : (IMG.bugNormal || IMG.bugBoss);
    } else {
      sprite = (isHurt && IMG.bugHurt) ? IMG.bugHurt : (IMG.bugNormal || IMG.bugHurt);
    }

    if (sprite) {
      ctx.save();
      if (b.diving) {
        const angle = Math.atan2(b.diveVy, b.diveVx||0.001) - Math.PI/2;
        ctx.translate(bcx,bcy); ctx.rotate(angle); ctx.translate(-b.w/2,-b.h/2);
        ctx.drawImage(sprite, 0, 0, b.w, b.h);
      } else {
        ctx.drawImage(sprite, bx, by, b.w, b.h);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = b.isBoss ? "#ff4466" : b.diving ? "#ff2222" : "#44ff88";
      ctx.fillRect(bx, by, b.w, b.h);
    }

    // ── SHIELD PULSE ──
    if (b.shieldT > 0) {
      const ts=performance.now()/1000, pulse=0.5+0.5*Math.sin(ts*6+(b.bob||0)), sr=b.w*(0.44+0.03*pulse);
      ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=0.28+0.10*pulse;
      ctx.fillStyle="rgba(255,210,80,1)"; ctx.beginPath(); ctx.arc(bcx,bcy,sr,0,Math.PI*2); ctx.fill(); ctx.restore();
    }

    // ── HP BAR (non-boss only) ──
    if (!b.isBoss && b.maxHp > 1) {
      const pw=b.w*0.85, ph=4, px=bcx-pw/2, pby=by-8;
      ctx.fillStyle="rgba(0,0,0,0.45)"; roundRect(px,pby,pw,ph,2); ctx.fill();
      ctx.fillStyle=`hsl(${Math.round((b.hp/b.maxHp)*100)},100%,55%)`; roundRect(px,pby,pw*(b.hp/b.maxHp),ph,2); ctx.fill();
    }
  }

  drawBossHealthBar();
  drawDroppers();

  // Bug shots
  for (const bl of bugShots) {
    if (bl.dead) continue;
    drawGlow(bl.x,bl.y,bl.r*2.8,0.18,"rgba(70,255,140,.65)");
    ctx.fillStyle="rgba(90,255,150,.95)"; ctx.beginPath(); ctx.arc(bl.x,bl.y,bl.r,0,Math.PI*2); ctx.fill();
  }

  // Player shots
  for (const s of booShots) {
    if (s.dead) continue;
    const sm=shotScale(), r=16*sm, w=4*sm, h=14*sm;
    const col=s.color||(s.isFriend?"#a8e8ff":s.isPink?"#ffd1ef":"#fff2c7");
    const gc=s.isFriend?"rgba(100,200,255,.6)":s.isPink?"rgba(255,100,220,.6)":"rgba(255,200,80,.6)";
    drawGlow(s.x,s.y,r,0.22,gc); ctx.fillStyle=col; ctx.fillRect(s.x-w/2,s.y-h,w,h);
  }

  // Candy
  for (const c of candies) {
    if (c.dead) continue;
    const cm=candyScale(), cs=36*cm;
    if (c.type==="blue")  { ctx.save(); ctx.globalCompositeOperation="lighter"; drawGlow(c.x,c.y,22,0.22,"rgba(100,200,255,.65)"); ctx.restore(); }
    else if (c.type==="gold") { ctx.save(); ctx.globalCompositeOperation="lighter"; drawGlow(c.x,c.y,24,0.25,"rgba(255,220,80,.7)"); ctx.restore(); }
    else if (c.type==="green") { ctx.save(); ctx.globalCompositeOperation="lighter"; drawGlow(c.x,c.y,22,0.22,"rgba(80,255,140,.65)"); ctx.restore(); }
    else if (c.type==="star") {
      const ts=performance.now()/1000, p=0.5+0.5*Math.sin(ts*8);
      ctx.save(); ctx.globalCompositeOperation="lighter";
      drawGlow(c.x,c.y,28,0.18+p*0.12,"rgba(255,255,80,.8)"); drawGlow(c.x,c.y,16,0.25+p*0.1,"rgba(255,200,255,.9)"); ctx.restore();
    }
    if (IMG.candy) {
      ctx.save();
      if (c.type==="blue")  ctx.filter="hue-rotate(160deg) saturate(1.5)";
      else if (c.type==="gold")  ctx.filter="hue-rotate(20deg) saturate(2) brightness(1.2)";
      else if (c.type==="green") ctx.filter="hue-rotate(90deg) saturate(1.5)";
      else if (c.type==="star")  ctx.filter="hue-rotate(50deg) saturate(3) brightness(1.4)";
      ctx.drawImage(IMG.candy, c.x-cs/2, c.y-cs/2, cs, cs); ctx.restore();
    } else {
      const cols={pink:"#ff88cc",blue:"#88ddff",gold:"#ffdd44",green:"#88ffaa",star:"#ffff66"};
      ctx.fillStyle=cols[c.type]||"#ff88cc"; ctx.beginPath(); ctx.arc(c.x,c.y,12,0,Math.PI*2); ctx.fill();
    }
    const labels={blue:"×3",gold:"💥",green:"🛡",pink:"",star:"×5"};
    if (labels[c.type]) {
      ctx.save(); ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.font=`900 ${clamp(cs*0.45,10,18)}px system-ui,sans-serif`;
      ctx.fillStyle=c.type==="star"?"#ffff44":"#fff"; ctx.shadowBlur=8; ctx.shadowColor="#000";
      ctx.fillText(labels[c.type],c.x,c.y-cs/2); ctx.restore();
    }
  }

  // Sparkles
  if (sparkles.length) {
    ctx.save(); ctx.globalCompositeOperation="lighter";
    for (const p of sparkles) {
      const a=1-(p.life/p.ttl); ctx.globalAlpha=a;
      if (p.kind==="pink")   ctx.fillStyle="rgba(255,160,230,.9)";
      else if (p.kind==="slime")  ctx.fillStyle="rgba(100,255,150,.8)";
      else if (p.kind==="friend") ctx.fillStyle="rgba(100,220,255,.9)";
      else if (p.kind==="boss")   ctx.fillStyle="rgba(255,100,80,.9)";
      else                        ctx.fillStyle="rgba(255,220,120,.85)";
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha=1;
  }

  drawFriends();

  // Player shield
  if (playerShield > 0) {
    const ts=performance.now()/1000, p=0.6+0.4*Math.sin(ts*8), sr=player.w*0.65;
    drawGlow(player.x+player.w/2, player.y+player.h/2, sr, p*0.35, "rgba(100,200,255,0.7)");
    ctx.save(); ctx.globalCompositeOperation="source-over"; ctx.globalAlpha=p*0.3;
    ctx.strokeStyle="rgba(150,230,255,0.9)"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(player.x+player.w/2, player.y+player.h/2, sr, 0, Math.PI*2); ctx.stroke(); ctx.restore();
  }

  // Player glow
  const px=player.x+player.w/2, py=player.y+player.h/2;
  if (player.boost > 0) {
    const ts=performance.now()/1000, pulse=0.5+0.5*Math.sin(ts*7);
    drawGlow(px,py,player.w*0.55,0.12+pulse*0.08,"rgba(255,100,220,.55)");
  } else if (player.glow > 0) {
    drawGlow(px,py,player.w*0.48,0.13,"rgba(255,200,80,.55)");
  }

  // Player sprite
  const wl = weaponLevel();
  const isShoot = booFireTimer > 0 && booFireTimer < 0.10;
  const pimg = isShoot ? IMG.booShoot : IMG.booIdle;
  if (player.hitIFrames > 0) ctx.globalAlpha = 0.75;
  if (pimg) ctx.drawImage(pimg,player.x,player.y,player.w,player.h);
  else { ctx.fillStyle="#ff7eb9"; ctx.fillRect(player.x,player.y,player.w,player.h); }
  ctx.globalAlpha = 1;

  if (wl >= 4) {
    const ts=performance.now()/1000;
    for (let i=0;i<6;i++) {
      const a=ts*2+i*(Math.PI/3);
      drawGlow(px+Math.cos(a)*player.w*0.6, py+Math.sin(a)*player.h*0.35, 8, 0.20, `hsl(${(ts*60+i*60)%360},100%,70%)`);
    }
  }

  ctx.restore(); // end shake

  drawScreenFlash();
  if (bossCinematic.active) drawBossCinematic();
  drawMilestone();

  if (started) {
    drawEnergyBar();
    drawTimedWeaponHUD();
    drawSkillHeat();
    drawWaveCounter();
    drawScoreHUD();
    drawPauseButton();
    drawComboHUD();
    drawWaveBanner();
    drawFriendUnlockToast();
    drawScorePopups();
  }

  if (started && paused)                        drawPauseOverlay();
  if (player.energy <= 0 && lives <= 0 && !endPlaying) drawGameOver();
}

// ════════════════════════════════════════
// INPUT
// ════════════════════════════════════════
function hitPauseBtn(mx, my) {
  return mx>=PAUSE_BTN.x && mx<=PAUSE_BTN.x+PAUSE_BTN.w && my>=PAUSE_BTN.y && my<=PAUSE_BTN.y+PAUSE_BTN.h;
}
function inEdgeZone(cx, ep=30) { return cx <= ep || cx >= vW() - ep; }

const mobileControls = document.getElementById("mobileHoldControls");
if (IS_COARSE && mobileControls) {
  mobileControls.addEventListener("pointerdown", (e) => {
    if (inEdgeZone(e.clientX,30)) return;
    if (paused) {
      e.preventDefault();
      const ex=PAUSE_EXIT_BTN;
      if (e.clientX>=ex.x&&e.clientX<=ex.x+ex.w&&e.clientY>=ex.y&&e.clientY<=ex.y+ex.h) {
        setPaused(false); started=false; pauseAllMusic(); resetGame(); window.location.href="karasuki.html";
      } else { setPaused(false); }
      return;
    }
    if (!started) return;
    e.preventDefault();
    pointerDown=true; pointerX=e.clientX;
    dragOffsetX=pointerX-(player.x+player.w/2);
    try { mobileControls.setPointerCapture(e.pointerId); } catch(_){}
  }, { passive:false });
  mobileControls.addEventListener("pointermove", (e) => { if (!pointerDown) return; e.preventDefault(); pointerX=e.clientX; }, { passive:false });
  mobileControls.addEventListener("pointerup",   () => { pointerDown=false; pointerX=null; });
  mobileControls.addEventListener("pointercancel",()=> { pointerDown=false; pointerX=null; });
}

canvas.addEventListener("pointerdown", (e) => {
  if (IS_COARSE && inEdgeZone(e.clientX,30)) return;
  if (IS_COARSE && !paused && !hitPauseBtn(e.clientX,e.clientY)) return;
  if (paused) {
    e.preventDefault();
    const ex=PAUSE_EXIT_BTN;
    if (e.clientX>=ex.x&&e.clientX<=ex.x+ex.w&&e.clientY>=ex.y&&e.clientY<=ex.y+ex.h) {
      setPaused(false); started=false; pauseAllMusic(); resetGame(); window.location.href="karasuki.html"; return;
    }
    setPaused(false); return;
  }
  if (started && player.energy>0 && hitPauseBtn(e.clientX,e.clientY)) { e.preventDefault(); setPaused(true); return; }
  if (player.energy<=0 && lives<=0) { e.preventDefault(); resetGame(); startWave(1); return; }
  if (!IS_COARSE) {
    e.preventDefault(); pointerDown=true; pointerX=e.clientX;
    dragOffsetX=pointerX-(player.x+player.w/2);
    try { canvas.setPointerCapture(e.pointerId); } catch(_){}
  }
}, { passive:false });
canvas.addEventListener("pointermove",  (e) => { if (IS_COARSE) return; if (!pointerDown) return; e.preventDefault(); pointerX=e.clientX; }, { passive:false });
canvas.addEventListener("pointerup",    (e) => { if (IS_COARSE) return; pointerDown=false; pointerX=null; try{canvas.releasePointerCapture(e.pointerId);}catch(_){} });
canvas.addEventListener("pointercancel",()  => { if (IS_COARSE) return; pointerDown=false; pointerX=null; });
addEventListener("mousemove", (e) => { if (!pointerDown) return; pointerX=e.clientX; });

addEventListener("keydown", (e) => {
  if (player.energy<=0 && lives<=0) { if (e.key==="r"||e.key==="R") { e.preventDefault(); resetGame(); startWave(1); } return; }
  if (started && player.energy>0 && !paused) { if (e.key==="p"||e.key==="P") { e.preventDefault(); setPaused(!paused); return; } }
  if (paused) return;
  if (e.key==="ArrowLeft"||e.key==="ArrowRight") { e.preventDefault(); pointerX=null; }
  keys.add(e.key);
}, { passive:false });
addEventListener("keyup", (e) => keys.delete(e.key));

(function () {
  if (!IS_COARSE) return;
  function shouldBlock() { return started && !paused && !endPlaying; }
  document.addEventListener("touchmove", (e) => { if (!shouldBlock()) return; const panel=e.target?.closest?.("#startOverlay > div"); if (panel) return; e.preventDefault(); }, { passive:false, capture:true });
  document.addEventListener("touchstart",(e) => { if (!shouldBlock()) return; if (e.touches?.length>1) e.preventDefault(); }, { passive:false, capture:true });
  document.addEventListener("gesturestart",(e) => { if (shouldBlock()) e.preventDefault(); }, { passive:false, capture:true });
})();

(function(el) {
  if (!el) return;
  el.addEventListener("touchstart",(e)=>{ if(e.touches.length>1) e.preventDefault(); },{passive:false});
  let lte=0;
  el.addEventListener("touchend",(e)=>{ const now=Date.now(); if(now-lte<300) e.preventDefault(); lte=now; },{passive:false});
})(canvas);

history.pushState(null,"",location.href);
window.addEventListener("popstate",()=>{ history.pushState(null,"",location.href); if(started&&!paused) setPaused(true); });

function handleTiltEvent(e) {
  const beta=typeof e.beta==="number"?e.beta:0, gamma=typeof e.gamma==="number"?e.gamma:0;
  const ang=(screen.orientation?.angle)||window.orientation||0;
  let lr=gamma;
  if (ang===90) lr=beta; else if(ang===-90||ang===270) lr=-beta;
  tiltGamma=lr; tiltSmooth=tiltSmooth*0.85+tiltGamma*0.15;
}

// ════════════════════════════════════════
// RESET
// ════════════════════════════════════════
function resetGame() {
  if (score > highScore) { highScore=score; try{localStorage.setItem("booha_hiscore",highScore);}catch(_){} }
  resize();
  const bw = clamp(U()*0.22, 46, 86) * worldScale();
  player.w=bw; player.h=bw; player.x=W()/2-player.w/2; player.y=H()-player.h-14;
  player.energy=100; player.glow=0; player.hitIFrames=0; player.boost=0;
  spawnRocks(1);
  bugs.length=0; booShots.length=0; bugShots.length=0; sparkles.length=0; candies.length=0;
  droppers.length=0; dropperTimer=0;
  activeFriends.length=0; _seenFriends.clear();
  combo=0; comboTimer=0; comboDisplay=0; comboPop=0;
  score=0; totalKills=0; lives=PLAYER_CONFIG.maxLives;
  playerShield=0; timedWeapon.level=0; timedWeapon.remaining=0;
  stageTime=0; candyTimer=4.5; bossAlive=false; bossMusicIdx=0;
  WS.skillMult=1.0; WS.skillDisplay=1.0; WS.skillHeat=0; WS.groupStartT=0;
  booFireTimer=0; booAutoCD=0; shakeDecay=0; shakeDuration=0; shakeX=0; shakeY=0; hitStopTimer=0;
  screenFlash.alpha=0;
  bgOverlay={h:240,s:60,l:30,a:0,th:240,ts:60,tl:30,ta:0};
  bossCinematic.active=false; bossCinematic.t=0;
  milestoneAnim.active=false;
  window._scorePopups=[]; window._friendToast=null; window._candyToast=null;
  drawEnergyBar._hitFlash=0; drawEnergyBar._prevEnergy=100;
}

// ════════════════════════════════════════
// MAIN LOOP
// ════════════════════════════════════════
let endVideoEl = null;

function triggerEndVideo() {
  if (endPlaying) return;
  endPlaying=true;
  if (IS_COARSE && mobileControls) mobileControls.style.display="none";
  setPaused(false); pointerDown=false; pointerX=null;
  try { pauseAllMusic(); } catch(_){}
  if (score > highScore) { highScore=score; try{localStorage.setItem("booha_hiscore",highScore);}catch(_){} }
  if (endVideoEl) {
    endVideoEl.style.pointerEvents="auto";
    endVideoEl.pause(); endVideoEl.currentTime=0; endVideoEl.muted=false;
    endVideoEl.play().catch(()=>{});
    requestAnimationFrame(()=>{ endVideoEl.style.opacity="1"; });
  }
}

function tick(ts) {
  requestAnimationFrame(tick);
  if (endPlaying) { draw(); return; }
  try {
    const t=ts/1000;
    const rawDt=Math.min(0.033, (t-last)||0);
    last=t;
    updateShake(rawDt);

    // Hit stop — count down in real time but skip gameplay updates
    if (hitStopTimer > 0) {
      hitStopTimer = Math.max(0, hitStopTimer - rawDt);
      draw();
      return;
    }
    const dt = rawDt;

    if (started && player.energy>0 && !paused) {
      update(dt); updateFiring(dt); updateProjectiles(dt); updateDiveCollisions();
      updateDroppers(dt); updateCandy(dt); updateParticles(dt); updateWaveSystem(dt);
    } else if (started && bossCinematic.active && !paused) {
      updateBossCinematic(dt); updateParticles(dt);
      screenFlash.alpha=Math.max(0,screenFlash.alpha-dt*3);
    }
    if (started && player.energy<=0 && lives<=0) { triggerEndVideo(); return; }
    draw();
  } catch(err) { console.warn(err); }
}

// ════════════════════════════════════════
// BOOT
// ════════════════════════════════════════
(async function boot() {
  resize();

  // Load friend images at runtime
  for (const fd of FRIENDS_RUNTIME) {
    loadImg(fd.src).then(img => {
      fd.img=img;
      activeFriends.forEach(f => { if (f.id===fd.id) f.img=img; });
    }).catch(()=>{});
  }

  try {
    bgm = new Audio(ASSET_PATHS.bgm);
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = 0.6;
    bgm.addEventListener("error", () => {
      if (started && !paused) {
        clearTimeout(audioRetryTimer);
        audioRetryTimer = setTimeout(() => playAudioElement(bgm), 900);
      }
    });
  } catch(_){}
  try {
    candySfx = new Audio(ASSET_PATHS.candySfx);
    candySfx.preload = "auto";
    candySfx.volume = 1;
  } catch(_){}

  try {
    const [bg,b1,b2,bugN,bugH,bugB,candy,r1,r2,r3,r4] = await Promise.all([
      loadImg(ASSET_PATHS.background),
      loadImg(ASSET_PATHS.booIdle),
      loadImg(ASSET_PATHS.booShoot),
      loadImg(ASSET_PATHS.bugNormal),
      loadImg(ASSET_PATHS.bugHurt),
      loadImg(ASSET_PATHS.bugBoss),
      loadImg(ASSET_PATHS.candy),
      ...ASSET_PATHS.rocks.map(loadImg),
    ]);
    IMG.bg=bg; IMG.booIdle=b1; IMG.booShoot=b2;
    IMG.bugNormal=bugN; IMG.bugHurt=bugH; IMG.bugBoss=bugB;
    IMG.candy=candy; IMG.rocks=[r1,r2,r3,r4];
  } catch(err) { console.warn("Asset load:", err); }

  resetGame();
  window.addEventListener("deviceorientation", handleTiltEvent, true);

  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      ensureAudio();
      started=true;
      if (IS_COARSE && mobileControls) mobileControls.style.display="block";
      updateOrientationGate();
      LOCKED_SCALE=GAME_SCALE;
      document.getElementById("startOverlay").style.display="none";
      try {
        if (candySfx) { candySfx.muted=true; candySfx.play().catch(()=>{}); setTimeout(()=>{ candySfx.pause(); candySfx.currentTime=0; candySfx.muted=false; },50); }
     } catch(_){}
      endVideoEl = document.getElementById("endVideo");
      if (endVideoEl) {
        endVideoEl.pause(); endVideoEl.currentTime=0; endVideoEl.muted=true;
        endVideoEl.play().catch(()=>{});
        setTimeout(()=>{ try{ endVideoEl.pause(); endVideoEl.currentTime=0; endVideoEl.muted=false; }catch(_){} },60);
        
        endVideoEl.addEventListener("ended", ()=>{
          endVideoEl.pause(); endVideoEl.currentTime=0;
          endVideoEl.style.opacity="0"; endVideoEl.style.pointerEvents="none";
          window.location.href = "karasuki.html?room=room_07";
        });
      }

      resetGame();
      try { resumeAllMusic(); } catch(_){}
      startWave(1);
    });
  }

  // If a browser rejected music during a background/visibility transition,
  // the next real user gesture gives us a safe opportunity to resume it.
  const retryAudioFromGesture = () => {
    if (!started) return;
    ensureAudio();
    if (!paused) resumeAllMusic();
  };
  addEventListener("pointerdown", retryAudioFromGesture, { passive: true });
  addEventListener("keydown", retryAudioFromGesture, { passive: true });
  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && started && !paused) resumeAllMusic();
  });

 document.getElementById("startExitBtn")?.addEventListener("pointerdown", e => {
    e.preventDefault(); e.stopPropagation();
    window.location.href = "karasuki.html?room=room_07";
  }, { passive: false });
  requestAnimationFrame(tick);
})();
