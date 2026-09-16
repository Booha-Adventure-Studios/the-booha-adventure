(() => {
  'use strict';

  const SAVE_ID = 'bonus:family_room';
  const CASE_ROUNDS = 7;
  const MARK_HOLD_MS = 600;
  const MAX_FLAMES = 3;
  const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const TIER_RULES = Object.freeze({
    patient: { label: 'THE ROOM IS PATIENT', alertMultiplier: 2, falseAlertChance: 0, burnMs: 25000 },
    quicker: { label: 'THE ROOM IS QUICKER', alertMultiplier: 1.2, falseAlertChance: 0, burnMs: 18000 },
    lies: { label: 'THE ROOM LIES TO YOU', alertMultiplier: 1, falseAlertChance: .15, burnMs: 12000 },
  });

  const anomalies = [
    { id: 'bowl', target: [.79, .51, .09], en: "The bowl wasn't there before.", jp: 'おわんが なかった。', kind: 'added' },
    { id: 'cup', target: [.35, .49, .1], en: 'There is one cup too many.', jp: 'コップが ひとつ おおい。', kind: 'duplicated' },
    { id: 'eyes', target: [.75, .25, .12], en: 'Something is watching from the shoji.', jp: 'しょうじから だれかが みている。', kind: 'watching' },
    { id: 'shadow', target: [.7, .23, .18], en: 'The shadow behind the shoji moved.', jp: 'しょうじの かげが うごいた。', kind: 'state' },
    { id: 'talisman', target: [.17, .23, .12], en: 'A paper charm was not there before.', jp: 'おふだが なかった。', kind: 'added' },
    { id: 'lantern', target: [.17, .42, .12], en: 'The lantern flame is looking the wrong way.', jp: 'あんどんの ほのおが ちがう。', kind: 'state' },
    { id: 'futon', target: [.82, .37, .16], en: 'The futon is facing the room.', jp: 'ふとんが へやを むいている。', kind: 'moved' },
    { id: 'seams', target: [.55, .68, .16], en: 'One tatami seam has disappeared.', jp: 'たたみの めが ひとつ きえた。', kind: 'missing' },
    { id: 'teapot', target: [.27, .49, .12], en: 'The teapot has turned toward you.', jp: 'きゅうすが こちらを むいた。', kind: 'moved' },
    { id: 'crescent', target: [.84, .30, .1], en: 'A small moon is inside the room.', jp: 'へやの なかに つきが ある。', kind: 'added' },
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
  let ambientGain = null;
  let ambientOscillator = null;
  let droneTellTimer = 0;
  let clueTimer = 0;
  let booha = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let pointerActive = false;
  let markHoldTimer = 0;
  let markLocked = false;
  let markedPoint = null;
  let burnoutHandled = false;

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

  function chooseRound() {
    currentIsAnomaly = Math.random() >= .5;
    currentAnomaly = currentIsAnomaly ? random(anomalies) : null;
    const tier = currentTier();
    falseAlertPoint = !currentIsAnomaly && Math.random() < tier.falseAlertChance
      ? { u: .12 + Math.random() * .76, v: .2 + Math.random() * .56, radius: .1 }
      : null;
  }

  function currentPoint([u, v]) { return [plate.x + u * plate.w, plate.y + v * plate.h]; }

  function drawAnomaly(anomaly) {
    if (!anomaly) return;
    const [u, v] = anomaly.target;
    const [x, y] = currentPoint([u, v]);
    const s = Math.max(12, Math.min(width, height) * .032);
    ctx.save();
    ctx.lineWidth = Math.max(1.4, s * .08);
    ctx.shadowColor = 'rgba(232,183,108,.55)';
    ctx.shadowBlur = s * .75;
    if (anomaly.kind === 'watching') {
      ctx.fillStyle = '#f3d79a';
      ctx.beginPath(); ctx.ellipse(x - s * .65, y, s * .31, s * .21, -.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + s * .65, y, s * .31, s * .21, .12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#21180e';
      ctx.beginPath(); ctx.arc(x - s * .65, y, s * .1, 0, Math.PI * 2); ctx.arc(x + s * .65, y, s * .1, 0, Math.PI * 2); ctx.fill();
    } else if (anomaly.kind === 'crescent') {
      ctx.fillStyle = '#e8b76c';
      ctx.beginPath(); ctx.arc(x, y, s * .65, .3, Math.PI * 1.7); ctx.arc(x + s * .25, y - s * .18, s * .58, Math.PI * .92, Math.PI * 1.95, true); ctx.fill();
    } else if (anomaly.kind === 'bowl') {
      ctx.fillStyle = '#d9c7a5';
      ctx.beginPath(); ctx.ellipse(x, y, s * 1.35, s * .55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#75634b'; ctx.beginPath(); ctx.ellipse(x, y - s * .06, s * .92, s * .25, 0, 0, Math.PI * 2); ctx.fill();
    } else if (anomaly.kind === 'talisman') {
      ctx.fillStyle = '#d7b46c'; ctx.fillRect(x - s * .45, y - s * .8, s * .9, s * 1.6);
      ctx.fillStyle = '#6b2720'; ctx.font = `${Math.max(9, s * .45)}px serif`; ctx.textAlign = 'center'; ctx.fillText('し', x, y + s * .17);
    } else if (anomaly.kind === 'cup' || anomaly.kind === 'teapot') {
      ctx.fillStyle = anomaly.kind === 'teapot' ? '#20201b' : '#b8a78d';
      ctx.beginPath(); ctx.ellipse(x, y, s * 1.05, s * .72, anomaly.kind === 'teapot' ? -.35 : 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8b76c';
      ctx.beginPath(); ctx.arc(x + s * .9, y, s * .38, -.9, .9); ctx.stroke();
    } else if (anomaly.kind === 'lantern') {
      ctx.fillStyle = 'rgba(235,170,69,.65)'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x + s * .75, y, x, y + s); ctx.quadraticCurveTo(x - s * .75, y, x, y - s); ctx.fill();
    } else if (anomaly.kind === 'futon') {
      ctx.strokeStyle = '#d2c1a0'; ctx.beginPath(); ctx.moveTo(x - s * 1.25, y + s * .6); ctx.lineTo(x + s * 1.25, y - s * .6); ctx.stroke();
    } else if (anomaly.kind === 'seams') {
      ctx.strokeStyle = 'rgba(20,22,20,.85)'; ctx.lineWidth = s * .32; ctx.beginPath(); ctx.moveTo(x - s * 2, y); ctx.lineTo(x + s * 2, y); ctx.stroke();
    } else if (anomaly.kind === 'shadow') {
      ctx.fillStyle = 'rgba(12,17,20,.8)'; ctx.beginPath(); ctx.ellipse(x, y, s * 2.2, s * 2.8, -.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawRoom(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020202'; ctx.fillRect(0, 0, width, height);
    moveBooha();
    if (baseImage.complete) {
      // Keep the room plate readable, then let Booha's lantern reveal only a
      // small moving circle at full brightness.
      ctx.save();
      ctx.globalAlpha = state === 'caught' ? .07 : .16;
      ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
      ctx.restore();
      const radius = lightRadius();
      ctx.save();
      ctx.beginPath(); ctx.arc(booha.x, booha.y, radius, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = state === 'caught' ? .24 : 1;
      ctx.drawImage(baseImage, plate.x, plate.y, plate.w, plate.h);
      drawAnomaly(currentAnomaly);
      const light = ctx.createRadialGradient(booha.x, booha.y, radius * .48, booha.x, booha.y, radius);
      light.addColorStop(0, 'rgba(0,0,0,0)');
      light.addColorStop(1, 'rgba(0,0,0,.72)');
      ctx.fillStyle = light; ctx.fillRect(booha.x - radius, booha.y - radius, radius * 2, radius * 2);
      ctx.restore();
      if (vignetteCanvas) ctx.drawImage(vignetteCanvas, 0, 0, width, height);
      const darkness = (MAX_FLAMES - flames) * .06;
      if (darkness) { ctx.fillStyle = `rgba(0,0,0,${darkness})`; ctx.fillRect(0, 0, width, height); }
    }
    if (scanlineCanvas) ctx.drawImage(scanlineCanvas, 0, 0, width, height);
    if (!REDUCED_MOTION && state !== 'title') {
      ctx.save(); ctx.globalAlpha = .035 + Math.sin(time / 260) * .012; ctx.fillStyle = '#fff'; ctx.fillRect(0, (time / 8) % height, width, 1); ctx.restore();
    }
    if (state !== 'caught') drawBooha(time);
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
    const size = clamp(Math.min(width, height) * .13, 66, 116);
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
    const radius = Math.max(30, Math.min(width, height) * target[2] * .72) * currentTier().alertMultiplier;
    return Math.hypot(booha.x - tx, booha.y - ty) <= radius;
  }

  function frame(time) { handleBurnout(time); updateAndon(time); drawRoom(time); animationFrame = requestAnimationFrame(frame); }
  function startLoop() { if (!animationFrame) animationFrame = requestAnimationFrame(frame); }
  function stopLoop() { if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; } }

  function showMessage(kicker, title, copy, buttonText, handler) {
    messageKicker.textContent = kicker; messageTitle.textContent = title; messageCopy.textContent = copy; messageButton.textContent = buttonText; messageButton.onclick = handler; messagePanel.classList.add('visible');
  }

  function hidePanels() { startPanel.classList.remove('visible'); messagePanel.classList.remove('visible'); }
  function clearMarkingUi() { clueCard.hidden = true; markLocked = false; markedPoint = null; window.clearTimeout(markHoldTimer); markHoldTimer = 0; }
  function updateHud() { observationNote.textContent = state === 'playing' ? (markLocked ? 'MARK LOCKED / LEAVE WHEN READY' : 'DRAG BOOHA / HOLD TO MARK') : 'LOOK / LISTEN / REMEMBER'; updateFlames(); }

  function startRound() {
    state = 'playing'; burnoutHandled = false; roundStarted = performance.now(); entryStarted = roundStarted; curtain.className = ''; controls.classList.remove('hidden'); clearMarkingUi(); resetBooha(); chooseRound(); updateHud(); updateAndon(); scheduleTell(); ping(176 + round * 13, .028);
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
    droneTellTimer = window.setTimeout(() => { if (state === 'playing') tellPresence(); }, 900 + Math.random() * 500);
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
    const radius = currentAnomaly ? Math.max(30, Math.min(width, height) * currentAnomaly.target[2] * .72) : 0;
    const markedAnomaly = Boolean(markedPoint && currentAnomaly && Math.hypot(mx - tx, my - ty) <= radius);
    const correct = currentIsAnomaly ? markedAnomaly : !markedPoint;
    if (!correct) { wrongTone(); curtain.className = 'active catch'; window.setTimeout(handleWrong, REDUCED_MOTION ? 80 : 260); return; }
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
    state = 'caught';
    observationNote.textContent = 'THE LANTERN WENT OUT';
    showMessage('CASE FILE 07 / LIGHT LOST', 'THE ROOM KEPT YOU.', 'The lantern burned out before you could report the room. Bring the light back and try again.', 'RESTART THE CASE', () => { messagePanel.classList.remove('visible'); round = 0; progress = 0; flames = MAX_FLAMES; marks = 0; correctCalls = 0; caseStarted = performance.now(); startRound(); });
  }

  function handleWrong() {
    curtain.className = ''; flames = Math.max(0, flames - 1); progress = Math.max(0, progress - 1); clearMarkingUi(); updateFlames();
    if (flames > 0) { showMessage('THE ROOM GOT DARKER', 'TRY AGAIN.', 'The light is still here. Look once more, then choose.', 'LOOK AGAIN', () => { messagePanel.classList.remove('visible'); retryRound(); }); return; }
    state = 'caught'; observationNote.textContent = 'THE LANTERN WENT OUT';
    showMessage('CASE FILE 07 / LIGHT LOST', 'THE ROOM KEPT YOU.', 'The case is not closed. Bring the light back and try the room again.', 'RESTART THE CASE', () => { messagePanel.classList.remove('visible'); round = 0; progress = 0; flames = MAX_FLAMES; marks = 0; correctCalls = 0; caseStarted = performance.now(); startRound(); });
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
    booha.targetX = clamp(event.clientX - rect.left, 0, width);
    booha.targetY = clamp(event.clientY - rect.top, 0, height);
    pointerActive = true;
    markLocked = false;
    markedPoint = null;
    window.clearTimeout(markHoldTimer);
    markHoldTimer = window.setTimeout(lockMark, MARK_HOLD_MS);
    observationNote.textContent = 'HOLD BOOHA STILL';
  }

  function moveBoohaTarget(event) { if (pointerActive) setBoohaTarget(event); }
  function releaseBooha() { pointerActive = false; if (!markLocked) window.clearTimeout(markHoldTimer); }

  function lockMark() {
    markHoldTimer = 0;
    if (state !== 'playing' || !pointerActive) return;
    markLocked = true;
    markedPoint = [booha.targetX, booha.targetY];
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
    audioEnabled = !audioEnabled; soundState.textContent = audioEnabled ? 'ON' : 'OFF'; soundToggle.setAttribute('aria-pressed', String(audioEnabled)); if (audioEnabled) ensureAudio(); if (ambientGain && audioContext) ambientGain.gain.setTargetAtTime(audioEnabled ? .014 : 0, audioContext.currentTime, .12);
  }

  function ensureAudio() {
    if (!audioEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext; if (!AudioContextClass) return;
    if (!audioContext) { audioContext = new AudioContextClass(); ambientOscillator = audioContext.createOscillator(); ambientGain = audioContext.createGain(); ambientOscillator.type = 'sine'; ambientOscillator.frequency.value = 42; ambientGain.gain.value = .014; ambientOscillator.connect(ambientGain).connect(audioContext.destination); ambientOscillator.start(); }
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function tone(frequency, duration, volume, type = 'sine') {
    if (!audioEnabled || !audioContext) return;
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
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
