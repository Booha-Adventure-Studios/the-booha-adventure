/*
 * Muenba world shell — navigation, atmosphere, Nuppi's lobby welcome, durable
 * Muenba save/progress, and the ghost-hunting core loop: one
 * wandering ghost per room, a friendly-vs-hostile behavior split, a Hide
 * button, and click-to-attempt capture. Pass 8A owns the explicit capture
 * session hand-off, Pass 8B supplies the first two-lane rhythm capture, and
 * Pass 8C/8D complete the orb-return loop and its testing/accessibility polish.
 */
(() => {
  'use strict';

  const DATA = window.MUENBA_DATA;
  if (!DATA) {
    console.error('[Muenba] MUENBA_DATA is missing.');
    return;
  }

  const WORLD_W = DATA.worldWidth;
  const WORLD_H = DATA.worldHeight;
  // Booha and the Muenba ghosts use separate scales. The ghost artwork has
  // generous transparent padding, so its draw radius is larger than its
  // gameplay footprint to make the visible character read correctly.
  const BOOHA_R = 26;
  const GHOST_R = 36;
  // Pass 1 scale pass: enlarge only the visible art. GHOST_R and the click
  // radius stay unchanged so encounters keep the same gameplay footprint.
  const GHOST_DRAW_R = 72;
  // The ghost sprites are 2048px square with wide transparent margins. Draw
  // the useful center crop so the visible ghost, rather than the empty
  // canvas around it, determines its gameplay scale.
  const GHOST_ART_CROP = { x: 256, y: 256, size: 1536 };
  const CENTER_X = WORLD_W / 2;
  const CENTER_Y = WORLD_H / 2;
  const BASE_SPEED = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 768 ? 8 : 5.5;
  const TARGET_DT = 1000 / 60;
  const FADE_MS = 600;
  const TRANSITION_COOLDOWN_MS = 1400;
  const ARRIVAL_ARROW_DELAY_MS = 1300;
  const ARRIVAL_ARROW_BACK_DELAY_MS = 3800;
  const ARROW_MOVE_THRESHOLD = 30;
  const CLICK_STOP_DIST = 6;
  const ENTRY_DRIFT_MAX_MS = 2200;
  const NPP_RADIUS = 42;
  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

  // The real return path (Pass 2) — mirrors Karasuki's own MUENBA_PORTAL
  // (room_13, glowing orb, click + walk-proximity trigger) so the return
  // trip uses the exact interaction language the player already learned on
  // the way in. Sits at the same bottom-of-room_01 spot the 'fromKarasuki'
  // spawn already uses, so arriving and leaving feel like the same doorway.
  const KARASUKI_RETURN_PORTAL = { roomId: 'room_01', x: 768, y: 830, r: 44, triggerR: 36 };
  // Keep Nuppi on the upper path, but clear of room_01's up arrow at x:767,
  // y:284 so the guide and the exit remain separate targets.
  const MUENBA_NUPPI = { roomId: 'room_01', x: 940, y: 215, hitR: 76, drawR: 54 };
  // Real hunt targets should not appear in Nuppi's two direct approach rooms.
  // Derive this from the room graph so the safe approach remains correct if
  // the maze connections change later. Generic Jerk threats may still use
  // these rooms during the return trip.
  const MUENBA_NUPPI_APPROACH_ROOMS = new Set(
    (DATA.rooms[MUENBA_NUPPI.roomId]?.exits || []).map(exit => exit.to)
  );
  const POPUP_COOLDOWN_MS = 900;

  // Short event sounds share the Karasuki/Utsuroba palette. Muenba keeps its
  // local reading-cue context for word timing, while popup and button sounds
  // use this central, lazy WebAudio helper. BGM and looped tracks never pass
  // through this function.
  function playUiSfx(name) {
    try {
      const sound = window.UtsuSfx && window.UtsuSfx[name];
      if (typeof sound === 'function') sound();
    } catch (_) {}
  }

  // ── Ghost hunting core loop (Pass 7) ────────────────────────────────────
  // Chase speed stays well under BASE_SPEED (5.5-8) on purpose — a chasing
  // ghost can close in if the player stands still or walks toward it, but
  // never actually corners anyone. Getting caught is a startle, not a fail
  // state: it bumps the player back a step and costs nothing.
  const GHOST_WANDER_SPEED = 1.1;
  const GHOST_CHASE_SPEED = GHOST_WANDER_SPEED;
  const GHOST_DETECT_R = 230;
  const GHOST_CATCH_R = 60;
  const GHOST_CLICK_R = 64;
  // Ordinary sight-angry ghosts build tension for two seconds before they
  // reveal the scream. Jerks use a shorter warning, while carried energy
  // skips the warning entirely.
  const GHOST_NOTICE_DELAY_MS = 2000;
  const JERK_NOTICE_DELAY_MS = 700;
  const JERK_CHASE_SPEED = 1.55;
  // Carrying energy puts the whole cemetery on immediate alert. This is fast
  // enough to make the return trip dangerous, but still below Booha's speed.
  const GHOST_CARRY_CHASE_SPEED = 1.6;
  // Hiding calms the encounter, but does not instantly clear the room. Let a
  // hostile ghost search nearby for a longer beat before it slips away.
  const GHOST_GIVEUP_HIDE_MS = 6000;
  const GHOST_HIDE_SEARCH_SPEED = .45;
  const GHOST_STARTLE_COOLDOWN_MS = 1400;
  const GHOST_TELEPORT_MIN_MS = 8500;
  const GHOST_TELEPORT_MAX_MS = 14000;
  const GHOST_TELEPORT_WARNING_MS = 1400;
  const GHOST_ROOM_EXIT_R = 42;
  const GHOST_MIN_SPAWN_DISTANCE = 170;
  const ORB_REWARD_PER_CAPTURE = 3;
  const MUENBA_MUSIC_VOLUME = 0.55;
  const MUENBA_SCREAM_DUCK_VOLUME = 0.16;
  const MUENBA_DANGER_RHYTHM_VOLUME = 0.62;
  const MUENBA_DANCE_FALLBACK_MS = 11000;
  const MUENBA_DANCE_SETTLE_MS = 750;
  // Pass 1 reading attention gate. The intro still uses this as a brief,
  // non-punitive pause. Pass 18B uses the word-sweep timings below for clue
  // records so the English itself becomes the quiet lock before CHECK.
  const CASE_READ_GATE_MIN_MS = 2000;
  const CASE_READ_GATE_PER_WORD_MS = 240;
  const CASE_READ_GATE_MAX_MS = 6500;
  const CASE_WORD_SWEEP_BASE_MS = 720;
  const CASE_WORD_SWEEP_KEYWORD_EXTRA_MS = 250;
  const CASE_WORD_SWEEP_FINAL_HOLD_MS = 1500;
  const CASE_WRONG_CLUE_COOLDOWN_MS = 1500;
  const CASE_FINAL_PENALTY_MAX = 2;
  const CASE_FINAL_PENALTY_ACCURACY_STEP = 5;
  // Pass 18F — procedural reading cues. These stay deliberately quieter than
  // the world music so the English remains the focus, and require no extra
  // audio assets or network requests.
  const CASE_AUDIO_WORD_TICK_VOLUME = 0.018;
  const CASE_AUDIO_KEYWORD_VOLUME = 0.055;
  const CASE_AUDIO_UNLOCK_VOLUME = 0.08;

  // Pass 8B — first rhythm chart. It is intentionally short and forgiving:
  // no simultaneous notes, holds, combos, or punishment yet. The chart is
  // data-shaped so a later pass can move it into muenba-data.js without
  // changing the timing engine.
  const RHYTHM_CHART = ['don', 'kat', 'don', 'kat', 'kat', 'don', 'kat', 'don'];
  const RHYTHM_BPM = 96;
  const RHYTHM_NOTE_MS = 60000 / RHYTHM_BPM;
  const RHYTHM_COUNTDOWN_MS = 1800;
  const RHYTHM_TRAVEL_MS = 1200;
  const RHYTHM_NOTE_DISTANCE = 168;
  const RHYTHM_PERFECT_MS = 110;
  const RHYTHM_GOOD_MS = 220;
  const RHYTHM_PASS_ACCURACY = 60;
  const PRACTICE_RHYTHM_CHART = ['don', 'kat', 'don', 'don', 'kat', 'don'];
  const PRACTICE_RHYTHM_BPM = 72;
  const PRACTICE_RHYTHM_NOTE_MS = 60000 / PRACTICE_RHYTHM_BPM;
  const PRACTICE_RHYTHM_COUNTDOWN_MS = 1400;
  const PRACTICE_RHYTHM_TRAVEL_MS = 1050;
  const PRACTICE_RHYTHM_PERFECT_MS = 150;
  const PRACTICE_RHYTHM_GOOD_MS = 300;
  const PRACTICE_RHYTHM_PASS_ACCURACY = 50;
  const MUENBA_CASE_MODES = ['start', 'fresh', 'deep'];
  const MUENBA_MEMORY_MODE_LABELS = {
    start: 'Starter Memory',
    fresh: 'Case Memory',
    deep: 'Deep Memory'
  };
  const MUENBA_MEMORY_MODE_JP = {
    start: '<ruby>子<rt>こ</rt></ruby>ども<ruby>向<rt>む</rt></ruby>けの<ruby>記憶<rt>きおく</rt></ruby>',
    fresh: '<ruby>事件<rt>じけん</rt></ruby>の<ruby>記憶<rt>きおく</rt></ruby>',
    deep: '<ruby>深<rt>ふか</rt></ruby>い<ruby>記憶<rt>きおく</rt></ruby>'
  };

  // Pass 3 — the hostile ghost gets a shorter, faster danger chart. It is
  // intentionally readable rather than punishing: six notes at 150 BPM,
  // with the same 60% pass line as the normal capture.
  const DANGER_RHYTHM_CHART = ['don', 'kat', 'kat', 'don', 'kat', 'don'];
  const DANGER_RHYTHM_BPM = 150;
  const DANGER_RHYTHM_NOTE_MS = 60000 / DANGER_RHYTHM_BPM;
  const DANGER_RHYTHM_COUNTDOWN_MS = 1000;
  const DANGER_RHYTHM_TRAVEL_MS = 700;
  const DANGER_RHYTHM_PERFECT_MS = 80;
  const DANGER_RHYTHM_GOOD_MS = 170;
  const DANGER_RHYTHM_PASS_ACCURACY = 60;
  // Pass 4 — carrying energy turns a danger encounter into the return
  // journey's super-danger chart: faster, four lanes, and decoy notes.
  const SUPER_DANGER_RHYTHM_CHART = [
    { lane: 'don', beat: 0 },
    { lane: 'kat', beat: 1 },
    { lane: 'rim', beat: 2 },
    { lane: 'bell', beat: 3, decoy: true, shape: 'spiral' },
    { lane: 'bell', beat: 3 },
    { lane: 'don', beat: 4 },
    { lane: 'rim', beat: 5 },
    { lane: 'kat', beat: 6, decoy: true, shape: 'skull' },
    { lane: 'kat', beat: 6 },
    { lane: 'bell', beat: 7 },
    { lane: 'don', beat: 8 },
    { lane: 'rim', beat: 9 },
    { lane: 'kat', beat: 10 },
    { lane: 'bell', beat: 11 }
  ];
  const SUPER_DANGER_RHYTHM_BPM = 180;
  const SUPER_DANGER_RHYTHM_COUNTDOWN_MS = 800;
  const SUPER_DANGER_RHYTHM_TRAVEL_MS = 560;
  const SUPER_DANGER_RHYTHM_PERFECT_MS = 58;
  const SUPER_DANGER_RHYTHM_GOOD_MS = 122;
  const SUPER_DANGER_RHYTHM_PASS_ACCURACY = 65;

  const RHYTHM_LANE_DEFS = [
    { id: 'don', label: 'DON / ドン', key: 'A', shape: 'circle' },
    { id: 'kat', label: 'KAT / カッ', key: 'S', shape: 'diamond' },
    { id: 'rim', label: 'RIM / リム', key: 'D', shape: 'triangle' },
    { id: 'bell', label: 'BELL / ベル', key: 'F', shape: 'star' }
  ];
  const RHYTHM_LANE_BY_ID = Object.fromEntries(RHYTHM_LANE_DEFS.map(lane => [lane.id, lane]));

  // Permanent progression is based on successful ghost captures, not weekly
  // availability. New mechanics such as extra lanes and decoys can build on
  // these tiers later; this pass increases chart length and timing pressure
  // while keeping the two-lane rules familiar.
  const RHYTHM_DIFFICULTY_TIERS = [
    {
      minCaptures: 0,
      label: 'First haunting',
      lanes: ['don', 'kat'],
      chart: RHYTHM_CHART,
      bpm: RHYTHM_BPM,
      travelMs: RHYTHM_TRAVEL_MS,
      perfectMs: RHYTHM_PERFECT_MS,
      goodMs: RHYTHM_GOOD_MS,
      dangerChart: DANGER_RHYTHM_CHART,
      dangerBpm: DANGER_RHYTHM_BPM,
      dangerTravelMs: DANGER_RHYTHM_TRAVEL_MS,
      dangerPerfectMs: DANGER_RHYTHM_PERFECT_MS,
      dangerGoodMs: DANGER_RHYTHM_GOOD_MS
    },
    {
      minCaptures: 3,
      label: 'Restless path',
      lanes: ['don', 'kat'],
      chart: ['don', 'kat', 'don', 'kat', 'kat', 'don', 'kat', 'don', 'kat', 'don'],
      bpm: 102,
      travelMs: 1140,
      perfectMs: 105,
      goodMs: 205,
      dangerChart: ['don', 'kat', 'kat', 'don', 'kat', 'don', 'don', 'kat'],
      dangerBpm: 156,
      dangerTravelMs: 680,
      dangerPerfectMs: 76,
      dangerGoodMs: 160
    },
    {
      minCaptures: 7,
      label: 'Deep cemetery',
      lanes: ['don', 'kat', 'rim'],
      chart: [
        { lane: 'don', beat: 0 },
        { lane: 'kat', beat: 1 },
        { lane: 'rim', beat: 2 },
        { lane: 'don', beat: 3 },
        { lane: 'rim', beat: 4, decoy: true, shape: 'skull' },
        { lane: 'kat', beat: 4 },
        { lane: 'don', beat: 5 },
        { lane: 'rim', beat: 6 },
        { lane: 'kat', beat: 7 },
        { lane: 'rim', beat: 7 },
        { lane: 'don', beat: 8 },
        { lane: 'kat', beat: 9 }
      ],
      bpm: 108,
      travelMs: 1080,
      perfectMs: 98,
      goodMs: 190,
      dangerChart: ['don', 'kat', 'kat', 'don', 'kat', 'don', 'kat', 'don', 'kat'],
      dangerBpm: 162,
      dangerTravelMs: 660,
      dangerPerfectMs: 72,
      dangerGoodMs: 152
    },
    {
      minCaptures: 12,
      label: 'Muenba after dark',
      lanes: ['don', 'kat', 'rim', 'bell'],
      chart: [
        { lane: 'don', beat: 0 },
        { lane: 'kat', beat: 1 },
        { lane: 'rim', beat: 2 },
        { lane: 'bell', beat: 3 },
        { lane: 'don', beat: 4 },
        { lane: 'rim', beat: 5, decoy: true, shape: 'skull' },
        { lane: 'kat', beat: 5 },
        { lane: 'bell', beat: 6 },
        { lane: 'don', beat: 7 },
        { lane: 'kat', beat: 7 },
        { lane: 'rim', beat: 8 },
        { lane: 'bell', beat: 9, decoy: true, shape: 'spiral' },
        { lane: 'don', beat: 9 },
        { lane: 'kat', beat: 10 },
        { lane: 'rim', beat: 11 },
        { lane: 'bell', beat: 12 }
      ],
      bpm: 114,
      travelMs: 1020,
      perfectMs: 92,
      goodMs: 178,
      dangerChart: ['don', 'kat', 'kat', 'don', 'kat', 'don', 'kat', 'don', 'don', 'kat'],
      dangerBpm: 168,
      dangerTravelMs: 640,
      dangerPerfectMs: 68,
      dangerGoodMs: 144
    }
  ];

  const params = new URLSearchParams(window.location.search);
  const DEV_MODE = params.get('dev') === '1';
  if (DEV_MODE) window.__devMuenba = true;
  const requestedRoom = params.get('room');
  const TOUCH_DEVICE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const REDUCED_MOTION = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    roomId: DATA.rooms[requestedRoom] ? requestedRoom : DATA.startRoom,
    spawnId: params.get('from') === 'karasuki' ? 'fromKarasuki' : 'default',
    x: CENTER_X,
    y: CENTER_Y,
    clickTarget: null,
    moving: false,
    transitioning: false,
    transitionReadyAt: 0,
    arrivalDir: null,
    distMovedSinceSpawn: 0,
    spawnLockUntil: 0,
    inputLocked: false,
    musicStarted: false,
    // DEV opens in playable mode. Coordinate pinning is still available from
    // the DEV toggle, but it must not freeze Booha immediately after Nuppi's
    // lobby closes.
    lastTickTime: 0,
    speed: BASE_SPEED,
    fogX: 0,
    returnExiting: false,
    hiding: false,
    captureResolving: false,
    dangerFlashUntil: 0,
    returnToNuppiPending: false,
    cemeteryAlert: false,
    celebrating: false,
    celebrateDancing: false,
    celebrateSettling: false,
    celebrateStart: 0,
    celebrateSettleStart: 0,
    celebrationDeposit: 0,
    celebrationTimer: 0,
    celebrationFinishing: false,
    handoffResolving: false
  };

  let app;
  let stage;
  let roomLayer;
  let roomTintCanvas;
  let roomTintCtx;
  let atmosphereCanvas;
  let actorCanvas;
  let atmosphereCtx;
  let actorCtx;
  let fadeEl;
  let currentBg;
  let vignetteCanvas;
  let carriedEnergyVignetteCanvas;
  let fogTexture;
  let lowFogTexture;
  let wispFogTexture;
  let foregroundFogTexture;
  let lastTouchEnd = 0;
  let entryDrift = null;
  let returnPortalOverlay = null;
  let returnPortalOpen = false;
  let returnPortalCooldownUntil = 0;
  let returnNuppiHint = null;
  let celebrationStatus = null;
  let muenbaProfileLink = null;
  let lobbyOverlay = null;
  let lobbyOpen = false;
  // Ghost hunting core loop (Pass 7): the current room's wandering ghost
  // (or null when this room has none today), its day-seeded room
  // assignment, a Hide-button toggle, and the capture-result overlay.
  let activeGhost = null;
  let ghostRoomMap = null;
  let ghostRoomMapDay = null;
  let ghostRoomMapWeek = null;
  let ghostRoomMapAvailabilityKey = '';
  const ghostSpriteCache = new Map();
  let hideBtn = null;
  let captureOverlay = null;
  let captureOpen = false;
  // Pass 27A: phones use landscape for the explorable world and portrait for
  // reading/rhythm states. The browser request is best-effort; the overlay is
  // the reliable fallback when a browser declines orientation locking.
  let orientationOverlay = null;
  let orientationMode = 'landscape';
  let orientationCheckTimer = 0;
  // Pass 8A: one explicit capture session owns the hand-off from the
  // wandering ghost to the future rhythm game. Keeping the phase here means
  // Pass 8B can attach timing/input without also changing movement, ghost AI,
  // or save writes.
  let captureSession = null;
  let motes = [];
  const moteSpriteCache = new Map();
  const spiritGlowCache = new Map();
  let spiritMaskCanvas = null;
  const imageCache = new Map();
  const roomGlowCache = new Map();
  let boohaTrailSprite = null;
  const roomGlowRgbCache = new Map();
  // Off-center light pools keep the room from reading like a colored
  // spotlight placed behind Booha. Each room adds a small deterministic
  // drift below so the cemetery composition changes without moving exits.
  const GLOW_SPOTS = [
    { x: 500, y: 270, r: 320 },
    { x: 1060, y: 690, r: 350 },
    { x: 1260, y: 390, r: 210 }
  ];
  // A restrained field of slow hitodama particles adds life without turning
  // the cemetery into a glitter effect; layered ground fog remains the main
  // atmospheric motion.
  const MOTE_COUNT = 18;

  // 9B: fog is still drawn from the same cached textures, but each room gets
  // a different composition so the cemetery does not feel like one repeated
  // filter. The values are deliberately restrained around the walkable path.
  const FOG_MOODS = {
    low:     { speed: .72, direction: 1,  upper: .34, middle: .18, low: .92, echo: .38, upperY: 165, middleY: 360, phase: .2 },
    high:    { speed: .44, direction: -1, upper: .92, middle: .58, low: .24, echo: .16, upperY: 95,  middleY: 275, phase: 1.8 },
    cross:   { speed: 1.02, direction: 1,  upper: .58, middle: .92, low: .44, echo: .60, upperY: 215, middleY: 405, phase: 3.1 },
    sparse:  { speed: .38, direction: -1, upper: .30, middle: .24, low: .32, echo: .18, upperY: 125, middleY: 430, phase: 4.5 },
    sinking: { speed: .66, direction: -1, upper: .52, middle: .52, low: .84, echo: .48, upperY: 255, middleY: 465, phase: 5.7 }
  };

  // The first 5 hunt-able ghosts (Pass 4) now live in muenba-data.js
  // (Pass 5) so muenba-profile.html's case-file roster reads the exact
  // same list instead of a second hand-kept copy — see muenba-data.js for
  // the tinklet/"Tinkley" naming note.
  const GHOSTS = DATA.ghosts || [];
  const ANGRY_CHANGE_IMG = DATA.ghostAngryChangeImg || '';
  // Pass 15: a generic hostile-only ghost, never huntable and never shown on
  // the profile page. Several instances of it fill rooms the real ghost
  // roster has emptied out (see getGhostRoomMap()) so the cemetery keeps
  // feeling populated as the week's real ghosts get caught.
  const JERK_GHOST = DATA.jerk || null;
  const JERK_COUNT = 5;
  // Return trips are meant to feel meaningfully more crowded, but not so
  // saturated that every room becomes an unavoidable fight. The map has
  // enough empty rooms for eight in the normal five-target case.
  const JERK_RETURN_COUNT = 8;
  function isJerkGhostId(ghostId) {
    return typeof ghostId === 'string' && ghostId.indexOf('jerk_') === 0;
  }
  // Pass 1: one source of truth for the Muenba encounter roles. Later
  // behavior passes use these rules to choose neutral hunt behavior,
  // dangerous wrong-ghost behavior, or carried-energy escalation.
  const GHOST_ROLE_RULES = Object.freeze({
    'hunt-target': Object.freeze({
      huntable: true,
      neutralDuringHunt: true,
      alwaysAngry: false,
      dangerCanHide: true
    }),
    jerk: Object.freeze({
      huntable: false,
      neutralDuringHunt: false,
      alwaysAngry: true,
      dangerCanHide: false
    })
  });
  function ghostRoleFor(ghostOrId) {
    const ghostId = typeof ghostOrId === 'string' ? ghostOrId : ghostOrId && ghostOrId.id;
    if (isJerkGhostId(ghostId)) return 'jerk';
    const ghost = typeof ghostOrId === 'object'
      ? ghostOrId
      : GHOSTS.find(candidate => candidate.id === ghostId);
    return ghost && GHOST_ROLE_RULES[ghost.role] ? ghost.role : 'hunt-target';
  }
  function ghostRulesFor(ghostOrId) {
    return GHOST_ROLE_RULES[ghostRoleFor(ghostOrId)];
  }
  function isMainHuntGhostId(ghostId) {
    return ghostRoleFor(ghostId) === 'hunt-target';
  }
  function isCurrentHuntTarget(activeGhostState) {
    return !!activeGhostState
      && activeGhostState.isHuntTarget === true
      && activeGhostState.ghost.id === currentHuntGhostId();
  }

  function makeMuenbaDeferredImage(src) {
    return { img: new Image(), src, requested: false };
  }

  function ensureMuenbaImage(image) {
    if (!image) return null;
    if (!image.requested) {
      image.requested = true;
      image.img.decoding = 'async';
      image.img.src = image.src;
    }
    return image.img;
  }

  const ghostImg = new Image();
  ghostImg.src = 'assets/img/booha_ghost.webp';
  const hidingImg = new Image();
  hidingImg.src = 'assets/img/muenba/hiding.webp';
  // Reusing Nuppi's existing wandering-NPC art from Karasuki (same asset
  // path, no new files) rather than a new character for the lobby host.
  const nuppiLobbyImg = new Image();
  nuppiLobbyImg.src = 'assets/img/wanderers/nuppi-2.webp';
  const music = new Audio('assets/img/muenba/Muenba_BGM.mp3');
  music.preload = 'auto';
  music.loop = true;
  music.volume = MUENBA_MUSIC_VOLUME;
  const dangerRhythmMusic = new Audio('assets/img/muenba/rhythm.mp3');
  dangerRhythmMusic.preload = 'auto';
  dangerRhythmMusic.loop = true;
  dangerRhythmMusic.volume = MUENBA_DANGER_RHYTHM_VOLUME;
  const muenbaDance = new Audio('assets/img/muenba/muenba_dance.mp3');
  muenbaDance.preload = 'auto';
  muenbaDance.loop = false;
  muenbaDance.volume = 0.72;
  // A short pool prevents a fast chart from cutting off the previous get or
  // miss sound when two notes land close together. The files are small, so a
  // three-voice pool is cheaper and more reliable than creating audio nodes
  // during play.
  function makeRhythmSfxPool(src, volume, size = 3) {
    return Array.from({ length: size }, () => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = volume;
      return audio;
    });
  }
  const rhythmHitSfxPool = makeRhythmSfxPool('assets/img/muenba/get.mp3', 0.42);
  const rhythmMissSfxPool = makeRhythmSfxPool('assets/img/muenba/miss.mp3', 0.24);
  let rhythmHitSfxIndex = 0;
  let rhythmMissSfxIndex = 0;

  // Reading cues use a lazy Web Audio context. It is created only when the
  // learner opens a record (a user gesture), so browser autoplay policy never
  // blocks the case and unsupported browsers simply get silent reading.
  let caseAudioContext = null;
  let caseAudioMaster = null;

  function caseAudioEnabled() {
    return !REDUCED_MOTION;
  }

  function getCaseAudioContext() {
    if (!caseAudioEnabled()) return null;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    try {
      if (!caseAudioContext) {
        caseAudioContext = new AudioContextCtor();
        caseAudioMaster = caseAudioContext.createGain();
        caseAudioMaster.gain.value = 0.7;
        caseAudioMaster.connect(caseAudioContext.destination);
      }
      if (caseAudioContext.state === 'suspended' && typeof caseAudioContext.resume === 'function') {
        caseAudioContext.resume().catch(() => {});
      }
      return caseAudioContext;
    } catch (_) {
      caseAudioContext = null;
      caseAudioMaster = null;
      return null;
    }
  }

  function playCaseTone(startFrequency, endFrequency, duration, volume, waveform = 'sine') {
    const context = getCaseAudioContext();
    if (!context || !caseAudioMaster) return;
    try {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(startFrequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(caseAudioMaster);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch (_) {
      // A reading cue is decorative; never let an audio implementation error
      // interrupt the word sweep or comprehension flow.
    }
  }

  function playCaseWordCue(isKeyword = false) {
    if (isKeyword) {
      // A soft rising cue marks a useful word without turning highlighting
      // into a required interaction.
      playCaseTone(587.33, 880, 0.3, CASE_AUDIO_KEYWORD_VOLUME, 'triangle');
      return;
    }
    playCaseTone(240, 100, 0.04, CASE_AUDIO_WORD_TICK_VOLUME, 'sine');
  }

  function playCaseUnlockCue() {
    // Low and brief: the learner hears that CHECK is available, while the
    // transition into the rhythm reward remains reserved for the later pass.
    playCaseTone(130.81, 65.41, 0.6, CASE_AUDIO_UNLOCK_VOLUME, 'sine');
  }

  function playCaseSolvedCue() {
    // Two soft overtones make the comprehension success feel like a release,
    // while staying below the later rhythm music's volume and intensity.
    playCaseTone(392, 783.99, 0.45, 0.06, 'triangle');
    playCaseTone(523.25, 1046.5, 0.65, 0.04, 'sine');
  }

  const danceArmsUpImg = makeMuenbaDeferredImage('assets/img/booha_ghost_dance_arms_up.webp');
  const danceSwayImg = makeMuenbaDeferredImage('assets/img/booha_ghost_dance_sway.webp');
  const danceWaveImg = makeMuenbaDeferredImage('assets/img/booha_ghost_dance_wave.webp');
  const MUENBA_DANCE_FRAMES = [
    { img: danceArmsUpImg, contentScale: 0.817, offsetX: -0.007, offsetY: -0.026 },
    { img: danceSwayImg, contentScale: 0.801, offsetX: 0.009, offsetY: -0.015 },
    { img: danceWaveImg, contentScale: 0.811, offsetX: 0.009, offsetY: -0.009 }
  ];

  function worldGateOpen() {
    // Muenba is live and follows the same weekly nine-game gate as Utsuroba.
    // The explicit dev URL/bypass remains available for internal testing.
    if (DEV_MODE || window.__devMuenba) return true;
    return window.BoohaUnlockSystem &&
      typeof BoohaUnlockSystem.isMuenbaUnlocked === 'function'
      ? BoohaUnlockSystem.isMuenbaUnlocked()
      : false;
  }

  function showLockedWorld() {
    const style = document.createElement('style');
    style.textContent = `
      html,body{margin:0;min-height:100%;background:#020605;color:#e0eee8;}
      body{display:grid;place-items:center;font-family:Georgia,'Times New Roman',serif;}
      .muenba-lock{box-sizing:border-box;width:min(460px,calc(100% - 36px));padding:28px 26px 30px;border:1px solid rgba(111,166,145,.45);border-radius:18px;background:linear-gradient(155deg,rgba(8,27,20,.96),rgba(1,4,4,.98));box-shadow:0 24px 70px rgba(0,0,0,.72),0 0 55px rgba(16,65,45,.28),inset 0 0 70px rgba(0,0,0,.58);text-align:center;}
      .muenba-lock img{display:block;width:min(150px,38vw);height:auto;max-height:180px;object-fit:contain;margin:0 auto 10px;filter:drop-shadow(0 0 18px rgba(122,180,151,.22));}
      .muenba-lock h1{margin:6px 0 3px;font-size:clamp(1.25rem,5vw,1.8rem);font-weight:400;letter-spacing:.08em;text-transform:uppercase;}
      .muenba-lock .jp{margin:0;color:#aac2b5;font-size:.88rem;letter-spacing:.12em;}
      .muenba-lock p{margin:20px auto 0;max-width:31em;color:#c5d8cd;font-size:.94rem;line-height:1.7;}
      .muenba-lock p small{display:block;margin-top:8px;color:#7e9c8b;font-size:.86em;}
      .muenba-lock p.jp-line{margin-top:6px;color:#9fc3af;font-size:.86em;letter-spacing:0;}
      .muenba-lock a{display:inline-block;margin-top:22px;padding:9px 16px;border:1px solid rgba(156,203,182,.58);border-radius:999px;color:#dcefe4;text-decoration:none;font-size:.78rem;letter-spacing:.05em;background:rgba(111,166,145,.10);}
      .muenba-lock a:hover,.muenba-lock a:focus-visible{background:rgba(111,166,145,.22);outline:none;}
      .muenba-lock a small{display:block;margin-top:2px;color:#9fc3af;font-size:.9em;}
    `;
    document.head.appendChild(style);
    document.body.innerHTML = `<main class="muenba-lock" aria-labelledby="muenba-lock-title"><img src="assets/img/muenba/muenba_logo.webp" alt="Muenba"><h1 id="muenba-lock-title">This world is locked</h1><p class="jp">この世界は封印されています</p><p>Something waits beyond the cemetery path.<small>Complete nine lessons in one path this week before it will open to you.</small></p><p class="jp-line"><ruby>墓地<rt>ぼち</rt></ruby>の<ruby>道<rt>みち</rt></ruby>の<ruby>先<rt>さき</rt></ruby>で<ruby>何<rt>なに</rt></ruby>かが<ruby>待<rt>ま</rt></ruby>っている。<br><small>今週、ひとつの道で九つの学びを終えよ。それまで、ここは開かない。</small></p><a href="karasuki.html">Return to Karasuki<small>カラスキに<ruby>戻<rt>もど</rt></ruby>る</small></a></main>`;
  }

  function startMusic() {
    if (state.musicStarted && !music.paused && !music.ended) return;
    state.musicStarted = true;
    if (music.ended) music.currentTime = 0;
    try {
      const playResult = music.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => { state.musicStarted = false; });
      }
    } catch (_) {
      state.musicStarted = false;
    }
  }

  music.addEventListener('error', () => { state.musicStarted = false; });
  music.addEventListener('ended', () => {
    // `loop` is the normal path. This second guard keeps the cemetery BGM
    // continuous on browsers that briefly report ended before honoring loop.
    if (!music.loop || !state.musicStarted || state.transitioning || state.returnExiting) return;
    music.currentTime = 0;
    music.play().catch(() => { state.musicStarted = false; });
  });

  function startDangerScream() {
    stopDangerRhythmMusic();
    music.volume = MUENBA_SCREAM_DUCK_VOLUME;
    try {
      const sound = window.UtsuSfx && window.UtsuSfx.startDangerScream;
      if (typeof sound === 'function') sound();
    } catch (_) {}
  }

  function stopDangerScream() {
    try {
      const sound = window.UtsuSfx && window.UtsuSfx.stopDangerScream;
      if (typeof sound === 'function') sound();
    } catch (_) {}
    music.volume = MUENBA_MUSIC_VOLUME;
  }

  let dangerRhythmPlayToken = 0;
  function startDangerRhythmMusic() {
    stopDangerScream();
    pauseWorldMusicForCapture();
    const token = ++dangerRhythmPlayToken;
    try {
      dangerRhythmMusic.currentTime = 0;
      const playResult = dangerRhythmMusic.play();
      if (playResult && typeof playResult.then === 'function') {
        playResult.catch(() => {}).then(() => {
          if (token !== dangerRhythmPlayToken) {
            try { dangerRhythmMusic.pause(); } catch (_) {}
          }
        });
      }
    } catch (_) {}
  }

  function stopDangerRhythmMusic() {
    dangerRhythmPlayToken++;
    try {
      dangerRhythmMusic.pause();
      dangerRhythmMusic.currentTime = 0;
    } catch (_) {}
    music.volume = MUENBA_MUSIC_VOLUME;
  }

  // Reads the same 'muenba_return_room' key enterMuenba() in karasuki.js
  // already writes on the way in, so it lands back in the right room via
  // karasuki.js's own checkReturnFromMuenba(). Called either from the
  // return-portal popup in room_01.
  function returnToKarasuki() {
    if (state.returnExiting) return;
    state.returnExiting = true;
    state.clickTarget = null;
    state.moving = false;
    stopDangerScream();
    stopDangerRhythmMusic();
    try { music.pause(); } catch (_) {}
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity = '1';
    window.setTimeout(() => {
      window.location.href = 'karasuki.html';
    }, FADE_MS + 60);
  }

  function validateData() {
    const errors = [];
    const roomIds = Object.keys(DATA.rooms);
    if (roomIds.length !== 15) errors.push(`expected 15 rooms, found ${roomIds.length}`);
    for (const roomId of roomIds) {
      const room = DATA.rooms[roomId];
      for (const exit of room.exits || []) {
        if (!DATA.rooms[exit.to]) errors.push(`${roomId} points to missing ${exit.to}`);
        if (!room.spawns?.[exit.spawn]) errors.push(`${roomId} has missing spawn ${exit.spawn}`);
      }
      if (!room.spawns?.default) errors.push(`${roomId} has no default spawn`);
    }
    const ghostIds = new Set();
    for (const ghost of DATA.ghosts || []) {
      if (!ghost || !ghost.id || ghostIds.has(ghost.id)) errors.push('ghost roster contains a missing or duplicate id');
      if (ghost) {
        ghostIds.add(ghost.id);
        if (ghost.role !== 'hunt-target') errors.push(`${ghost.id} must use the hunt-target role`);
        if (typeof ghost.kana !== 'string' || !ghost.kana.trim()) errors.push(`${ghost.id} has no katakana name`);
        else if (!/^[\u30a0-\u30ffー・\s]+$/.test(ghost.kana)) errors.push(`${ghost.id} katakana name contains non-katakana text`);
        if (typeof ghost.personality !== 'string' || !ghost.personality.trim()) errors.push(`${ghost.id} has no personality note`);
        else if (/[\u3040-\u30ff\u3400-\u9fff]/.test(ghost.personality)) errors.push(`${ghost.id} personality note contains Japanese story text`);
      }
    }
    if (!JERK_GHOST || JERK_GHOST.role !== 'jerk') errors.push('jerk ghost must use the jerk role');
    if (errors.length) console.error('[Muenba] Data validation failed:', errors);
    else console.info('[Muenba] 15-room data validation passed.');
  }

  function validateCaseData() {
    const errors = [];
    const cases = DATA.cases && typeof DATA.cases === 'object' ? DATA.cases : {};
    const order = Array.isArray(DATA.caseOrder) ? DATA.caseOrder : [];
    const ghostIds = new Set((DATA.ghosts || []).map(ghost => ghost.id));
    const checkTypes = new Set(['who', 'what', 'which', 'where', 'when', 'how-many', 'what-happened', 'why', 'meaning']);
    const modeCheckTypeRules = {
      start: new Set(['who', 'what', 'which', 'where', 'how-many', 'what-happened']),
      fresh: new Set(['who', 'what', 'which', 'where', 'when', 'what-happened', 'why']),
      deep: new Set(['who', 'what', 'which', 'when', 'what-happened', 'why', 'meaning'])
    };
    const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
    const englishOnly = (value, label) => {
      if (typeof value !== 'string' || !value.trim()) errors.push(`${label} must be non-empty text`);
      else if (japanese.test(value)) errors.push(`${label} contains Japanese story text`);
    };

    if (!order.length) errors.push('caseOrder must contain at least one case');
    const seenIds = new Set();
    for (const caseId of order) {
      if (seenIds.has(caseId)) errors.push(`caseOrder repeats ${caseId}`);
      seenIds.add(caseId);
      const caseData = cases[caseId];
      if (!caseData) {
        errors.push(`caseOrder points to missing ${caseId}`);
        continue;
      }
      if (caseData.id !== caseId) errors.push(`${caseId} has mismatched id`);
      if (!ghostIds.has(caseData.ghostId)) errors.push(`${caseId} points to missing ghost ${caseData.ghostId}`);
      englishOnly(caseData.title, `${caseId}.title`);
      englishOnly(caseData.eyebrow, `${caseId}.eyebrow`);
      englishOnly(caseData.intro, `${caseId}.intro`);
      for (const modeName of ['start', 'fresh', 'deep']) {
        const mode = caseData[modeName];
        if (!mode || !Array.isArray(mode.clues) || !mode.clues.length) {
          errors.push(`${caseId}.${modeName} needs exactly three clues`);
          continue;
        }
        if (mode.clues.length !== 3) errors.push(`${caseId}.${modeName} needs exactly three clues`);
        const modeTypes = new Set();
        let connectsRecords = false;
        mode.clues.forEach((clue, index) => {
          const clueLabel = `${caseId}.${modeName}.clues[${index}]`;
          englishOnly(clue && clue.title, `${clueLabel}.title`);
          englishOnly(clue && clue.text, `${clueLabel}.text`);
          if (!clue || !Array.isArray(clue.keywords) || !clue.keywords.length) {
            errors.push(`${clueLabel}.keywords must be a non-empty array`);
          } else {
            clue.keywords.forEach((keyword, keywordIndex) => {
              englishOnly(keyword, `${clueLabel}.keywords[${keywordIndex}]`);
            });
          }
          const check = clue && clue.check;
          if (!check || typeof check !== 'object') {
            errors.push(`${clueLabel}.check must be an object`);
            return;
          }
          if (!checkTypes.has(check.type)) errors.push(`${clueLabel}.check.type is not supported`);
          else if (!modeCheckTypeRules[modeName].has(check.type)) errors.push(`${clueLabel}.check.type does not fit ${modeName} mode`);
          else modeTypes.add(check.type);
          if (check.requiresPrevious !== undefined && typeof check.requiresPrevious !== 'boolean') {
            errors.push(`${clueLabel}.check.requiresPrevious must be boolean when provided`);
          }
          if (check.requiresPrevious === true) connectsRecords = true;
          englishOnly(check.prompt, `${clueLabel}.check.prompt`);
          if (check.promptJP !== undefined && typeof check.promptJP !== 'string') {
            errors.push(`${clueLabel}.check.promptJP must be text when provided`);
          }
          if (!Array.isArray(check.choices) || check.choices.length < 2) {
            errors.push(`${clueLabel}.check.choices must contain at least two choices`);
          } else if (check.choices.length !== 3) {
            errors.push(`${clueLabel}.check.choices must contain exactly three choices`);
          } else {
            const choiceKeys = new Set();
            check.choices.forEach((choice, choiceIndex) => {
              englishOnly(choice, `${clueLabel}.check.choices[${choiceIndex}]`);
              const key = typeof choice === 'string' ? choice.trim().toLowerCase() : '';
              if (key && choiceKeys.has(key)) errors.push(`${clueLabel}.check.choices repeats a choice`);
              if (key) choiceKeys.add(key);
            });
          }
          if (!Number.isInteger(check.correct) || check.correct < 0 || check.correct >= (check.choices || []).length) {
            errors.push(`${clueLabel}.check.correct is out of range`);
          }
        });
        if (modeTypes.size < 2) errors.push(`${caseId}.${modeName} needs at least two comprehension question types`);
        if (modeName === 'start' && connectsRecords) errors.push(`${caseId}.start must use direct record checks only`);
        if (modeName === 'fresh' && !connectsRecords) errors.push(`${caseId}.fresh needs at least one cross-record check`);
        if (modeName === 'deep' && ![...modeTypes].some(type => type === 'why' || type === 'meaning')) {
          errors.push(`${caseId}.deep needs a why or meaning check`);
        }
        if (!Array.isArray(mode.reviewClues) || !mode.reviewClues.length) {
          errors.push(`${caseId}.${modeName}.reviewClues must contain at least one clue index`);
        } else {
          mode.reviewClues.forEach((clueIndex, reviewIndex) => {
            if (!Number.isInteger(clueIndex) || clueIndex < 0 || clueIndex >= mode.clues.length) {
              errors.push(`${caseId}.${modeName}.reviewClues[${reviewIndex}] is out of range`);
            }
          });
        }
        englishOnly(mode.prompt, `${caseId}.${modeName}.prompt`);
        if (mode.promptJP !== undefined && typeof mode.promptJP !== 'string') errors.push(`${caseId}.${modeName}.promptJP must be text when provided`);
        if (!Array.isArray(mode.choices) || !mode.choices.length) errors.push(`${caseId}.${modeName}.choices must be non-empty`);
        else {
          if (mode.choices.length !== 3) errors.push(`${caseId}.${modeName}.choices must contain exactly three choices`);
          const choiceKeys = new Set();
          mode.choices.forEach((choice, index) => {
            englishOnly(choice, `${caseId}.${modeName}.choices[${index}]`);
            const key = typeof choice === 'string' ? choice.trim().toLowerCase() : '';
            if (key && choiceKeys.has(key)) errors.push(`${caseId}.${modeName}.choices repeats a choice`);
            if (key) choiceKeys.add(key);
          });
        }
        if (!Number.isInteger(mode.correct) || mode.correct < 0 || mode.correct >= (mode.choices || []).length) {
          errors.push(`${caseId}.${modeName}.correct is out of range`);
        }
        englishOnly(mode.resolution, `${caseId}.${modeName}.resolution`);
      }
    }
    Object.keys(cases).forEach(caseId => {
      if (!seenIds.has(caseId)) errors.push(`${caseId} is missing from caseOrder`);
    });
    if (errors.length) console.error('[Muenba] Case contract validation failed:', errors);
    else console.info(`[Muenba] ${order.length} case contract${order.length === 1 ? '' : 's'} passed.`);
  }

  // Muenba-only deterministic helpers. They keep the cemetery layout and
  // ghost behavior stable for one calendar day without reading curriculum
  // content or participating in the site's daily check.
  function _muenbaHashStr(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function _muenbaRng(seedStr) {
    let a = _muenbaHashStr(seedStr) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function _muenbaShuffle(arr, seedStr) {
    const r = _muenbaRng(seedStr);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Pass 16D: keep each question's answer order stable while the player is
  // retrying it, but do not let the authored correct index become a visible
  // answer pattern. The session seed makes one encounter reproducible for
  // debugging while the case/mode/day inputs prevent a permanent A-A-A-A
  // sequence across encounters.
  function shuffledCaseChoices(question, scope) {
    const choices = Array.isArray(question && question.choices) ? question.choices : [];
    const entries = choices.map((choice, originalIndex) => ({ choice, originalIndex }));
    const sessionSeed = captureSession && captureSession.choiceSeed
      ? captureSession.choiceSeed
      : `${question && question.prompt ? question.prompt : 'case-question'}:${_muenbaTodayKey() || 'session'}`;
    const shuffled = _muenbaShuffle(entries, `${sessionSeed}:${scope}`);
    return {
      choices: shuffled.map(entry => entry.choice),
      correct: shuffled.findIndex(entry => entry.originalIndex === question.correct)
    };
  }

  function _muenbaTodayKey() {
    try {
      return window.CALENDAR && CALENDAR.getTodayKey ? CALENDAR.getTodayKey() : null;
    } catch (_) {
      return null;
    }
  }

  function _muenbaWeekKey() {
    try {
      if (!window.CALENDAR || !CALENDAR.getCurrentCurriculumWeek) return null;
      const week = CALENDAR.getCurrentCurriculumWeek();
      return `${week.year}-${week.monthSlug}-w${week.weekNumber}`;
    } catch (_) {
      return null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     SAVE LAYER (Pass 6)
     Durable Muenba progress — permanent ghost history, weekly ghost
     availability, orbs collected, pending orbs, rooms visited, and a
     rhythm-game stat bucket. Mirrors utsuroba.js's own
     loadSave()/writeSave()/
     migrate*Save() idiom — one top-level data.muenba section, defensive
     shape-fill on every load, single dirty-flag write-back — rather than
     inventing a different pattern for this world. Capture/orb fields
     exist here but the successful capture reward writes them in Pass 8C. This
     room-visit tracking already implicit in setRoom(), a real home.
     ═══════════════════════════════════════════════════════════════════ */

  function loadSave() {
    try {
      const d = (window.BoohaAdventure && BoohaAdventure.save)
        ? BoohaAdventure.save.load()
        : {};
      return migrateMuenbaSave(d);
    } catch (e) {
      console.error('[Muenba] Save read failed:', e);
    }
    return { muenba: {} };
  }

  function writeSave(data) {
    try {
      if (window.BoohaAdventure && BoohaAdventure.save) return BoohaAdventure.save.save(data);
      console.error('[Muenba] Save system unavailable — progress NOT written.');
      return false;
    } catch (e) {
      console.error('[Muenba] Save write failed:', e);
      return false;
    }
  }

  function migrateMuenbaSave(data) {
    let dirty = false;
    if (!data.muenba || typeof data.muenba !== 'object') { data.muenba = {}; dirty = true; }
    const mu = data.muenba;
    if (!mu.ghostsFound || typeof mu.ghostsFound !== 'object') { mu.ghostsFound = {}; dirty = true; }
    if (!mu.weeklyGhostsFound || typeof mu.weeklyGhostsFound !== 'object') { mu.weeklyGhostsFound = {}; dirty = true; }
    const weekKey = _muenbaWeekKey();
    if (weekKey && mu.weeklyGhostsFoundWeek !== weekKey) {
      mu.weeklyGhostsFound = {};
      mu.weeklyGhostsFoundWeek = weekKey;
      dirty = true;
    }
    if (!Number.isInteger(mu.orbsCollected)) { mu.orbsCollected = 0; dirty = true; }
    if (!Number.isInteger(mu.orbsPending)) { mu.orbsPending = 0; dirty = true; }
    if (!mu.visitedRooms || typeof mu.visitedRooms !== 'object') { mu.visitedRooms = {}; dirty = true; }
    // Pass 13: the profile page's "Rooms visited"/"Case records" stats are
    // plain running totals of every room entry / every case settled, not
    // distinct-count or all-tiers-complete fractions, so replaying content
    // (a room you've already seen, a case you're re-reading after a weekly
    // reset) still moves the number. Older saves start these at 0, same as
    // rhythm.capturesCompleted below already did for the same reason.
    if (!Number.isInteger(mu.roomVisitsTotal) || mu.roomVisitsTotal < 0) { mu.roomVisitsTotal = 0; dirty = true; }
    if (!Number.isInteger(mu.caseRecordsSettled) || mu.caseRecordsSettled < 0) { mu.caseRecordsSettled = 0; dirty = true; }
    if (!mu.huntJournal || typeof mu.huntJournal !== 'object') {
      mu.huntJournal = { entries: [] };
      dirty = true;
    } else if (!Array.isArray(mu.huntJournal.entries)) {
      mu.huntJournal.entries = [];
      dirty = true;
    }
    if (!mu.caseRecords || typeof mu.caseRecords !== 'object') {
      mu.caseRecords = {};
      dirty = true;
    }
    if (!['start', 'fresh', 'deep'].includes(mu.readingDifficulty)) {
      mu.readingDifficulty = 'start';
      dirty = true;
    }
    if (!mu.caseProgress || typeof mu.caseProgress !== 'object') {
      mu.caseProgress = { completedCaseIds: [], activeCaseId: null };
      dirty = true;
    }
    if (!Array.isArray(mu.caseProgress.completedCaseIds)) {
      mu.caseProgress.completedCaseIds = [];
      dirty = true;
    }
    if (mu.caseProgress.activeCaseId !== null && typeof mu.caseProgress.activeCaseId !== 'string') {
      mu.caseProgress.activeCaseId = null;
      dirty = true;
    }
    const legacyCompletedIds = new Set(mu.caseProgress.completedCaseIds);
    for (const caseId of legacyCompletedIds) {
      if (!mu.caseRecords[caseId] || typeof mu.caseRecords[caseId] !== 'object') {
        mu.caseRecords[caseId] = { completed: false, completedModes: { fresh: true }, difficulty: 'fresh' };
        dirty = true;
      }
    }
    Object.keys(mu.caseRecords).forEach(caseId => {
      const record = mu.caseRecords[caseId];
      if (!record || typeof record !== 'object') return;
      if (!record.completedModes || typeof record.completedModes !== 'object' || Array.isArray(record.completedModes)) {
        const legacyMode = MUENBA_CASE_MODES.includes(record.difficulty) ? record.difficulty : 'fresh';
        record.completedModes = record.completed ? { [legacyMode]: true } : {};
        dirty = true;
      }
      Object.keys(record.completedModes).forEach(mode => {
        if (!MUENBA_CASE_MODES.includes(mode) || record.completedModes[mode] !== true) {
          delete record.completedModes[mode];
          dirty = true;
        }
      });
      const complete = MUENBA_CASE_MODES.every(mode => record.completedModes[mode] === true);
      if (record.completed !== complete) {
        record.completed = complete;
        dirty = true;
      }
    });
    const mergedCaseIds = Object.keys(mu.caseRecords).filter(caseId => {
      const record = mu.caseRecords[caseId];
      return record && record.completed === true;
    });
    if (mergedCaseIds.length !== mu.caseProgress.completedCaseIds.length || mergedCaseIds.some((id, index) => id !== mu.caseProgress.completedCaseIds[index])) {
      mu.caseProgress.completedCaseIds = mergedCaseIds;
      dirty = true;
    }
    if (!mu.rhythm || typeof mu.rhythm !== 'object') {
      mu.rhythm = {
        bestAccuracy: 0,
        attempts: 0,
        // Older saves have no cumulative rhythm counter. A completed hunt
        // journal is the safest historical starting point for this feature.
        capturesCompleted: Array.isArray(mu.huntJournal.entries) ? mu.huntJournal.entries.length : 0
      };
      dirty = true;
    }
    if (!Number.isInteger(mu.rhythm.capturesCompleted) || mu.rhythm.capturesCompleted < 0) {
      mu.rhythm.capturesCompleted = Array.isArray(mu.huntJournal.entries) ? mu.huntJournal.entries.length : 0;
      dirty = true;
    }
    if (dirty) writeSave(data);
    return data;
  }

  function readMuenba() {
    return loadSave().muenba || {};
  }

  function getMuenbaReadingDifficulty() {
    const difficulty = readMuenba().readingDifficulty;
    return MUENBA_CASE_MODES.includes(difficulty) ? difficulty : 'start';
  }

  function caseModeIsComplete(caseData, mode = getMuenbaReadingDifficulty()) {
    if (!caseData) return true;
    const record = readMuenba().caseRecords?.[caseData.id];
    if (!record || typeof record !== 'object') return false;
    if (record.completedModes && typeof record.completedModes === 'object') return record.completedModes[mode] === true;
    return record.completed === true && record.difficulty === mode;
  }

  function getRhythmDifficulty() {
    const capturesCompleted = Math.max(0, Number(readMuenba().rhythm?.capturesCompleted) || 0);
    let tierIndex = 0;
    RHYTHM_DIFFICULTY_TIERS.forEach((tier, index) => {
      if (capturesCompleted >= tier.minCaptures) tierIndex = index;
    });
    return {
      ...RHYTHM_DIFFICULTY_TIERS[tierIndex],
      tierIndex,
      capturesCompleted
    };
  }

  function writeMuenba(patchObj) {
    const d = loadSave();
    d.muenba = { ...d.muenba, ...patchObj };
    return writeSave(d);
  }

  // Mirrors utsuroba.js's markVisited() for the visitedRooms dict — that
  // part still only writes the first time a given room is seen. Pass 13
  // layered a second, always-incrementing counter (roomVisitsTotal) on top,
  // since setRoom() only calls this once per room transition (not per
  // tick), so a plain +1 here doesn't spam saves either.
  function markMuenbaRoomVisited(roomId) {
    try {
      const d = loadSave();
      if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
      if (!d.muenba.visitedRooms || typeof d.muenba.visitedRooms !== 'object') d.muenba.visitedRooms = {};
      if (!Number.isInteger(d.muenba.roomVisitsTotal) || d.muenba.roomVisitsTotal < 0) d.muenba.roomVisitsTotal = 0;
      if (!d.muenba.visitedRooms[roomId]) d.muenba.visitedRooms[roomId] = Date.now();
      d.muenba.roomVisitsTotal += 1;
      writeSave(d);
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════════════════════════════
     GHOST HUNTING CORE LOOP
     One wandering ghost per room, day-seeded so the layout is stable across
     re-entries but can change tomorrow. Nuppi's active case ghost is friendly.
     Every other ghost is hostile and notices Booha after the same short delay
     in the same room. Only Nuppi's assigned target is quiet during an ordinary
     hunt. Hostile ghosts move at the same slow speed as their wandering pace
     for now; later passes tune Jerk and carried-energy speed separately.
     ═══════════════════════════════════════════════════════════════════ */

  // Which of the 15 rooms gets which of the still-available ghosts, and which
  // non-target ghosts react on sight. The active case always overrides this
  // as friendly. Permanent ghostsFound
  // history is not used here; weeklyGhostsFound controls availability.
  function invalidateGhostRoomMap() {
    ghostRoomMap = null;
    ghostRoomMapDay = null;
    ghostRoomMapWeek = null;
    ghostRoomMapAvailabilityKey = '';
  }

  function getGhostRoomMap() {
    const today = _muenbaTodayKey() || 'nodate';
    const weekKey = _muenbaWeekKey() || 'no-week';
    const returnTripActive = Number(readMuenba().orbsPending) > 0;
    const weeklyFound = readMuenba().weeklyGhostsFound;
    const activeCaseGhost = activeMuenbaCaseGhost();
    const activeCaseGhostId = activeCaseGhost && activeCaseGhost.id;
    const availableGhosts = GHOSTS.filter(ghost => ghost.id === activeCaseGhostId || !weeklyFound || !weeklyFound[ghost.id]);
    const availabilityKey = `${availableGhosts.map(ghost => ghost.id).join('|')}|return-trip:${returnTripActive ? 'on' : 'off'}`;
    if (ghostRoomMap && ghostRoomMapDay === today && ghostRoomMapWeek === weekKey && ghostRoomMapAvailabilityKey === availabilityKey) return ghostRoomMap;
    // Pass 11: room_01 is Nuppi's room — no ghost is ever placed there, so
    // there's always one guaranteed-safe room to reach regardless of how
    // hostile the rest of the cemetery has gotten.
    const roomIds = Object.keys(DATA.rooms).filter(roomId => roomId !== MUENBA_NUPPI.roomId);
    const huntRoomIds = roomIds.filter(roomId => !MUENBA_NUPPI_APPROACH_ROOMS.has(roomId));
    const pickedRooms = _muenbaShuffle(huntRoomIds, today + '|muenbaGhostRooms').slice(0, availableGhosts.length);
    const shuffledGhosts = _muenbaShuffle(availableGhosts, today + '|muenbaGhostAssign');
    const map = {};
    shuffledGhosts.forEach((ghost, i) => {
      if (pickedRooms[i]) map[pickedRooms[i]] = ghost;
    });
    // Pass 15: drop a handful of generic "Jerk" ghosts into whatever rooms
    // are still empty (never room_01, never a room a real ghost already
    // has). As real ghosts get weekly-captured and their rooms empty out,
    // this recomputes right along with the rest of the map (same day/week/
    // availability cache key above) and jerks can spread into the newly
    // freed rooms.
    if (JERK_GHOST) {
      const emptyRoomIds = roomIds.filter(roomId => !map[roomId]);
      const jerkCount = returnTripActive ? JERK_RETURN_COUNT : JERK_COUNT;
      const jerkSeed = today + '|muenbaJerkRooms|' + (returnTripActive ? 'return' : 'hunt');
      const jerkRoomIds = _muenbaShuffle(emptyRoomIds, jerkSeed).slice(0, jerkCount);
      jerkRoomIds.forEach((roomId, i) => {
        map[roomId] = Object.assign({}, JERK_GHOST, {
          id: (returnTripActive ? 'return_jerk_' : 'jerk_') + (i + 1),
          returnTripJerk: returnTripActive
        });
      });
    }
    ghostRoomMap = map;
    ghostRoomMapDay = today;
    ghostRoomMapWeek = weekKey;
    ghostRoomMapAvailabilityKey = availabilityKey;
    return map;
  }

  function ghostHostilityFor(ghostId) {
    // Pass 11: once Booha has taken a ghost's energy, the whole cemetery is
    // on alert until that energy is safely handed to Nuppi — every ghost he
    // meets on the way back is fully hostile (sight-triggered, chase and
    // scream), not the usual 50/50 mix. `orbsPending` is exactly "energy
    // taken but not yet delivered," so it's the right flag to key off of.
    const carryingStolenEnergy = Number(readMuenba().orbsPending) > 0;
    const target = currentHuntGhostId();
    const role = ghostRoleFor(ghostId);
    const roleRules = ghostRulesFor(ghostId);
    const isJerk = role === 'jerk';
    if (state.cemeteryAlert) return 'sight';
    // Pass 15: a Jerk is purely hostile — never Nuppi's target, never the
    // "quiet cemetery" exception below, whatever the hunt state is.
    if (roleRules.alwaysAngry) return 'sight';
    if (roleRules.neutralDuringHunt) {
      if (!carryingStolenEnergy && ghostId === target) return 'friendly';
    }
    // The hunt target stays quiet during an ordinary hunt. Every other main
    // ghost is hostile on sight, so the player never has to guess whether a
    // non-target ghost will react. Once Booha is carrying energy, every ghost
    // becomes sight-angry, including the target ghost.
    if (carryingStolenEnergy) return 'sight';
    // No active hunt target (every case finished at this difficulty, or no
    // ghost left for the week) used to fall through to the same 50/50 roll
    // as an ordinary hunt, which reads as "everyone's still hostile" even
    // though there's nothing left to be hunting. Nothing to hunt should
    // read as a quiet cemetery instead — except Jerks, who stay hostile
    // regardless so the cemetery never feels completely safe.
    if (!isJerk && !target) return 'friendly';
    return 'sight';
  }

  // Random point inside one of this room's walkable rects — same corridor
  // shape the player moves through, so a wandering ghost never drifts
  // somewhere the player can't reach it.
  function pickGhostWanderTarget() {
    const rects = getRoom().walkable || [];
    if (!rects.length) return { x: CENTER_X, y: CENTER_Y };
    const rect = rects[Math.floor(Math.random() * rects.length)];
    return clampToWorld(rect.x + Math.random() * rect.w, rect.y + Math.random() * rect.h);
  }

  function pickGhostSpawnPosition() {
    let candidate = pickGhostWanderTarget();
    for (let attempt = 0; attempt < 14; attempt++) {
      if (Math.hypot(candidate.x - state.x, candidate.y - state.y) >= GHOST_MIN_SPAWN_DISTANCE) return candidate;
      candidate = pickGhostWanderTarget();
    }
    return candidate;
  }

  function getGhostSprite(src) {
    if (ghostSpriteCache.has(src)) return ghostSpriteCache.get(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    ghostSpriteCache.set(src, img);
    return img;
  }

  function scheduleGhostTeleport(g, now) {
    const delay = GHOST_TELEPORT_MIN_MS + Math.random() * (GHOST_TELEPORT_MAX_MS - GHOST_TELEPORT_MIN_MS);
    g.roomTravelAt = now + delay;
    g.travelExit = null;
    g.travelingToExit = false;
    g.teleportAt = 0;
    g.teleportWarningAt = 0;
    g.teleporting = false;
  }

  function pickGhostTravelExit(fromRoomId, ghostOrId = null) {
    const map = getGhostRoomMap();
    const exits = DATA.rooms[fromRoomId]?.exits || [];
    const realGhost = ghostOrId && (ghostOrId.ghost || ghostOrId);
    const keepTargetAwayFromNuppi = isMainHuntGhostId(realGhost);
    // Pass 11: a wandering/teleporting ghost can never travel into room_01
    // either — the safe-room guarantee has to hold even as ghosts roam
    // between rooms on their own, not just at the day's initial placement.
    const candidates = exits.filter(exit => exit.to !== state.roomId
      && exit.to !== MUENBA_NUPPI.roomId
      && !(keepTargetAwayFromNuppi && MUENBA_NUPPI_APPROACH_ROOMS.has(exit.to))
      && !map[exit.to]);
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function pickGhostTeleportRoom(fromRoomId, ghostOrId = null) {
    const exit = pickGhostTravelExit(fromRoomId, ghostOrId);
    return exit ? exit.to : null;
  }

  function beginGhostRoomTravel(g, now) {
    const fromRoomId = g.roomId || state.roomId;
    const exit = pickGhostTravelExit(fromRoomId, g.ghost);
    if (!exit) {
      scheduleGhostTeleport(g, now);
      return false;
    }
    g.travelExit = exit;
    g.travelingToExit = true;
    g.teleporting = false;
    g.teleportAt = 0;
    g.teleportWarningAt = 0;
    g.wanderTarget = { x: exit.x, y: exit.y };
    g.nextWanderAt = 0;
    return true;
  }

  function teleportGhostToAnotherRoom(g, now) {
    const fromRoomId = g.roomId || state.roomId;
    const destinationRoomId = g.travelExit?.to || pickGhostTeleportRoom(fromRoomId, g.ghost);
    if (!destinationRoomId) {
      scheduleGhostTeleport(g, now);
      return false;
    }
    const map = getGhostRoomMap();
    if (map[fromRoomId]?.id === g.ghost.id) delete map[fromRoomId];
    map[destinationRoomId] = g.ghost;
    stopGhostScream(g);
    activeGhost = null;
    return true;
  }

  // Called from setRoom() for every room entry. The active case target is the
  // only ghost that can begin a capture; other ghosts remain encounters.
  function spawnRoomGhost(roomId) {
    activeGhost = null;
    const ghost = getGhostRoomMap()[roomId];
    if (!ghost) return;
    const pos = pickGhostSpawnPosition();
    const role = ghostRoleFor(ghost);
    const roleRules = ghostRulesFor(ghost);
    const hostility = ghostHostilityFor(ghost.id);
    const carryingEnergy = Number(readMuenba().orbsPending) > 0;
    activeGhost = {
      ghost,
      role,
      roleRules,
      isHuntTarget: roleRules.huntable === true,
      isCurrentTarget: roleRules.huntable === true && ghost.id === currentHuntGhostId(),
      alwaysAngry: roleRules.alwaysAngry === true,
      dangerCanHide: roleRules.dangerCanHide === true,
      x: pos.x,
      y: pos.y,
      behavior: hostility,
      hostility,
      carryingEnergy,
      chaseSpeed: carryingEnergy
        ? GHOST_CARRY_CHASE_SPEED
        : role === 'jerk' ? JERK_CHASE_SPEED : GHOST_CHASE_SPEED,
      chasing: false,
      wanderTarget: pos,
      nextWanderAt: performance.now() + 1800 + Math.random() * 1600,
      noticeStartedAt: 0,
      screaming: false,
      screamReason: null,
      angryUntil: 0,
      startleUntil: 0,
      hideGiveupAt: 0,
      hideSearchTarget: null,
      roomId,
      roomTravelAt: 0,
      travelExit: null,
      travelingToExit: false,
      teleportAt: 0,
      teleportWarningAt: 0,
      teleporting: false
    };
    if (carryingEnergy) {
      startGhostScream(activeGhost, performance.now(), 'carried-energy');
      activeGhost.chasing = true;
    }
  }

  function moveGhostToward(g, tx, ty, speed) {
    const dx = tx - g.x, dy = ty - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;
    const step = Math.min(dist, speed);
    const next = clampToWorld(g.x + (dx / dist) * step, g.y + (dy / dist) * step);
    g.x = next.x;
    g.y = next.y;
  }

  function pickGhostHideSearchTarget() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 78 + Math.random() * 58;
    const target = clampToWorld(
      state.x + Math.cos(angle) * distance,
      state.y + Math.sin(angle) * distance,
      GHOST_R
    );
    return canMoveTo(target.x, target.y) ? target : pickGhostWanderTarget();
  }

  function startGhostScream(g, now, reason) {
    if (!g || g.hostility === 'friendly' || g.screaming) return;
    g.screaming = true;
    g.screamReason = reason;
    g.angryUntil = now + 1200;
    startDangerScream();
  }

  function stopGhostScream(g) {
    if (!g || !g.screaming) return;
    g.screaming = false;
    g.screamReason = null;
    stopDangerScream();
  }

  function tickGhost(now) {
    if (!activeGhost) return;
    const g = activeGhost;
    if (state.hiding) {
      if (g.hostility === 'friendly') return;

      // Hiding is safe: the ghost returns to its ordinary sprite, stops
      // screaming and forgets the chase immediately, then searches at its
      // normal slow pace without being able to catch Booha.
      stopGhostScream(g);
      g.angryUntil = 0;
      g.chasing = false;
      g.noticeStartedAt = 0;
      if (!g.hideGiveupAt) {
        g.hideGiveupAt = now + GHOST_GIVEUP_HIDE_MS;
        g.hideSearchTarget = pickGhostHideSearchTarget();
      } else if (now >= g.hideGiveupAt) {
        if (teleportGhostToAnotherRoom(g, now)) return;
        g.hideGiveupAt = now + GHOST_GIVEUP_HIDE_MS;
        g.hideSearchTarget = pickGhostHideSearchTarget();
      }
      if (g.hideSearchTarget) {
        if (Math.hypot(g.x - g.hideSearchTarget.x, g.y - g.hideSearchTarget.y) < 12) {
          g.hideSearchTarget = pickGhostHideSearchTarget();
        }
        moveGhostToward(g, g.hideSearchTarget.x, g.hideSearchTarget.y, GHOST_HIDE_SEARCH_SPEED);
      }
      return;
    }
    g.hideGiveupAt = 0;
    g.hideSearchTarget = null;
    if (!g.roomTravelAt) scheduleGhostTeleport(g, now);
    if (g.teleporting) {
      if (now >= g.teleportAt) teleportGhostToAnotherRoom(g, now);
      return;
    }
    if (g.travelingToExit) {
      moveGhostToward(g, g.travelExit.x, g.travelExit.y, GHOST_WANDER_SPEED);
      if (Math.hypot(g.x - g.travelExit.x, g.y - g.travelExit.y) <= GHOST_ROOM_EXIT_R) {
        g.teleporting = true;
        g.teleportAt = now + GHOST_TELEPORT_WARNING_MS;
        g.chasing = false;
        g.noticeStartedAt = 0;
        g.hideGiveupAt = 0;
        g.hideSearchTarget = null;
      }
      return;
    }
    if (now >= g.roomTravelAt) {
      beginGhostRoomTravel(g, now);
      return;
    }
    // Carrying energy is an emergency state. Hiding clears the scream for a
    // moment, but stepping back out immediately re-arms the chase.
    if (g.carryingEnergy && g.hostility === 'sight' && !g.screaming) {
      startGhostScream(g, now, 'carried-energy');
      g.chasing = true;
    }
    const dist = Math.hypot(g.x - state.x, g.y - state.y);
    if (g.hostility === 'sight' && !g.screaming) {
      if (dist <= GHOST_DETECT_R) {
        if (!g.noticeStartedAt) g.noticeStartedAt = now;
        const noticeDelay = g.role === 'jerk' ? JERK_NOTICE_DELAY_MS : GHOST_NOTICE_DELAY_MS;
        if (now - g.noticeStartedAt >= noticeDelay) {
          startGhostScream(g, now, 'sight');
          g.chasing = true;
        }
      } else {
        g.noticeStartedAt = 0;
      }
    }
    if (g.screaming && g.chasing) {
      if (dist > GHOST_DETECT_R * 1.5 && !g.carryingEnergy) {
        stopGhostScream(g);
        g.chasing = false;
        g.noticeStartedAt = 0;
      } else {
        moveGhostToward(g, state.x, state.y, g.chaseSpeed || GHOST_CHASE_SPEED);
        if (dist <= GHOST_CATCH_R && now >= g.startleUntil) {
          g.startleUntil = now + GHOST_STARTLE_COOLDOWN_MS;
          g.angryUntil = now + 1200;
          state.dangerFlashUntil = now + 900;
          const away = dist || 1;
          const pushed = clampToWorld(
            state.x + ((state.x - g.x) / away) * 46,
            state.y + ((state.y - g.y) / away) * 46
          );
          if (canMoveTo(pushed.x, pushed.y)) { state.x = pushed.x; state.y = pushed.y; }
          state.clickTarget = null;
          // Every main ghost can offer Hide in its danger popup. Jerk ghosts
          // never can, even if a future caller accidentally passes allowHide.
          beginDangerEncounter(g.ghost, { allowHide: g.dangerCanHide === true });
        }
        return;
      }
    }
    if (now >= (g.nextWanderAt || 0) || Math.hypot(g.wanderTarget.x - g.x, g.wanderTarget.y - g.y) < 8) {
      g.wanderTarget = pickGhostWanderTarget();
      g.nextWanderAt = now + 2400 + Math.random() * 1800;
    }
    moveGhostToward(g, g.wanderTarget.x, g.wanderTarget.y, GHOST_WANDER_SPEED);
  }

  // Pass 12: the hide button's furigana line changes with its state, so it
  // needs innerHTML rather than a single textContent assignment — kept in
  // one place since it's set from four different call sites.
  function setHideButtonLabel(hiding) {
    if (!hideBtn) return;
    hideBtn.innerHTML = hiding
      ? '<span>Come out</span><small><ruby>出<rt>で</rt></ruby>る</small>'
      : '<span>Hide</span><small><ruby>隠<rt>かく</rt></ruby>れる</small>';
  }

  function setHideButtonDisabled(disabled) {
    if (!hideBtn) return;
    const locked = !!disabled;
    hideBtn.disabled = locked;
    hideBtn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    hideBtn.classList.toggle('is-disabled', locked);
  }

  function toggleHide() {
    if (state.transitioning || state.celebrating || lobbyOpen || returnPortalOpen || captureOpen) return;
    state.hiding = !state.hiding;
    if (hideBtn) {
      hideBtn.classList.toggle('active', state.hiding);
      setHideButtonLabel(state.hiding);
    }
    if (state.hiding) {
      state.clickTarget = null;
      state.moving = false;
    }
  }

  function clickCheckGhost(worldX, worldY) {
    if (!activeGhost || state.captureResolving) return false;
    if (Math.hypot(worldX - activeGhost.x, worldY - activeGhost.y) <= GHOST_CLICK_R) {
      if (!isCurrentHuntTarget(activeGhost)) {
        state.clickTarget = null;
        const now = performance.now();
        // Every wrong ghost reacts to being touched. Sight-trigger ghosts
        // scream here too, so the player gets one consistent rule: only
        // Nuppi's assigned ghost is safe to tap.
        startGhostScream(activeGhost, now, 'wrong-ghost');
        activeGhost.chasing = true;
        activeGhost.noticeStartedAt = 0;
        activeGhost.hideGiveupAt = 0;
        return true;
      }
      attemptCapture();
      return true;
    }
    return false;
  }

  function attemptCapture() {
    if (!isCurrentHuntTarget(activeGhost) || state.captureResolving) return;
    const now = performance.now();
    const ghost = activeGhost.ghost;
    activeGhost.angryUntil = now + 900;
    state.captureResolving = true;
    beginCaptureSession(ghost);
  }

  function beginDangerEncounter(ghost, { allowHide = false } = {}) {
    if (!ghost || captureOpen || state.captureResolving) return;
    captureOpen = true;
    if (captureOverlay) captureOverlay.setAttribute('aria-hidden', 'false');
    state.captureResolving = true;
    state.clickTarget = null;
    state.moving = false;
    activeGhost = null;
    playUiSfx('ghostError');
    const encounterRole = ghostRoleFor(ghost);
    const encounterRules = ghostRulesFor(ghost);
    const carryingEnergy = Number(readMuenba().orbsPending) > 0;
    captureSession = {
      ghost,
      encounterRole,
      dangerMode: carryingEnergy ? 'carried-energy' : encounterRole === 'jerk' ? 'jerk' : 'main',
      carryingEnergy,
      caseData: null,
      caseDifficulty: null,
      caseIndex: 0,
      caseResolved: false,
      danger: true,
      dangerCanHide: !carryingEnergy && allowHide === true && encounterRules.dangerCanHide === true,
      phase: 'danger-ready',
      openedAt: performance.now()
    };
    startDangerScream();
    renderDangerReady();
  }

  function renderDangerReady() {
    if (!captureSession || !captureSession.danger || !captureOverlay) return;
    setDangerOverlay(true);
    const box = captureBox();
    box.classList.add('muenba-danger-box');
    captureImage(box, captureSession.ghost, ANGRY_CHANGE_IMG);

    const eyebrow = document.createElement('div');
    eyebrow.className = 'muenba-case-eyebrow muenba-danger-eyebrow';
    eyebrow.textContent = 'DANGER';
    box.appendChild(eyebrow);
    const eyebrowJp = document.createElement('p');
    eyebrowJp.className = 'muenba-case-eyebrow-jp';
    eyebrowJp.innerHTML = '<ruby>危険<rt>きけん</rt></ruby>';
    box.appendChild(eyebrowJp);

    const h2 = document.createElement('h2');
    h2.textContent = 'The ghost is angry';
    box.appendChild(h2);
    const jp = document.createElement('p');
    jp.className = 'jp';
    jp.textContent = '幽霊が怒っている';
    box.appendChild(jp);

    const canHide = captureSession.dangerCanHide === true;
    renderCaseDirection(
      box,
      canHide
        ? 'It touched Booha. Face the danger rhythm, or hide now and let it lose interest.'
        : 'It touched Booha. Face the danger rhythm. You cannot hide from this angry ghost.',
      canHide
        ? '<ruby>幽霊<rt>ゆうれい</rt></ruby>がブーハーに<ruby>触<rt>ふ</rt></ruby>れました。<ruby>危険<rt>きけん</rt></ruby>なリズムに<ruby>挑<rt>いど</rt></ruby>むか、<ruby>今<rt>いま</rt></ruby>すぐ<ruby>隠<rt>かく</rt></ruby>れて<ruby>興味<rt>きょうみ</rt></ruby>をなくすのを<ruby>待<rt>ま</rt></ruby>ちましょう。'
        : '<ruby>幽霊<rt>ゆうれい</rt></ruby>がブーハーに<ruby>触<rt>ふ</rt></ruby>れました。<ruby>危険<rt>きけん</rt></ruby>なリズムに<ruby>挑<rt>いど</rt></ruby>みましょう。この<ruby>怒<rt>おこ</rt></ruby>った<ruby>幽霊<rt>ゆうれい</rt></ruby>からは<ruby>隠<rt>かく</rt></ruby>れられません。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    actions.appendChild(captureButton('Face the danger rhythm', '<ruby>危険<rt>きけん</rt></ruby>なリズムに<ruby>挑<rt>いど</rt></ruby>む', 'muenba-danger-begin', beginDangerRhythm));
    if (canHide) {
      actions.appendChild(captureButton('Hide now', '<ruby>今<rt>いま</rt></ruby>すぐ<ruby>隠<rt>かく</rt></ruby>れる', 'muenba-danger-hide', escapeDangerToHide));
    }
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-danger-begin');
  }

  function escapeDangerToHide() {
    if (!captureSession || !captureSession.danger || captureSession.dangerCanHide !== true) return;
    playUiSfx('phantomCancel');
    stopRhythmCapture();
    stopDangerScream();
    stopDangerRhythmMusic();
    captureOpen = false;
    state.captureResolving = false;
    state.hiding = true;
    state.clickTarget = null;
    state.moving = false;
    setDangerOverlay(false);
    if (captureOverlay) {
      captureOverlay.classList.remove('open');
      captureOverlay.classList.remove('muenba-rhythm-mode');
      delete captureOverlay.dataset.surface;
      captureOverlay.setAttribute('aria-hidden', 'true');
    }
    captureSession = null;
    spawnRoomGhost(state.roomId);
    if (activeGhost) {
      activeGhost.chasing = true;
      activeGhost.angryUntil = performance.now() + 800;
      activeGhost.hideGiveupAt = performance.now() + GHOST_GIVEUP_HIDE_MS;
    }
    if (hideBtn) {
      hideBtn.classList.add('active');
      setHideButtonLabel(true);
    }
    requestMuenbaLandscapeAfterPopup();
    resumeWorldMusicAfterCapture();
  }

  // Pass 14: winning a danger encounter calms whichever hostile ghost caught
  // Booha and sends it out of the room, reusing the same room-map mutation
  // teleportGhostToAnotherRoom() already uses for a ghost's own spontaneous
  // travel — pickGhostTeleportRoom() already excludes room_01 and the
  // player's current room, so this can never relocate a ghost back into the
  // fight or into Nuppi's safe room. Deliberately does not touch
  // ghostsFound/weeklyGhostsFound/orbs — this was never a real capture.
  function dismissDangerGhost() {
    if (!captureSession || !captureSession.ghost) return;
    const roomId = state.roomId;
    const map = getGhostRoomMap();
    if (map[roomId] && map[roomId].id === captureSession.ghost.id) {
      delete map[roomId];
      const destinationRoomId = pickGhostTeleportRoom(roomId, captureSession.ghost);
      if (destinationRoomId) map[destinationRoomId] = captureSession.ghost;
    }
    activeGhost = null;
  }

  // Closes the capture overlay after a danger win, once the player has read
  // the result screen and is ready to keep exploring. No hiding, no ghost
  // respawn — the threat already left via dismissDangerGhost() above.
  function closeDangerEncounter() {
    if (!captureSession || !captureSession.danger) return;
    stopRhythmCapture();
    stopDangerScream();
    stopDangerRhythmMusic();
    captureOpen = false;
    state.captureResolving = false;
    setDangerOverlay(false);
    if (captureOverlay) {
      captureOverlay.classList.remove('open');
      captureOverlay.classList.remove('muenba-rhythm-mode');
      delete captureOverlay.dataset.surface;
      captureOverlay.setAttribute('aria-hidden', 'true');
    }
    captureSession = null;
    requestMuenbaLandscapeAfterPopup();
    resumeWorldMusicAfterCapture();
  }

  // Pass 14: a full retreat option for a danger encounter that isn't going
  // well — sends Booha straight back to room_01 (Nuppi's safe room) the same
  // way the original Karasuki entry does, drift-walk-in included, "as if he
  // just entered." Any orbs already pending stay pending; the hostile ghost
  // that caught him is left exactly where it is, not defeated.
  function giveUpDangerEncounter() {
    if (!captureSession || !captureSession.danger) return;
    stopRhythmCapture();
    stopDangerScream();
    stopDangerRhythmMusic();
    captureOpen = false;
    state.captureResolving = false;
    setDangerOverlay(false);
    if (captureOverlay) {
      captureOverlay.classList.remove('open');
      captureOverlay.classList.remove('muenba-rhythm-mode');
      delete captureOverlay.dataset.surface;
      captureOverlay.setAttribute('aria-hidden', 'true');
    }
    captureSession = null;
    requestMuenbaLandscapeAfterPopup();
    resumeWorldMusicAfterCapture();
    setRoom(MUENBA_NUPPI.roomId, 'fromKarasuki');
  }

  function orderedMuenbaCases() {
    const cases = DATA.cases && typeof DATA.cases === 'object' ? DATA.cases : {};
    const ids = Array.isArray(DATA.caseOrder) ? DATA.caseOrder : Object.keys(cases);
    return ids.map(caseId => cases[caseId]).filter(Boolean);
  }

  function completedMuenbaCaseIds() {
    const mu = readMuenba();
    const progressIds = mu.caseProgress && Array.isArray(mu.caseProgress.completedCaseIds)
      ? mu.caseProgress.completedCaseIds
      : [];
    const recordIds = mu.caseRecords && typeof mu.caseRecords === 'object'
      ? Object.keys(mu.caseRecords).filter(caseId => mu.caseRecords[caseId] && mu.caseRecords[caseId].completed)
      : [];
    return new Set([...progressIds, ...recordIds]);
  }

  function nextMuenbaCase() {
    const mode = getMuenbaReadingDifficulty();
    return orderedMuenbaCases().find(caseData => !caseModeIsComplete(caseData, mode)) || null;
  }

  function availableMuenbaGhostsThisWeek() {
    const weeklyFound = readMuenba().weeklyGhostsFound;
    const activeCaseGhost = activeMuenbaCaseGhost();
    return GHOSTS.filter(ghost => ghost.id === (activeCaseGhost && activeCaseGhost.id) || !weeklyFound || !weeklyFound[ghost.id]);
  }

  // Energy is collected once per week, but the selected memory mode can leave
  // the same case unfinished. Its target ghost must return even when
  // weeklyGhostsFound already contains that ghost id.
  function activeMuenbaCaseGhost() {
    const nextCase = nextMuenbaCase();
    return nextCase ? GHOSTS.find(ghost => ghost.id === nextCase.ghostId) || null : null;
  }

  function nextMuenbaHuntGhost() {
    const activeCaseGhost = activeMuenbaCaseGhost();
    if (activeCaseGhost) return activeCaseGhost;
    return availableMuenbaGhostsThisWeek()[0] || null;
  }

  function currentHuntGhostId() {
    // Once energy has been collected, the active hunt is over until the
    // orbs reach Nuppi. This prevents the next unfinished case from becoming
    // clickable during the return trip and keeps every other ghost on the
    // danger-encounter path.
    if (Number(readMuenba().orbsPending) > 0) return null;
    const ghost = nextMuenbaHuntGhost();
    return ghost ? ghost.id : null;
  }

  function caseForGhost(ghostId) {
    const next = nextMuenbaCase();
    return next && next.ghostId === ghostId ? next : null;
  }

  function caseRecordComplete(caseData) {
    return caseModeIsComplete(caseData, getMuenbaReadingDifficulty());
  }

  function buildCaptureOverlay() {
    if (captureOverlay) return;
    captureOverlay = document.createElement('div');
    captureOverlay.id = 'muenba-capture-overlay';
    captureOverlay.setAttribute('role', 'dialog');
    captureOverlay.setAttribute('aria-modal', 'true');
    captureOverlay.setAttribute('aria-label', 'Muenba ghost capture');
    captureOverlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(captureOverlay);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && captureOpen) {
        const phase = captureSession && captureSession.phase;
        if (phase === 'rhythm-help') {
          closeRhythmHelp();
          return;
        }
        if (phase !== 'reward' && phase !== 'nuppi' && phase !== 'nuppi-recovery') {
          cancelCaptureSession();
        }
        return;
      }
      if (!captureOpen || event.repeat) return;
      const lane = rhythmLaneForKey(event.key);
      if (lane && captureSession?.rhythm?.lanes?.includes(lane)) {
        event.preventDefault();
        handleRhythmInput(lane);
      }
    });
  }

  // Pass 2 / Pass 8A session boundary. No permanent save is written here: the
  // rhythm game must decide whether this session succeeds before the ghost,
  // journal, or orb reward can be committed. The ghost is removed from the
  // scene while the session is open and respawned on cancel, so a failed or
  // abandoned attempt remains a soft miss rather than consuming the target.
  function beginCaptureSession(ghost) {
    if (!ghost || ghostRoleFor(ghost) !== 'hunt-target' || ghost.id !== currentHuntGhostId()) {
      state.captureResolving = false;
      return;
    }
    captureOpen = true;
    if (captureOverlay) captureOverlay.setAttribute('aria-hidden', 'false');
    const caseData = caseForGhost(ghost && ghost.id);
    const caseDifficulty = caseData ? getMuenbaReadingDifficulty() : null;
    captureSession = {
      ghost,
      encounterRole: ghostRoleFor(ghost),
      caseData,
      caseDifficulty,
      choiceSeed: `${ghost.id}:${caseDifficulty || 'none'}:${_muenbaTodayKey() || 'session'}:${Math.floor(performance.now())}`,
      caseIndex: 0,
      casePenaltyCount: 0,
      caseChoiceAttempt: 0,
      caseWrongAnswerPending: false,
      caseWrongTimer: 0,
      caseResolved: false,
      devCaptureHold: false,
      readGateTimer: 0,
      readGateRemainingMs: 0,
      readGateStartedAt: 0,
      readGatePaused: false,
      phase: caseData && !caseRecordComplete(caseData) ? 'case-intro' : 'ready',
      openedAt: performance.now()
    };
    state.clickTarget = null;
    state.moving = false;
    activeGhost = null;
    if (captureSession.phase === 'case-intro') renderCaseIntro();
    else renderCaptureReady();
  }

  function captureBox() {
    if (captureSession) clearCaseReadGate(captureSession);
    captureOverlay.textContent = '';
    captureOverlay.setAttribute('aria-hidden', 'false');
    captureOverlay.scrollTop = 0;
    captureOverlay.scrollLeft = 0;
    if (captureSession) {
      captureOverlay.dataset.phase = captureSession.phase || '';
      captureOverlay.dataset.surface = captureSession.rhythm ? 'rhythm' : 'capture';
      captureOverlay.classList.toggle('muenba-rhythm-mode', !!captureSession.rhythm);
    }
    const box = document.createElement('div');
    box.className = 'muenba-lobby-box';
    captureOverlay.appendChild(box);
    // Every capture scene is a fresh reading/game card. Keep the scroll
    // position deterministic when a long scene replaces the previous one.
    box.scrollTop = 0;
    box.scrollLeft = 0;
    appendDevCaptureTools(box);
    return box;
  }

  // Pass 27B: browsers may scroll a focused control into view after a popup
  // has been rendered. Keep the overlay and its independently-scrollable card
  // anchored at their first line, even after that focus/layout cycle finishes.
  function resetMuenbaPopupScroll(overlay, cardSelector = '.muenba-lobby-box') {
    if (!overlay) return;
    overlay.scrollTop = 0;
    overlay.scrollLeft = 0;
    const card = overlay.querySelector(cardSelector);
    if (card) {
      card.scrollTop = 0;
      card.scrollLeft = 0;
    }
  }

  function resetMuenbaPopupScrollAfterLayout(overlay, cardSelector = '.muenba-lobby-box') {
    resetMuenbaPopupScroll(overlay, cardSelector);
    window.requestAnimationFrame(() => {
      resetMuenbaPopupScroll(overlay, cardSelector);
      window.requestAnimationFrame(() => resetMuenbaPopupScroll(overlay, cardSelector));
    });
  }

  function devCaptureToolsEnabled() {
    return DEV_MODE || window.__devMuenba === true;
  }

  function appendDevCaptureTools(box) {
    if (!box || !devCaptureToolsEnabled()) return;
    const tools = document.createElement('div');
    tools.className = 'muenba-dev-capture-tools';
    tools.setAttribute('role', 'toolbar');
    tools.setAttribute('aria-label', 'Muenba developer capture tools');
    const hold = document.createElement('button');
    hold.type = 'button';
    hold.id = 'muenba-dev-capture-hold';
    hold.className = 'muenba-dev-capture-hold';
    hold.addEventListener('click', () => {
      if (!captureSession) return;
      setDevCaptureHold(!captureSession.devCaptureHold);
    });
    tools.appendChild(hold);
    box.appendChild(tools);
    updateDevCaptureTools();
  }

  function updateDevCaptureTools() {
    const hold = captureOverlay && captureOverlay.querySelector('#muenba-dev-capture-hold');
    if (!hold) return;
    const paused = !!(captureSession && captureSession.devCaptureHold);
    hold.textContent = paused ? 'Resume screen' : 'Hold screen';
    hold.setAttribute('aria-pressed', paused ? 'true' : 'false');
    hold.title = paused
      ? 'Resume the paused developer timer'
      : 'Pause timed reading or transition callbacks for screenshots';
  }

  function setDevCaptureHold(held) {
    if (!captureSession || !devCaptureToolsEnabled()) return;
    captureSession.devCaptureHold = !!held;
    if (captureSession.devCaptureHold) {
      pauseCaseReadGate(captureSession);
    } else {
      resumeCaseReadGate(captureSession);
    }
    updateDevCaptureTools();
  }

  function setDangerOverlay(active) {
    if (!captureOverlay) return;
    captureOverlay.classList.toggle('danger', !!active);
  }

  function captureImage(box, ghost, src = ghost.img) {
    const img = document.createElement('img');
    img.className = 'muenba-lobby-portrait';
    img.src = src || ghost.img;
    img.alt = ghost.name;
    box.appendChild(img);
  }

  // Pass 12: every capture-flow button now carries a furigana translation
  // under the English label, matching caseActionButton's existing pattern —
  // japaneseText is optional only so a caller can pass '' for a control
  // that has no natural short JP phrase yet, not as a general escape hatch.
  function captureButton(label, japaneseText, id, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'muenba-capture-action';
    const en = document.createElement('span');
    en.textContent = label;
    button.appendChild(en);
    if (japaneseText) {
      const jp = document.createElement('small');
      jp.innerHTML = japaneseText;
      button.appendChild(jp);
    }
    button.addEventListener('click', event => {
      playUiSfx('buttonPress');
      if (typeof handler === 'function') handler(event);
    });
    return button;
  }

  // Pass 12: wraps 2-3 authored keywords in a clue in <span class="kw"> so
  // the CSS can give them the gold glow, without touching the rest of the
  // clue's plain English. Keywords always come from our own case data (never
  // user input), but the surrounding text is still escaped defensively.
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function highlightKeywords(text, keywords) {
    const escaped = escapeHtml(text);
    if (!Array.isArray(keywords) || !keywords.length) return escaped;
    const pattern = keywords
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(kw => String(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    if (!pattern) return escaped;
    return escaped.replace(new RegExp(`\\b(${pattern})\\b`, 'gi'), '<span class="kw">$1</span>');
  }

  function clearCaseWrongAnswer(session) {
    if (!session) return;
    if (session.caseWrongTimer) window.clearTimeout(session.caseWrongTimer);
    session.caseWrongTimer = 0;
    session.caseWrongAnswerPending = false;
  }

  function beginCaseClueReread(index, answerSet, mode, clickedButton = null, panel = null) {
    if (!captureSession || captureSession.phase !== 'case-check' || captureSession.caseWrongAnswerPending) return;
    const session = captureSession;
    session.caseWrongAnswerPending = true;
    session.caseChoiceAttempt = Math.max(0, Number(session.caseChoiceAttempt) || 0) + 1;
    const checkPanel = panel || captureOverlay?.querySelector('.muenba-case-check-panel');
    const box = checkPanel?.closest('.muenba-lobby-box') || captureOverlay?.querySelector('.muenba-case-check');
    const choices = checkPanel?.querySelectorAll('.muenba-case-choice') || box?.querySelectorAll('.muenba-case-choice') || [];
    choices.forEach(button => {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      if (button !== clickedButton) button.classList.add('is-cooldown');
    });
    if (clickedButton) clickedButton.classList.add('is-wrong');

    if (checkPanel) {
      checkPanel.classList.remove('muenba-case-wrong-state');
      void checkPanel.offsetWidth;
      checkPanel.classList.add('muenba-case-wrong-state');
      const hint = checkPanel.querySelector('.muenba-case-check-lock-hint');
      if (hint) hint.textContent = 'Not quite. Read the record again, then try once more.';
    } else if (box) {
      const feedback = document.createElement('div');
      feedback.className = 'muenba-case-direction muenba-case-feedback muenba-case-feedback-shake';
      const en = document.createElement('p');
      en.className = 'muenba-case-direction-en';
      en.textContent = 'Not quite. Read the record again, then try once more.';
      const jp = document.createElement('p');
      jp.className = 'muenba-case-direction-jp';
      jp.innerHTML = '<ruby>記録<rt>きろく</rt></ruby>をもう<ruby>一度<rt>いちど</rt></ruby><ruby>読<rt>よ</rt></ruby>んで、もう<ruby>一度<rt>いちど</rt></ruby><ruby>選<rt>えら</rt></ruby>びましょう。';
      feedback.append(en, jp);
      const choiceGroup = box.querySelector('.muenba-case-choices');
      if (choiceGroup) box.insertBefore(feedback, choiceGroup);
      else box.appendChild(feedback);
    }

    session.caseWrongTimer = window.setTimeout(() => {
      if (captureSession !== session || session.phase !== 'case-check') return;
      clearCaseWrongAnswer(session);
      renderCaseClue();
    }, CASE_WRONG_CLUE_COOLDOWN_MS);
  }

  function handleCaseClueAnswer(index, answerSet, mode, clickedButton = null, panel = null) {
    if (!captureSession || captureSession.phase !== 'case-check') return;
    if (captureSession.caseWrongAnswerPending) return;
    if (index === answerSet.correct) {
      if (captureSession.caseIndex >= mode.clues.length - 1) {
        captureSession.phase = 'case-question';
        renderCaseQuestion();
      } else {
        captureSession.caseIndex += 1;
        renderCaseClue();
      }
    } else {
      beginCaseClueReread(index, answerSet, mode, clickedButton, panel);
    }
  }

  function appendCaseLockedCheck(box, clue, mode, session) {
    const check = clue.check;
    const panel = document.createElement('section');
    panel.className = 'muenba-case-check-panel is-locked';
    panel.setAttribute('aria-label', 'Comprehension check locked until the record is read');

    const label = document.createElement('div');
    label.className = 'muenba-case-check-lock-label';
    label.textContent = 'CHECK LOCKED';
    panel.appendChild(label);

    const question = renderCaseDirection(
      panel,
      check.prompt,
      check.promptJP,
      'muenba-case-question muenba-case-question-locked'
    );
    question.setAttribute('aria-hidden', 'true');

    const lockHint = document.createElement('p');
    lockHint.className = 'muenba-case-check-lock-hint';
    lockHint.textContent = 'Read the complete record first.';
    lockHint.setAttribute('aria-live', 'polite');
    panel.appendChild(lockHint);

    const choices = document.createElement('div');
    choices.className = 'muenba-case-choices muenba-case-choices-locked';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'Locked record question choices');
    const answerSet = shuffledCaseChoices(check, `clue-${session.caseIndex}-attempt-${session.caseChoiceAttempt || 0}`);
    answerSet.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'muenba-case-choice muenba-case-choice-locked';
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('tabindex', '-1');
      button.setAttribute('aria-label', `Answer ${index + 1}: ${choice}`);
      const number = document.createElement('span');
      number.className = 'muenba-case-choice-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const text = document.createElement('span');
      text.className = 'muenba-case-choice-text';
      text.textContent = choice;
      button.append(number, text);
      button.addEventListener('click', event => {
        playUiSfx('buttonPress');
        event.preventDefault();
        if (panel.classList.contains('is-locked')) {
          lockHint.textContent = 'Keep reading. The answers unlock when the record is complete.';
          return;
        }
        handleCaseClueAnswer(index, answerSet, mode, button, panel);
      });
      choices.appendChild(button);
    });
    panel.appendChild(choices);
    box.appendChild(panel);
    return { panel, answerSet, lockHint };
  }

  function unlockCaseCheck(session, checkPanel, readStatus) {
    if (!session || captureSession !== session || session.phase !== 'case-read') return;
    session.phase = 'case-check';
    checkPanel.panel.classList.remove('is-locked');
    checkPanel.panel.classList.add('is-unlocked');
    checkPanel.panel.setAttribute('aria-label', 'Record question choices');
    checkPanel.panel.querySelector('.muenba-case-check-lock-label').textContent = 'CHECK';
    const unlockedQuestion = checkPanel.panel.querySelector('.muenba-case-question-locked');
    if (unlockedQuestion) {
      unlockedQuestion.classList.remove('muenba-case-question-locked');
      unlockedQuestion.removeAttribute('aria-hidden');
    }
    checkPanel.lockHint.textContent = 'The record is complete. Choose the best answer.';
    checkPanel.panel.querySelectorAll('.muenba-case-choice').forEach(button => {
      button.classList.remove('muenba-case-choice-locked');
      button.disabled = false;
      button.setAttribute('aria-disabled', 'false');
      button.setAttribute('tabindex', '0');
    });
    const status = readStatus && readStatus.querySelector('.muenba-case-direction-en');
    if (status) status.textContent = 'CHECK UNLOCKED. Choose an answer.';
    playCaseUnlockCue();
    focusCaptureControl('.muenba-case-choice[aria-disabled="false"]');
  }

  function focusCaptureControl(selector) {
    resetMuenbaPopupScrollAfterLayout(captureOverlay);
    window.setTimeout(() => {
      const control = captureOverlay && captureOverlay.querySelector(selector);
      if (control && typeof control.focus === 'function') control.focus({ preventScroll: true });
      resetMuenbaPopupScrollAfterLayout(captureOverlay);
    }, 0);
  }

  function clearCaseReadGate(session) {
    if (!session) return;
    if (session.readGateTimer) window.clearTimeout(session.readGateTimer);
    session.readGateTimer = 0;
    session.readGateStartedAt = 0;
  }

  function pauseCaseReadGate(session) {
    if (!session || !session.readGateTimer || session.readGatePaused) return;
    const elapsed = Math.max(0, performance.now() - session.readGateStartedAt);
    session.readGateRemainingMs = Math.max(0, session.readGateRemainingMs - elapsed);
    clearCaseReadGate(session);
    session.readGatePaused = true;
  }

  function resumeCaseReadGate(session) {
    if (!session || !session.readGatePaused) return;
    session.readGatePaused = false;
    scheduleCaseReadGate(session, session.readGateId);
  }

  function scheduleCaseReadGate(session, gateId) {
    if (!session || captureSession !== session || session.readGateId !== gateId) return;
    if (session.devCaptureHold) {
      session.readGatePaused = true;
      return;
    }
    session.readGateStartedAt = performance.now();
    session.readGateTimer = window.setTimeout(() => {
      if (captureSession !== session || session.readGateId !== gateId) return;
      if (session.devCaptureHold) {
        session.readGatePaused = true;
        session.readGateRemainingMs = 0;
        session.readGateTimer = 0;
        return;
      }
      session.readGateTimer = 0;
      session.readGateRemainingMs = 0;
      session.readGateStartedAt = 0;
      session.readGatePaused = false;
      if (typeof session.readGateOnReady === 'function') session.readGateOnReady();
    }, Math.max(0, session.readGateRemainingMs));
  }

  function caseSweepWordIsKeyword(word, keywords) {
    const normalizedWord = String(word || '')
      .toLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9'’]+$/g, '');
    if (!normalizedWord || !Array.isArray(keywords)) return false;
    return keywords.some(keyword => {
      const normalizedKeyword = String(keyword || '').toLowerCase().trim();
      return normalizedKeyword && normalizedWord === normalizedKeyword;
    });
  }

  function startCaseWordSweep(box, record, englishText, keywords, onReady, button = null) {
    if (!captureSession || !box || !record) return;
    const session = captureSession;
    clearCaseReadGate(session);
    const sweepId = (session.readSweepId || 0) + 1;
    session.readSweepId = sweepId;
    const parts = String(englishText || '').match(/\s+|[^\s]+/g) || [];
    const wordSpans = [];
    record.textContent = '';
    record.classList.add('muenba-case-sweep');
    record.setAttribute('aria-label', String(englishText || ''));
    record.setAttribute('aria-busy', 'true');
    record.dataset.sweepState = 'reading';

    parts.forEach(part => {
      if (/^\s+$/.test(part)) {
        record.appendChild(document.createTextNode(part));
        return;
      }
      const word = document.createElement('span');
      word.className = 'muenba-case-sweep-word';
      if (caseSweepWordIsKeyword(part, keywords)) word.classList.add('is-keyword');
      word.textContent = part;
      record.appendChild(word);
      wordSpans.push(word);
    });

    session.readSweep = { box, record, wordSpans, index: 0, onReady, button, sweepId };
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('muenba-read-locked');
      button.classList.remove('muenba-read-ready');
    }
    box.classList.add('muenba-reading');

    const advance = () => {
      if (captureSession !== session || session.readSweepId !== sweepId) return;
      const sweep = session.readSweep;
      if (!sweep || sweep.sweepId !== sweepId) return;
      const previous = sweep.wordSpans[sweep.index - 1];
      if (previous) {
        previous.classList.remove('is-current');
        previous.classList.add('is-revealed');
      }

      const current = sweep.wordSpans[sweep.index];
      if (!current) {
        if (!sweep.finalHoldStarted) {
          sweep.finalHoldStarted = true;
          session.readGateOnReady = advance;
          session.readGateRemainingMs = CASE_WORD_SWEEP_FINAL_HOLD_MS;
          session.readGatePaused = false;
          scheduleCaseReadGate(session, sweepId);
          return;
        }
        record.dataset.sweepState = 'complete';
        record.setAttribute('aria-busy', 'false');
        box.classList.remove('muenba-reading');
        box.classList.add('muenba-reading-complete');
        if (button && button.isConnected) {
          button.disabled = false;
          button.setAttribute('aria-disabled', 'false');
          button.classList.remove('muenba-read-locked');
          button.classList.add('muenba-read-ready');
        }
        if (typeof onReady === 'function') onReady();
        return;
      }

      current.classList.add('is-current', 'is-revealed');
      playCaseWordCue(caseSweepWordIsKeyword(current.textContent, keywords));
      sweep.index += 1;
      session.readGateOnReady = advance;
      session.readGateRemainingMs = caseSweepWordIsKeyword(current.textContent, keywords)
        ? CASE_WORD_SWEEP_BASE_MS + CASE_WORD_SWEEP_KEYWORD_EXTRA_MS
        : CASE_WORD_SWEEP_BASE_MS;
      session.readGatePaused = false;
      scheduleCaseReadGate(session, sweepId);
    };

    session.readGateId = sweepId;
    session.readGateOnReady = advance;
    session.readGateRemainingMs = wordSpans.length ? CASE_WORD_SWEEP_BASE_MS : CASE_WORD_SWEEP_FINAL_HOLD_MS;
    session.readGatePaused = false;
    if (wordSpans.length) {
      // The first word is shown immediately; subsequent words are paced by
      // the same session-owned timer that DEV screenshot hold can pause.
      advance();
    } else {
      scheduleCaseReadGate(session, sweepId);
    }
  }

  function armCaseReadGate(box, button, englishText, onReady) {
    if (!captureSession) return;
    const session = captureSession;
    clearCaseReadGate(session);
    const gateId = (session.readGateId || 0) + 1;
    session.readGateId = gateId;
    session.readGateOnReady = onReady;
    const wordCount = String(englishText || '').trim().split(/\s+/).filter(Boolean).length;
    const delay = Math.min(CASE_READ_GATE_MAX_MS, Math.max(CASE_READ_GATE_MIN_MS, wordCount * CASE_READ_GATE_PER_WORD_MS));
    session.readGateRemainingMs = delay;
    session.readGatePaused = false;

    if (button) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('muenba-read-locked');
      button.classList.remove('muenba-read-ready');
    }
    if (box) box.classList.add('muenba-reading');
    session.readGateOnReady = () => {
      if (button && !button.isConnected) return;
      if (button) {
        button.disabled = false;
        button.setAttribute('aria-disabled', 'false');
        button.classList.remove('muenba-read-locked');
        button.classList.add('muenba-read-ready');
      }
      if (box) box.classList.remove('muenba-reading');
      if (typeof onReady === 'function') onReady();
    };
    scheduleCaseReadGate(session, gateId);
  }

  // Japanese scaffolding is optional. The authored lesson stays English-only;
  // existing translations can still support a learner when present, but a
  // future English-only record must not render an empty or "undefined" row.
  function renderCaseDirection(box, english, japaneseHtml, variant = '') {
    const direction = document.createElement('div');
    direction.className = `muenba-case-direction${variant ? ` ${variant}` : ''}`;
    const en = document.createElement('p');
    en.className = 'muenba-case-direction-en';
    en.textContent = english;
    direction.appendChild(en);
    if (typeof japaneseHtml === 'string' && japaneseHtml.trim()) {
      const jp = document.createElement('p');
      jp.className = 'muenba-case-direction-jp';
      jp.innerHTML = japaneseHtml;
      direction.appendChild(jp);
    }
    box.appendChild(direction);
    return direction;
  }

  function caseActionButton(label, japaneseHtml, id, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = id;
    button.className = 'muenba-capture-action muenba-case-action';
    const en = document.createElement('span');
    en.textContent = label;
    const jp = document.createElement('small');
    jp.innerHTML = japaneseHtml;
    button.append(en, jp);
    button.addEventListener('click', event => {
      playUiSfx('buttonPress');
      if (typeof handler === 'function') handler(event);
    });
    return button;
  }

  function renderCaseIntro() {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const caseData = captureSession.caseData;
    const box = captureBox();
    box.classList.add('muenba-case-box', 'muenba-case-intro');
    captureImage(box, captureSession.ghost);

    // caseData.eyebrow/title/intro (and every clue title/text/resolution
    // below) are the authored case content — deliberately English-only, per
    // the note in muenba-data.js, so the reading record stays clean. JP only
    // covers the surrounding instructions/directions/buttons.
    const eyebrow = document.createElement('div');
    eyebrow.className = 'muenba-case-eyebrow';
    eyebrow.textContent = caseData.eyebrow;
    box.appendChild(eyebrow);

    const h2 = document.createElement('h2');
    h2.textContent = caseData.title;
    box.appendChild(h2);

    const intro = document.createElement('p');
    intro.className = 'muenba-case-record';
    intro.textContent = caseData.intro;
    box.appendChild(intro);

    const selectedMode = ['start', 'fresh', 'deep'].includes(captureSession.caseDifficulty)
      ? captureSession.caseDifficulty
      : 'start';
    const selectedModeLabel = MUENBA_MEMORY_MODE_LABELS[selectedMode] || MUENBA_MEMORY_MODE_LABELS.start;
    const selectedModeJP = MUENBA_MEMORY_MODE_JP[selectedMode] || MUENBA_MEMORY_MODE_JP.start;

    renderCaseDirection(
      box,
      `Your profile is set to ${selectedModeLabel}. This case will use that mode.`,
      `プロフィールの<ruby>設定<rt>せってい</rt></ruby>は${selectedModeJP}です。この<ruby>事件<rt>じけん</rt></ruby>ではその<ruby>読<rt>よ</rt></ruby>み<ruby>方<rt>かた</rt></ruby>を<ruby>使<rt>つか</rt></ruby>います。`,
      'muenba-case-mode-card'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-case-actions';
    const openAction = caseActionButton(
      'Open first clue',
      '<ruby>最初<rt>さいしょ</rt></ruby>の<ruby>手<rt>て</rt></ruby>がかりを<ruby>開<rt>ひら</rt></ruby>く',
      'muenba-case-open',
      () => selectCaseDifficulty(selectedMode)
    );
    actions.appendChild(openAction);
    box.appendChild(actions);
    armCaseReadGate(box, openAction, caseData.intro);

    captureOverlay.classList.add('open');
  }

  function selectCaseDifficulty(difficulty) {
    if (!captureSession || !captureSession.caseData) return;
    if (!['start', 'fresh', 'deep'].includes(difficulty)) return;
    captureSession.caseDifficulty = difficulty;
    captureSession.caseIndex = 0;
    captureSession.phase = 'case-read';
    renderCaseClue();
  }

  function renderCaseClue() {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const caseData = captureSession.caseData;
    const mode = caseData[captureSession.caseDifficulty];
    const clue = mode.clues[captureSession.caseIndex];
    if (!clue) return;
    captureSession.phase = 'case-read';
    const box = captureBox();
    box.classList.add('muenba-case-box', 'muenba-case-clue');
    captureImage(box, captureSession.ghost);

    const modeLabel = document.createElement('div');
    modeLabel.className = 'muenba-case-mode-label';
    modeLabel.textContent = MUENBA_MEMORY_MODE_LABELS[captureSession.caseDifficulty] || MUENBA_MEMORY_MODE_LABELS.start;
    const modeJP = document.createElement('small');
    modeJP.innerHTML = MUENBA_MEMORY_MODE_JP[captureSession.caseDifficulty] || MUENBA_MEMORY_MODE_JP.start;
    modeLabel.appendChild(modeJP);
    box.appendChild(modeLabel);

    const progress = document.createElement('div');
    progress.className = 'muenba-case-progress';
    progress.textContent = `RECORD ${captureSession.caseIndex + 1} OF ${mode.clues.length}`;
    box.appendChild(progress);
    const progressJp = document.createElement('p');
    progressJp.className = 'muenba-case-progress-jp';
    progressJp.innerHTML = `<ruby>記録<rt>きろく</rt></ruby> ${captureSession.caseIndex + 1} / ${mode.clues.length}`;
    box.appendChild(progressJp);

    const h2 = document.createElement('h2');
    h2.textContent = clue.title;
    box.appendChild(h2);

    // Pass 12: the clue's own English stays untranslated (it's the target
    // reading content), but 2-3 authored keywords glow gold so the words
    // most worth remembering stand out, with the rest of the sentence in
    // plain white for contrast — the "Highlighted Vocabulary" treatment.
    const record = document.createElement('p');
    record.className = 'muenba-case-record';
    box.appendChild(record);

    const readStatus = renderCaseDirection(
      box,
      'Read the complete record. The check is locked until you finish.',
      'この<ruby>記録<rt>きろく</rt></ruby>を<ruby>読<rt>よ</rt></ruby>み<ruby>終<rt>お</rt></ruby>えよう。<ruby>終<rt>お</rt></ruby>わるまで<ruby>確認<rt>かくにん</rt></ruby>はロックされています。',
      'muenba-case-read-status muenba-case-reading-status'
    );
    const checkPanel = appendCaseLockedCheck(box, clue, mode, captureSession);
    captureOverlay.classList.add('open');
    startCaseWordSweep(
      box,
      record,
      clue.text,
      clue.keywords,
      () => unlockCaseCheck(captureSession, checkPanel, readStatus)
    );
  }

  function renderCaseCheck(feedback = '') {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const caseData = captureSession.caseData;
    const mode = caseData[captureSession.caseDifficulty];
    const clue = mode && mode.clues[captureSession.caseIndex];
    const check = clue && clue.check;
    if (!clue || !check) return;
    captureSession.phase = 'case-check';

    const box = captureBox();
    box.classList.add('muenba-case-box', 'muenba-case-clue', 'muenba-case-check');
    captureImage(box, captureSession.ghost);

    const modeLabel = document.createElement('div');
    modeLabel.className = 'muenba-case-mode-label';
    modeLabel.textContent = MUENBA_MEMORY_MODE_LABELS[captureSession.caseDifficulty] || MUENBA_MEMORY_MODE_LABELS.start;
    const modeJP = document.createElement('small');
    modeJP.innerHTML = MUENBA_MEMORY_MODE_JP[captureSession.caseDifficulty] || MUENBA_MEMORY_MODE_JP.start;
    modeLabel.appendChild(modeJP);
    box.appendChild(modeLabel);

    renderCaseDirection(
      box,
      'CHECK',
      '<ruby>確認<rt>かくにん</rt></ruby>しよう',
      'muenba-case-question-instruction'
    );

    const progress = document.createElement('div');
    progress.className = 'muenba-case-progress';
    progress.textContent = `RECORD ${captureSession.caseIndex + 1} OF ${mode.clues.length} · CHECK`;
    box.appendChild(progress);
    const progressJp = document.createElement('p');
    progressJp.className = 'muenba-case-progress-jp';
    progressJp.innerHTML = `<ruby>記録<rt>きろく</rt></ruby> ${captureSession.caseIndex + 1} / ${mode.clues.length}・<ruby>確認<rt>かくにん</rt></ruby>`;
    box.appendChild(progressJp);

    const h2 = document.createElement('h2');
    h2.textContent = clue.title;
    box.appendChild(h2);

    const record = document.createElement('p');
    record.className = 'muenba-case-record';
    record.innerHTML = highlightKeywords(clue.text, clue.keywords);
    box.appendChild(record);

    renderCaseDirection(box, check.prompt, check.promptJP, 'muenba-case-question');
    if (feedback) renderCaseDirection(
      box,
      feedback,
      '<ruby>記録<rt>きろく</rt></ruby>をもう<ruby>一度<rt>いちど</rt></ruby><ruby>読<rt>よ</rt></ruby>んで、もう<ruby>一度<rt>いちど</rt></ruby><ruby>選<rt>えら</rt></ruby>びましょう。',
      'muenba-case-feedback muenba-case-feedback-shake'
    );

    const choices = document.createElement('div');
    choices.className = 'muenba-case-choices';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'Record question choices');
    const answerSet = shuffledCaseChoices(check, `clue-${captureSession.caseIndex}-attempt-${captureSession.caseChoiceAttempt || 0}`);
    answerSet.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'muenba-case-choice';
      button.setAttribute('aria-label', `Answer ${index + 1}: ${choice}`);
      const number = document.createElement('span');
      number.className = 'muenba-case-choice-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const text = document.createElement('span');
      text.className = 'muenba-case-choice-text';
      text.textContent = choice;
      button.append(number, text);
      button.addEventListener('click', event => {
        playUiSfx('buttonPress');
        handleCaseClueAnswer(index, answerSet, mode, event.currentTarget, null);
      });
      choices.appendChild(button);
    });
    box.appendChild(choices);
    captureOverlay.classList.add('open');
    focusCaptureControl('.muenba-case-choice');
  }

  function renderCaseReview(index = 0, options = {}) {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const mode = captureSession.caseData[captureSession.caseDifficulty];
    if (!mode || !Array.isArray(mode.clues) || !mode.clues.length) return;
    const lastIndex = mode.clues.length - 1;
    const reviewIndex = Math.max(0, Math.min(lastIndex, Number.isInteger(index) ? index : 0));
    const clue = mode.clues[reviewIndex];
    const penaltyReview = options.penalty === true;
    captureSession.caseReviewIndex = reviewIndex;
    captureSession.phase = penaltyReview ? 'case-reread' : 'case-review';

    const box = captureBox();
    box.classList.add('muenba-case-box', 'muenba-case-review');
    captureImage(box, captureSession.ghost);

    const modeLabel = document.createElement('div');
    modeLabel.className = 'muenba-case-mode-label';
    modeLabel.textContent = MUENBA_MEMORY_MODE_LABELS[captureSession.caseDifficulty] || MUENBA_MEMORY_MODE_LABELS.start;
    const modeJP = document.createElement('small');
    modeJP.innerHTML = MUENBA_MEMORY_MODE_JP[captureSession.caseDifficulty] || MUENBA_MEMORY_MODE_JP.start;
    modeLabel.appendChild(modeJP);
    box.appendChild(modeLabel);

    renderCaseDirection(
      box,
      penaltyReview ? 'READ THIS RECORD AGAIN' : 'REVIEW RECORDS',
      penaltyReview
        ? '<ruby>記録<rt>きろく</rt></ruby>をもう<ruby>一度<rt>いちど</rt></ruby><ruby>読<rt>よ</rt></ruby>もう'
        : '<ruby>記録<rt>きろく</rt></ruby>を<ruby>見直<rt>みなお</rt></ruby>そう',
      'muenba-case-question-instruction'
    );

    const progress = document.createElement('div');
    progress.className = 'muenba-case-progress';
    progress.textContent = `RECORD ${reviewIndex + 1} OF ${mode.clues.length}`;
    box.appendChild(progress);
    const progressJp = document.createElement('p');
    progressJp.className = 'muenba-case-progress-jp';
    progressJp.innerHTML = `<ruby>記録<rt>きろく</rt></ruby> ${reviewIndex + 1} / ${mode.clues.length}`;
    box.appendChild(progressJp);

    const h2 = document.createElement('h2');
    h2.textContent = clue.title;
    box.appendChild(h2);

    const record = document.createElement('p');
    record.className = 'muenba-case-record';
    record.innerHTML = highlightKeywords(clue.text, clue.keywords);
    box.appendChild(record);

    const actions = document.createElement('div');
    actions.className = 'muenba-case-actions muenba-case-review-actions';
    if (penaltyReview) {
      const penaltyCount = Math.max(1, Math.min(CASE_FINAL_PENALTY_MAX, Number(options.penaltyCount) || 1));
      const penaltyText = options.penaltyApplied === false
        ? 'The ghost will not grow stronger again. Read this record, then try the case once more.'
        : `The ghost grew stronger (${penaltyCount} of ${CASE_FINAL_PENALTY_MAX} reading penalties). Read this record, then try the case once more.`;
      renderCaseDirection(
        box,
        penaltyText,
        options.penaltyApplied === false
          ? 'これ<ruby>以上<rt>いじょう</rt></ruby>ゴーストは<ruby>強<rt>つよ</rt></ruby>くなりません。この<ruby>記録<rt>きろく</rt></ruby>を<ruby>読<rt>よ</rt></ruby>んでもう<ruby>一度<rt>いちど</rt></ruby><ruby>挑戦<rt>ちょうせん</rt></ruby>しましょう。'
          : `ゴーストが<ruby>少<rt>すこ</rt></ruby>し<ruby>強<rt>つよ</rt></ruby>くなりました（${penaltyCount} / ${CASE_FINAL_PENALTY_MAX}）。この<ruby>記録<rt>きろく</rt></ruby>を<ruby>読<rt>よ</rt></ruby>んでもう<ruby>一度<rt>いちど</rt></ruby><ruby>挑戦<rt>ちょうせん</rt></ruby>しましょう。`,
        'muenba-case-review-note muenba-case-penalty-note'
      );
      const returnAction = caseActionButton(
        'Return to final question',
        '<ruby>質問<rt>しつもん</rt></ruby>に<ruby>戻<rt>もど</rt></ruby>る',
        'muenba-case-reread-return',
        () => {
          if (captureSession && captureSession.phase === 'case-reread') renderCaseQuestion();
        }
      );
      actions.appendChild(returnAction);
      box.appendChild(actions);
      captureOverlay.classList.add('open');
      startCaseWordSweep(box, record, clue.text, clue.keywords, null, returnAction);
      return;
    }

    renderCaseDirection(
      box,
      'Reviewing is safe. It does not cost a turn or a reward.',
      '<ruby>見直<rt>みなお</rt></ruby>しても、ペナルティやごほうびの<ruby>減点<rt>げんてん</rt></ruby>はありません。',
      'muenba-case-review-note'
    );

    if (reviewIndex > 0) {
      actions.appendChild(caseActionButton(
        'Previous record',
        '<ruby>前<rt>まえ</rt></ruby>の<ruby>記録<rt>きろく</rt></ruby>',
        'muenba-case-review-previous',
        () => {
          if (captureSession && captureSession.phase === 'case-review') renderCaseReview(reviewIndex - 1);
        }
      ));
    }
    if (reviewIndex < lastIndex) {
      actions.appendChild(caseActionButton(
        'Next record',
        '<ruby>次<rt>つぎ</rt></ruby>の<ruby>記録<rt>きろく</rt></ruby>',
        'muenba-case-review-next',
        () => {
          if (captureSession && captureSession.phase === 'case-review') renderCaseReview(reviewIndex + 1);
        }
      ));
    }
    actions.appendChild(caseActionButton(
      'Back to final question',
      '<ruby>質問<rt>しつもん</rt></ruby>に<ruby>戻<rt>もど</rt></ruby>る',
      'muenba-case-review-return',
      () => {
        if (captureSession && captureSession.phase === 'case-review') renderCaseQuestion();
      }
    ));
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('.muenba-case-action');
  }

  function renderCaseQuestion(feedback = '') {
    if (!captureSession || !captureSession.caseData || !captureOverlay) return;
    const mode = captureSession.caseData[captureSession.caseDifficulty];
    captureSession.phase = 'case-question';
    const box = captureBox();
    box.classList.add('muenba-case-box', 'muenba-case-resolved');
    captureImage(box, captureSession.ghost);

    const modeLabel = document.createElement('div');
    modeLabel.className = 'muenba-case-mode-label';
    modeLabel.textContent = MUENBA_MEMORY_MODE_LABELS[captureSession.caseDifficulty] || MUENBA_MEMORY_MODE_LABELS.start;
    const modeJP = document.createElement('small');
    modeJP.innerHTML = MUENBA_MEMORY_MODE_JP[captureSession.caseDifficulty] || MUENBA_MEMORY_MODE_JP.start;
    modeLabel.appendChild(modeJP);
    box.appendChild(modeLabel);

    renderCaseDirection(
      box,
      'Answer the question',
      '<ruby>質問<rt>しつもん</rt></ruby>に<ruby>答<rt>こた</rt></ruby>えましょう。',
      'muenba-case-question-instruction'
    );

    const progress = document.createElement('div');
    progress.className = 'muenba-case-progress';
    progress.textContent = 'RECORDS 1–3 READ · QUESTION';
    box.appendChild(progress);
    const progressJp = document.createElement('p');
    progressJp.className = 'muenba-case-progress-jp';
    progressJp.innerHTML = '<ruby>記録<rt>きろく</rt></ruby>を<ruby>読<rt>よ</rt></ruby>み<ruby>終<rt>お</rt></ruby>えた・<ruby>質問<rt>しつもん</rt></ruby>';
    box.appendChild(progressJp);

    const reviewActions = document.createElement('div');
    reviewActions.className = 'muenba-case-actions muenba-case-review-actions';
    reviewActions.appendChild(caseActionButton(
      'Review records',
      '<ruby>記録<rt>きろく</rt></ruby>を<ruby>見直<rt>みなお</rt></ruby>す',
      'muenba-case-review',
      () => {
        if (captureSession && captureSession.phase === 'case-question') renderCaseReview(0);
      }
    ));
    box.appendChild(reviewActions);

    renderCaseDirection(box, mode.prompt, mode.promptJP, 'muenba-case-question');
    if (feedback) renderCaseDirection(
      box,
      feedback,
      '<ruby>手<rt>て</rt></ruby>がかりをもう<ruby>一度<rt>いちど</rt></ruby><ruby>見<rt>み</rt></ruby>て、もう<ruby>一度<rt>いちど</rt></ruby><ruby>選<rt>えら</rt></ruby>びましょう。',
      'muenba-case-feedback'
    );

    const choices = document.createElement('div');
    choices.className = 'muenba-case-choices';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'Answer choices');
    const answerSet = shuffledCaseChoices(mode, 'final');
    answerSet.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'muenba-case-choice';
      button.setAttribute('aria-label', `Answer ${index + 1}: ${choice}`);
      const number = document.createElement('span');
      number.className = 'muenba-case-choice-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const text = document.createElement('span');
      text.className = 'muenba-case-choice-text';
      text.textContent = choice;
      button.append(number, text);
      button.addEventListener('click', () => {
        playUiSfx('buttonPress');
        if (!captureSession || captureSession.phase !== 'case-question') return;
        if (index === answerSet.correct) beginCaseRhythm();
        else {
          const previousPenaltyCount = Math.max(0, Number(captureSession.casePenaltyCount) || 0);
          const penaltyApplied = previousPenaltyCount < CASE_FINAL_PENALTY_MAX;
          const penaltyCount = penaltyApplied ? previousPenaltyCount + 1 : CASE_FINAL_PENALTY_MAX;
          captureSession.casePenaltyCount = penaltyCount;
          const reviewTargets = Array.isArray(mode.reviewClues) && mode.reviewClues.length
            ? mode.reviewClues
            : [mode.clues.length - 1];
          const targetOffset = Math.min(penaltyCount - 1, reviewTargets.length - 1);
          const reviewIndex = reviewTargets[targetOffset];
          renderCaseReview(reviewIndex, { penalty: true, penaltyCount, penaltyApplied });
        }
      });
      choices.appendChild(button);
    });
    box.appendChild(choices);
    captureOverlay.classList.add('open');
    focusCaptureControl('.muenba-case-choice');
  }

  // Pass 19A: solving the quiet reading section earns a stable victory card.
  // The learner explicitly starts energy collection; no transition timer may
  // launch the rhythm session underneath a still-readable success moment.
  function beginCaseRhythm() {
    if (!captureSession || captureSession.phase !== 'case-question') return;
    const session = captureSession;
    session.caseResolved = true;
    session.phase = 'case-solved';

    const box = captureBox();
    box.classList.add('muenba-case-box', 'muenba-case-solved');
    captureImage(box, session.ghost);

    const eyebrow = document.createElement('div');
    eyebrow.className = 'muenba-case-eyebrow';
    eyebrow.textContent = 'CASE SOLVED';
    box.appendChild(eyebrow);

    const h2 = document.createElement('h2');
    h2.textContent = `${session.ghost.name}'s energy untangled!`;
    box.appendChild(h2);

    renderCaseDirection(
      box,
      'You understood the ghost. Start the energy collection when you are ready.',
      'ゴーストの<ruby>意味<rt>いみ</rt></ruby>が<ruby>分<rt>わ</rt></ruby>かりました。<ruby>準備<rt>じゅんび</rt></ruby>ができたらエネルギーを<ruby>集<rt>あつ</rt></ruby>めよう。',
      'muenba-case-resolution-direction'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    const energyAction = caseActionButton(
      'Start energy collection',
      'エネルギーを<ruby>集<rt>あつ</rt></ruby>めよう',
      'muenba-case-energy-start',
      () => {
        if (captureSession !== session || session.phase !== 'case-solved') return;
        startRhythmCapture(false);
      }
    );
    energyAction.classList.add('muenba-energy-collection-action');
    actions.appendChild(energyAction);
    box.appendChild(actions);

    captureOverlay.classList.add('open');
    playCaseSolvedCue();
    focusCaptureControl('#muenba-case-energy-start');
  }

  function renderCaptureReady() {
    if (!captureSession || !captureOverlay) return;
    const ghost = captureSession.ghost;
    const box = captureBox();
    box.classList.add('muenba-capture-ready');
    captureImage(box, ghost);

    const phase = document.createElement('div');
    phase.className = 'muenba-capture-phase-label';
    phase.textContent = 'HUNT';
    box.appendChild(phase);
    const h2 = document.createElement('h2');
    h2.textContent = 'Capture ready';
    box.appendChild(h2);
    const h2Jp = document.createElement('p');
    h2Jp.className = 'jp';
    h2Jp.innerHTML = '<ruby>捕獲<rt>ほかく</rt></ruby>の<ruby>準備<rt>じゅんび</rt></ruby>';
    box.appendChild(h2Jp);

    if (ghost.personality) {
      const personality = document.createElement('p');
      personality.className = 'muenba-ghost-flavor';
      personality.textContent = ghost.personality;
      box.appendChild(personality);
      if (ghost.personalityJp) {
        const personalityJp = document.createElement('p');
        personalityJp.className = 'muenba-ghost-flavor-jp';
        personalityJp.innerHTML = ghost.personalityJp;
        box.appendChild(personalityJp);
      }
    }

    renderCaseDirection(
      box,
      `You found ${ghost.name}. When you are ready, begin the capture sequence.`,
      `${ghost.name}を<ruby>見<rt>み</rt></ruby>つけました。<ruby>準備<rt>じゅんび</rt></ruby>ができたら、<ruby>捕<rt>つか</rt></ruby>まえましょう。`,
      'muenba-capture-direction'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    const rhythmAction = captureButton('Begin rhythm', 'リズムを<ruby>始<rt>はじ</rt></ruby>める', 'muenba-capture-begin', beginRhythmCapture);
    rhythmAction.classList.add('muenba-gold-action');
    actions.appendChild(rhythmAction);
    box.appendChild(actions);

    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-capture-begin');
  }

  function beginRhythmCapture() {
    if (!captureSession || captureSession.phase !== 'ready') return;
    startRhythmCapture(false);
  }

  function beginDangerRhythm() {
    if (!captureSession || !captureSession.danger || captureSession.phase !== 'danger-ready') return;
    startRhythmCapture(true);
  }

  function normalizeRhythmChart(chart) {
    return chart.map((entry, index) => {
      const note = typeof entry === 'string' ? { lane: entry } : (entry || {});
      const lane = RHYTHM_LANE_BY_ID[note.lane] ? note.lane : 'don';
      const laneDef = RHYTHM_LANE_BY_ID[lane];
      return {
        lane,
        shape: note.shape || laneDef.shape,
        decoy: !!note.decoy,
        beat: Number.isFinite(note.beat) ? note.beat : index
      };
    });
  }

  function rhythmLaneForKey(key) {
    const normalized = String(key || '').toLowerCase();
    if (normalized === 'arrowleft' || normalized === 'a') return 'don';
    if (normalized === 'arrowright' || normalized === 's') return 'kat';
    if (normalized === 'arrowup' || normalized === 'd') return 'rim';
    if (normalized === 'f') return 'bell';
    return null;
  }

  function rhythmNoteGlyph(note) {
    if (note.decoy) return note.shape === 'spiral' ? '◌' : '☠';
    return {
      circle: '●',
      diamond: '◆',
      triangle: '▲',
      star: '✦'
    }[note.shape] || '●';
  }

  function dangerRhythmConfigFor(difficulty) {
    const encounterRole = captureSession?.encounterRole || ghostRoleFor(captureSession?.ghost);
    const encounterRules = ghostRulesFor(encounterRole);
    const carryingEnergy = captureSession?.carryingEnergy === true;
    return {
      chart: carryingEnergy ? SUPER_DANGER_RHYTHM_CHART : difficulty.dangerChart,
      noteMs: carryingEnergy ? 60000 / SUPER_DANGER_RHYTHM_BPM : 60000 / difficulty.dangerBpm,
      countdownMs: carryingEnergy ? SUPER_DANGER_RHYTHM_COUNTDOWN_MS : DANGER_RHYTHM_COUNTDOWN_MS,
      travelMs: carryingEnergy ? SUPER_DANGER_RHYTHM_TRAVEL_MS : difficulty.dangerTravelMs,
      perfectMs: carryingEnergy ? SUPER_DANGER_RHYTHM_PERFECT_MS : difficulty.dangerPerfectMs,
      goodMs: carryingEnergy ? SUPER_DANGER_RHYTHM_GOOD_MS : difficulty.dangerGoodMs,
      passAccuracy: carryingEnergy ? SUPER_DANGER_RHYTHM_PASS_ACCURACY : DANGER_RHYTHM_PASS_ACCURACY,
      lanes: carryingEnergy ? ['don', 'kat', 'rim', 'bell'] : ['don', 'kat'],
      difficultyTier: difficulty.tierIndex,
      difficultyLabel: difficulty.label,
      dangerMode: captureSession?.dangerMode || (encounterRole === 'jerk' ? 'jerk' : 'main'),
      dangerCanHide: !carryingEnergy && captureSession?.dangerCanHide === true && encounterRules.dangerCanHide === true
    };
  }

  function startRhythmCapture(danger, practice = false) {
    const difficulty = practice ? null : getRhythmDifficulty();
    const dangerConfig = danger ? dangerRhythmConfigFor(difficulty) : null;
    const config = practice
      ? {
          chart: PRACTICE_RHYTHM_CHART,
          noteMs: PRACTICE_RHYTHM_NOTE_MS,
          countdownMs: PRACTICE_RHYTHM_COUNTDOWN_MS,
          travelMs: PRACTICE_RHYTHM_TRAVEL_MS,
          perfectMs: PRACTICE_RHYTHM_PERFECT_MS,
          goodMs: PRACTICE_RHYTHM_GOOD_MS,
          passAccuracy: PRACTICE_RHYTHM_PASS_ACCURACY,
          lanes: ['don', 'kat'],
          difficultyTier: null,
          difficultyLabel: 'Practice'
        }
      : danger
      ? dangerConfig
      : {
          chart: difficulty.chart,
          noteMs: 60000 / difficulty.bpm,
          countdownMs: RHYTHM_COUNTDOWN_MS,
          travelMs: difficulty.travelMs,
          perfectMs: difficulty.perfectMs,
          goodMs: difficulty.goodMs,
          passAccuracy: RHYTHM_PASS_ACCURACY,
          lanes: difficulty.lanes,
          difficultyTier: difficulty.tierIndex,
          difficultyLabel: difficulty.label
        };
    const readingPenaltyCount = !danger && !practice
      ? Math.min(CASE_FINAL_PENALTY_MAX, Math.max(0, Number(captureSession.casePenaltyCount) || 0))
      : 0;
    const passAccuracy = Math.min(
      100,
      config.passAccuracy + readingPenaltyCount * CASE_FINAL_PENALTY_ACCURACY_STEP
    );
    const startAt = performance.now() + config.countdownMs;
    captureSession.phase = 'countdown';
    captureSession.rhythm = {
      ...config,
      passAccuracy,
      readingPenaltyCount,
      chart: normalizeRhythmChart(config.chart),
      lanes: config.lanes.slice(),
      startAt,
      nextIndex: 0,
      practice,
      perfect: 0,
      good: 0,
      miss: 0,
      avoided: 0,
      combo: 0,
      bestCombo: 0,
      resolvedIndices: new Set(),
      noteEls: [],
      statusEl: null,
      accuracyEl: null,
      countdownEl: null,
      rafId: 0
    };

    pauseWorldMusicForCapture();
    if (danger) startDangerRhythmMusic();
    // Pass 27D: keep the rhythm surface explicit for portrait-specific lane
    // sizing and accessibility/QA, across countdown, play, help, and result.
    captureOverlay.dataset.surface = 'rhythm';
    captureOverlay.classList.add('muenba-rhythm-mode');
    renderRhythmCapture();
    captureSession.rhythm.rafId = window.requestAnimationFrame(tickRhythmCapture);
  }

  function openRhythmHelp() {
    if (!captureSession || !captureSession.rhythm) return;
    if (captureSession.phase !== 'countdown' && captureSession.phase !== 'playing') return;
    const rhythm = captureSession.rhythm;
    if (rhythm.rafId) window.cancelAnimationFrame(rhythm.rafId);
    rhythm.rafId = 0;
    rhythm.helpOpenedAt = performance.now();
    captureSession.rhythmHelpPhase = captureSession.phase;
    captureSession.phase = 'rhythm-help';
    playUiSfx('popupOpen');
    if (captureSession.danger) stopDangerRhythmMusic();
    renderRhythmHelp();
  }

  function closeRhythmHelp() {
    if (!captureSession || captureSession.phase !== 'rhythm-help' || !captureSession.rhythm) return;
    const rhythm = captureSession.rhythm;
    const pausedFor = Math.max(0, performance.now() - (rhythm.helpOpenedAt || performance.now()));
    rhythm.startAt += pausedFor;
    captureSession.phase = captureSession.rhythmHelpPhase || 'playing';
    captureSession.rhythmHelpPhase = null;
    playUiSfx('popupClose');
    rhythm.helpOpenedAt = 0;
    renderRhythmCapture();
    if (captureSession.danger && !captureSession.practice) startDangerRhythmMusic();
    rhythm.rafId = window.requestAnimationFrame(tickRhythmCapture);
  }

  function startPracticeRhythm() {
    if (!captureSession || !['rhythm-help', 'practice-result'].includes(captureSession.phase)) return;
    stopRhythmCapture();
    captureSession.practice = true;
    startRhythmCapture(false, true);
  }

  function returnFromPractice() {
    if (!captureSession || captureSession.phase !== 'practice-result') return;
    stopRhythmCapture();
    captureSession.practice = false;
    captureSession.rhythm = null;
    captureSession.phase = captureSession.danger ? 'danger-ready' : 'ready';
    if (captureSession.danger) {
      startDangerScream();
      renderDangerReady();
    } else {
      renderCaptureReady();
    }
  }

  function pauseWorldMusicForCapture() {
    try { music.pause(); } catch (_) {}
  }

  function resumeWorldMusicAfterCapture() {
    if (!state.musicStarted) return;
    startMusic();
  }

  function rhythmExpectedAt(rhythm, index) {
    const note = rhythm.chart[index];
    const beat = Number.isFinite(note?.beat) ? note.beat : index;
    return rhythm.startAt + rhythm.travelMs + beat * rhythm.noteMs;
  }

  function rhythmAccuracy(rhythm) {
    const total = rhythm.chart.filter(note => !note.decoy).length || 1;
    return Math.round(((rhythm.perfect + rhythm.good) / total) * 100);
  }

  function renderRhythmHelp() {
    if (!captureSession || !captureOverlay) return;
    captureOverlay.dataset.surface = 'rhythm';
    captureOverlay.classList.add('muenba-rhythm-mode');
    setDangerOverlay(false);
    const box = captureBox();
    box.classList.add('muenba-rhythm-halloween-box', 'muenba-capture-result');
    box.classList.add('muenba-rhythm-help-box');

    const eyebrow = document.createElement('div');
    eyebrow.className = 'muenba-case-board-eyebrow';
    eyebrow.textContent = 'HUNT';
    box.appendChild(eyebrow);
    const eyebrowJp = document.createElement('p');
    eyebrowJp.className = 'jp';
    eyebrowJp.innerHTML = '<ruby>探索<rt>たんさく</rt></ruby>';
    box.appendChild(eyebrowJp);

    const h2 = document.createElement('h2');
    h2.textContent = 'How to play';
    box.appendChild(h2);
    const jp = document.createElement('p');
    jp.className = 'jp';
    jp.innerHTML = '<ruby>遊<rt>あそ</rt></ruby>び<ruby>方<rt>かた</rt></ruby>';
    box.appendChild(jp);

    renderCaseDirection(
      box,
      'Tap the lane when its note reaches the orange line.',
      '<ruby>音符<rt>おんぷ</rt></ruby>がオレンジの<ruby>線<rt>せん</rt></ruby>に<ruby>来<rt>き</rt></ruby>たら、レーンを<ruby>押<rt>お</rt></ruby>します。'
    );
    renderCaseDirection(
      box,
      'Circle is DON. Diamond is KAT. Keep the beat.',
      '<ruby>丸<rt>まる</rt></ruby>はドン、<ruby>菱形<rt>ひしがた</rt></ruby>はカッです。リズムを<ruby>続<rt>つづ</rt></ruby>けましょう。'
    );
    renderCaseDirection(
      box,
      'Later levels add lanes. Read the label. Skull and spiral notes are fake. Do not tap them.',
      '<ruby>後<rt>あと</rt></ruby>のレベルではレーンが<ruby>増<rt>ふ</rt></ruby>えます。ラベルを<ruby>読<rt>よ</rt></ruby>みましょう。<ruby>骸骨<rt>がいこつ</rt></ruby>と<ruby>渦<rt>うず</rt></ruby>の<ruby>音符<rt>おんぷ</rt></ruby>は<ruby>偽物<rt>にせもの</rt></ruby>です。<ruby>押<rt>お</rt></ruby>しません。'
    );
    renderCaseDirection(
      box,
      'Practice is safe. It does not change your hunt.',
      '<ruby>練習<rt>れんしゅう</rt></ruby>は<ruby>安全<rt>あんぜん</rt></ruby>です。ゴースト<ruby>探<rt>さが</rt></ruby>しの<ruby>記録<rt>きろく</rt></ruby>は<ruby>変<rt>か</rt></ruby>わりません。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    actions.appendChild(captureButton('Practice rhythm', 'リズムを<ruby>練習<rt>れんしゅう</rt></ruby>する', 'muenba-rhythm-practice', startPracticeRhythm));
    actions.appendChild(captureButton('Back to rhythm', 'リズムに<ruby>戻<rt>もど</rt></ruby>る', 'muenba-rhythm-help-close', closeRhythmHelp));
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-rhythm-practice');
  }

  function renderRhythmCapture() {
    if (!captureSession || !captureSession.rhythm || !captureOverlay) return;
    captureOverlay.dataset.surface = 'rhythm';
    captureOverlay.classList.add('muenba-rhythm-mode');
    const rhythm = captureSession.rhythm;
    const ghost = captureSession.ghost;
    const practice = !!captureSession.practice;
    const danger = !!captureSession.danger && !practice;
    setDangerOverlay(danger);
    const box = captureBox();
    box.classList.add('muenba-rhythm-halloween-box');
    if (danger) box.classList.add('muenba-danger-box');
    captureImage(box, ghost, danger ? ANGRY_CHANGE_IMG : ghost.img);

    const helpButton = document.createElement('button');
    helpButton.type = 'button';
    helpButton.className = 'muenba-rhythm-help-button';
    helpButton.textContent = '?';
    helpButton.setAttribute('aria-label', 'Open rhythm instructions');
    helpButton.title = 'How to play';
    helpButton.addEventListener('click', openRhythmHelp);
    box.appendChild(helpButton);

    const h2 = document.createElement('h2');
    h2.textContent = practice ? 'Practice rhythm' : (danger ? 'Danger rhythm' : 'Keep the rhythm');
    box.appendChild(h2);
    const jp = document.createElement('p');
    jp.className = 'jp';
    jp.textContent = practice ? 'リズムの練習' : (danger ? '危険なリズム' : 'リズムでつかまえよう');
    box.appendChild(jp);

    if (!practice && Number.isInteger(rhythm.difficultyTier)) {
      const tier = document.createElement('p');
      tier.className = 'muenba-rhythm-tier';
      tier.textContent = `Haunting level ${rhythm.difficultyTier + 1} · ${rhythm.difficultyLabel}`;
      box.appendChild(tier);
    }

    if (!practice && !danger && rhythm.readingPenaltyCount > 0) {
      renderCaseDirection(
        box,
        `The ghost is stronger. Capture target: ${rhythm.passAccuracy}% accuracy.`,
        `ゴーストが<ruby>強<rt>つよ</rt></ruby>くなりました。<ruby>捕獲<rt>ほかく</rt></ruby>には${rhythm.passAccuracy}%の<ruby>正確<rt>せいかく</rt></ruby>さが<ruby>必要<rt>ひつよう</rt></ruby>です。`,
        'muenba-rhythm-penalty'
      );
    }

    const status = document.createElement('p');
    status.className = 'muenba-rhythm-status';
    status.textContent = 'Get ready…';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('role', 'status');
    box.appendChild(status);
    rhythm.statusEl = status;

    const accuracy = document.createElement('p');
    accuracy.className = 'muenba-rhythm-accuracy';
    accuracy.textContent = 'Accuracy: 0%';
    box.appendChild(accuracy);
    rhythm.accuracyEl = accuracy;

    const combo = document.createElement('p');
    combo.className = 'muenba-rhythm-combo';
    combo.textContent = 'Combo: 0';
    combo.setAttribute('aria-live', 'polite');
    box.appendChild(combo);
    rhythm.comboEl = combo;

    const energy = document.createElement('div');
    energy.className = 'muenba-rhythm-energy';
    energy.setAttribute('role', 'progressbar');
    energy.setAttribute('aria-label', 'Ghost energy captured');
    energy.setAttribute('aria-valuemin', '0');
    energy.setAttribute('aria-valuemax', '100');
    energy.setAttribute('aria-valuenow', '0');
    const energyLabel = document.createElement('span');
    energyLabel.className = 'muenba-rhythm-energy-label';
    energyLabel.textContent = 'GHOST ENERGY';
    const energyTrack = document.createElement('span');
    energyTrack.className = 'muenba-rhythm-energy-track';
    const energyFill = document.createElement('span');
    energyFill.className = 'muenba-rhythm-energy-fill';
    energyTrack.appendChild(energyFill);
    energy.append(energyLabel, energyTrack);
    box.appendChild(energy);
    rhythm.energyFillEl = energyFill;
    rhythm.energyEl = energy;

    const board = document.createElement('div');
    board.className = 'muenba-rhythm-board';
    const laneDefs = rhythm.lanes.map(id => RHYTHM_LANE_BY_ID[id]).filter(Boolean);
    board.style.gridTemplateColumns = `repeat(${Math.max(1, laneDefs.length)}, minmax(0, 1fr))`;
    board.setAttribute('aria-label', `${laneDefs.length} lane rhythm capture`);

    const hitLine = document.createElement('div');
    hitLine.className = 'muenba-rhythm-hit-line';
    hitLine.setAttribute('aria-hidden', 'true');
    board.appendChild(hitLine);
    rhythm.boardEl = board;

    laneDefs.forEach(laneDef => {
      const lane = laneDef.id;
      const laneButton = document.createElement('button');
      laneButton.type = 'button';
      laneButton.className = `muenba-rhythm-lane muenba-rhythm-${lane}`;
      laneButton.setAttribute('aria-label', `${laneDef.label} lane (${laneDef.key})`);

      const label = document.createElement('span');
      label.className = 'muenba-rhythm-lane-label';
      label.textContent = `${laneDef.label} · ${laneDef.key}`;
      laneButton.appendChild(label);

      const rail = document.createElement('span');
      rail.className = 'muenba-rhythm-rail';
      laneButton.appendChild(rail);

      laneButton.addEventListener('pointerdown', event => {
        event.preventDefault();
        handleRhythmInput(lane);
      });
      laneButton.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleRhythmInput(lane);
        }
      });

      rhythm.chart.forEach((noteData, index) => {
        if (noteData.lane !== lane) return;
        const note = document.createElement('span');
        note.className = `muenba-rhythm-note muenba-rhythm-note-${lane} muenba-rhythm-note-${noteData.shape}`;
        if (noteData.decoy) note.classList.add('muenba-rhythm-note-decoy');
        note.textContent = rhythmNoteGlyph(noteData);
        note.setAttribute('aria-hidden', 'true');
        rail.appendChild(note);
        rhythm.noteEls[index] = note;
      });

      board.appendChild(laneButton);
    });

    box.appendChild(board);

    renderCaseDirection(
      box,
      `Tap a lane when its note reaches the orange line. Use ${laneDefs.map(lane => `${lane.label.split(' / ')[0]} ${lane.key}`).join(', ')}.`,
      `<ruby>音符<rt>おんぷ</rt></ruby>がオレンジの<ruby>線<rt>せん</rt></ruby>に<ruby>来<rt>き</rt></ruby>たら、レーンを<ruby>押<rt>お</rt></ruby>します。${laneDefs.map(lane => `${lane.label.split(' / ')[1] || lane.label}は${lane.key}`).join('、')}です。`
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    if (danger) {
      if (captureSession.dangerCanHide === true) {
        actions.appendChild(captureButton('Hide and escape', '<ruby>隠<rt>かく</rt></ruby>れて<ruby>逃<rt>に</rt></ruby>げる', 'muenba-danger-hide', escapeDangerToHide));
      }
    } else {
      actions.appendChild(captureButton('Cancel capture', '<ruby>捕獲<rt>ほか</rt></ruby>をやめる', 'muenba-capture-cancel', cancelCaptureSession));
    }
    box.appendChild(actions);

    captureOverlay.classList.add('open');
    focusCaptureControl('.muenba-rhythm-lane');
  }

  function tickRhythmCapture(now) {
    if (!captureSession || !captureSession.rhythm) return;
    const rhythm = captureSession.rhythm;
    if (captureSession.phase !== 'countdown' && captureSession.phase !== 'playing') return;

    if (captureSession.phase === 'countdown') {
      const remaining = rhythm.startAt - now;
      if (remaining <= 0) {
        captureSession.phase = 'playing';
        showRhythmFeedback('GO!', 'go');
      } else if (rhythm.statusEl) {
        rhythm.statusEl.textContent = String(Math.max(1, Math.ceil(remaining / 600)));
      }
    }

    if (captureSession.phase === 'playing') {
      advanceMissedRhythmNotes(now);
      updateRhythmNotes(now);
      if (rhythm.nextIndex >= rhythm.chart.length &&
          now >= rhythmExpectedAt(rhythm, rhythm.chart.length - 1) + rhythm.goodMs) {
        finishRhythmCapture();
        return;
      }
    }

    rhythm.rafId = window.requestAnimationFrame(tickRhythmCapture);
  }

  function advanceMissedRhythmNotes(now) {
    const rhythm = captureSession.rhythm;
    while (rhythm.nextIndex < rhythm.chart.length &&
           now > rhythmExpectedAt(rhythm, rhythm.nextIndex) + rhythm.goodMs) {
      markRhythmNote(rhythm.chart[rhythm.nextIndex]?.decoy ? 'avoid' : 'miss');
    }
  }

  function updateRhythmNotes(now) {
    const rhythm = captureSession.rhythm;
    rhythm.chart.forEach((_, index) => {
      const note = rhythm.noteEls[index];
      if (!note) return;
      if (rhythm.resolvedIndices.has(index) || index < rhythm.nextIndex) {
        note.classList.add('is-resolved');
        return;
      }
      const progress = (now - (rhythmExpectedAt(rhythm, index) - rhythm.travelMs)) / rhythm.travelMs;
      const y = Math.max(-26, Math.min(RHYTHM_NOTE_DISTANCE, progress * RHYTHM_NOTE_DISTANCE));
      note.style.transform = `translate(-50%, ${y}px)`;
    });
  }

  function playRhythmSfx(result) {
    const pool = result === 'miss' ? rhythmMissSfxPool : rhythmHitSfxPool;
    const index = result === 'miss'
      ? rhythmMissSfxIndex++ % pool.length
      : rhythmHitSfxIndex++ % pool.length;
    const sound = pool[index];
    try {
      sound.pause();
      sound.currentTime = 0;
      sound.play().catch(() => {});
    } catch (_) {}
  }

  function markRhythmNote(result, index = captureSession.rhythm.nextIndex) {
    const rhythm = captureSession.rhythm;
    if (rhythm.resolvedIndices.has(index)) return;
    const note = rhythm.noteEls[index];
    if (note) {
      note.classList.add(result === 'miss' ? 'is-miss' : result === 'avoid' ? 'is-avoided' : 'is-hit');
      if (result === 'avoid') note.classList.add('is-resolved');
    }
    rhythm.resolvedIndices.add(index);
    if (result === 'perfect') rhythm.perfect += 1;
    else if (result === 'good') rhythm.good += 1;
    else if (result === 'avoid') rhythm.avoided += 1;
    else rhythm.miss += 1;
    if (result === 'perfect' || result === 'good') {
      rhythm.combo += 1;
      rhythm.bestCombo = Math.max(rhythm.bestCombo, rhythm.combo);
    } else if (result === 'miss') {
      rhythm.combo = 0;
    }
    while (rhythm.nextIndex < rhythm.chart.length && rhythm.resolvedIndices.has(rhythm.nextIndex)) {
      rhythm.nextIndex += 1;
    }
    if (rhythm.accuracyEl) rhythm.accuracyEl.textContent = `Accuracy: ${rhythmAccuracy(rhythm)}%`;
    if (rhythm.comboEl) {
      rhythm.comboEl.textContent = rhythm.combo >= 2 ? `${rhythm.combo} COMBO` : 'Combo: 0';
      rhythm.comboEl.classList.toggle('is-hot', rhythm.combo >= 3);
    }
    if (rhythm.energyFillEl) {
      const targetTotal = rhythm.chart.filter(noteData => !noteData.decoy).length || 1;
      const energyPercent = Math.round(((rhythm.perfect + rhythm.good) / targetTotal) * 100);
      rhythm.energyFillEl.style.width = `${Math.min(100, energyPercent)}%`;
      rhythm.energyEl?.setAttribute('aria-valuenow', String(Math.min(100, energyPercent)));
    }
    if (result !== 'avoid') playRhythmSfx(result);
    pulseRhythmBoard(result);
  }

  function pulseRhythmBoard(kind) {
    const rhythm = captureSession && captureSession.rhythm;
    const board = rhythm && rhythm.boardEl;
    if (!board) return;
    board.classList.remove('is-perfect', 'is-good', 'is-miss', 'is-avoid');
    void board.offsetWidth;
    board.classList.add(`is-${kind}`);
  }

  function showRhythmFeedback(text, kind) {
    const rhythm = captureSession && captureSession.rhythm;
    if (!rhythm || !rhythm.statusEl) return;
    const comboText = (kind === 'perfect' || kind === 'good') && rhythm.combo >= 2
      ? ` · ${rhythm.combo} COMBO`
      : '';
    rhythm.statusEl.textContent = `${text}${comboText}`;
    rhythm.statusEl.className = `muenba-rhythm-status ${kind || ''}`;
  }

  function handleRhythmInput(lane) {
    if (!captureSession || !captureSession.rhythm || captureSession.phase !== 'playing') return;
    const rhythm = captureSession.rhythm;
    const now = performance.now();
    advanceMissedRhythmNotes(now);
    if (rhythm.nextIndex >= rhythm.chart.length) return;

    const index = rhythm.nextIndex;
    const current = rhythm.chart[index];
    const beat = current?.beat;
    let groupEnd = index + 1;
    while (groupEnd < rhythm.chart.length && rhythm.chart[groupEnd]?.beat === beat) groupEnd += 1;
    let candidateIndex = -1;
    for (let i = index; i < groupEnd; i += 1) {
      const note = rhythm.chart[i];
      if (!note.decoy && note.lane === lane && !rhythm.resolvedIndices.has(i)) {
        candidateIndex = i;
        break;
      }
    }
    if (candidateIndex < 0) {
      markRhythmNote('miss', index);
      showRhythmFeedback(current?.decoy && current.lane === lane ? 'Fake note!' : 'Wrong lane', 'miss');
      return;
    }

    const expected = rhythmExpectedAt(rhythm, candidateIndex);
    const delta = now - expected;
    if (delta < -rhythm.goodMs) {
      showRhythmFeedback('A little later…', 'early');
      return;
    }
    const absoluteDelta = Math.abs(delta);
    if (absoluteDelta <= rhythm.perfectMs) {
      markRhythmNote('perfect', candidateIndex);
      showRhythmFeedback('Perfect!', 'perfect');
    } else if (absoluteDelta <= rhythm.goodMs) {
      markRhythmNote('good', candidateIndex);
      showRhythmFeedback('Good!', 'good');
    } else {
      markRhythmNote('miss', candidateIndex);
      showRhythmFeedback(delta < 0 ? 'Too early' : 'Too late', 'miss');
    }
  }

  function recordRhythmResult(accuracy) {
    try {
      const d = loadSave();
      if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
      if (!d.muenba.rhythm || typeof d.muenba.rhythm !== 'object') {
        d.muenba.rhythm = { bestAccuracy: 0, attempts: 0, capturesCompleted: 0 };
      }
      const rhythm = d.muenba.rhythm;
      rhythm.attempts = (Number.isInteger(rhythm.attempts) ? rhythm.attempts : 0) + 1;
      rhythm.bestAccuracy = Math.max(Number(rhythm.bestAccuracy) || 0, accuracy);
      writeSave(d);
    } catch (_) {}
  }

  function loseCarriedEnergyAndMarkRestart() {
    if (!captureSession || captureSession.carryingEnergy !== true) return false;
    const d = loadSave();
    if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
    const mu = d.muenba;
    const lost = Math.max(0, Number(mu.orbsPending) || 0);
    mu.orbsPending = 0;
    if (!writeSave(d)) return false;
    captureSession.carriedEnergyLost = true;
    captureSession.lostOrbCount = lost;
    setReturnToNuppiPending(false);
    dismissDangerGhost();
    return true;
  }

  function restartHuntAfterCarriedEnergyLoss() {
    if (!captureSession || captureSession.carriedEnergyLost !== true) return;
    stopRhythmCapture();
    stopDangerScream();
    stopDangerRhythmMusic();
    captureOpen = false;
    state.captureResolving = false;
    state.hiding = false;
    state.clickTarget = null;
    state.moving = false;
    setDangerOverlay(false);
    if (captureOverlay) captureOverlay.classList.remove('open');
    captureSession = null;
    if (hideBtn) {
      hideBtn.classList.remove('active');
      setHideButtonLabel(false);
    }
    requestMuenbaLandscapeAfterPopup();
    spawnRoomGhost(state.roomId);
    resumeWorldMusicAfterCapture();
  }

  function finishRhythmCapture() {
    if (!captureSession || !captureSession.rhythm) return;
    const rhythm = captureSession.rhythm;
    if (rhythm.rafId) window.cancelAnimationFrame(rhythm.rafId);
    rhythm.rafId = 0;
    const accuracy = rhythmAccuracy(rhythm);
    const success = accuracy >= rhythm.passAccuracy;
    if (captureSession.danger) {
      stopDangerScream();
      stopDangerRhythmMusic();
    }
    rhythm.accuracy = accuracy;
    rhythm.success = success;
    if (captureSession.practice) {
      captureSession.phase = 'practice-result';
      renderPracticeResult(accuracy, success);
      return;
    }
    recordRhythmResult(accuracy);

    // Pass 14: a danger encounter is against whichever hostile ghost caught
    // Booha, never the actual hunt target — beginDangerEncounter() never
    // sets caseData, so this was never a real capture. Winning it should
    // just send that ghost away; previously a danger win fell straight
    // through to the same commitSuccessfulCapture()/renderCaptureReward()
    // path as a genuine target capture below, wrongly marking whichever
    // wrong ghost caught you as found/weekly-found and handing out orbs
    // for a ghost that was never legitimately hunted.
    if (captureSession.danger) {
      captureSession.phase = 'result';
      if (!success && captureSession.carryingEnergy === true) {
        loseCarriedEnergyAndMarkRestart();
      }
      if (success) dismissDangerGhost();
      renderRhythmResult(accuracy, success);
      return;
    }

    if (!success) {
      captureSession.phase = 'result';
      renderRhythmResult(accuracy, false);
      return;
    }

    const rewardCount = commitSuccessfulCapture();
    if (rewardCount == null) {
      captureSession.phase = 'result';
      renderRhythmResult(accuracy, false, 'The rhythm was good, but the capture could not be saved. Please try again.');
      return;
    }

    // A legacy or malformed save should never create a fake "return to Nuppi"
    // step with 0 / 0 orbs. The normal case-mode path now always rewards an
    // unfinished memory lane, but this guard keeps older saves readable.
    if (rewardCount <= 0) {
      captureSession.phase = 'result';
      captureSession.noNewEnergy = true;
      renderRhythmResult(accuracy, true, 'The hunt is complete, but there is no new energy to return this week.');
      return;
    }

    captureSession.phase = 'reward';
    captureSession.reward = {
      total: rewardCount,
      revealed: 0,
      revealTimer: 0,
      orbListEl: null,
      statusEl: null,
      actionsEl: null,
      returnAfter: 'hunt'
    };
    renderCaptureReward();
    releaseNextOrb();
  }

  function renderPracticeResult(accuracy, success) {
    if (!captureSession || !captureOverlay) return;
    setDangerOverlay(false);
    const box = captureBox();
    box.classList.add('muenba-rhythm-halloween-box');
    box.classList.add('muenba-rhythm-help-box');

    const h2 = document.createElement('h2');
    h2.textContent = success ? 'Practice complete' : 'Keep practicing';
    box.appendChild(h2);
    const jp = document.createElement('p');
    jp.className = 'jp';
    jp.innerHTML = success
      ? '<ruby>練習<rt>れんしゅう</rt></ruby>できました'
      : 'もう<ruby>一度<rt>いちど</rt></ruby><ruby>練習<rt>れんしゅう</rt></ruby>しよう';
    box.appendChild(jp);

    const p = document.createElement('p');
    p.textContent = `Practice accuracy: ${accuracy}%. Your hunt progress did not change.`;
    box.appendChild(p);
    renderCaseDirection(
      box,
      'Try the easy chart again, or return to the ghost rhythm.',
      'やさしいリズムをもう<ruby>一度<rt>いちど</rt></ruby><ruby>試<rt>ため</rt></ruby>すか、ゴーストのリズムに<ruby>戻<rt>もど</rt></ruby>りましょう。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    actions.appendChild(captureButton('Practice again', 'もう<ruby>一度<rt>いちど</rt></ruby><ruby>練習<rt>れんしゅう</rt></ruby>する', 'muenba-rhythm-practice-again', startPracticeRhythm));
    actions.appendChild(captureButton('Return to rhythm', 'リズムに<ruby>戻<rt>もど</rt></ruby>る', 'muenba-rhythm-practice-return', returnFromPractice));
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-rhythm-practice-again');
  }

  function commitSuccessfulCapture() {
    if (!captureSession || !captureSession.ghost) return null;
    if (captureSession.rewardCommitted) return captureSession.rewardCount || 0;

    const ghost = captureSession.ghost;
    const d = loadSave();
    if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
    const mu = d.muenba;
    if (!mu.ghostsFound || typeof mu.ghostsFound !== 'object') mu.ghostsFound = {};
    if (!mu.weeklyGhostsFound || typeof mu.weeklyGhostsFound !== 'object') mu.weeklyGhostsFound = {};
    if (!Number.isInteger(mu.orbsPending)) mu.orbsPending = 0;
    if (!mu.huntJournal || !Array.isArray(mu.huntJournal.entries)) mu.huntJournal = { entries: [] };
    if (!mu.caseRecords || typeof mu.caseRecords !== 'object') mu.caseRecords = {};
    if (!mu.rhythm || typeof mu.rhythm !== 'object') mu.rhythm = { bestAccuracy: 0, attempts: 0 };
    if (!Number.isInteger(mu.rhythm.capturesCompleted) || mu.rhythm.capturesCompleted < 0) mu.rhythm.capturesCompleted = 0;
    if (!Number.isInteger(mu.caseRecordsSettled) || mu.caseRecordsSettled < 0) mu.caseRecordsSettled = 0;

    const isNewWeeklyCapture = !mu.weeklyGhostsFound[ghost.id];
    mu.ghostsFound[ghost.id] = true;
    mu.weeklyGhostsFound[ghost.id] = true;
    let journalEntry = mu.huntJournal.entries.find(entry => entry && entry.ghostId === ghost.id);
    if (!journalEntry) {
      journalEntry = { ghostId: ghost.id, capturedAt: Date.now() };
      mu.huntJournal.entries.push(journalEntry);
    }

    const caseData = captureSession.caseData;
    const caseMode = caseData && captureSession.caseResolved && captureSession.caseDifficulty
      ? (MUENBA_CASE_MODES.includes(captureSession.caseDifficulty) ? captureSession.caseDifficulty : 'start')
      : null;
    const previousRecord = caseData && mu.caseRecords[caseData.id] && typeof mu.caseRecords[caseData.id] === 'object'
      ? mu.caseRecords[caseData.id]
      : {};
    const caseModeAlreadyComplete = !!(caseMode && (
      previousRecord.completedModes?.[caseMode] === true
      || (previousRecord.completed === true && previousRecord.difficulty === caseMode)
    ));

    if (caseData && caseMode) {
      const completedAt = Date.now();
      const completedModes = previousRecord.completedModes && typeof previousRecord.completedModes === 'object' && !Array.isArray(previousRecord.completedModes)
        ? { ...previousRecord.completedModes }
        : (previousRecord.completed === true && MUENBA_CASE_MODES.includes(previousRecord.difficulty)
          ? { [previousRecord.difficulty]: true }
          : {});
      completedModes[caseMode] = true;
      const allModesComplete = MUENBA_CASE_MODES.every(memoryMode => completedModes[memoryMode] === true);
      mu.caseRecords[caseData.id] = {
        completed: allModesComplete,
        completedModes,
        ghostId: caseData.ghostId,
        difficulty: caseMode,
        completedAt
      };
      if (!mu.caseProgress || typeof mu.caseProgress !== 'object') {
        mu.caseProgress = { completedCaseIds: [], activeCaseId: null };
      }
      if (!Array.isArray(mu.caseProgress.completedCaseIds)) mu.caseProgress.completedCaseIds = [];
      if (allModesComplete) {
        if (!mu.caseProgress.completedCaseIds.includes(caseData.id)) mu.caseProgress.completedCaseIds.push(caseData.id);
      } else {
        mu.caseProgress.completedCaseIds = mu.caseProgress.completedCaseIds.filter(caseId => caseId !== caseData.id);
      }
      mu.caseProgress.activeCaseId = null;
      journalEntry.caseId = caseData.id;
      journalEntry.caseDifficulty = captureSession.caseDifficulty;
      journalEntry.caseCompletedAt = completedAt;
      // Pass 13: the profile page's "Case records" stat is a plain running
      // total of settle events, same spirit as rhythm.capturesCompleted
      // below — it only bumps here, once per genuinely new case+tier
      // completion (the sequential hunt design means this case wasn't
      // presented as active again once a given tier was already done, so
      // there's no risk of double-counting the same tier twice).
      mu.caseRecordsSettled += 1;
    }
    // This counter is deliberately permanent. Weekly ghost availability may
    // reset, but every successful capture makes future rhythm charts harder.
    mu.rhythm.capturesCompleted += 1;
    // A case can legitimately return in another memory lane during the same
    // week. That is a new energy hunt even though weeklyGhostsFound already
    // contains the ghost id. Reward each unfinished case mode once, while
    // preserving the ordinary weekly reward for non-case ghost captures.
    const rewardCount = caseMode && !caseModeAlreadyComplete
      ? ORB_REWARD_PER_CAPTURE
      : (isNewWeeklyCapture ? ORB_REWARD_PER_CAPTURE : 0);
    mu.orbsPending += rewardCount;
    if (!writeSave(d)) return null;

    captureSession.rewardCommitted = true;
    captureSession.rewardCount = rewardCount;
    try {
      if (window.BoohaUnlockSystem && typeof BoohaUnlockSystem.checkAll === 'function') BoohaUnlockSystem.checkAll();
    } catch (_) {}
    return rewardCount;
  }

  function renderRhythmResult(accuracy, success, message) {
    if (captureOverlay) {
      captureOverlay.dataset.surface = 'rhythm';
      captureOverlay.classList.add('muenba-rhythm-mode');
    }
    const ghost = captureSession.ghost;
    const p = document.createElement('p');
    const danger = !!captureSession.danger;
    const carriedEnergyLost = danger && captureSession.carriedEnergyLost === true;
    const noNewEnergy = !danger && captureSession.noNewEnergy === true;
    setDangerOverlay(danger);
    const box = captureBox();
    box.classList.add('muenba-rhythm-halloween-box');
    box.classList.add(success ? 'muenba-rhythm-result-success' : 'muenba-rhythm-result-failure');
    box.classList.add('muenba-capture-result');
    if (danger) box.classList.add('muenba-danger-box');
    captureImage(box, ghost, danger ? ANGRY_CHANGE_IMG : ghost.img);

    const h2 = document.createElement('h2');
    h2.textContent = carriedEnergyLost
      ? 'The orbs are lost'
      : noNewEnergy
      ? 'Hunt complete'
      : danger
      ? (success ? 'The ghost flees' : 'The ghost broke through')
      : (success ? 'Rhythm complete' : 'Try again');
    box.appendChild(h2);
    const jp = document.createElement('p');
    jp.className = 'jp';
    jp.textContent = carriedEnergyLost
      ? 'オーブを<ruby>失<rt>うしな</rt></ruby>った'
      : noNewEnergy
      ? '探索完了'
      : danger
      ? (success ? '幽霊は逃げた' : 'まだ危険')
      : (success ? 'リズム成功' : 'もう一度');
    box.appendChild(jp);

    // Pass 14: a danger win calms and sends away whichever hostile ghost
    // caught Booha — it was never his hunt target, so this never leads to
    // a capture reward (see finishRhythmCapture()/dismissDangerGhost()).
    const dangerCanHide = danger && captureSession.dangerCanHide === true;
    p.textContent = message || (carriedEnergyLost
      ? 'The angry ghosts took the energy orbs. Your hunt starts again.'
      : noNewEnergy
      ? 'The energy for this hunt is already safe.'
      : danger
      ? `Accuracy: ${accuracy}%. ${success ? 'The angry ghost lost its nerve and slipped away. It will not bother you again for now.' : dangerCanHide ? 'The angry ghost knocked Booha back. Hide, try again, or give up and retreat to Nuppi.' : 'The angry ghost knocked Booha back. Try the danger rhythm again, or give up and retreat to Nuppi.'}`
      : `Accuracy: ${accuracy}%. ${success ? 'The capture is ready for the reward step.' : 'The ghost is still waiting for you.'}`);
    box.appendChild(p);

    if (captureSession.rhythm && captureSession.rhythm.bestCombo >= 2) {
      const combo = document.createElement('p');
      combo.className = 'muenba-rhythm-combo is-hot';
      combo.textContent = `Best combo: ${captureSession.rhythm.bestCombo}`;
      box.appendChild(combo);
    }

    renderCaseDirection(
      box,
      carriedEnergyLost
        ? 'The orbs are gone. Start the hunt again and find the next ghost.'
        : noNewEnergy
        ? 'The ghost is gone for now. Continue exploring.'
        : danger
        ? (success ? 'The ghost is gone for now. Continue exploring.' : dangerCanHide ? 'Hide, try the danger rhythm again, or give up and retreat to Nuppi.' : 'Try the danger rhythm again, or give up and retreat to Nuppi.')
        : (success ? 'The capture is ready for the reward step.' : 'The ghost is still waiting. Try the rhythm again.'),
      carriedEnergyLost
        ? '<ruby>オーブ</ruby>はなくなりました。もう<ruby>一度<rt>いちど</rt></ruby><ruby>探索<rt>たんさく</rt></ruby>を<ruby>始<rt>はじ</rt></ruby>めて、<ruby>次<rt>つぎ</rt></ruby>の<ruby>幽霊<rt>ゆうれい</rt></ruby>を<ruby>見<rt>み</rt></ruby>つけましょう。'
        : noNewEnergy
        ? 'エネルギーはもう<ruby>安全<rt>あんぜん</rt></ruby>です。<ruby>探索<rt>たんさく</rt></ruby>を<ruby>続<rt>つづ</rt></ruby>けましょう。'
        : danger
        ? (success
          ? '<ruby>幽霊<rt>ゆうれい</rt></ruby>はいなくなりました。<ruby>探索<rt>たんさく</rt></ruby>を<ruby>続<rt>つづ</rt></ruby>けましょう。'
          : dangerCanHide
            ? '<ruby>隠<rt>かく</rt></ruby>れる、もう<ruby>一度<rt>いちど</rt></ruby><ruby>挑<rt>いど</rt></ruby>む、またはあきらめてヌーピーのところへ<ruby>戻<rt>もど</rt></ruby>ることができます。'
            : 'もう<ruby>一度<rt>いちど</rt></ruby><ruby>危険<rt>きけん</rt></ruby>なリズムに<ruby>挑<rt>いど</rt></ruby>むか、あきらめてヌーピーのところへ<ruby>戻<rt>もど</rt></ruby>りましょう。')
        : (success
          ? '<ruby>捕<rt>つか</rt></ruby>まえる<ruby>準備<rt>じゅんび</rt></ruby>ができました。<ruby>次<rt>つぎ</rt></ruby>に<ruby>報酬<rt>ほうしゅう</rt></ruby>を<ruby>受<rt>う</rt></ruby>け<ruby>取<rt>と</rt></ruby>りましょう。'
          : '<ruby>幽霊<rt>ゆうれい</rt></ruby>はまだ<ruby>待<rt>ま</rt></ruby>っています。リズムをもう<ruby>一度<rt>いちど</rt></ruby><ruby>試<rt>ため</rt></ruby>しましょう。')
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    if (danger) {
      if (carriedEnergyLost) {
        actions.appendChild(captureButton('Start hunt again', '<ruby>探索<rt>たんさく</rt></ruby>をもう<ruby>一度<rt>いちど</rt></ruby>', 'muenba-danger-restart', restartHuntAfterCarriedEnergyLoss));
      } else if (success) {
        actions.appendChild(captureButton('Continue exploring', '<ruby>探索<rt>たんさく</rt></ruby>を<ruby>続<rt>つづ</rt></ruby>ける', 'muenba-danger-continue', closeDangerEncounter));
      } else {
        actions.appendChild(captureButton('Try danger rhythm again', 'もう<ruby>一度<rt>いちど</rt></ruby><ruby>危険<rt>きけん</rt></ruby>なリズムに<ruby>挑<rt>いど</rt></ruby>む', 'muenba-danger-retry', retryDangerRhythm));
        if (dangerCanHide) {
          actions.appendChild(captureButton('Hide and escape', '<ruby>隠<rt>かく</rt></ruby>れて<ruby>逃<rt>に</rt></ruby>げる', 'muenba-danger-hide', escapeDangerToHide));
        }
        actions.appendChild(captureButton('Give up and retreat', 'あきらめて<ruby>戻<rt>もど</rt></ruby>る', 'muenba-danger-giveup', giveUpDangerEncounter));
      }
    } else {
      if (!success && !noNewEnergy) actions.appendChild(captureButton('Try rhythm again', 'もう<ruby>一度<rt>いちど</rt></ruby>リズムに<ruby>挑<rt>いど</rt></ruby>む', 'muenba-capture-retry', retryRhythmCapture));
      actions.appendChild(captureButton('Return to hunt', '<ruby>探索<rt>たんさく</rt></ruby>に<ruby>戻<rt>もど</rt></ruby>る', 'muenba-capture-cancel', cancelCaptureSession));
    }
    box.appendChild(actions);
  }

  function retryRhythmCapture() {
    if (!captureSession || captureSession.phase !== 'result') return;
    stopRhythmCapture();
    captureSession.phase = 'ready';
    captureSession.rhythm = null;
    renderCaptureReady();
  }

  function retryDangerRhythm() {
    if (!captureSession || !captureSession.danger || captureSession.phase !== 'result') return;
    stopRhythmCapture();
    captureSession.phase = 'danger-ready';
    captureSession.rhythm = null;
    startDangerScream();
    renderDangerReady();
  }

  function renderCaptureReward() {
    if (!captureSession || !captureSession.reward || !captureOverlay) return;
    setDangerOverlay(false);
    const ghost = captureSession.ghost;
    const reward = captureSession.reward;
    const box = captureBox();
    box.classList.add('muenba-capture-reward');
    captureImage(box, ghost);

    const phase = document.createElement('div');
    phase.className = 'muenba-capture-phase-label';
    phase.textContent = 'HUNT';
    box.appendChild(phase);
    const h2 = document.createElement('h2');
    h2.textContent = 'Captured!';
    box.appendChild(h2);
    const h2Jp = document.createElement('p');
    h2Jp.className = 'jp';
    h2Jp.innerHTML = '<ruby>捕獲<rt>ほかく</rt></ruby><ruby>成功<rt>せいこう</rt></ruby>！';
    box.appendChild(h2Jp);
    const copy = document.createElement('p');
    copy.textContent = `${ghost.name} is safe now. Energy orbs are coming free one at a time.`;
    box.appendChild(copy);
    const copyJp = document.createElement('p');
    copyJp.className = 'jp-line';
    copyJp.innerHTML = `${ghost.name}はもう<ruby>安全<rt>あんぜん</rt></ruby>。エネルギーオーブが<ruby>一<rt>ひと</rt></ruby>つずつ<ruby>出<rt>で</rt></ruby>てくるよ。`;
    box.appendChild(copyJp);
    renderCaseDirection(
      box,
      `You caught the energy from ${ghost.name}! Return the orbs to Nuppi now.`,
      `${ghost.name}のエネルギーを<ruby>捕<rt>つか</rt></ruby>まえた！<ruby>今<rt>いま</rt></ruby>すぐオーブをヌーピーに<ruby>返<rt>かえ</rt></ruby>そう。`,
      'muenba-capture-direction'
    );

    const orbList = document.createElement('div');
    orbList.className = 'muenba-orb-release-list';
    orbList.setAttribute('aria-label', 'Released energy orbs');
    box.appendChild(orbList);
    reward.orbListEl = orbList;

    const status = document.createElement('p');
    status.className = 'muenba-orb-release-status';
    status.textContent = `Energy released: 0 / ${reward.total}`;
    status.setAttribute('aria-live', 'polite');
    box.appendChild(status);
    reward.statusEl = status;

    renderCaseDirection(
      box,
      'Be careful! All the ghosts are angry now!',
      '<ruby>気<rt>き</rt></ruby>をつけて！<ruby>今<rt>いま</rt></ruby>、すべての<ruby>幽霊<rt>ゆうれい</rt></ruby>が<ruby>怒<rt>おこ</rt></ruby>っているよ！',
      'muenba-energy-warning'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    box.appendChild(actions);
    reward.actionsEl = actions;
  }

  function setReturnToNuppiPending(pending) {
    const next = !!pending;
    const changed = state.returnToNuppiPending !== next;
    state.returnToNuppiPending = next;
    if (returnNuppiHint) returnNuppiHint.classList.toggle('open', state.returnToNuppiPending);
    if (changed) invalidateGhostRoomMap();
  }

  function leaveCaptureForNuppi() {
    if (!captureSession || !['reward', 'nuppi-recovery'].includes(captureSession.phase)) return;
    closeCaptureOverlay({ resumeHunt: true });
    setReturnToNuppiPending(true);
  }

  function releaseNextOrb() {
    if (!captureSession || captureSession.phase !== 'reward' || !captureSession.reward) return;
    const reward = captureSession.reward;
    if (reward.revealed >= reward.total) {
      if (reward.statusEl) reward.statusEl.textContent = `Energy released: ${reward.total} / ${reward.total}`;
      if (reward.actionsEl && !reward.actionsEl.children.length) {
        reward.actionsEl.appendChild(captureButton('Return to Nuppi', 'ヌーピーのところへ<ruby>戻<rt>もど</rt></ruby>る', 'muenba-capture-return', leaveCaptureForNuppi));
        focusCaptureControl('#muenba-capture-return');
      }
      return;
    }

    const orb = document.createElement('span');
    orb.className = 'muenba-orb-release';
    orb.textContent = '✦';
    orb.setAttribute('aria-label', `Energy orb ${reward.revealed + 1}`);
    reward.orbListEl.appendChild(orb);
    reward.revealed += 1;
    if (reward.statusEl) reward.statusEl.textContent = `Energy released: ${reward.revealed} / ${reward.total}`;
    reward.revealTimer = window.setTimeout(releaseNextOrb, 520);
  }

  function depositOrbsAtNuppi() {
    if (state.roomId !== MUENBA_NUPPI.roomId || !lobbyOpen || state.handoffResolving) return false;
    const d = loadSave();
    if (!d.muenba || typeof d.muenba !== 'object') d.muenba = {};
    const mu = d.muenba;
    const pending = Number.isInteger(mu.orbsPending) ? mu.orbsPending : 0;
    if (pending <= 0) {
      renderRoomNuppiPopup();
      return false;
    }
    state.handoffResolving = true;
    const collected = Number.isInteger(mu.orbsCollected) ? mu.orbsCollected : 0;
    mu.orbsCollected = collected + pending;
    mu.orbsPending = 0;
    if (!writeSave(d)) {
      state.handoffResolving = false;
      return false;
    }

    setReturnToNuppiPending(false);
    lobbyOpen = false;
    if (lobbyOverlay) {
      lobbyOverlay.classList.remove('open');
      lobbyOverlay.setAttribute('aria-hidden', 'true');
    }
    requestMuenbaLandscapeAfterPopup();
    startMuenbaCelebration(pending);
    return true;
  }

  let muenbaDanceSparkles = [];
  let boohaTrail = [];
  let lastBoohaTrailAt = 0;

  function spawnMuenbaDanceSparkle(originX, originY) {
    const colors = ['#ffd700', '#ffe066', '#fff0a0', '#c8960a', '#ffffff', '#fffde0'];
    const angle = Math.random() * Math.PI * 2;
    const radius = 12 + Math.random() * 32;
    muenbaDanceSparkles.push({
      x: originX + Math.cos(angle) * radius,
      y: originY + Math.sin(angle) * radius,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(0.2 + Math.random() * 0.4),
      life: 1,
      size: 0.8 + Math.random() * 1.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2
    });
  }

  function addBoohaTrailParticle(originX, originY, now) {
    if (REDUCED_MOTION || now - lastBoohaTrailAt < 58) return;
    lastBoohaTrailAt = now;
    boohaTrail.push({
      x: originX + (Math.random() - .5) * 13,
      y: originY + BOOHA_R * .46 + (Math.random() - .5) * 10,
      vx: (Math.random() - .5) * .28,
      vy: -(0.08 + Math.random() * .22),
      life: 1,
      size: 1.1 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2
    });
    if (boohaTrail.length > 18) boohaTrail.shift();
  }

  function getBoohaTrailSprite() {
    if (boohaTrailSprite) return boohaTrailSprite;
    const sprite = document.createElement('canvas');
    sprite.width = 28;
    sprite.height = 28;
    const spriteCtx = sprite.getContext('2d');
    const glow = spriteCtx.createRadialGradient(14, 14, 0, 14, 14, 14);
    glow.addColorStop(0, 'rgba(255,253,220,.98)');
    glow.addColorStop(.16, 'rgba(255,225,112,.92)');
    glow.addColorStop(.48, 'rgba(255,183,45,.34)');
    glow.addColorStop(1, 'rgba(255,151,20,0)');
    spriteCtx.fillStyle = glow;
    spriteCtx.beginPath();
    spriteCtx.arc(14, 14, 14, 0, Math.PI * 2);
    spriteCtx.fill();
    boohaTrailSprite = sprite;
    return sprite;
  }

  function drawBoohaTrail(now) {
    if (!boohaTrail.length) return;
    const sprite = getBoohaTrailSprite();
    actorCtx.save();
    for (let i = boohaTrail.length - 1; i >= 0; i -= 1) {
      const particle = boohaTrail[i];
      particle.life -= .026;
      if (particle.life <= 0) {
        boohaTrail.splice(i, 1);
        continue;
      }
      particle.x += particle.vx;
      particle.y += particle.vy;
      const twinkle = .55 + .45 * Math.sin(now / 120 + particle.phase);
      const radius = particle.size * 3.2;
      actorCtx.globalAlpha = particle.life * twinkle * .72;
      actorCtx.drawImage(sprite, particle.x - radius, particle.y - radius, radius * 2, radius * 2);
    }
    actorCtx.restore();
  }

  function stopMuenbaDance() {
    try { muenbaDance.pause(); muenbaDance.currentTime = 0; } catch (_) {}
  }

  function startMuenbaCelebration(deposited) {
    state.celebrating = true;
    state.celebrateDancing = true;
    state.celebrateSettling = false;
    state.celebrateStart = performance.now();
    state.celebrateSettleStart = 0;
    state.celebrationDeposit = deposited;
    state.celebrationFinishing = false;
    state.inputLocked = true;
    // The handoff dance is a readable reward moment. Re-anchor Booha to the
    // world center before the local dance motion begins, regardless of where
    // he stood when he reached Nuppi.
    state.x = CENTER_X;
    state.y = CENTER_Y;
    state.clickTarget = null;
    state.moving = false;
    state.hiding = false;
    setHideButtonDisabled(true);
    if (hideBtn) hideBtn.classList.remove('active');
    activeGhost = null;
    muenbaDanceSparkles = [];
    MUENBA_DANCE_FRAMES.forEach(frame => ensureMuenbaImage(frame.img));
    if (celebrationStatus) {
      celebrationStatus.innerHTML = 'ENERGY RETURNED<small>エネルギーが戻った</small>';
      celebrationStatus.classList.add('open');
    }
    try { music.pause(); } catch (_) {}
    try {
      muenbaDance.currentTime = 0;
      muenbaDance.play().catch(() => {});
    } catch (_) {}

    const duration = Number.isFinite(muenbaDance.duration) && muenbaDance.duration > 0
      ? Math.max(1200, Math.ceil(muenbaDance.duration * 1000))
      : MUENBA_DANCE_FALLBACK_MS;
    state.celebrationTimer = window.setTimeout(finishMuenbaCelebration, duration);
  }

  function finishMuenbaCelebration() {
    if (!state.celebrating || state.celebrationFinishing) return;
    state.celebrationFinishing = true;
    state.celebrateSettling = true;
    state.celebrateSettleStart = performance.now();
    if (state.celebrationTimer) window.clearTimeout(state.celebrationTimer);
    state.celebrationTimer = 0;
    window.setTimeout(() => {
      if (!state.celebrating) return;
      state.celebrating = false;
      state.celebrateDancing = false;
      state.celebrateSettling = false;
      state.celebrationFinishing = false;
      state.handoffResolving = false;
      muenbaDanceSparkles = [];
      if (celebrationStatus) celebrationStatus.classList.remove('open');
      stopMuenbaDance();
      try { startMusic(); } catch (_) {}
      state.inputLocked = false;
      setHideButtonDisabled(false);
      spawnRoomGhost(state.roomId);
      openNuppiAfterHandoff(state.celebrationDeposit);
    }, MUENBA_DANCE_SETTLE_MS);
  }

  muenbaDance.addEventListener('ended', finishMuenbaCelebration);

  function renderNuppiThanks(deposited) {
    if (!captureSession || !captureOverlay) return;
    const box = captureBox();
    const img = document.createElement('img');
    img.className = 'muenba-lobby-portrait';
    img.src = 'assets/img/wanderers/nuppi-2.webp';
    img.alt = 'Nuppi';
    box.appendChild(img);

    const h2 = document.createElement('h2');
    h2.textContent = 'Nuppi receives the orbs';
    box.appendChild(h2);
    const h2Jp = document.createElement('p');
    h2Jp.className = 'jp';
    h2Jp.innerHTML = 'ヌーピーがオーブを<ruby>受<rt>う</rt></ruby>け<ruby>取<rt>と</rt></ruby>った';
    box.appendChild(h2Jp);

    const p = document.createElement('p');
    p.textContent = deposited > 0
      ? `Nuppi smiles. ${deposited} energy orb${deposited === 1 ? '' : 's'} came safely home.`
      : 'Nuppi smiles. The energy trail is already safe.';
    box.appendChild(p);
    const pJp = document.createElement('p');
    pJp.className = 'jp-line';
    pJp.innerHTML = deposited > 0
      ? 'ヌーピーが<ruby>微笑<rt>ほほえ</rt></ruby>む。エネルギーオーブが<ruby>無事<rt>ぶじ</rt></ruby>に<ruby>届<rt>とど</rt></ruby>いたよ。'
      : 'ヌーピーが<ruby>微笑<rt>ほほえ</rt></ruby>む。エネルギーの<ruby>道<rt>みち</rt></ruby>はもう<ruby>安全<rt>あんぜん</rt></ruby>だよ。';
    box.appendChild(pJp);
    renderCaseDirection(
      box,
      'The energy is safe with Nuppi. Return to the hunt when you are ready.',
      'エネルギーはヌーピーのところで<ruby>安全<rt>あんぜん</rt></ruby>です。<ruby>準備<rt>じゅんび</rt></ruby>ができたら、<ruby>探索<rt>たんさく</rt></ruby>に<ruby>戻<rt>もど</rt></ruby>りましょう。'
    );

    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    const buttonLabel = 'Back to the hunt';
    actions.appendChild(captureButton(buttonLabel, '<ruby>探索<rt>たんさく</rt></ruby>に<ruby>戻<rt>もど</rt></ruby>る', 'muenba-capture-finish', () => {
      closeCaptureOverlay({ resumeHunt: true });
    }));
    box.appendChild(actions);
    focusCaptureControl('#muenba-capture-finish');
  }

  function openPendingOrbRecovery() {
    const pending = readMuenba().orbsPending;
    if (!(pending > 0)) {
      return;
    }
    captureOpen = true;
    state.clickTarget = null;
    state.moving = false;
    captureSession = {
      ghost: null,
      phase: 'nuppi-recovery',
      reward: { total: pending, revealed: pending, returnAfter: 'hunt' }
    };
    renderPendingOrbRecovery(pending);
  }

  function renderPendingOrbRecovery(pending) {
    const box = captureBox();
    const img = document.createElement('img');
    img.className = 'muenba-lobby-portrait';
    img.src = 'assets/img/wanderers/nuppi-2.webp';
    img.alt = 'Nuppi';
    box.appendChild(img);

    const h2 = document.createElement('h2');
    h2.textContent = 'Your orbs are waiting';
    box.appendChild(h2);
    const h2Jp = document.createElement('p');
    h2Jp.className = 'jp';
    h2Jp.innerHTML = 'オーブが<ruby>待<rt>ま</rt></ruby>っているよ';
    box.appendChild(h2Jp);
    const p = document.createElement('p');
    p.textContent = `Nuppi has a safe place for your ${pending} pending energy orb${pending === 1 ? '' : 's'}.`;
    box.appendChild(p);
    const pJp = document.createElement('p');
    pJp.className = 'jp-line';
    pJp.innerHTML = 'ヌーピーが<ruby>待<rt>ま</rt></ruby>っているエネルギーオーブを<ruby>安全<rt>あんぜん</rt></ruby>に<ruby>保管<rt>ほかん</rt></ruby>しているよ。';
    box.appendChild(pJp);
    renderCaseDirection(
      box,
      'Return the waiting orbs to Nuppi before you continue.',
      '<ruby>続<rt>つづ</rt></ruby>ける<ruby>前<rt>まえ</rt></ruby>に、<ruby>待<rt>ま</rt></ruby>っているオーブをヌーピーに<ruby>届<rt>とど</rt></ruby>けましょう。'
    );
    const actions = document.createElement('div');
    actions.className = 'muenba-lobby-actions';
    actions.appendChild(captureButton('Return to Nuppi', 'ヌーピーのところへ<ruby>戻<rt>もど</rt></ruby>る', 'muenba-capture-return', leaveCaptureForNuppi));
    box.appendChild(actions);
    captureOverlay.classList.add('open');
    focusCaptureControl('#muenba-capture-return');
  }

  function cancelCaptureSession() {
    if (!captureOpen) return;
    if (captureSession && captureSession.danger) {
      escapeDangerToHide();
      return;
    }
    const phase = captureSession && captureSession.phase;
    if (phase === 'reward' || phase === 'nuppi' || phase === 'nuppi-recovery') return;
    stopRhythmCapture();
    captureOpen = false;
    state.captureResolving = false;
    setDangerOverlay(false);
    if (captureOverlay) {
      captureOverlay.classList.remove('open');
      captureOverlay.classList.remove('muenba-rhythm-mode');
      delete captureOverlay.dataset.surface;
      captureOverlay.setAttribute('aria-hidden', 'true');
    }

    // Re-seed the room ghost after a cancel. This does not write ghostsFound,
    // huntJournal, or orbs.
    captureSession = null;
    requestMuenbaLandscapeAfterPopup();
    spawnRoomGhost(state.roomId);
    resumeWorldMusicAfterCapture();
  }

  // Pass 8C calls this after the reward has been deposited. It remains
  // separate from cancelCaptureSession() so success cannot accidentally
  // respawn the just-captured target or clear a future reward state.
  function closeCaptureOverlay({ resumeHunt = false } = {}) {
    stopRhythmCapture();
    captureOpen = false;
    state.captureResolving = false;
    playUiSfx('popupClose');
    setDangerOverlay(false);
    if (captureOverlay) {
      captureOverlay.classList.remove('open');
      captureOverlay.classList.remove('muenba-rhythm-mode');
      delete captureOverlay.dataset.surface;
      captureOverlay.setAttribute('aria-hidden', 'true');
    }
    captureSession = null;
    requestMuenbaLandscapeAfterPopup();
    if (resumeHunt) spawnRoomGhost(state.roomId);
    resumeWorldMusicAfterCapture();
  }

  function stopRhythmCapture() {
    clearCaseReadGate(captureSession);
    clearCaseWrongAnswer(captureSession);
    const rhythm = captureSession && captureSession.rhythm;
    if (rhythm && rhythm.rafId) window.cancelAnimationFrame(rhythm.rafId);
    if (rhythm) rhythm.rafId = 0;
    if (captureSession && captureSession.danger) stopDangerRhythmMusic();
    const reward = captureSession && captureSession.reward;
    if (reward && reward.revealTimer) window.clearTimeout(reward.revealTimer);
    if (reward) reward.revealTimer = 0;
  }

  function drawGhost(now) {
    if (!activeGhost) return;
    const seconds = now / 1000;
    const bob = Math.sin(seconds * 3.4 + 1) * 6;
    const isAngry = activeGhost.screaming || now < activeGhost.angryUntil;
    const src = isAngry ? ANGRY_CHANGE_IMG : activeGhost.ghost.img;
    const img = src ? getGhostSprite(src) : null;
    const x = activeGhost.x;
    const y = activeGhost.y + bob;
    const teleporting = activeGhost.teleporting;
    const teleportProgress = teleporting
      ? Math.max(0, Math.min(1, (activeGhost.teleportAt - now) / GHOST_TELEPORT_WARNING_MS))
      : 1;

    actorCtx.save();
    actorCtx.globalAlpha = .95 * (teleporting ? .18 + teleportProgress * .82 : 1);
    if (teleporting) {
      const pulse = .5 + .5 * Math.sin(now / 70);
      actorCtx.strokeStyle = `rgba(190, 154, 255, ${.38 + pulse * .3})`;
      actorCtx.lineWidth = 3;
      actorCtx.beginPath();
      actorCtx.arc(x, y, GHOST_DRAW_R * (1.12 + pulse * .18), 0, Math.PI * 2);
      actorCtx.stroke();
      actorCtx.strokeStyle = `rgba(119, 213, 183, ${.24 + pulse * .2})`;
      actorCtx.lineWidth = 1.5;
      actorCtx.beginPath();
      actorCtx.arc(x, y, GHOST_DRAW_R * (.78 + pulse * .12), 0, Math.PI * 2);
      actorCtx.stroke();
    }
    if (img && img.complete && img.naturalWidth > 0) {
      actorCtx.drawImage(
        img,
        GHOST_ART_CROP.x,
        GHOST_ART_CROP.y,
        GHOST_ART_CROP.size,
        GHOST_ART_CROP.size,
        x - GHOST_DRAW_R,
        y - GHOST_DRAW_R,
        GHOST_DRAW_R * 2,
        GHOST_DRAW_R * 2
      );
    } else {
      actorCtx.fillStyle = isAngry ? '#e0687e' : '#cfe8df';
      actorCtx.beginPath();
      actorCtx.arc(x, y, GHOST_R * .7, 0, Math.PI * 2);
      actorCtx.fill();
    }
    actorCtx.restore();
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#000; }
      body { font-family: system-ui, -apple-system, sans-serif; }
      #muenba-app { position:relative; width:100vw; height:100vh; overflow:hidden; background:#000; }
      #muenba-stage { position:absolute; left:50%; top:50%; width:${WORLD_W}px; height:${WORLD_H}px; transform-origin:50% 50%; overflow:hidden; cursor:crosshair; }
      #muenba-room-layer, #muenba-room-tint, #muenba-atmosphere, #muenba-canvas, #muenba-fade { position:absolute; inset:0; }
      #muenba-room-layer { z-index:1; }
      #muenba-room-tint { z-index:2; pointer-events:none; mix-blend-mode:multiply; }
      .muenba-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center center; display:block; pointer-events:none; user-select:none; }
      #muenba-atmosphere { z-index:4; pointer-events:none; }
      #muenba-canvas { z-index:10; pointer-events:none; }
      #muenba-fade { z-index:30; background:#000; opacity:0; pointer-events:none; }
      #muenba-rotate-overlay { display:none; position:fixed; inset:0; z-index:9999; background:#000; flex-direction:column; align-items:center; justify-content:center; gap:18px; text-align:center; padding:32px; box-sizing:border-box; }
      #muenba-rotate-overlay.is-visible { display:flex !important; }
      .muenba-rotate-phone { display:inline-flex; align-items:center; justify-content:center; color:#d8f4e6; transform-origin:center; animation:muenbaRotateHint 2.4s ease-in-out infinite; }
      @keyframes muenbaRotateHint { 0%,100% { transform:rotate(0deg); } 40%,60% { transform:rotate(-90deg); } }
      .muenba-rotate-bar { width:120px; height:3px; border-radius:999px; background:linear-gradient(90deg,#477f6a,#a7e1c5,#477f6a); background-size:200%; animation:muenbaBarShimmer 2s linear infinite; box-shadow:0 0 14px rgba(122,210,170,.46); }
      @keyframes muenbaBarShimmer { 0% { background-position:0%; } 100% { background-position:200%; } }
      .muenba-rotate-title { font-family:system-ui,-apple-system,sans-serif; font-size:clamp(18px,5vw,28px); font-weight:900; letter-spacing:.04em; color:#f0fff7; margin:0; text-shadow:0 0 28px rgba(143,220,178,.52); }
      .muenba-rotate-sub { font-size:14px; color:rgba(216,244,230,.62); margin:0; line-height:1.7; }
      @media (prefers-reduced-motion: reduce) { .muenba-rotate-phone, .muenba-rotate-bar { animation:none; } }
      /* Return-to-Karasuki confirm popup — matches the locked-world screen's
         parchment-less, dark-cemetery styling so it reads as part of this
         world rather than a generic browser dialog. */
      #muenba-return-overlay { position:fixed; inset:0; z-index:200; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0); transition:background .35s ease; }
      #muenba-return-overlay.open { display:flex; background:rgba(0,0,0,.82); }
      .muenba-return-box { box-sizing:border-box; width:min(420px,calc(100% - 40px)); padding:26px 24px 24px; border:1px solid rgba(111,166,145,.45); border-radius:16px; background:linear-gradient(155deg,rgba(8,27,20,.97),rgba(1,4,4,.98)); box-shadow:0 24px 70px rgba(0,0,0,.72),0 0 45px rgba(16,65,45,.26),inset 0 0 60px rgba(0,0,0,.55); text-align:center; font-family:Georgia,'Times New Roman',serif; color:#e0eee8; transform:scale(.94); opacity:0; transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .25s ease; }
      #muenba-return-overlay.open .muenba-return-box { transform:scale(1); opacity:1; }
      .muenba-return-box h2 { margin:0 0 4px; font-size:1.2rem; font-weight:400; letter-spacing:.06em; text-transform:uppercase; }
      .muenba-return-box .jp { margin:0 0 16px; color:#aac2b5; font-size:.85rem; letter-spacing:.1em; }
      .muenba-return-box p { margin:0 0 20px; color:#c5d8cd; font-size:.92rem; line-height:1.6; }
      .muenba-return-box p.jp-line { margin-top:-10px; color:#8fa89b; font-size:.82rem; line-height:1.55; }
      .muenba-return-box ruby { ruby-position:over; }
      .muenba-return-box rt { font-size:.72em; }
      .muenba-return-actions { display:flex; gap:10px; justify-content:center; }
      .muenba-return-actions button { flex:1; max-width:150px; padding:9px 14px; border-radius:999px; font:700 12px ui-monospace,monospace; letter-spacing:.04em; cursor:pointer; }
      #muenba-return-yes { border:1px solid rgba(156,203,182,.7); color:#e0f4e9; background:rgba(52,104,78,.28); box-shadow:0 0 16px rgba(93,162,124,.22); }
      #muenba-return-yes:hover, #muenba-return-yes:focus-visible { background:rgba(52,104,78,.44); outline:none; }
      #muenba-return-no { border:1px solid rgba(90,130,112,.5); color:#aec8bb; background:transparent; }
      #muenba-return-no:hover, #muenba-return-no:focus-visible { background:rgba(90,130,112,.16); outline:none; }
      /* Pass 12: every capture/lobby/return/hide button now carries an EN
         <span> plus a JP <small> sub-line — stack them instead of letting
         the label and furigana run together inline. */
      #muenba-return-yes, #muenba-return-no, #muenba-lobby-begin, #muenba-room-nuppi-close, #muenba-case-board-next, #muenba-hunt-card-begin, #muenba-handoff-later, #muenba-hide, .muenba-capture-action { display:inline-flex; flex-direction:column; align-items:center; gap:3px; }
      #muenba-return-yes small, #muenba-return-no small, #muenba-lobby-begin small, #muenba-room-nuppi-close small, #muenba-case-board-next small, #muenba-hunt-card-begin small, #muenba-handoff-later small, #muenba-hide small, .muenba-capture-action small { color:#a8cbb8; font:400 .76rem Georgia,'Times New Roman',serif; letter-spacing:0; }
      #muenba-case-board-next small, #muenba-hunt-card-begin small { color:#e7dca9; }
      #muenba-hide small { color:#bfe8cf; font-size:.72rem; }
      /* Nuppi's lobby welcome — same dark-cemetery popup language as the
         return prompt, just roomier: it holds a portrait plus a few lines
         of text instead of a one-line question. Shows every time the
         player enters Muenba (Pass 3b). */
      #muenba-lobby-overlay { position:fixed; inset:0; z-index:210; display:none; align-items:flex-start; justify-content:center; overflow-y:auto; background:rgba(0,0,0,0); transition:background .4s ease; padding:max(20px,env(safe-area-inset-top,0px)) max(20px,env(safe-area-inset-right,0px)) max(20px,env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px)); box-sizing:border-box; }
      #muenba-lobby-overlay.open { display:flex; background:rgba(0,0,0,.86); }
      .muenba-lobby-box { position:relative; box-sizing:border-box; width:min(480px,100%); max-height:calc(100vh - 40px); max-height:calc(100dvh - 40px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)); margin:0 auto; overflow-y:auto; padding:28px 26px 26px; border:1px solid rgba(111,166,145,.45); border-radius:18px; background:linear-gradient(155deg,rgba(8,27,20,.97),rgba(1,4,4,.98)); box-shadow:0 24px 70px rgba(0,0,0,.75),0 0 55px rgba(16,65,45,.28),inset 0 0 70px rgba(0,0,0,.58); text-align:center; font-family:Georgia,'Times New Roman',serif; color:#e0eee8; transform:scale(.94); opacity:0; transition:transform .32s cubic-bezier(.34,1.56,.64,1),opacity .26s ease; }
      #muenba-lobby-overlay.open .muenba-lobby-box { transform:scale(1); opacity:1; }
      .muenba-lobby-portrait { display:block; width:96px; height:96px; object-fit:contain; margin:0 auto 12px; filter:drop-shadow(0 0 16px rgba(122,180,151,.3)); animation:muenbaNuppiTalk 2.8s ease-in-out infinite; transform-origin:50% 86%; }
      @keyframes muenbaNuppiTalk { 0%,100% { transform:translateY(0) rotate(-1deg); } 25% { transform:translateY(-3px) rotate(1deg); } 52% { transform:translateY(1px) rotate(0deg); } 76% { transform:translateY(-2px) rotate(-1deg); } }
      .muenba-lobby-box h2 { margin:0 0 4px; font-size:1.2rem; font-weight:400; letter-spacing:.06em; text-transform:uppercase; }
      .muenba-lobby-box .jp { margin:0 0 16px; color:#aac2b5; font-size:.85rem; letter-spacing:.1em; text-align:center; }
      .muenba-lobby-box p { margin:0 0 14px; color:#c5d8cd; font-size:.92rem; line-height:1.65; text-align:left; }
      .muenba-lobby-box p.jp-line { color:#8fa89b; font-size:.82rem; }
      .muenba-lobby-box p:last-of-type { margin-bottom:20px; }
      .muenba-room-nuppi-box { border-color:rgba(156,203,182,.58); box-shadow:0 24px 80px rgba(0,0,0,.8),0 0 60px rgba(122,180,151,.24),inset 0 0 70px rgba(0,0,0,.58); }
      .muenba-handoff-box { border-color:rgba(216,201,139,.68); box-shadow:0 24px 80px rgba(0,0,0,.8),0 0 70px rgba(216,201,139,.24),inset 0 0 70px rgba(0,0,0,.58); }
      .muenba-ghost-flavor { margin:12px 0 16px !important; padding:10px 12px; border-left:2px solid rgba(216,201,139,.5); background:rgba(216,201,139,.06); color:#e7dca9 !important; font-size:.86rem !important; font-style:italic; line-height:1.5 !important; text-align:center !important; }
      .muenba-lobby-box.is-case-board { width:min(600px,100%); padding:34px 30px 32px; border-color:rgba(216,201,139,.48); box-shadow:0 24px 80px rgba(0,0,0,.8),0 0 70px rgba(126,111,48,.18),inset 0 0 70px rgba(0,0,0,.58); }
      .muenba-lobby-case-board { margin:22px 0 24px; padding:21px 20px 19px; border:1px solid rgba(216,201,139,.4); border-radius:12px; background:linear-gradient(145deg,rgba(216,201,139,.1),rgba(216,201,139,.025)); text-align:left; }
      .muenba-lobby-case-board h3 { margin:0 0 10px; color:#fff5d5; font:400 clamp(1.25rem,4vw,1.7rem)/1.2 Georgia,'Times New Roman',serif; letter-spacing:.01em; }
      .muenba-lobby-case-board p { margin:0 0 7px; color:#fff5d5; font-size:1rem; line-height:1.55; }
      .muenba-lobby-case-board p.muenba-case-board-mode { margin:0; color:#f0d98c; font:900 .82rem/1.35 ui-monospace,monospace; letter-spacing:.08em; text-transform:uppercase; }
      .muenba-lobby-case-board p.muenba-case-board-mode-jp { margin:3px 0 10px; color:#c5b778; font-size:.8rem; }
      .muenba-lobby-case-board p.muenba-case-board-copy { color:#d9d0a5; font-size:.9rem; }
      .muenba-lobby-case-board p.muenba-case-direction-jp { color:#9fc3af; font-size:.84rem; }
      .muenba-case-board-eyebrow { margin:0 0 8px; color:#d8c98b; font:700 .62rem/1.4 ui-monospace,monospace; letter-spacing:.16em; text-transform:uppercase; }
      .muenba-lobby-actions { display:flex; justify-content:center; gap:9px; flex-wrap:wrap; margin-top:4px; }
      #muenba-lobby-begin, #muenba-room-nuppi-close, .muenba-capture-action { border:1px solid rgba(156,203,182,.7); color:#e0f4e9; background:rgba(52,104,78,.28); box-shadow:0 0 16px rgba(93,162,124,.22); border-radius:999px; padding:10px 28px; font:700 12px ui-monospace,monospace; letter-spacing:.05em; cursor:pointer; }
      #muenba-case-board-next, #muenba-hunt-card-begin { min-width:190px; padding:13px 38px; border-color:rgba(216,201,139,.9); color:#fff5d5; background:rgba(126,111,48,.3); box-shadow:0 0 24px rgba(216,201,139,.34),inset 0 0 12px rgba(216,201,139,.12); font-size:13px; }
      #muenba-handoff-later { border:1px solid rgba(156,203,182,.48); color:#c5d8cd; background:rgba(52,104,78,.12); box-shadow:none; border-radius:999px; padding:10px 24px; font:700 12px ui-monospace,monospace; letter-spacing:.05em; cursor:pointer; }
      #muenba-handoff-later:hover, #muenba-handoff-later:focus-visible { background:rgba(52,104,78,.3); border-color:rgba(156,203,182,.8); outline:none; }
      #muenba-case-board-next:hover, #muenba-case-board-next:focus-visible, #muenba-hunt-card-begin:hover, #muenba-hunt-card-begin:focus-visible { background:rgba(126,111,48,.48); box-shadow:0 0 34px rgba(216,201,139,.48),inset 0 0 16px rgba(216,201,139,.16); }
      .muenba-hunt-card { width:min(560px,100%); padding:30px 28px 28px; border-color:rgba(216,201,139,.58); box-shadow:0 24px 80px rgba(0,0,0,.82),0 0 70px rgba(126,111,48,.22),inset 0 0 70px rgba(0,0,0,.58); }
      .muenba-hunt-ghost-portrait { display:block; width:min(220px,58vw); height:min(220px,58vw); object-fit:contain; margin:0 auto 12px; filter:drop-shadow(0 0 22px rgba(216,201,139,.34)); animation:muenbaHuntGhostFloat 3.2s ease-in-out infinite; }
      @keyframes muenbaHuntGhostFloat { 0%,100% { transform:translateY(0) rotate(-1deg); } 50% { transform:translateY(-6px) rotate(1deg); } }
      .muenba-hunt-target-eyebrow { margin:0 0 8px; color:#d8c98b; font:700 .66rem/1.4 ui-monospace,monospace; letter-spacing:.17em; text-transform:uppercase; }
      .muenba-hunt-card h2 { font-size:clamp(1.35rem,4vw,1.85rem); }
      .muenba-hunt-helper { margin:18px 0 10px !important; padding:13px 14px; border:1px solid rgba(219,130,130,.34); border-left:3px solid rgba(219,130,130,.72); border-radius:10px; background:rgba(125,24,34,.12); color:#ffe2df !important; font-size:.92rem !important; line-height:1.55 !important; text-align:left !important; }
      .muenba-hunt-helper-jp { margin:0 0 20px !important; color:#d6b6b1 !important; font-size:.82rem !important; line-height:1.65 !important; text-align:left !important; }
      #muenba-lobby-begin:hover, #muenba-lobby-begin:focus-visible, #muenba-room-nuppi-close:hover, #muenba-room-nuppi-close:focus-visible, .muenba-capture-action:hover, .muenba-capture-action:focus-visible { background:rgba(52,104,78,.44); outline:none; }
      .muenba-case-eyebrow { margin:0 0 8px; color:#d8c98b; font:700 10px/1.4 ui-monospace,monospace; letter-spacing:.15em; }
      .muenba-case-mode-label { display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin:0 0 10px; color:#f0d98c; font:900 .72rem/1.35 ui-monospace,monospace; letter-spacing:.08em; text-transform:uppercase; }
      .muenba-case-mode-label small { color:#c5b778; font:400 .78rem/1.35 system-ui,sans-serif; letter-spacing:0; text-transform:none; }
      .muenba-case-progress { margin:0 0 10px; color:#fff5d5; font:900 .82rem/1.4 ui-monospace,monospace; letter-spacing:.16em; text-align:left; }
      .muenba-case-record { margin:15px 0 18px !important; padding:14px 15px; border-left:3px solid #d8c98b; background:rgba(216,201,139,.08); color:#fff !important; font-size:1rem !important; line-height:1.65 !important; text-align:left !important; }
      .muenba-case-record-list { display:grid; gap:7px; margin:13px 0 16px; text-align:left; }
      .muenba-case-record-item { padding:9px 11px; border-left:2px solid rgba(216,201,139,.42); background:rgba(216,201,139,.045); }
      .muenba-case-record-item h3 { margin:0 0 4px; color:#e7dca9; font:700 .72rem/1.35 ui-monospace,monospace; letter-spacing:.04em; }
      .muenba-case-record-item p { margin:0; color:#fff; font-size:.82rem; line-height:1.45; }
      /* Pass 12: highlighted-vocabulary clue cards — keywords glow gold
         against the now-white body text without adding another competing
         reading surface. */
      .muenba-case-record .kw, .muenba-case-record-item p .kw { color:#ffe066; font-weight:700; text-shadow:0 0 10px rgba(255,224,102,.65), 0 0 22px rgba(255,196,40,.3); }
      .muenba-case-record.muenba-case-sweep { color:#fff !important; }
      .muenba-case-sweep-word { color:rgba(223,240,231,.2); text-shadow:none; transition:color .22s ease, text-shadow .22s ease, opacity .22s ease; }
      .muenba-case-sweep-word.is-revealed { color:#f3f1df; }
      .muenba-case-sweep-word.is-keyword { color:rgba(255,224,102,.38); }
      .muenba-case-sweep-word.is-keyword.is-revealed { color:#ffe066; font-weight:700; text-shadow:0 0 10px rgba(255,224,102,.65), 0 0 22px rgba(255,196,40,.3); }
      .muenba-case-sweep-word.is-current { color:#fff; text-shadow:0 0 12px rgba(223,255,237,.7); }
      .muenba-case-sweep-word.is-current.is-keyword { color:#ffe066; text-shadow:0 0 12px rgba(255,224,102,.8), 0 0 26px rgba(255,196,40,.35); }
      .muenba-case-sweep-word-locked-pulse { animation:muenbaCaseLockedWordPulse .36s ease-out; }
      @keyframes muenbaCaseLockedWordPulse { 0%,100% { filter:brightness(1); } 40% { filter:brightness(1.7); text-shadow:0 0 18px rgba(255,255,235,.95),0 0 30px rgba(156,224,193,.42); } }
      .muenba-case-reading-status { display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .muenba-case-reading-status .muenba-case-direction-en { letter-spacing:.03em; }
      .muenba-case-reading-status::after { width:7px; height:7px; flex:0 0 auto; border-radius:50%; background:#9ce0c1; box-shadow:0 0 12px rgba(156,224,193,.85); content:""; animation:muenbaReadingDot 1.2s ease-in-out infinite; }
      .muenba-case-clue.muenba-reading-complete .muenba-case-reading-status::after { background:#ffe066; box-shadow:0 0 12px rgba(255,224,102,.85); animation:none; }
      @keyframes muenbaReadingDot { 0%,100% { opacity:.35; transform:scale(.8); } 50% { opacity:1; transform:scale(1.15); } }
      .muenba-case-check-panel { margin-top:18px; padding:15px 14px 13px; border:1px solid rgba(170,150,255,.64); border-radius:13px; background:linear-gradient(135deg,rgba(83,61,155,.14),rgba(38,29,81,.2)); box-shadow:0 0 24px rgba(100,77,184,.14); transition:border-color .22s ease, background .22s ease, box-shadow .22s ease, opacity .22s ease; }
      .muenba-case-check-panel.is-locked { border-color:rgba(170,150,255,.28); background:rgba(25,22,51,.34); box-shadow:none; }
      .muenba-case-check-panel.is-unlocked { border-color:rgba(206,190,255,.72); background:linear-gradient(135deg,rgba(83,61,155,.22),rgba(38,29,81,.28)); box-shadow:0 0 28px rgba(100,77,184,.24); }
      .muenba-case-check-lock-label { margin:0 0 8px; color:#c9baff; font:900 .7rem/1.35 ui-monospace,monospace; letter-spacing:.14em; text-align:left; }
      .muenba-case-check-panel.is-locked .muenba-case-check-lock-label { color:rgba(201,186,255,.52); }
      .muenba-case-check-panel .muenba-case-question { margin:0 0 11px; }
      .muenba-case-question-locked { border-color:rgba(170,150,255,.22) !important; background:rgba(30,25,64,.22) !important; box-shadow:none !important; animation:none !important; }
      .muenba-case-question-locked .muenba-case-direction-en { color:rgba(238,234,255,.34) !important; text-shadow:none !important; }
      .muenba-case-question-locked .muenba-case-direction-jp { color:rgba(201,186,255,.3) !important; }
      .muenba-case-check-lock-hint { margin:0 0 10px; color:#9b91c1; font:600 .76rem/1.45 system-ui,-apple-system,sans-serif; text-align:left; }
      .muenba-case-check-panel.is-unlocked .muenba-case-check-lock-hint { color:#d8d0ff; }
      .muenba-case-choices-locked { margin-top:10px; }
      .muenba-case-choice-locked { border-color:rgba(174,145,255,.2) !important; background:rgba(89,65,151,.07) !important; color:rgba(242,237,255,.34) !important; cursor:not-allowed; filter:saturate(.45); }
      .muenba-case-choice-locked .muenba-case-choice-number { border-color:rgba(174,145,255,.2); color:rgba(231,221,255,.34); background:rgba(89,65,151,.08); }
      .muenba-case-choice-locked:hover, .muenba-case-choice-locked:focus-visible { transform:none !important; border-color:rgba(174,145,255,.38) !important; background:rgba(89,65,151,.15) !important; box-shadow:none !important; outline:none; }
      /* Case-specific heading treatment, scoped to .muenba-case-box so it
         never touches the many unrelated screens sharing .muenba-lobby-box. */
      .muenba-case-box h2 { color:#fff5d5; font-size:1.3rem; font-weight:400; letter-spacing:.01em; text-transform:none; }
      .muenba-case-direction { margin:16px 0; padding:10px 12px; border:1px solid rgba(156,203,182,.24); border-radius:10px; background:rgba(255,255,255,.035); text-align:left; }
      .muenba-case-direction-en { margin:0; color:#dff5e8; font-size:.86rem; line-height:1.45; }
      .muenba-case-direction-jp { margin:5px 0 0; color:#9fc3af; font-size:.82rem; line-height:1.55; }
      .muenba-case-question-instruction .muenba-case-direction-en { color:#cfe3d6; font:600 .72rem/1.4 system-ui,-apple-system,sans-serif; letter-spacing:.08em; text-transform:uppercase; }
      .muenba-case-question-instruction .muenba-case-direction-jp { color:#9fc3af; }
      .muenba-case-question-instruction { margin:0 0 10px; border-color:rgba(151,126,255,.24); background:rgba(94,67,157,.06); box-shadow:none; }
      .muenba-case-progress-jp { margin:-6px 0 10px; color:#9fc3af; font-size:.76rem; letter-spacing:.04em; text-align:left; }
      .muenba-case-eyebrow-jp, .muenba-case-board-eyebrow-jp, .muenba-hunt-target-eyebrow-jp { margin:-6px 0 8px; color:#9fc3af; font-size:.76rem; letter-spacing:.04em; }
      .muenba-ghost-flavor-jp { margin:-12px 0 16px !important; color:#c5b778 !important; font-size:.78rem !important; line-height:1.5 !important; text-align:center !important; font-style:normal; }
      .muenba-case-question { margin:17px 0 12px; border-color:rgba(255,255,255,.48); background:rgba(84,65,132,.22); box-shadow:0 0 22px rgba(100,77,184,.16); }
      .muenba-case-question .muenba-case-direction-en { color:#fff; font-size:1.12rem; font-weight:700; line-height:1.45; }
      .muenba-case-question .muenba-case-direction-jp { color:#d8d0ff; }
      .muenba-case-feedback { border-color:rgba(219,130,130,.42); background:rgba(125,24,34,.12); }
      .muenba-case-feedback-shake { animation:muenbaCaseFeedbackShake .34s ease-out; }
      @keyframes muenbaCaseFeedbackShake { 0%,100% { transform:translateX(0); } 20% { transform:translateX(-5px); } 40% { transform:translateX(4px); } 60% { transform:translateX(-3px); } 80% { transform:translateX(2px); } }
      .muenba-case-read-status { margin-top:16px; border-color:rgba(216,201,139,.28); background:rgba(216,201,139,.04); box-shadow:none; }
      .muenba-case-read-status .muenba-case-direction-en { color:#d8c98b; font-size:.78rem; font-weight:700; }
      .muenba-case-read-status .muenba-case-direction-jp { color:#a8bda9; }
      .muenba-case-clue.muenba-reading .muenba-case-read-status { animation:muenbaReadStatusPulse 1.8s ease-in-out infinite; }
      @keyframes muenbaReadStatusPulse { 0%,100% { opacity:.7; } 50% { opacity:1; } }
      .muenba-case-review { border-color:rgba(170,150,255,.62); background:linear-gradient(145deg,rgba(19,11,43,.97),rgba(6,13,25,.98)); box-shadow:0 24px 80px rgba(0,0,0,.82),0 0 55px rgba(111,66,210,.2),inset 0 0 55px rgba(49,205,154,.045); }
      .muenba-case-review .muenba-case-record { border-color:#c6adff; background:linear-gradient(110deg,rgba(111,83,184,.18),rgba(156,224,193,.04)); }
      .muenba-case-review-note { margin-top:16px; border-color:rgba(156,224,193,.3); background:rgba(52,104,78,.08); box-shadow:none; }
      .muenba-case-review-note .muenba-case-direction-en { color:#dff5e8; font-size:.82rem; font-weight:700; }
      .muenba-case-review-note .muenba-case-direction-jp { color:#a8cbbb; }
      .muenba-case-review-actions { margin-top:18px; }
      .muenba-case-review-actions .muenba-case-action { min-width:155px; }
      .muenba-case-penalty-note { border-color:rgba(219,130,130,.48); background:rgba(125,24,34,.16); box-shadow:0 0 22px rgba(125,24,34,.16); }
      .muenba-case-penalty-note .muenba-case-direction-en { color:#ffe2df; }
      .muenba-case-penalty-note .muenba-case-direction-jp { color:#d6b6b1; }
      .muenba-rhythm-penalty { margin:12px 0 14px; border-color:rgba(219,130,130,.46); background:rgba(125,24,34,.13); box-shadow:0 0 20px rgba(125,24,34,.16); }
      .muenba-rhythm-penalty .muenba-case-direction-en { color:#ffe2df; font-size:.82rem; font-weight:700; }
      .muenba-rhythm-penalty .muenba-case-direction-jp { color:#d6b6b1; }
      .muenba-case-direction ruby, .muenba-case-action ruby { ruby-position:over; line-height:1.45; }
      .muenba-case-direction rt, .muenba-case-action rt { font-size:.78em; opacity:.95; }
      .muenba-case-actions { display:flex; justify-content:center; gap:9px; flex-wrap:wrap; margin-top:6px; }
      .muenba-case-action { min-width:150px; display:inline-flex; flex-direction:column; align-items:center; gap:3px; }
      .muenba-case-action.is-selected { border-color:#d8c98b; background:rgba(216,201,139,.2); box-shadow:0 0 18px rgba(216,201,139,.2); }
      .muenba-case-action small { color:#a8cbb8; font:400 .76rem Georgia,'Times New Roman',serif; letter-spacing:0; }
      .muenba-case-choices { display:grid; gap:9px; margin:14px 0 4px; }
      .muenba-case-choice { width:100%; padding:12px 14px; border:1px solid rgba(174,145,255,.5); border-radius:10px; background:rgba(89,65,151,.2); color:#f2edff; font:400 .9rem Georgia,'Times New Roman',serif; line-height:1.4; text-align:left; cursor:pointer; }
      .muenba-case-choice:hover, .muenba-case-choice:focus-visible { border-color:#c6adff; background:rgba(111,83,184,.34); outline:none; }
      /* Hide button (Pass 7) — always visible during free-roam, not a DEV
         tool. Matches the exit button's box language but sits bottom-left
         so it never competes with the DEV-only bottom-right room list. */
      #muenba-hide { position:fixed; left:12px; bottom:78px; z-index:100; border:1px solid rgba(156,203,182,.72); border-radius:8px; background:rgba(0,8,12,.82); color:#e6fff1; padding:7px 16px; font:700 11px ui-monospace,monospace; letter-spacing:.05em; cursor:pointer; box-shadow:0 0 12px rgba(93,208,140,.28), inset 0 0 10px rgba(93,208,140,.08); animation:muenbaHideGlow 1.8s ease-in-out infinite; }
      #muenba-profile-link { position:fixed; right:max(18px, env(safe-area-inset-right, 0px)); bottom:max(30px, calc(env(safe-area-inset-bottom, 0px) + 22px)); z-index:100; display:none; place-items:center; box-sizing:border-box; width:clamp(44px, 6vw, 62px); height:clamp(44px, 6vw, 62px); padding:clamp(4px, .7vw, 7px); border:1px solid rgba(216,201,139,.66); border-radius:clamp(10px, 1.2vw, 14px); background:rgba(6,15,12,.86); box-shadow:0 0 18px rgba(216,201,139,.2), inset 0 0 14px rgba(216,201,139,.08); transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
      #muenba-profile-link.is-visible { display:grid; }
      #muenba-profile-link img { display:block; width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 0 8px rgba(216,201,139,.42)); }
      #muenba-profile-link:hover, #muenba-profile-link:focus-visible { transform:translateY(-2px); border-color:#fff0ad; box-shadow:0 0 28px rgba(216,201,139,.44), inset 0 0 16px rgba(216,201,139,.14); outline:none; }
      @keyframes muenbaHideGlow { 0%,100% { box-shadow:0 0 10px rgba(93,208,140,.22), inset 0 0 8px rgba(93,208,140,.06); } 50% { box-shadow:0 0 25px rgba(93,208,140,.58), 0 0 48px rgba(93,208,140,.18), inset 0 0 14px rgba(93,208,140,.16); } }
      #muenba-hide:hover, #muenba-hide:focus-visible { background:rgba(30,70,60,.8); outline:none; }
      #muenba-hide.is-disabled, #muenba-hide:disabled { cursor:not-allowed; opacity:.38; animation:none; background:rgba(0,8,12,.62); border-color:rgba(156,203,182,.28); color:rgba(230,255,241,.5); box-shadow:none; }
      #muenba-return-nuppi-hint { position:fixed; left:50%; top:12px; z-index:90; display:none; transform:translateX(-50%); padding:8px 14px; border:1px solid rgba(216,201,139,.72); border-radius:999px; background:rgba(20,24,14,.86); color:#fff5d5; box-shadow:0 0 18px rgba(216,201,139,.28); font:700 10px/1.25 ui-monospace,monospace; letter-spacing:.08em; text-align:center; pointer-events:none; }
      #muenba-return-nuppi-hint.open { display:block; }
      #muenba-return-nuppi-hint small { display:block; margin-top:3px; color:#c7d9c5; font:400 .82em Georgia,'Times New Roman',serif; letter-spacing:.04em; }
      #muenba-celebration-status { position:fixed; left:50%; top:12px; z-index:91; display:none; transform:translateX(-50%); padding:9px 17px; border:1px solid rgba(255,226,120,.82); border-radius:999px; background:rgba(42,31,9,.88); color:#fff5d5; box-shadow:0 0 22px rgba(255,211,75,.4), inset 0 0 12px rgba(255,226,120,.12); font:700 10px/1.25 ui-monospace,monospace; letter-spacing:.1em; text-align:center; pointer-events:none; animation:muenbaCelebrationPulse 1.1s ease-in-out infinite; }
      #muenba-celebration-status.open { display:block; }
      #muenba-celebration-status small { display:block; margin-top:3px; color:#f1df9c; font:400 .82em Georgia,'Times New Roman',serif; letter-spacing:.04em; }
      @keyframes muenbaCelebrationPulse { 0%,100% { box-shadow:0 0 16px rgba(255,211,75,.28), inset 0 0 10px rgba(255,226,120,.08); } 50% { box-shadow:0 0 34px rgba(255,211,75,.62), inset 0 0 16px rgba(255,226,120,.18); } }
      #muenba-hide.active { background:rgba(93,162,124,.48); border-color:#7be8a9; color:#eafff2; box-shadow:0 0 26px rgba(93,208,140,.68), inset 0 0 14px rgba(93,208,140,.18); }
      /* Capture session overlay — reuses .muenba-lobby-box for
         the card shell and adds the two-lane
         rhythm board inside that modal. */
      #muenba-capture-overlay { position:fixed; inset:0; z-index:215; display:none; align-items:flex-start; justify-content:center; overflow-y:auto; background:rgba(0,0,0,0); transition:background .4s ease; padding:max(20px,env(safe-area-inset-top,0px)) max(20px,env(safe-area-inset-right,0px)) max(20px,env(safe-area-inset-bottom,0px)) max(20px,env(safe-area-inset-left,0px)); box-sizing:border-box; }
      #muenba-capture-overlay.open { display:flex; background:rgba(0,0,0,.86); }
      #muenba-capture-overlay.danger.open { background:rgba(90,0,12,.9); animation:muenbaDangerFlash .38s steps(2,end) infinite; }
      #muenba-capture-overlay.open .muenba-lobby-box { transform:scale(1); opacity:1; }
      .muenba-dev-capture-tools { display:flex; justify-content:flex-end; min-height:24px; margin:-12px -10px 8px; pointer-events:auto; }
      .muenba-dev-capture-hold { border:1px solid rgba(216,201,139,.42); border-radius:999px; padding:4px 9px; color:rgba(255,245,213,.78); background:rgba(0,0,0,.28); font:700 9px ui-monospace,monospace; letter-spacing:.05em; cursor:pointer; }
      .muenba-dev-capture-hold:hover, .muenba-dev-capture-hold:focus-visible { border-color:rgba(216,201,139,.85); color:#fff5d5; background:rgba(126,111,48,.22); outline:none; }
      .muenba-dev-capture-hold[aria-pressed="true"] { border-color:rgba(156,224,193,.86); color:#dff5e8; background:rgba(52,104,78,.26); box-shadow:0 0 12px rgba(93,208,140,.18); }
      @keyframes muenbaDangerFlash { 0%,100% { box-shadow:inset 0 0 0 rgba(238,36,63,0); } 50% { box-shadow:inset 0 0 120px rgba(238,36,63,.32); } }
      .muenba-danger-box { border-color:rgba(255,82,96,.82) !important; box-shadow:0 24px 80px rgba(0,0,0,.82),0 0 70px rgba(235,28,57,.35),inset 0 0 70px rgba(98,0,12,.46) !important; }
      .muenba-danger-box .muenba-danger-eyebrow { color:#ff8290; }
      .muenba-danger-box .muenba-rhythm-lane { border-color:rgba(255,93,104,.68); background:linear-gradient(180deg,rgba(100,21,31,.74),rgba(24,5,10,.92)); }
      .muenba-danger-box .muenba-rhythm-lane:hover, .muenba-danger-box .muenba-rhythm-lane:focus-visible { border-color:#ff9aa4; background:linear-gradient(180deg,rgba(142,29,42,.82),rgba(32,5,11,.96)); }
      .muenba-danger-box .muenba-rhythm-lane:active { background:rgba(177,35,50,.86); }
      .muenba-danger-box .muenba-rhythm-hit-line { background:#ffb0b8; box-shadow:0 0 18px rgba(255,56,78,.92); }
      .muenba-danger-box .muenba-rhythm-note { border-color:#ffd5d9; background:rgba(173,34,52,.95); box-shadow:0 0 18px rgba(255,55,81,.58); }
      .muenba-danger-box .muenba-rhythm-note-kat { background:rgba(113,30,88,.95); box-shadow:0 0 18px rgba(244,65,149,.5); }
      .muenba-danger-box .muenba-rhythm-note.is-hit { border-color:#b9ffcb; }
      .muenba-danger-box .muenba-rhythm-note.is-miss { border-color:#ff7180; background:rgba(83,7,19,.8); }
      .muenba-capture-orbs { margin-top:-6px; color:#9ccbb6; font-size:.82rem; letter-spacing:.05em; }
      .muenba-capture-action { touch-action:manipulation; }
      .muenba-rhythm-status { min-height:1.5em; margin:2px 0 2px !important; color:#d8f2e2 !important; font:700 1.08rem/1.4 ui-monospace,monospace !important; text-align:center !important; letter-spacing:.08em; }
      .muenba-rhythm-status.perfect, .muenba-rhythm-status.good, .muenba-rhythm-status.go { color:#8fe0ad !important; }
      .muenba-rhythm-status.miss, .muenba-rhythm-status.early { color:#e8b0b8 !important; }
      .muenba-rhythm-tier { margin:0 0 7px !important; color:#d8c98b !important; font:700 .68rem/1.35 ui-monospace,monospace !important; letter-spacing:.08em; text-align:center !important; text-transform:uppercase; }
      .muenba-rhythm-help-button { position:absolute; top:10px; left:10px; z-index:8; display:grid; place-items:center; width:30px; height:30px; padding:0; border:1px solid rgba(216,201,139,.72); border-radius:50%; color:#fff5d5; background:rgba(40,32,12,.72); box-shadow:0 0 14px rgba(216,201,139,.28); font:900 17px/1 Georgia,'Times New Roman',serif; cursor:pointer; }
      .muenba-rhythm-help-button:hover, .muenba-rhythm-help-button:focus-visible { border-color:#fff1ae; background:rgba(126,111,48,.58); box-shadow:0 0 24px rgba(216,201,139,.48); outline:none; }
      .muenba-rhythm-help-box { border-color:rgba(216,201,139,.54); box-shadow:0 24px 80px rgba(0,0,0,.82),0 0 60px rgba(126,111,48,.22),inset 0 0 70px rgba(0,0,0,.58); }
      .muenba-rhythm-halloween-box { border-color:rgba(157,116,255,.7); background:radial-gradient(circle at 50% 8%,rgba(116,46,168,.22),transparent 42%),linear-gradient(145deg,rgba(19,11,43,.96),rgba(6,13,25,.97)); box-shadow:0 24px 80px rgba(0,0,0,.86),0 0 55px rgba(111,66,210,.25),inset 0 0 55px rgba(49,205,154,.08); }
      .muenba-rhythm-halloween-box h2 { color:#f4e8ff; text-shadow:0 0 18px rgba(190,119,255,.48); }
      .muenba-rhythm-result-success { border-color:rgba(183,255,83,.84) !important; box-shadow:0 24px 80px rgba(0,0,0,.86),0 0 70px rgba(79,255,151,.3),inset 0 0 70px rgba(132,255,77,.1) !important; }
      .muenba-rhythm-result-failure { border-color:rgba(255,135,67,.8) !important; animation:muenbaRhythmResultShake .28s ease-out; }
      @keyframes muenbaRhythmResultShake { 20% { transform:translateX(-4px); } 50% { transform:translateX(4px); } 80% { transform:translateX(-2px); } }
      .muenba-rhythm-accuracy { margin:0 0 7px !important; color:#9ccbb6 !important; font:700 .72rem/1.4 ui-monospace,monospace !important; text-align:center !important; letter-spacing:.08em; }
      .muenba-rhythm-combo { min-height:1.2em; margin:0 0 4px !important; color:#ffb347 !important; font:900 .9rem/1.2 ui-monospace,monospace !important; letter-spacing:.14em; text-align:center !important; text-shadow:0 0 12px rgba(255,145,45,.38); text-transform:uppercase; }
      .muenba-rhythm-combo.is-hot { color:#c9ff54 !important; animation:muenbaRhythmComboPop .28s ease-out; text-shadow:0 0 16px rgba(164,255,58,.75); }
      .muenba-rhythm-energy { display:flex; align-items:center; gap:8px; margin:0 auto 7px; width:min(100%,360px); }
      .muenba-rhythm-energy-label { flex:0 0 auto; color:#88b8ff; font:900 .58rem/1 ui-monospace,monospace; letter-spacing:.1em; }
      .muenba-rhythm-energy-track { position:relative; flex:1; height:7px; overflow:hidden; border:1px solid rgba(137,184,255,.5); border-radius:99px; background:rgba(7,13,29,.86); box-shadow:inset 0 0 7px rgba(40,21,93,.8); }
      .muenba-rhythm-energy-fill { display:block; width:0; height:100%; border-radius:inherit; background:linear-gradient(90deg,#8c5bff,#26e6a0,#d8ff4f); box-shadow:0 0 14px rgba(112,255,170,.72); transition:width .18s ease-out; }
      .muenba-rhythm-board { position:relative; display:grid; grid-template-columns:1fr 1fr; gap:8px; height:250px; margin:8px 0 6px; padding:5px; border:1px solid rgba(143,104,255,.28); border-radius:18px; background:radial-gradient(circle at 50% 100%,rgba(255,122,27,.1),transparent 48%),rgba(5,5,19,.64); box-shadow:inset 0 0 24px rgba(68,35,143,.26); }
      .muenba-rhythm-lane { position:relative; min-width:0; height:250px; overflow:hidden; padding:0; border:1px solid rgba(156,203,182,.35); border-radius:14px; color:#f2f7ff; background:linear-gradient(180deg,rgba(25,55,44,.58),rgba(5,15,12,.86)); cursor:pointer; touch-action:none; user-select:none; }
      .muenba-rhythm-don { border-color:rgba(117,255,154,.74); background:linear-gradient(180deg,rgba(20,116,84,.7),rgba(5,35,30,.94)); box-shadow:inset 0 0 28px rgba(39,255,145,.12),0 0 13px rgba(39,255,145,.1); }
      .muenba-rhythm-kat { border-color:rgba(197,118,255,.72); background:linear-gradient(180deg,rgba(86,35,125,.74),rgba(27,9,51,.95)); box-shadow:inset 0 0 28px rgba(190,85,255,.14),0 0 13px rgba(190,85,255,.12); }
      .muenba-rhythm-rim { border-color:rgba(102,183,255,.72); background:linear-gradient(180deg,rgba(28,78,139,.76),rgba(7,25,58,.95)); box-shadow:inset 0 0 28px rgba(52,159,255,.14),0 0 13px rgba(52,159,255,.12); }
      .muenba-rhythm-bell { border-color:rgba(255,175,77,.76); background:linear-gradient(180deg,rgba(142,69,26,.76),rgba(54,21,8,.95)); box-shadow:inset 0 0 28px rgba(255,135,30,.14),0 0 13px rgba(255,135,30,.12); }
      .muenba-rhythm-lane:hover, .muenba-rhythm-lane:focus-visible { filter:brightness(1.22); outline:none; }
      .muenba-rhythm-lane:active { filter:brightness(1.45); }
      .muenba-rhythm-lane-label { position:absolute; z-index:4; left:0; right:0; top:9px; color:#edf5ff; font:900 .68rem/1.2 ui-monospace,monospace; letter-spacing:.08em; pointer-events:none; text-shadow:0 0 9px rgba(255,255,255,.26); }
      .muenba-rhythm-rail { position:absolute; inset:29px 0 0; pointer-events:none; }
      .muenba-rhythm-hit-line { position:absolute; z-index:5; left:8px; right:8px; top:218px; height:3px; border-radius:99px; background:#ffab45; box-shadow:0 0 10px rgba(255,134,35,.72),0 0 24px rgba(255,91,20,.4); pointer-events:none; }
      .muenba-rhythm-note { position:absolute; z-index:3; left:50%; top:0; display:grid; place-items:center; width:42px; height:42px; border:2px solid rgba(220,248,231,.92); border-radius:50%; color:#f0fff5; background:rgba(44,105,76,.92); box-shadow:0 0 16px rgba(112,214,151,.42); font:900 1.1rem/1 ui-monospace,monospace; will-change:transform; }
      .muenba-rhythm-note-don { border-color:#8affae; background:rgba(21,153,102,.94); box-shadow:0 0 18px rgba(57,255,147,.62); }
      .muenba-rhythm-note-kat { border-radius:10px; border-color:#e0a5ff; background:rgba(118,46,167,.94); box-shadow:0 0 18px rgba(205,103,255,.62); }
      .muenba-rhythm-note-rim { border-radius:9px 9px 50% 50%; border-color:#9ad3ff; background:rgba(38,108,177,.94); box-shadow:0 0 18px rgba(65,173,255,.66); }
      .muenba-rhythm-note-bell { border-radius:50%; border-color:#ffd18d; background:rgba(196,91,27,.96); box-shadow:0 0 18px rgba(255,145,44,.7); }
      .muenba-rhythm-note-decoy { border-style:dashed; color:#ffe0a3; background:rgba(76,35,65,.9); box-shadow:0 0 18px rgba(255,173,91,.48); }
      .muenba-rhythm-note-spiral { border-radius:50%; transform-origin:center; }
      .muenba-rhythm-note.is-avoided { opacity:.1; border-color:#ffd48a; box-shadow:none; }
      .muenba-rhythm-note.is-resolved { opacity:.14; box-shadow:none; }
      .muenba-rhythm-note.is-hit { opacity:.94; border-color:#8fe0ad; }
      .muenba-rhythm-note.is-miss { opacity:.18; border-color:#e8b0b8; background:rgba(120,48,64,.65); box-shadow:none; }
      .muenba-rhythm-board.is-perfect { animation:muenbaRhythmPerfect .26s ease-out; }
      .muenba-rhythm-board.is-good { animation:muenbaRhythmGood .2s ease-out; }
      .muenba-rhythm-board.is-miss { animation:muenbaRhythmMiss .24s ease-out; }
      @keyframes muenbaRhythmPerfect { 50% { box-shadow:inset 0 0 42px rgba(182,255,71,.25),0 0 24px rgba(67,255,152,.4); } }
      @keyframes muenbaRhythmGood { 50% { box-shadow:inset 0 0 34px rgba(74,175,255,.22),0 0 18px rgba(74,175,255,.3); } }
      @keyframes muenbaRhythmMiss { 50% { box-shadow:inset 0 0 42px rgba(255,52,87,.3),0 0 22px rgba(255,52,87,.32); } }
      @keyframes muenbaRhythmComboPop { 50% { transform:scale(1.12); } }
      @media (max-width:640px) { .muenba-rhythm-board { gap:4px; padding:3px; } .muenba-rhythm-lane-label { font-size:.52rem; letter-spacing:.01em; } .muenba-rhythm-note { width:34px; height:34px; font-size:.9rem; } }
      .muenba-rhythm-hint { margin:7px 0 13px !important; color:#8fa89b !important; font-size:.73rem !important; line-height:1.45 !important; text-align:center !important; }
      .muenba-orb-release-list { display:flex; justify-content:center; align-items:center; gap:12px; min-height:52px; margin:5px 0 8px; }
      .muenba-orb-release { display:grid; place-items:center; width:38px; height:38px; color:#dfffea; border:1px solid rgba(181,238,202,.75); border-radius:50%; background:radial-gradient(circle,rgba(113,206,153,.72),rgba(30,83,59,.68)); box-shadow:0 0 22px rgba(113,206,153,.58); font-size:1.45rem; animation:muenbaOrbRelease .42s cubic-bezier(.2,1.5,.4,1) both; }
      @keyframes muenbaOrbRelease { from { opacity:0; transform:translateY(12px) scale(.35); } to { opacity:1; transform:translateY(0) scale(1); } }
      .muenba-orb-release-status { margin:0 0 18px !important; color:#9ccbb6 !important; font:700 .76rem/1.4 ui-monospace,monospace !important; text-align:center !important; letter-spacing:.05em; }
      /* Pass 1: shared Muenba popup language. The later lobby, case, and
         capture passes can use these surfaces without rebuilding the shell.
         Green is guidance/evidence, violet is thought/choice, and gold is
         case progress or reward. */
      .muenba-lobby-box {
        --muenba-mint:#9ce0c1;
        --muenba-mint-soft:rgba(156,224,193,.2);
        --muenba-gold:#f1d78d;
        --muenba-violet:#aa96ff;
        --muenba-panel:rgba(4,18,14,.975);
        --muenba-panel-deep:rgba(1,7,8,.99);
        isolation:isolate;
        border-color:rgba(112,190,160,.56);
        background:
          radial-gradient(circle at 50% 0%,rgba(30,112,91,.17),transparent 35%),
          linear-gradient(145deg,var(--muenba-panel),var(--muenba-panel-deep));
        box-shadow:
          0 24px 70px rgba(0,0,0,.8),
          0 0 55px rgba(28,116,82,.24),
          inset 0 1px 0 rgba(190,255,222,.06),
          inset 0 0 70px rgba(0,0,0,.58);
        scrollbar-color:rgba(156,224,193,.48) rgba(0,0,0,.22);
        scrollbar-width:thin;
      }
      .muenba-lobby-box::before {
        position:absolute;
        inset:0;
        z-index:0;
        border:1px solid rgba(156,224,193,.1);
        border-radius:inherit;
        background:linear-gradient(180deg,rgba(156,224,193,.08),transparent 18%);
        content:"";
        pointer-events:none;
      }
      .muenba-lobby-box::after {
        position:absolute;
        top:14px;
        left:50%;
        z-index:0;
        width:92px;
        height:2px;
        border-radius:99px;
        background:linear-gradient(90deg,transparent,rgba(241,215,141,.62),transparent);
        box-shadow:0 0 18px rgba(241,215,141,.24);
        content:"";
        transform:translateX(-50%);
        pointer-events:none;
      }
      .muenba-lobby-box > * { position:relative; z-index:1; }
      .muenba-lobby-box h2 { color:#f5f3df; text-shadow:0 0 18px rgba(156,224,193,.1); }
      .muenba-lobby-box .jp { color:#b5d8c7; }
      .muenba-lobby-box p { color:#d2e3d9; }
      .muenba-lobby-box p.jp-line { color:#99b9aa; }
      .muenba-lobby-portrait { filter:drop-shadow(0 0 18px rgba(156,224,193,.38)) drop-shadow(0 0 34px rgba(100,82,211,.12)); }
      .muenba-case-box { border-color:rgba(156,224,193,.62); }
      .muenba-case-box .muenba-case-eyebrow,
      .muenba-case-box .muenba-case-board-eyebrow { color:var(--muenba-gold); text-shadow:0 0 12px rgba(241,215,141,.18); }
      .muenba-case-record,
      .muenba-case-record-item {
        border-color:rgba(156,224,193,.34);
        background:linear-gradient(110deg,rgba(104,139,83,.13),rgba(156,224,193,.035));
      }
      .muenba-case-direction.muenba-case-question-instruction,
      .muenba-case-question {
        position:relative;
        isolation:isolate;
        overflow:hidden;
        border-color:rgba(170,150,255,.52);
        background:linear-gradient(135deg,rgba(83,61,155,.2),rgba(38,29,81,.22));
        box-shadow:0 0 26px rgba(100,77,184,.24),inset 0 0 24px rgba(144,116,255,.06);
      }
      .muenba-case-question {
        margin-top:20px;
        padding:17px 18px 16px;
        border-color:rgba(206,190,255,.72);
        animation:muenbaQuestionGlow 2.8s ease-in-out infinite;
      }
      .muenba-case-question::before {
        position:absolute;
        inset:-35%;
        z-index:0;
        background:radial-gradient(circle at 50% 45%,rgba(162,125,255,.22),transparent 56%);
        content:"";
        opacity:.72;
        animation:muenbaQuestionBloom 2.8s ease-in-out infinite;
        pointer-events:none;
      }
      .muenba-case-question > * { position:relative; z-index:1; }
      .muenba-case-question .muenba-case-direction-en { font-size:clamp(1.14rem,3vw,1.32rem); line-height:1.4; letter-spacing:.01em; text-shadow:0 0 14px rgba(228,220,255,.18); }
      .muenba-case-question .muenba-case-direction-jp { margin-top:9px; font-size:.9rem; }
      @keyframes muenbaQuestionGlow { 0%,100% { box-shadow:0 0 20px rgba(100,77,184,.2),inset 0 0 20px rgba(144,116,255,.04); } 50% { box-shadow:0 0 36px rgba(133,101,231,.42),inset 0 0 28px rgba(144,116,255,.1); } }
      @keyframes muenbaQuestionBloom { 0%,100% { transform:scale(.94); opacity:.5; } 50% { transform:scale(1.04); opacity:.86; } }
      .muenba-case-choices { gap:11px; margin:17px 0 5px; }
      .muenba-case-choice {
        display:flex;
        align-items:flex-start;
        gap:13px;
        min-height:62px;
        box-sizing:border-box;
        padding:14px 16px 14px 13px;
        border-color:rgba(183,157,255,.7);
        border-radius:12px;
        background:linear-gradient(105deg,rgba(87,61,158,.4),rgba(38,27,78,.52));
        box-shadow:0 0 12px rgba(91,65,173,.16),inset 0 1px 0 rgba(232,223,255,.08);
        color:#fffaff;
        font-size:clamp(.94rem,2.5vw,1.02rem);
        line-height:1.45;
      }
      .muenba-case-choice-number {
        flex:0 0 auto;
        display:grid;
        place-items:center;
        width:30px;
        height:30px;
        margin-top:1px;
        border:1px solid rgba(224,211,255,.78);
        border-radius:8px;
        background:rgba(174,143,255,.2);
        color:#e7ddff;
        font:900 .7rem/1 ui-monospace,monospace;
        letter-spacing:.04em;
        box-shadow:0 0 12px rgba(169,135,255,.2);
      }
      .muenba-case-choice-text { flex:1; min-width:0; }
      .muenba-case-choice:hover,
      .muenba-case-choice:focus-visible {
        border-color:#d9c9ff;
        background:linear-gradient(105deg,rgba(112,79,202,.58),rgba(51,35,106,.68));
        box-shadow:0 0 22px rgba(133,101,231,.38),inset 0 1px 0 rgba(255,255,255,.12);
        filter:none;
        outline:none;
      }
      .muenba-case-choice:hover .muenba-case-choice-number,
      .muenba-case-choice:focus-visible .muenba-case-choice-number { border-color:#fff1bd; color:#fff5d5; background:rgba(216,201,139,.24); box-shadow:0 0 16px rgba(216,201,139,.28); }
      .muenba-case-choice:active { transform:translateY(1px) scale(.995); background:rgba(126,91,220,.7); }
      .muenba-case-choice.is-selected { border-color:#fff1bd; background:rgba(126,91,220,.62); box-shadow:0 0 28px rgba(216,201,139,.28); }
      .muenba-case-choice,
      .muenba-case-action,
      .muenba-capture-action { transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease,filter .18s ease; }
      .muenba-case-choice:hover,
      .muenba-case-choice:focus-visible,
      .muenba-case-action:hover,
      .muenba-case-action:focus-visible,
      .muenba-capture-action:hover,
      .muenba-capture-action:focus-visible { transform:translateY(-1px); }
      .muenba-case-action,
      #muenba-lobby-begin,
      #muenba-room-nuppi-close,
      .muenba-capture-action { border-color:rgba(156,224,193,.78); box-shadow:0 0 20px rgba(93,208,140,.26),inset 0 0 12px rgba(156,224,193,.08); }
      .muenba-case-action:hover,
      .muenba-case-action:focus-visible,
      #muenba-lobby-begin:hover,
      #muenba-lobby-begin:focus-visible,
      #muenba-room-nuppi-close:hover,
      #muenba-room-nuppi-close:focus-visible,
      .muenba-capture-action:hover,
      .muenba-capture-action:focus-visible { border-color:#d5ffe7; box-shadow:0 0 30px rgba(93,208,140,.42),inset 0 0 16px rgba(156,224,193,.14); }
      /* Pass 3: Nuppi's dialogue and mission cards. The portrait remains the
         character layer, while these surfaces make his message feel spoken
         and the next action feel like a scene transition. */
      .muenba-nuppi-scene { width:min(540px,100%); }
      .muenba-nuppi-scene .muenba-lobby-portrait { margin-bottom:7px; }
      .muenba-nuppi-kicker { margin:0 0 2px; color:#e8d794; font:900 .64rem/1.4 ui-monospace,monospace; letter-spacing:.18em; text-align:center; text-transform:uppercase; text-shadow:0 0 12px rgba(241,215,141,.2); }
      .muenba-nuppi-kicker-jp { margin:0 0 13px !important; color:#b7bd91 !important; font-size:.72rem !important; letter-spacing:.08em !important; }
      .muenba-nuppi-nameplate { margin:0 0 17px; text-align:center; }
      .muenba-nuppi-nameplate h2 { margin:0 0 3px; color:#f5f3df; font-size:clamp(1.22rem,3vw,1.42rem); letter-spacing:.1em; }
      .muenba-nuppi-nameplate span { color:#b5d8c7; font:400 .82rem/1.4 Georgia,'Times New Roman',serif; letter-spacing:.08em; }
      .muenba-nuppi-speech,
      .muenba-nuppi-mission,
      .muenba-nuppi-status-card,
      .muenba-nuppi-success-card,
      .muenba-nuppi-next-card { position:relative; box-sizing:border-box; border-radius:14px; text-align:left; }
      .muenba-nuppi-speech { margin:0 0 14px; padding:16px 17px 13px; border:1px solid rgba(156,224,193,.42); border-left:3px solid rgba(156,224,193,.82); background:linear-gradient(145deg,rgba(52,104,78,.2),rgba(8,35,27,.48)); box-shadow:0 0 22px rgba(93,162,124,.12),inset 0 0 20px rgba(156,224,193,.035); }
      .muenba-nuppi-speech::after { position:absolute; left:25px; bottom:-8px; width:14px; height:14px; border-right:1px solid rgba(156,224,193,.42); border-bottom:1px solid rgba(156,224,193,.42); background:#0a281f; content:""; transform:rotate(45deg); }
      .muenba-nuppi-speech-label,
      .muenba-nuppi-card-label { margin:0 0 8px; color:#9ce0c1; font:900 .62rem/1.35 ui-monospace,monospace; letter-spacing:.15em; text-transform:uppercase; }
      .muenba-nuppi-speech p { margin:0 0 6px; color:#f0f8f3; font-size:1rem; line-height:1.5; }
      .muenba-nuppi-speech p.jp-line { margin:0; color:#a8cbbb; font-size:.84rem; line-height:1.55; }
      .muenba-nuppi-mission { margin:0 0 20px; padding:16px 17px 14px; border:1px solid rgba(216,201,139,.32); background:linear-gradient(145deg,rgba(126,111,48,.13),rgba(35,34,17,.18)); }
      .muenba-nuppi-mission .muenba-nuppi-card-label,
      .muenba-nuppi-case-board .muenba-nuppi-card-label { color:#e8d794; }
      .muenba-nuppi-mission p { margin:0 0 8px; color:#e4ebdf; font-size:.91rem; line-height:1.58; }
      .muenba-nuppi-mission p.jp-line { margin:0; color:#a9bd9e; font-size:.8rem; line-height:1.6; }
      .muenba-nuppi-case-board .muenba-nuppi-kicker { margin-top:-4px; }
      .muenba-nuppi-case-board .muenba-case-board-eyebrow { margin-top:3px; }
      .muenba-nuppi-case-board .muenba-lobby-case-board { margin-top:18px; border-color:rgba(216,201,139,.52); background:linear-gradient(145deg,rgba(126,111,48,.17),rgba(31,32,19,.3)); box-shadow:inset 0 0 22px rgba(216,201,139,.04); }
      .muenba-nuppi-case-board .muenba-lobby-case-board h3 { text-shadow:0 0 16px rgba(255,233,148,.16); }
      .muenba-nuppi-status-card { margin:4px 0 20px; padding:14px 16px 12px; border:1px solid rgba(156,224,193,.24); background:rgba(156,224,193,.045); }
      .muenba-nuppi-status-card.is-ready { border-color:rgba(241,215,141,.58); background:linear-gradient(145deg,rgba(126,111,48,.18),rgba(83,60,20,.12)); box-shadow:0 0 26px rgba(216,201,139,.14); }
      .muenba-nuppi-status-card.is-ready .muenba-nuppi-card-label { color:#f1d78d; }
      .muenba-nuppi-status-card p,
      .muenba-nuppi-success-card p,
      .muenba-nuppi-next-card p { margin:0; color:#dae9df; font-size:.9rem; line-height:1.5; }
      .muenba-nuppi-success-card,
      .muenba-nuppi-next-card { margin:0 0 12px; padding:14px 16px 12px; }
      .muenba-nuppi-success-card { border:1px solid rgba(156,224,193,.48); background:linear-gradient(145deg,rgba(52,104,78,.22),rgba(8,35,27,.38)); box-shadow:0 0 28px rgba(93,162,124,.14); }
      .muenba-nuppi-success-card .muenba-nuppi-card-label { color:#baf4d3; }
      .muenba-nuppi-success-card p.jp-line,
      .muenba-nuppi-next-card p.jp-line { margin-top:6px; color:#a8cbbb; font-size:.8rem; }
      .muenba-nuppi-next-card { border:1px solid rgba(170,150,255,.34); background:linear-gradient(145deg,rgba(83,61,155,.14),rgba(38,29,81,.2)); }
      .muenba-nuppi-next-card .muenba-nuppi-card-label { color:#c9baff; }
      .muenba-nuppi-handoff .muenba-nuppi-nameplate { margin-bottom:14px; }
      /* Pass 4: case and capture phases. Each screen keeps the shared shell,
         but its accent tells the player what kind of moment this is. */
      .muenba-case-intro,
      .muenba-case-clue,
      .muenba-case-review,
      .muenba-case-resolved,
      .muenba-case-solved,
      .muenba-capture-ready,
      .muenba-capture-result,
      .muenba-capture-reward { width:min(600px,100%); }
      .muenba-case-intro { border-color:rgba(216,201,139,.68); box-shadow:0 24px 80px rgba(0,0,0,.82),0 0 70px rgba(126,111,48,.24),inset 0 0 70px rgba(0,0,0,.58); }
      .muenba-case-intro .muenba-lobby-portrait,
      .muenba-case-resolved .muenba-lobby-portrait { width:108px; height:108px; filter:drop-shadow(0 0 22px rgba(216,201,139,.38)); }
      .muenba-case-intro h2,
      .muenba-case-resolved h2 { font-size:clamp(1.32rem,4vw,1.72rem); }
      .muenba-case-intro .muenba-case-record { margin-top:20px !important; padding:18px 18px 17px; border-left-width:4px; border-color:#ead68c; background:linear-gradient(110deg,rgba(126,111,48,.2),rgba(216,201,139,.05)); color:#fff7dc !important; font-size:1.05rem !important; line-height:1.62 !important; box-shadow:inset 0 0 22px rgba(216,201,139,.035); }
      .muenba-case-mode-card { margin:16px 0 20px; border-color:rgba(170,150,255,.42); background:linear-gradient(135deg,rgba(83,61,155,.14),rgba(38,29,81,.18)); box-shadow:0 0 20px rgba(100,77,184,.12); }
      .muenba-case-mode-card .muenba-case-direction-en { color:#eeeaff; font-size:.92rem; font-weight:700; }
      .muenba-case-mode-card .muenba-case-direction-jp { color:#c9baff; }
      .muenba-case-intro .muenba-case-action,
      .muenba-case-resolved .muenba-case-action { min-width:210px; padding:13px 28px; }
      .muenba-case-clue { border-color:rgba(156,224,193,.62); }
      .muenba-case-clue .muenba-case-mode-label { margin:2px 0 16px; padding:8px 11px; border:1px solid rgba(216,201,139,.34); border-radius:9px; background:rgba(216,201,139,.07); color:#ffe9a9; box-shadow:inset 0 0 14px rgba(216,201,139,.035); }
      .muenba-case-clue .muenba-case-mode-label small { color:#c9c49d; }
      .muenba-case-clue .muenba-case-progress { margin-top:3px; color:#e7dca9; }
      .muenba-case-clue .muenba-case-progress-jp { color:#9fc3af; }
      .muenba-case-clue h2 { margin:15px 0 4px; color:#f4f1d9; font-size:clamp(1.22rem,3.5vw,1.48rem); text-align:left; }
      .muenba-case-clue .muenba-case-record { margin-top:8px !important; padding:17px 17px 16px; border-left-width:4px; border-color:#b9e2a0; background:linear-gradient(110deg,rgba(104,139,83,.19),rgba(156,224,193,.045)); font-size:1.04rem !important; line-height:1.68 !important; }
      .muenba-case-resolved { border-color:rgba(241,215,141,.78); box-shadow:0 24px 80px rgba(0,0,0,.82),0 0 76px rgba(216,201,139,.28),inset 0 0 70px rgba(0,0,0,.58); }
      .muenba-case-resolved .muenba-case-eyebrow { color:#fff0a9; text-shadow:0 0 18px rgba(255,224,102,.28); font-size:.72rem; }
      .muenba-case-resolved .muenba-case-eyebrow-jp { color:#d8c98b; }
      .muenba-case-resolved .muenba-case-record { margin-top:20px !important; padding:18px; border-left-width:4px; border-color:#e6d278; background:linear-gradient(110deg,rgba(126,111,48,.22),rgba(216,201,139,.05)); color:#fff5d5 !important; font-size:1.05rem !important; line-height:1.64 !important; }
      .muenba-case-resolution-direction { margin-top:16px; border-color:rgba(156,224,193,.38); background:linear-gradient(145deg,rgba(52,104,78,.15),rgba(8,35,27,.28)); }
      .muenba-case-resolution-direction .muenba-case-direction-en { color:#e6f7ec; font-weight:700; }
      .muenba-case-resolved .muenba-case-resolution-direction { border-color:rgba(241,215,141,.58); background:linear-gradient(145deg,rgba(126,111,48,.22),rgba(83,60,20,.16)); box-shadow:0 0 22px rgba(216,201,139,.14),inset 0 0 18px rgba(216,201,139,.04); }
      .muenba-case-resolved .muenba-case-resolution-direction .muenba-case-direction-en { color:#fff2c7; text-shadow:0 0 12px rgba(255,224,102,.14); }
      .muenba-case-resolved .muenba-case-resolution-direction .muenba-case-direction-jp { color:#d7c68f; }
      .muenba-case-solved { border-color:rgba(74,222,128,.82); background:radial-gradient(circle at 50% 8%,rgba(74,222,128,.14),transparent 42%),linear-gradient(145deg,rgba(7,33,24,.98),rgba(4,13,18,.99)); box-shadow:0 24px 80px rgba(0,0,0,.86),0 0 70px rgba(74,222,128,.24),inset 0 0 58px rgba(74,222,128,.06); }
      .muenba-case-solved .muenba-lobby-portrait { width:132px; height:132px; filter:drop-shadow(0 0 26px rgba(74,222,128,.38)) drop-shadow(0 0 34px rgba(216,201,139,.18)); }
      .muenba-case-solved h2 { color:#efffd6; font-size:clamp(1.42rem,4vw,1.85rem); text-shadow:0 0 18px rgba(74,222,128,.28); }
      .muenba-case-solved .muenba-case-resolution-direction { border-color:rgba(74,222,128,.42); background:rgba(74,222,128,.07); }
      .muenba-case-solved .muenba-case-resolution-direction .muenba-case-direction-en { color:#efffd6; font-weight:700; }
      .muenba-case-solved .muenba-case-resolution-direction .muenba-case-direction-jp { color:#b9dfc7; }
      .muenba-energy-collection-action { box-sizing:border-box; min-height:64px; min-width:260px; padding:14px 28px !important; border:1.5px solid #4ade80 !important; border-radius:999px !important; background:linear-gradient(180deg,#1f3a2b 0%,#12241a 100%) !important; color:#fff7e6 !important; box-shadow:0 0 26px rgba(74,222,128,.3),inset 0 0 16px rgba(74,222,128,.08) !important; }
      .muenba-energy-collection-action span { color:#fff7e6; font:700 20px/1.2 Georgia,'Times New Roman',serif; }
      .muenba-energy-collection-action small { margin-top:4px; color:#facc15 !important; font:400 13px/1.2 Georgia,'Times New Roman',serif; }
      .muenba-energy-collection-action:hover, .muenba-energy-collection-action:focus-visible { border-color:#86efac !important; background:linear-gradient(180deg,#28543a 0%,#163522 100%) !important; box-shadow:0 0 34px rgba(74,222,128,.48),inset 0 0 18px rgba(74,222,128,.12) !important; outline:none; }
      .muenba-capture-ready { border-color:rgba(170,150,255,.7); background:radial-gradient(circle at 50% 8%,rgba(116,46,168,.2),transparent 42%),linear-gradient(145deg,rgba(19,11,43,.97),rgba(6,13,25,.98)); box-shadow:0 24px 80px rgba(0,0,0,.86),0 0 65px rgba(111,66,210,.28),inset 0 0 55px rgba(49,205,154,.07); }
      .muenba-capture-ready .muenba-lobby-portrait { width:136px; height:136px; filter:drop-shadow(0 0 24px rgba(190,119,255,.42)) drop-shadow(0 0 36px rgba(39,255,145,.12)); }
      .muenba-capture-phase-label { margin:0 0 8px; color:#d8c98b; font:900 .65rem/1.4 ui-monospace,monospace; letter-spacing:.18em; text-align:center; text-transform:uppercase; text-shadow:0 0 14px rgba(216,201,139,.22); }
      .muenba-capture-ready .muenba-capture-phase-label { color:#c9baff; text-shadow:0 0 16px rgba(190,119,255,.3); }
      .muenba-capture-ready h2 { color:#f4e8ff; font-size:clamp(1.42rem,4vw,1.82rem); text-shadow:0 0 18px rgba(190,119,255,.3); }
      .muenba-capture-ready .muenba-ghost-flavor { margin-top:16px !important; border:1px solid rgba(241,181,82,.5); border-left:4px solid rgba(255,185,72,.9); border-radius:10px; background:linear-gradient(105deg,rgba(151,83,23,.3),rgba(83,47,18,.2)); color:#ffe6ad !important; box-shadow:0 0 20px rgba(255,145,45,.14),inset 0 0 18px rgba(255,185,72,.05); }
      .muenba-capture-ready .muenba-ghost-flavor-jp { color:#e6c88e !important; }
      .muenba-capture-direction { border-color:rgba(170,150,255,.36); background:rgba(83,61,155,.12); }
      .muenba-capture-ready .muenba-capture-direction .muenba-case-direction-en { color:#f2edff; font-weight:700; }
      .muenba-capture-ready .muenba-capture-action { min-width:190px; padding:13px 30px; border-color:rgba(190,119,255,.78); background:rgba(116,46,168,.24); box-shadow:0 0 26px rgba(111,66,210,.32),inset 0 0 14px rgba(190,119,255,.08); }
      .muenba-capture-ready .muenba-capture-action:hover,
      .muenba-capture-ready .muenba-capture-action:focus-visible { border-color:#e2d4ff; background:rgba(116,46,168,.42); box-shadow:0 0 38px rgba(190,119,255,.5),inset 0 0 18px rgba(190,119,255,.14); }
      /* Direction panels and primary actions: make the next step unmistakable. */
      .muenba-case-box .muenba-case-resolution-direction { border-color:rgba(196,130,255,.82); background:linear-gradient(145deg,rgba(103,57,164,.3),rgba(28,12,58,.46)); box-shadow:0 0 30px rgba(163,92,255,.34),inset 0 0 22px rgba(148,82,255,.13); }
      .muenba-case-box .muenba-case-resolution-direction .muenba-case-direction-en { color:#fff4ff; text-shadow:0 0 14px rgba(206,157,255,.34); }
      .muenba-case-box .muenba-case-resolution-direction .muenba-case-direction-jp { color:#e0caff; }
      .muenba-capture-ready .muenba-capture-direction { border-color:rgba(255,165,74,.84); background:linear-gradient(145deg,rgba(133,56,22,.32),rgba(62,24,10,.44)); box-shadow:0 0 30px rgba(255,132,45,.36),inset 0 0 22px rgba(255,141,49,.13); }
      .muenba-capture-ready .muenba-capture-direction .muenba-case-direction-en { color:#fff4e4; text-shadow:0 0 14px rgba(255,166,83,.32); }
      .muenba-capture-ready .muenba-capture-direction .muenba-case-direction-jp { color:#ffd3a8; }
      .muenba-gold-action { color:#fff8d5 !important; border-color:#f7d86e !important; background:linear-gradient(180deg,rgba(160,111,20,.58),rgba(80,45,8,.72)) !important; box-shadow:0 0 24px rgba(255,198,64,.5),inset 0 0 14px rgba(255,228,132,.14) !important; text-shadow:0 0 10px rgba(255,232,154,.25); animation:muenbaGoldActionGlow 2.2s ease-in-out infinite; }
      .muenba-gold-action:hover,
      .muenba-gold-action:focus-visible { border-color:#fff1a5 !important; background:linear-gradient(180deg,rgba(188,139,27,.72),rgba(103,59,9,.82)) !important; box-shadow:0 0 38px rgba(255,198,64,.68),inset 0 0 18px rgba(255,228,132,.2) !important; }
      @keyframes muenbaGoldActionGlow { 0%,100% { box-shadow:0 0 20px rgba(255,198,64,.38),inset 0 0 14px rgba(255,228,132,.1); } 50% { box-shadow:0 0 34px rgba(255,211,87,.68),inset 0 0 18px rgba(255,228,132,.18); } }
      /* Pass 1: reading attention gate. The case action wakes only after
         the authored English record has had a short reading pause. */
      .muenba-case-action.muenba-read-locked { cursor:wait; opacity:.52; filter:grayscale(.38) saturate(.55); color:#a9b9b0 !important; border-color:rgba(132,157,145,.42) !important; background:rgba(32,53,44,.24) !important; box-shadow:0 0 8px rgba(93,162,124,.08),inset 0 0 10px rgba(156,224,193,.03) !important; animation:none !important; transform:none !important; }
      .muenba-case-action.muenba-read-locked small { color:#8ea99a; }
      .muenba-case-action.muenba-read-ready { color:#fff8d5 !important; border-color:#f7d86e !important; background:linear-gradient(180deg,rgba(160,111,20,.58),rgba(80,45,8,.72)) !important; box-shadow:0 0 24px rgba(255,198,64,.5),inset 0 0 14px rgba(255,228,132,.14) !important; text-shadow:0 0 10px rgba(255,232,154,.25); animation:muenbaGoldActionGlow 2.2s ease-in-out infinite; }
      .muenba-case-action.muenba-read-ready:hover,
      .muenba-case-action.muenba-read-ready:focus-visible { border-color:#fff1a5 !important; background:linear-gradient(180deg,rgba(188,139,27,.72),rgba(103,59,9,.82)) !important; box-shadow:0 0 38px rgba(255,198,64,.68),inset 0 0 18px rgba(255,228,132,.2) !important; }
      .muenba-case-action.muenba-read-locked:hover,
      .muenba-case-action.muenba-read-locked:focus-visible { transform:none !important; }
      .muenba-capture-result { min-height:300px; }
      .muenba-capture-result .muenba-lobby-portrait { width:116px; height:116px; }
      .muenba-capture-result h2 { font-size:clamp(1.3rem,4vw,1.72rem); }
      .muenba-capture-result > p:not(.jp):not(.muenba-rhythm-combo) { color:#e4eee7; font-size:.96rem; line-height:1.58; }
      .muenba-capture-result .muenba-case-direction { margin-top:17px; }
      .muenba-capture-reward { border-color:rgba(183,255,83,.72); background:radial-gradient(circle at 50% 8%,rgba(132,255,77,.13),transparent 38%),linear-gradient(145deg,rgba(7,33,24,.98),rgba(4,13,18,.99)); box-shadow:0 24px 80px rgba(0,0,0,.86),0 0 70px rgba(79,255,151,.25),inset 0 0 58px rgba(132,255,77,.06); }
      .muenba-capture-reward .muenba-lobby-portrait { width:132px; height:132px; filter:drop-shadow(0 0 26px rgba(132,255,77,.38)) drop-shadow(0 0 34px rgba(216,201,139,.18)); }
      .muenba-capture-reward .muenba-capture-phase-label { color:#c9ff54; text-shadow:0 0 16px rgba(132,255,77,.3); }
      .muenba-capture-reward h2 { color:#efffd6; font-size:clamp(1.42rem,4vw,1.85rem); text-shadow:0 0 18px rgba(132,255,77,.28); }
      .muenba-capture-reward > p:not(.jp):not(.muenba-orb-release-status) { color:#e4f7df; font-size:.98rem; line-height:1.58; }
      .muenba-capture-reward .muenba-capture-direction { border-color:rgba(183,255,83,.3); background:rgba(132,255,77,.06); }
      .muenba-capture-reward .muenba-orb-release-list { margin-top:16px; padding:10px 8px; border:1px solid rgba(183,255,83,.2); border-radius:12px; background:rgba(132,255,77,.035); }
      .muenba-energy-warning { margin:16px 0 14px; border:1px solid rgba(255,82,96,.78); border-left:4px solid #ff7180; border-radius:10px; background:linear-gradient(105deg,rgba(125,24,34,.4),rgba(62,10,20,.34)); box-shadow:0 0 24px rgba(235,28,57,.28),inset 0 0 18px rgba(255,82,96,.08); animation:muenbaEnergyWarningPulse 1.7s ease-in-out infinite; }
      .muenba-energy-warning .muenba-case-direction-en { color:#fff1f2; font-size:1rem; font-weight:900; text-shadow:0 0 12px rgba(255,116,127,.32); }
      .muenba-energy-warning .muenba-case-direction-jp { color:#ffc4c9; font-size:.86rem; }
      @keyframes muenbaEnergyWarningPulse { 0%,100% { box-shadow:0 0 18px rgba(235,28,57,.2),inset 0 0 14px rgba(255,82,96,.06); } 50% { box-shadow:0 0 34px rgba(235,28,57,.48),inset 0 0 20px rgba(255,82,96,.12); } }
      /* Pass 5: final readability and device safeguards. */
      .muenba-lobby-box > *,
      .muenba-lobby-box h2,
      .muenba-lobby-box h3,
      .muenba-lobby-box p,
      .muenba-case-direction-en,
      .muenba-case-direction-jp,
      .muenba-case-choice-text { min-width:0; overflow-wrap:anywhere; }
      .muenba-case-progress,
      .muenba-case-progress-jp { overflow-wrap:anywhere; }
      .muenba-lobby-box ruby { white-space:normal; }
      .muenba-lobby-actions,
      .muenba-case-actions { align-items:stretch; }
      .muenba-lobby-actions button,
      .muenba-case-actions button { max-width:100%; }
      .muenba-case-choice { text-align:left; }
      @media (max-width:420px) {
        .muenba-lobby-box { padding:20px 14px 17px; }
        .muenba-lobby-box h2 { font-size:1.12rem; }
        .muenba-case-intro h2,
        .muenba-case-resolved h2 { font-size:1.28rem; }
        .muenba-case-intro .muenba-lobby-portrait,
        .muenba-case-resolved .muenba-lobby-portrait { width:88px; height:88px; }
        .muenba-capture-ready .muenba-lobby-portrait,
        .muenba-capture-reward .muenba-lobby-portrait { width:112px; height:112px; }
        .muenba-case-choice { gap:9px; min-height:54px; padding:11px 10px 11px 9px; font-size:.9rem; }
        .muenba-case-choice-number { width:27px; height:27px; font-size:.64rem; }
        .muenba-case-action,
        .muenba-capture-ready .muenba-capture-action { min-width:0; width:100%; }
      }
      @media (max-height:720px) and (min-width:421px) {
        .muenba-lobby-box { max-height:calc(100dvh - 20px); padding:19px 22px 18px; }
        .muenba-lobby-portrait { width:76px; height:76px; margin-bottom:7px; }
        .muenba-case-intro .muenba-lobby-portrait,
        .muenba-case-resolved .muenba-lobby-portrait { width:82px; height:82px; }
        .muenba-capture-ready .muenba-lobby-portrait,
        .muenba-capture-reward .muenba-lobby-portrait { width:96px; height:96px; }
        .muenba-case-record { margin-top:11px !important; padding:12px 14px !important; }
        .muenba-case-intro .muenba-case-record,
        .muenba-case-resolved .muenba-case-record { font-size:.92rem !important; }
      }
      @media (max-width:640px) {
        .muenba-lobby-box { width:min(100%,calc(100vw - 24px)); max-height:calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)); padding:24px 18px 20px; border-radius:16px; }
        .muenba-lobby-box::after { top:11px; width:72px; }
        .muenba-lobby-portrait { width:82px; height:82px; margin-bottom:10px; }
        .muenba-case-question { padding:15px 14px 14px; }
        .muenba-case-choice { min-height:58px; padding:12px 12px 12px 10px; }
        .muenba-nuppi-speech, .muenba-nuppi-mission, .muenba-nuppi-status-card, .muenba-nuppi-success-card, .muenba-nuppi-next-card { padding-left:13px; padding-right:13px; }
      }
      /* Pass 27C: portrait popups are a phone-only presentation. The world
         stays landscape; once a popup opens, give the reading card the full
         narrow viewport, preserve both safe areas, and keep one deliberate
         vertical scroll surface. */
      html.muenba-phone-portrait #muenba-return-overlay,
      html.muenba-phone-portrait #muenba-lobby-overlay,
      html.muenba-phone-portrait #muenba-capture-overlay { align-items:flex-start; justify-content:center; padding:max(10px,env(safe-area-inset-top,0px)) max(10px,env(safe-area-inset-right,0px)) max(10px,env(safe-area-inset-bottom,0px)) max(10px,env(safe-area-inset-left,0px)); overscroll-behavior:contain; touch-action:pan-y; }
      html.muenba-phone-portrait #muenba-lobby-overlay,
      html.muenba-phone-portrait #muenba-capture-overlay { -webkit-overflow-scrolling:touch; }
      html.muenba-phone-portrait .muenba-return-box,
      html.muenba-phone-portrait .muenba-lobby-box { width:min(100%,calc(100vw - 20px)); max-height:calc(100dvh - 20px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)); margin:0 auto; border-radius:14px; }
      html.muenba-phone-portrait .muenba-return-box { overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; padding:22px 17px 18px; }
      html.muenba-phone-portrait .muenba-lobby-box { padding:20px 14px 18px; }
      html.muenba-phone-portrait .muenba-lobby-portrait { width:76px; height:76px; margin-bottom:8px; }
      html.muenba-phone-portrait .muenba-case-intro .muenba-lobby-portrait,
      html.muenba-phone-portrait .muenba-case-resolved .muenba-lobby-portrait { width:86px; height:86px; }
      html.muenba-phone-portrait .muenba-capture-ready .muenba-lobby-portrait,
      html.muenba-phone-portrait .muenba-capture-reward .muenba-lobby-portrait { width:104px; height:104px; }
      html.muenba-phone-portrait .muenba-case-clue { padding:21px 13px 19px; }
      html.muenba-phone-portrait .muenba-case-clue.muenba-reading { min-height:270px; }
      html.muenba-phone-portrait .muenba-case-clue.muenba-reading > .muenba-case-record { padding:20px 10px 19px; font-size:clamp(1.15rem,5.7vw,1.48rem) !important; line-height:1.78 !important; }
      html.muenba-phone-portrait .muenba-case-check-panel { padding:15px 12px 14px; }
      html.muenba-phone-portrait .muenba-case-check-panel .muenba-case-question { padding:16px 13px 15px; }
      html.muenba-phone-portrait .muenba-case-choice { min-height:58px; padding:13px 11px 13px 9px; font-size:clamp(.94rem,4.4vw,1.05rem) !important; }
      html.muenba-phone-portrait .muenba-rhythm-board { height:min(42dvh,250px); min-height:190px; margin:7px 0 5px; gap:6px; padding:4px; }
      html.muenba-phone-portrait .muenba-rhythm-lane { height:100%; }
      html.muenba-phone-portrait .muenba-rhythm-note { min-width:30px; min-height:30px; }
      html.muenba-phone-portrait .muenba-lobby-actions,
      html.muenba-phone-portrait .muenba-case-actions { gap:8px; }
      html.muenba-phone-portrait .muenba-lobby-actions button,
      html.muenba-phone-portrait .muenba-case-actions button,
      html.muenba-phone-portrait .muenba-capture-action { min-height:48px; }
      /* Pass 27D: rhythm is its own portrait surface. Keep the active chart
         and its lane controls together, while leaving the normal reading
         popup proportions untouched. The class remains through countdown,
         help, result, and reward until the capture session closes. */
      html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode { overscroll-behavior:contain; }
      html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-lobby-box { padding:16px 10px 14px; }
      html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-rhythm-halloween-box h2 { margin-bottom:2px; font-size:clamp(1.15rem,6vw,1.5rem); }
      html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-rhythm-board { height:min(42dvh,250px); min-height:190px; margin:7px 0 5px; gap:6px; padding:4px; }
      html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-rhythm-lane { height:100%; min-height:190px; }
      html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-rhythm-lane-label { font-size:.52rem; letter-spacing:.01em; }
      html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-rhythm-note { width:34px; height:34px; min-width:30px; min-height:30px; font-size:.9rem; }
      html.muenba-phone-portrait #muenba-capture-overlay.muenba-rhythm-mode .muenba-rhythm-help-button { top:8px; left:8px; }
      /* Pass 27F: popup surfaces own the gesture. The overlay can scroll
         vertically, but its edge must not hand the gesture to the page or
         trigger mobile pull-to-refresh. */
      html.muenba-popup-open,
      html.muenba-popup-open body { overscroll-behavior:none; }
      #muenba-lobby-overlay,
      #muenba-capture-overlay,
      #muenba-return-overlay { overscroll-behavior-y:contain; touch-action:pan-y; -webkit-overflow-scrolling:touch; height:var(--muenba-viewport-height,100dvh); min-height:var(--muenba-viewport-height,100dvh); }
      .muenba-lobby-box,
      .muenba-return-box { overscroll-behavior:contain; }
      /* Pass 18D: the English record is the lesson surface. Keep it tall
         enough for a calm word sweep, give beginner readers generous line
         spacing, and preserve a reliable touch target even on narrow phones. */
      .muenba-case-clue { padding:30px 26px 28px; }
      .muenba-case-clue .muenba-case-mode-label { margin-bottom:18px; font-size:.74rem; letter-spacing:.1em; }
      .muenba-case-clue .muenba-case-progress { margin-bottom:4px; font-size:.74rem; letter-spacing:.11em; }
      .muenba-case-clue .muenba-case-progress-jp { margin-bottom:13px; font-size:.8rem; }
      .muenba-case-clue h2 { margin:17px 0 7px; font-size:clamp(1.28rem,3.5vw,1.52rem); line-height:1.25; }
      .muenba-case-clue .muenba-case-record { min-height:120px; box-sizing:border-box; padding:20px 20px 19px; font-size:clamp(1.16rem,2.35vw,1.38rem) !important; line-height:1.82 !important; letter-spacing:.015em; }
      .muenba-case-clue .muenba-case-reading-status { margin-top:17px; padding:12px 14px; }
      .muenba-case-check-panel { padding:18px 16px 16px; }
      .muenba-case-check-panel .muenba-case-question { padding:18px 17px 17px; }
      .muenba-case-check-panel .muenba-case-question .muenba-case-direction-en { font-size:clamp(1.08rem,2.8vw,1.24rem); line-height:1.5; }
      .muenba-case-check-panel .muenba-case-choice { min-height:62px; padding:13px 15px 13px 12px; font-size:1rem; line-height:1.5; }
      @media (max-width:640px) {
        .muenba-case-clue { padding:24px 16px 22px; }
        .muenba-case-clue .muenba-case-record { min-height:120px; padding:18px 16px 17px; font-size:1.16rem !important; line-height:1.82 !important; }
        .muenba-case-check-panel { padding:15px 12px 13px; }
        .muenba-case-check-panel .muenba-case-choice { min-height:60px; padding:12px 12px 12px 10px; font-size:.98rem; }
      }
      /* Pass 18E: a wrong clue answer is a soft reset, not a punishment loop.
         Keep the evidence visible during the short cooldown, then reread the
         same record before presenting a fresh answer order. */
      .muenba-case-choice.is-wrong { border-color:rgba(255,130,145,.88) !important; background:rgba(125,24,34,.32) !important; color:#ffe2df !important; box-shadow:0 0 22px rgba(235,28,57,.22) !important; animation:muenbaCaseWrongChoice .36s ease-out; }
      .muenba-case-choice.is-cooldown { opacity:.48; cursor:wait; }
      .muenba-case-choice:disabled { pointer-events:none; }
      .muenba-case-wrong-state { animation:muenbaCaseWrongPanel .42s ease-out; }
      @keyframes muenbaCaseWrongChoice { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-5px); } 50% { transform:translateX(5px); } 75% { transform:translateX(-3px); } }
      @keyframes muenbaCaseWrongPanel { 0%,100% { transform:translateX(0); } 22% { transform:translateX(-3px); } 44% { transform:translateX(3px); } 66% { transform:translateX(-2px); } }
      /* Pass 19B: the clue has two visual states. During the word sweep,
         English is the only learner-facing surface. Once the sweep and its
         final hold finish, the supporting UI fades back in together. */
      .muenba-case-clue.muenba-reading { display:flex; flex-direction:column; justify-content:center; min-height:clamp(320px,65vh,620px); }
      .muenba-case-clue.muenba-reading > .muenba-case-mode-label,
      .muenba-case-clue.muenba-reading > .muenba-case-progress,
      .muenba-case-clue.muenba-reading > .muenba-case-progress-jp,
      .muenba-case-clue.muenba-reading > h2,
      .muenba-case-clue.muenba-reading > .muenba-case-reading-status,
      .muenba-case-clue.muenba-reading > .muenba-case-check-panel { display:none !important; }
      .muenba-case-clue.muenba-reading > .muenba-case-record { box-sizing:border-box; width:100%; margin:0 auto !important; padding:26px 22px 25px; border-top:1px solid rgba(185,226,160,.32); border-right:0; border-bottom:1px solid rgba(185,226,160,.32); border-left:0; background:linear-gradient(110deg,rgba(104,139,83,.13),rgba(156,224,193,.035)); color:#fff7e6 !important; font-size:clamp(1.2rem,2.35vw,1.625rem) !important; line-height:1.85 !important; text-align:center !important; }
      .muenba-case-clue.muenba-reading-complete > .muenba-case-reading-status,
      .muenba-case-clue.muenba-reading-complete > .muenba-case-check-panel { animation:muenbaCaseStageReveal .4s ease both; }
      @keyframes muenbaCaseStageReveal { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      @media (max-width:640px) {
        .muenba-case-clue.muenba-reading { min-height:300px; }
        .muenba-case-clue.muenba-reading > .muenba-case-record { padding:22px 12px; font-size:clamp(1.18rem,5.2vw,1.42rem) !important; line-height:1.82 !important; }
      }
      /* Pass 19C: make the English record the visual hero. The old keyword
         pills repeated words already highlighted in the sentence, so the
         sentence now carries the vocabulary emphasis by itself. Questions
         and choices stay large enough for young readers to tap comfortably. */
      .muenba-case-clue .muenba-case-record,
      .muenba-case-review .muenba-case-record { font-size:clamp(1.18rem,2.1vw,1.625rem) !important; line-height:1.85 !important; letter-spacing:.015em; }
      .muenba-case-clue .muenba-case-record:not(.muenba-case-sweep) .kw,
      .muenba-case-review .muenba-case-record .kw { font-size:clamp(1.05em,2.2vw,1.077em); line-height:inherit; }
      .muenba-case-clue .muenba-case-direction-jp,
      .muenba-case-review .muenba-case-direction-jp { color:#8093a7 !important; font-size:13px !important; line-height:1.6 !important; opacity:.5; }
      .muenba-case-question .muenba-case-direction-en { color:#e2e8f0 !important; font-size:clamp(1.18rem,2.2vw,1.375rem) !important; line-height:1.45 !important; }
      .muenba-case-check-panel .muenba-case-question { background:#131c27; border-color:rgba(226,232,240,.34); }
      .muenba-case-choice { min-height:62px !important; padding:16px 20px !important; font-size:clamp(1rem,2.1vw,1.125rem) !important; line-height:1.45 !important; }
      @media (max-width:640px) {
        .muenba-case-clue .muenba-case-record,
        .muenba-case-review .muenba-case-record { font-size:clamp(1.18rem,5.2vw,1.625rem) !important; line-height:1.82 !important; }
        .muenba-case-choice { padding:14px 14px !important; }
      }
      /* Pass 19D: let the English mission lead, with Japanese available as
         an intentional hint, and reduce the case-board scene to one eyebrow
         directly above the case title. */
      .muenba-mission-hint-toggle { display:inline-flex; flex-direction:column; align-items:center; gap:2px; margin:4px 0 0; padding:7px 14px; border:1px solid rgba(216,201,139,.5); border-radius:999px; background:rgba(126,111,48,.12); color:#f1d78d; font:700 .72rem/1.25 ui-monospace,monospace; letter-spacing:.04em; cursor:pointer; }
      .muenba-mission-hint-toggle small { color:#a8cbbb; font:400 .76rem/1.3 Georgia,'Times New Roman',serif; letter-spacing:0; }
      .muenba-mission-hint-toggle:hover,
      .muenba-mission-hint-toggle:focus-visible { border-color:#fff0ad; background:rgba(126,111,48,.28); box-shadow:0 0 18px rgba(216,201,139,.2); outline:none; }
      .muenba-nuppi-mission .muenba-mission-hint { margin-top:12px !important; padding-top:12px; border-top:1px solid rgba(216,201,139,.2); }
      .muenba-nuppi-case-board .muenba-lobby-case-board { margin-top:12px; }
      .muenba-nuppi-case-board .muenba-case-board-eyebrow { margin:0 0 10px; text-align:left; }
      .muenba-nuppi-case-board .muenba-lobby-case-board h3 { margin-top:0; font-size:clamp(1.2rem,4vw,1.55rem); }
      /* Pass 19E: responsive safety rails. Long English strings and Japanese
         hint text must wrap inside the card, while the popup keeps a single
         vertical scroll surface and visible safe-area breathing room. */
      .muenba-lobby-box,
      .muenba-lobby-box h2,
      .muenba-lobby-box h3,
      .muenba-lobby-box p,
      .muenba-lobby-box button { min-width:0; overflow-wrap:anywhere; }
      .muenba-lobby-box { overflow-x:hidden; }
      .muenba-lobby-box button { box-sizing:border-box; }
      .muenba-case-record { text-wrap:pretty; }
      .muenba-case-choice-text { overflow-wrap:anywhere; text-wrap:pretty; }
      @media (max-width:640px) {
        .muenba-lobby-box.is-case-board { width:min(100%,calc(100vw - 24px)); padding:24px 16px 22px; }
        .muenba-lobby-case-board { padding:17px 15px 16px; }
        .muenba-lobby-case-board h3 { font-size:clamp(1.15rem,6vw,1.45rem); line-height:1.25; }
        .muenba-nuppi-mission p { font-size:.9rem; line-height:1.6; }
        .muenba-mission-hint-toggle { min-height:42px; }
      }
      @media (prefers-reduced-motion: reduce) { .muenba-orb-release, .muenba-hunt-ghost-portrait, .muenba-gold-action, .muenba-read-ready { animation:none !important; } }
      @media (prefers-reduced-motion: reduce) { #muenba-fade, .muenba-return-box, #muenba-return-overlay, .muenba-lobby-box, #muenba-lobby-overlay, #muenba-capture-overlay { transition:none !important; } .muenba-lobby-portrait, #muenba-hide, #muenba-celebration-status, .muenba-rhythm-board, .muenba-rhythm-combo, .muenba-rhythm-result-failure, .muenba-case-question, .muenba-case-question::before, .muenba-case-feedback-shake, .muenba-case-read-status, .muenba-energy-warning, .muenba-case-clue.muenba-reading-complete > .muenba-case-reading-status, .muenba-case-clue.muenba-reading-complete > .muenba-case-check-panel { animation:none !important; } .muenba-case-choice, .muenba-case-action, .muenba-capture-action { transition:none !important; } .muenba-rhythm-energy-fill { transition:none !important; } #muenba-profile-link { transition:none !important; } }
    `;
    document.head.appendChild(style);
  }

  function buildApp() {
    app = document.createElement('div');
    app.id = 'muenba-app';
    stage = document.createElement('div');
    stage.id = 'muenba-stage';
    roomLayer = document.createElement('div');
    roomLayer.id = 'muenba-room-layer';
    roomTintCanvas = document.createElement('canvas');
    roomTintCanvas.id = 'muenba-room-tint';
    atmosphereCanvas = document.createElement('canvas');
    atmosphereCanvas.id = 'muenba-atmosphere';
    actorCanvas = document.createElement('canvas');
    actorCanvas.id = 'muenba-canvas';
    fadeEl = document.createElement('div');
    fadeEl.id = 'muenba-fade';
    stage.append(roomLayer, roomTintCanvas, atmosphereCanvas, actorCanvas, fadeEl);
    app.appendChild(stage);
    document.body.replaceChildren(app);

    buildReturnPortalOverlay();
    buildNuppiLobbyOverlay();
    buildCaptureOverlay();

    hideBtn = document.createElement('button');
    hideBtn.id = 'muenba-hide';
    hideBtn.type = 'button';
    setHideButtonLabel(false);
    setHideButtonDisabled(false);
    hideBtn.addEventListener('click', toggleHide);
    document.body.appendChild(hideBtn);

    muenbaProfileLink = document.createElement('a');
    muenbaProfileLink.id = 'muenba-profile-link';
    muenbaProfileLink.href = 'muenba-profile.html';
    muenbaProfileLink.setAttribute('aria-label', 'Open Muenba profile');
    muenbaProfileLink.title = 'Open Muenba profile';
    muenbaProfileLink.innerHTML = '<img src="assets/img/muenba/muenba_logo.webp" alt="Muenba profile">';
    document.body.appendChild(muenbaProfileLink);

    returnNuppiHint = document.createElement('div');
    returnNuppiHint.id = 'muenba-return-nuppi-hint';
    returnNuppiHint.innerHTML = 'RETURN TO NUPPI<small>ヌーピーのところへ戻ろう</small>';
    document.body.appendChild(returnNuppiHint);

    celebrationStatus = document.createElement('div');
    celebrationStatus.id = 'muenba-celebration-status';
    celebrationStatus.setAttribute('aria-live', 'polite');
    celebrationStatus.setAttribute('aria-atomic', 'true');
    document.body.appendChild(celebrationStatus);

    // Pass 27A: this gate is state-aware. The world and hunting remain
    // landscape, while popup/rhythm states can request portrait on phones.
    orientationOverlay = document.createElement('div');
    orientationOverlay.id = 'muenba-rotate-overlay';
    orientationOverlay.setAttribute('role', 'alert');
    orientationOverlay.setAttribute('aria-live', 'polite');
    orientationOverlay.setAttribute('aria-hidden', 'true');
    orientationOverlay.innerHTML = '<span class="muenba-rotate-phone" aria-hidden="true"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.4"></rect><line x1="11" y1="18.4" x2="13" y2="18.4"></line></svg></span><div class="muenba-rotate-bar"></div><p class="muenba-rotate-title"></p><p class="muenba-rotate-sub"></p>';
    document.body.appendChild(orientationOverlay);

    roomTintCtx = roomTintCanvas.getContext('2d');
    atmosphereCtx = atmosphereCanvas.getContext('2d');
    actorCtx = actorCanvas.getContext('2d');
    updateMuenbaOrientationGate();
  }

  function resizeCanvas() {
    // Two full-world canvases at DPR 2 are unnecessarily expensive on many
    // touch devices. DPR 1.5 keeps the fixed stage clean while cutting the
    // backing-store pixels substantially; desktop/high-density screens retain
    // the sharper DPR 2 path.
    const maxDpr = TOUCH_DEVICE ? 1.5 : 2;
    const dpr = Math.min(maxDpr, Math.max(1, window.devicePixelRatio || 1));
    for (const canvas of [roomTintCanvas, atmosphereCanvas, actorCanvas]) {
      canvas.width = Math.round(WORLD_W * dpr);
      canvas.height = Math.round(WORLD_H * dpr);
      canvas.style.width = `${WORLD_W}px`;
      canvas.style.height = `${WORLD_H}px`;
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    vignetteCanvas = null;
    carriedEnergyVignetteCanvas = null;
    buildAtmosphereCache();
  }

  function fitStage() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  // Pass 27G: mobile browser chrome can leave innerWidth/innerHeight one
  // resize behind the pixels the player can actually see. Prefer the visual
  // viewport for orientation and popup sizing, with the window dimensions as
  // the stable fallback for browsers that do not expose it.
  function currentMuenbaViewport() {
    const viewport = window.visualViewport;
    const width = Number(viewport?.width) || window.innerWidth;
    const height = Number(viewport?.height) || window.innerHeight;
    return { width, height };
  }

  function updateMuenbaViewportMetrics() {
    const { height } = currentMuenbaViewport();
    document.documentElement.style.setProperty('--muenba-viewport-height', `${Math.max(1, Math.round(height))}px`);
  }

  function isMuenbaPhoneViewport() {
    // A 700px short edge can include small tablets. Keep the handoff limited
    // to phone-sized touch viewports so tablet landscape remains untouched.
    const { width, height } = currentMuenbaViewport();
    return TOUCH_DEVICE && Math.min(width, height) <= 540;
  }

  function currentMuenbaOrientation() {
    const { width, height } = currentMuenbaViewport();
    return width >= height ? 'landscape' : 'portrait';
  }

  function isMuenbaOrientationReady() {
    return !isMuenbaPhoneViewport() || currentMuenbaOrientation() === orientationMode;
  }

  function updateMuenbaOrientationGate() {
    if (!orientationOverlay) return;
    const phone = isMuenbaPhoneViewport();
    const ready = isMuenbaOrientationReady();
    const needsPrompt = phone && !ready;
    // Pass 27F: an open popup owns the touch surface. Keep the document from
    // chaining a downward swipe into browser bounce/pull-to-refresh while the
    // card itself remains an intentional vertical scroll area.
    const popupOpen = lobbyOpen || captureOpen || returnPortalOpen;
    // Pass 27C: scope portrait popup CSS to actual phone mode. A narrow
    // desktop window or tablet must not inherit the phone presentation.
    document.documentElement.classList.toggle('muenba-phone-portrait', phone && orientationMode === 'portrait');
    document.documentElement.classList.toggle('muenba-phone-landscape', phone && orientationMode === 'landscape');
    document.documentElement.classList.toggle('muenba-popup-open', popupOpen);
    const title = orientationOverlay.querySelector('.muenba-rotate-title');
    const sub = orientationOverlay.querySelector('.muenba-rotate-sub');
    if (title) title.textContent = orientationMode === 'portrait'
      ? 'Turn your phone upright'
      : 'Turn your phone sideways!';
    if (sub) sub.innerHTML = orientationMode === 'portrait'
      ? 'Read and play this part in <strong style="color:#a7e1c5">portrait</strong> mode.<br>スマホを<ruby>縦向<rt>たてむ</rt></ruby>きにしてね。'
      : 'Explore Muenba in <strong style="color:#a7e1c5">landscape</strong> mode.<br>スマホを<ruby>横向<rt>よこむ</rt></ruby>きにしてね。';
    orientationOverlay.classList.toggle('is-visible', needsPrompt);
    orientationOverlay.setAttribute('aria-hidden', String(!needsPrompt));
  }

  function setMuenbaOrientationMode(mode) {
    const nextMode = mode === 'portrait' ? 'portrait' : 'landscape';
    const changed = orientationMode !== nextMode;
    if (!changed) return;
    orientationMode = nextMode;
    updateMuenbaOrientationGate();
    if (!isMuenbaPhoneViewport() || isMuenbaOrientationReady()) return;

    // Browsers commonly require this to follow a user gesture or an installed
    // fullscreen app. Failure is expected, so the visible rotate gate remains
    // the dependable fallback instead of blocking the Muenba state machine.
    const orientation = window.screen && window.screen.orientation;
    if (!orientation || typeof orientation.lock !== 'function') return;
    try {
      const request = orientation.lock(`${nextMode}-primary`);
      if (request && typeof request.catch === 'function') {
        request.catch(() => {
          if (orientationMode === nextMode) updateMuenbaOrientationGate();
        });
      }
    } catch (_) { updateMuenbaOrientationGate(); }
  }

  function syncMuenbaOrientationMode() {
    const popupState = lobbyOpen || captureOpen || returnPortalOpen;
    setMuenbaOrientationMode(popupState ? 'portrait' : 'landscape');
  }

  // Pass 27E: closing the last popup is an explicit handoff back to the
  // explorable world. Request landscape immediately from the user's close
  // gesture, then let the normal readiness gate keep movement/input paused
  // until the phone has actually rotated.
  function requestMuenbaLandscapeAfterPopup() {
    if (lobbyOpen || captureOpen || returnPortalOpen) return;
    setMuenbaOrientationMode('landscape');
    scheduleMuenbaOrientationCheck();
  }

  function scheduleMuenbaOrientationCheck() {
    if (orientationCheckTimer) window.clearTimeout(orientationCheckTimer);
    orientationCheckTimer = window.setTimeout(() => {
      orientationCheckTimer = 0;
      updateMuenbaOrientationGate();
    }, 150);
  }

  function bindMuenbaOrientationController() {
    const refreshMuenbaViewport = () => {
      updateMuenbaViewportMetrics();
      scheduleMuenbaOrientationCheck();
    };
    updateMuenbaViewportMetrics();
    window.addEventListener('resize', refreshMuenbaViewport, { passive: true });
    window.addEventListener('orientationchange', refreshMuenbaViewport, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', refreshMuenbaViewport, { passive: true });
    }
    updateMuenbaOrientationGate();
  }

  function buildAtmosphereCache() {
    vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = WORLD_W;
    vignetteCanvas.height = WORLD_H;
    const vctx = vignetteCanvas.getContext('2d');
    // The safe light is slightly off the central path. The corners stay
    // darker, and drawAtmosphere modulates this cached layer slowly so the
    // room feels like it is breathing instead of flashing.
    const gradient = vctx.createRadialGradient(690, 430, 210, 760, 520, 980);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.46, 'rgba(0,0,0,.045)');
    gradient.addColorStop(0.64, 'rgba(0,0,0,.16)');
    gradient.addColorStop(0.80, 'rgba(0,0,0,.42)');
    gradient.addColorStop(0.92, 'rgba(0,0,0,.66)');
    gradient.addColorStop(1, 'rgba(0,0,0,.80)');
    vctx.fillStyle = gradient;
    vctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // A separate return-trip layer is cached once and only composited while
    // Booha carries energy outside room_01. Its tighter center keeps the path
    // readable while the heavy black edges make the cemetery feel actively
    // hostile. One extra drawImage per frame is much cheaper than rebuilding
    // this gradient during the animation loop.
    carriedEnergyVignetteCanvas = document.createElement('canvas');
    carriedEnergyVignetteCanvas.width = WORLD_W;
    carriedEnergyVignetteCanvas.height = WORLD_H;
    const carriedCtx = carriedEnergyVignetteCanvas.getContext('2d');
    const carriedGradient = carriedCtx.createRadialGradient(768, 500, 150, 768, 500, 900);
    carriedGradient.addColorStop(0, 'rgba(0,0,0,.12)');
    carriedGradient.addColorStop(.42, 'rgba(0,0,0,.26)');
    carriedGradient.addColorStop(.68, 'rgba(0,0,0,.52)');
    carriedGradient.addColorStop(.86, 'rgba(0,0,0,.76)');
    carriedGradient.addColorStop(1, 'rgba(0,0,0,.90)');
    carriedCtx.fillStyle = carriedGradient;
    carriedCtx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Shared destination-out mask used by the moving spirit light. It is
    // cached because only its position changes from frame to frame.
    spiritMaskCanvas = document.createElement('canvas');
    spiritMaskCanvas.width = 320;
    spiritMaskCanvas.height = 320;
    const maskCtx = spiritMaskCanvas.getContext('2d');
    const maskGradient = maskCtx.createRadialGradient(160, 160, 0, 160, 160, 160);
    maskGradient.addColorStop(0, 'rgba(0,0,0,.78)');
    maskGradient.addColorStop(.42, 'rgba(0,0,0,.52)');
    maskGradient.addColorStop(.78, 'rgba(0,0,0,.14)');
    maskGradient.addColorStop(1, 'rgba(0,0,0,0)');
    maskCtx.fillStyle = maskGradient;
    maskCtx.fillRect(0, 0, spiritMaskCanvas.width, spiritMaskCanvas.height);

    fogTexture = document.createElement('canvas');
    fogTexture.width = 640;
    fogTexture.height = 180;
    const fctx = fogTexture.getContext('2d');
    const fogGradient = fctx.createRadialGradient(320, 90, 4, 320, 90, 310);
    fogGradient.addColorStop(0, 'rgba(190,215,216,.30)');
    fogGradient.addColorStop(.42, 'rgba(170,205,210,.16)');
    fogGradient.addColorStop(1, 'rgba(170,205,210,0)');
    fctx.fillStyle = fogGradient;
    fctx.fillRect(0, 0, fogTexture.width, fogTexture.height);

    // A flatter, lower bank gives the corridor some depth without introducing
    // a per-frame particle system. It is deliberately softer than the main
    // fog texture so Booha and the exit hotspots remain readable through it.
    lowFogTexture = document.createElement('canvas');
    lowFogTexture.width = 720;
    lowFogTexture.height = 140;
    const lowCtx = lowFogTexture.getContext('2d');
    const lowGradient = lowCtx.createLinearGradient(0, 0, 0, lowFogTexture.height);
    lowGradient.addColorStop(0, 'rgba(170,205,210,0)');
    lowGradient.addColorStop(.34, 'rgba(170,205,210,.08)');
    lowGradient.addColorStop(.72, 'rgba(190,215,216,.18)');
    lowGradient.addColorStop(1, 'rgba(170,205,210,0)');
    lowCtx.fillStyle = lowGradient;
    lowCtx.fillRect(0, 0, lowFogTexture.width, lowFogTexture.height);
    [120, 350, 590].forEach((x, index) => {
      const bank = lowCtx.createRadialGradient(x, 78, 6, x, 78, 150 + index * 18);
      bank.addColorStop(0, 'rgba(205,225,222,.16)');
      bank.addColorStop(.58, 'rgba(180,210,212,.07)');
      bank.addColorStop(1, 'rgba(180,210,212,0)');
      lowCtx.fillStyle = bank;
      lowCtx.beginPath();
      lowCtx.ellipse(x, 78, 150 + index * 18, 42, 0, 0, Math.PI * 2);
      lowCtx.fill();
    });

    // A broad foreground bank moves more slowly than the thin wisps. It sits
    // low on the corridor and gives the background depth while remaining on
    // the atmosphere canvas, beneath every actor and arrow.
    foregroundFogTexture = document.createElement('canvas');
    foregroundFogTexture.width = 1200;
    foregroundFogTexture.height = 180;
    const foregroundCtx = foregroundFogTexture.getContext('2d');
    const foregroundGradient = foregroundCtx.createLinearGradient(0, 0, 0, 180);
    foregroundGradient.addColorStop(0, 'rgba(170,205,210,0)');
    foregroundGradient.addColorStop(.32, 'rgba(170,205,210,.05)');
    foregroundGradient.addColorStop(.72, 'rgba(190,215,216,.13)');
    foregroundGradient.addColorStop(1, 'rgba(160,198,202,.025)');
    foregroundCtx.fillStyle = foregroundGradient;
    foregroundCtx.fillRect(0, 0, 1200, 180);
    [130, 410, 760, 1040].forEach((x, index) => {
      const bank = foregroundCtx.createRadialGradient(x, 112, 4, x, 112, 190 + index * 15);
      bank.addColorStop(0, 'rgba(205,225,222,.11)');
      bank.addColorStop(.56, 'rgba(180,210,212,.045)');
      bank.addColorStop(1, 'rgba(180,210,212,0)');
      foregroundCtx.fillStyle = bank;
      foregroundCtx.beginPath();
      foregroundCtx.ellipse(x, 112, 190 + index * 15, 42, 0, 0, Math.PI * 2);
      foregroundCtx.fill();
    });

    // Thin wisps sit between the background and the actor canvas. They are
    // intentionally soft and stretched so they read as smoke under Booha,
    // not as bright objects floating around the room.
    wispFogTexture = document.createElement('canvas');
    wispFogTexture.width = 900;
    wispFogTexture.height = 120;
    const wispCtx = wispFogTexture.getContext('2d');
    [110, 290, 505, 730].forEach((x, index) => {
      const wisp = wispCtx.createRadialGradient(x, 60, 2, x, 60, 120 + index * 12);
      wisp.addColorStop(0, 'rgba(196,220,216,.13)');
      wisp.addColorStop(.5, 'rgba(174,205,207,.055)');
      wisp.addColorStop(1, 'rgba(174,205,207,0)');
      wispCtx.fillStyle = wisp;
      wispCtx.beginPath();
      wispCtx.ellipse(x, 60, 120 + index * 12, 24 + (index % 2) * 8, 0, 0, Math.PI * 2);
      wispCtx.fill();
    });
  }

  // ── Per-room eerie glow + spirit motes ──────────────────────────────────
  // Every gradient below is built ONCE (cached in a Map, or lazily once for
  // the shared mote sprite) and reused with drawImage() every frame after
  // that. This is the same trick the Maze/Utsuroba passes already used to
  // keep createRadialGradient() off the per-frame hot path — cheap however
  // many rooms get visited in a session.

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function lightenRgb(rgb, amt) {
    return {
      r: Math.round(rgb.r + (255 - rgb.r) * amt),
      g: Math.round(rgb.g + (255 - rgb.g) * amt),
      b: Math.round(rgb.b + (255 - rgb.b) * amt)
    };
  }

  function roomGlowHex(roomId) {
    return (DATA.rooms[roomId].atmosphere && DATA.rooms[roomId].atmosphere.glow) || '#5a7a8a';
  }

  function getRoomGlow(roomId) {
    if (roomGlowCache.has(roomId)) return roomGlowCache.get(roomId);
    const rgb = hexToRgb(roomGlowHex(roomId));
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_W;
    canvas.height = WORLD_H;
    const gctx = canvas.getContext('2d');
    const roomIndex = Number(roomId.slice(-2)) || 1;
    const driftX = ((roomIndex * 67) % 121) - 60;
    const driftY = ((roomIndex * 43) % 81) - 40;
    GLOW_SPOTS.forEach((spot, index) => {
      const x = spot.x + driftX * (index === 1 ? .55 : 1);
      const y = spot.y + driftY * (index === 0 ? .7 : 1);
      const grad = gctx.createRadialGradient(x, y, 0, x, y, spot.r);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},.32)`);
      grad.addColorStop(.55, `rgba(${rgb.r},${rgb.g},${rgb.b},.12)`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      gctx.fillStyle = grad;
      gctx.beginPath();
      gctx.arc(x, y, spot.r, 0, Math.PI * 2);
      gctx.fill();
    });
    roomGlowCache.set(roomId, canvas);
    return canvas;
  }

  // Lightened version of the same color, used for the exit arrows — the raw
  // glow hex is tuned to sit low and moody as ambient light, but needs a
  // boost to still read clearly as a UI element against a dark room.
  function getRoomGlowRgb(roomId) {
    if (roomGlowRgbCache.has(roomId)) return roomGlowRgbCache.get(roomId);
    const rgb = lightenRgb(hexToRgb(roomGlowHex(roomId)), .52);
    roomGlowRgbCache.set(roomId, rgb);
    return rgb;
  }

  function getMoteSprite(roomId) {
    if (moteSpriteCache.has(roomId)) return moteSpriteCache.get(roomId);
    const rgb = getRoomGlowRgb(roomId);
    const c = document.createElement('canvas');
    c.width = 28;
    c.height = 28;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(14, 14, 0, 14, 14, 14);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},.88)`);
    grad.addColorStop(.5, `rgba(${rgb.r},${rgb.g},${rgb.b},.34)`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(14, 14, 14, 0, Math.PI * 2);
    g.fill();
    moteSpriteCache.set(roomId, c);
    return c;
  }

  function getSpiritGlow(roomId) {
    if (spiritGlowCache.has(roomId)) return spiritGlowCache.get(roomId);
    const rgb = getRoomGlowRgb(roomId);
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 320;
    const g = c.getContext('2d');
    const glow = g.createRadialGradient(160, 160, 8, 160, 160, 160);
    glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},.32)`);
    glow.addColorStop(.38, `rgba(${rgb.r},${rgb.g},${rgb.b},.20)`);
    glow.addColorStop(.72, `rgba(${rgb.r},${rgb.g},${rgb.b},.06)`);
    glow.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    g.fillStyle = glow;
    g.fillRect(0, 0, c.width, c.height);
    spiritGlowCache.set(roomId, c);
    return c;
  }

  // Motes are pure functions of elapsed time (no per-frame position
  // mutation) — reseeding a room just picks new base points and restarts
  // the clock, so there's nothing to update() every tick, only draw().
  function reseedMotes(roomId) {
    const now = performance.now();
    const next = [];
    for (let i = 0; i < MOTE_COUNT; i++) {
      next.push({
        baseX: 420 + Math.random() * 700,
        baseY: 380 + Math.random() * 420,
        phase: Math.random() * Math.PI * 2,
        swayAmp: 10 + Math.random() * 14,
        swayFreq: .4 + Math.random() * .3,
        speed: 10 + Math.random() * 10,
        range: 160 + Math.random() * 140,
        size: 1.6 + Math.random() * 1.8,
        baseAlpha: .35 + Math.random() * .3,
        twinkleFreq: .6 + Math.random() * .6,
        startedAt: now - Math.random() * 5000
      });
    }
    motes = next;
    void roomId; // motes don't vary by room identity, only by fresh random seed
  }

  function drawMotes(now) {
    if (!motes.length) return;
    const sprite = getMoteSprite(state.roomId);
    motes.forEach(m => {
      const t = REDUCED_MOTION ? 0 : (now - m.startedAt) / 1000;
      const y = m.baseY - ((t * m.speed) % m.range);
      const x = m.baseX + Math.sin(t * m.swayFreq + m.phase) * m.swayAmp;
      const twinkle = .5 + .5 * Math.sin(t * m.twinkleFreq + m.phase * 2);
      const alpha = m.baseAlpha * (.55 + twinkle * .45);
      const size = m.size * 8;
      atmosphereCtx.save();
      atmosphereCtx.globalAlpha = alpha;
      atmosphereCtx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      atmosphereCtx.restore();
    });
  }

  function drawLanternFlicker(now) {
    const lanterns = getRoom().atmosphere?.lanterns || [];
    if (!lanterns.length) return;
    const seconds = now / 1000;
    const roomSeed = Number(state.roomId.slice(-2)) || 1;
    atmosphereCtx.save();
    atmosphereCtx.globalCompositeOperation = 'screen';
    lanterns.forEach((lantern, index) => {
      const x = Number(lantern[0]);
      const y = Number(lantern[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Far lantern windows are physically smaller in the fixed world image,
      // so the supplied points get a tiny depth-aware radius automatically.
      const radius = Math.max(9, Math.min(24, 8 + y * .021));
      const phase = roomSeed * .71 + index * 2.17;
      const flicker = Math.max(0, Math.min(1,
        .54
        + .28 * Math.sin(seconds * (1.55 + (index % 3) * .23) + phase)
        + .18 * Math.sin(seconds * (4.3 + (index % 2) * .37) + phase * 1.8)
      ));
      const gradient = atmosphereCtx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255,242,181,.99)');
      gradient.addColorStop(.18, 'rgba(255,211,103,.80)');
      gradient.addColorStop(.55, 'rgba(244,155,45,.34)');
      gradient.addColorStop(1, 'rgba(208,111,31,0)');
      atmosphereCtx.globalAlpha = .36 + flicker * .46;
      atmosphereCtx.fillStyle = gradient;
      atmosphereCtx.beginPath();
      atmosphereCtx.arc(x, y, radius, 0, Math.PI * 2);
      atmosphereCtx.fill();
    });
    atmosphereCtx.restore();
  }

  function getRoom() { return DATA.rooms[state.roomId]; }

  function getImage(roomId) {
    if (imageCache.has(roomId)) return imageCache.get(roomId);
    const image = new Image();
    image.decoding = 'async';
    image.src = DATA.rooms[roomId].bg;
    imageCache.set(roomId, image);
    return image;
  }

  function preloadAdjacent(roomId) {
    getImage(roomId);
    for (const exit of DATA.rooms[roomId].exits || []) getImage(exit.to);
  }

  function getSpawn(room, spawnId) {
    return room.spawns?.[spawnId] || room.spawns?.default || { x: CENTER_X, y: CENTER_Y };
  }

  function showRoom(roomId) {
    preloadAdjacent(roomId);
    const image = getImage(roomId);
    roomLayer.replaceChildren(image);
    image.className = 'muenba-bg';
    currentBg = image;
  }

  function updateMuenbaProfileLink() {
    if (!muenbaProfileLink) return;
    muenbaProfileLink.classList.toggle('is-visible', state.roomId === 'room_01');
  }

  function setRoom(roomId, spawnId, arrivalDir) {
    state.roomId = roomId;
    state.spawnId = spawnId || 'default';
    state.arrivalDir = arrivalDir || null;
    const spawn = getSpawn(getRoom(), state.spawnId);
    state.x = spawn.x;
    state.y = spawn.y;
    state.clickTarget = null;
    state.moving = false;
    state.inputLocked = false;
    state.distMovedSinceSpawn = 0;
    state.transitionReadyAt = performance.now() + TRANSITION_COOLDOWN_MS;
    state.spawnLockUntil = performance.now() + 700;
    state.hiding = false;
    state.captureResolving = false;
    boohaTrail = [];
    lastBoohaTrailAt = 0;
    updateMuenbaProfileLink();
    stopDangerScream();
    setReturnToNuppiPending(Number(readMuenba().orbsPending) > 0 || state.returnToNuppiPending);
    if (hideBtn) { hideBtn.classList.remove('active'); setHideButtonLabel(false); setHideButtonDisabled(false); }
    markMuenbaRoomVisited(roomId);
    spawnRoomGhost(roomId);
    showRoom(roomId);
    reseedMotes(roomId);
    entryDrift = null;
    if (state.spawnId === 'fromKarasuki' || state.arrivalDir) beginEntryDrift();
  }

  function beginEntryDrift() {
    entryDrift = {
      start: performance.now(),
      targetX: CENTER_X,
      targetY: CENTER_Y,
      maxUntil: performance.now() + ENTRY_DRIFT_MAX_MS
    };
    state.inputLocked = true;
    state.clickTarget = null;
    state.moving = false;
  }

  function tickEntryDrift(now) {
    if (!entryDrift) return false;
    const dx = entryDrift.targetX - state.x;
    const dy = entryDrift.targetY - state.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 24 || now >= entryDrift.maxUntil) {
      state.x = entryDrift.targetX;
      state.y = entryDrift.targetY;
      entryDrift = null;
      state.inputLocked = false;
      return false;
    }
    const step = Math.min(distance, state.speed * 1.1);
    state.x += (dx / distance) * step;
    state.y += (dy / distance) * step;
    state.moving = true;
    return true;
  }

  function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  function clampToWorld(x, y, radius = GHOST_R) {
    return {
      x: Math.max(radius, Math.min(WORLD_W - radius, x)),
      y: Math.max(radius, Math.min(WORLD_H - radius, y))
    };
  }

  function canMoveTo(x, y) {
    const point = clampToWorld(x, y, BOOHA_R);
    return (getRoom().walkable || []).some(rect => pointInRect(point.x, point.y, rect));
  }

  function tryMove(x, y) {
    const point = clampToWorld(x, y, BOOHA_R);
    if (canMoveTo(point.x, point.y)) {
      state.x = point.x;
      state.y = point.y;
      return true;
    }
    const horizontal = clampToWorld(x, state.y, BOOHA_R);
    if (canMoveTo(horizontal.x, horizontal.y)) {
      state.x = horizontal.x;
      state.y = horizontal.y;
      return true;
    }
    const vertical = clampToWorld(state.x, y, BOOHA_R);
    if (canMoveTo(vertical.x, vertical.y)) {
      state.x = vertical.x;
      state.y = vertical.y;
      return true;
    }
    return false;
  }

  function handleMovement(now) {
    if (!state.clickTarget) {
      state.moving = false;
      return;
    }
    const dx = state.clickTarget.x - state.x;
    const dy = state.clickTarget.y - state.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= CLICK_STOP_DIST) {
      state.clickTarget = null;
      state.moving = false;
      return;
    }
    const previousX = state.x;
    const previousY = state.y;
    const moved = tryMove(state.x + (dx / distance) * state.speed, state.y + (dy / distance) * state.speed);
    state.moving = moved;
    if (!moved) state.clickTarget = null;
    if (moved) {
      state.distMovedSinceSpawn += Math.hypot(state.x - previousX, state.y - previousY);
      if (!state.hiding && !state.celebrating) addBoohaTrailParticle(state.x, state.y, now);
    }
    if (!REDUCED_MOTION && moved && now % 240 < 30) state.fogX += .15;
  }

  function getAvailableExit(now) {
    if (state.inputLocked || state.transitioning) return null;
    if (now < state.transitionReadyAt || now < state.spawnLockUntil) return null;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return null;
    const backDir = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    for (const exit of getRoom().exits || []) {
      if (Math.hypot(state.x - exit.x, state.y - exit.y) > NPP_RADIUS) continue;
      if (exit.dir === backDir && now < state.spawnLockUntil + ARRIVAL_ARROW_BACK_DELAY_MS) continue;
      return exit;
    }
    return null;
  }

  function transitionTo(exit) {
    if (!exit || state.transitioning) return;
    state.transitioning = true;
    state.inputLocked = true;
    state.clickTarget = null;
    state.moving = false;
    fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-in`;
    fadeEl.style.opacity = '1';
    window.setTimeout(() => {
      setRoom(exit.to, exit.spawn, exit.dir);
      fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-out`;
      fadeEl.style.opacity = '0';
      window.setTimeout(() => {
        state.transitioning = false;
      }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  // ── Return-to-Karasuki portal (Pass 2) ──────────────────────────────────
  // Same shape as Karasuki's own MUENBA_PORTAL: a glowing spot the player
  // can either click or simply walk up to, opening a themed confirm popup
  // rather than leaving instantly — matches the "Enter Muenba?" prompt on
  // the way in, so the round trip feels like one consistent doorway.

  function buildReturnPortalOverlay() {
    if (returnPortalOverlay) return;
    returnPortalOverlay = document.createElement('div');
    returnPortalOverlay.id = 'muenba-return-overlay';
    returnPortalOverlay.innerHTML = `
      <div class="muenba-return-box">
        <h2>Leave Muenba?</h2>
        <p class="jp">カラスキに戻りますか？</p>
        <p>The path back to Karasuki is open here.</p>
        <p class="jp-line">ここからカラスキへ<ruby>戻<rt>もど</rt></ruby>る<ruby>道<rt>みち</rt></ruby>が<ruby>開<rt>ひら</rt></ruby>いています。</p>
        <div class="muenba-return-actions">
          <button id="muenba-return-yes" type="button"><span>Yes, return</span><small>はい、<ruby>戻<rt>もど</rt></ruby>る</small></button>
          <button id="muenba-return-no" type="button"><span>Stay</span><small>ここにいる</small></button>
        </div>
      </div>`;
    document.body.appendChild(returnPortalOverlay);
    document.getElementById('muenba-return-yes').addEventListener('click', () => {
      closeReturnPortalPopup();
      returnToKarasuki();
    });
    document.getElementById('muenba-return-no').addEventListener('click', closeReturnPortalPopup);
    returnPortalOverlay.addEventListener('click', event => {
      if (event.target === returnPortalOverlay) closeReturnPortalPopup();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && returnPortalOpen) closeReturnPortalPopup();
    });
  }

  function openReturnPortalPopup() {
    if (returnPortalOpen || state.returnExiting) return;
    returnPortalOpen = true;
    state.clickTarget = null;
    state.moving = false;
    playUiSfx('popupOpen');
    returnPortalOverlay.classList.add('open');
    resetMuenbaPopupScrollAfterLayout(returnPortalOverlay, '.muenba-return-box');
  }

  function closeReturnPortalPopup() {
    returnPortalOpen = false;
    playUiSfx('popupClose');
    returnPortalOverlay.classList.remove('open');
    requestMuenbaLandscapeAfterPopup();
    returnPortalCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
  }

  function isReturnPortalOpen() { return returnPortalOpen; }

  function inReturnPortalRoom() { return state.roomId === KARASUKI_RETURN_PORTAL.roomId; }

  function checkReturnPortalProximity(now) {
    if (!inReturnPortalRoom() || returnPortalOpen || now < returnPortalCooldownUntil) return;
    if (state.inputLocked || state.transitioning) return;
    const d = Math.hypot(state.x - KARASUKI_RETURN_PORTAL.x, state.y - KARASUKI_RETURN_PORTAL.y);
    if (d <= KARASUKI_RETURN_PORTAL.triggerR) openReturnPortalPopup();
  }

  function clickCheckReturnPortal(worldX, worldY) {
    if (!inReturnPortalRoom() || returnPortalOpen || performance.now() < returnPortalCooldownUntil) return false;
    const d = Math.hypot(worldX - KARASUKI_RETURN_PORTAL.x, worldY - KARASUKI_RETURN_PORTAL.y);
    if (d <= KARASUKI_RETURN_PORTAL.r) {
      openReturnPortalPopup();
      return true;
    }
    return false;
  }

  function clickCheckNuppi(worldX, worldY) {
    if (state.roomId !== MUENBA_NUPPI.roomId || lobbyOpen || captureOpen) return false;
    const bob = REDUCED_MOTION ? 0 : Math.sin(performance.now() / 1000 * 2.1) * 5;
    if (Math.hypot(worldX - MUENBA_NUPPI.x, worldY - (MUENBA_NUPPI.y + bob)) > MUENBA_NUPPI.hitR) return false;
    openRoomNuppiPopup();
    return true;
  }

  // ── Player name helper (Pass 3b) ────────────────────────────────────────
  // muenba.html doesn't load karasuki.js or any of the blitz files, so the
  // getBoohaFirstName()/getPlayerName() helpers those files already define
  // aren't reachable here. This reads the exact same localStorage keys
  // js/token.js writes (which muenba.html DOES load), rather than pulling
  // in a whole extra script just for one string.
  function getPlayerFirstName() {
    try {
      const direct = localStorage.getItem('booha_first_name');
      if (direct) return direct.charAt(0).toUpperCase() + direct.slice(1).toLowerCase().slice(0, 12);
      const full = localStorage.getItem('booha_user_name') || '';
      const first = full.split(' ')[0].slice(0, 12);
      return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
    } catch (_) {
      return '';
    }
  }

  // ── Nuppi's lobby welcome ────────────────────────────────────────────────
  // Same themed-popup pattern as the return portal above, not a new screen.
  // Per the locked decision, this shows every time the player enters
  // Muenba (not just the first time), in a warm-guide tone, addressing the
  // player by name when one is on file. The welcome beat hands off to a
  // larger case-board beat, then a final target card before the hunt begins.
  function buildNuppiLobbyOverlay() {
    if (lobbyOverlay) return;
    lobbyOverlay = document.createElement('div');
    lobbyOverlay.id = 'muenba-lobby-overlay';
    lobbyOverlay.setAttribute('role', 'dialog');
    lobbyOverlay.setAttribute('aria-modal', 'true');
    lobbyOverlay.setAttribute('aria-label', 'Muenba Nuppi dialogue');
    lobbyOverlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(lobbyOverlay);
    renderNuppiWelcome();
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && lobbyOpen) closeNuppiLobby();
    });
  }

  function renderNuppiWelcome() {
    if (!lobbyOverlay) return;
    const name = getPlayerFirstName();
    const greetEn = name ? `${name}, there you are.` : 'There you are.';
    const greetJp = name ? `${name}……ようこそ。` : 'ようこそ。';
    lobbyOverlay.innerHTML = `
      <div class="muenba-lobby-box muenba-nuppi-scene muenba-nuppi-welcome">
        <img class="muenba-lobby-portrait" src="assets/img/wanderers/nuppi-2.webp" alt="Nuppi">
        <div class="muenba-nuppi-kicker">NUPPI TALK</div>
        <p class="jp muenba-nuppi-kicker-jp">ヌーピーと<ruby>話<rt>はな</rt></ruby>す</p>
        <div class="muenba-nuppi-nameplate"><h2>Nuppi</h2><span>ヌーピー</span></div>
        <section class="muenba-nuppi-speech" aria-labelledby="muenba-welcome-speech-title">
          <div id="muenba-welcome-speech-title" class="muenba-nuppi-speech-label">NUPPI SAYS</div>
          <p>${greetEn}</p>
          <p class="jp-line">${greetJp}</p>
        </section>
        <section class="muenba-nuppi-mission" aria-labelledby="muenba-welcome-mission-title">
          <div id="muenba-welcome-mission-title" class="muenba-nuppi-card-label">YOUR MISSION</div>
          <p>Somewhere among these fifteen rooms, a ghost is hiding. Some won't notice you at all, while others will come looking. If one gets close, you can hide until it loses interest. When you see one, walk up and give it a tap.</p>
          <button id="muenba-mission-hint-toggle" class="muenba-mission-hint-toggle" type="button" aria-expanded="false" aria-controls="muenba-mission-hint"><span>Show hint</span><small>ヒント</small></button>
          <p id="muenba-mission-hint" class="jp-line muenba-mission-hint" hidden>この15の<ruby>部屋<rt>へや</rt></ruby>のどこかに、<ruby>幽霊<rt>ゆうれい</rt></ruby>が<ruby>隠<rt>かく</rt></ruby>れているよ。<ruby>気<rt>き</rt></ruby>づかない<ruby>幽霊<rt>ゆうれい</rt></ruby>もいれば、<ruby>探<rt>さが</rt></ruby>しに<ruby>来<rt>く</rt></ruby>る<ruby>幽霊<rt>ゆうれい</rt></ruby>もいる。<ruby>近<rt>ちか</rt></ruby>づかれたら、<ruby>隠<rt>かく</rt></ruby>れて<ruby>興味<rt>きょうみ</rt></ruby>をなくすのを<ruby>待<rt>ま</rt></ruby>とう。<ruby>見<rt>み</rt></ruby>つけたら、<ruby>近<rt>ちか</rt></ruby>づいてそっとタップしてみて。</p>
        </section>
        <div class="muenba-lobby-actions">
          <button id="muenba-lobby-begin" type="button"><span>Let's begin</span><small><ruby>始<rt>はじ</rt></ruby>めよう</small></button>
        </div>
      </div>`;
    const missionHintToggle = lobbyOverlay.querySelector('#muenba-mission-hint-toggle');
    const missionHint = lobbyOverlay.querySelector('#muenba-mission-hint');
    missionHintToggle.addEventListener('click', () => {
      const showing = missionHint.hidden;
      missionHint.hidden = !showing;
      missionHintToggle.setAttribute('aria-expanded', String(showing));
      missionHintToggle.querySelector('span').textContent = showing ? 'Hide hint' : 'Show hint';
    });
    lobbyOverlay.querySelector('#muenba-lobby-begin').addEventListener('click', renderNuppiCaseBoard);
    focusLobbyControl('#muenba-lobby-begin');
  }

  function renderNuppiCaseBoard() {
    if (!lobbyOverlay) return;
    // Accepting Nuppi's hint is the explicit point where the next hunt
    // begins. Until then, a declined handoff leaves the cemetery alert.
    state.cemeteryAlert = false;
    lobbyOverlay.innerHTML = `
      <div class="muenba-lobby-box is-case-board muenba-nuppi-scene muenba-nuppi-case-board">
        <img class="muenba-lobby-portrait" src="assets/img/wanderers/nuppi-2.webp" alt="Nuppi">
        <section class="muenba-lobby-case-board" aria-labelledby="muenba-case-board-title">
          <div id="muenba-case-board-eyebrow" class="muenba-case-board-eyebrow">CASE FILE</div>
          <h3 id="muenba-case-board-title"></h3>
          <p id="muenba-case-board-title-jp" class="muenba-case-direction-jp"></p>
          <p id="muenba-case-board-mode" class="muenba-case-board-mode"></p>
          <p id="muenba-case-board-mode-jp" class="muenba-case-board-mode-jp"></p>
          <p id="muenba-case-board-copy" class="muenba-case-board-copy"></p>
          <p id="muenba-case-board-jp" class="muenba-case-direction-jp"></p>
        </section>
        <div class="muenba-lobby-actions">
          <button id="muenba-case-board-next" type="button"><span>Next</span><small><ruby>次<rt>つぎ</rt></ruby>へ</small></button>
        </div>
      </div>`;
    refreshNuppiCaseBoard();
    lobbyOverlay.querySelector('#muenba-case-board-next').addEventListener('click', renderNuppiHuntCard);
    focusLobbyControl('#muenba-case-board-next');
  }

  function nextNuppiHuntGhost() {
    return nextMuenbaHuntGhost();
  }

  function renderNuppiHuntCard() {
    if (!lobbyOverlay) return;
    const name = getPlayerFirstName();
    const ghost = nextNuppiHuntGhost();
    const ghostName = ghost ? ghost.name : 'the next ghost';
    const ghostFindJp = ghost
      ? `${ghost.kana}を<ruby>見<rt>み</rt></ruby>つけよう。`
      : '<ruby>次<rt>つぎ</rt></ruby>の<ruby>幽霊<rt>ゆうれい</rt></ruby>を<ruby>探<rt>さが</rt></ruby>そう。';
    const helperName = name ? ` Be careful, ${name}.` : ' Be careful.';
    lobbyOverlay.innerHTML = `
      <div class="muenba-lobby-box muenba-hunt-card">
        <div class="muenba-nuppi-kicker">HUNT</div>
        <p class="jp muenba-nuppi-kicker-jp"><ruby>探索<rt>たんさく</rt></ruby></p>
        <div class="muenba-hunt-target-eyebrow">HUNT TARGET</div>
        <p class="jp muenba-hunt-target-eyebrow-jp"><ruby>探索<rt>たんさく</rt></ruby>の<ruby>目標<rt>もくひょう</rt></ruby></p>
        ${ghost
          ? `<img class="muenba-hunt-ghost-portrait" src="${ghost.img}" alt="${ghostName}">`
          : '<div class="muenba-hunt-ghost-portrait" aria-hidden="true"></div>'}
        <h2>${ghost ? `Find ${ghostName}` : 'No more ghosts this week'}</h2>
        <p class="jp">${ghost ? ghostFindJp : '<ruby>今週<rt>こんしゅう</rt></ruby>はもう<ruby>幽霊<rt>ゆうれい</rt></ruby>がいません'}</p>
        <p class="muenba-hunt-helper">${ghost ? `Not all ghosts are friendly. Run away or hide from the angry ones.${helperName}` : 'You found every ghost available this week. They will return next week.'}</p>
        <p class="muenba-hunt-helper-jp">${ghost ? `すべての<ruby>幽霊<rt>ゆうれい</rt></ruby>が<ruby>友好的<rt>ゆうこうてき</rt></ruby>とは<ruby>限<rt>かぎ</rt></ruby>らない。<ruby>怒<rt>おこ</rt></ruby>った<ruby>幽霊<rt>ゆうれい</rt></ruby>からは<ruby>逃<rt>に</rt></ruby>げるか、<ruby>隠<rt>かく</rt></ruby>れよう。${name ? `${name}さん、` : ''}<ruby>気<rt>き</rt></ruby>をつけて。` : 'この<ruby>週<rt>しゅう</rt></ruby>に<ruby>見<rt>み</rt></ruby>つけられる<ruby>幽霊<rt>ゆうれい</rt></ruby>は<ruby>全部<rt>ぜんぶ</rt></ruby>です。<ruby>来週<rt>らいしゅう</rt></ruby>にまた<ruby>戻<rt>もど</rt></ruby>ってきます。'}</p>
        <div class="muenba-lobby-actions">
          <button id="muenba-hunt-card-begin" type="button"><span>Begin hunt</span><small><ruby>探索<rt>たんさく</rt></ruby>を<ruby>始<rt>はじ</rt></ruby>める</small></button>
        </div>
      </div>`;
    lobbyOverlay.querySelector('#muenba-hunt-card-begin').addEventListener('click', () => {
      closeNuppiLobby();
      if (readMuenba().orbsPending > 0) openPendingOrbRecovery();
    });
    focusLobbyControl('#muenba-hunt-card-begin');
  }

  function focusLobbyControl(selector) {
    resetMuenbaPopupScrollAfterLayout(lobbyOverlay);
    window.setTimeout(() => {
      const control = lobbyOverlay && lobbyOverlay.querySelector(selector);
      if (control && typeof control.focus === 'function') control.focus({ preventScroll: true });
      resetMuenbaPopupScrollAfterLayout(lobbyOverlay);
    }, 0);
  }

  function refreshNuppiCaseBoard() {
    if (!lobbyOverlay) return;
    const eyebrow = lobbyOverlay.querySelector('#muenba-case-board-eyebrow');
    const title = lobbyOverlay.querySelector('#muenba-case-board-title');
    const titleJp = lobbyOverlay.querySelector('#muenba-case-board-title-jp');
    const mode = lobbyOverlay.querySelector('#muenba-case-board-mode');
    const modeJp = lobbyOverlay.querySelector('#muenba-case-board-mode-jp');
    const copy = lobbyOverlay.querySelector('#muenba-case-board-copy');
    const jp = lobbyOverlay.querySelector('#muenba-case-board-jp');
    if (!eyebrow || !title || !titleJp || !mode || !modeJp || !copy || !jp) return;
    const next = nextMuenbaCase();
    if (next) {
      const ghost = (DATA.ghosts || []).find(candidate => candidate.id === next.ghostId);
      const ghostName = ghost ? ghost.name : next.ghostId;
      const selectedMode = getMuenbaReadingDifficulty();
      const caseNumber = orderedMuenbaCases().findIndex(caseData => caseData.id === next.id) + 1;
      // next.title is authored case content (English-only by design, see
      // muenba-data.js), so its JP line stays empty on purpose.
      eyebrow.textContent = `CASE FILE ${String(caseNumber).padStart(2, '0')}`;
      title.textContent = next.title;
      titleJp.textContent = '';
      mode.textContent = MUENBA_MEMORY_MODE_LABELS[selectedMode] || MUENBA_MEMORY_MODE_LABELS.start;
      modeJp.innerHTML = MUENBA_MEMORY_MODE_JP[selectedMode] || MUENBA_MEMORY_MODE_JP.start;
      copy.textContent = `Case ready. Find ${ghostName} and untangle its energy.`;
      jp.innerHTML = '<ruby>事件<rt>じけん</rt></ruby>の<ruby>準備<rt>じゅんび</rt></ruby>ができたよ。<ruby>幽霊<rt>ゆうれい</rt></ruby>を<ruby>探<rt>さが</rt></ruby>して、エネルギーを<ruby>解<rt>と</rt></ruby>こう。';
    } else {
      eyebrow.textContent = 'CASE FILE';
      title.textContent = 'The case board is quiet.';
      titleJp.innerHTML = '<ruby>事件<rt>じけん</rt></ruby>ボードは<ruby>静<rt>しず</rt></ruby>か。';
      mode.textContent = 'No reading level selected';
      modeJp.innerHTML = '<ruby>読<rt>よ</rt></ruby>み<ruby>方<rt>かた</rt></ruby>はありません';
      copy.textContent = 'Nuppi is waiting for the next strange ghost.';
      jp.innerHTML = '<ruby>事件<rt>じけん</rt></ruby>ボードは<ruby>静<rt>しず</rt></ruby>かだよ。<ruby>次<rt>つぎ</rt></ruby>の<ruby>変<rt>へん</rt></ruby>な<ruby>幽霊<rt>ゆうれい</rt></ruby>を<ruby>待<rt>ま</rt></ruby>っているよ。';
    }
  }

  function openNuppiLobby() {
    if (lobbyOpen || !lobbyOverlay) return;
    lobbyOpen = true;
    state.clickTarget = null;
    state.moving = false;
    playUiSfx('mischiefReward');
    renderNuppiWelcome();
    refreshNuppiCaseBoard();
    lobbyOverlay.setAttribute('aria-hidden', 'false');
    lobbyOverlay.classList.add('open');
  }

  // Pass 9I: the entry drift is part of Muenba's arrival beat. Wait until
  // Booha has reached the center before opening Nuppi's lobby so the modal
  // cannot hide or pause a player who is still locked at the doorway spawn.
  function openNuppiLobbyAfterEntry() {
    if (!entryDrift) {
      openNuppiLobby();
      return;
    }
    const waitForArrival = () => {
      if (!entryDrift) openNuppiLobby();
      else window.requestAnimationFrame(waitForArrival);
    };
    window.requestAnimationFrame(waitForArrival);
  }

  function closeNuppiLobby() {
    lobbyOpen = false;
    playUiSfx('popupClose');
    if (lobbyOverlay) {
      lobbyOverlay.classList.remove('open');
      lobbyOverlay.setAttribute('aria-hidden', 'true');
    }
    requestMuenbaLandscapeAfterPopup();
  }

  function renderRoomNuppiPopup() {
    if (!lobbyOverlay) return;
    const name = getPlayerFirstName();
    const pending = Number(readMuenba().orbsPending) > 0;
    const waitingForCase = !pending && !!nextMuenbaCase();
    const waitingGhost = waitingForCase ? nextNuppiHuntGhost() : null;
    const waitingGhostName = waitingGhost ? waitingGhost.name : 'the next ghost';
    const waitingLine = name
      ? `I'm waiting, ${name}. Find ${waitingGhostName}, then come back here.`
      : `I'm waiting. Find ${waitingGhostName}, then come back here.`;
    const waitingLineJp = waitingGhost
      ? `${waitingGhost.kana}を<ruby>見<rt>み</rt></ruby>つけて、ここに<ruby>戻<rt>もど</rt></ruby>ってきてね。`
      : '<ruby>次<rt>つぎ</rt></ruby>の<ruby>幽霊<rt>ゆうれい</rt></ruby>を<ruby>見<rt>み</rt></ruby>つけて、ここに<ruby>戻<rt>もど</rt></ruby>ってきてね。';
    const copy = pending
      ? 'The ghost energy is waiting here. Nuppi is ready for the handoff.'
      : waitingForCase
        ? waitingLine
        : 'Nuppi is here when you are ready.';
    const statusCopy = pending
      ? 'Your energy orbs are ready to return here.'
      : waitingForCase
        ? `Find ${waitingGhostName}, then bring the energy home.`
        : 'Nuppi will be here when you need him.';
    const statusCopyJp = pending
      ? '<ruby>集<rt>あつ</rt></ruby>めたエネルギーオーブをここへ<ruby>返<rt>かえ</rt></ruby>せます。'
      : waitingForCase
        ? `${waitingGhost ? waitingGhost.kana : '幽霊'}を<ruby>見<rt>み</rt></ruby>つけて、エネルギーをここへ<ruby>持<rt>も</rt></ruby>ってきてね。`
        : 'ヌーピーは<ruby>必要<rt>ひつよう</rt></ruby>なとき、ここにいるよ。';
    const copyJp = pending
      ? '<ruby>幽霊<rt>ゆうれい</rt></ruby>のエネルギーはここで<ruby>待<rt>ま</rt></ruby>っています。ヌーピーは<ruby>受<rt>う</rt></ruby>け<ruby>取<rt>と</rt></ruby>る<ruby>準備<rt>じゅんび</rt></ruby>ができています。'
        : waitingForCase
        ? waitingLineJp
        : 'ヌーピーはここで<ruby>待<rt>ま</rt></ruby>っているよ。';
    lobbyOverlay.innerHTML = `
      <div class="muenba-lobby-box muenba-room-nuppi-box muenba-nuppi-scene muenba-nuppi-waiting">
        <img class="muenba-lobby-portrait" src="assets/img/wanderers/nuppi-2.webp" alt="Nuppi">
        <div class="muenba-nuppi-kicker">NUPPI TALK</div>
        <p class="jp muenba-nuppi-kicker-jp">ヌーピーと<ruby>話<rt>はな</rt></ruby>す</p>
        <div class="muenba-nuppi-nameplate"><h2>Nuppi</h2><span>ヌーピー</span></div>
        <section class="muenba-nuppi-speech" aria-labelledby="muenba-waiting-speech-title">
          <div id="muenba-waiting-speech-title" class="muenba-nuppi-speech-label">NUPPI SAYS</div>
          <p>${copy}</p>
          <p class="jp-line">${copyJp}</p>
        </section>
        <section class="muenba-nuppi-status-card${pending ? ' is-ready' : ''}" aria-live="polite">
          <div class="muenba-nuppi-card-label">NUPPI STATUS</div>
          <p>${statusCopy}</p>
          <p class="jp-line">${statusCopyJp}</p>
        </section>
        <div class="muenba-lobby-actions">
          ${pending ? '<button id="muenba-room-nuppi-handoff" class="muenba-capture-action" type="button"><span>Hand over energy</span><small>エネルギーを<ruby>渡<rt>わた</rt></ruby>す</small></button>' : ''}
          <button id="muenba-room-nuppi-close" type="button"><span>Back to the hunt</span><small><ruby>探索<rt>たんさく</rt></ruby>に<ruby>戻<rt>もど</rt></ruby>る</small></button>
        </div>
      </div>`;
    const handoff = lobbyOverlay.querySelector('#muenba-room-nuppi-handoff');
    if (handoff) handoff.addEventListener('click', () => depositOrbsAtNuppi());
    lobbyOverlay.querySelector('#muenba-room-nuppi-close').addEventListener('click', closeNuppiLobby);
    focusLobbyControl(pending ? '#muenba-room-nuppi-handoff' : '#muenba-room-nuppi-close');
  }

  function openRoomNuppiPopup() {
    if (lobbyOpen || captureOpen || returnPortalOpen || !lobbyOverlay) return;
    lobbyOpen = true;
    state.clickTarget = null;
    state.moving = false;
    playUiSfx('mischiefReward');
    renderRoomNuppiPopup();
    lobbyOverlay.setAttribute('aria-hidden', 'false');
    lobbyOverlay.classList.add('open');
  }

  function openNuppiAfterHandoff(deposited) {
    if (!lobbyOverlay) return;
    const nextGhost = nextNuppiHuntGhost();
    const canContinue = !!nextGhost;
    const orbLabel = `${deposited} energy orb${deposited === 1 ? '' : 's'}`;
    lobbyOpen = true;
    state.clickTarget = null;
    state.moving = false;
    lobbyOverlay.innerHTML = `
      <div class="muenba-lobby-box muenba-handoff-box muenba-nuppi-scene muenba-nuppi-handoff">
        <img class="muenba-lobby-portrait" src="assets/img/wanderers/nuppi-2.webp" alt="Nuppi">
        <div class="muenba-nuppi-kicker">NUPPI TALK</div>
        <p class="jp muenba-nuppi-kicker-jp">ヌーピーと<ruby>話<rt>はな</rt></ruby>す</p>
        <div class="muenba-case-board-eyebrow">HANDOFF COMPLETE</div>
        <p class="jp muenba-case-board-eyebrow-jp"><ruby>受<rt>う</rt></ruby>け<ruby>渡<rt>わた</rt></ruby>し<ruby>完了<rt>かんりょう</rt></ruby></p>
        <div class="muenba-nuppi-nameplate"><h2>Thank you, Booha.</h2><span>ありがとう、ブーハー。</span></div>
        <section class="muenba-nuppi-success-card">
          <div class="muenba-nuppi-card-label">ENERGY SAFE</div>
          <p>${orbLabel} are safe with Nuppi now.</p>
          <p class="jp-line"><ruby>届<rt>とど</rt></ruby>けてくれてありがとう。エネルギーはヌーピーが<ruby>預<rt>あず</rt></ruby>かるよ。</p>
        </section>
        <section class="muenba-nuppi-next-card">
          <div class="muenba-nuppi-card-label">NEXT STEP</div>
          <p>${canContinue ? "Would you like Nuppi's hint for another ghost?" : 'That is all for this week. The ghosts will return next week.'}</p>
          <p class="jp-line">${canContinue ? 'もう<ruby>一度<rt>いちど</rt></ruby>、<ruby>幽霊<rt>ゆうれい</rt></ruby>を<ruby>探<rt>さが</rt></ruby>してみる？' : 'この<ruby>週<rt>しゅう</rt></ruby>はこれでおしまい。<ruby>幽霊<rt>ゆうれい</rt></ruby>は<ruby>来週<rt>らいしゅう</rt></ruby>に<ruby>戻<rt>もど</rt></ruby>ってくるよ。'}</p>
        </section>
        <div class="muenba-lobby-actions">
          ${canContinue ? '<button id="muenba-handoff-find" class="muenba-capture-action" type="button"><span>Accept hint</span><small>ヒントを<ruby>受<rt>う</rt></ruby>ける</small></button>' : ''}
          <button id="muenba-handoff-later" type="button"><span>Not now</span><small><ruby>今<rt>いま</rt></ruby>はやめる</small></button>
        </div>
      </div>`;
    const find = lobbyOverlay.querySelector('#muenba-handoff-find');
    if (find) find.addEventListener('click', () => renderNuppiCaseBoard());
    lobbyOverlay.querySelector('#muenba-handoff-later').addEventListener('click', () => {
      // The player declined Nuppi's next hint. The energy is already safe,
      // but the ghosts do not calm until the next hint is accepted.
      state.cemeteryAlert = true;
      closeNuppiLobby();
    });
    lobbyOverlay.setAttribute('aria-hidden', 'false');
    lobbyOverlay.classList.add('open');
    focusLobbyControl(canContinue ? '#muenba-handoff-find' : '#muenba-handoff-later');
  }

  function drawNuppi(now) {
    if (state.roomId !== MUENBA_NUPPI.roomId) return;
    const seconds = now / 1000;
    const bob = REDUCED_MOTION ? 0 : Math.sin(seconds * 2.1) * 5;
    const pulse = REDUCED_MOTION ? .72 : .5 + .5 * Math.sin(seconds * 1.7);
    const x = MUENBA_NUPPI.x;
    const y = MUENBA_NUPPI.y + bob;
    const highlighted = state.returnToNuppiPending || state.celebrating;
    actorCtx.save();
    // The glow belongs to Nuppi's sprite now. There are no orbiting or
    // outlined circles, so he reads as a living guide rather than a map pin.
    actorCtx.globalAlpha = .9 + pulse * .1;
    actorCtx.shadowBlur = (highlighted ? 30 : 18) + pulse * (highlighted ? 16 : 11);
    actorCtx.shadowColor = highlighted
      ? `rgba(255,226,132,${.55 + pulse * .25})`
      : `rgba(122,224,177,${.42 + pulse * .22})`;
    if (nuppiLobbyImg.complete && nuppiLobbyImg.naturalWidth > 0) {
      actorCtx.drawImage(nuppiLobbyImg, x - MUENBA_NUPPI.drawR, y - MUENBA_NUPPI.drawR, MUENBA_NUPPI.drawR * 2, MUENBA_NUPPI.drawR * 2);
    } else {
      actorCtx.fillStyle = '#a7e1c5';
      actorCtx.beginPath();
      actorCtx.arc(x, y, MUENBA_NUPPI.drawR * .72, 0, Math.PI * 2);
      actorCtx.fill();
    }
    actorCtx.restore();
  }

  function drawReturnPortal(now) {
    if (!inReturnPortalRoom()) return;
    const seconds = now / 1000;
    const pulse = REDUCED_MOTION ? .72 : .5 + .5 * Math.sin(seconds * 1.7);
    const cx = KARASUKI_RETURN_PORTAL.x;
    const cy = KARASUKI_RETURN_PORTAL.y;
    const angle = Math.PI / 2;
    const glow = .62 + pulse * .22;
    const roomColor = getRoomGlowRgb(state.roomId);
    const roomGlowStr = `${roomColor.r},${roomColor.g},${roomColor.b}`;
    const roomCoreStr = `${Math.min(255, roomColor.r + 35)},${Math.min(255, roomColor.g + 35)},${Math.min(255, roomColor.b + 35)}`;

    // The return point uses the same small chevron language as the room
    // exits, with a destination label instead of a floating orb.
    actorCtx.save();
    actorCtx.translate(cx, cy);
    actorCtx.rotate(angle);
    actorCtx.globalAlpha = glow * .42;
    actorCtx.strokeStyle = `rgba(${roomGlowStr},.92)`;
    actorCtx.shadowColor = `rgba(${roomGlowStr},.86)`;
    actorCtx.shadowBlur = 18 + pulse * 8;
    actorCtx.lineWidth = 5;
    actorCtx.lineCap = 'round';
    actorCtx.lineJoin = 'round';
    actorCtx.beginPath();
    actorCtx.moveTo(-15, -10);
    actorCtx.lineTo(0, 0);
    actorCtx.lineTo(-15, 10);
    actorCtx.stroke();
    actorCtx.shadowBlur = 0;
    actorCtx.globalAlpha = glow;
    actorCtx.strokeStyle = `rgb(${roomCoreStr})`;
    actorCtx.lineWidth = 2;
    actorCtx.beginPath();
    actorCtx.moveTo(-15, -10);
    actorCtx.lineTo(0, 0);
    actorCtx.lineTo(-15, 10);
    actorCtx.stroke();
    actorCtx.restore();

    actorCtx.save();
    actorCtx.globalAlpha = .58 + pulse * .2;
    actorCtx.fillStyle = `rgb(${roomCoreStr})`;
    actorCtx.shadowColor = `rgba(${roomGlowStr},.78)`;
    actorCtx.shadowBlur = 12 + pulse * 7;
    actorCtx.font = '700 12px ui-monospace,monospace';
    actorCtx.textAlign = 'center';
    actorCtx.textBaseline = 'middle';
    actorCtx.fillText('KARASUKI', cx, cy + 30);
    actorCtx.restore();
  }

  function drawExitArrows(now) {
    const exits = getRoom().exits || [];
    const reveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    if (reveal <= 0) return;
    const backDir = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    const seconds = now / 1000;
    const glow = getRoomGlowRgb(state.roomId);
    const glowStr = `${glow.r},${glow.g},${glow.b}`;
    const coreStr = `${Math.min(255, glow.r + 35)},${Math.min(255, glow.g + 35)},${Math.min(255, glow.b + 35)}`;
    exits.forEach((exit, index) => {
      const hiddenUntil = exit.dir === backDir
        ? state.spawnLockUntil + ARRIVAL_ARROW_BACK_DELAY_MS
        : state.spawnLockUntil + ARRIVAL_ARROW_DELAY_MS;
      if (now < hiddenUntil) return;
      const fade = Math.min(1, (now - hiddenUntil) / 450) * reveal;
      const distanceToExit = Math.hypot(state.x - exit.x, state.y - exit.y);
      const proximity = Math.max(0, Math.min(1, 1 - distanceToExit / (NPP_RADIUS * 5)));
      const angle = DIR_ANGLE[exit.dir] || 0;
      // Two overlapping sine waves (instead of one smooth pulse) read as an
      // unsteady, slightly ghostly flicker rather than a mechanical glow.
      const flicker = REDUCED_MOTION
        ? .78
        : .68 + .2 * Math.sin(seconds * 1.9 + index) + .12 * Math.sin(seconds * 6.3 + index * 2.4);
      const bounce = REDUCED_MOTION ? 0 : Math.sin(seconds * 1.5 + index) * 4.5;
      const x = exit.x + Math.cos(angle) * bounce;
      const y = exit.y + Math.sin(angle) * bounce;

      // Faint spectral trail behind the arrowhead — two small dots, no
      // extra gradients, cheap.
      actorCtx.save();
      actorCtx.translate(x, y);
      actorCtx.rotate(angle);
      for (let t = 1; t <= 2; t++) {
        actorCtx.globalAlpha = fade * flicker * ((.18 + proximity * .08) / t);
        actorCtx.fillStyle = `rgb(${glowStr})`;
        actorCtx.beginPath();
        actorCtx.arc(-t * 10, 0, 3.5 - t * .8, 0, Math.PI * 2);
        actorCtx.fill();
      }
      actorCtx.restore();

      // Pass 9C: a small eerie chevron replaces the old large filled circle.
      // The glow is local to the stroke, while NPP_RADIUS remains generous so
      // the visual can be atmospheric without making the exit hard to use.
      actorCtx.save();
      actorCtx.translate(x, y);
      actorCtx.rotate(angle);
      // Two light strokes make the small arrow survive the room fog: a broad
      // low-alpha aura underneath, then a thin bright core on top. The arrow
      // grows clearer as Booha approaches the actual 42px exit hotspot.
      actorCtx.globalAlpha = fade * (.24 + flicker * .14 + proximity * .12);
      actorCtx.strokeStyle = `rgba(${glowStr},.9)`;
      actorCtx.shadowColor = `rgba(${glowStr},.65)`;
      actorCtx.shadowBlur = 14;
      actorCtx.lineWidth = 3.6;
      actorCtx.lineCap = 'round';
      actorCtx.lineJoin = 'round';
      actorCtx.beginPath();
      actorCtx.moveTo(-11, -7);
      actorCtx.lineTo(0, 0);
      actorCtx.lineTo(-11, 7);
      actorCtx.stroke();

      actorCtx.shadowBlur = 0;
      actorCtx.globalAlpha = fade * (.62 + flicker * .22 + proximity * .14);
      actorCtx.strokeStyle = `rgba(${coreStr},.98)`;
      actorCtx.lineWidth = 1.8;
      actorCtx.beginPath();
      actorCtx.moveTo(-11, -7);
      actorCtx.lineTo(0, 0);
      actorCtx.lineTo(-11, 7);
      actorCtx.stroke();

      // A tiny bright point at the tip gives the arrow a living center without
      // bringing back a conspicuous circular UI marker.
      actorCtx.shadowBlur = 0;
      actorCtx.globalAlpha = fade * (.58 + flicker * .22 + proximity * .12);
      actorCtx.fillStyle = `rgb(${coreStr})`;
      actorCtx.beginPath();
      actorCtx.arc(0, 0, 1.7 + flicker * .7, 0, Math.PI * 2);
      actorCtx.fill();
      actorCtx.restore();
    });
  }

  function drawBooha(now) {
    const seconds = now / 1000;
    const dancing = state.celebrating && state.celebrateDancing;
    const elapsed = dancing ? Math.max(0, (now - state.celebrateStart) / 1000) : 0;
    const settleEase = dancing && state.celebrateSettling
      ? Math.max(0, 1 - ((now - state.celebrateSettleStart) / MUENBA_DANCE_SETTLE_MS))
      : 1;
    const danceFrame = dancing
      ? (REDUCED_MOTION
        ? MUENBA_DANCE_FRAMES[0]
        : state.celebrateSettling
          ? MUENBA_DANCE_FRAMES[0]
          : MUENBA_DANCE_FRAMES[Math.floor(elapsed / 0.5) % MUENBA_DANCE_FRAMES.length])
      : null;
    const danceX = dancing && !REDUCED_MOTION
      ? (Math.sin(elapsed * 1.1) * 48 + Math.sin(elapsed * 2.3) * 20) * settleEase
      : 0;
    const danceY = dancing && !REDUCED_MOTION
      ? (Math.cos(elapsed * 1.4) * 30 + Math.cos(elapsed * 2.9) * 12 + Math.sin(elapsed * 6.2) * 14) * settleEase
      : 0;
    const beat = dancing && !REDUCED_MOTION ? Math.sin(elapsed * 6.2) : 0;
    const bob = dancing ? danceY : Math.sin(seconds * 4.18) * 8;
    const wobble = dancing
      ? Math.sin(elapsed * 3.1) * 14 * settleEase
      : Math.sin(seconds * 8.36) * 2.2;
    const x = state.x + danceX;
    const y = state.y + bob;
    const pulse = .5 + .5 * Math.sin(seconds * 2.1);
    // Hiding (Pass 7) reads visually as faded and slightly smaller —
    // "crouching out of sight" rather than vanishing outright, since the
    // player can still see themselves and knows they're still there.
    const hidingFade = state.hiding ? .4 : 1;
    drawBoohaTrail(now);

    if (dancing) {
      if (settleEase > 0 && Math.random() < .45) spawnMuenbaDanceSparkle(x, y);
      for (let i = muenbaDanceSparkles.length - 1; i >= 0; i--) {
        const sparkle = muenbaDanceSparkles[i];
        sparkle.life -= .014;
        if (sparkle.life <= 0) {
          muenbaDanceSparkles.splice(i, 1);
          continue;
        }
        sparkle.x += sparkle.vx;
        sparkle.y += sparkle.vy;
        const twinkle = .5 + .5 * Math.sin(now / 100 + sparkle.phase);
        actorCtx.save();
        actorCtx.globalAlpha = sparkle.life * twinkle * .9;
        actorCtx.shadowBlur = 7;
        actorCtx.shadowColor = '#ffd700';
        actorCtx.fillStyle = sparkle.color;
        actorCtx.beginPath();
        actorCtx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
        actorCtx.fill();
        actorCtx.restore();
      }
    }

    actorCtx.save();
    actorCtx.translate(x, y);
    actorCtx.rotate(wobble * Math.PI / 180);
    actorCtx.globalAlpha = (dancing ? .98 : .96) * hidingFade;
    if (state.hiding) actorCtx.scale(.82, .82);
    if (dancing) actorCtx.scale((1 + beat * .16) * settleEase + (1 - settleEase), (1 - beat * .2) * settleEase + (1 - settleEase));
    const boohaSprite = dancing ? ensureMuenbaImage(danceFrame.img) : (state.hiding ? hidingImg : ghostImg);
    if (boohaSprite.complete && boohaSprite.naturalWidth > 0) {
      const boxSize = BOOHA_R * 2 * (dancing ? danceFrame.contentScale : 1);
      const offsetX = dancing ? danceFrame.offsetX * boxSize : 0;
      const offsetY = dancing ? danceFrame.offsetY * boxSize : 0;
      actorCtx.drawImage(boohaSprite, -boxSize / 2 + offsetX, -boxSize / 2 + offsetY, boxSize, boxSize);
    } else {
      actorCtx.fillStyle = dancing ? '#ffd75a' : '#ffe56d';
      actorCtx.beginPath();
      actorCtx.arc(0, 0, BOOHA_R * .72, 0, Math.PI * 2);
      actorCtx.fill();
    }
    actorCtx.restore();
  }

  function drawAtmosphere(now) {
    const profile = getRoom().atmosphere;
    drawRoomTint(profile);
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    atmosphereCtx.fillStyle = `rgba(3, 8, 18, ${profile.darkness})`;
    atmosphereCtx.fillRect(0, 0, WORLD_W, WORLD_H);
    atmosphereCtx.fillStyle = profile.tint;
    atmosphereCtx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Room's eerie glow — cached gradient, screen-blended, slow uneven
    // pulse so it breathes instead of sitting static.
    const roomSeed = Number(state.roomId.slice(-2)) || 1;
    const glowPulse = .78 + .22 * Math.sin(now / 2100 + roomSeed);
    atmosphereCtx.save();
    atmosphereCtx.globalAlpha = glowPulse;
    atmosphereCtx.globalCompositeOperation = 'screen';
    atmosphereCtx.drawImage(getRoomGlow(state.roomId), 0, 0);
    atmosphereCtx.restore();

    drawMotes(now);

    if (fogTexture && profile.fog > 0) {
      if (!REDUCED_MOTION) state.fogX = (state.fogX + .12) % 780;
      const mood = FOG_MOODS[profile.fogMood] || FOG_MOODS.low;
      const fogMotion = state.fogX * mood.speed * mood.direction;
      const fogPulse = REDUCED_MOTION ? .90 : .86 + .14 * Math.sin(now / 2600 + mood.phase);
      const fogAlpha = profile.fog * fogPulse;
      const slowDrift = fogMotion * .46;
      atmosphereCtx.save();
      // Distant haze: room moods change its height, strength, and direction.
      atmosphereCtx.globalAlpha = fogAlpha * mood.upper;
      atmosphereCtx.drawImage(fogTexture, -700 + slowDrift, mood.upperY, 900, 230);
      atmosphereCtx.globalAlpha = fogAlpha * mood.middle;
      atmosphereCtx.drawImage(fogTexture, 140 - slowDrift * 1.35, mood.middleY, 820, 190);

      // Near-ground bank: a second cached texture moving at a different rate
      // makes the room feel alive without the cost of many individual motes.
      if (lowFogTexture) {
        atmosphereCtx.globalAlpha = fogAlpha * mood.low;
        atmosphereCtx.drawImage(lowFogTexture, -110 + fogMotion, 620, 980, 170);
        atmosphereCtx.globalAlpha = fogAlpha * mood.echo;
        atmosphereCtx.drawImage(lowFogTexture, 760 - fogMotion * .72, 510, 760, 150);
      }
      if (wispFogTexture) {
        const wispMotion = fogMotion * 1.28;
        atmosphereCtx.globalAlpha = fogAlpha * .62;
        atmosphereCtx.drawImage(wispFogTexture, -180 + wispMotion, 438, 1120, 150);
        atmosphereCtx.globalAlpha = fogAlpha * .38;
        atmosphereCtx.drawImage(wispFogTexture, 640 - wispMotion * .65, 320, 980, 128);
      }
      if (foregroundFogTexture) {
        const foregroundMotion = fogMotion * .34;
        atmosphereCtx.globalAlpha = fogAlpha * (.34 + mood.low * .12);
        atmosphereCtx.drawImage(foregroundFogTexture, -250 + foregroundMotion, 706, 1420, 190);
      }
      atmosphereCtx.restore();
    }
    if (vignetteCanvas) {
      const vignettePulse = REDUCED_MOTION ? .94 : .88 + .12 * Math.sin(now / 3500 + roomSeed * .7);
      atmosphereCtx.save();
      atmosphereCtx.globalAlpha = vignettePulse;
      atmosphereCtx.drawImage(vignetteCanvas, 0, 0);
      atmosphereCtx.restore();
    }
    const returnTripActive = Number(readMuenba().orbsPending) > 0
      && state.roomId !== MUENBA_NUPPI.roomId;
    if (returnTripActive && carriedEnergyVignetteCanvas) {
      const dreadPulse = REDUCED_MOTION
        ? .72
        : .64 + .20 * Math.sin(now / 720 + roomSeed * .53);
      atmosphereCtx.save();
      atmosphereCtx.globalAlpha = dreadPulse;
      atmosphereCtx.drawImage(carriedEnergyVignetteCanvas, 0, 0);
      atmosphereCtx.restore();
    }
    drawLanternFlicker(now);
    drawSpiritLight(now);
  }

  function drawRoomTint(profile) {
    if (!roomTintCtx) return;
    const rgb = hexToRgb(roomGlowHex(state.roomId));
    roomTintCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    // CSS composites this canvas with multiply, sinking the accent color into
    // stone and moss instead of painting a flat wash over the photograph.
    const alpha = Math.max(.30, Math.min(.45, profile.tintAlpha || .34));
    roomTintCtx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    roomTintCtx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  function drawSpiritLight(now) {
    if (!activeGhost || !spiritMaskCanvas) return;
    const bob = Math.sin(now / 1000 * 3.4 + 1) * 6;
    const x = activeGhost.x;
    const y = activeGhost.y + bob;
    const pulse = REDUCED_MOTION ? .82 : .72 + .28 * Math.sin(now / 900 + x * .01);
    const glow = getSpiritGlow(state.roomId);

    // First add a low room-colored halo on top of the vignette, then clear its
    // center. The actor canvas is drawn afterward, so the ghost appears to
    // carry the light instead of being washed out by it.
    atmosphereCtx.save();
    atmosphereCtx.globalCompositeOperation = 'screen';
    atmosphereCtx.globalAlpha = .58 + pulse * .16;
    atmosphereCtx.drawImage(glow, x - 160, y - 160, 320, 320);
    atmosphereCtx.restore();

    if (roomTintCtx) {
      roomTintCtx.save();
      roomTintCtx.globalCompositeOperation = 'destination-out';
      roomTintCtx.globalAlpha = .48 + pulse * .12;
      roomTintCtx.drawImage(spiritMaskCanvas, x - 160, y - 160, 320, 320);
      roomTintCtx.restore();
    }
    atmosphereCtx.save();
    atmosphereCtx.globalCompositeOperation = 'destination-out';
    atmosphereCtx.globalAlpha = .70 + pulse * .12;
    atmosphereCtx.drawImage(spiritMaskCanvas, x - 160, y - 160, 320, 320);
    atmosphereCtx.restore();
  }

  function drawDangerFlash(now) {
    if (now >= state.dangerFlashUntil) return;
    const remaining = state.dangerFlashUntil - now;
    const pulse = .5 + .5 * Math.sin(now / 48);
    const alpha = Math.min(.34, .12 + pulse * .12, remaining / 260);
    actorCtx.save();
    actorCtx.fillStyle = `rgba(190, 12, 35, ${Math.max(.04, alpha)})`;
    actorCtx.fillRect(0, 0, WORLD_W, WORLD_H);
    actorCtx.strokeStyle = `rgba(255, 88, 103, ${.18 + pulse * .18})`;
    actorCtx.lineWidth = 10;
    actorCtx.strokeRect(6, 6, WORLD_W - 12, WORLD_H - 12);
    actorCtx.restore();
  }

  function drawFrame(now) {
    atmosphereCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    actorCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawAtmosphere(now);
    drawReturnPortal(now);
    drawNuppi(now);
    drawExitArrows(now);
    drawGhost(now);
    drawBooha(now);
    drawDangerFlash(now);
  }

  function stagePoint(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * WORLD_W / rect.width,
      y: (clientY - rect.top) * WORLD_H / rect.height
    };
  }

  function handleInput(clientX, clientY) {
    startMusic();
    if (!isMuenbaOrientationReady()) return;
    if (state.transitioning || returnPortalOpen || lobbyOpen || captureOpen || state.hiding) return;
    const point = stagePoint(clientX, clientY);
    // Pass 10: a tap during the entry-drift walk-to-center used to be
    // silently swallowed by the inputLocked check below, so the drift kept
    // snapping Booha to the room center regardless of what the player just
    // tapped — that's the "teleport" bug. Treat a real tap as the player
    // taking over: cancel the drift and walk to the tapped point instead,
    // the same way any other click sets a destination.
    if (entryDrift) {
      if (Math.hypot(point.x - state.x, point.y - state.y) < 30) return;
      entryDrift = null;
      state.inputLocked = false;
      state.distMovedSinceSpawn = Math.max(state.distMovedSinceSpawn, ARROW_MOVE_THRESHOLD);
      state.clickTarget = point;
      return;
    }
    if (state.inputLocked) return;
    if (clickCheckReturnPortal(point.x, point.y)) return;
    if (clickCheckNuppi(point.x, point.y)) return;
    if (clickCheckGhost(point.x, point.y)) return;
    if (Math.hypot(point.x - state.x, point.y - state.y) < 30) return;
    // The first valid movement input is the player's acknowledgement that
    // the new room is ready. Reveal the exits immediately instead of making
    // the player spend another tap waiting for the old movement threshold.
    state.distMovedSinceSpawn = Math.max(state.distMovedSinceSpawn, ARROW_MOVE_THRESHOLD);
    state.clickTarget = point;
  }

  function bindInput() {
    stage.addEventListener('click', event => {
      if (performance.now() - lastTouchEnd < 500) return;
      handleInput(event.clientX, event.clientY);
    });
    stage.addEventListener('touchend', event => {
      if (!event.changedTouches.length) return;
      lastTouchEnd = performance.now();
      const touch = event.changedTouches[0];
      handleInput(touch.clientX, touch.clientY);
      event.preventDefault();
    }, { passive: false });
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('touchend', startMusic, { once: true, passive: true });
  }

  function tick(now) {
    const dt = Math.min(32, Math.max(8, now - (state.lastTickTime || now)));
    state.lastTickTime = now;
    state.speed = BASE_SPEED * Math.min(1.6, dt / TARGET_DT);
    syncMuenbaOrientationMode();
    const orientationReady = isMuenbaOrientationReady();
    // Entry drift must continue independently of overlays. The lobby now
    // waits for it on initial arrival, but this guard also protects any future
    // handoff that opens a modal during the same arrival window.
    const drifting = orientationReady && !state.transitioning && tickEntryDrift(now);
    if (orientationReady && !state.transitioning && !returnPortalOpen && !lobbyOpen && !captureOpen) {
      if (!drifting && !state.inputLocked) {
        if (!state.hiding) {
          handleMovement(now);
          const exit = getAvailableExit(now);
          if (exit) transitionTo(exit);
          checkReturnPortalProximity(now);
        }
        tickGhost(now);
      }
    }
    drawFrame(now);
    window.requestAnimationFrame(tick);
  }

  function init() {
    if (!worldGateOpen()) {
      showLockedWorld();
      return;
    }
    validateData();
    validateCaseData();
    injectStyles();
    buildApp();
    bindMuenbaOrientationController();
    fitStage();
    resizeCanvas();
    setRoom(state.roomId, state.spawnId, null);
    bindInput();
    window.addEventListener('resize', () => { fitStage(); resizeCanvas(); });
    window.requestAnimationFrame(tick);
    openNuppiLobbyAfterEntry();
  }

  if (window.BOOHA_READY) init();
  else document.addEventListener('booha:ready', init, { once: true });

  Object.defineProperty(window, 'b_muenba', {
    value: () => {
      window.__devMuenba = true;
      if (!DEV_MODE) window.location.href = 'muenba.html?dev=1';
    },
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
