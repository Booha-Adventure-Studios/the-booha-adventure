#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'family-room.js'), 'utf8');
const markup = fs.readFileSync(path.join(root, 'family-room.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'family-room.css'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'js/core/game-registry.js'), 'utf8');
assert(source.includes('const FAMILY_CHANGE_TYPES = Object.freeze') && ['ADD', 'REMOVE', 'MOVE', 'TURN', 'SWAP', 'COUNT', 'STATE', 'WRONG'].every(type => source.includes(`'${type}'`)), 'Pass 1 must lock the shared Family Room change vocabulary');
assert(source.includes('const FAMILY_HOUSE_CASES = Object.freeze') && /number: 1, id: 'genkan'/.test(source) && /number: 2, id: 'chanoma'/.test(source) && /number: 8, id: 'nando'/.test(source), 'Pass 1 must lock the house case order');
assert(source.includes("const DEFAULT_CASE_ID = 'genkan'") && source.includes('const BUILT_CASE_IDS = Object.freeze') && source.includes('let ACTIVE_CASE_ID = DEFAULT_CASE_ID') && source.includes('ACTIVE_CASE_LABEL'), 'Genkan must be the mandatory first case in the built route');
assert(source.includes("state = 'study'") && source.includes('function beginCaseFromStudy') && source.includes("if (state === 'study')"), 'Pass 2 must separate manual study from timed dark gameplay');
assert(markup.includes('id="study-panel"') && markup.includes('START THE CASE') && markup.includes('No timer. Start when ready.'), 'the study panel must explain its unlimited manual phase');
assert(source.includes('repeatOnCaseRestart: false') && source.includes('reviewFromHub: true'), 'study review and restart behavior must be explicit in the design lock');
assert(source.includes("role: 'threat'") && source.includes('scoredTarget: false') && source.includes('markableTarget: false') && !source.includes("targetId: 'pataskala'"), 'Pataskala must remain a non-scored, non-markable threat');
assert(markup.includes('CASE FILE 01 / GENKAN') && markup.includes('route-note') && !markup.includes('id="case-picker"'), 'the entry panel must start at Genkan without exposing a room picker');
assert(source.includes('function enterNextCase') && source.includes('buildNextCaseCopy') && source.includes('nextCaseId = BUILT_CASE_IDS.find'), 'completed rooms must route to the next authored room');
assert(registry.includes("status: 'CASE FILE 01 / OPEN'") && registry.includes("statusCompleted: 'CASE FILE 01 / SEALED'"), 'the registered Family Room status must use the mandatory entry case');
assert(!source.includes('round-number'), 'the case must not expose a round counter');
assert(!source.includes('localStorage'), 'the room must use the shared save/event layer');
assert(!source.includes('creature-1'), 'the photoreal creature beat must be retired');
assert(source.includes('saveId: SAVE_ID'), 'the room must submit a registered save id');
assert(!source.includes('MAX_FLAMES') && !source.includes('flames'), 'Pass 3 must remove flame lives from the room state');
assert(source.includes('function restartCase()') && source.includes('round = 0; progress = 0;'), 'a mistake must restart the whole case from round one');
assert(!source.includes("['pb:vocab', 'pb:sentence', 'pb:question']"), 'tier gates must not be hard-coded to Pre-Boo');
assert(source.includes("const curriculums = ['pb', 'br', 'bc'];") && source.includes('`${curriculum}:${type}`'), 'tier gates must read Blitz stamps across all curricula');
assert(!source.includes("state = 'marking'"), 'marking must be part of observation, not a separate phase');
assert(!source.includes('beginMarking') && !source.includes('mark-skip'), 'the old marking detour must be retired');
assert(source.includes('MARK_HOLD_MS = 600') && source.includes('lockMark'), 'marking must require a hold before it locks');
assert(source.includes('lightRadius') && source.includes('moveBooha'), 'Booha movement must drive the lantern reveal');
assert(source.includes('alertMultiplier: 2') && source.includes('alertMultiplier: 1.2') && source.includes('alertMultiplier: 1'), 'alert distance must scale with the room tier');
assert(source.includes('realTellChance: 1') && source.includes('realTellChance: .55') && source.includes('realTellChance: .3'), 'each tier must tune whether the presence tell is available');
assert(source.includes('falseAlertChance: .25') && source.includes('falseAlertPoint') && source.includes('const shouldTell = tellAvailable'), 'the Lies tier must support uncertain and false proximity alerts');
assert(source.includes('function isBoohaAlerting()') && source.includes('currentPoint(target)'), 'Booha alerting must be proximity-based');
assert(!source.includes('time - roundStarted > 2100'), 'the alert sprite must not be a timed giveaway');
assert(source.includes('burnMs: 35000') && source.includes('burnMs: 18000') && source.includes('burnMs: 12000'), 'each room tier must have its own lantern burn window');
assert(source.includes('function handleBurnout(time)') && source.includes('beginFailure(UI_COPY.caseReset)'), 'burnout must restart the case instead of consuming a life');
assert(source.includes('function handleWrong()') && source.includes('beginFailure(UI_COPY.caseReset)'), 'a wrong report must restart the case instead of consuming a life');
assert(source.includes('function updateAndon') && source.includes('burnFraction'), 'the lantern clock must use a dimming andon, not a number');
assert(markup.includes('id="andon"') && markup.includes("BOOHA'S LIGHT") && markup.includes('class="andon andon-primary"') && !markup.includes('flame-meter'), 'Booha\'s light must be the primary light readout');
assert(!source.includes('function drawShojiDawn') && source.includes('const CASE_PHASES'), 'the room must avoid the opaque shoji rectangle and use explicit pacing phases');
assert(source.includes('const inheritedAlpha = ctx.globalAlpha') && source.includes('inheritedAlpha * (anomaly.character'), 'anomaly opacity must preserve the ambient shadow pass');
assert(source.includes('width = viewportWidth') && source.includes('height = viewportHeight') && source.includes("canvas.style.margin = '0'"), 'the room canvas must fill the viewport while the complete portrait room is contained inside it');
assert(source.includes('const scale = Math.min(width / iw, height / ih)') && !source.includes('const scale = Math.max(width / iw, height / ih)'), 'the room plate must use contain scaling rather than cover cropping');
assert(source.includes('MOBILE_GAMEPLAY_ZOOM') && source.includes('function updateRoomCamera') && source.includes('ctx.translate(roomCamera.x, roomCamera.y)'), 'mobile gameplay must use a closer camera that follows Booha without changing room coordinates');
assert(source.includes('const nextX = rawX - roomCamera.x') && source.includes('const nextY = rawY - roomCamera.y'), 'mobile pointer input must map the screen back into the room coordinate system');
assert(markup.includes('Booha carries a closer view as you travel'), 'the study panel must explain the mobile close-view travel behavior');
assert(source.includes('markHoldStartedAt') && source.includes('heldMs / MARK_HOLD_MS'), 'the hold-to-mark gesture must show visible progress');
assert(source.includes('FAILURE_SILENCE_MS = 1200') && source.includes('function beginFailure'), 'lantern failure must include a silent beat before the panel');
assert(source.includes('function silenceDrone') && source.includes('setValueAtTime(0'), 'the failure beat must stop the drone immediately');
assert(source.includes('function drawFailureBooha') && source.includes('function drawFailureStatic') && !source.includes('drawFailureThreat(time)') && source.includes('if (time - failureStarted >= FAILURE_SILENCE_MS)'), 'the caught beat must use TV static and let Booha glow alone after the silence');
assert(source.includes('anomalyArt = Object.fromEntries') && source.includes('const overlayAssetUrl = anomaly =>') && source.includes('image.src = overlayAssetUrl(anomaly)') && source.includes('function loadActiveCaseContent'), 'anomalies must load authored overlays for the selected room case');
assert(source.includes('artSize') && source.includes('ctx.drawImage(art'), 'anomaly rendering must use real art instead of procedural doodles');
assert(['bowl', 'cup', 'eyes', 'shadow', 'talisman', 'lantern', 'futon', 'seams', 'teapot', 'crescent'].every(id => serviceWorker.includes(`/assets/family-room/overlays/${id}.webp`)), 'all authored anomaly overlays must be precached');
assert(source.includes('const caseAssets = [caseContent.base') && source.includes('...caseContent.anomalies.map'), 'Genkan master and overlays must be cached on room entry instead of inflating the install-time core cache');
assert(['shoes_extra', 'umbrella_floor', 'door_shadow', 'coat_turn', 'threshold_talisman', 'wet_footprints'].every(id => source.includes(id)), 'Genkan must define a complete authored anomaly set');
const genkanOverlayFiles = ['genkan_shoes_extra', 'genkan_umbrella_floor', 'genkan_door_shadow', 'genkan_coat_turn', 'genkan_threshold_talisman', 'genkan_wet_footprints'];
assert(genkanOverlayFiles.every(id => fs.existsSync(path.join(root, 'assets/family-room/overlays', `${id}.webp`))), 'all Genkan anomaly overlay files must exist');
assert(genkanOverlayFiles.every(id => source.includes(`assetId: '${id}'`)), 'each Genkan anomaly must map to its authored overlay filename');
assert(source.includes('const PATASKALA_POSES = [') && source.includes("character: 'pataskala'"), 'Pataskala must have a named character threat set');
assert(source.includes('assets/family-room/pataskala/${pose.id}.webp') && ['pataskala_far', 'pataskala_enter', 'pataskala_approach', 'pataskala_near', 'pataskala_catch'].every(id => fs.existsSync(path.join(root, `assets/family-room/pataskala/${id}.webp`))), 'the smallest Pataskala production set must load as authored transparent assets');
assert(source.includes('function pataskalaChance') && source.includes('phase.pataskalaBaseChance') && source.includes('pataskalaCooldownRounds'), 'Pataskala must emerge progressively with a cooldown between threats');
assert(source.includes('PATASKALA_POSES[PATASKALA_POSES.length - 1]') && source.includes('pataskala_catch'), 'the catch pose must be reserved for the failure beat');
assert(source.includes('MARK_DEAD_ZONE_PX = 8') && source.includes('markHoldOrigin'), 'touch marking must tolerate small pointer tremor');
assert(source.includes('plate.w * anomaly.artSize') && source.includes('plate.w * target[2]'), 'anomaly sizing and alert radii must follow the room plate');
assert(source.includes('function drawAnomalies(list)') && source.includes('drawAnomalies(currentAnomalies)') && source.includes('drawPataskalaThreat()') && source.includes("light.addColorStop(1, 'rgba(0,0,0,.84)')"), 'multiple changes and the active Pataskala threat must be faintly visible outside the lantern and the light rim must blend into the room');
assert(source.includes('pendingMark = { x: booha.targetX, y: booha.targetY, radius: lightRadius() }') && source.includes('markedPoints.some') && source.includes('mark.radius'), 'marking must judge whether the anomaly is inside the lantern at lock time');
assert(source.includes('Math.min(width, height) * .1') && source.includes('52, 92'), 'Booha must leave more of the lantern reveal unobstructed');
assert(source.includes('const minimum = REDUCED_MOTION ? .065 : .05') && source.includes('.26 - minimum'), 'the lantern radius must shrink continuously with a playable minimum');
assert(source.includes('maxChanges: 1') && source.includes('maxChanges: 2') && source.includes('twoChangeChance: .24') && source.includes('twoChangeChance: .52'), 'room tiers must define when two-change rounds can appear');
assert(source.includes('let currentAnomalies = []') && source.includes('function reportIsCorrect') && source.includes('requiredTargets.every'), 'reports must validate every required change and reject missing or extra marks');
assert(source.includes('anchorId, region: anchor.region') && source.includes("anomaly.region || 'unknown'"), 'generated anomalies must retain direct anchor metadata for repeat avoidance and debugging');
assert(source.includes('currentPresence = currentAudioOnly ? null') && source.includes('Boolean(falseAlertPoint)') && source.includes('reportTargets()'), 'Pataskala must remain separate from scored room changes');
assert(source.includes('WRONG_MARK_GRACE_MS = 700') && source.includes('function startWrongMarkHazard') && source.includes('function updateWrongMarkHazard'), 'a wrong confirmed mark must create a readable hazard state');
assert(source.includes('function boohaAtExit') && source.includes("RUN TO THE EXIT") && source.includes('beginFailure(UI_COPY.caseReset)'), 'the wrong-mark hazard must be escapable at the exit and fatal on contact');
assert(source.includes("playSfx('anomaly', Math.min(.48, AUDIO_LEVELS.anomaly + .1))") && source.includes('rgba(255,82,62,.92)'), 'wrong marks must have distinct red visual and audio feedback');
assert(source.includes('const AUDIO_ONLY_CHANGE = Object.freeze') && source.includes('audioOnlyChance: .08') && source.includes('audioOnlyChance: .16'), 'audio-only anomalies must be explicit and tier-weighted');
assert(source.includes('currentAudioOnly = !hasChange') && source.includes('if (currentAudioOnly) return markedPoints.length === 0') && source.includes('AUDIO_ONLY_CHANGE.en'), 'an audio-only anomaly must be reportable without a location mark and teach its sentence after a correct report');
assert(source.includes('function schedulePataskalaThreat') && source.includes('function beginPataskalaThreat') && source.includes('function updatePataskalaThreat') && source.includes("playSfx('move', AUDIO_LEVELS.move)"), 'Pataskala must approach Booha within a timed, authored threat window');
assert(!source.includes("targetId: 'pataskala'") && source.includes('pataskala_far') && source.includes('target: [.7, .29, .22]'), 'Pataskala must use the staged authored art set without entering the report target registry');
assert(source.includes('discoveryUntil') && source.includes('pataskalaThreat.alerted') && !source.includes('PATA_SURVIVAL_MS'), 'Pataskala must allow discovery before pursuit and must not auto-safe on a survival timer');
assert(source.includes('if (boohaAtExit())') && source.includes('currentPresence = null') && source.includes('handleLeave()'), 'reaching the room exit must end only the active threat and resume the same investigation');
assert(source.includes('wrongMarkHazard || pataskalaThreat') && source.includes('leaveButton.disabled = !visible || Boolean(pataskalaThreat)'), 'active Pataskala must disable reporting while leaving movement available');
assert(source.includes('ensureAudio(); startBgm();') && source.includes('window.clearTimeout(pataskalaMoveTimer)'), 'BGM must start after the study handoff and Pataskala timers must be cleared on round cleanup');
const anchorUs = [...source.matchAll(/target:\s*\[\s*(0?\.\d+)/g)].map(match => Number(match[1]));
assert(anchorUs.length === 21 && anchorUs.every(value => value >= .22 && value <= .78), 'all environmental and Pataskala anchors must stay inside the portrait-safe band');
assert(source.includes('function roomContains') && source.includes('clamp(booha.targetX + dx * step, plate.x, plate.x + plate.w)'), 'Booha movement must be contained by the displayed room plate');
const portraitEntries = [...source.matchAll(/id:\s*'([^']+)',\s*(?:assetId:\s*'[^']+',\s*)?target:\s*\[\s*(0?\.\d+),\s*(0?\.\d+),[^\]]+\], artSize:\s*(0?\.\d+)/g)];
const portraitSourceRatios = {
  bowl: [512 / 512, 342 / 512], cup: [512 / 512, 468 / 512], eyes: [512 / 512, 256 / 512],
  shadow: [512 / 512, 768 / 512], talisman: [512 / 512, 768 / 512], lantern: [512 / 512, 342 / 512],
  futon: [512 / 512, 342 / 512], seams: [512 / 512, 171 / 512], teapot: [512 / 512, 342 / 512], crescent: [512 / 512, 468 / 512],
  shoes_extra: [600 / 600, 400 / 600], umbrella_floor: [720 / 720, 660 / 720], door_shadow: [420 / 420, 700 / 420],
  coat_turn: [460 / 460, 760 / 460], threshold_talisman: [460 / 460, 450 / 460], wet_footprints: [500 / 500, 650 / 500],
  pataskala_far: [512 / 768, 768 / 768], pataskala_enter: [512 / 768, 768 / 768],
  pataskala_approach: [512 / 768, 768 / 768], pataskala_near: [512 / 768, 768 / 768], pataskala_catch: [512 / 768, 768 / 768],
};
assert(portraitEntries.length === 21, 'portrait regression must cover every anomaly and Pataskala pose in both built cases');
const containedViewports = [[1920, 1080], [1366, 768], [1280, 800], [1366, 1024], [1024, 1366], [844, 390], [390, 844]];
const roomAnchors = [...source.matchAll(/u:\s*(0?\.\d+),\s*v:\s*(0?\.\d+)/g)].map(([, u, v]) => [Number(u), Number(v)]);
containedViewports.forEach(([viewportWidth, viewportHeight]) => {
  const scale = Math.min(viewportWidth / 1024, viewportHeight / 1536);
  const containedPlate = { w: 1024 * scale, h: 1536 * scale, x: (viewportWidth - 1024 * scale) / 2, y: (viewportHeight - 1536 * scale) / 2 };
  const tolerance = .001;
  assert(containedPlate.x >= -tolerance && containedPlate.y >= -tolerance, `contained plate must start inside ${viewportWidth}x${viewportHeight}`);
  assert(containedPlate.x + containedPlate.w <= viewportWidth + tolerance && containedPlate.y + containedPlate.h <= viewportHeight + tolerance, `contained plate must fit inside ${viewportWidth}x${viewportHeight}`);
  assert(Math.abs(containedPlate.w / containedPlate.h - 1024 / 1536) < tolerance, `contained plate must preserve aspect ratio at ${viewportWidth}x${viewportHeight}`);
  roomAnchors.forEach(([u, v]) => {
    const x = containedPlate.x + u * containedPlate.w;
    const y = containedPlate.y + v * containedPlate.h;
    assert(x >= containedPlate.x - tolerance && x <= containedPlate.x + containedPlate.w + tolerance && y >= containedPlate.y - tolerance && y <= containedPlate.y + containedPlate.h + tolerance, `room anchor must be visible at ${viewportWidth}x${viewportHeight}`);
  });
  portraitEntries.filter(([, id]) => id !== 'pataskala_catch').forEach(([, id, uText, vText, sizeText]) => {
    const [sourceWidthRatio, sourceHeightRatio] = portraitSourceRatios[id];
    const maxDimension = containedPlate.w * Number(sizeText);
    const drawWidth = maxDimension * sourceWidthRatio;
    const drawHeight = maxDimension * sourceHeightRatio;
    const x = containedPlate.x + Number(uText) * containedPlate.w;
    const y = containedPlate.y + Number(vText) * containedPlate.h;
    assert(x - drawWidth / 2 >= containedPlate.x - tolerance && x + drawWidth / 2 <= containedPlate.x + containedPlate.w + tolerance && y - drawHeight / 2 >= containedPlate.y - tolerance && y + drawHeight / 2 <= containedPlate.y + containedPlate.h + tolerance, `${id} sprite bounds must remain inside the room at ${viewportWidth}x${viewportHeight}`);
  });
});
assert(source.includes('const FAMILY_AUDIO = Object.freeze') && source.includes('family_BGM.mp3') && source.includes('family_jump-2.mp3'), 'the Family Room audio set must be declared');
assert(source.includes('const FAMILY_SFX_NAMES') && source.includes('function loadAudioBuffer') && source.includes('function loadAudioBuffers') && source.includes('function startBgm') && source.includes('function playSfx'), 'Family Room audio must use the shared WebAudio lifecycle');
assert(source.includes('sfxLoadPromise') && source.includes('bgmLoadPromise') && source.includes('Promise.allSettled'), 'small Family Room cues must load independently of the long BGM');
assert(source.includes('AUDIO_LEVELS = Object.freeze') && source.includes('master: .72'), 'Family Room audio must use a capped master volume');
assert(source.includes("playSfx('move', AUDIO_LEVELS.move)") && source.includes("playSfx('anomaly', AUDIO_LEVELS.anomaly)"), 'movement and anomaly cues must be connected to gameplay');
assert(source.includes('jumpLevel: .24') && source.includes('jumpLevel: .4') && source.includes('jumpLevel: .58') && source.includes('playSfx(Math.random() < .5 ? \'jump1\' : \'jump2\', jumpLevel)'), 'failure must choose one of the two jump-scare screams at the room tier volume');
assert(serviceWorker.includes("`${BASE}/assets/`"), 'Family Room audio must use the runtime asset cache path');
assert(source.includes('const FAMILY_DEFERRED_ASSETS') && source.includes('PATASKALA_POSES.map'), 'the Pataskala production set must remain deferred until room entry');
assert(source.includes('function requestFamilyRuntimeCache') && source.includes("type: 'CACHE_URLS'"), 'Family Room must ask the service worker to retain deferred media after entry');
assert(source.includes('function recordFamilyRoomCompletion') && source.includes('completedCases[ACTIVE_CASE_ID]') && source.includes('lastResult'), 'Pass 8 must record a score-free weekly case seal in the shared save layer');
assert(!serviceWorker.includes('/assets/family-room/audio/family_BGM.mp3'), 'the long Family Room BGM must not enter the install-time core cache');
assert(markup.includes('id="leave-button"') && markup.includes('REPORT THE ROOM') && markup.includes('id="undo-button"') && source.includes('function handleLeave'), 'the room must use one explicit report button with mark undo support');
assert(markup.includes('id="mark-confirm-panel"') && markup.includes('YES, MARK IT') && markup.includes('NO, KEEP LOOKING') && source.includes('function confirmMark') && source.includes('function cancelMark'), 'marking must require a clear bilingual confirmation before it is recorded');
assert(!markup.includes('id="mark-button"') && !markup.includes('MARK THIS SPOT') && !source.includes('function attemptMark') && source.includes('function boohaInteractionRadius'), 'marking must require a continuous hold on Booha instead of a separate mark button');
assert(markup.includes('id="start-button"') && markup.includes('ENTER THE ROOM') && markup.includes('へやに はいる'), 'the start action must clearly say enter the room in both languages');
assert(markup.includes('id="back-button"') && markup.includes('BACK TO PROFILE'), 'back must be reserved for leaving the game');
assert(!markup.includes('id="observation-note"') && source.includes('function cancelPendingMarkHold') && source.includes('options.start === true'), 'the transient top-center observation banner must be removed and hold marking must begin only on pointer-down');
assert(markup.includes('id="fly-away-button"') && markup.includes('FLY AWAY') && source.includes('function flyAwayToSafeRoom') && source.includes("flyAwayButton?.addEventListener('click', flyAwayToSafeRoom)"), 'the room must always offer a safe-room escape');
assert(markup.includes('id="flashlight-button"') && markup.includes('USE FLASHLIGHT CHARGE') && source.includes('let flashlightCharges = 0'), 'Pataskala counterplay must have a visible flashlight-charge action');
assert(source.includes('function useFlashlightCharge') && source.includes('flashlightCharges -= 1') && source.includes('currentPresence = null'), 'a flashlight charge must consume one inventory item and clear only the active threat');
assert(source.includes('chargesRemaining: pataskalaChargeRequirement()') && source.includes('PATASKALA_RECOIL_DISTANCE') && source.includes('function drawFlashlightBurst'), 'Pataskala must support multi-hit recoil and a visible flashlight burst');
assert(markup.includes('each burst pushes Pataskala back'), 'the charge action must explain that each burst is one hit');
assert(markup.includes('message-title-en') && markup.includes('message-title-jp') && markup.includes('message-button-en') && markup.includes('message-button-jp'), 'message panels must render bilingual pairs');
assert(source.includes('function setBilingual') && source.includes('function setObservation') && source.includes('function setReportLabel'), 'dynamic room states must update both language lines together');
assert(source.includes('function moveBoohaByKeyboard') && source.includes('arrowup') && source.includes('function startKeyboardMark') && source.includes('function releaseKeyboardMark'), 'keyboard play must support movement and hold-to-mark');
assert(source.includes('function startKeyboardMark') && source.includes('スペースを じっと おす'), 'keyboard hold marking must remain bilingual in the runtime');
assert(markup.includes("<span>DON'T BLINK.</span>") && !markup.includes('class="case-title"'), 'the entry panel must show only the bilingual Don\'t Blink title');
assert(markup.includes('id="fly-away-button"') && source.includes('#6eb6ff') && source.includes('rgba(105,182,255'), 'the canvas marking glow must use the blue palette');
assert(source.includes('function shiftGameplayClocks') && source.includes('roundStarted += delta') && source.includes('failureStarted += delta'), 'hidden time must be removed from active gameplay clocks');
assert(source.includes('function pauseForVisibility') && source.includes('function resumeFromVisibility') && source.includes("window.addEventListener('pagehide'"), 'visibility and BFCache lifecycle must pause and resume the room');
assert(source.includes('roomCoordinates(booha.x, booha.y, oldPlate)') && source.includes('roomPointFromCoordinates(normalized.position)') && source.includes("setObservation('SCREEN CHANGED / MARK AGAIN'"), 'resize must preserve Booha position in plate coordinates and invalidate stale marks');
assert(source.includes('function imageReady(image)') && source.includes('image.naturalWidth > 0 && image.naturalHeight > 0'), 'canvas image draws must require a successful natural image size');
assert(source.includes('function clearRoundTimers') && source.includes('window.clearTimeout(clueTimer); clueTimer = 0;'), 'round cleanup must own clue, transition, failure, and tell timers');
assert(source.includes('clueVersion') && source.includes('if (version !== clueVersion) return'), 'an old clue timeout must not hide a later clue');
assert(source.includes('const WRONG_MARK_TELEGRAPH_MS = 1500') && source.includes('telegraphUntil'), 'wrong marks must telegraph before the hazard becomes active');
const hazardStart = source.slice(source.indexOf('function startWrongMarkHazard'), source.indexOf('function confirmMark'));
assert(!hazardStart.includes('setControlsVisible(false)'), 'wrong-mark hazards must keep movement controls visible');
assert(source.includes('const CLUE_DISPLAY_MS = 7600') && source.includes('function enqueueClue') && source.includes('clueQueue'), 'clue notifications must remain readable and queue instead of overwriting one another');
assert(source.includes('const PATASKALA_SIZE_MULTIPLIER = 2.5') && source.includes('PATA_SPEED_FAR = .075') && source.includes('PATA_SPEED_NEAR = .14') && source.includes('showPriorityClue'), 'Pataskala must be enlarged, warned, and slowed enough to make the exit reachable');
assert(markup.includes('id="clue-close"') && source.includes('function closeClueCard') && source.includes('function continueFromClue') && source.includes('clueCloseButton?.addEventListener(\'click\', continueFromClue)'), 'case notes must advance cleanly instead of leaving the transition frozen');
const safeRoomSource = source.slice(source.indexOf('function flyAwayToSafeRoom'), source.indexOf('function continueFromClue'));
assert(safeRoomSource.includes("state = 'playing';") && safeRoomSource.includes('currentPresence = null;') && !safeRoomSource.includes('showPanel(studyPanel)'), 'Fly Away must return to safe play without reopening the entry popup');
assert(styles.includes('.study-panel h2 > .jp') && styles.includes('white-space: nowrap'), 'the Study heading Japanese title must stay on one readable line');
assert(source.includes("id: 'cup'", source.indexOf('const anomalies')) && source.includes('artSize: .075') && source.includes("id: 'futon'") && source.includes('artSize: .2'), 'the cup and futon art bounds must use their corrected room scale');
assert(source.includes('const reportClueDelay = currentAnomalies.length || currentAudioOnly ? CLUE_DISPLAY_MS + PANEL_FADE_MS : 0'), 'a successful report must leave its clue visible before the next round begins');
assert(source.includes('function releasePointerInteraction') && source.includes('hidePanel(markConfirmPanel)'), 'opening or cancelling a mark confirmation must release pointer capture and finish panel cleanup');
assert(source.includes('canvas.setPointerCapture?.') && source.includes('canvas.releasePointerCapture?.'), 'pointer capture must survive touch movement and release on cancellation');
assert(source.includes('Promise.allSettled(FAMILY_SFX_NAMES.map') && source.includes("console.warn('[Family Room] BGM unavailable')"), 'one failed audio asset must not reject or restart the successful audio loads');
assert(source.includes('function scheduleResize') && !source.includes('resize(); updateFlames(); updateAndon(); updateTierButtons(); startLoop();'), 'title state must not start a continuous RAF loop');

function classList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach(item => values.add(item)),
    remove: (...items) => items.forEach(item => values.delete(item)),
    toggle: (item, force) => force === undefined ? (values.has(item) ? values.delete(item) : values.add(item)) : (force ? values.add(item) : values.delete(item)),
    contains: item => values.has(item),
  };
}

function element(id) {
  return {
    id, hidden: false, dataset: {}, classList: classList(), attributes: {}, style: {}, textContent: '', onclick: null,
    addEventListener(type, handler) { this[`on${type}`] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() {},
  };
}

const ids = ['room-canvas', 'controls', 'start-panel', 'study-panel', 'study-title', 'study-start-button', 'study-back-button', 'message-panel', 'message-kicker', 'message-title', 'message-copy', 'message-button', 'message-kicker-en', 'message-kicker-jp', 'message-title-en', 'message-title-jp', 'message-copy-en', 'message-copy-jp', 'message-button-en', 'message-button-jp', 'transition-curtain', 'observation-note', 'observation-en', 'observation-jp', 'andon', 'clue-card', 'clue-close', 'clue-en', 'clue-jp', 'sound-toggle', 'sound-state', 'sound-state-jp', 'start-button', 'back-button', 'fly-away-button', 'leave-button', 'leave-en', 'leave-jp', 'undo-button', 'mark-confirm-panel', 'mark-confirm-title-en', 'mark-confirm-title-jp', 'mark-confirm-object-en', 'mark-confirm-object-jp', 'mark-yes-button', 'mark-no-button'];
const nodes = Object.fromEntries(ids.map(id => [id, element(id)]));
nodes['andon'].style.setProperty = (name, value) => { nodes['andon'].style[name] = value; };
const listeners = {};
nodes['room-canvas'].getContext = () => ({
  setTransform() {}, clearRect() {}, fillRect() {}, drawImage() {}, save() {}, restore() {},
  createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }),
  beginPath() {}, ellipse() {}, fill() {}, arc() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, translate() {},
  fillText() {}, scale() {}, clip() {},
});
nodes['room-canvas'].getBoundingClientRect = () => ({ left: 0, top: 0 });
function canvasElement() {
  return { width: 0, height: 0, getContext: nodes['room-canvas'].getContext };
}

const events = [];
const deterministicMath = Object.create(Math);
deterministicMath.random = () => 0.2;
const document = {
  readyState: 'complete',
  getElementById: id => nodes[id],
  createElement: tag => tag === 'canvas' ? canvasElement() : element(tag),
  querySelectorAll: () => [],
  addEventListener(type, handler) { listeners[type] = handler; },
  dispatchEvent(event) { if (event.type === 'booha:gameEnd') events.push(event.detail); },
};
let now = 0;
const context = {
  console: { warn() {}, error() {} }, document,
  window: {
    innerWidth: 1024, innerHeight: 1536, devicePixelRatio: 1,
    location: { origin: 'https://example.test', href: 'https://example.test/family-room.html' },
    matchMedia: () => ({ matches: false }),
    addEventListener(type, handler) { listeners[`window:${type}`] = handler; },
    setTimeout: fn => { fn(); return 1; }, clearTimeout() {}, history: { back() {} },
  },
  performance: { now: () => (now += 100) },
  Image: function Image() { this.complete = true; this.naturalWidth = 1024; this.naturalHeight = 1536; },
  CustomEvent: function CustomEvent(type, init) { return { type, ...(init || {}) }; },
  requestAnimationFrame: () => 1, cancelAnimationFrame() {}, Math: deterministicMath,
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'family-room.js' });

nodes['start-button'].onclick();
assert.strictEqual(nodes['study-panel'].hidden, false, 'entering the room must open the manual study phase');
nodes['study-start-button'].onclick();
for (let index = 0; index < 11; index += 1) {
  nodes['leave-button'].onclick();
}

assert.strictEqual(events.length, 1, 'a complete case must emit one game-end event');
assert.strictEqual(events[0].saveId, 'bonus:family_room');
assert.strictEqual(events[0].completed, true);
assert.strictEqual(events[0].score, 0, 'the submitted score must be marked changes, not elapsed time');
console.log('Family Room state-machine audit passed: hidden progression, lantern recovery, marking, and gameEnd contract work.');
