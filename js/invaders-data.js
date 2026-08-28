
// ═══════════════════════════════════════════════════════════
// BOOHA INVADERS — Data & Tuning
// js/invaders-data.js
//
// Edit this file to tune difficulty, add waves, adjust candy
// weights, unlock friends at different waves, change asset paths.
// No game logic lives here — only lookup tables and constants.
// ═══════════════════════════════════════════════════════════

// ── ASSET PATHS ──────────────────────────────────────────────
const ASSET_BASE = "assets/invaders/";

const ASSET_PATHS = {
  background:  ASSET_BASE + "background.webp",
  booIdle:     ASSET_BASE + "booha-invad-1.webp",
  booShoot:    ASSET_BASE + "booha-invad-2.webp",
  bugNormal:   ASSET_BASE + "bug-1.webp",   // default Dotty
  bugHurt:     ASSET_BASE + "bug-2.webp",   // hit-flash sprite (shown briefly on damage)
  bugBoss:     ASSET_BASE + "bug-3.webp",   // angry boss sprite (phase 2 + 3)
  candy:       ASSET_BASE + "candy.webp",
  rocks:       [
    ASSET_BASE + "rock1.webp",
    ASSET_BASE + "rock2.webp",
    ASSET_BASE + "rock3.webp",
    ASSET_BASE + "rock4.webp",
  ],
  bgm:         ASSET_BASE + "invaders-bgm.mp3",
  bossMusic:   [
    ASSET_BASE + "dotty-boss-1.mp3",
    ASSET_BASE + "dotty-boss-2.mp3",
    ASSET_BASE + "dotty-boss-3.mp3",
  ],
  endVideo:    ASSET_BASE + "b-i-endscreen.mp4",
};

// ── PLAYER ───────────────────────────────────────────────────
const PLAYER_CONFIG = {
  maxLives:    3,
  maxEnergy:   100,
  respawnEnergy: 40,      // energy restored on life loss (if lives remain)
  iFramesDuration: 0.55,  // seconds of invincibility after a hit
  respawnIFrames:  2.0,   // longer iframes on respawn
};

// ── BOSS ─────────────────────────────────────────────────────
const BOSS_CONFIG = {
  every:       5,          // boss appears every N waves
  baseHp:      35,
  hpGainPerBoss: 28,       // +HP per successive boss
  baseSize:    1.6,        // size multiplier relative to normal bug
  sizeGrowth:  0.35,       // +size per successive boss
  cinematicDur: 2.2,       // seconds for boss intro cinematic
  shieldPost:  2.0,        // seconds of post-enter shield
};

// ── WEAPON LEVELS ────────────────────────────────────────────
// Combo thresholds that unlock higher spread levels
const WEAPON_COMBO_THRESHOLDS = {
  level2: 7,   // spread gun
  level3: 15,  // burst gun
  level4: 30,  // pierce gun
};

// Weapon identity matters more than raw projectile count. Combo weapons stay
// readable and capped; candy weapons temporarily grant a distinct mode.
const WEAPON_MODES = {
  pulse:  { en: "PULSE",  jp: "パルス",  color: "#fff0a8" },
  spread: { en: "SPREAD", jp: "ひろがる", color: "#74d9ff" },
  burst:  { en: "BURST",  jp: "れんしゃ", color: "#ff8bd8" },
  pierce: { en: "PIERCE", jp: "かんつう", color: "#d2a5ff" },
};

// ── CANDY ────────────────────────────────────────────────────
const CANDY_TYPES = ["pink", "blue", "gold", "green", "star"];

// Pool of candy types to randomly pick from per wave bracket.
// pink  = energy + boost
// blue  = 30s spread gun
// star  = 30s pierce gun
// gold  = score bomb (wipes all normal bugs)
// green = shield (8s)
const CANDY_WEIGHTS = {
  early:  ["pink","pink","pink","blue"],               // wave 1–4
  mid:    ["pink","pink","pink","blue","blue"],         // wave 5–9
  late:   ["pink","pink","blue","blue","blue","gold"],  // wave 10–14
  chaos:  ["pink","pink","blue","blue","star","gold","green"], // wave 15+
};

const CANDY_CONFIG = {
  shieldDuration:   8.0,   // seconds shield lasts
  timedWeaponSecs:  30,    // seconds timed weapons last
  spawnInterval:    [7, 11], // [min, max] seconds between candy drops
};

// ── WAVE TIERS ───────────────────────────────────────────────
// Each tier defines how many bugs spawn per group (4 groups per wave).
// Progress within a tier smoothly interpolates between min and max group sizes.
const WAVE_TIERS = [
  // The first four waves are the onboarding runway. Keep four formations,
  // but make them small enough that the player reaches the first boss quickly.
  { from:  1, to:  4,  groups: [2,  3,  4,  4]  },
  { from:  5, to: 10,  groups: [4,  8, 12, 16]  },
  { from: 11, to: 20,  groups: [6, 12, 18, 24]  },
  { from: 21, to: 30,  groups: [10, 18, 26, 34] },
  { from: 31, to: 50,  groups: [14, 22, 32, 42] },
];

// Extra bugs added based on tier progress (0 = start of tier, max = end)
const WAVE_EXTRA_BUGS = {
  tier1: 0,   // waves 1–4: no extras
  tier2: 4,   // waves 5–10
  tier3: 8,   // waves 11–20
  tier4: 12,  // waves 21–30
  tier5: 16,  // waves 31–50
};

// ── WAVE PACING ──────────────────────────────────────────────
const WAVE_SCALE = {
  introDelaySec:         0.35,  // short breath before the wave begins
  waveCardSec:           1.15,  // cards should announce, not block play

  spawnIntervalBase:     0.38,  // seconds between bug spawns at wave 1
  spawnIntervalMin:      0.09,  // fastest possible spawn interval
  spawnIntervalDropPerWave: 0.010, // how much faster each wave gets

  driftBase:             10,    // px/s of idle drift at wave 1
  driftGainPerWave:      0.6,   // drift increase per wave
  driftMax:              48,    // hard cap on drift speed

  fireCooldownBase:      5.0,   // seconds between bug shots at wave 1
  fireCooldownMin:       1.2,   // fastest a bug can fire
  fireCooldownDropPerWave: 0.08, // how much faster each wave gets
};

// ── SKILL HEAT ───────────────────────────────────────────────
// Skill multiplier adjusts difficulty dynamically based on how
// quickly the player clears each group of bugs.
const SKILL_CONFIG = {
  initial:     1.0,
  carryMult:   0.88, // how much of last wave's skill carries over (0=reset, 1=full carry)
  carryAdd:    0.12,
  min:         0.70,
  max:         2.0,
  // Bonus HP added to bugs when skill is elevated
  bonusHpTiers: [
    { threshold: 1.3, bonus: 1 },
    { threshold: 1.6, bonus: 2 },
    { threshold: 1.9, bonus: 3 },
  ],
};

// ── COMBO ────────────────────────────────────────────────────
const COMBO_CONFIG = {
  decaySeconds: 2.8,  // seconds before combo resets with no kills
};

// ── FRIEND UNLOCKS ───────────────────────────────────────────
// Friends join the fight when the player reaches the given wave.
// img is loaded at runtime; src points to the asset.
const FRIENDS_UNLOCK = [
  { wave:  5, id: "blue",   src: ASSET_BASE + "blue-boo.webp",   color: "rgba(100,200,255,1)", shotColor: "#a8e8ff" },
  { wave: 10, id: "green",  src: ASSET_BASE + "green-boo.webp",  color: "rgba(100,255,160,1)", shotColor: "#afffcc" },
  { wave: 15, id: "pink",   src: ASSET_BASE + "pink-boo.webp",   color: "rgba(255,140,220,1)", shotColor: "#ffcfee" },
  { wave: 20, id: "purple", src: ASSET_BASE + "purple-boo.webp", color: "rgba(180,100,255,1)", shotColor: "#d4aaff" },
];

// ── MILESTONE WAVES ──────────────────────────────────────────
// Waves that trigger a celebration banner (not boss waves).
const MILESTONE_WAVES = new Set([5, 10, 15, 20]);

const MILESTONE_TEXT = {
   5: { en: "WAVE 5!",  jp: "なかまが くるよ！ / Friends incoming!" },
  10: { en: "WAVE 10!", jp: "もっと なかまが！ / More friends!" },
  15: { en: "WAVE 15!", jp: "がんばれ！ / Keep going!" },
  20: { en: "WAVE 20!", jp: "つよすぎ！！ / You're incredible!!" },
};

// ── STAR RATING THRESHOLDS ───────────────────────────────────
// Stars shown on game over screen based on wave reached.
const STAR_RATING_WAVES = [
  { stars: 3, wave: 20 },
  { stars: 2, wave: 10 },
  { stars: 1, wave:  5 },
  { stars: 0, wave:  0 },
];

const STAR_LABELS = [
  { jp: "まだまだ！",   en: "Keep trying!" },
  { jp: "いいね！",     en: "Nice job!" },
  { jp: "すごい！",     en: "Awesome!" },
  { jp: "かんぺき！",   en: "Perfect!" },
];

// ── DROPPER (! BOMBERS) ──────────────────────────────────────
const DROPPER_CONFIG = {
  startWave:       3,          // droppers begin spawning at this wave
  intervalBase:    12,         // seconds between spawns at wave 3
  intervalMin:     5,          // fastest spawn interval
  intervalDropPerWave: 0.4,    // how much faster each wave
  fallSpeedMin:    220,        // px/s min fall speed
  fallSpeedMax:    320,        // px/s max fall speed
  aimSpread:       0.20,       // ±fraction of screen width aim randomness
  playerDamage:    22,         // energy damage on direct player hit
  rockDamage:      3,          // bomber contact damages a rock; it does not delete it
};

// ── HIT STOP ─────────────────────────────────────────────────
// Brief game-freeze on kill — makes every shot feel weighted.
const HIT_STOP = {
  normalKill:  0.04,   // seconds to freeze on a normal bug kill
  bossHit:     0.05,   // seconds to freeze each time boss is damaged
  bossDeath:   0.10,   // seconds to freeze at the start of boss death sequence
};

// ── BOSS DEATH SEQUENCE ───────────────────────────────────────
// Staged explosion — small pops, then the big bang.
const BOSS_DEATH = {
  popCount:    6,      // number of small pre-explosions
  popInterval: 0.09,   // seconds between each small pop
  popSpread:   0.40,   // fraction of boss size for pop position spread
  bigDelay:    0.55,   // seconds after first pop before the main explosion
};

// ── DOTTY SPRITE STATES ───────────────────────────────────────
const DOTTY_SPRITES = {
  hurtFlashDur: 0.10,  // seconds the hurt sprite shows after taking a hit
};

// ── ENEMY SHADOW ─────────────────────────────────────────────
const SHADOW_CONFIG = {
  yOffset:     8,      // px below enemy centre
  xScale:      0.70,   // shadow ellipse width as fraction of enemy width
  yScale:      0.18,   // shadow ellipse height as fraction of enemy width
  alphaBase:   0.28,   // opacity at normal height
  alphaBoost:  0.14,   // extra opacity added as enemy gets closer to player
};

// ── SCREEN SHAKE MAGNITUDES ──────────────────────────────────
// Centralised so you can tune feel without hunting through engine code.
const SHAKE_CONFIG = {
  bugHit:       { mag:  8, dur: 0.20 },
  playerHit:    { mag:  8, dur: 0.20 },
  lifeLoss:     { mag: 22, dur: 1.00 },
  bossPhase:    { mag: 10, dur: 0.25 },
  bossPhase3:   { mag: 14, dur: 0.30 },
  bossDeath:    { mag: 28, dur: 1.20 },
  dropperRock:  { mag:  4, dur: 0.10 }, // small impact cue when a bomber damages a rock
  dropperPlayer:{ mag: 10, dur: 0.30 },
  bossCinematic:{ mag: 25, dur: 1.00 },
};

// ── TILT CONTROLS ────────────────────────────────────────────
const TILT_CONFIG = {
  deadZone:  4,    // degrees of tilt ignored (prevents drift)
  maxAngle:  8,    // degrees at which max speed is reached
  speed:     380,  // px/s at full tilt
};

// ── ROCK HP ──────────────────────────────────────────────────
const ROCK_CONFIG = {
  count:       4,
  baseHp:      8,
  hpGainPerWave: 2,
  maxHp:       30,
  shotDamage:  1,
};
