(() => {
  'use strict';

  const rooms = [
    { file: 'living_01.png', normal: true,  note: 'NO CHANGE DETECTED' },
    { file: 'living_02.png', normal: false, note: 'THE TEA SET IS WRONG' },
    { file: 'living_03.png', normal: false, note: 'SOMETHING HAS MOVED' },
    { file: 'living_04.png', normal: false, ghoul: true, note: 'EYES IN THE DARK' },
    { file: 'living_05.png', normal: false, ghoul: true, note: 'IT HAS COME CLOSER' },
    { file: 'living_06.png', normal: false, ghoul: true, note: 'DO NOT LOOK RIGHT' },
    { file: 'living_07.png', normal: false, ghoul: true, note: 'IT IS WAITING' },
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
  const roundNumber = document.getElementById('round-number');
  const observationNote = document.getElementById('observation-note');
  const soundToggle = document.getElementById('sound-toggle');
  const soundState = document.getElementById('sound-state');

  const loadedRooms = rooms.map(room => {
    const image = new Image();
    image.src = `assets/family-room/${room.file}`;
    return { ...room, image };
  });
  const ghoulImage = new Image();
  ghoulImage.src = 'assets/family-room/creature-1.png';
  const boohaImage = new Image();
  boohaImage.src = 'assets/family-room/booha_ghost.png';

  let width = 0;
  let height = 0;
  let dpr = 1;
  let state = 'title';
  let roomIndex = 0;
  let entryStarted = performance.now();
  let transitionStarted = 0;
  let transitionDirection = 'straight';
  let best = Number(localStorage.getItem('family_room_best') || 0);
  let audioEnabled = true;
  let audioContext = null;
  let ambientGain = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function easeOut(value) { return 1 - Math.pow(1 - clamp(value, 0, 1), 3); }
  function currentRoom() { return loadedRooms[roomIndex]; }

  function drawRoom(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, width, height);

    const room = currentRoom();
    if (room && room.image.complete) {
      const imageRatio = room.image.naturalWidth / room.image.naturalHeight;
      const maxHeight = Math.max(height * 1.08, 440);
      const plateHeight = Math.min(maxHeight, width / imageRatio * 1.15);
      const plateWidth = plateHeight * imageRatio;
      const x = (width - plateWidth) / 2;
      const y = (height - plateHeight) / 2 + 12;

      ctx.save();
      ctx.globalAlpha = state === 'caught' ? .3 : 1;
      ctx.drawImage(room.image, x, y, plateWidth, plateHeight);
      ctx.restore();

      // A second shadow pass keeps the scene readable only where the eye should search.
      const shadow = ctx.createRadialGradient(width / 2, height * .52, plateWidth * .12, width / 2, height * .52, Math.max(width, height) * .65);
      shadow.addColorStop(0, 'rgba(0,0,0,.03)');
      shadow.addColorStop(.36, 'rgba(0,0,0,.2)');
      shadow.addColorStop(.72, 'rgba(0,0,0,.64)');
      shadow.addColorStop(1, 'rgba(0,0,0,.96)');
      ctx.fillStyle = shadow;
      ctx.fillRect(0, 0, width, height);

      const sideShade = ctx.createLinearGradient(0, 0, width, 0);
      sideShade.addColorStop(0, 'rgba(0,0,0,.72)');
      sideShade.addColorStop(.22, 'rgba(0,0,0,0)');
      sideShade.addColorStop(.78, 'rgba(0,0,0,0)');
      sideShade.addColorStop(1, 'rgba(0,0,0,.72)');
      ctx.fillStyle = sideShade;
      ctx.fillRect(0, 0, width, height);
    }

    drawScanlines(time);
    if (state !== 'caught') drawBooha(time);
    if (state === 'caught') drawGhoul(time);
    if (state === 'transition') drawTransition(time);
  }

  function drawScanlines(time) {
    ctx.save();
    ctx.globalAlpha = .08;
    ctx.fillStyle = '#e8b76c';
    for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
    ctx.globalAlpha = .05 + Math.sin(time / 260) * .015;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, (time / 7) % height, width, 1);
    ctx.restore();
  }

  function drawBooha(time) {
    if (!boohaImage.complete) return;
    const progress = easeOut((time - entryStarted) / 1050);
    const size = clamp(Math.min(width, height) * .13, 70, 125);
    const x = width / 2 - size / 2;
    const y = height + size * .18 - progress * size * .82 + Math.sin(time / 410) * 3;
    ctx.save();
    ctx.globalAlpha = .78;
    ctx.shadowColor = 'rgba(229,176,89,.6)';
    ctx.shadowBlur = 20;
    ctx.drawImage(boohaImage, x, y, size, size);
    ctx.restore();
  }

  function drawGhoul(time) {
    if (!ghoulImage.complete) return;
    const pulse = 1 + Math.sin(time / 40) * .02;
    const size = Math.max(width * .52, height * .72) * pulse;
    const x = width / 2 - size / 2;
    const y = height / 2 - size * .52;
    ctx.save();
    ctx.globalAlpha = .86;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(ghoulImage, x, y, size * (2 / 3), size);
    ctx.restore();
  }

  function drawTransition(time) {
    const elapsed = time - transitionStarted;
    const progress = clamp(elapsed / 580, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * .2;
    ctx.translate(transitionDirection === 'back' ? -progress * width * .04 : progress * width * .04, 0);
    ctx.fillStyle = '#f0c783';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function frame(time) {
    drawRoom(time);
    requestAnimationFrame(frame);
  }

  function showMessage(kicker, title, copy, buttonText, handler) {
    messageKicker.textContent = kicker;
    messageTitle.textContent = title;
    messageCopy.textContent = copy;
    messageButton.textContent = buttonText;
    messageButton.onclick = handler;
    messagePanel.classList.add('visible');
  }

  function hidePanels() {
    startPanel.classList.remove('visible');
    messagePanel.classList.remove('visible');
  }

  function updateHud() {
    roundNumber.textContent = String(roomIndex + 1).padStart(2, '0');
    observationNote.textContent = state === 'playing' ? currentRoom().note : 'OBSERVE THE ROOM';
  }

  function enterRoom() {
    roomIndex = 0;
    state = 'playing';
    entryStarted = performance.now();
    hidePanels();
    controls.classList.remove('hidden');
    updateHud();
    ensureAudio();
    ping(220, .05);
  }

  function prepareNextRoom() {
    state = 'playing';
    entryStarted = performance.now();
    transitionStarted = 0;
    controls.classList.remove('hidden');
    curtain.className = '';
    updateHud();
    ping(180 + roomIndex * 16, .035);
  }

  function handleChoice(choice) {
    if (state !== 'playing') return;
    state = 'transition';
    transitionDirection = choice;
    transitionStarted = performance.now();
    controls.classList.add('hidden');
    const room = currentRoom();
    const choseStraight = choice === 'straight';
    const correct = (room.normal && choseStraight) || (!room.normal && !choseStraight);
    const caught = room.ghoul && choseStraight;
    if (caught || !correct) {
      wrongTone();
      curtain.className = 'active catch';
      window.setTimeout(showCaught, 650);
      return;
    }
    rightTone();
    window.setTimeout(() => {
      roomIndex += 1;
      if (roomIndex > best) {
        best = roomIndex;
        localStorage.setItem('family_room_best', String(best));
      }
      if (roomIndex >= rooms.length) showComplete();
      else prepareNextRoom();
    }, 650);
  }

  function showCaught() {
    state = 'caught';
    observationNote.textContent = 'SIGNAL LOST';
    curtain.className = '';
    messagePanel.classList.remove('visible');
    window.setTimeout(() => {
      showMessage('THE ROOM SAW YOU', 'YOU WERE SEEN.', 'The loop has broken open. This is the hard exit back to Utsuroba.', 'RETURN TO UTSUROBA', () => { window.location.href = 'utsuroba.html'; });
    }, 1100);
  }

  function showComplete() {
    state = 'complete';
    roomIndex = rooms.length - 1;
    controls.classList.add('hidden');
    updateHud();
    observationNote.textContent = 'EXIT FOUND';
    completeTone();
    showMessage('SEVEN ROOMS / ONE WAY OUT', 'LOOP BROKEN.', 'You noticed every change. The family room has released you.', 'RETURN TO UTSUROBA', () => { window.location.href = 'utsuroba.html'; });
  }

  function toggleSound() {
    audioEnabled = !audioEnabled;
    soundState.textContent = audioEnabled ? 'ON' : 'OFF';
    soundToggle.setAttribute('aria-pressed', String(audioEnabled));
    if (audioEnabled) ensureAudio();
    if (ambientGain) ambientGain.gain.setTargetAtTime(audioEnabled ? .018 : 0, audioContext.currentTime, .12);
  }

  function ensureAudio() {
    if (!audioEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext) {
      audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      ambientGain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 42;
      ambientGain.gain.value = .018;
      oscillator.connect(ambientGain).connect(audioContext.destination);
      oscillator.start();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
  }

  function tone(frequency, duration, volume, type = 'sine') {
    if (!audioEnabled || !audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  function ping(frequency, volume) { tone(frequency, .16, volume); }
  function rightTone() { tone(330, .2, .05); window.setTimeout(() => tone(495, .22, .04), 75); }
  function wrongTone() { tone(66, .8, .09, 'sawtooth'); window.setTimeout(() => tone(43, .75, .06, 'square'), 90); }
  function completeTone() { [330, 440, 660].forEach((frequency, index) => window.setTimeout(() => tone(frequency, .34, .045), index * 110)); }

  document.getElementById('start-button').addEventListener('click', enterRoom);
  document.getElementById('straight-button').addEventListener('click', () => handleChoice('straight'));
  document.getElementById('back-button').addEventListener('click', () => handleChoice('back'));
  soundToggle.addEventListener('click', toggleSound);
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', event => {
    if (event.key === 'Enter' && state === 'title') enterRoom();
    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') handleChoice('straight');
    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') handleChoice('back');
  });

  resize();
  updateHud();
  requestAnimationFrame(frame);
})();
