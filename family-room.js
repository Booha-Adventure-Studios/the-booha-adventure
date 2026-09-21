(() => {
  'use strict';

  const SAVE_ID = 'bonus:family_room';
  const CASE_PHASES = Object.freeze([
    Object.freeze({ id: 'quiet', rounds: 3, maxChanges: 1, twoChangeChance: 0, audioOnlyChance: .08, pataskalaBaseChance: 0 }),
    Object.freeze({ id: 'uneasy', rounds: 4, maxChanges: 2, twoChangeChance: .2, audioOnlyChance: .13, pataskalaBaseChance: .1 }),
    Object.freeze({ id: 'danger', rounds: 4, maxChanges: 2, twoChangeChance: .42, audioOnlyChance: .18, pataskalaBaseChance: .24 }),
  ]);
  const CASE_ROUNDS = CASE_PHASES.reduce((total, phase) => total + phase.rounds, 0);
  const MARK_HOLD_MS = 600;
  const MARK_DEAD_ZONE_PX = 8;
  const WRONG_MARK_GRACE_MS = 700;
  const WRONG_MARK_TELEGRAPH_MS = 1500;
  const CLUE_DISPLAY_MS = 7600;
  const PANEL_FADE_MS = 320;
  const PATA_DISCOVERY_MS = 1500;
  const PATASKALA_SIZE_MULTIPLIER = 2.5;
  const PATA_SPEED_FAR = .075;
  const PATA_SPEED_NEAR = .14;
  const PATA_COOLDOWN_ROUNDS = 2;
  const PATA_CATCH_DISTANCE = .065;
  const PATASKALA_RECOIL_DISTANCE = .16;
  const FLASHLIGHT_BURST_MS = 560;
  const MAX_FLASHLIGHT_CHARGES = 5;
  const COMPLETION_QUIET_MS = 2400;
  const DEBUG_ROOM_COORDINATES = false;
  const EXIT_BAND_V = .86;
  const MOBILE_ROOM_MAX_WIDTH = 620;
  const MOBILE_GAMEPLAY_ZOOM = 1.55;
  const FAILURE_SILENCE_MS = 1200;
  const FAILURE_PANEL_DELAY_MS = 1800;
  const FAMILY_AUDIO = Object.freeze({
    bgm: 'assets/family-room/audio/family_BGM.mp3',
    move: 'assets/family-room/audio/family_move-1.mp3',
    anomaly: 'assets/family-room/audio/family_anomaly-1.mp3',
    jump1: 'assets/family-room/audio/family_jump-1.mp3',
    jump2: 'assets/family-room/audio/family_jump-2.mp3',
  });
  const AUDIO_LEVELS = Object.freeze({ bgm: .07, move: .16, anomaly: .34, jump: .58, master: .72 });
  const FAMILY_SFX_NAMES = Object.freeze(['move', 'anomaly', 'jump1', 'jump2']);
  const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const LOW_POWER = (Number.isFinite(window.navigator?.deviceMemory) && window.navigator.deviceMemory <= 2)
    || (Number.isFinite(window.navigator?.hardwareConcurrency) && window.navigator.hardwareConcurrency <= 2);
  if (LOW_POWER) document.documentElement.classList.add('low-power');
  const TIER_RULES = Object.freeze({
    patient: { label: 'THE ROOM IS PATIENT', alertMultiplier: 2, realTellChance: 1, falseAlertChance: 0, audioOnlyChance: .08, maxChanges: 1, twoChangeChance: 0, hazardSpeed: 115, jumpLevel: .24, burnMs: 35000 },
    quicker: { label: 'THE ROOM IS QUICKER', alertMultiplier: 1.2, realTellChance: .55, falseAlertChance: .1, audioOnlyChance: .12, maxChanges: 2, twoChangeChance: .24, hazardSpeed: 165, jumpLevel: .4, burnMs: 18000 },
    lies: { label: 'THE ROOM LIES TO YOU', alertMultiplier: 1, realTellChance: .3, falseAlertChance: .25, audioOnlyChance: .16, maxChanges: 2, twoChangeChance: .52, hazardSpeed: 210, jumpLevel: .58, burnMs: 12000 },
  });

  // Pass 1 design lock: the house order and content vocabulary live in one
  // registry before later study, marking, and room-art passes consume it.
  const FAMILY_CHANGE_TYPES = Object.freeze(['ADD', 'REMOVE', 'MOVE', 'TURN', 'SWAP', 'COUNT', 'STATE', 'WRONG']);
  const FAMILY_HOUSE_CASES = Object.freeze([
    Object.freeze({ number: 0, id: 'engawa', name: 'ENGAWA', jp: 'えんがわ', role: 'hub', light: 'purple lanterns', exit: 'garden steps', feel: 'safe' }),
    Object.freeze({ number: 1, id: 'genkan', name: 'GENKAN', jp: 'げんかん', light: 'bare bulb and purple spill', exit: 'front door', feel: 'ordinary tutorial', status: 'built', pataskalaCharges: 1 }),
    Object.freeze({ number: 2, id: 'chanoma', name: 'CHANOMA', jp: 'ちゃのま', light: 'andon', exit: 'engawa step', feel: 'reference case', status: 'built', pataskalaCharges: 1 }),
    Object.freeze({ number: 3, id: 'daidokoro', name: 'DAIDOKORO', jp: 'だいどころ', light: 'failing fluorescent tube', exit: 'corridor doorway', feel: 'drips, ticks, and a sink window' }),
    Object.freeze({ number: 4, id: 'roka', name: 'ROKA', jp: 'ろうか', light: 'moonlight through shoji', exit: 'far end', feel: 'mostly state changes' }),
    Object.freeze({ number: 5, id: 'kodomo-beya', name: 'KODOMO-BEYA', jp: 'こどもべや', light: 'small night light', exit: 'door', feel: 'cute vocabulary room' }),
    Object.freeze({ number: 6, id: 'ofuro', name: 'OFURO', jp: 'おふろ', light: 'single bulb and steam', exit: 'sliding door', feel: 'mirror room' }),
    Object.freeze({ number: 7, id: 'oshiire', name: 'OSHIIRE', jp: 'おしいれ', light: 'small candle or borrowed light', exit: 'sliding door', feel: 'closet dread', alternative: 'butsuma' }),
    Object.freeze({ number: 8, id: 'nando', name: 'NANDO', jp: 'なんど', light: 'swinging bare bulb', exit: 'stairs down', feel: 'Pataskala room' }),
  ]);
  const FAMILY_HOUSE_RULES = Object.freeze({
    roundsPerCase: CASE_ROUNDS,
    study: Object.freeze({ perCase: true, timed: false, repeatOnCaseRestart: false, reviewFromHub: true }),
    mistake: Object.freeze({ action: 'restart-case', unlimitedRestarts: true }),
    changes: Object.freeze({ patient: 'zero-or-one', quicker: 'zero-one-or-occasional-two', lies: 'zero-one-or-more-two' }),
    pataskala: Object.freeze({ role: 'threat', scoredTarget: false, markableTarget: false, risesWithCaseDepth: true, finalRoom: 'nando' }),
    production: Object.freeze({ masterOnly: true, canvas: '1024x1536', safeBand: [0.22, 0.78], exitEdgeRequired: true }),
  });
  const DEFAULT_CASE_ID = 'genkan';
  let ACTIVE_CASE_ID = DEFAULT_CASE_ID;
  let ACTIVE_CASE = FAMILY_HOUSE_CASES.find(entry => entry.id === ACTIVE_CASE_ID);
  let ACTIVE_CASE_LABEL = String(ACTIVE_CASE.number).padStart(2, '0');
  const TIER_RANK = Object.freeze({ patient: 1, quicker: 2, lies: 3 });

  function buildUiCopy() {
    return Object.freeze({
      caseReset: { kicker: `CASE FILE ${ACTIVE_CASE_LABEL} / CASE RESET`, kickerJp: `じけんファイル ${ACTIVE_CASE_LABEL} / じけんを はじめから`, title: 'THE ROOM SENT YOU BACK.', titleJp: 'へやが あなたを もどした。', copy: 'A mistake sends you back to the start of this case. The study room will not return. Try again when you are ready.', copyJp: 'まちがえると、この じけんの はじめに もどる。おぼえる へやは もう でてこない。じゅんびが できたら、もういちど やってみよう。', button: 'RESTART THE CASE', buttonJp: 'じけんを やりなおす' },
      lightLostReport: { kicker: `CASE FILE ${ACTIVE_CASE_LABEL} / LIGHT LOST`, kickerJp: `じけんファイル ${ACTIVE_CASE_LABEL} / あかりが きえた`, title: 'THE ROOM KEPT YOU.', titleJp: 'へやに つかまった。', copy: 'The case is not closed. Bring the light back and try the room again.', copyJp: 'じけんは おわっていない。あかりを もどして、もういちど へやを やってみよう。', button: 'RESTART THE CASE', buttonJp: 'じけんを やりなおす' },
      complete: { kicker: `CASE FILE ${ACTIVE_CASE_LABEL} / SEALED`, kickerJp: `じけんファイル ${ACTIVE_CASE_LABEL} / ふういん`, title: 'THE ROOM LET GO.', titleJp: 'へやが はなした。', copy: 'You kept the room in view. Your notes are filed, and the door is where you left it.', copyJp: 'へやを みつづけた。きろくを のこした。ドアは おいた ばしょに ある。', button: 'RETURN TO THE PROFILE', buttonJp: 'プロフィールへ もどる' },
    });
  }
  let UI_COPY = buildUiCopy();

  const PATASKALA_POSES = [
    { id: 'pataskala_far', target: [.7, .29, .22], artSize: .16, en: 'Something is far inside the room.', jp: 'なにかが へやの おくに いる。', kind: 'threat', character: 'pataskala', stage: 0 },
    { id: 'pataskala_enter', target: [.74, .43, .22], artSize: .2, en: 'Something is entering the room.', jp: 'なにかが へやに はいってくる。', kind: 'threat', character: 'pataskala', stage: .22 },
    { id: 'pataskala_approach', target: [.73, .56, .22], artSize: .24, en: 'Something is coming closer.', jp: 'なにかが ちかづいてくる。', kind: 'threat', character: 'pataskala', stage: .48 },
    { id: 'pataskala_near', target: [.25, .47, .22], artSize: .28, en: 'Something is almost here.', jp: 'なにかが すぐ そこに いる。', kind: 'threat', character: 'pataskala', stage: .76 },
    { id: 'pataskala_catch', target: [.25, .47, .22], artSize: .34, en: 'The shadow is on you.', jp: 'かげが あなたに おいついた。', kind: 'threat', character: 'pataskala', stage: 1 },
  ];
  const PATASKALA_ASSET_REV = '2026-09-18-v3';
  const pataskalaAssetUrl = pose => `assets/family-room/pataskala/${pose.id}.webp?v=${PATASKALA_ASSET_REV}`;

  const CHANOMA_ROOM_ANCHORS = Object.freeze({
    tableLeft: Object.freeze({ u: .23, v: .48, radius: .09, scale: .94, region: 'middle-left' }),
    tableCenter: Object.freeze({ u: .35, v: .49, radius: .1, scale: 1, region: 'middle-center' }),
    tableRight: Object.freeze({ u: .45, v: .49, radius: .1, scale: .96, region: 'middle-right' }),
    shojiLeft: Object.freeze({ u: .36, v: .25, radius: .11, scale: .94, region: 'upper-left' }),
    shojiCenter: Object.freeze({ u: .54, v: .25, radius: .11, scale: 1, region: 'upper-center' }),
    shojiRight: Object.freeze({ u: .7, v: .25, radius: .12, scale: .98, region: 'upper-right' }),
    alcove: Object.freeze({ u: .23, v: .24, radius: .12, scale: 1, region: 'upper-left' }),
    futonFar: Object.freeze({ u: .74, v: .37, radius: .15, scale: .96, region: 'middle-right' }),
    futonNear: Object.freeze({ u: .74, v: .55, radius: .18, scale: 1.08, region: 'lower-right' }),
    tatamiFar: Object.freeze({ u: .55, v: .61, radius: .14, scale: .9, region: 'middle-center' }),
    tatamiNear: Object.freeze({ u: .55, v: .7, radius: .16, scale: 1.05, region: 'lower-center' }),
  });

  const CHANOMA_ANOMALY_ANCHORS = Object.freeze({
    bowl: ['tableRight', 'tableCenter'],
    cup: ['tableLeft', 'tableCenter', 'tableRight'],
    eyes: ['shojiLeft', 'shojiCenter', 'shojiRight'],
    shadow: ['shojiLeft', 'shojiCenter', 'shojiRight'],
    talisman: ['alcove'],
    lantern: ['alcove'],
    futon: ['futonFar', 'futonNear'],
    seams: ['tatamiFar', 'tatamiNear'],
    teapot: ['tableLeft', 'tableCenter'],
    crescent: ['shojiLeft', 'shojiCenter', 'shojiRight'],
  });
  const CHANOMA_PATASKALA_SPAWN_ANCHORS = Object.freeze([
    Object.freeze({ id: 'rear-shoji', u: .52, v: .22, region: 'upper-center' }),
    Object.freeze({ id: 'rear-right', u: .75, v: .31, region: 'upper-right' }),
    Object.freeze({ id: 'left-alcove', u: .23, v: .28, region: 'upper-left' }),
    Object.freeze({ id: 'far-doorway', u: .58, v: .38, region: 'middle-center' }),
  ]);

  const CHANOMA_ANOMALIES = [
    { id: 'bowl', target: [.74, .51, .09], artSize: .09, en: "The bowl wasn't there before.", jp: 'おわんが なかった。', labelEn: 'BOWL', labelJp: 'おわん', kind: 'added' },
    { id: 'cup', target: [.35, .49, .1], artSize: .075, en: 'There is one cup too many.', jp: 'コップが ひとつ おおい。', labelEn: 'CUP', labelJp: 'コップ', kind: 'duplicated' },
    { id: 'eyes', target: [.73, .25, .12], artSize: .08, en: 'Something is watching from the shoji.', jp: 'しょうじから だれかが みている。', labelEn: 'SHOJI', labelJp: 'しょうじ', kind: 'watching' },
    { id: 'shadow', target: [.68, .23, .18], artSize: .25, en: 'The shadow behind the shoji moved.', jp: 'しょうじの かげが うごいた。', labelEn: 'SHOJI SHADOW', labelJp: 'しょうじの かげ', kind: 'state' },
    { id: 'talisman', target: [.23, .23, .12], artSize: .09, en: 'A paper charm was not there before.', jp: 'おふだが なかった。', labelEn: 'PAPER CHARM', labelJp: 'おふだ', kind: 'added' },
    { id: 'lantern', target: [.23, .31, .12], artSize: .075, en: 'The lantern flame is looking the wrong way.', jp: 'あんどんの ほのおが ちがう。', labelEn: 'LANTERN', labelJp: 'あんどん', kind: 'state' },
    { id: 'futon', target: [.76, .37, .16], artSize: .2, en: 'The futon is facing the room.', jp: 'ふとんが へやを むいている。', labelEn: 'FUTON', labelJp: 'ふとん', kind: 'moved' },
    { id: 'seams', target: [.55, .68, .16], artSize: .06, en: 'One tatami seam has disappeared.', jp: 'たたみの めが ひとつ きえた。', labelEn: 'TATAMI SEAM', labelJp: 'たたみの め', kind: 'missing' },
    { id: 'teapot', target: [.29, .44, .12], artSize: .095, en: 'The teapot has turned toward you.', jp: 'きゅうすが こちらを むいた。', labelEn: 'TEAPOT', labelJp: 'きゅうす', kind: 'moved' },
    { id: 'crescent', target: [.77, .30, .1], artSize: .08, en: 'A small moon is inside the room.', jp: 'へやの なかに つきが ある。', labelEn: 'MOON', labelJp: 'つき', kind: 'added' },
  ];
  const AUDIO_ONLY_CHANGE = Object.freeze({ id: 'audio-only', en: 'The room made a sound it did not make before.', jp: 'へやが まえには しなかった おとを たてた。', labelEn: 'THE ROOM', labelJp: 'へや', kind: 'audio' });

  const GENKAN_ROOM_ANCHORS = Object.freeze({
    cabinetTop: Object.freeze({ u: .27, v: .41, radius: .11, scale: .95, region: 'upper-left' }),
    cabinetFace: Object.freeze({ u: .27, v: .55, radius: .12, scale: 1, region: 'middle-left' }),
    shoes: Object.freeze({ u: .35, v: .69, radius: .12, scale: .96, region: 'lower-left' }),
    tileLeft: Object.freeze({ u: .39, v: .61, radius: .13, scale: .94, region: 'middle-left' }),
    tileCenter: Object.freeze({ u: .53, v: .62, radius: .14, scale: 1, region: 'middle-center' }),
    tileRight: Object.freeze({ u: .68, v: .61, radius: .14, scale: .98, region: 'middle-right' }),
    threshold: Object.freeze({ u: .53, v: .8, radius: .1, scale: .92, region: 'lower-center' }),
    doorLeft: Object.freeze({ u: .4, v: .39, radius: .12, scale: .94, region: 'upper-left' }),
    doorOpen: Object.freeze({ u: .63, v: .4, radius: .15, scale: 1, region: 'upper-center' }),
    doorRight: Object.freeze({ u: .74, v: .43, radius: .14, scale: .98, region: 'upper-right' }),
    coatHook: Object.freeze({ u: .74, v: .33, radius: .12, scale: .9, region: 'upper-right' }),
  });

  const GENKAN_ANOMALY_ANCHORS = Object.freeze({
    shoes_extra: ['shoes', 'tileLeft'],
    umbrella_floor: ['tileRight', 'tileCenter'],
    door_shadow: ['doorOpen', 'doorRight'],
    coat_turn: ['coatHook'],
    threshold_talisman: ['threshold'],
    wet_footprints: ['tileCenter', 'threshold'],
  });

  const GENKAN_PATASKALA_SPAWN_ANCHORS = Object.freeze([
    Object.freeze({ id: 'open-front-door', u: .63, v: .38, region: 'upper-center' }),
    Object.freeze({ id: 'door-right', u: .74, v: .43, region: 'upper-right' }),
    Object.freeze({ id: 'cabinet-shadow', u: .27, v: .48, region: 'middle-left' }),
    Object.freeze({ id: 'threshold-edge', u: .53, v: .78, region: 'lower-center' }),
  ]);

  const GENKAN_ANOMALIES = [
    { id: 'shoes_extra', assetId: 'genkan_shoes_extra', target: [.35, .69, .12], artSize: .15, en: 'There is another pair of shoes.', jp: 'くつが もう ひとそろい ある。', labelEn: 'EXTRA SHOES', labelJp: 'もうひとそろいの くつ', kind: 'added' },
    { id: 'umbrella_floor', assetId: 'genkan_umbrella_floor', target: [.68, .61, .14], artSize: .18, en: 'An umbrella is lying where nobody left it.', jp: 'だれも おいていない かさが おちている。', labelEn: 'FLOOR UMBRELLA', labelJp: 'ゆかの かさ', kind: 'added' },
    { id: 'door_shadow', assetId: 'genkan_door_shadow', target: [.63, .4, .15], artSize: .2, en: 'A shadow is standing outside the open door.', jp: 'あいた ドアの そとに かげが たっている。', labelEn: 'DOOR SHADOW', labelJp: 'ドアの かげ', kind: 'watching' },
    { id: 'coat_turn', assetId: 'genkan_coat_turn', target: [.74, .33, .12], artSize: .17, en: 'The hanging cloth is facing the wrong way.', jp: 'かかっている ぬのが ちがう ほうを むいている。', labelEn: 'COAT HOOK', labelJp: 'コートかけ', kind: 'state' },
    { id: 'threshold_talisman', assetId: 'genkan_threshold_talisman', target: [.53, .8, .1], artSize: .11, en: 'A paper charm has appeared on the threshold.', jp: 'しきいに おふだが あらわれた。', labelEn: 'THRESHOLD CHARM', labelJp: 'しきいの おふだ', kind: 'added' },
    { id: 'wet_footprints', assetId: 'genkan_wet_footprints', target: [.53, .7, .14], artSize: .17, en: 'Wet footprints lead in from the garden.', jp: 'ぬれた あしあとが にわから つづいている。', labelEn: 'WET FOOTPRINTS', labelJp: 'ぬれた あしあと', kind: 'state' },
  ];

  const CASE_CONTENT = Object.freeze({
    chanoma: Object.freeze({ base: 'assets/family-room/living_base.webp', roomAnchors: CHANOMA_ROOM_ANCHORS, anomalyAnchors: CHANOMA_ANOMALY_ANCHORS, pataskalaSpawnAnchors: CHANOMA_PATASKALA_SPAWN_ANCHORS, anomalies: CHANOMA_ANOMALIES }),
    genkan: Object.freeze({ base: 'assets/family-room/genkan_base.webp', roomAnchors: GENKAN_ROOM_ANCHORS, anomalyAnchors: GENKAN_ANOMALY_ANCHORS, pataskalaSpawnAnchors: GENKAN_PATASKALA_SPAWN_ANCHORS, anomalies: GENKAN_ANOMALIES }),
  });
  const BUILT_CASE_IDS = Object.freeze(['genkan', 'chanoma']);

  let anomalies = CHANOMA_ANOMALIES;
  let ROOM_ANCHORS = CHANOMA_ROOM_ANCHORS;
  let ANOMALY_ANCHORS = CHANOMA_ANOMALY_ANCHORS;
  let PATASKALA_SPAWN_ANCHORS = CHANOMA_PATASKALA_SPAWN_ANCHORS;

  const overlayAssetUrl = anomaly => `assets/family-room/overlays/${anomaly.assetId || anomaly.id}.webp`;

  const canvas = document.getElementById('room-canvas');
  const ctx = canvas.getContext('2d');
  const controls = document.getElementById('controls');
  const startPanel = document.getElementById('start-panel');
  const studyPanel = document.getElementById('study-panel');
  const messagePanel = document.getElementById('message-panel');
  const messageKicker = document.getElementById('message-kicker');
  const messageTitle = document.getElementById('message-title');
  const messageCopy = document.getElementById('message-copy');
  const messageButton = document.getElementById('message-button');
  const messageKickerEn = document.getElementById('message-kicker-en');
  const messageKickerJp = document.getElementById('message-kicker-jp');
  const messageTitleEn = document.getElementById('message-title-en');
  const messageTitleJp = document.getElementById('message-title-jp');
  const messageCopyEn = document.getElementById('message-copy-en');
  const messageCopyJp = document.getElementById('message-copy-jp');
  const messageButtonEn = document.getElementById('message-button-en');
  const messageButtonJp = document.getElementById('message-button-jp');
  const curtain = document.getElementById('transition-curtain');
  const observationEn = document.getElementById('observation-en');
  const observationJp = document.getElementById('observation-jp');
  const andon = document.getElementById('andon');
  const andonFill = document.getElementById('andon-fill');
  const leaveButton = document.getElementById('leave-button');
  const clueCard = document.getElementById('clue-card');
  const clueCloseButton = document.getElementById('clue-close');
  const clueEn = document.getElementById('clue-en');
  const clueJp = document.getElementById('clue-jp');
  const soundToggle = document.getElementById('sound-toggle');
  const soundState = document.getElementById('sound-state');
  const soundStateJp = document.getElementById('sound-state-jp');
  const leaveEn = document.getElementById('leave-en');
  const leaveJp = document.getElementById('leave-jp');
  const undoButton = document.getElementById('undo-button');
  const markConfirmPanel = document.getElementById('mark-confirm-panel');
  const markConfirmTitleEn = document.getElementById('mark-confirm-title-en');
  const markConfirmTitleJp = document.getElementById('mark-confirm-title-jp');
  const markConfirmObjectEn = document.getElementById('mark-confirm-object-en');
  const markConfirmObjectJp = document.getElementById('mark-confirm-object-jp');
  const markYesButton = document.getElementById('mark-yes-button');
  const markNoButton = document.getElementById('mark-no-button');
  const flyAwayButton = document.getElementById('fly-away-button');
  const flashlightButton = document.getElementById('flashlight-button');
  const flashlightChargeCopy = document.getElementById('flashlight-charge-copy');
  const backButton = document.getElementById('back-button');
  const studyStartButton = document.getElementById('study-start-button');
  const studyBackButton = document.getElementById('study-back-button');
  const flameEls = [...document.querySelectorAll('[data-flame]')];
  const startCaseKickerEn = document.getElementById('start-case-kicker-en');
  const startCaseKickerJp = document.getElementById('start-case-kicker-jp');
  const studyCaseKickerEn = document.getElementById('study-case-kicker-en');
  const studyCaseKickerJp = document.getElementById('study-case-kicker-jp');
  const tierButtons = [...document.querySelectorAll('[data-tier]')];
  const tierNote = document.getElementById('tier-note');

    const FAMILY_DEFERRED_ASSETS = Object.freeze([
      ...Object.values(FAMILY_AUDIO),
      ...PATASKALA_POSES.map(pataskalaAssetUrl),
  ]);

  const baseImage = new Image();
  const idleBooha = new Image();
  idleBooha.src = 'assets/family-room/booha_idle.webp';
  const alertBooha = new Image();
  alertBooha.src = 'assets/family-room/booha_alert.webp';
  function applyBoohaSkin() {
    idleBooha.src = window.BoohaSkins?.asset('familyRoom') || 'assets/family-room/booha_idle.webp';
    alertBooha.src = window.BoohaSkins?.asset('marking') || 'assets/family-room/booha_alert.webp';
  }
  let anomalyArt = {};
  const pataskalaArt = Object.fromEntries(PATASKALA_POSES.map(pose => {
    const image = new Image();
    image.src = pataskalaAssetUrl(pose);
    return [pose.id, image];
  }));

  let width = 0;
  let height = 0;
  let dpr = 1;
  let plate = { x: 0, y: 0, w: 0, h: 0 };
  let roomCamera = { x: 0, y: 0 };
  let vignetteCanvas = null;
  let scanlineCanvas = null;
  let animationFrame = 0;
  let resizeFrame = 0;
  let state = 'title';
  let selectedTier = 'patient';
  let round = 0;
  let progress = 0;
  let marks = 0;
  let correctCalls = 0;
  let currentAnomaly = null;
  let currentAnomalies = [];
  let recentAnomalyIds = [];
  let recentAnchorRegions = [];
  let currentPresence = null;
  let pataskalaThreat = null;
  let flashlightCharges = 0;
  let flashlightBurst = null;
  let failureThreat = null;
  let pataskalaCooldownRounds = 0;
  let currentAudioOnly = false;
  let currentIsAnomaly = false;
  let wrongMarkHazard = null;
  let falseAlertPoint = null;
  let tellAvailable = false;
  let roundStarted = 0;
  let transitionStarted = 0;
  let entryStarted = 0;
  let caseStarted = 0;
  let audioEnabled = true;
  let audioContext = null;
  let audioMasterGain = null;
  let ambientGain = null;
  let ambientOscillator = null;
  let bgmGain = null;
  let bgmSource = null;
  let audioBuffers = Object.create(null);
  let sfxLoadPromise = null;
  let bgmLoadPromise = null;
  let droneTellTimer = 0;
  let studyCurtainTimer = 0;
  let pataskalaMoveTimer = 0;
  let pataskalaMoveDueAt = 0;
  let markConfirmPausedAt = 0;
  let markConfirmMoveWasScheduled = false;
  let markConfirmMoveRemainingMs = 0;
  let clueTimer = 0;
  let clueFadeTimer = 0;
  let clueQueue = [];
  let clueActive = false;
  let queuedObservation = null;
  let booha = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let pointerActive = false;
  let activePointerId = null;
  let keyboardMarkActive = false;
  let markHoldOrigin = null;
  let markHoldStartedAt = 0;
  let markHoldTimer = 0;
  let markLocked = false;
  let markedPoints = [];
  let undoGhost = null;
  let pendingMark = null;
  let burnoutHandled = false;
  let failureStarted = 0;
  let pauseStartedAt = 0;
  let transitionTimer = 0;
  let failureJumpTimer = 0;
  let failurePanelTimer = 0;
  let completionTimer = 0;
  let clueVersion = 0;
  let roundToken = 0;
  let completionSubmitted = false;
  let nextCaseId = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeOut = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  const random = list => list[Math.floor(Math.random() * list.length)];

  function roomPoint([u, v]) { return [plate.x + clamp(u, 0, 1) * plate.w, plate.y + clamp(v, 0, 1) * plate.h]; }
  function roomCoordinates(x, y, sourcePlate = plate) {
    if (!sourcePlate.w || !sourcePlate.h) return { u: .5, v: .5 };
    return {
      u: clamp((x - sourcePlate.x) / sourcePlate.w, 0, 1),
      v: clamp((y - sourcePlate.y) / sourcePlate.h, 0, 1),
    };
  }
  function roomPointFromCoordinates({ u, v }) { return roomPoint([u, v]); }
  function roomContains(x, y) { return x >= plate.x && x <= plate.x + plate.w && y >= plate.y && y <= plate.y + plate.h; }
  function roomMinDimension() { return Math.max(1, Math.min(plate.w, plate.h)); }

  function roomZoom() {
    const gameplay = state === 'playing' || state === 'transition' || state === 'caught';
    return gameplay && width <= MOBILE_ROOM_MAX_WIDTH && height > width ? MOBILE_GAMEPLAY_ZOOM : 1;
  }

  function updateRoomCamera() {
    if (roomZoom() === 1 || !plate.w || !plate.h) {
      roomCamera = { x: 0, y: 0 };
      return;
    }
    const minX = width - (plate.x + plate.w);
    const maxX = -plate.x;
    const minY = height - (plate.y + plate.h);
    const maxY = -plate.y;
    roomCamera = {
      x: clamp(width / 2 - booha.x, minX, maxX),
      y: clamp(height / 2 - booha.y, minY, maxY),
    };
  }

  function setRoomView() {
    const oldPlate = { ...plate };
    const normalized = oldPlate.w && oldPlate.h ? {
      position: roomCoordinates(booha.x, booha.y, oldPlate),
      target: roomCoordinates(booha.targetX, booha.targetY, oldPlate),
    } : null;
    rebuildRoomPlate();
    if (normalized) {
      [booha.x, booha.y] = roomPointFromCoordinates(normalized.position);
      [booha.targetX, booha.targetY] = roomPointFromCoordinates(normalized.target);
    }
    updateRoomCamera();
  }

  function resize() {
    const oldWidth = width;
    const oldHeight = height;
    const hadViewport = oldWidth > 0 && oldHeight > 0;
    const oldPlate = { ...plate };
    const normalized = hadViewport ? {
      position: roomCoordinates(booha.x, booha.y, oldPlate),
      target: roomCoordinates(booha.targetX, booha.targetY, oldPlate),
    } : null;
    const threatPosition = pataskalaThreat && oldPlate.w ? roomCoordinates(pataskalaThreat.x, pataskalaThreat.y, oldPlate) : null;
    const failurePosition = failureThreat && oldPlate.w ? roomCoordinates(failureThreat.x, failureThreat.y, oldPlate) : null;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (LOW_POWER) dpr = Math.min(dpr, 1);
    const visibleViewport = window.visualViewport;
    const viewportWidth = Math.max(1, Math.round(visibleViewport?.width || window.innerWidth));
    const viewportHeight = Math.max(1, Math.round(visibleViewport?.height || window.innerHeight));
    width = viewportWidth;
    height = viewportHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.margin = '0';
    rebuildOverlays();
    if (normalized) {
      [booha.x, booha.y] = roomPointFromCoordinates(normalized.position);
      [booha.targetX, booha.targetY] = roomPointFromCoordinates(normalized.target);
      if (pataskalaThreat && threatPosition) [pataskalaThreat.x, pataskalaThreat.y] = roomPointFromCoordinates(threatPosition);
      if (failureThreat && failurePosition) [failureThreat.x, failureThreat.y] = roomPointFromCoordinates(failurePosition);
      if (state === 'playing' && (oldWidth !== width || oldHeight !== height)) {
        clearMarkingUi();
        setObservation('SCREEN CHANGED / MARK AGAIN', 'がめんが かわった / もういちど しるし');
      }
    } else resetBooha();
    updateRoomCamera();
    if (!document.hidden) drawRoom(performance.now());
  }

  function scheduleResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => { resizeFrame = 0; resize(); });
  }

  function resetBooha() {
    const [x, y] = roomPoint([.5, .74]);
    booha = { x, y, targetX: x, targetY: y };
  }

  function rebuildOverlays() {
    rebuildRoomPlate();

    vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = Math.max(1, Math.floor(width * dpr));
    vignetteCanvas.height = Math.max(1, Math.floor(height * dpr));
    const vctx = vignetteCanvas.getContext('2d');
    vctx.scale(dpr, dpr);
    const shadow = vctx.createRadialGradient(width / 2, height * .5, Math.min(width, height) * .1, width / 2, height * .5, Math.max(width, height) * .72);
    shadow.addColorStop(0, 'rgba(0,0,0,.02)');
    shadow.addColorStop(.38, 'rgba(0,0,0,.18)');
    shadow.addColorStop(.74, 'rgba(0,0,0,.62)');
    shadow.addColorStop(1, 'rgba(0,0,0,.96)');
    vctx.fillStyle = shadow;
    vctx.fillRect(0, 0, width, height);
    const sideShade = vctx.createLinearGradient(0, 0, width, 0);
    sideShade.addColorStop(0, 'rgba(0,0,0,.56)');
    sideShade.addColorStop(.22, 'rgba(0,0,0,0)');
    sideShade.addColorStop(.78, 'rgba(0,0,0,0)');
    sideShade.addColorStop(1, 'rgba(0,0,0,.56)');
    vctx.fillStyle = sideShade;
    vctx.fillRect(0, 0, width, height);

    scanlineCanvas = document.createElement('canvas');
    scanlineCanvas.width = Math.max(1, Math.floor(width * dpr));
    scanlineCanvas.height = Math.max(1, Math.floor(height * dpr));
    const sctx = scanlineCanvas.getContext('2d');
    sctx.scale(dpr, dpr);
    sctx.globalAlpha = .075;
    sctx.fillStyle = '#6eb6ff';
    for (let y = 0; y < height; y += 4) sctx.fillRect(0, y, width, 1);
  }

  function rebuildRoomPlate() {
    const iw = baseImage.naturalWidth || 1024;
    const ih = baseImage.naturalHeight || 1536;
    const scale = Math.min(width / iw, height / ih);
    const zoom = roomZoom();
    const roomWidth = iw * scale * zoom;
    const roomHeight = ih * scale * zoom;
    plate = { w: roomWidth, h: roomHeight, x: (width - roomWidth) / 2, y: (height - roomHeight) / 2 };
  }

  function setBilingual(enNode, jpNode, en, jp) {
    if (!enNode || !jpNode) return;
    enNode.textContent = en;
    jpNode.textContent = jp;
  }

  function setObservation(en, jp, options = {}) {
    if (!observationEn || !observationJp) return;
    if (clueActive && !options.immediate) {
      queuedObservation = { en, jp };
      return;
    }
    queuedObservation = null;
    setBilingual(observationEn, observationJp, en, jp);
  }

  function flushQueuedObservation() {
    if (!queuedObservation || clueActive) return;
    const next = queuedObservation;
    queuedObservation = null;
    setBilingual(observationEn, observationJp, next.en, next.jp);
  }

  function showPanel(panel) {
    if (!panel) return;
    panel._visibilityToken = (panel._visibilityToken || 0) + 1;
    window.clearTimeout(panel._hideTimer);
    panel.hidden = false;
    const reveal = () => {
      if (!panel.hidden) panel.classList.add('visible');
    };
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(reveal);
    else reveal();
  }

  function hidePanel(panel) {
    if (!panel) return;
    const token = (panel._visibilityToken || 0) + 1;
    panel._visibilityToken = token;
    panel.classList.remove('visible');
    const finish = () => {
      if (panel._visibilityToken !== token) return;
      panel.hidden = true;
      panel._hideTimer = 0;
    };
    const onTransitionEnd = event => {
      if (event.propertyName === 'opacity') finish();
    };
    panel.addEventListener('transitionend', onTransitionEnd, { once: true });
    window.clearTimeout(panel._hideTimer);
    panel._hideTimer = window.setTimeout(finish, PANEL_FADE_MS + 40);
  }

  function setReportLabel(hasMarks = markedPoints.length > 0) {
    setBilingual(leaveEn, leaveJp, 'REPORT THE ROOM', 'へやを ほうこくする');
    document.getElementById('leave-button').classList.toggle('armed', hasMarks);
    undoButton.hidden = !hasMarks;
    undoButton.classList.toggle('visible', hasMarks);
  }

  function burnFraction(time = performance.now()) {
    if (state !== 'playing' || !roundStarted) return state === 'caught' ? 0 : 1;
    return clamp(1 - (time - roundStarted) / currentTier().burnMs, 0, 1);
  }

  function updateAndon(time = performance.now()) {
    if (!andon) return;
    const fraction = burnFraction(time);
    andon.style.setProperty('--andon-level', String(fraction));
    andon.classList.toggle('dim', fraction < .55);
    andon.classList.toggle('critical', fraction < .22);
    andon.classList.toggle('urgent', fraction < .25);
    andon.classList.toggle('low', fraction < .1);
    if (andonFill) {
      andonFill.style.width = `${Math.round(fraction * 100)}%`;
      andonFill.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    }
    andon.setAttribute('aria-label', fraction < .22 ? "Booha's light is nearly gone / ブーハの あかりが きえそう" : "Booha's light is burning / ブーハの あかりが もえている");
  }

  function updateTierButtons() {
    const recommendation = recommendedTier();
    tierButtons.forEach(button => {
      const tier = button.dataset.tier;
      button.disabled = false;
      button.classList.toggle('selected', selectedTier === tier);
      button.classList.toggle('recommended', recommendation === tier);
      button.setAttribute('aria-pressed', String(selectedTier === tier));
    });
    if (!tierNote) return;
    const [vocab, sentence, question] = blitzTimes();
    const fastestStamp = Math.max(vocab, sentence, question);
    if (!Number.isFinite(fastestStamp)) {
      tierNote.innerHTML = '<span>All room speeds are open. Blitz can suggest a starting point.</span><span class="jp" lang="ja">すべての はやさを えらべます。ブリッツは めやすです。</span>';
      return;
    }
    const label = recommendation === 'lies' ? 'THE ROOM LIES TO YOU' : recommendation === 'quicker' ? 'THE ROOM IS QUICKER' : 'THE ROOM IS PATIENT';
    tierNote.innerHTML = `<span>Blitz suggests ${label}; any room speed is still available.</span><span class="jp" lang="ja">ブリッツの めやすは ${label}。どの はやさも えらべます。</span>`;
  }

  function weekLog() {
    try {
      const keys = window.BoohaDayRecord?.getCurrentKeys?.();
      const data = window.BoohaAdventure?.save?.load?.() || {};
      return data.meta?.weekLog?.[keys?.week]?.blitz || {};
    } catch (_) { return {}; }
  }

  function blitzTimes() {
    const log = weekLog();
    const curriculums = ['pb', 'br', 'bc'];
    const types = ['vocab', 'sentence', 'question'];
    return types.map(type => Math.min(
      ...curriculums.map(curriculum => Number(log[`${curriculum}:${type}`]?.ms) || Infinity)
    ));
  }

  function recommendedTier() {
    const [vocab, sentence, question] = blitzTimes();
    const fastestStamp = Math.max(vocab, sentence, question);
    if (fastestStamp < 30000) return 'lies';
    if (fastestStamp < 45000) return 'quicker';
    return 'patient';
  }

  function readPreferredTier() {
    try {
      const data = window.BoohaAdventure?.save?.load?.() || {};
      const weeklyTier = data.weekly?.worlds?.familyRoom?.preferredTier;
      const lifetimeTier = data.familyRoom?.preferredTier;
      return TIER_RULES[weeklyTier] ? weeklyTier : TIER_RULES[lifetimeTier] ? lifetimeTier : 'patient';
    } catch (_) {
      return 'patient';
    }
  }

  function readActiveCase() {
    try {
      const data = window.BoohaAdventure?.save?.load?.() || {};
      const completedCases = data.weekly?.worlds?.familyRoom?.completedCases;
      if (completedCases && typeof completedCases === 'object' && !Array.isArray(completedCases)) {
        const nextCase = BUILT_CASE_IDS.find(caseId => !completedCases[caseId]);
        if (nextCase) return nextCase;
      }
      return DEFAULT_CASE_ID;
    } catch (_) {
      return DEFAULT_CASE_ID;
    }
  }

  function saveActiveCase() {
    const save = window.BoohaAdventure?.save;
    if (!save?.load || !save?.save || !CASE_CONTENT[ACTIVE_CASE_ID]) return false;
    try {
      const data = save.load();
      const weekly = data.weekly && typeof data.weekly === 'object' ? data.weekly : (data.weekly = {});
      const worlds = weekly.worlds && typeof weekly.worlds === 'object' ? weekly.worlds : (weekly.worlds = {});
      const familyRoom = worlds.familyRoom && typeof worlds.familyRoom === 'object' ? worlds.familyRoom : (worlds.familyRoom = {});
      familyRoom.activeCaseId = ACTIVE_CASE_ID;
      return save.save(data);
    } catch (error) {
      console.warn('[Family Room] active case unavailable', error);
      return false;
    }
  }

  function updateCasePresentation() {
    const kicker = `CASE FILE ${ACTIVE_CASE_LABEL} / ${ACTIVE_CASE.name}`;
    const kickerJp = `じけんファイル ${ACTIVE_CASE_LABEL} / ${ACTIVE_CASE.jp}`;
    [startCaseKickerEn, studyCaseKickerEn].forEach(node => { if (node) node.textContent = kicker; });
    [startCaseKickerJp, studyCaseKickerJp].forEach(node => { if (node) node.textContent = kickerJp; });
  }

  function loadActiveCaseContent({ persist = false } = {}) {
    const content = CASE_CONTENT[ACTIVE_CASE_ID] || CASE_CONTENT[DEFAULT_CASE_ID];
    ROOM_ANCHORS = content.roomAnchors;
    ANOMALY_ANCHORS = content.anomalyAnchors;
    PATASKALA_SPAWN_ANCHORS = content.pataskalaSpawnAnchors;
    anomalies = content.anomalies;
    anomalyArt = Object.fromEntries(anomalies.map(anomaly => {
      const image = new Image();
      image.src = overlayAssetUrl(anomaly);
      return [anomaly.id, image];
    }));
    baseImage.src = content.base;
    ACTIVE_CASE = FAMILY_HOUSE_CASES.find(entry => entry.id === ACTIVE_CASE_ID) || FAMILY_HOUSE_CASES.find(entry => entry.id === DEFAULT_CASE_ID);
    ACTIVE_CASE_ID = ACTIVE_CASE.id;
    ACTIVE_CASE_LABEL = String(ACTIVE_CASE.number).padStart(2, '0');
    UI_COPY = buildUiCopy();
    updateCasePresentation();
    if (persist) saveActiveCase();
    if (typeof window.requestAnimationFrame === 'function') scheduleResize(); else resize();
  }

  function readFlashlightCharges() {
    try {
      const data = window.BoohaAdventure?.save?.load?.() || {};
      const weeklyCharges = data.weekly?.worlds?.familyRoom?.flashlightCharges;
      const lifetimeCharges = data.familyRoom?.flashlightCharges;
      const charges = Number.isFinite(weeklyCharges) ? weeklyCharges : lifetimeCharges;
      return Number.isFinite(charges) ? clamp(Math.floor(charges), 0, MAX_FLASHLIGHT_CHARGES) : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveFlashlightCharges() {
    const save = window.BoohaAdventure?.save;
    if (!save?.load || !save?.save) return false;
    try {
      const data = save.load();
      const weekly = data.weekly && typeof data.weekly === 'object' ? data.weekly : (data.weekly = {});
      const worlds = weekly.worlds && typeof weekly.worlds === 'object' ? weekly.worlds : (weekly.worlds = {});
      const familyRoom = worlds.familyRoom && typeof worlds.familyRoom === 'object' ? worlds.familyRoom : (worlds.familyRoom = {});
      familyRoom.flashlightCharges = clamp(Math.floor(flashlightCharges), 0, MAX_FLASHLIGHT_CHARGES);
      return save.save(data);
    } catch (error) {
      console.warn('[Family Room] flashlight charge unavailable', error);
      return false;
    }
  }

  function savePreferredTier() {
    const save = window.BoohaAdventure?.save;
    if (!save?.load || !save?.save || !TIER_RULES[selectedTier]) return;
    try {
      const data = save.load();
      const weekly = data.weekly && typeof data.weekly === 'object' ? data.weekly : (data.weekly = {});
      const worlds = weekly.worlds && typeof weekly.worlds === 'object' ? weekly.worlds : (weekly.worlds = {});
      const familyRoom = worlds.familyRoom && typeof worlds.familyRoom === 'object' ? worlds.familyRoom : (worlds.familyRoom = {});
      familyRoom.preferredTier = selectedTier;
      if (data.familyRoom && typeof data.familyRoom === 'object') data.familyRoom.preferredTier = selectedTier;
      save.save(data);
    } catch (error) {
      console.warn('[Family Room] preferred tier unavailable', error);
    }
  }

  function currentTier() { return TIER_RULES[selectedTier] || TIER_RULES.patient; }

  function pataskalaChargeRequirement() {
    return Math.max(1, Number(ACTIVE_CASE?.pataskalaCharges) || 1);
  }

  function currentPhase() {
    let elapsed = 0;
    for (const phase of CASE_PHASES) {
      if (progress < elapsed + phase.rounds) return phase;
      elapsed += phase.rounds;
    }
    return CASE_PHASES[CASE_PHASES.length - 1];
  }

  function pataskalaChance() {
    const phase = currentPhase();
    if (phase.pataskalaBaseChance <= 0 || pataskalaCooldownRounds > 0) return 0;
    const tierScale = selectedTier === 'patient' ? .78 : selectedTier === 'quicker' ? 1 : 1.14;
    return clamp(phase.pataskalaBaseChance * tierScale, 0, .32);
  }

  function pataskalaPose() {
    return PATASKALA_POSES[0];
  }

  function chooseRound() {
    const tier = currentTier();
    const phase = currentPhase();
    const hasChange = Math.random() >= .5;
    currentAudioOnly = !hasChange && Math.random() < Math.max(tier.audioOnlyChance, phase.audioOnlyChance);
    const changeCount = hasChange
      ? Math.min(Math.min(tier.maxChanges, phase.maxChanges), 1 + (Math.random() < Math.max(tier.twoChangeChance, phase.twoChangeChance) ? 1 : 0))
      : 0;
    const pool = anomalies.filter(anomaly => !recentAnomalyIds.includes(anomaly.id));
    const fallbackPool = [...anomalies];
    const usedRegions = [];
    currentAnomalies = [];
    for (let index = 0; index < changeCount; index += 1) {
      const candidates = pool.filter(anomaly => (ANOMALY_ANCHORS[anomaly.id] || []).some(anchorId => {
        const region = ROOM_ANCHORS[anchorId]?.region;
        return region && !recentAnchorRegions.includes(region) && !usedRegions.includes(region);
      }));
      const source = candidates.length ? candidates : (pool.length ? pool : fallbackPool);
      const choice = source[Math.floor(Math.random() * source.length)];
      const anchorIds = ANOMALY_ANCHORS[choice.id] || [];
      const anchorCandidates = anchorIds.filter(anchorId => {
        const region = ROOM_ANCHORS[anchorId]?.region;
        return region && !recentAnchorRegions.includes(region) && !usedRegions.includes(region);
      });
      const anchorId = random(anchorCandidates.length ? anchorCandidates : anchorIds);
      const anchor = ROOM_ANCHORS[anchorId] || { u: choice.target[0], v: choice.target[1], radius: choice.target[2], scale: 1, region: 'unknown' };
      const selected = { ...choice, anchorId, region: anchor.region, target: [anchor.u, anchor.v, anchor.radius], artSize: choice.artSize * anchor.scale };
      currentAnomalies.push(selected);
      usedRegions.push(anchor.region);
      const poolIndex = pool.indexOf(choice);
      if (poolIndex >= 0) pool.splice(poolIndex, 1);
      const fallbackIndex = fallbackPool.indexOf(choice);
      if (fallbackIndex >= 0) fallbackPool.splice(fallbackIndex, 1);
    }
    recentAnomalyIds = [...recentAnomalyIds, ...currentAnomalies.map(anomaly => anomaly.id)].slice(-4);
    recentAnchorRegions = [...recentAnchorRegions, ...currentAnomalies.map(anomaly => anomaly.region || 'unknown')].slice(-4);
    currentAnomaly = currentAnomalies[0] || null;
    currentIsAnomaly = currentAnomalies.length > 0 || currentAudioOnly;
    currentPresence = currentAudioOnly ? null : (Math.random() < pataskalaChance() ? pataskalaPose() : null);
    falseAlertPoint = !currentIsAnomaly && Math.random() < tier.falseAlertChance
      ? { u: .22 + Math.random() * .56, v: .2 + Math.random() * .56, radius: .1 }
      : null;
    tellAvailable = currentAudioOnly
      ? true
      : currentIsAnomaly
      ? Math.random() < tier.realTellChance
      : Boolean(falseAlertPoint);
  }

  function currentPoint([u, v]) { return roomPoint([u, v]); }

  function drawAnomaly(anomaly) {
    if (!anomaly) return;
    const art = anomaly.character === 'pataskala' ? pataskalaArt[anomaly.id] : anomalyArt[anomaly.id];
    if (!imageReady(art)) return;
    const [u, v] = anomaly.target;
    const [x, y] = currentPoint([u, v]);
    const sourceWidth = art.naturalWidth || 512;
    const sourceHeight = art.naturalHeight || 512;
    const maxDimension = Math.max(32, plate.w * anomaly.artSize);
    const scale = maxDimension / Math.max(sourceWidth, sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const inheritedAlpha = ctx.globalAlpha;
    ctx.save();
    ctx.globalAlpha = inheritedAlpha * (anomaly.character === 'pataskala' ? .9 : .95);
    ctx.shadowColor = anomaly.character === 'pataskala' ? 'rgba(219,230,218,.18)' : 'rgba(86,166,255,.42)';
    ctx.shadowBlur = Math.max(5, maxDimension * .12);
    ctx.drawImage(art, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  function drawAnomalies(list) {
    list.forEach(drawAnomaly);
  }

  function drawPataskalaThreat() {
    if (!pataskalaThreat) return;
    const pose = pataskalaThreat.pose;
    const art = pataskalaArt[pose.id];
    if (!imageReady(art)) return;
    const sourceWidth = art.naturalWidth || 512;
    const sourceHeight = art.naturalHeight || 768;
    const maxDimension = Math.max(42, plate.w * pose.artSize * PATASKALA_SIZE_MULTIPLIER);
    const scale = maxDimension / Math.max(sourceWidth, sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const inheritedAlpha = ctx.globalAlpha;
    ctx.save();
    ctx.globalAlpha = inheritedAlpha * (.32 + pataskalaThreat.stage * .58);
    ctx.shadowColor = 'rgba(219,230,218,.28)';
    ctx.shadowBlur = Math.max(8, maxDimension * .14);
    ctx.translate(pataskalaThreat.x, pataskalaThreat.y);
    ctx.scale(pataskalaThreat.flip ? -1 : 1, 1);
    ctx.drawImage(art, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  function imageReady(image) {
    return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  }

  function drawRoom(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020202'; ctx.fillRect(0, 0, width, height);
    if (state === 'caught' && failureStarted) {
      if (time - failureStarted >= FAILURE_SILENCE_MS) {
        drawFailureStatic(time);
        drawFailureBooha(time);
      }
      return;
    }
    if (state === 'study') {
      if (imageReady(baseImage)) {
        ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
        if (scanlineCanvas) { ctx.globalAlpha = .045; ctx.drawImage(scanlineCanvas, 0, 0, width, height); ctx.globalAlpha = 1; }
      }
      return;
    }
    moveBooha();
    updateRoomCamera();
    updateWrongMarkHazard(time);
    updatePataskalaThreat(time);
    if (imageReady(baseImage)) {
      // Keep the room plate readable, then let Booha's lantern reveal only a
      // small moving circle at full brightness.
      ctx.save();
      ctx.translate(roomCamera.x, roomCamera.y);
      ctx.globalAlpha = state === 'caught' ? .07 : .16;
      ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
      drawAnomalies(currentAnomalies); drawPataskalaThreat();
      ctx.restore();
      const radius = lightRadius();
      ctx.save();
      ctx.translate(roomCamera.x, roomCamera.y);
      ctx.beginPath(); ctx.arc(booha.x, booha.y, radius, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = state === 'caught' ? .24 : 1;
      ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
      drawAnomalies(currentAnomalies); drawPataskalaThreat();
      const light = ctx.createRadialGradient(booha.x, booha.y, radius * .48, booha.x, booha.y, radius);
      light.addColorStop(0, 'rgba(0,0,0,0)');
      light.addColorStop(1, 'rgba(0,0,0,.84)');
      ctx.fillStyle = light; ctx.fillRect(booha.x - radius, booha.y - radius, radius * 2, radius * 2);
      ctx.restore();
      if (vignetteCanvas) ctx.drawImage(vignetteCanvas, 0, 0, width, height);
      const darkness = (1 - burnFraction(time)) * .12;
      if (darkness) { ctx.fillStyle = `rgba(0,0,0,${darkness})`; ctx.fillRect(0, 0, width, height); }
    }
    if (scanlineCanvas) ctx.drawImage(scanlineCanvas, 0, 0, width, height);
    if (!REDUCED_MOTION && state !== 'title') {
      ctx.save(); ctx.globalAlpha = .035 + Math.sin(time / 260) * .012; ctx.fillStyle = '#fff'; ctx.fillRect(0, (time / 8) % height, width, 1); ctx.restore();
    }
    ctx.save();
    ctx.translate(roomCamera.x, roomCamera.y);
    drawWrongMarkHazard(time);
    drawFlashlightBurst(time);
    drawMarks();
    drawRoomDebug();
    if (state !== 'caught') drawBooha(time);
    ctx.restore();
  }

  function drawFailureBooha(time) {
    if (!imageReady(idleBooha)) return;
    const size = clamp(Math.min(width, height) * .075, 38, 62);
    const x = width / 2;
    const y = height * .7;
    ctx.save();
    ctx.globalAlpha = .72;
    ctx.shadowColor = 'rgba(105,182,255,.9)';
    ctx.shadowBlur = 18 + Math.sin(time / 260) * 3;
    ctx.drawImage(idleBooha, x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  function drawFailureStatic(time) {
    const reduced = REDUCED_MOTION;
    const block = reduced ? 5 : 3;
    const columns = Math.ceil(width / block);
    const rows = Math.ceil(height / block);
    ctx.save();
    ctx.fillStyle = '#080b11';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = .62;
    for (let row = 0; row < rows; row += 1) {
      const band = .18 + ((row * 17) % 11) / 34;
      ctx.fillStyle = row % 3 === 0 ? `rgba(186,208,226,${band})` : `rgba(88,112,134,${band * .7})`;
      ctx.fillRect(0, row * block, width, block);
    }
    const flicker = Math.floor(time / (reduced ? 170 : 85));
    ctx.globalAlpha = .82;
    for (let index = 0; index < columns * rows; index += 1) {
      const seed = Math.sin((index + 1) * 12.9898 + flicker * 78.233) * 43758.5453;
      const noise = seed - Math.floor(seed);
      if (noise < .46) continue;
      const x = (index % columns) * block;
      const y = Math.floor(index / columns) * block;
      const size = noise > .9 ? block * 2 : block;
      ctx.fillStyle = noise > .76 ? '#e6edf2' : noise > .58 ? '#96a9b7' : '#435564';
      ctx.fillRect(x, y, size, block);
    }
    ctx.globalAlpha = .22;
    ctx.fillStyle = '#d9e9f5';
    for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .18, width / 2, height / 2, Math.max(width, height) * .74);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.78)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function lightRadius() {
    const fraction = burnFraction();
    const minimum = REDUCED_MOTION ? .065 : .05;
    const lowLightFraction = fraction < .1 ? fraction * .45 : fraction;
    return roomMinDimension() * (minimum + (.26 - minimum) * lowLightFraction);
  }

  function moveBooha() {
    const ease = REDUCED_MOTION ? .28 : .12;
    booha.x += (booha.targetX - booha.x) * ease;
    booha.y += (booha.targetY - booha.y) * ease;
  }

  function drawBooha(time) {
    const image = (isBoohaAlerting() || pendingMark || markHoldOrigin) ? alertBooha : idleBooha;
    if (!imageReady(image)) return;
    const size = clamp(Math.min(width, height) * .1, 52, 92);
    const bob = REDUCED_MOTION ? 0 : Math.sin(time / 410) * 3;
    ctx.save();
    ctx.globalAlpha = .76;
    const fraction = burnFraction(time);
    ctx.shadowColor = `rgba(105,182,255,${.2 + fraction * .16})`;
    ctx.shadowBlur = 12 + fraction * 5;
    ctx.drawImage(image, booha.x - size / 2, booha.y - size / 2 + bob, size, size);
    if (pendingMark) {
      ctx.globalAlpha = .9;
      ctx.strokeStyle = '#6eb6ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(booha.x, booha.y, size * .68, 0, Math.PI * 2); ctx.stroke();
    }
    if (markHoldOrigin && !markLocked && !pendingMark) {
      const heldMs = Math.max(0, time - markHoldStartedAt);
      const fraction = clamp(heldMs / MARK_HOLD_MS, 0, 1);
      ctx.globalAlpha = .95;
      ctx.strokeStyle = '#6eb6ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(booha.x, booha.y, size * .68, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMarks() {
    ctx.save();
    markedPoints.forEach(mark => {
      ctx.globalAlpha = .86;
      ctx.strokeStyle = '#6eb6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, Math.max(12, mark.radius * .42), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = .95;
      ctx.fillStyle = '#6eb6ff';
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    if (undoGhost) {
      const elapsed = performance.now() - undoGhost.startedAt;
      const fade = clamp(1 - elapsed / 900, 0, 1);
      if (!fade) {
        undoGhost = null;
      } else {
        ctx.globalAlpha = fade * .72;
        ctx.strokeStyle = '#6eb6ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(undoGhost.x, undoGhost.y, Math.max(12, undoGhost.radius * (.42 + (1 - fade) * .16)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  function drawWrongMarkHazard(time) {
    if (!wrongMarkHazard) return;
    const telegraphing = time < wrongMarkHazard.telegraphUntil;
    const telegraphProgress = telegraphing
      ? clamp((time - wrongMarkHazard.startedAt) / WRONG_MARK_TELEGRAPH_MS, 0, 1)
      : 1;
    const pulse = REDUCED_MOTION ? 1 : 1 + Math.sin(time / 120) * .08;
    const expansion = telegraphing ? .58 + telegraphProgress * .12 : .7 + Math.min(1, (time - wrongMarkHazard.telegraphUntil) / 900) * .3;
    const radius = wrongMarkHazard.radius * expansion * pulse;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const smoke = ctx.createRadialGradient(wrongMarkHazard.x, wrongMarkHazard.y, 1, wrongMarkHazard.x, wrongMarkHazard.y, radius * 2.4);
    smoke.addColorStop(0, telegraphing ? 'rgba(98,175,255,.72)' : 'rgba(255,82,62,.92)');
    smoke.addColorStop(.32, telegraphing ? 'rgba(51,112,190,.42)' : 'rgba(190,35,35,.62)');
    smoke.addColorStop(1, 'rgba(80,0,0,0)');
    ctx.fillStyle = smoke;
    ctx.beginPath(); ctx.arc(wrongMarkHazard.x, wrongMarkHazard.y, radius * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = .92;
    ctx.strokeStyle = telegraphing ? '#7dbaff' : '#ff5545';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(wrongMarkHazard.x, wrongMarkHazard.y, radius, 0, Math.PI * 2); ctx.stroke();
    if (telegraphing) {
      ctx.globalAlpha = .72;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(wrongMarkHazard.x, wrongMarkHazard.y, radius * (1.2 + Math.sin(time / 180) * .12), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFlashlightBurst(time) {
    if (!flashlightBurst) return;
    const progress = clamp((time - flashlightBurst.startedAt) / FLASHLIGHT_BURST_MS, 0, 1);
    if (progress >= 1) {
      flashlightBurst = null;
      return;
    }
    const eased = 1 - Math.pow(1 - progress, 2);
    const radius = lightRadius() * (1.05 + eased * 2.9);
    const alpha = (1 - progress) * .92;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const burst = ctx.createRadialGradient(flashlightBurst.x, flashlightBurst.y, 1, flashlightBurst.x, flashlightBurst.y, radius);
    burst.addColorStop(0, `rgba(255,255,255,${alpha})`);
    burst.addColorStop(.18, `rgba(185,221,255,${alpha * .94})`);
    burst.addColorStop(.62, `rgba(74,154,255,${alpha * .42})`);
    burst.addColorStop(1, 'rgba(50,120,255,0)');
    ctx.fillStyle = burst;
    ctx.beginPath(); ctx.arc(flashlightBurst.x, flashlightBurst.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha * .82;
    ctx.strokeStyle = '#b9ddff';
    ctx.lineWidth = Math.max(2, radius * .035);
    ctx.beginPath(); ctx.arc(flashlightBurst.x, flashlightBurst.y, radius * (.52 + progress * .42), 0, Math.PI * 2); ctx.stroke();
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 + progress * .18;
      const inner = radius * .58;
      const outer = radius * (1.05 + Math.sin(index * 1.7) * .08);
      ctx.beginPath();
      ctx.moveTo(flashlightBurst.x + Math.cos(angle) * inner, flashlightBurst.y + Math.sin(angle) * inner);
      ctx.lineTo(flashlightBurst.x + Math.cos(angle) * outer, flashlightBurst.y + Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoomDebug() {
    if (!DEBUG_ROOM_COORDINATES) return;
    ctx.save();
    ctx.globalAlpha = .9;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7dff75';
    ctx.strokeRect(plate.x, plate.y, plate.w, plate.h);
    ctx.fillStyle = 'rgba(125,255,117,.2)';
    ctx.fillRect(plate.x, plate.y + plate.h * EXIT_BAND_V, plate.w, plate.h * (1 - EXIT_BAND_V));
    Object.entries(ROOM_ANCHORS).forEach(([id, anchor]) => {
      const [x, y] = roomPoint([anchor.u, anchor.v]);
      ctx.fillStyle = '#6eb6ff';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(id, x + 8, y - 8);
    });
    PATASKALA_SPAWN_ANCHORS.forEach(anchor => {
      const [x, y] = roomPoint([anchor.u, anchor.v]);
      ctx.strokeStyle = '#c78cff';
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.fillText(`P:${anchor.id}`, x + 12, y + 4);
    });
    ctx.restore();
  }

  function clearWrongMarkHazard() { wrongMarkHazard = null; }

  function boohaAtExit() { return booha.y >= plate.y + plate.h * EXIT_BAND_V; }

  function updateWrongMarkHazard(time) {
    if (!wrongMarkHazard) return;
    if (boohaAtExit()) {
      clearWrongMarkHazard();
      releasePointerInteraction();
      keyboardMarkActive = false;
      setControlsVisible(true);
      setReportLabel(markedPoints.length > 0);
      setObservation('EXIT REACHED / REPORT OR KEEP LOOKING', 'でぐちに ついた / ほうこくするか まだ さがす', { immediate: true });
      return;
    }
    if (time < wrongMarkHazard.graceUntil || time < wrongMarkHazard.telegraphUntil) return;
    const elapsed = Math.min(.05, Math.max(0, (time - wrongMarkHazard.lastTime) / 1000));
    wrongMarkHazard.lastTime = time;
    const dx = booha.x - wrongMarkHazard.x;
    const dy = booha.y - wrongMarkHazard.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= wrongMarkHazard.radius + roomMinDimension() * .045) {
      clearWrongMarkHazard();
      beginFailure(UI_COPY.caseReset);
      return;
    }
    if (distance > 0) {
      const step = Math.min(distance, currentTier().hazardSpeed * elapsed);
      wrongMarkHazard.x += (dx / distance) * step;
      wrongMarkHazard.y += (dy / distance) * step;
    }
  }

  function cancelMarkingForThreat() {
    pendingMark = null;
    markLocked = false;
    keyboardMarkActive = false;
    releasePointerInteraction();
    hidePanel(markConfirmPanel);
  }

  function clearPataskalaThreat() {
    pataskalaThreat = null;
    updateFlashlightUi();
  }

  function updateFlashlightUi() {
    if (!flashlightButton) return;
    const visible = !controls.classList.contains('hidden');
    const active = visible && Boolean(pataskalaThreat);
    flashlightButton.hidden = !active;
    flashlightButton.disabled = !active || flashlightCharges < 1;
    if (!flashlightChargeCopy) return;
    if (flashlightCharges > 0) {
      const hitsNeeded = pataskalaThreat?.chargesRemaining || pataskalaChargeRequirement();
      flashlightChargeCopy.innerHTML = `<span>${flashlightCharges} charge${flashlightCharges === 1 ? '' : 's'} · ${hitsNeeded} hit${hitsNeeded === 1 ? '' : 's'} to repel</span><span class="jp" lang="ja">${flashlightCharges}つ · あと ${hitsNeeded}かいで パタスカラを おしもどす</span>`;
    } else {
      flashlightChargeCopy.innerHTML = '<span>no charges · find Nuppi in Karasuki</span><span class="jp" lang="ja">チャージなし · からすきで ヌーピーを さがす</span>';
    }
  }

  function useFlashlightCharge() {
    if (state !== 'playing' || !pataskalaThreat || flashlightCharges < 1) return;
    flashlightCharges -= 1;
    saveFlashlightCharges();
    window.clearTimeout(pataskalaMoveTimer);
    pataskalaMoveTimer = 0;
    flashlightBurst = { x: booha.x, y: booha.y, startedAt: performance.now() };
    pataskalaThreat.chargesRemaining = Math.max(0, pataskalaThreat.chargesRemaining - 1);
    const pushedThreat = pataskalaThreat;
    if (pushedThreat.chargesRemaining <= 0) {
      clearPataskalaThreat();
      currentPresence = null;
      tellAvailable = false;
      pataskalaCooldownRounds = Math.max(pataskalaCooldownRounds, PATA_COOLDOWN_ROUNDS + 1);
      showPriorityClue('FLASHLIGHT CHARGE / PATASKALA RECOILS', 'フラッシュライト / パタスカラが さがる');
      setObservation('PATASKALA PUSHED BACK / KEEP SEARCHING', 'パタスカラを おしもどした / まだ さがす', { immediate: true });
    } else {
      const dx = pushedThreat.x - booha.x;
      const dy = pushedThreat.y - booha.y;
      const distance = Math.hypot(dx, dy) || 1;
      pushedThreat.x = clamp(pushedThreat.x + (dx / distance) * roomMinDimension() * PATASKALA_RECOIL_DISTANCE, plate.x, plate.x + plate.w);
      pushedThreat.y = clamp(pushedThreat.y + (dy / distance) * roomMinDimension() * PATASKALA_RECOIL_DISTANCE, plate.y, plate.y + plate.h);
      pushedThreat.startDistance = Math.max(pushedThreat.startDistance, Math.hypot(booha.x - pushedThreat.x, booha.y - pushedThreat.y));
      pushedThreat.lastTime = performance.now();
      pushedThreat.discoveryUntil = performance.now() + 500;
      showPriorityClue(`FLASHLIGHT HIT / ${pushedThreat.chargesRemaining} MORE`, `フラッシュライト / あと ${pushedThreat.chargesRemaining}かい`);
      setObservation('PATASKALA RECOILS / HIT IT AGAIN', 'パタスカラが さがる / もういちど あてる', { immediate: true });
    }
    setControlsVisible(true);
    playSfx('move', AUDIO_LEVELS.move);
    ping(660, .05);
  }

  function beginPataskalaThreat() {
    if (state !== 'playing' || pendingMark || !currentPresence || pataskalaThreat || wrongMarkHazard) return;
    const distances = PATASKALA_SPAWN_ANCHORS.map(anchor => ({ anchor, distance: Math.hypot(booha.x - roomPoint([anchor.u, anchor.v])[0], booha.y - roomPoint([anchor.u, anchor.v])[1]) }));
    distances.sort((a, b) => b.distance - a.distance);
    const spawn = distances[Math.floor(Math.random() * Math.min(2, distances.length))].anchor;
    const [startX, startY] = roomPoint([spawn.u, spawn.v]);
    const fromRight = startX > booha.x;
    pataskalaThreat = {
      pose: currentPresence,
      x: startX,
      y: startY,
      flip: fromRight,
      spawnAnchorId: spawn.id,
      discoveryUntil: performance.now() + PATA_DISCOVERY_MS,
      alerted: false,
      startedAt: performance.now(),
      lastTime: performance.now(),
      startDistance: Math.max(1, Math.hypot(booha.x - startX, booha.y - startY)),
      stage: 0,
      chargesRemaining: pataskalaChargeRequirement(),
    };
    cancelMarkingForThreat();
    setControlsVisible(true);
    pataskalaThreat.discoveryUntil = performance.now() + PATA_DISCOVERY_MS;
  }

  function updatePataskalaThreat(time) {
    if (!pataskalaThreat || state !== 'playing' || pendingMark) return;
    const elapsed = Math.min(.05, Math.max(0, (time - pataskalaThreat.lastTime) / 1000));
    pataskalaThreat.lastTime = time;
    const dx = booha.x - pataskalaThreat.x;
    const dy = booha.y - pataskalaThreat.y;
    const distance = Math.hypot(dx, dy);
    pataskalaThreat.stage = clamp(1 - distance / pataskalaThreat.startDistance, 0, 1);
    if (boohaAtExit()) {
      clearPataskalaThreat();
      currentPresence = null;
      pataskalaCooldownRounds = PATA_COOLDOWN_ROUNDS;
      setControlsVisible(true);
      updateHud();
      return;
    }
    if (distance <= roomMinDimension() * PATA_CATCH_DISTANCE) {
      pataskalaThreat.pose = PATASKALA_POSES[PATASKALA_POSES.length - 1];
      failureThreat = { ...pataskalaThreat };
      beginFailure(UI_COPY.caseReset);
      return;
    }
    if (time < pataskalaThreat.discoveryUntil) return;
    if (!pataskalaThreat.alerted) {
      pataskalaThreat.alerted = true;
      showPriorityClue('SOMETHING IS APPROACHING / RUN TO THE EXIT', 'なにかが ちかづいている / でぐちへ にげる');
      setObservation('KEEP MOVING / FIND THE EXIT', 'うごきつづける / でぐちを さがす', { immediate: true });
      tellPresence();
      playSfx('move', AUDIO_LEVELS.move);
    }
    pataskalaThreat.pose = pataskalaThreat.stage >= .88
      ? PATASKALA_POSES[3]
      : pataskalaThreat.stage >= .58
      ? PATASKALA_POSES[2]
      : pataskalaThreat.stage >= .28
      ? PATASKALA_POSES[1]
      : PATASKALA_POSES[0];
    if (distance > 0) {
      const speed = roomMinDimension() * (PATA_SPEED_FAR + (PATA_SPEED_NEAR - PATA_SPEED_FAR) * pataskalaThreat.stage);
      const step = Math.min(distance, speed * elapsed);
      pataskalaThreat.x += (dx / distance) * step;
      pataskalaThreat.y += (dy / distance) * step;
    }
  }

  function alertTarget() {
    if (currentAnomaly) return currentAnomaly.target;
    if (falseAlertPoint) return [falseAlertPoint.u, falseAlertPoint.v, falseAlertPoint.radius];
    return null;
  }

  function isBoohaAlerting() {
    const targets = currentAnomalies.map(anomaly => anomaly.target);
    if (falseAlertPoint) targets.push([falseAlertPoint.u, falseAlertPoint.v, falseAlertPoint.radius]);
    return targets.some(target => {
      const [tx, ty] = currentPoint(target);
      const radius = Math.max(30, plate.w * target[2] * .72) * currentTier().alertMultiplier;
      return Math.hypot(booha.x - tx, booha.y - ty) <= radius;
    });
  }

  function frame(time) {
    animationFrame = 0;
    if (document.hidden) return;
    handleBurnout(time); updateAndon(time); drawRoom(time);
    animationFrame = requestAnimationFrame(frame);
  }
  function startLoop() { if (!document.hidden && !animationFrame) animationFrame = requestAnimationFrame(frame); }
  function stopLoop() { if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; } }

  function shiftGameplayClocks(delta) {
    if (!delta) return;
    if (roundStarted) roundStarted += delta;
    if (entryStarted) entryStarted += delta;
    if (caseStarted) caseStarted += delta;
    if (transitionStarted) transitionStarted += delta;
    if (failureStarted) failureStarted += delta;
    if (pataskalaThreat) {
      pataskalaThreat.startedAt += delta;
      pataskalaThreat.lastTime += delta;
      pataskalaThreat.discoveryUntil += delta;
    }
  }

  function pauseMarkConfirmClock() {
    if (markConfirmPausedAt || state !== 'playing') return;
    const now = performance.now();
    markConfirmPausedAt = now;
    markConfirmMoveWasScheduled = Boolean(pataskalaMoveTimer);
    if (markConfirmMoveWasScheduled) {
      markConfirmMoveRemainingMs = Math.max(0, pataskalaMoveDueAt - now);
      window.clearTimeout(pataskalaMoveTimer);
      pataskalaMoveTimer = 0;
      pataskalaMoveDueAt = 0;
    }
  }

  function resumeMarkConfirmClock() {
    if (!markConfirmPausedAt) return;
    const resumedAt = performance.now();
    shiftGameplayClocks(Math.max(0, resumedAt - markConfirmPausedAt));
    markConfirmPausedAt = 0;
    const shouldResumePataskalaTimer = markConfirmMoveWasScheduled;
    const remainingMs = markConfirmMoveRemainingMs;
    markConfirmMoveWasScheduled = false;
    markConfirmMoveRemainingMs = 0;
    if (shouldResumePataskalaTimer && state === 'playing' && currentPresence && !pataskalaThreat && !wrongMarkHazard && !pendingMark) {
      schedulePataskalaThreat(remainingMs);
    }
  }

  function pauseForVisibility() {
    if (pauseStartedAt) return;
    pauseStartedAt = performance.now();
    releaseBooha();
    stopLoop();
    if (audioContext?.state === 'running' && typeof audioContext.suspend === 'function') audioContext.suspend().catch(() => {});
  }

  function resumeFromVisibility() {
    if (!pauseStartedAt) return;
    const resumedAt = performance.now();
    shiftGameplayClocks(Math.max(0, resumedAt - pauseStartedAt));
    pauseStartedAt = 0;
    if (!document.hidden) {
      if (audioContext?.state === 'suspended' && audioEnabled) audioContext.resume().catch(() => {});
      updateAndon(resumedAt);
      startLoop();
    }
  }

  function showMessage(message, handler) {
    setBilingual(messageKickerEn, messageKickerJp, message.kicker, message.kickerJp);
    setBilingual(messageTitleEn, messageTitleJp, message.title, message.titleJp);
    setBilingual(messageCopyEn, messageCopyJp, message.copy, message.copyJp);
    setBilingual(messageButtonEn, messageButtonJp, message.button, message.buttonJp);
    messageButton.onclick = handler;
    showPanel(messagePanel);
  }

  function buildNextCaseCopy() {
    const nextCase = FAMILY_HOUSE_CASES.find(entry => entry.id === nextCaseId);
    if (!nextCase) return UI_COPY.complete;
    return {
      kicker: `CASE FILE ${ACTIVE_CASE_LABEL} / SEALED`,
      kickerJp: `じけんファイル ${ACTIVE_CASE_LABEL} / ふういん`,
      title: 'THE HOUSE OPENS DEEPER.',
      titleJp: 'いえの おくが ひらいた。',
      copy: `Your notes are filed. ${nextCase.name} is waiting beyond this room.`,
      copyJp: `きろくを のこした。つぎは ${nextCase.jp} です。`,
      button: `ENTER ${nextCase.name}`,
      buttonJp: `${nextCase.jp}へ はいる`,
    };
  }

  function enterNextCase() {
    if (!nextCaseId || !CASE_CONTENT[nextCaseId]) { exitGame(); return; }
    ACTIVE_CASE_ID = nextCaseId;
    nextCaseId = null;
    loadActiveCaseContent({ persist: true });
    state = 'title';
    clearRoundTimers();
    clearMarkingUi();
    setControlsVisible(false);
    hidePanel(messagePanel);
    showPanel(startPanel);
    setObservation('NEXT ROOM / STUDY THE HOUSE', 'つぎの へや / いえを おぼえる');
    updateAndon();
    document.getElementById('start-button')?.focus?.();
    startLoop();
  }

  function hidePanels() {
    hidePanel(startPanel);
    hidePanel(studyPanel);
    hidePanel(messagePanel);
  }
  function clearRoundTimers() {
    window.clearTimeout(droneTellTimer); droneTellTimer = 0;
    window.clearTimeout(pataskalaMoveTimer); pataskalaMoveTimer = 0; pataskalaMoveDueAt = 0;
    window.clearTimeout(transitionTimer); transitionTimer = 0;
    window.clearTimeout(failureJumpTimer); failureJumpTimer = 0;
    window.clearTimeout(failurePanelTimer); failurePanelTimer = 0;
    window.clearTimeout(studyCurtainTimer); studyCurtainTimer = 0;
    window.clearTimeout(completionTimer); completionTimer = 0;
    clearPataskalaThreat();
    transitionStarted = 0;
    markConfirmPausedAt = 0;
    markConfirmMoveWasScheduled = false;
    markConfirmMoveRemainingMs = 0;
  }
  function clearMarkingUi() {
    closeClueCard();
    clearWrongMarkHazard();
    undoGhost = null;
    markLocked = false; pendingMark = null; markedPoints = []; keyboardMarkActive = false;
    releasePointerInteraction();
    hidePanel(markConfirmPanel);
    setReportLabel(false);
  }
  function closeClueCard() {
    clueVersion += 1;
    window.clearTimeout(clueTimer); clueTimer = 0;
    window.clearTimeout(clueFadeTimer); clueFadeTimer = 0;
    clueQueue = [];
    clueActive = false;
    queuedObservation = null;
    clueCard.hidden = true;
    clueCard.classList.remove('is-fading');
  }
  function setControlsVisible(visible) {
    controls.classList.toggle('hidden', !visible);
    leaveButton.disabled = !visible || Boolean(pataskalaThreat);
    undoButton.disabled = !visible || Boolean(pataskalaThreat);
    updateFlashlightUi();
  }

  function updateHud() { if (state === 'playing') setObservation(pendingMark ? 'CONFIRM THE MARK' : markedPoints.length ? 'MARK ADDED / FIND ANOTHER OR REPORT' : 'DRAG BOOHA / HOLD TO CHECK', pendingMark ? 'しるしを かくにん' : markedPoints.length ? 'しるしを つけた / つぎを さがすか ほうこく' : 'ブーハを ひっぱる / じっと させる'); else setObservation('LOOK / LISTEN / REMEMBER', 'みて / きいて / おぼえる'); setReportLabel(markedPoints.length > 0); }

  function startRound() {
    clearRoundTimers();
    pataskalaCooldownRounds = Math.max(0, pataskalaCooldownRounds - 1);
    roundToken += 1;
    state = 'playing'; setRoomView(); failureThreat = null; burnoutHandled = false; failureStarted = 0; roundStarted = performance.now(); entryStarted = roundStarted; curtain.className = ''; setControlsVisible(true); clearMarkingUi(); resetBooha(); updateRoomCamera(); chooseRound(); updateHud(); updateAndon(); ensureAudio(); startBgm(); if (ambientGain && audioContext) ambientGain.gain.setTargetAtTime(audioEnabled ? .014 : 0, audioContext.currentTime, .12); if (bgmGain && audioContext) bgmGain.gain.setTargetAtTime(AUDIO_LEVELS.bgm, audioContext.currentTime, .18); scheduleTell(); ping(176 + round * 13, .028); startLoop();
  }

  function enterRoom() {
    selectedTier = tierButtons.find(button => button.classList.contains('selected'))?.dataset.tier || 'patient';
    clearRoundTimers();
    round = 0; progress = 0; marks = 0; correctCalls = 0; completionSubmitted = false; nextCaseId = null; caseStarted = 0; currentAnomaly = null; currentAnomalies = []; currentPresence = null; pataskalaThreat = null; failureThreat = null; pataskalaCooldownRounds = 0; recentAnomalyIds = []; recentAnchorRegions = []; currentAudioOnly = false; currentIsAnomaly = false;
    state = 'study';
    curtain.className = '';
    setControlsVisible(false);
    clearMarkingUi();
    resetBooha();
    hidePanel(startPanel);
    showPanel(studyPanel);
    setObservation('STUDY THE ROOM', 'へやを おぼえる');
    updateAndon();
    requestFamilyRuntimeCache();
    ensureAudio();
    studyStartButton.focus?.();
    startLoop();
  }

  function flyAwayToSafeRoom() {
    if (state !== 'playing' && state !== 'transition') return;
    clearRoundTimers();
    clearMarkingUi();
    silenceDrone();
    state = 'playing';
    currentPresence = null;
    pataskalaThreat = null; failureThreat = null; pataskalaCooldownRounds = PATA_COOLDOWN_ROUNDS;
    tellAvailable = false;
    transitionStarted = 0; failureStarted = 0; burnoutHandled = false; roundStarted = performance.now(); curtain.className = '';
    resetBooha();
    hidePanel(startPanel);
    hidePanel(studyPanel);
    hidePanel(messagePanel);
    setControlsVisible(true);
    updateHud();
    updateAndon();
    ensureAudio();
    startBgm();
    startLoop();
  }

  function continueFromClue() {
    if (state !== 'transition') {
      closeClueCard();
      if (state === 'playing') updateHud();
      return;
    }
    window.clearTimeout(transitionTimer);
    transitionTimer = 0;
    closeClueCard();
    advanceCase();
  }

  function beginCaseFromStudy() {
    if (state !== 'study') return;
    hidePanel(studyPanel);
    caseStarted = performance.now();
    startRound();
    showLightTipOnce();
    curtain.className = 'active';
    const token = roundToken;
    studyCurtainTimer = window.setTimeout(() => {
      if (token === roundToken && state === 'playing') { curtain.className = ''; studyCurtainTimer = 0; }
    }, REDUCED_MOTION ? 80 : 520);
  }

  function requestFamilyRuntimeCache() {
    const controller = window.navigator?.serviceWorker?.controller;
    if (!controller) return;
    const caseContent = CASE_CONTENT[ACTIVE_CASE_ID] || CASE_CONTENT[DEFAULT_CASE_ID];
    const caseAssets = [caseContent.base, ...caseContent.anomalies.map(overlayAssetUrl)];
    const urls = [...FAMILY_DEFERRED_ASSETS, ...caseAssets].map(url => new URL(url, window.location.href).pathname);
    controller.postMessage({ type: 'CACHE_URLS', payload: urls });
  }

  function advanceCase() {
    if (state !== 'transition') return;
    transitionTimer = 0;
    progress = Math.min(CASE_ROUNDS, progress + 1); round += 1;
    if (progress >= CASE_ROUNDS) showComplete(); else startRound();
  }

  function scheduleTell() {
    window.clearTimeout(droneTellTimer);
    schedulePataskalaThreat();
    const shouldTell = tellAvailable;
    if (!shouldTell) return;
    droneTellTimer = window.setTimeout(() => { if (state === 'playing') { tellPresence(); playSfx('move', AUDIO_LEVELS.move); } }, 900 + Math.random() * 500);
  }

  function tellPresence() {
    if (!ambientGain || !audioContext) return;
    ambientGain.gain.cancelScheduledValues(audioContext.currentTime);
    ambientGain.gain.setTargetAtTime(.001, audioContext.currentTime, .045);
    ambientGain.gain.setTargetAtTime(audioEnabled ? .014 : 0, audioContext.currentTime + .38, .12);
    ambientOscillator.frequency.setTargetAtTime(48, audioContext.currentTime, .06);
    ambientOscillator.frequency.setTargetAtTime(42, audioContext.currentTime + .5, .1);
  }

  function schedulePataskalaThreat(delayMs = null) {
    window.clearTimeout(pataskalaMoveTimer); pataskalaMoveTimer = 0; pataskalaMoveDueAt = 0;
    if (!currentPresence || pendingMark) return;
    const token = roundToken;
    const delay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 2400 + Math.random() * 1800;
    pataskalaMoveDueAt = performance.now() + delay;
    pataskalaMoveTimer = window.setTimeout(() => {
      pataskalaMoveTimer = 0; pataskalaMoveDueAt = 0;
      if (token !== roundToken || state !== 'playing' || pendingMark || !currentPresence) return;
      beginPataskalaThreat();
    }, delay);
  }

  function markMatchesAnomaly(mark, anomaly) {
    const [tx, ty] = currentPoint(anomaly.target);
    return Math.hypot(mark.x - tx, mark.y - ty) <= mark.radius;
  }

  function reportTargets() {
    return [...currentAnomalies];
  }

  function reportIsCorrect() {
    if (currentAudioOnly) return markedPoints.length === 0;
    const requiredTargets = currentAnomalies;
    const validTargets = reportTargets();
    if (markedPoints.length < requiredTargets.length || markedPoints.length > validTargets.length) return false;
    return markedPoints.every(mark => validTargets.some(anomaly => markMatchesAnomaly(mark, anomaly)))
      && requiredTargets.every(anomaly => markedPoints.some(mark => markMatchesAnomaly(mark, anomaly)));
  }

  function handleLeave() {
    if (state !== 'playing' || pendingMark || wrongMarkHazard || pataskalaThreat) return;
    state = 'transition'; transitionStarted = performance.now(); setControlsVisible(false); silenceDrone();
    const correct = reportIsCorrect();
    const token = roundToken;
    if (!correct) { wrongTone(); if (currentAnomalies.length || currentAudioOnly) playSfx('anomaly', AUDIO_LEVELS.anomaly); curtain.className = 'active catch'; transitionTimer = window.setTimeout(() => { if (token === roundToken) handleWrong(); }, REDUCED_MOTION ? 80 : 260); return; }
    correctCalls += 1; rightTone();
    if (currentAnomalies.length || currentAudioOnly) { marks += currentAnomalies.length + (currentAudioOnly ? 1 : 0); showClue(); }
    const reportClueDelay = currentAnomalies.length || currentAudioOnly ? CLUE_DISPLAY_MS + PANEL_FADE_MS : 0;
    const transitionDelay = reportClueDelay || (currentAnomalies.length ? (REDUCED_MOTION ? 500 : 1450 + (currentAnomalies.length - 1) * 350) : (currentAudioOnly ? (REDUCED_MOTION ? 300 : 900) : (REDUCED_MOTION ? 80 : 420)));
    transitionTimer = window.setTimeout(() => { if (token === roundToken) advanceCase(); }, transitionDelay);
  }

  function handleBurnout(time) {
    if (state !== 'playing' || pendingMark || burnoutHandled || time - roundStarted < currentTier().burnMs) return;
    burnoutHandled = true;
    clearRoundTimers();
    wrongTone();
    updateAndon(time);
    beginFailure(UI_COPY.lightLostReport);
  }

  function handleWrong() {
    if (state !== 'transition') return;
    transitionTimer = 0; transitionStarted = 0; curtain.className = ''; clearMarkingUi();
    beginFailure(UI_COPY.caseReset);
  }

  function restartCase() {
    clearRoundTimers(); hidePanel(messagePanel); round = 0; progress = 0; marks = 0; correctCalls = 0; completionSubmitted = false; recentAnomalyIds = []; recentAnchorRegions = []; pataskalaCooldownRounds = 0; caseStarted = performance.now(); startRound();
  }

  function silenceDrone() {
    window.clearTimeout(droneTellTimer);
    if (!ambientGain || !audioContext) return;
    ambientGain.gain.cancelScheduledValues(audioContext.currentTime);
    ambientGain.gain.setValueAtTime(0, audioContext.currentTime);
  }

  function beginFailure(message) {
    clearRoundTimers(); clearMarkingUi(); clearWrongMarkHazard(); state = 'caught'; setControlsVisible(false); failureStarted = performance.now(); setObservation('CASE RESET', 'じけんを はじめから', { immediate: true }); silenceDrone(); if (bgmGain && audioContext) bgmGain.gain.setTargetAtTime(0, audioContext.currentTime, .08); updateAndon();
    const jumpLevel = currentTier().jumpLevel ?? AUDIO_LEVELS.jump;
    const token = roundToken;
    failureJumpTimer = window.setTimeout(() => { if (token === roundToken && state === 'caught' && failureStarted) playSfx(Math.random() < .5 ? 'jump1' : 'jump2', jumpLevel); }, FAILURE_SILENCE_MS + 60);
    failurePanelTimer = window.setTimeout(() => { if (token === roundToken && state === 'caught' && failureStarted) showMessage(message, restartCase); }, FAILURE_PANEL_DELAY_MS);
  }

  function releasePointerInteraction() {
    const pointerId = activePointerId;
    pointerActive = false;
    activePointerId = null;
    markHoldOrigin = null;
    markHoldStartedAt = 0;
    window.clearTimeout(markHoldTimer);
    markHoldTimer = 0;
    if (pointerId != null && canvas.hasPointerCapture?.(pointerId)) {
      canvas.releasePointerCapture?.(pointerId);
    }
  }

  function cancelPendingMarkHold() {
    if (markLocked) return;
    markHoldOrigin = null;
    markHoldStartedAt = 0;
    window.clearTimeout(markHoldTimer);
    markHoldTimer = 0;
  }

  function boohaInteractionRadius() {
    return clamp(Math.min(width, height) * .1, 52, 92) * .78;
  }

  function setBoohaTarget(event, options = {}) {
    if (state !== 'playing' || pendingMark) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const nextX = rawX - roomCamera.x;
    const nextY = rawY - roomCamera.y;
    if (!roomContains(nextX, nextY)) return;
    canvas.setPointerCapture?.(event.pointerId);
    activePointerId = event.pointerId;
    const isPointerStart = options.start === true;
    const pointerOnBooha = Math.hypot(nextX - booha.x, nextY - booha.y) <= boohaInteractionRadius();
    const movedBeyondDeadZone = markHoldOrigin
      && Math.hypot(nextX - markHoldOrigin[0], nextY - markHoldOrigin[1]) > MARK_DEAD_ZONE_PX;
    booha.targetX = nextX;
    booha.targetY = nextY;
    updateRoomCamera();
    keyboardMarkActive = false;
    pointerActive = true;
    if (wrongMarkHazard || pataskalaThreat) {
      cancelPendingMarkHold();
      setObservation(wrongMarkHazard ? 'RUN TO THE EXIT' : 'KEEP MOVING / FIND THE EXIT', wrongMarkHazard ? 'でぐちへ にげる' : 'うごきつづける / でぐちを さがす', { immediate: true });
      return;
    }
    if (isPointerStart && pointerOnBooha) {
      markHoldOrigin = [nextX, nextY];
      markLocked = false;
      window.clearTimeout(markHoldTimer);
      markHoldStartedAt = performance.now();
      markHoldTimer = window.setTimeout(lockMark, MARK_HOLD_MS);
    } else if (isPointerStart || movedBeyondDeadZone) {
      cancelPendingMarkHold();
    }
  }

  function moveBoohaTarget(event) { if (pointerActive) setBoohaTarget(event, { start: false }); }
  function releaseBooha(event) {
    if (event?.pointerId != null) activePointerId = event.pointerId;
    releasePointerInteraction();
  }

  function moveBoohaByKeyboard(dx, dy) {
    if (state !== 'playing' || markLocked || pendingMark) return;
    const step = Math.max(28, roomMinDimension() * .06);
    booha.targetX = clamp(booha.targetX + dx * step, plate.x, plate.x + plate.w);
    booha.targetY = clamp(booha.targetY + dy * step, plate.y, plate.y + plate.h);
    if (wrongMarkHazard) {
      setObservation('RUN TO THE EXIT', 'でぐちへ にげる', { immediate: true });
    } else if (keyboardMarkActive) {
      markHoldOrigin = [booha.targetX, booha.targetY];
      window.clearTimeout(markHoldTimer);
      markHoldStartedAt = performance.now();
      markHoldTimer = window.setTimeout(lockMark, MARK_HOLD_MS);
    } else {
      setObservation('ARROWS MOVE BOOHA / SPACE MARKS', 'やじるしで ブーハを うごかす / スペースで しるし');
    }
  }

  function startKeyboardMark() {
    if (state !== 'playing' || markLocked || pendingMark || wrongMarkHazard || pataskalaThreat) return;
    releasePointerInteraction();
    keyboardMarkActive = true;
    markHoldOrigin = [booha.targetX, booha.targetY];
    window.clearTimeout(markHoldTimer);
    markHoldStartedAt = performance.now();
    markHoldTimer = window.setTimeout(lockMark, MARK_HOLD_MS);
    setObservation('HOLD SPACE STILL', 'スペースを じっと おす');
  }

  function releaseKeyboardMark() {
    keyboardMarkActive = false;
    if (!markLocked) {
      markHoldOrigin = null;
      markHoldStartedAt = 0;
      window.clearTimeout(markHoldTimer);
    }
  }

  function lockMark() {
    markHoldTimer = 0;
    markHoldStartedAt = 0;
    if (state !== 'playing' || wrongMarkHazard || pataskalaThreat || (!pointerActive && !keyboardMarkActive)) return;
    markLocked = true;
    pendingMark = { x: booha.targetX, y: booha.targetY, radius: lightRadius() };
    showMarkConfirm();
  }

  function showMarkConfirm() {
    releasePointerInteraction();
    keyboardMarkActive = false;
    pauseMarkConfirmClock();
    const nearbyChange = reportTargets()
      .map(anomaly => ({ anomaly, distance: Math.hypot(pendingMark.x - currentPoint(anomaly.target)[0], pendingMark.y - currentPoint(anomaly.target)[1]) }))
      .filter(entry => markMatchesAnomaly(pendingMark, entry.anomaly))
      .sort((a, b) => a.distance - b.distance)[0]?.anomaly;
    const labelEn = nearbyChange?.labelEn || 'THIS PLACE';
    const labelJp = nearbyChange?.labelJp || 'この ばしょ';
    setBilingual(markConfirmTitleEn, markConfirmTitleJp, `MARK THE ${labelEn}?`, `${labelJp}に しるしを つける？`);
    setBilingual(markConfirmObjectEn, markConfirmObjectJp, labelEn, labelJp);
    showPanel(markConfirmPanel);
    setObservation('CONFIRM THE MARK', 'しるしを かくにん', { immediate: true });
    markYesButton.focus?.();
  }

  function startWrongMarkHazard(mark) {
    const now = performance.now();
    wrongMarkHazard = {
      x: mark.x,
      y: mark.y,
      radius: clamp(mark.radius * .34, 22, 42),
      startedAt: now,
      telegraphUntil: now + WRONG_MARK_TELEGRAPH_MS,
      graceUntil: now + Math.max(WRONG_MARK_GRACE_MS, WRONG_MARK_TELEGRAPH_MS),
      lastTime: now,
    };
    wrongTone();
    playSfx('anomaly', Math.min(.48, AUDIO_LEVELS.anomaly + .1));
    setObservation('WRONG MARK / RUN TO THE EXIT', 'まちがいの しるし / でぐちへ にげる', { immediate: true });
  }

  function confirmMark() {
    if (state !== 'playing' || !pendingMark) return;
    const mark = pendingMark;
    pendingMark = null;
    resumeMarkConfirmClock();
    markLocked = false;
    pointerActive = false;
    keyboardMarkActive = false;
    markHoldOrigin = null;
    markHoldStartedAt = 0;
    releasePointerInteraction();
    hidePanel(markConfirmPanel);
    if (!reportTargets().some(anomaly => markMatchesAnomaly(mark, anomaly))) {
      startWrongMarkHazard(mark);
      return;
    }
    markedPoints.push(mark);
    rightTone();
    setReportLabel(true);
    setObservation('MARK ADDED / FIND ANOTHER OR REPORT', 'しるしを つけた / つぎを さがすか ほうこく');
  }

  function cancelMark() {
    if (state !== 'playing' || !pendingMark) return;
    pendingMark = null;
    resumeMarkConfirmClock();
    markLocked = false;
    releasePointerInteraction();
    keyboardMarkActive = false;
    hidePanel(markConfirmPanel);
    canvas.removeAttribute('aria-disabled');
    setObservation('KEEP LOOKING', 'まだ さがす');
  }

  function undoLastMark() {
    if (state !== 'playing' || pendingMark || !markedPoints.length) return;
    const removedMark = markedPoints.pop();
    undoGhost = { ...removedMark, startedAt: performance.now() };
    setReportLabel(markedPoints.length > 0);
    setObservation(markedPoints.length ? 'LAST MARK REMOVED / KEEP LOOKING' : 'ALL MARKS REMOVED / KEEP LOOKING', markedPoints.length ? 'さいごの しるしを けした / まだ さがす' : 'しるしを ぜんぶ けした / まだ さがす');
  }

  function displayNextClue() {
    if (!clueQueue.length) {
      clueActive = false;
      clueCard.hidden = true;
      clueCard.classList.remove('is-fading');
      clueTimer = 0;
      clueFadeTimer = 0;
      flushQueuedObservation();
      return;
    }
    clueActive = true;
    const next = clueQueue.shift();
    clueEn.textContent = next.en;
    clueJp.textContent = next.jp;
    clueCard.classList.remove('is-fading');
    clueCard.hidden = false;
    clueVersion += 1;
    const version = clueVersion;
    window.clearTimeout(clueTimer);
    window.clearTimeout(clueFadeTimer);
    clueTimer = window.setTimeout(() => {
      if (version !== clueVersion) return;
      clueTimer = 0;
      clueCard.classList.add('is-fading');
      clueFadeTimer = window.setTimeout(() => {
        if (version !== clueVersion) return;
        clueFadeTimer = 0;
        clueCard.hidden = true;
        clueCard.classList.remove('is-fading');
        clueActive = false;
        displayNextClue();
      }, PANEL_FADE_MS);
    }, next.duration);
  }

  function enqueueClue(en, jp, duration = CLUE_DISPLAY_MS) {
    clueQueue.push({ en, jp, duration });
    if (!clueActive) displayNextClue();
  }

  function showClue() {
    const enNotes = currentAnomalies.map(anomaly => anomaly.en);
    const jpNotes = currentAnomalies.map(anomaly => anomaly.jp);
    if (currentAudioOnly) { enNotes.push(AUDIO_ONLY_CHANGE.en); jpNotes.push(AUDIO_ONLY_CHANGE.jp); }
    clueQueue = [];
    clueActive = false;
    clueVersion += 1;
    window.clearTimeout(clueTimer); clueTimer = 0;
    window.clearTimeout(clueFadeTimer); clueFadeTimer = 0;
    clueCard.hidden = true;
    clueCard.classList.remove('is-fading');
    enqueueClue(enNotes.join(' / '), jpNotes.join(' / '));
    setObservation('MARKS RETURNED TO THE LANTERN', 'しるしが あかりに もどった');
  }

  function showPriorityClue(en, jp) {
    clueQueue = [];
    clueActive = false;
    clueVersion += 1;
    window.clearTimeout(clueTimer); clueTimer = 0;
    window.clearTimeout(clueFadeTimer); clueFadeTimer = 0;
    clueCard.hidden = true;
    clueCard.classList.remove('is-fading');
    enqueueClue(en, jp);
  }

  function showLightTipOnce() {
    const save = window.BoohaAdventure?.save;
    if (!save?.load || !save?.save) return;
    try {
      const data = save.load();
      if (!data || typeof data !== 'object' || data.meta?.familyRoomLightTipShown) return;
      if (!data.meta || typeof data.meta !== 'object' || Array.isArray(data.meta)) data.meta = {};
      data.meta.familyRoomLightTipShown = true;
      if (!save.save(data)) return;
      enqueueClue(
        "Booha's light shrinks as it burns — keep it close to search the room.",
        'ブーハの あかりは もえると ちいさくなる。そばで へやを さがそう。',
      );
    } catch (error) {
      console.warn('[Family Room] light tip unavailable', error);
    }
  }

  function recordFamilyRoomCompletion() {
    const save = window.BoohaAdventure?.save;
    if (!save?.load || !save?.save) return false;
    try {
      const data = save.load();
      const weekly = data.weekly && typeof data.weekly === 'object' ? data.weekly : (data.weekly = {});
      const worlds = weekly.worlds && typeof weekly.worlds === 'object' ? weekly.worlds : (weekly.worlds = {});
      const familyRoom = worlds.familyRoom && typeof worlds.familyRoom === 'object' ? worlds.familyRoom : (worlds.familyRoom = {});
      const completedCases = familyRoom.completedCases && typeof familyRoom.completedCases === 'object' && !Array.isArray(familyRoom.completedCases)
        ? familyRoom.completedCases : (familyRoom.completedCases = {});
      const prior = completedCases[ACTIVE_CASE_ID] && typeof completedCases[ACTIVE_CASE_ID] === 'object'
        ? completedCases[ACTIVE_CASE_ID] : {};
      const priorRank = TIER_RANK[prior.bestTier] || 0;
      const currentRank = TIER_RANK[selectedTier] || 0;
      const bestTier = currentRank >= priorRank ? selectedTier : (prior.bestTier || selectedTier);
      familyRoom.activeCaseId = ACTIVE_CASE_ID;
      familyRoom.bestTier = (TIER_RANK[familyRoom.bestTier] || 0) >= currentRank ? familyRoom.bestTier : selectedTier;
      completedCases[ACTIVE_CASE_ID] = {
        sealedAt: Number(prior.sealedAt) || Date.now(),
        bestTier,
      };
      nextCaseId = BUILT_CASE_IDS.find(caseId => !completedCases[caseId]) || null;
      // This is deliberately score-free. The shared gameEnd event remains the
      // one place that records hidden marks for existing arcade compatibility.
      familyRoom.activeCaseId = nextCaseId || ACTIVE_CASE_ID;
      familyRoom.lastResult = { caseId: ACTIVE_CASE_ID, nextCaseId, tier: selectedTier, completedAt: Date.now() };
      return save.save(data);
    } catch (error) {
      console.warn('[Family Room] weekly case record unavailable', error);
      return false;
    }
  }

  function submitResult() {
    if (completionSubmitted) return;
    completionSubmitted = true;
    recordFamilyRoomCompletion();
    document.dispatchEvent(new CustomEvent('booha:gameEnd', { detail: { saveId: SAVE_ID, score: marks, completed: true, time: performance.now() - caseStarted, recordEligible: true, recentRun: { marks, calls: correctCalls, tier: selectedTier } } }));
  }

  function showComplete() {
    if (state === 'complete') return;
    clearRoundTimers();
    state = 'complete';
    setControlsVisible(false);
    clearMarkingUi();
    if (bgmGain && audioContext) bgmGain.gain.setTargetAtTime(0, audioContext.currentTime, .08);
    setObservation('THE ROOM IS QUIET', 'へやが しずかに なった', { immediate: true });
    startLoop();
    completionTimer = window.setTimeout(() => {
      completionTimer = 0;
      if (state !== 'complete') return;
      completeTone();
      submitResult();
      stopLoop();
      showMessage(nextCaseId ? buildNextCaseCopy() : UI_COPY.complete, nextCaseId ? enterNextCase : exitGame);
    }, COMPLETION_QUIET_MS);
  }

  function exitGame() {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin === window.location.origin && !referrer.pathname.endsWith('/family-room.html')) { window.history.back(); return; }
    } catch (_) {}
    window.location.href = 'adventure-profile.html';
  }

  function toggleSound() {
    audioEnabled = !audioEnabled;
    setBilingual(soundState, soundStateJp, audioEnabled ? 'ON' : 'OFF', audioEnabled ? 'オン' : 'オフ');
    soundToggle.setAttribute('aria-pressed', String(audioEnabled));
    if (audioEnabled) ensureAudio();
    if (audioMasterGain && audioContext) audioMasterGain.gain.setTargetAtTime(audioEnabled ? AUDIO_LEVELS.master : 0, audioContext.currentTime, .04);
    if (ambientGain && audioContext) ambientGain.gain.setTargetAtTime(audioEnabled ? .014 : 0, audioContext.currentTime, .12);
  }

  function ensureAudio() {
    if (!audioEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext; if (!AudioContextClass) return;
    if (!audioContext) {
      audioContext = new AudioContextClass();
      audioMasterGain = audioContext.createGain(); audioMasterGain.gain.value = AUDIO_LEVELS.master; audioMasterGain.connect(audioContext.destination);
      ambientOscillator = audioContext.createOscillator(); ambientGain = audioContext.createGain(); ambientOscillator.type = 'sine'; ambientOscillator.frequency.value = 42; ambientGain.gain.value = .014; ambientOscillator.connect(ambientGain).connect(audioMasterGain); ambientOscillator.start();
    }
    audioMasterGain.gain.setTargetAtTime(AUDIO_LEVELS.master, audioContext.currentTime, .04);
    loadAudioBuffers();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  }

  function loadAudioBuffers() {
    if (!audioContext || typeof window.fetch !== 'function') return null;
    if (!sfxLoadPromise) {
      sfxLoadPromise = Promise.allSettled(FAMILY_SFX_NAMES.map(name => loadAudioBuffer(name, FAMILY_AUDIO[name])))
        .then(results => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') console.warn(`[Family Room] SFX unavailable: ${FAMILY_SFX_NAMES[index]}`);
          });
          return results;
        });
    }
    if (!bgmLoadPromise) {
      bgmLoadPromise = loadAudioBuffer('bgm', FAMILY_AUDIO.bgm)
        .then(() => { if (audioEnabled && state === 'playing') startBgm(); })
        .catch(() => { console.warn('[Family Room] BGM unavailable'); return false; });
    }
    return Promise.allSettled([sfxLoadPromise, bgmLoadPromise]);
  }

  async function loadAudioBuffer(name, url) {
    if (audioBuffers[name]) return true;
    const response = await window.fetch(url);
    if (!response.ok) throw new Error(`Family Room audio failed: ${name}`);
    audioBuffers[name] = await audioContext.decodeAudioData(await response.arrayBuffer());
    return true;
  }

  function startBgm() {
    if (!audioEnabled || !audioContext || bgmSource || !audioBuffers.bgm) return;
    bgmSource = audioContext.createBufferSource(); bgmGain = audioContext.createGain();
    bgmSource.buffer = audioBuffers.bgm; bgmSource.loop = true; bgmGain.gain.value = AUDIO_LEVELS.bgm;
    bgmSource.connect(bgmGain).connect(audioMasterGain); bgmSource.start();
  }

  function playSfx(name, level) {
    if (!audioEnabled || !audioContext || !audioBuffers[name]) return;
    const source = audioContext.createBufferSource(); const gain = audioContext.createGain();
    source.buffer = audioBuffers[name]; gain.gain.value = level; source.connect(gain).connect(audioMasterGain); source.start();
  }

  function tone(frequency, duration, volume, type = 'sine') {
    if (!audioEnabled || !audioContext) return;
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain).connect(audioMasterGain || audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  }

  function ping(frequency, volume) { tone(frequency, .12, volume); }
  function rightTone() { tone(330, .16, .04); window.setTimeout(() => tone(495, .18, .03), 70); }
  function wrongTone() { tone(74, .28, .045, 'sine'); window.setTimeout(() => tone(55, .34, .035, 'triangle'), 95); }
  function completeTone() { [330, 440, 660].forEach((frequency, index) => window.setTimeout(() => tone(frequency, .26, .035), index * 100)); }

  document.getElementById('start-button').addEventListener('click', enterRoom);
  studyStartButton.addEventListener('click', beginCaseFromStudy);
  studyBackButton.addEventListener('click', exitGame);
  backButton.addEventListener('click', exitGame);
  document.getElementById('leave-button').addEventListener('click', handleLeave);
  undoButton.addEventListener('click', undoLastMark);
  markYesButton.addEventListener('click', confirmMark);
  markNoButton.addEventListener('click', cancelMark);
  canvas.addEventListener('pointerdown', event => setBoohaTarget(event, { start: true }));
  canvas.addEventListener('pointermove', moveBoohaTarget);
  canvas.addEventListener('pointerup', releaseBooha);
  canvas.addEventListener('pointercancel', releaseBooha);
  soundToggle.addEventListener('click', toggleSound);
  clueCloseButton?.addEventListener('click', continueFromClue);
  flyAwayButton?.addEventListener('click', flyAwayToSafeRoom);
  flashlightButton?.addEventListener('click', useFlashlightCharge);
  tierButtons.forEach(button => button.addEventListener('click', () => { if (button.disabled) return; selectedTier = button.dataset.tier; savePreferredTier(); updateTierButtons(); }));
  window.addEventListener('resize', scheduleResize);
  window.addEventListener('orientationchange', scheduleResize);
  window.visualViewport?.addEventListener('resize', scheduleResize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseForVisibility(); else resumeFromVisibility(); });
  window.addEventListener('pagehide', pauseForVisibility, { passive: true });
  window.addEventListener('pageshow', resumeFromVisibility, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.key === 'Enter' && state === 'title') { event.preventDefault?.(); enterRoom(); return; }
    if (event.key === 'Enter' && state === 'study') { event.preventDefault?.(); beginCaseFromStudy(); return; }
    if (state !== 'playing') return;
    if (pendingMark) {
      if (event.key === 'Escape' && !event.repeat) { event.preventDefault?.(); cancelMark(); }
      return;
    }
    const key = event.key.toLowerCase();
    const movement = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[key];
    if (movement) { event.preventDefault?.(); moveBoohaByKeyboard(...movement); return; }
    if ((event.key === ' ' || event.key === 'Spacebar') && !event.repeat) { event.preventDefault?.(); startKeyboardMark(); return; }
    if (event.key === 'Enter' && !event.repeat) { event.preventDefault?.(); handleLeave(); }
  });
  window.addEventListener('keyup', event => { if (event.key === ' ' || event.key === 'Spacebar') releaseKeyboardMark(); });

  applyBoohaSkin();
  if (window.BOOHA_READY) applyBoohaSkin();
  else document.addEventListener('booha:ready', applyBoohaSkin, { once: true });
  ACTIVE_CASE_ID = readActiveCase();
  loadActiveCaseContent();
  selectedTier = readPreferredTier();
  flashlightCharges = readFlashlightCharges();
  resize(); updateAndon(); updateTierButtons();
})();
