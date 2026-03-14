
(() => {
  const DATA = window.KARASUKI_DATA;
  if (!DATA || !DATA.rooms) { console.error("KARASUKI_DATA not found."); return; }

  /* ── constants ── */
  const WORLD_W        = 960;
  const WORLD_H        = 540;
  const GHOST_SIZE     = 38;
  const GHOST_RADIUS   = 16;
  const SPEED          = 1.8;           // slightly slower for spooky feel
  const FADE_MS        = 600;           // spooky fade duration
  const CLICK_STOP_DIST= 6;
  const SPARKLE_COUNT  = 6;
  const HOVER_AMP      = 5;            // px bob amplitude
  const HOVER_PERIOD   = 2200;         // ms per bob cycle

  /* ── state ── */
  const state = {
    roomId     : DATA.startRoom,
    spawnId    : "default",
    x          : 480, y: 270,
    px         : 480, py: 270,         // previous position for trail direction
    keys       : { up:false, down:false, left:false, right:false },
    transitioning : false,
    clickTarget   : null,
    moving        : false,
    showCoords    : false,
    lastSparkleT  : 0,
    hoverT        : 0
  };

  let app, stage, roomLayer, ghostEl, coordDisplay, coordToggle;
  let currentBg;
  let sparklePool = [];
  let lastRAF = 0;

  /* ═══════════════════════════════════════
     STYLES
  ═══════════════════════════════════════ */
  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = `
      html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
      body{display:grid;place-items:center;}

      #karasuki-app{
        position:relative;width:100vw;height:100vh;
        overflow:hidden;background:#000;
      }
      #karasuki-stage{
        position:absolute;left:50%;top:50%;
        width:${WORLD_W}px;height:${WORLD_H}px;
        transform-origin:50% 50%;
        overflow:hidden;cursor:crosshair;
      }
      #karasuki-room-layer{position:absolute;inset:0;}
      .karasuki-bg{
        position:absolute;inset:0;width:100%;height:100%;
        object-fit:fill;display:block;pointer-events:none;user-select:none;
      }

      /* ── ghost ── */
      #booha-ghost{
        position:absolute;
        width:${GHOST_SIZE}px;height:${GHOST_SIZE}px;
        margin-left:-${GHOST_SIZE/2}px;margin-top:-${GHOST_SIZE/2}px;
        border-radius:50%;
        background:radial-gradient(circle at 35% 35%,
          #ffffff 0 18%,#f8f8f8 19% 28%,
          #ffd9ff 29% 48%,#ff8ae2 49% 68%,
          #ff4fc8 69% 100%);
        box-shadow:
          0 0 10px rgba(255,255,255,.75),
          0 0 24px rgba(255,105,214,.7),
          0 0 44px rgba(255,0,170,.4);
        z-index:10;pointer-events:none;
        will-change:transform,left,top;
        transition:left .08s linear, top .08s linear;
      }
      #booha-ghost::before,#booha-ghost::after{
        content:"";position:absolute;top:12px;
        width:5px;height:7px;border-radius:50%;background:#000;
      }
      #booha-ghost::before{left:11px;}
      #booha-ghost::after{right:11px;}
      #booha-ghost .pupil-left,#booha-ghost .pupil-right{
        position:absolute;top:13px;width:2px;height:3px;
        border-radius:50%;background:#f8f8f8;
      }
      #booha-ghost .pupil-left{left:12px;}
      #booha-ghost .pupil-right{right:12px;}
      #booha-ghost .tail{
        position:absolute;left:8px;right:8px;bottom:-4px;height:12px;
        background:inherit;
        clip-path:polygon(0 20%,18% 60%,35% 18%,50% 70%,65% 18%,82% 60%,100% 20%,100% 100%,0 100%);
      }

      /* ── sparkle ── */
      .sparkle{
        position:absolute;
        width:6px;height:6px;
        border-radius:50%;
        pointer-events:none;
        z-index:9;
        background:radial-gradient(circle,#fff 0%,#ff8ae2 60%,transparent 100%);
        animation:sparkle-fade .55s ease-out forwards;
      }
      @keyframes sparkle-fade{
        0%{opacity:.9;transform:scale(1);}
        100%{opacity:0;transform:scale(0.1) translate(var(--sx),var(--sy));}
      }

      /* ── black-void fade overlay ── */
      #kara-fade{
        position:absolute;inset:0;background:#000;
        opacity:0;pointer-events:none;z-index:20;
      }

      /* ── coord display ── */
      #coord-display{
        position:absolute;bottom:10px;left:50%;
        transform:translateX(-50%);
        background:rgba(0,0,0,.72);
        color:#ff8ae2;
        font:700 13px/1 monospace;
        padding:5px 12px;border-radius:20px;
        z-index:30;pointer-events:none;
        letter-spacing:.06em;
        opacity:0;transition:opacity .2s;
      }
      #coord-display.show{opacity:1;}

      /* ── toggle ── */
      #coord-toggle{
        position:fixed;bottom:18px;right:18px;z-index:100;
        display:flex;align-items:center;gap:8px;
        background:rgba(0,0,0,.75);
        color:#ff8ae2;font:700 11px/1 monospace;
        padding:7px 12px;border-radius:20px;
        cursor:pointer;border:1px solid rgba(255,138,226,.35);
        user-select:none;letter-spacing:.05em;
      }
      #coord-toggle .toggle-pill{
        width:30px;height:16px;border-radius:8px;
        background:rgba(255,138,226,.2);
        position:relative;transition:background .2s;
      }
      #coord-toggle .toggle-pill::after{
        content:"";position:absolute;
        top:3px;left:3px;width:10px;height:10px;
        border-radius:50%;background:#ff8ae2;
        transition:transform .2s;
      }
      #coord-toggle.active .toggle-pill{background:rgba(255,138,226,.55);}
      #coord-toggle.active .toggle-pill::after{transform:translateX(14px);}

      /* ── click ripple ── */
      .click-ripple{
        position:absolute;
        width:24px;height:24px;
        border-radius:50%;
        margin-left:-12px;margin-top:-12px;
        border:2px solid rgba(255,138,226,.7);
        pointer-events:none;z-index:15;
        animation:ripple-out .5s ease-out forwards;
      }
      @keyframes ripple-out{
        0%{opacity:1;transform:scale(.3);}
        100%{opacity:0;transform:scale(1.8);}
      }
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════ */
  function buildApp() {
    app = document.createElement("div");
    app.id = "karasuki-app";

    stage = document.createElement("div");
    stage.id = "karasuki-stage";

    roomLayer = document.createElement("div");
    roomLayer.id = "karasuki-room-layer";

    /* fade overlay */
    const fade = document.createElement("div");
    fade.id = "kara-fade";

    /* ghost */
    ghostEl = document.createElement("div");
    ghostEl.id = "booha-ghost";
    ["pupil-left","pupil-right","tail"].forEach(cls => {
      const d = document.createElement("div");
      d.className = cls;
      ghostEl.appendChild(d);
    });

    /* coord readout */
    coordDisplay = document.createElement("div");
    coordDisplay.id = "coord-display";
    coordDisplay.textContent = "0, 0";

    stage.appendChild(roomLayer);
    stage.appendChild(fade);
    stage.appendChild(ghostEl);
    stage.appendChild(coordDisplay);
    app.appendChild(stage);

    /* coord toggle (outside stage, fixed) */
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
  }

  /* ═══════════════════════════════════════
     FIT
  ═══════════════════════════════════════ */
  function fitStage() {
    const scale = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /* ═══════════════════════════════════════
     ROOM HELPERS
  ═══════════════════════════════════════ */
  function getRoom() { return DATA.rooms[state.roomId]; }

  function getSpawn(room, spawnId) {
    return room.spawns?.[spawnId] || room.spawns?.default || { x:480, y:270 };
  }

  function placeGhost(x, y) {
    state.px = state.x; state.py = state.y;
    state.x = x; state.y = y;
    ghostEl.style.left = `${x}px`;
    ghostEl.style.top  = `${y}px`;
    if (state.showCoords) {
      coordDisplay.textContent = `${Math.round(x)}, ${Math.round(y)}`;
    }
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

  /* ═══════════════════════════════════════
     COLLISION
  ═══════════════════════════════════════ */
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
    const c = clampToWorld(nx, ny);
    if (canMoveTo(c.x, c.y))       { placeGhost(c.x, c.y); return true; }
    const tx = clampToWorld(nx, state.y);
    if (canMoveTo(tx.x, tx.y))     { placeGhost(tx.x, tx.y); return true; }
    const ty = clampToWorld(state.x, ny);
    if (canMoveTo(ty.x, ty.y))     { placeGhost(ty.x, ty.y); return true; }
    return false;
  }

  /* ═══════════════════════════════════════
     SPOOKY FADE TRANSITION
  ═══════════════════════════════════════ */
  function getFadeEl() { return document.getElementById("kara-fade"); }

  function transitionTo(exit) {
    if (!exit?.to || state.transitioning) return;
    const nextRoom = DATA.rooms[exit.to];
    if (!nextRoom) return;

    state.transitioning = true;
    state.clickTarget   = null;

    const fadeEl = getFadeEl();
    // Fade to black
    fadeEl.style.transition = `opacity ${FADE_MS/2}ms ease-in`;
    fadeEl.style.opacity    = "1";

    setTimeout(() => {
      // swap room
      const nextBg = makeBg(nextRoom.bg);
      roomLayer.innerHTML = "";
      roomLayer.appendChild(nextBg);
      currentBg = nextBg;

      state.roomId  = exit.to;
      state.spawnId = exit.spawn || "default";

      const spawn = getSpawn(nextRoom, state.spawnId);
      placeGhost(spawn.x, spawn.y);

      // Fade back in
      fadeEl.style.transition = `opacity ${FADE_MS/2}ms ease-out`;
      fadeEl.style.opacity    = "0";

      setTimeout(() => {
        state.transitioning = false;
      }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  function getExitAtEdge() {
    const exits = getRoom()?.exits || {};
    if (state.x <= GHOST_RADIUS + 2    && exits.left)  return exits.left;
    if (state.x >= WORLD_W-GHOST_RADIUS-2 && exits.right) return exits.right;
    if (state.y <= GHOST_RADIUS + 2    && exits.up)   return exits.up;
    if (state.y >= WORLD_H-GHOST_RADIUS-2 && exits.down) return exits.down;
    return null;
  }

  /* ═══════════════════════════════════════
     SPARKLE TRAIL
  ═══════════════════════════════════════ */
  function spawnSparkle(x, y, now) {
    if (now - state.lastSparkleT < 60) return;
    state.lastSparkleT = now;

    const s = document.createElement("div");
    s.className = "sparkle";
    const dx = (Math.random() - .5) * 22;
    const dy = (Math.random() - .5) * 22 + 6;
    s.style.setProperty("--sx", `${dx}px`);
    s.style.setProperty("--sy", `${dy}px`);
    s.style.left  = `${x + (Math.random()-0.5)*8}px`;
    s.style.top   = `${y + GHOST_SIZE/2 - 4 + (Math.random()-0.5)*6}px`;
    s.style.width  = `${3 + Math.random()*5}px`;
    s.style.height = s.style.width;
    stage.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }

  /* ═══════════════════════════════════════
     HOVER ANIMATION
  ═══════════════════════════════════════ */
  function applyHoverTransform(now) {
    const phase  = (now % HOVER_PERIOD) / HOVER_PERIOD;
    const bob    = Math.sin(phase * Math.PI * 2) * HOVER_AMP;
    const wobble = Math.sin(phase * Math.PI * 4) * 1.5;
    ghostEl.style.transform = `translateY(${bob}px) rotate(${wobble}deg)`;
  }

  /* ═══════════════════════════════════════
     MOVEMENT
  ═══════════════════════════════════════ */
  function handleClickMovement(now) {
    if (!state.clickTarget) { state.moving = false; return; }
    const tx = state.clickTarget.x;
    const ty = state.clickTarget.y;
    const dx = tx - state.x;
    const dy = ty - state.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= CLICK_STOP_DIST) {
      state.clickTarget = null;
      state.moving = false;
      return;
    }

    const ux = dx / dist; const uy = dy / dist;
    const moved = tryMove(state.x + ux * SPEED, state.y + uy * SPEED);
    state.moving = moved;

    if (!moved) { state.clickTarget = null; state.moving = false; }
    else spawnSparkle(state.x, state.y, now);
  }

  /* ═══════════════════════════════════════
     MAIN TICK
  ═══════════════════════════════════════ */
  function tick(now) {
    if (!state.transitioning) {
      handleClickMovement(now);
      const exit = getExitAtEdge();
      if (exit) transitionTo(exit);
    }
    applyHoverTransform(now);
    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════════
     INPUT
  ═══════════════════════════════════════ */
  function stagePointToWorld(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width)  * WORLD_W;
    const y = ((clientY - rect.top)  / rect.height) * WORLD_H;
    return clampToWorld(x, y);
  }

  function spawnRipple(wx, wy) {
    const r = document.createElement("div");
    r.className = "click-ripple";
    r.style.left = `${wx}px`;
    r.style.top  = `${wy}px`;
    stage.appendChild(r);
    setTimeout(() => r.remove(), 520);
  }

  function bindMouse() {
    stage.addEventListener("click", (e) => {
      if (state.transitioning) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      state.clickTarget = { x: p.x, y: p.y };
      spawnRipple(p.x, p.y);
    });

    stage.addEventListener("mousemove", (e) => {
      if (!state.showCoords) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      coordDisplay.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    });
  }

  /* ═══════════════════════════════════════
     INIT
  ═══════════════════════════════════════ */
  function init() {
    injectStyles();
    buildApp();
    fitStage();
    renderInitialRoom();
    bindMouse();
    window.addEventListener("resize", fitStage);
    requestAnimationFrame(tick);
  }

  init();
})();
