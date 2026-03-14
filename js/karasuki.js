
(() => {
  const DATA = window.KARASUKI_DATA;
  if (!DATA || !DATA.rooms) { console.error("KARASUKI_DATA not found."); return; }

  /* ── constants ── */
  const WORLD_W        = 960;
  const WORLD_H        = 540;
  const GHOST_R        = 22;          // draw radius (half-size) of ghost PNG
  const GHOST_RADIUS   = 16;          // collision radius
  const SPEED          = 1.8;
  const FADE_MS        = 600;
  const CLICK_STOP_DIST= 6;
  const HOVER_AMP      = 5;           // px bob
  const HOVER_PERIOD   = 2200;        // ms full bob cycle
  const TRAIL_MAX      = 80;

  /* ── month color ramps — matches maze.html exactly ── */
  const MONTH_COLORS = [
    ['#ff3bbd','#ff79d7'],['#ff6b3b','#ffaa5e'],['#3bc8ff','#a8edff'],
    ['#3bff8a','#b2ffda'],['#ffd700','#fff176'],['#3b6fff','#90aaff'],
    ['#a03bff','#d49aff'],['#ff9f3b','#ffd08a'],['#3bffee','#a8fff8'],
    ['#c8ff3b','#e8ffaa'],['#ff3b6f','#ff85a1'],['#ff3bbd','#ff79d7'],
  ];

  /* Pick a color pair from the room number so each room has a distinct hue */
  function roomColorPair(roomId) {
    const n = parseInt((roomId || "room_01").replace(/\D/g, ""), 10) || 1;
    return MONTH_COLORS[(n - 1) % MONTH_COLORS.length];
  }

  /* ── state ── */
  const state = {
    roomId        : DATA.startRoom,
    spawnId       : "default",
    x             : 480,
    y             : 270,
    transitioning : false,
    clickTarget   : null,
    moving        : false,
    showCoords    : false,
    musicStarted  : false,
    lastTrailT    : 0
  };

  /* ── assets ── */
  const ghostImg = new Image();
  ghostImg.src   = "assets/img/booha_ghost.png";

  const music    = new Audio("assets/audio/karasuki-music.mp3");
  music.loop     = true;
  music.volume   = 0.65;

  /* ── particle list ── */
  let trail   = [];
  let ripples = [];

  /* ── DOM refs ── */
  let app, stage, canvas, ctx, roomLayer, coordDisplay, coordToggle;
  let currentBg;
  const cssW = WORLD_W, cssH = WORLD_H;

  /* ═══════════════════════════════════
     STYLES
  ═══════════════════════════════════ */
  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = `
      html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
      body{display:grid;place-items:center;}
      #karasuki-app{position:relative;width:100vw;height:100vh;overflow:hidden;background:#000;}
      #karasuki-stage{
        position:absolute;left:50%;top:50%;
        width:${WORLD_W}px;height:${WORLD_H}px;
        transform-origin:50% 50%;overflow:hidden;cursor:crosshair;
      }
      #karasuki-room-layer{position:absolute;inset:0;}
      .karasuki-bg{
        position:absolute;inset:0;width:100%;height:100%;
        object-fit:fill;display:block;pointer-events:none;user-select:none;
      }
      #kara-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #kara-fade{
        position:absolute;inset:0;background:#000;
        opacity:0;pointer-events:none;z-index:20;
      }
      #coord-display{
        position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,.72);color:#ff8ae2;
        font:700 13px/1 monospace;padding:5px 12px;border-radius:20px;
        z-index:30;pointer-events:none;letter-spacing:.06em;
        opacity:0;transition:opacity .2s;white-space:nowrap;
      }
      #coord-display.show{opacity:1;}
      #coord-toggle{
        position:fixed;bottom:18px;right:18px;z-index:100;
        display:flex;align-items:center;gap:8px;
        background:rgba(0,0,0,.75);color:#ff8ae2;font:700 11px/1 monospace;
        padding:7px 12px;border-radius:20px;cursor:pointer;
        border:1px solid rgba(255,138,226,.35);user-select:none;letter-spacing:.05em;
      }
      .toggle-pill{
        width:30px;height:16px;border-radius:8px;
        background:rgba(255,138,226,.2);position:relative;transition:background .2s;
      }
      .toggle-pill::after{
        content:"";position:absolute;top:3px;left:3px;
        width:10px;height:10px;border-radius:50%;
        background:#ff8ae2;transition:transform .2s;
      }
      #coord-toggle.active .toggle-pill{background:rgba(255,138,226,.55);}
      #coord-toggle.active .toggle-pill::after{transform:translateX(14px);}
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════
     DOM
  ═══════════════════════════════════ */
  function buildApp() {
    app       = document.createElement("div");  app.id = "karasuki-app";
    stage     = document.createElement("div");  stage.id = "karasuki-stage";
    roomLayer = document.createElement("div");  roomLayer.id = "karasuki-room-layer";
    canvas    = document.createElement("canvas"); canvas.id = "kara-canvas";

    const fade = document.createElement("div"); fade.id = "kara-fade";

    coordDisplay = document.createElement("div");
    coordDisplay.id = "coord-display";
    coordDisplay.textContent = "0, 0";

    stage.appendChild(roomLayer);
    stage.appendChild(canvas);
    stage.appendChild(fade);
    stage.appendChild(coordDisplay);
    app.appendChild(stage);

    coordToggle = document.createElement("div");
    coordToggle.id = "coord-toggle";
    coordToggle.innerHTML = `<span>COORDS</span><div class="toggle-pill"></div>`;
    coordToggle.addEventListener("click", () => {
      state.showCoords = !state.showCoords;
      coordToggle.classList.toggle("active", state.showCoords);
      coordDisplay.classList.toggle("show", state.showCoords);
    });

    document.body.innerHTML = "";
    document.body.appendChild(app);
    document.body.appendChild(coordToggle);

    ctx = canvas.getContext("2d");
  }

  /* ═══════════════════════════════════
     CANVAS SIZE
  ═══════════════════════════════════ */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width  = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ═══════════════════════════════════
     STAGE FIT
  ═══════════════════════════════════ */
  function fitStage() {
    const scale = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /* ═══════════════════════════════════
     ROOM HELPERS
  ═══════════════════════════════════ */
  function getRoom()  { return DATA.rooms[state.roomId]; }

  function getSpawn(room, spawnId) {
    return room.spawns?.[spawnId] || room.spawns?.default || { x: 480, y: 270 };
  }

  function placeGhost(x, y) {
    state.x = x; state.y = y;
    if (state.showCoords) coordDisplay.textContent = `${Math.round(x)}, ${Math.round(y)}`;
  }

  function makeBg(src) {
    const img = document.createElement("img");
    img.className = "karasuki-bg";
    img.src = src;
    return img;
  }

  function renderInitialRoom() {
    const room  = getRoom();
    currentBg   = makeBg(room.bg);
    roomLayer.appendChild(currentBg);
    const spawn = getSpawn(room, state.spawnId);
    placeGhost(spawn.x, spawn.y);
  }

  /* ═══════════════════════════════════
     COLLISION
  ═══════════════════════════════════ */
  function clampToWorld(nx, ny) {
    return {
      x: Math.max(GHOST_RADIUS, Math.min(WORLD_W - GHOST_RADIUS, nx)),
      y: Math.max(GHOST_RADIUS, Math.min(WORLD_H - GHOST_RADIUS, ny))
    };
  }

  function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  function canMoveTo(nx, ny) {
    const rects = getRoom()?.collisions || [];
    if (!rects.length) return true;
    for (const r of rects) { if (pointInRect(nx, ny, r)) return true; }
    return false;
  }

  function tryMove(nx, ny) {
    const c  = clampToWorld(nx, ny);
    if (canMoveTo(c.x, c.y))             { placeGhost(c.x, c.y); return true; }
    const tx = clampToWorld(nx, state.y);
    if (canMoveTo(tx.x, tx.y))           { placeGhost(tx.x, tx.y); return true; }
    const ty = clampToWorld(state.x, ny);
    if (canMoveTo(ty.x, ty.y))           { placeGhost(ty.x, ty.y); return true; }
    return false;
  }

  /* ═══════════════════════════════════
     SPOOKY FADE TRANSITION
  ═══════════════════════════════════ */
  function transitionTo(exit) {
    if (!exit?.to || state.transitioning) return;
    const nextRoom = DATA.rooms[exit.to];
    if (!nextRoom) return;

    state.transitioning = true;
    state.clickTarget   = null;

    const fadeEl = document.getElementById("kara-fade");
    fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-in`;
    fadeEl.style.opacity    = "1";

    setTimeout(() => {
      const nextBg = makeBg(nextRoom.bg);
      roomLayer.innerHTML = "";
      roomLayer.appendChild(nextBg);
      currentBg = nextBg;

      state.roomId  = exit.to;
      state.spawnId = exit.spawn || "default";

      const spawn = getSpawn(nextRoom, state.spawnId);
      placeGhost(spawn.x, spawn.y);
      trail = [];   // clear trail on room change

      fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-out`;
      fadeEl.style.opacity    = "0";

      setTimeout(() => { state.transitioning = false; }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  function getExitAtEdge() {
    const exits = getRoom()?.exits || {};
    if (state.x <= GHOST_RADIUS + 2           && exits.left)  return exits.left;
    if (state.x >= WORLD_W - GHOST_RADIUS - 2 && exits.right) return exits.right;
    if (state.y <= GHOST_RADIUS + 2           && exits.up)    return exits.up;
    if (state.y >= WORLD_H - GHOST_RADIUS - 2 && exits.down)  return exits.down;
    return null;
  }

  /* ═══════════════════════════════════
     TRAIL PARTICLES
  ═══════════════════════════════════ */
  function addTrailParticle(x, y, now) {
    if (now - state.lastTrailT < 45) return;
    state.lastTrailT = now;
    const [col1, col2] = roomColorPair(state.roomId);
    trail.push({
      x    : x + (Math.random() - 0.5) * 10,
      y    : y + GHOST_R * 0.55 + (Math.random() - 0.5) * 8,
      vx   : (Math.random() - 0.5) * 0.4,
      vy   : -Math.random() * 0.5,
      life : 1,
      size : 2 + Math.random() * 4.5,
      color: Math.random() > 0.5 ? col1 : col2
    });
    if (trail.length > TRAIL_MAX) trail.shift();
  }

  /* ═══════════════════════════════════
     DRAW
  ═══════════════════════════════════ */
  function drawFrame(now) {
    ctx.clearRect(0, 0, cssW, cssH);
    const sec = now / 1000;
    const [col1, col2] = roomColorPair(state.roomId);

    /* ── ripples (click feedback) ── */
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.life -= 0.038;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      const radius = (1 - rp.life) * 40 + 5;
      ctx.save();
      ctx.globalAlpha  = rp.life * 0.75;
      ctx.strokeStyle  = "rgba(255,138,226,.95)";
      ctx.lineWidth    = 1.5;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* ── sparkle trail ── */
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
      gr.addColorStop(0, p.color);
      gr.addColorStop(1, "transparent");
      ctx.globalAlpha = p.life * 0.48;
      ctx.fillStyle   = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.life * 0.90;
      ctx.fillStyle   = "#fff";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3,  0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      p.life -= 0.022; p.x += p.vx; p.y += p.vy;
    }
    trail = trail.filter(p => p.life > 0);

    /* ── ghost ── */
    const bobFreq  = (Math.PI * 2) / (HOVER_PERIOD / 1000);
    const bob      = Math.sin(sec * bobFreq) * HOVER_AMP;
    const wobble   = Math.sin(sec * bobFreq * 2) * 1.5;   // gentle tilt
    const gx = state.x;
    const gy = state.y + bob;
    const pulse = 0.5 + 0.5 * Math.sin(sec * 2.1);

    /* colored glow halo */
    ctx.save();
    ctx.globalAlpha = 0.22 + pulse * 0.12;
    const halo = ctx.createRadialGradient(gx, gy + 3, 0, gx, gy + 3, GHOST_R * 2.2);
    halo.addColorStop(0, col1);
    halo.addColorStop(0.5, col2);
    halo.addColorStop(1, "transparent");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(gx, gy + 3, GHOST_R * 2.2, 0, Math.PI * 2); ctx.fill();

    /* soft drop shadow */
    ctx.globalAlpha = 0.18 + pulse * 0.07;
    const shd = ctx.createRadialGradient(gx, gy + GHOST_R * 0.85, 0, gx, gy + GHOST_R * 0.85, GHOST_R * 0.9);
    shd.addColorStop(0, "rgba(0,0,0,.65)");
    shd.addColorStop(1, "transparent");
    ctx.fillStyle = shd;
    ctx.beginPath(); ctx.arc(gx, gy + GHOST_R * 0.85, GHOST_R * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    /* PNG ghost — rotate by wobble, bob handled by gy offset */
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(wobble * Math.PI / 180);
    if (ghostImg.complete && ghostImg.naturalWidth > 0) {
      ctx.drawImage(ghostImg, -GHOST_R, -GHOST_R, GHOST_R * 2, GHOST_R * 2);
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 0, GHOST_R * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* ═══════════════════════════════════
     MOVEMENT
  ═══════════════════════════════════ */
  function handleClickMovement(now) {
    if (!state.clickTarget) { state.moving = false; return; }
    const tx = state.clickTarget.x, ty = state.clickTarget.y;
    const dx = tx - state.x,        dy = ty - state.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= CLICK_STOP_DIST) {
      state.clickTarget = null; state.moving = false; return;
    }

    const moved = tryMove(state.x + (dx / dist) * SPEED, state.y + (dy / dist) * SPEED);
    state.moving = moved;
    if (!moved)  { state.clickTarget = null; state.moving = false; }
    else          addTrailParticle(state.x, state.y, now);
  }

  /* ═══════════════════════════════════
     MAIN LOOP
  ═══════════════════════════════════ */
  function tick(now) {
    if (!state.transitioning) {
      handleClickMovement(now);
      const exit = getExitAtEdge();
      if (exit) transitionTo(exit);
    }
    drawFrame(now);
    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════
     MUSIC — unlocked on first interaction
  ═══════════════════════════════════ */
  function startMusic() {
    if (state.musicStarted) return;
    state.musicStarted = true;
    music.play().catch(() => {});
  }

  /* ═══════════════════════════════════
     INPUT
  ═══════════════════════════════════ */
  function stagePointToWorld(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width)  * WORLD_W;
    const y = ((clientY - rect.top)  / rect.height) * WORLD_H;
    return clampToWorld(x, y);
  }

  function bindInput() {
    /* click */
    stage.addEventListener("click", (e) => {
      startMusic();
      if (state.transitioning) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
    });

    /* touch */
    stage.addEventListener("touchend", (e) => {
      startMusic();
      if (state.transitioning || !e.changedTouches.length) return;
      const t0 = e.changedTouches[0];
      const p  = stagePointToWorld(t0.clientX, t0.clientY);
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
      e.preventDefault();
    }, { passive: false });

    /* hover coords */
    stage.addEventListener("mousemove", (e) => {
      if (!state.showCoords) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      coordDisplay.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    });
  }

  /* ═══════════════════════════════════
     INIT
  ═══════════════════════════════════ */
  function init() {
    injectStyles();
    buildApp();
    fitStage();
    resizeCanvas();
    renderInitialRoom();
    bindInput();
    window.addEventListener("resize", () => { fitStage(); resizeCanvas(); });
    requestAnimationFrame(tick);
  }

  init();
})();
