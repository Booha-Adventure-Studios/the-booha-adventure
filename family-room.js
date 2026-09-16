(() => {
  'use strict';

  const SAVE_ID = 'bonus:family_room';
  const CASE_ROUNDS = 7;
  const MARK_HOLD_MS = 600;
  const MARK_DEAD_ZONE_PX = 8;
  const FAILURE_SILENCE_MS = 1200;
  const FAILURE_PANEL_DELAY_MS = 1800;
  const MAX_FLAMES = 3;
  const FAMILY_AUDIO = Object.freeze({
    bgm: 'assets/family-room/audio/family_BGM.mp3',
    move: 'assets/family-room/audio/family_move-1.mp3',
    anomaly: 'assets/family-room/audio/family_anomaly-1.mp3',
    jump1: 'assets/family-room/audio/family_jump-1.mp3',
    jump2: 'assets/family-room/audio/family_jump-2.mp3',
  });
  const AUDIO_LEVELS = Object.freeze({ bgm: .07, move: .16, anomaly: .34, jump: .58, master: .72 });
  const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const TIER_RULES = Object.freeze({
    patient: { label: 'THE ROOM IS PATIENT', alertMultiplier: 2, falseAlertChance: 0, burnMs: 25000 },
    quicker: { label: 'THE ROOM IS QUICKER', alertMultiplier: 1.2, falseAlertChance: 0, burnMs: 18000 },
    lies: { label: 'THE ROOM LIES TO YOU', alertMultiplier: 1, falseAlertChance: .15, burnMs: 12000 },
  });

  const PATASKALA_POSES = [
    { id: 'pataskala-standing', target: [.7, .29, .14], artSize: .15, en: 'Pataskala is standing in the room.', jp: 'パタスカラが へやに たっている。', kind: 'character', character: 'pataskala' },
    { id: 'pataskala-moving', target: [.74, .43, .17], artSize: .16, en: 'Pataskala crossed the room.', jp: 'パタスカラが へやを よこぎった。', kind: 'character', character: 'pataskala' },
    { id: 'pataskala-crouch', target: [.73, .56, .18], artSize: .16, en: 'Pataskala is crouching by the futon.', jp: 'パタスカラが ふとんの そばに しゃがんでいる。', kind: 'character', character: 'pataskala' },
    { id: 'pataskala-emerging', target: [.25, .47, .16], artSize: .2, en: 'Pataskala is coming out of the shadows.', jp: 'パタスカラが かげから でてくる。', kind: 'character', character: 'pataskala' },
  ];

  const anomalies = [
    { id: 'bowl', target: [.74, .51, .09], artSize: .09, en: "The bowl wasn't there before.", jp: 'おわんが なかった。', kind: 'added' },
    { id: 'cup', target: [.35, .49, .1], artSize: .11, en: 'There is one cup too many.', jp: 'コップが ひとつ おおい。', kind: 'duplicated' },
    { id: 'eyes', target: [.73, .25, .12], artSize: .08, en: 'Something is watching from the shoji.', jp: 'しょうじから だれかが みている。', kind: 'watching' },
    { id: 'shadow', target: [.68, .23, .18], artSize: .14, en: 'The shadow behind the shoji moved.', jp: 'しょうじの かげが うごいた。', kind: 'state' },
    { id: 'talisman', target: [.23, .23, .12], artSize: .09, en: 'A paper charm was not there before.', jp: 'おふだが なかった。', kind: 'added' },
    { id: 'lantern', target: [.23, .31, .12], artSize: .075, en: 'The lantern flame is looking the wrong way.', jp: 'あんどんの ほのおが ちがう。', kind: 'state' },
    { id: 'futon', target: [.76, .37, .16], artSize: .125, en: 'The futon is facing the room.', jp: 'ふとんが へやを むいている。', kind: 'moved' },
    { id: 'seams', target: [.55, .68, .16], artSize: .06, en: 'One tatami seam has disappeared.', jp: 'たたみの めが ひとつ きえた。', kind: 'missing' },
    { id: 'teapot', target: [.29, .44, .12], artSize: .095, en: 'The teapot has turned toward you.', jp: 'きゅうすが こちらを むいた。', kind: 'moved' },
    { id: 'crescent', target: [.77, .30, .1], artSize: .08, en: 'A small moon is inside the room.', jp: 'へやの なかに つきが ある。', kind: 'added' },
  ];

  const canvas = document.getElementById('room-canvas');
  const ctx = canvas.getContext('2d');
  const controls = document.getElementById('controls');
  const startPanel = document.getElementById('start-panel');
  const messagePanel = document.getElementById('message-panel');
  const messageKicker = document.getElementById('message-kicker');
  const messageTitle = document.getElementById('message-title');
  const messageCopy = document.getElementById('message-copy');
  const messageButton = document.getElementById('message-button');
  const curtain = document.getElementById('transition-curtain');
  const observationNote = document.getElementById('observation-note');
  const andon = document.getElementById('andon');
  const clueCard = document.getElementById('clue-card');
  const clueEn = document.getElementById('clue-en');
  const clueJp = document.getElementById('clue-jp');
  const soundToggle = document.getElementById('sound-toggle');
  const soundState = document.getElementById('sound-state');
  const flameEls = [...document.querySelectorAll('[data-flame]')];
  const tierButtons = [...document.querySelectorAll('[data-tier]')];

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
  let state = 'title';
  let selectedTier = 'patient';
  let round = 0;
  let progress = 0;
  let flames = MAX_FLAMES;
  let marks = 0;
  let correctCalls = 0;
  let currentAnomaly = null;
  let currentIsAnomaly = false;
  let falseAlertPoint = null;
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
  let audioLoadPromise = null;
  let droneTellTimer = 0;
  let clueTimer = 0;
  let booha = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let pointerActive = false;
  let markHoldOrigin = null;
  let markHoldTimer = 0;
  let markLocked = false;
  let markedPoint = null;
  let burnoutHandled = false;
  let failureStarted = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeOut = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  const random = list => list[Math.floor(Math.random() * list.length)];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    if (!booha.x) resetBooha();
    rebuildOverlays();
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

  function updateFlames() {
    flameEls.forEach((el, index) => el.classList.toggle('off', index >= flames));
    const label = `Lantern light: ${flames} flame${flames === 1 ? '' : 's'}`;
    document.getElementById('flame-meter').setAttribute('aria-label', label);
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
    andon.setAttribute('aria-label', fraction < .22 ? 'Lantern light is nearly gone' : 'Lantern light is burning');
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
    currentIsAnomaly = Math.random() >= .5;
    currentAnomaly = currentIsAnomaly
      ? (Math.random() < pataskalaChance() ? pataskalaPose() : random(anomalies))
      : null;
    const tier = currentTier();
    falseAlertPoint = !currentIsAnomaly && Math.random() < tier.falseAlertChance
      ? { u: .12 + Math.random() * .76, v: .2 + Math.random() * .56, radius: .1 }
      : null;
  }

  function currentPoint([u, v]) { return [plate.x + u * plate.w, plate.y + v * plate.h]; }

  function drawAnomaly(anomaly) {
    if (!anomaly) return;
    const art = anomaly.character === 'pataskala' ? pataskalaArt[anomaly.id] : anomalyArt[anomaly.id];
    if (!art?.complete) return;
    const [u, v] = anomaly.target;
    const [x, y] = currentPoint([u, v]);
    const sourceWidth = art.naturalWidth || 512;
    const sourceHeight = art.naturalHeight || 512;
    const maxDimension = Math.max(32, plate.w * anomaly.artSize);
    const scale = maxDimension / Math.max(sourceWidth, sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    ctx.save();
    ctx.globalAlpha = anomaly.character === 'pataskala' ? .9 : .95;
    ctx.shadowColor = anomaly.character === 'pataskala' ? 'rgba(219,230,218,.18)' : 'rgba(232,183,108,.42)';
    ctx.shadowBlur = Math.max(5, maxDimension * .12);
    ctx.drawImage(art, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  function drawRoom(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020202'; ctx.fillRect(0, 0, width, height);
    if (state === 'caught' && failureStarted) {
      if (time - failureStarted >= FAILURE_SILENCE_MS) drawFailureBooha(time);
      return;
    }
    moveBooha();
    if (baseImage.complete) {
      // Keep the room plate readable, then let Booha's lantern reveal only a
      // small moving circle at full brightness.
      ctx.save();
      ctx.globalAlpha = state === 'caught' ? .07 : .16;
      ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
      drawAnomaly(currentAnomaly);
      ctx.restore();
      const radius = lightRadius();
      ctx.save();
      ctx.beginPath(); ctx.arc(booha.x, booha.y, radius, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = state === 'caught' ? .24 : 1;
      ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
      drawAnomaly(currentAnomaly);
      const light = ctx.createRadialGradient(booha.x, booha.y, radius * .48, booha.x, booha.y, radius);
      light.addColorStop(0, 'rgba(0,0,0,0)');
      light.addColorStop(1, 'rgba(0,0,0,.84)');
      ctx.fillStyle = light; ctx.fillRect(booha.x - radius, booha.y - radius, radius * 2, radius * 2);
      ctx.restore();
      if (vignetteCanvas) ctx.drawImage(vignetteCanvas, 0, 0, width, height);
      const darkness = (MAX_FLAMES - flames) * .06;
      if (darkness) { ctx.fillStyle = `rgba(0,0,0,${darkness})`; ctx.fillRect(0, 0, width, height); }
      drawShojiDawn();
    }
    if (scanlineCanvas) ctx.drawImage(scanlineCanvas, 0, 0, width, height);
    if (!REDUCED_MOTION && state !== 'title') {
      ctx.save(); ctx.globalAlpha = .035 + Math.sin(time / 260) * .012; ctx.fillStyle = '#fff'; ctx.fillRect(0, (time / 8) % height, width, 1); ctx.restore();
    }
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
    if (!idleBooha.complete) return;
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
    const radii = [0, .12, .18, .22, .26];
    return Math.min(width, height) * (radii[clamp(flames, 0, MAX_FLAMES)] || .12);
  }

  function moveBooha() {
    const ease = REDUCED_MOTION ? .28 : .12;
    booha.x += (booha.targetX - booha.x) * ease;
    booha.y += (booha.targetY - booha.y) * ease;
  }

  function drawBooha(time) {
    const image = isBoohaAlerting() ? alertBooha : idleBooha;
    if (!image.complete) return;
    const size = clamp(Math.min(width, height) * .1, 52, 92);
    const bob = REDUCED_MOTION ? 0 : Math.sin(time / 410) * 3;
    ctx.save();
    ctx.globalAlpha = .76;
    ctx.shadowColor = `rgba(229,176,89,${.24 + flames * .12})`;
    ctx.shadowBlur = 13 + flames * 3;
    ctx.drawImage(image, booha.x - size / 2, booha.y - size / 2 + bob, size, size);
    if (markLocked) {
      ctx.globalAlpha = .9;
      ctx.strokeStyle = '#e8b76c';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(booha.x, booha.y, size * .68, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function alertTarget() {
    if (currentIsAnomaly && currentAnomaly) return currentAnomaly.target;
    if (falseAlertPoint) return [falseAlertPoint.u, falseAlertPoint.v, falseAlertPoint.radius];
    return null;
  }

  function isBoohaAlerting() {
    const target = alertTarget();
    if (!target) return false;
    const [tx, ty] = currentPoint(target);
    const radius = Math.max(30, plate.w * target[2] * .72) * currentTier().alertMultiplier;
    return Math.hypot(booha.x - tx, booha.y - ty) <= radius;
  }

  function frame(time) { handleBurnout(time); updateAndon(time); drawRoom(time); animationFrame = requestAnimationFrame(frame); }
  function startLoop() { if (!animationFrame) animationFrame = requestAnimationFrame(frame); }
  function stopLoop() { if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; } }

  function showMessage(kicker, title, copy, buttonText, handler) {
    messageKicker.textContent = kicker; messageTitle.textContent = title; messageCopy.textContent = copy; messageButton.textContent = buttonText; messageButton.onclick = handler; messagePanel.classList.add('visible');
  }

  function hidePanels() { startPanel.classList.remove('visible'); messagePanel.classList.remove('visible'); }
  function clearMarkingUi() { clueCard.hidden = true; markLocked = false; markedPoint = null; markHoldOrigin = null; window.clearTimeout(markHoldTimer); markHoldTimer = 0; }
  function updateHud() { observationNote.textContent = state === 'playing' ? (markLocked ? 'MARK LOCKED / LEAVE WHEN READY' : 'DRAG BOOHA / HOLD TO MARK') : 'LOOK / LISTEN / REMEMBER'; updateFlames(); }

  function startRound() {
    state = 'playing'; burnoutHandled = false; failureStarted = 0; roundStarted = performance.now(); entryStarted = roundStarted; curtain.className = ''; controls.classList.remove('hidden'); clearMarkingUi(); resetBooha(); chooseRound(); updateHud(); updateAndon(); if (ambientGain && audioContext) ambientGain.gain.setTargetAtTime(audioEnabled ? .014 : 0, audioContext.currentTime, .12); if (bgmGain && audioContext) bgmGain.gain.setTargetAtTime(AUDIO_LEVELS.bgm, audioContext.currentTime, .18); scheduleTell(); ping(176 + round * 13, .028);
  }

  function enterRoom() {
    selectedTier = tierButtons.find(button => button.classList.contains('selected'))?.dataset.tier || 'patient';
    round = 0; progress = 0; flames = MAX_FLAMES; marks = 0; correctCalls = 0; caseStarted = performance.now(); hidePanels(); ensureAudio(); startRound();
  }

  function advanceCase() { progress = Math.min(CASE_ROUNDS, progress + 1); round += 1; if (progress >= CASE_ROUNDS) showComplete(); else startRound(); }

  function scheduleTell() {
    window.clearTimeout(droneTellTimer);
    const shouldTell = currentIsAnomaly || Boolean(falseAlertPoint);
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

  function handleLeave() {
    if (state !== 'playing') return;
    state = 'transition'; controls.classList.add('hidden');
    const [mx, my] = markedPoint || [0, 0];
    const [tx, ty] = currentAnomaly ? currentPoint(currentAnomaly.target) : [0, 0];
    const markRadius = markedPoint?.[2] || 0;
    const markedAnomaly = Boolean(markedPoint && currentAnomaly && Math.hypot(mx - tx, my - ty) <= markRadius);
    const correct = currentIsAnomaly ? markedAnomaly : !markedPoint;
    if (!correct) { wrongTone(); if (currentIsAnomaly) playSfx('anomaly', AUDIO_LEVELS.anomaly); curtain.className = 'active catch'; window.setTimeout(handleWrong, REDUCED_MOTION ? 80 : 260); return; }
    correctCalls += 1; rightTone();
    if (currentIsAnomaly) { marks += 1; if (flames < MAX_FLAMES) flames += 1; showClue(); updateFlames(); }
    window.setTimeout(advanceCase, currentIsAnomaly ? (REDUCED_MOTION ? 500 : 1450) : (REDUCED_MOTION ? 80 : 420));
  }

  function handleBurnout(time) {
    if (state !== 'playing' || burnoutHandled || time - roundStarted < currentTier().burnMs) return;
    burnoutHandled = true;
    window.clearTimeout(droneTellTimer);
    flames = Math.max(0, flames - 1);
    wrongTone();
    updateFlames(); updateAndon(time);
    if (flames > 0) {
      state = 'caught';
      observationNote.textContent = 'THE ANDON WENT DARK';
      showMessage('THE LANTERN DIMMED', 'MOVE FASTER.', 'The room outlasted the light. Start the search again before the next flame goes.', 'SEARCH AGAIN', () => { messagePanel.classList.remove('visible'); retryRound(); });
      return;
    }
    beginFailure('CASE FILE 07 / LIGHT LOST', 'THE ROOM KEPT YOU.', 'The lantern burned out before you could report the room. Bring the light back and try again.');
  }

  function handleWrong() {
    curtain.className = ''; flames = Math.max(0, flames - 1); progress = Math.max(0, progress - 1); clearMarkingUi(); updateFlames();
    if (flames > 0) { showMessage('THE ROOM GOT DARKER', 'TRY AGAIN.', 'The light is still here. Look once more, then choose.', 'LOOK AGAIN', () => { messagePanel.classList.remove('visible'); retryRound(); }); return; }
    beginFailure('CASE FILE 07 / LIGHT LOST', 'THE ROOM KEPT YOU.', 'The case is not closed. Bring the light back and try the room again.');
  }

  function restartCase() {
    messagePanel.classList.remove('visible'); round = 0; progress = 0; flames = MAX_FLAMES; marks = 0; correctCalls = 0; caseStarted = performance.now(); startRound();
  }

  function silenceDrone() {
    window.clearTimeout(droneTellTimer);
    if (!ambientGain || !audioContext) return;
    ambientGain.gain.cancelScheduledValues(audioContext.currentTime);
    ambientGain.gain.setValueAtTime(0, audioContext.currentTime);
  }

  function beginFailure(kicker, title, copy) {
    state = 'caught'; failureStarted = performance.now(); observationNote.textContent = 'THE LANTERN WENT OUT'; silenceDrone(); if (bgmGain && audioContext) bgmGain.gain.setTargetAtTime(.018, audioContext.currentTime, .08); updateAndon();
    window.setTimeout(() => { if (state === 'caught' && failureStarted) playSfx(Math.random() < .5 ? 'jump1' : 'jump2', AUDIO_LEVELS.jump); }, FAILURE_SILENCE_MS + 60);
    window.setTimeout(() => { if (state === 'caught' && failureStarted) showMessage(kicker, title, copy, 'RESTART THE CASE', restartCase); }, FAILURE_PANEL_DELAY_MS);
  }

  function retryRound() {
    state = 'playing';
    burnoutHandled = false;
    roundStarted = performance.now();
    entryStarted = roundStarted;
    curtain.className = '';
    controls.classList.remove('hidden');
    clearMarkingUi();
    resetBooha();
    chooseRound();
    updateHud();
    scheduleTell();
  }

  function setBoohaTarget(event) {
    if (state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const nextX = clamp(event.clientX - rect.left, 0, width);
    const nextY = clamp(event.clientY - rect.top, 0, height);
    const startsHold = !pointerActive || !markHoldOrigin;
    const movedBeyondDeadZone = markHoldOrigin
      && Math.hypot(nextX - markHoldOrigin[0], nextY - markHoldOrigin[1]) > MARK_DEAD_ZONE_PX;
    booha.targetX = nextX;
    booha.targetY = nextY;
    pointerActive = true;
    if (startsHold || (!markLocked && movedBeyondDeadZone)) {
      markHoldOrigin = [nextX, nextY];
      markLocked = false;
      markedPoint = null;
      window.clearTimeout(markHoldTimer);
      markHoldTimer = window.setTimeout(lockMark, MARK_HOLD_MS);
    }
    observationNote.textContent = 'HOLD BOOHA STILL';
  }

  function moveBoohaTarget(event) { if (pointerActive) setBoohaTarget(event); }
  function releaseBooha() { pointerActive = false; markHoldOrigin = null; if (!markLocked) window.clearTimeout(markHoldTimer); }

  function lockMark() {
    markHoldTimer = 0;
    if (state !== 'playing' || !pointerActive) return;
    markLocked = true;
    markedPoint = [booha.targetX, booha.targetY, lightRadius()];
    rightTone();
    observationNote.textContent = 'MARK LOCKED / LEAVE WHEN READY';
  }

  function showClue() { clueEn.textContent = currentAnomaly.en; clueJp.textContent = currentAnomaly.jp; clueCard.hidden = false; observationNote.textContent = 'MARK RETURNED TO THE LANTERN'; window.clearTimeout(clueTimer); clueTimer = window.setTimeout(() => { clueCard.hidden = true; }, 1300); }

  function submitResult() {
    document.dispatchEvent(new CustomEvent('booha:gameEnd', { detail: { saveId: SAVE_ID, score: marks, completed: true, time: performance.now() - caseStarted, recordEligible: true, recentRun: { marks, calls: correctCalls, tier: selectedTier } } }));
  }

  function showComplete() { state = 'complete'; controls.classList.add('hidden'); clearMarkingUi(); observationNote.textContent = 'EXIT FOUND'; completeTone(); submitResult(); showMessage('CASE FILE 07 / SEALED', 'THE ROOM LET GO.', 'You kept the light alive. Your notes are filed, and the door is where you left it.', 'RETURN TO THE PROFILE', exitGame); }

  function exitGame() {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin === window.location.origin && !referrer.pathname.endsWith('/family-room.html')) { window.history.back(); return; }
    } catch (_) {}
    window.location.href = 'adventure-profile.html';
  }

  function toggleSound() {
    audioEnabled = !audioEnabled; soundState.textContent = audioEnabled ? 'ON' : 'OFF'; soundToggle.setAttribute('aria-pressed', String(audioEnabled)); if (audioEnabled) ensureAudio(); if (audioMasterGain && audioContext) audioMasterGain.gain.setTargetAtTime(audioEnabled ? AUDIO_LEVELS.master : 0, audioContext.currentTime, .04); if (ambientGain && audioContext) ambientGain.gain.setTargetAtTime(audioEnabled ? .014 : 0, audioContext.currentTime, .12);
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
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function loadAudioBuffers() {
    if (!audioContext || audioLoadPromise || typeof window.fetch !== 'function') return audioLoadPromise;
    audioLoadPromise = Promise.all(Object.entries(FAMILY_AUDIO).map(async ([name, url]) => {
      const response = await window.fetch(url);
      if (!response.ok) throw new Error(`Family Room audio failed: ${name}`);
      audioBuffers[name] = await audioContext.decodeAudioData(await response.arrayBuffer());
    })).then(() => { if (audioEnabled && state === 'playing') startBgm(); }).catch(() => { audioLoadPromise = null; });
    return audioLoadPromise;
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
  document.getElementById('leave-button').addEventListener('click', handleLeave);
  canvas.addEventListener('pointerdown', setBoohaTarget);
  canvas.addEventListener('pointermove', moveBoohaTarget);
  canvas.addEventListener('pointerup', releaseBooha);
  canvas.addEventListener('pointercancel', releaseBooha);
  soundToggle.addEventListener('click', toggleSound);
  tierButtons.forEach(button => button.addEventListener('click', () => { if (button.disabled) return; selectedTier = button.dataset.tier; updateTierButtons(); }));
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopLoop(); else { startLoop(); if (audioContext?.state === 'suspended' && audioEnabled) audioContext.resume(); } });
  window.addEventListener('keydown', event => { if (event.key === 'Enter' && state === 'title') enterRoom(); if ((event.key === 'Enter' || event.key === ' ') && state === 'playing') handleLeave(); });

  resize(); updateFlames(); updateAndon(); updateTierButtons(); startLoop();
})();
