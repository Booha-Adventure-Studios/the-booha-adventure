(() => {
  'use strict';

  const SAVE_ID = 'bonus:family_room';
  const CASE_ROUNDS = 7;
  const MARK_HOLD_MS = 600;
  const MARK_DEAD_ZONE_PX = 8;
  const WRONG_MARK_GRACE_MS = 700;
  const WRONG_MARK_TELEGRAPH_MS = 1500;
  const CLUE_DISPLAY_MS = 7600;
  const PANEL_FADE_MS = 320;
  const EXIT_BAND_V = .86;
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
    Object.freeze({ number: 1, id: 'genkan', name: 'GENKAN', jp: 'げんかん', light: 'bare bulb and purple spill', exit: 'front door', feel: 'ordinary tutorial' }),
    Object.freeze({ number: 2, id: 'chanoma', name: 'CHANOMA', jp: 'ちゃのま', light: 'andon', exit: 'engawa step', feel: 'reference case', status: 'built' }),
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
    pataskala: Object.freeze({ role: 'presence', scoredTarget: false, markableTarget: true, risesWithCaseDepth: true, finalRoom: 'nando', targetId: 'pataskala' }),
    production: Object.freeze({ masterOnly: true, canvas: '1024x1536', safeBand: [0.22, 0.78], exitEdgeRequired: true }),
  });
  const ACTIVE_CASE_ID = 'chanoma';
  const ACTIVE_CASE = FAMILY_HOUSE_CASES.find(entry => entry.id === ACTIVE_CASE_ID);
  const ACTIVE_CASE_LABEL = String(ACTIVE_CASE.number).padStart(2, '0');
  const TIER_RANK = Object.freeze({ patient: 1, quicker: 2, lies: 3 });

  const UI_COPY = Object.freeze({
    caseReset: { kicker: `CASE FILE ${ACTIVE_CASE_LABEL} / CASE RESET`, kickerJp: `じけんファイル ${ACTIVE_CASE_LABEL} / じけんを はじめから`, title: 'THE ROOM SENT YOU BACK.', titleJp: 'へやが あなたを もどした。', copy: 'A mistake sends you back to the start of this case. The study room will not return. Try again when you are ready.', copyJp: 'まちがえると、この じけんの はじめに もどる。おぼえる へやは もう でてこない。じゅんびが できたら、もういちど やってみよう。', button: 'RESTART THE CASE', buttonJp: 'じけんを やりなおす' },
    lightLostReport: { kicker: `CASE FILE ${ACTIVE_CASE_LABEL} / LIGHT LOST`, kickerJp: `じけんファイル ${ACTIVE_CASE_LABEL} / あかりが きえた`, title: 'THE ROOM KEPT YOU.', titleJp: 'へやに つかまった。', copy: 'The case is not closed. Bring the light back and try the room again.', copyJp: 'じけんは おわっていない。あかりを もどして、もういちど へやを やってみよう。', button: 'RESTART THE CASE', buttonJp: 'じけんを やりなおす' },
    complete: { kicker: `CASE FILE ${ACTIVE_CASE_LABEL} / SEALED`, kickerJp: `じけんファイル ${ACTIVE_CASE_LABEL} / ふういん`, title: 'THE ROOM LET GO.', titleJp: 'へやが はなした。', copy: 'You kept the room in view. Your notes are filed, and the door is where you left it.', copyJp: 'へやを みつづけた。きろくを のこした。ドアは おいた ばしょに ある。', button: 'RETURN TO THE PROFILE', buttonJp: 'プロフィールへ もどる' },
  });

  const PATASKALA_POSES = [
    { id: 'pataskala-standing', target: [.7, .29, .22], artSize: .28, targetId: 'pataskala', en: 'Pataskala is standing in the room.', jp: 'パタスカラが へやに たっている。', labelEn: 'PATASKALA', labelJp: 'パタスカラ', kind: 'character', character: 'pataskala' },
    { id: 'pataskala-moving', target: [.74, .43, .22], artSize: .28, targetId: 'pataskala', en: 'Pataskala crossed the room.', jp: 'パタスカラが へやを よこぎった。', labelEn: 'PATASKALA', labelJp: 'パタスカラ', kind: 'character', character: 'pataskala' },
    { id: 'pataskala-crouch', target: [.73, .56, .22], artSize: .28, targetId: 'pataskala', en: 'Pataskala is crouching by the futon.', jp: 'パタスカラが ふとんの そばに しゃがんでいる。', labelEn: 'PATASKALA', labelJp: 'パタスカラ', kind: 'character', character: 'pataskala' },
    { id: 'pataskala-emerging', target: [.25, .47, .22], artSize: .28, targetId: 'pataskala', en: 'Pataskala is coming out of the shadows.', jp: 'パタスカラが かげから でてくる。', labelEn: 'PATASKALA', labelJp: 'パタスカラ', kind: 'character', character: 'pataskala' },
  ];

  const anomalies = [
    { id: 'bowl', target: [.74, .51, .09], artSize: .09, en: "The bowl wasn't there before.", jp: 'おわんが なかった。', labelEn: 'BOWL', labelJp: 'おわん', kind: 'added' },
    { id: 'cup', target: [.35, .49, .1], artSize: .11, en: 'There is one cup too many.', jp: 'コップが ひとつ おおい。', labelEn: 'CUP', labelJp: 'コップ', kind: 'duplicated' },
    { id: 'eyes', target: [.73, .25, .12], artSize: .08, en: 'Something is watching from the shoji.', jp: 'しょうじから だれかが みている。', labelEn: 'SHOJI', labelJp: 'しょうじ', kind: 'watching' },
    { id: 'shadow', target: [.68, .23, .18], artSize: .14, en: 'The shadow behind the shoji moved.', jp: 'しょうじの かげが うごいた。', labelEn: 'SHOJI SHADOW', labelJp: 'しょうじの かげ', kind: 'state' },
    { id: 'talisman', target: [.23, .23, .12], artSize: .09, en: 'A paper charm was not there before.', jp: 'おふだが なかった。', labelEn: 'PAPER CHARM', labelJp: 'おふだ', kind: 'added' },
    { id: 'lantern', target: [.23, .31, .12], artSize: .075, en: 'The lantern flame is looking the wrong way.', jp: 'あんどんの ほのおが ちがう。', labelEn: 'LANTERN', labelJp: 'あんどん', kind: 'state' },
    { id: 'futon', target: [.76, .37, .16], artSize: .125, en: 'The futon is facing the room.', jp: 'ふとんが へやを むいている。', labelEn: 'FUTON', labelJp: 'ふとん', kind: 'moved' },
    { id: 'seams', target: [.55, .68, .16], artSize: .06, en: 'One tatami seam has disappeared.', jp: 'たたみの めが ひとつ きえた。', labelEn: 'TATAMI SEAM', labelJp: 'たたみの め', kind: 'missing' },
    { id: 'teapot', target: [.29, .44, .12], artSize: .095, en: 'The teapot has turned toward you.', jp: 'きゅうすが こちらを むいた。', labelEn: 'TEAPOT', labelJp: 'きゅうす', kind: 'moved' },
    { id: 'crescent', target: [.77, .30, .1], artSize: .08, en: 'A small moon is inside the room.', jp: 'へやの なかに つきが ある。', labelEn: 'MOON', labelJp: 'つき', kind: 'added' },
  ];
  const AUDIO_ONLY_CHANGE = Object.freeze({ id: 'audio-only', en: 'The room made a sound it did not make before.', jp: 'へやが まえには しなかった おとを たてた。', labelEn: 'THE ROOM', labelJp: 'へや', kind: 'audio' });

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
  const observationNote = document.getElementById('observation-note');
  const observationEn = document.getElementById('observation-en');
  const observationJp = document.getElementById('observation-jp');
  const andon = document.getElementById('andon');
  const clueCard = document.getElementById('clue-card');
  const clueEn = document.getElementById('clue-en');
  const clueJp = document.getElementById('clue-jp');
  const soundToggle = document.getElementById('sound-toggle');
  const soundState = document.getElementById('sound-state');
  const soundStateJp = document.getElementById('sound-state-jp');
  const leaveEn = document.getElementById('leave-en');
  const leaveJp = document.getElementById('leave-jp');
  const undoButton = document.getElementById('undo-button');
  const markButton = document.getElementById('mark-button');
  const markConfirmPanel = document.getElementById('mark-confirm-panel');
  const markConfirmTitleEn = document.getElementById('mark-confirm-title-en');
  const markConfirmTitleJp = document.getElementById('mark-confirm-title-jp');
  const markConfirmObjectEn = document.getElementById('mark-confirm-object-en');
  const markConfirmObjectJp = document.getElementById('mark-confirm-object-jp');
  const markYesButton = document.getElementById('mark-yes-button');
  const markNoButton = document.getElementById('mark-no-button');
  const backButton = document.getElementById('back-button');
  const studyStartButton = document.getElementById('study-start-button');
  const studyBackButton = document.getElementById('study-back-button');
  const flameEls = [...document.querySelectorAll('[data-flame]')];
  const tierButtons = [...document.querySelectorAll('[data-tier]')];

  const FAMILY_DEFERRED_ASSETS = Object.freeze([
    ...Object.values(FAMILY_AUDIO),
    ...PATASKALA_POSES.map(pose => `assets/family-room/pataskala/${pose.id}.webp`),
  ]);

  const baseImage = new Image();
  baseImage.src = 'assets/family-room/living_base.webp';
  const idleBooha = new Image();
  idleBooha.src = 'assets/family-room/booha_idle.webp';
  const alertBooha = new Image();
  alertBooha.src = 'assets/family-room/booha_alert.webp';
  const anomalyArt = Object.fromEntries(anomalies.map(anomaly => {
    const image = new Image();
    image.src = `assets/family-room/overlays/${anomaly.id}.webp`;
    return [anomaly.id, image];
  }));
  const pataskalaArt = Object.fromEntries(PATASKALA_POSES.map(pose => {
    const image = new Image();
    image.src = `assets/family-room/pataskala/${pose.id}.webp`;
    return [pose.id, image];
  }));

  let width = 0;
  let height = 0;
  let dpr = 1;
  let plate = { x: 0, y: 0, w: 0, h: 0 };
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
  let currentPresence = null;
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
  let clueVersion = 0;
  let roundToken = 0;
  let completionSubmitted = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeOut = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  const random = list => list[Math.floor(Math.random() * list.length)];

  function resize() {
    const oldWidth = width;
    const oldHeight = height;
    const hadViewport = oldWidth > 0 && oldHeight > 0;
    const normalized = hadViewport ? {
      x: booha.x / oldWidth,
      y: booha.y / oldHeight,
      targetX: booha.targetX / oldWidth,
      targetY: booha.targetY / oldHeight,
    } : null;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (LOW_POWER) dpr = Math.min(dpr, 1);
    const targetAspect = (baseImage.naturalWidth || 1024) / (baseImage.naturalHeight || 1536);
    const visibleViewport = window.visualViewport;
    const viewportWidth = Math.max(1, Math.round(visibleViewport?.width || window.innerWidth));
    const viewportHeight = Math.max(1, Math.round(visibleViewport?.height || window.innerHeight));
    if (viewportWidth / viewportHeight > targetAspect) {
      height = viewportHeight;
      width = Math.round(viewportHeight * targetAspect);
    } else {
      width = viewportWidth;
      height = viewportHeight;
    }
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.margin = '0 auto';
    if (normalized) {
      booha.x = clamp(normalized.x * width, 0, width);
      booha.y = clamp(normalized.y * height, 0, height);
      booha.targetX = clamp(normalized.targetX * width, 0, width);
      booha.targetY = clamp(normalized.targetY * height, 0, height);
      if (state === 'playing' && (oldWidth !== width || oldHeight !== height)) {
        clearMarkingUi();
        setObservation('SCREEN CHANGED / MARK AGAIN', 'がめんが かわった / もういちど しるし');
      }
    } else resetBooha();
    rebuildOverlays();
    if (!document.hidden) drawRoom(performance.now());
  }

  function scheduleResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => { resizeFrame = 0; resize(); });
  }

  function resetBooha() {
    booha = { x: width / 2, y: height * .74, targetX: width / 2, targetY: height * .74 };
  }

  function rebuildOverlays() {
    const iw = baseImage.naturalWidth || 1024;
    const ih = baseImage.naturalHeight || 1536;
    const scale = Math.max(width / iw, height / ih);
    plate = { w: iw * scale, h: ih * scale, x: (width - iw * scale) / 2, y: (height - ih * scale) / 2 };

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
    sctx.fillStyle = '#e8b76c';
    for (let y = 0; y < height; y += 4) sctx.fillRect(0, y, width, 1);
  }

  function setBilingual(enNode, jpNode, en, jp) {
    enNode.textContent = en;
    jpNode.textContent = jp;
  }

  function setObservation(en, jp, options = {}) {
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
    andon.setAttribute('aria-label', fraction < .22 ? "Booha's light is nearly gone / ブーハの あかりが きえそう" : "Booha's light is burning / ブーハの あかりが もえている");
  }

  function updateTierButtons() {
    const unlocked = unlockedTiers();
    tierButtons.forEach(button => {
      const tier = button.dataset.tier;
      button.disabled = !unlocked.includes(tier);
      button.classList.toggle('selected', selectedTier === tier);
    });
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

  function unlockedTiers() {
    const [vocab, sentence, question] = blitzTimes();
    const list = ['patient'];
    if (Math.max(vocab, sentence, question) < 45000) list.push('quicker');
    if (Math.max(vocab, sentence, question) < 30000) list.push('lies');
    return list;
  }

  function currentTier() { return TIER_RULES[selectedTier] || TIER_RULES.patient; }

  function pataskalaChance() {
    if (round < 2) return 0;
    const progression = [.28, .34, .42, .5, .58][clamp(round - 2, 0, 4)] || .58;
    const tierScale = selectedTier === 'patient' ? .78 : selectedTier === 'quicker' ? 1 : 1.14;
    return clamp(progression * tierScale, 0, .7);
  }

  function pataskalaPose() {
    const maxPose = selectedTier === 'lies' ? PATASKALA_POSES.length - 1 : 2;
    return random(PATASKALA_POSES.slice(0, maxPose + 1));
  }

  function chooseRound() {
    const tier = currentTier();
    const hasChange = Math.random() >= .5;
    currentAudioOnly = !hasChange && Math.random() < tier.audioOnlyChance;
    const changeCount = hasChange
      ? Math.min(tier.maxChanges, 1 + (Math.random() < tier.twoChangeChance ? 1 : 0))
      : 0;
    const pool = [...anomalies];
    currentAnomalies = [];
    for (let index = 0; index < changeCount; index += 1) {
      const choice = Math.floor(Math.random() * pool.length);
      currentAnomalies.push(pool.splice(choice, 1)[0]);
    }
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
      : Boolean(currentPresence || falseAlertPoint);
  }

  function currentPoint([u, v]) { return [plate.x + u * plate.w, plate.y + v * plate.h]; }

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
    ctx.shadowColor = anomaly.character === 'pataskala' ? 'rgba(219,230,218,.18)' : 'rgba(232,183,108,.42)';
    ctx.shadowBlur = Math.max(5, maxDimension * .12);
    ctx.drawImage(art, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  function drawAnomalies(list) {
    list.forEach(drawAnomaly);
  }

  function imageReady(image) {
    return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  }

  function drawRoom(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020202'; ctx.fillRect(0, 0, width, height);
    if (state === 'caught' && failureStarted) {
      if (time - failureStarted >= FAILURE_SILENCE_MS) drawFailureBooha(time);
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
    updateWrongMarkHazard(time);
    if (imageReady(baseImage)) {
      // Keep the room plate readable, then let Booha's lantern reveal only a
      // small moving circle at full brightness.
      ctx.save();
      ctx.globalAlpha = state === 'caught' ? .07 : .16;
      ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
      drawAnomalies(currentAnomalies); drawAnomaly(currentPresence);
      ctx.restore();
      const radius = lightRadius();
      ctx.save();
      ctx.beginPath(); ctx.arc(booha.x, booha.y, radius, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = state === 'caught' ? .24 : 1;
      ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
      drawAnomalies(currentAnomalies); drawAnomaly(currentPresence);
      const light = ctx.createRadialGradient(booha.x, booha.y, radius * .48, booha.x, booha.y, radius);
      light.addColorStop(0, 'rgba(0,0,0,0)');
      light.addColorStop(1, 'rgba(0,0,0,.84)');
      ctx.fillStyle = light; ctx.fillRect(booha.x - radius, booha.y - radius, radius * 2, radius * 2);
      ctx.restore();
      if (vignetteCanvas) ctx.drawImage(vignetteCanvas, 0, 0, width, height);
      const darkness = (1 - burnFraction(time)) * .12;
      if (darkness) { ctx.fillStyle = `rgba(0,0,0,${darkness})`; ctx.fillRect(0, 0, width, height); }
      drawShojiDawn();
    }
    if (scanlineCanvas) ctx.drawImage(scanlineCanvas, 0, 0, width, height);
    if (!REDUCED_MOTION && state !== 'title') {
      ctx.save(); ctx.globalAlpha = .035 + Math.sin(time / 260) * .012; ctx.fillStyle = '#fff'; ctx.fillRect(0, (time / 8) % height, width, 1); ctx.restore();
    }
    drawWrongMarkHazard(time);
    drawMarks();
    if (state !== 'caught') drawBooha(time);
  }

  function drawShojiDawn() {
    if (!progress) return;
    const x = plate.x + plate.w * .57;
    const y = plate.y + plate.h * .08;
    const w = plate.w * .34;
    const h = plate.h * .32;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = .025 + (progress / CASE_ROUNDS) * .22;
    const dawn = ctx.createLinearGradient(x, y + h, x + w, y);
    dawn.addColorStop(0, 'rgba(170,180,174,.25)');
    dawn.addColorStop(.55, 'rgba(224,220,194,.72)');
    dawn.addColorStop(1, 'rgba(247,238,203,.9)');
    ctx.fillStyle = dawn;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  function drawFailureBooha(time) {
    if (!imageReady(idleBooha)) return;
    const size = clamp(Math.min(width, height) * .075, 38, 62);
    const x = width / 2;
    const y = height * .7;
    ctx.save();
    ctx.globalAlpha = .72;
    ctx.shadowColor = 'rgba(229,176,89,.9)';
    ctx.shadowBlur = 18 + Math.sin(time / 260) * 3;
    ctx.drawImage(idleBooha, x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  function lightRadius() {
    const fraction = burnFraction();
    const minimum = REDUCED_MOTION ? .065 : .05;
    return Math.min(width, height) * (minimum + (.26 - minimum) * fraction);
  }

  function moveBooha() {
    const ease = REDUCED_MOTION ? .28 : .12;
    booha.x += (booha.targetX - booha.x) * ease;
    booha.y += (booha.targetY - booha.y) * ease;
  }

  function drawBooha(time) {
    const image = isBoohaAlerting() ? alertBooha : idleBooha;
    if (!imageReady(image)) return;
    const size = clamp(Math.min(width, height) * .1, 52, 92);
    const bob = REDUCED_MOTION ? 0 : Math.sin(time / 410) * 3;
    ctx.save();
    ctx.globalAlpha = .76;
    const fraction = burnFraction(time);
    ctx.shadowColor = `rgba(229,176,89,${.2 + fraction * .16})`;
    ctx.shadowBlur = 12 + fraction * 5;
    ctx.drawImage(image, booha.x - size / 2, booha.y - size / 2 + bob, size, size);
    if (pendingMark) {
      ctx.globalAlpha = .9;
      ctx.strokeStyle = '#e8b76c';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(booha.x, booha.y, size * .68, 0, Math.PI * 2); ctx.stroke();
    }
    if (markHoldOrigin && !markLocked && !pendingMark) {
      const heldMs = Math.max(0, time - markHoldStartedAt);
      const fraction = clamp(heldMs / MARK_HOLD_MS, 0, 1);
      ctx.globalAlpha = .95;
      ctx.strokeStyle = '#e8b76c';
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
      ctx.strokeStyle = '#e8b76c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, Math.max(12, mark.radius * .42), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = .95;
      ctx.fillStyle = '#e8b76c';
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
        ctx.strokeStyle = '#e8b76c';
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
    smoke.addColorStop(0, telegraphing ? 'rgba(255,170,72,.72)' : 'rgba(255,82,62,.92)');
    smoke.addColorStop(.32, telegraphing ? 'rgba(190,90,35,.42)' : 'rgba(190,35,35,.62)');
    smoke.addColorStop(1, 'rgba(80,0,0,0)');
    ctx.fillStyle = smoke;
    ctx.beginPath(); ctx.arc(wrongMarkHazard.x, wrongMarkHazard.y, radius * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = .92;
    ctx.strokeStyle = telegraphing ? '#ffbd67' : '#ff5545';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(wrongMarkHazard.x, wrongMarkHazard.y, radius, 0, Math.PI * 2); ctx.stroke();
    if (telegraphing) {
      ctx.globalAlpha = .72;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(wrongMarkHazard.x, wrongMarkHazard.y, radius * (1.2 + Math.sin(time / 180) * .12), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function clearWrongMarkHazard() { wrongMarkHazard = null; }

  function boohaAtExit() { return booha.y >= height * EXIT_BAND_V; }

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
    if (distance <= wrongMarkHazard.radius + Math.min(width, height) * .045) {
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

  function alertTarget() {
    if (currentAnomaly) return currentAnomaly.target;
    if (falseAlertPoint) return [falseAlertPoint.u, falseAlertPoint.v, falseAlertPoint.radius];
    if (currentPresence) return currentPresence.target;
    return null;
  }

  function isBoohaAlerting() {
    const targets = [...currentAnomalies, ...(currentPresence ? [currentPresence] : [])].map(anomaly => anomaly.target);
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

  function hidePanels() {
    hidePanel(startPanel);
    hidePanel(studyPanel);
    hidePanel(messagePanel);
  }
  function clearRoundTimers() {
    window.clearTimeout(droneTellTimer); droneTellTimer = 0;
    window.clearTimeout(pataskalaMoveTimer); pataskalaMoveTimer = 0;
    window.clearTimeout(transitionTimer); transitionTimer = 0;
    window.clearTimeout(failureJumpTimer); failureJumpTimer = 0;
    window.clearTimeout(failurePanelTimer); failurePanelTimer = 0;
    window.clearTimeout(studyCurtainTimer); studyCurtainTimer = 0;
    transitionStarted = 0;
  }
  function clearMarkingUi() {
    clueVersion += 1;
    window.clearTimeout(clueTimer); clueTimer = 0;
    window.clearTimeout(clueFadeTimer); clueFadeTimer = 0;
    clueQueue = [];
    clueActive = false;
    queuedObservation = null;
    clueCard.hidden = true;
    clueCard.classList.remove('is-fading');
    clearWrongMarkHazard();
    undoGhost = null;
    markLocked = false; pendingMark = null; markedPoints = []; keyboardMarkActive = false;
    releasePointerInteraction();
    hidePanel(markConfirmPanel);
    setReportLabel(false);
  }
  function setControlsVisible(visible) {
    controls.classList.toggle('hidden', !visible);
    markButton.hidden = !visible;
  }

  function updateHud() { if (state === 'playing') setObservation(pendingMark ? 'CONFIRM THE MARK' : markedPoints.length ? 'MARK ADDED / FIND ANOTHER OR REPORT' : 'DRAG BOOHA / TAP MARK TO CHECK', pendingMark ? 'しるしを かくにん' : markedPoints.length ? 'しるしを つけた / つぎを さがすか ほうこく' : 'ブーハを ひっぱる / マークを おす'); else setObservation('LOOK / LISTEN / REMEMBER', 'みて / きいて / おぼえる'); setReportLabel(markedPoints.length > 0); }

  function startRound() {
    clearRoundTimers();
    roundToken += 1;
    state = 'playing'; burnoutHandled = false; failureStarted = 0; roundStarted = performance.now(); entryStarted = roundStarted; curtain.className = ''; setControlsVisible(true); clearMarkingUi(); resetBooha(); chooseRound(); updateHud(); updateAndon(); ensureAudio(); startBgm(); if (ambientGain && audioContext) ambientGain.gain.setTargetAtTime(audioEnabled ? .014 : 0, audioContext.currentTime, .12); if (bgmGain && audioContext) bgmGain.gain.setTargetAtTime(AUDIO_LEVELS.bgm, audioContext.currentTime, .18); scheduleTell(); ping(176 + round * 13, .028); startLoop();
  }

  function enterRoom() {
    selectedTier = tierButtons.find(button => button.classList.contains('selected'))?.dataset.tier || 'patient';
    clearRoundTimers();
    round = 0; progress = 0; marks = 0; correctCalls = 0; completionSubmitted = false; caseStarted = 0; currentAnomaly = null; currentAnomalies = []; currentPresence = null; currentAudioOnly = false; currentIsAnomaly = false;
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
    const urls = FAMILY_DEFERRED_ASSETS.map(url => new URL(url, window.location.href).pathname);
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
    schedulePataskalaMovement();
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

  function schedulePataskalaMovement() {
    window.clearTimeout(pataskalaMoveTimer); pataskalaMoveTimer = 0;
    if (!currentPresence) return;
    const token = roundToken;
    pataskalaMoveTimer = window.setTimeout(() => {
      pataskalaMoveTimer = 0;
      if (token !== roundToken || state !== 'playing' || !currentPresence) return;
      const choices = PATASKALA_POSES.filter(pose => pose.id !== currentPresence.id);
      currentPresence = random(choices.length ? choices : PATASKALA_POSES);
      tellPresence();
      playSfx('move', AUDIO_LEVELS.move);
      setObservation('SOMETHING MOVED / KEEP LOOKING', 'なにかが うごいた / まだ さがす');
    }, 5200 + Math.random() * 1800);
  }

  function markMatchesAnomaly(mark, anomaly) {
    const [tx, ty] = currentPoint(anomaly.target);
    const targetRadius = anomaly.targetId === 'pataskala'
      ? Math.max(mark.radius, plate.w * anomaly.target[2] * .72)
      : mark.radius;
    return Math.hypot(mark.x - tx, mark.y - ty) <= targetRadius;
  }

  function reportTargets() {
    return [
      ...currentAnomalies,
      ...(currentPresence?.targetId === 'pataskala' ? [currentPresence] : []),
    ];
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
    if (state !== 'playing' || pendingMark || wrongMarkHazard) return;
    state = 'transition'; transitionStarted = performance.now(); setControlsVisible(false); silenceDrone();
    const correct = reportIsCorrect();
    const token = roundToken;
    if (!correct) { wrongTone(); if (currentAnomalies.length || currentAudioOnly) playSfx('anomaly', AUDIO_LEVELS.anomaly); curtain.className = 'active catch'; transitionTimer = window.setTimeout(() => { if (token === roundToken) handleWrong(); }, REDUCED_MOTION ? 80 : 260); return; }
    correctCalls += 1; rightTone();
    if (currentAnomalies.length || currentAudioOnly) { marks += currentAnomalies.length + (currentAudioOnly ? 1 : 0); showClue(); }
    const transitionDelay = currentAnomalies.length ? (REDUCED_MOTION ? 500 : 1450 + (currentAnomalies.length - 1) * 350) : (currentAudioOnly ? (REDUCED_MOTION ? 300 : 900) : (REDUCED_MOTION ? 80 : 420));
    transitionTimer = window.setTimeout(() => { if (token === roundToken) advanceCase(); }, transitionDelay);
  }

  function handleBurnout(time) {
    if (state !== 'playing' || burnoutHandled || time - roundStarted < currentTier().burnMs) return;
    burnoutHandled = true;
    clearRoundTimers();
    wrongTone();
    updateAndon(time);
    beginFailure(UI_COPY.caseReset);
  }

  function handleWrong() {
    if (state !== 'transition') return;
    transitionTimer = 0; transitionStarted = 0; curtain.className = ''; clearMarkingUi();
    beginFailure(UI_COPY.caseReset);
  }

  function restartCase() {
    clearRoundTimers(); hidePanel(messagePanel); round = 0; progress = 0; marks = 0; correctCalls = 0; completionSubmitted = false; caseStarted = performance.now(); startRound();
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

  function setBoohaTarget(event) {
    if (state !== 'playing' || pendingMark) return;
    const rect = canvas.getBoundingClientRect();
    const nextX = clamp(event.clientX - rect.left, 0, width);
    const nextY = clamp(event.clientY - rect.top, 0, height);
    canvas.setPointerCapture?.(event.pointerId);
    activePointerId = event.pointerId;
    const startsHold = !pointerActive || !markHoldOrigin;
    const movedBeyondDeadZone = markHoldOrigin
      && Math.hypot(nextX - markHoldOrigin[0], nextY - markHoldOrigin[1]) > MARK_DEAD_ZONE_PX;
    booha.targetX = nextX;
    booha.targetY = nextY;
    keyboardMarkActive = false;
    pointerActive = true;
    if (wrongMarkHazard) {
      setObservation('RUN TO THE EXIT', 'でぐちへ にげる', { immediate: true });
      return;
    }
    if (startsHold || (!markLocked && movedBeyondDeadZone)) {
      markHoldOrigin = [nextX, nextY];
      markLocked = false;
      window.clearTimeout(markHoldTimer);
      markHoldStartedAt = performance.now();
      markHoldTimer = window.setTimeout(lockMark, MARK_HOLD_MS);
    }
    setObservation('HOLD BOOHA STILL', 'ブーハを じっと させる');
  }

  function moveBoohaTarget(event) { if (pointerActive) setBoohaTarget(event); }
  function releaseBooha(event) {
    if (event?.pointerId != null) activePointerId = event.pointerId;
    releasePointerInteraction();
  }

  function moveBoohaByKeyboard(dx, dy) {
    if (state !== 'playing' || markLocked || pendingMark) return;
    const step = Math.max(28, Math.min(width, height) * .06);
    booha.targetX = clamp(booha.targetX + dx * step, 0, width);
    booha.targetY = clamp(booha.targetY + dy * step, 0, height);
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
    if (state !== 'playing' || markLocked || pendingMark || wrongMarkHazard) return;
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
    if (state !== 'playing' || wrongMarkHazard || (!pointerActive && !keyboardMarkActive)) return;
    markLocked = true;
    pendingMark = { x: booha.targetX, y: booha.targetY, radius: lightRadius() };
    showMarkConfirm();
  }

  function showMarkConfirm() {
    releasePointerInteraction();
    keyboardMarkActive = false;
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

  function attemptMark() {
    if (state !== 'playing' || pendingMark || wrongMarkHazard) return;
    releasePointerInteraction();
    keyboardMarkActive = false;
    pendingMark = { x: booha.targetX, y: booha.targetY, radius: lightRadius() };
    showMarkConfirm();
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
    enqueueClue(enNotes.join(' / '), jpNotes.join(' / '));
    setObservation('MARKS RETURNED TO THE LANTERN', 'しるしが あかりに もどった', { immediate: true });
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
      // This is deliberately score-free. The shared gameEnd event remains the
      // one place that records hidden marks for existing arcade compatibility.
      familyRoom.lastResult = { caseId: ACTIVE_CASE_ID, tier: selectedTier, completedAt: Date.now() };
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

  function showComplete() { if (state === 'complete') return; clearRoundTimers(); state = 'complete'; setControlsVisible(false); clearMarkingUi(); if (bgmGain && audioContext) bgmGain.gain.setTargetAtTime(0, audioContext.currentTime, .08); setObservation('EXIT FOUND', 'でぐちを みつけた'); completeTone(); submitResult(); stopLoop(); showMessage(UI_COPY.complete, exitGame); }

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
  markButton.addEventListener('click', attemptMark);
  undoButton.addEventListener('click', undoLastMark);
  markYesButton.addEventListener('click', confirmMark);
  markNoButton.addEventListener('click', cancelMark);
  canvas.addEventListener('pointerdown', setBoohaTarget);
  canvas.addEventListener('pointermove', moveBoohaTarget);
  canvas.addEventListener('pointerup', releaseBooha);
  canvas.addEventListener('pointercancel', releaseBooha);
  soundToggle.addEventListener('click', toggleSound);
  tierButtons.forEach(button => button.addEventListener('click', () => { if (button.disabled) return; selectedTier = button.dataset.tier; updateTierButtons(); }));
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
    const key = event.key.toLowerCase();
    const movement = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[key];
    if (movement) { event.preventDefault?.(); moveBoohaByKeyboard(...movement); return; }
    if ((event.key === ' ' || event.key === 'Spacebar') && !event.repeat) { event.preventDefault?.(); startKeyboardMark(); return; }
    if (event.key === 'Enter' && !event.repeat) { event.preventDefault?.(); handleLeave(); }
  });
  window.addEventListener('keyup', event => { if (event.key === ' ' || event.key === 'Spacebar') releaseKeyboardMark(); });

  resize(); updateAndon(); updateTierButtons();
})();
