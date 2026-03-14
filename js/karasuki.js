
(() => {
  const DATA = window.KARASUKI_DATA;
  if (!DATA || !DATA.rooms) { console.error("KARASUKI_DATA not found."); return; }

  /* ═══════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════ */
  const WORLD_W         = 1536;   // matches source image width
  const WORLD_H         = 1024;   // matches source image height  (3:2 ratio)
  const GHOST_R         = 22;
  const GHOST_RADIUS    = 16;
  const SPEED           = 1.8;
  const FADE_MS         = 600;
  const CLICK_STOP_DIST = 6;
  const HOVER_AMP       = 5;
  const HOVER_PERIOD    = 2200;
  const TRAIL_MAX       = 80;

  /* color ramps — same as maze.html */
  const MONTH_COLORS = [
    ['#ff3bbd','#ff79d7'],['#ff6b3b','#ffaa5e'],['#3bc8ff','#a8edff'],
    ['#3bff8a','#b2ffda'],['#ffd700','#fff176'],['#3b6fff','#90aaff'],
    ['#a03bff','#d49aff'],['#ff9f3b','#ffd08a'],['#3bffee','#a8fff8'],
    ['#c8ff3b','#e8ffaa'],['#ff3b6f','#ff85a1'],['#ff3bbd','#ff79d7'],
  ];
  function roomColorPair(roomId) {
    const n = parseInt((roomId || "room_01").replace(/\D/g, ""), 10) || 1;
    return MONTH_COLORS[(n - 1) % MONTH_COLORS.length];
  }

  /* ═══════════════════════════════════════════
     EXIT ARROW DATA
     Each room lists its exits with a world-space
     point (where the arrow sits) and a direction
     the arrow should point (toward the edge).
  ═══════════════════════════════════════════ */
  const EXIT_ARROWS = {
    room_01: [
      { dir: "right", x: 840, y: 270 },
      { dir: "up",    x: 480, y: 90  }
    ],
    room_02: [
      { dir: "left",  x: 147, y: 220 },
      { dir: "up",    x: 493, y: 89  },
      { dir: "right", x: 529, y: 117 }
    ],
    room_03: [
      { dir: "left",  x: 147, y: 220 },
      { dir: "up",    x: 493, y: 89  },
      { dir: "right", x: 529, y: 117 }
    ],
    room_04: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "right", x: 840, y: 270 },
      { dir: "up",    x: 480, y: 90  }
    ],
    room_05: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "up",    x: 480, y: 90  }
    ],
    room_06: [
      { dir: "right", x: 840, y: 270 },
      { dir: "up",    x: 480, y: 90  },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_07: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "right", x: 840, y: 270 },
      { dir: "up",    x: 480, y: 90  },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_08: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "right", x: 840, y: 270 },
      { dir: "up",    x: 480, y: 90  },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_09: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "right", x: 840, y: 270 },
      { dir: "up",    x: 480, y: 90  },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_10: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "up",    x: 480, y: 90  },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_11: [
      { dir: "right", x: 840, y: 270 },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_12: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "right", x: 840, y: 270 },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_13: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "right", x: 840, y: 270 },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_14: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "right", x: 840, y: 270 },
      { dir: "down",  x: 480, y: 470 }
    ],
    room_15: [
      { dir: "left",  x: 120, y: 270 },
      { dir: "down",  x: 480, y: 470 }
    ]
  };

  /* Arrow geometry: direction → angle (radians, 0 = pointing right) */
  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */
  const state = {
    roomId        : DATA.startRoom,
    spawnId       : "default",
    x             : 480,
    y             : 270,
    transitioning : false,
    clickTarget   : null,
    moving        : false,
    coordMode     : false,   // coord-marking mode toggle
    musicStarted  : false,
    lastTrailT    : 0
  };

  /* Persistent pins dropped in coord mode */
  let pins  = [];   // { x, y, label }
  let trail = [];
  let ripples = [];

  /* ── assets ── */
  const ghostImg = new Image();
  ghostImg.src   = "assets/img/booha_ghost.png";

  const music    = new Audio("assets/audio/karasuki-music.mp3");
  music.loop     = true;
  music.volume   = 0.65;

  /* ── DOM ── */
  let app, stage, canvas, ctx, roomLayer, coordToggle, coordReadout, pinLog;

  /* ═══════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════ */
  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = `
      html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
      body{display:grid;place-items:center;}
      #karasuki-app{position:relative;width:100vw;height:100vh;overflow:hidden;background:#000;}

      /* Stage is always 1536×1024 (3:2) in logical px, scaled via transform */
      #karasuki-stage{
        position:absolute;left:50%;top:50%;
        width:${WORLD_W}px;height:${WORLD_H}px;
        transform-origin:50% 50%;overflow:hidden;cursor:crosshair;
      }
      #karasuki-room-layer{position:absolute;inset:0;}
      .karasuki-bg{
        position:absolute;inset:0;width:100%;height:100%;
        object-fit:cover;object-position:center center;
        display:block;pointer-events:none;user-select:none;
      }
      #kara-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #kara-fade{
        position:absolute;inset:0;background:#000;
        opacity:0;pointer-events:none;z-index:20;
      }

      /* ── Landscape lock overlay ── */
      #rotate-overlay{
        display:none;
        position:fixed;inset:0;z-index:9999;
        background:#000;
        flex-direction:column;align-items:center;justify-content:center;gap:18px;
        text-align:center;padding:32px;
      }
      /* Show on portrait mobile */
      @media screen and (orientation:portrait) and (max-width:1023px){
        #rotate-overlay{ display:flex !important; }
      }
      .rotate-phone{
        font-size:64px;display:block;
        animation:rotatehint 2.4s ease-in-out infinite;
        transform-origin:center;
      }
      @keyframes rotatehint{
        0%,100%{transform:rotate(0deg);}
        40%,60%{transform:rotate(-90deg);}
      }
      .rotate-bar{
        width:120px;height:3px;border-radius:999px;
        background:linear-gradient(90deg,#ff3bbd,#ff79d7,#ff3bbd);
        background-size:200%;
        animation:barshimmer 2s linear infinite;
        box-shadow:0 0 14px rgba(255,59,189,.5);
      }
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{
        font-family:system-ui,-apple-system,sans-serif;
        font-size:clamp(18px,5vw,28px);font-weight:900;
        letter-spacing:1px;color:#fff;margin:0;
        text-shadow:0 0 28px rgba(255,140,255,.7);
      }
      .rotate-sub{
        font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;
      }

      /* ── coord toggle pill ── */
      #coord-toggle{
        position:fixed;bottom:18px;right:18px;z-index:200;
        display:flex;align-items:center;gap:8px;
        background:rgba(0,0,0,.80);color:#ff8ae2;font:700 11px/1 monospace;
        padding:7px 13px;border-radius:20px;cursor:pointer;
        border:1px solid rgba(255,138,226,.40);user-select:none;letter-spacing:.06em;
      }
      .toggle-pill{
        width:30px;height:16px;border-radius:8px;
        background:rgba(255,138,226,.18);position:relative;transition:background .2s;
      }
      .toggle-pill::after{
        content:"";position:absolute;top:3px;left:3px;
        width:10px;height:10px;border-radius:50%;
        background:#ff8ae2;transition:transform .2s;
      }
      #coord-toggle.active .toggle-pill{background:rgba(255,138,226,.55);}
      #coord-toggle.active .toggle-pill::after{transform:translateX(14px);}

      /* ── live readout ── */
      #coord-readout{
        position:fixed;top:12px;left:50%;transform:translateX(-50%);
        z-index:200;background:rgba(0,0,0,.80);
        color:#ff8ae2;font:700 13px/1.4 monospace;
        padding:6px 16px;border-radius:20px;pointer-events:none;
        border:1px solid rgba(255,138,226,.30);letter-spacing:.05em;
        opacity:0;transition:opacity .2s;white-space:nowrap;
        text-align:center;
      }
      #coord-readout.show{opacity:1;}
      #coord-readout .hint{font-size:10px;color:rgba(255,138,226,.55);display:block;margin-top:2px;}

      /* ── pin log panel ── */
      #pin-log{
        position:fixed;right:18px;top:50%;transform:translateY(-50%);
        z-index:200;
        max-height:60vh;overflow-y:auto;
        background:rgba(0,0,0,.85);
        border:1px solid rgba(255,138,226,.25);
        border-radius:14px;padding:10px 12px;
        font:700 11px/1.6 monospace;color:#ff8ae2;
        letter-spacing:.04em;
        display:none;min-width:160px;
      }
      #pin-log.show{display:block;}
      #pin-log .pin-row{
        display:flex;align-items:center;gap:8px;
        padding:3px 0;border-bottom:1px solid rgba(255,138,226,.12);
        cursor:pointer;
      }
      #pin-log .pin-row:last-child{border-bottom:none;}
      #pin-log .pin-row:hover{color:#fff;}
      #pin-log .pin-idx{
        min-width:18px;text-align:right;
        color:rgba(255,138,226,.55);font-size:10px;
      }
      #pin-log .pin-coords{flex:1;}
      #pin-log .pin-copy{
        font-size:9px;color:rgba(255,138,226,.45);
        padding:1px 5px;border-radius:6px;
        border:1px solid rgba(255,138,226,.2);
      }
      #pin-log .pin-row:hover .pin-copy{color:#fff;border-color:rgba(255,138,226,.6);}
      #pin-log .log-header{
        font-size:9px;color:rgba(255,138,226,.45);
        letter-spacing:.12em;margin-bottom:6px;
        display:flex;justify-content:space-between;align-items:center;
      }
      #pin-log .clear-btn{
        font-size:9px;color:rgba(255,138,226,.4);cursor:pointer;
        padding:1px 6px;border-radius:6px;border:1px solid rgba(255,138,226,.18);
      }
      #pin-log .clear-btn:hover{color:#fff;border-color:rgba(255,138,226,.6);}
      #copy-toast{
        position:fixed;top:52px;left:50%;transform:translateX(-50%);
        z-index:300;background:rgba(20,0,30,.92);color:#fff;
        font:700 12px/1 monospace;padding:6px 18px;border-radius:20px;
        pointer-events:none;opacity:0;transition:opacity .18s;letter-spacing:.05em;
      }
      #copy-toast.show{opacity:1;}
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════════ */
  function buildApp() {
    app       = document.createElement("div");  app.id = "karasuki-app";
    stage     = document.createElement("div");  stage.id = "karasuki-stage";
    roomLayer = document.createElement("div");  roomLayer.id = "karasuki-room-layer";
    canvas    = document.createElement("canvas"); canvas.id = "kara-canvas";
    const fade = document.createElement("div"); fade.id = "kara-fade";

    stage.appendChild(roomLayer);
    stage.appendChild(canvas);
    stage.appendChild(fade);
    app.appendChild(stage);

    /* coord toggle */
    coordToggle = document.createElement("div");
    coordToggle.id = "coord-toggle";
    coordToggle.innerHTML = `<span>COORDS</span><div class="toggle-pill"></div>`;
    coordToggle.addEventListener("click", toggleCoordMode);

    /* live readout */
    coordReadout = document.createElement("div");
    coordReadout.id = "coord-readout";
    coordReadout.innerHTML = `<span id="coord-xy">—</span><span class="hint">click to pin · hover to read</span>`;

    /* pin log */
    pinLog = document.createElement("div");
    pinLog.id = "pin-log";
    pinLog.innerHTML = `<div class="log-header"><span>PINS — ${state.roomId}</span><span class="clear-btn" id="clear-pins">CLEAR</span></div><div id="pin-rows"></div>`;

    /* copy toast */
    const toast = document.createElement("div");
    toast.id = "copy-toast";
    toast.textContent = "copied!";

    document.body.innerHTML = "";
    document.body.appendChild(app);
    document.body.appendChild(coordToggle);
    document.body.appendChild(coordReadout);
    document.body.appendChild(pinLog);
    document.body.appendChild(toast);

    /* ── landscape lock overlay ── */
    const rotateOverlay = document.createElement("div");
    rotateOverlay.id = "rotate-overlay";
    rotateOverlay.innerHTML = `
      <span class="rotate-phone">📱</span>
      <div class="rotate-bar"></div>
      <p class="rotate-title">Rotate to play!</p>
      <p class="rotate-sub">Karasuki works best in<br><strong style="color:#ff79d7">landscape mode</strong></p>
    `;
    document.body.appendChild(rotateOverlay);

    ctx = canvas.getContext("2d");

    document.getElementById("clear-pins").addEventListener("click", () => {
      pins = []; renderPinLog();
    });
  }

  /* ═══════════════════════════════════════════
     CANVAS / FIT
  ═══════════════════════════════════════════ */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width  = WORLD_W + "px";
    canvas.style.height = WORLD_H + "px";
    canvas.width  = Math.round(WORLD_W * dpr);
    canvas.height = Math.round(WORLD_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function fitStage() {
    // Cover: scale up so stage fills the viewport on both axes — no bars ever.
    // On a 16:9 screen viewing 3:2 content, ~5% of top/bottom is cropped — acceptable.
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /* ═══════════════════════════════════════════
     COORD MODE
  ═══════════════════════════════════════════ */
  function toggleCoordMode() {
    state.coordMode = !state.coordMode;
    coordToggle.classList.toggle("active", state.coordMode);
    coordReadout.classList.toggle("show", state.coordMode);
    pinLog.classList.toggle("show", state.coordMode);
    stage.style.cursor = state.coordMode ? "crosshair" : "crosshair";
    // Update log header room label
    pinLog.querySelector(".log-header span").textContent = `PINS — ${state.roomId}`;
  }

  function dropPin(wx, wy) {
    const label = `${Math.round(wx)}, ${Math.round(wy)}`;
    pins.push({ x: wx, y: wy, label });
    renderPinLog();
    copyText(label);
    showToast(`pinned ${label}`);
  }

  function renderPinLog() {
    const rows = document.getElementById("pin-rows");
    if (!rows) return;
    rows.innerHTML = pins.map((p, i) => `
      <div class="pin-row" data-i="${i}">
        <span class="pin-idx">${i + 1}</span>
        <span class="pin-coords">${p.label}</span>
        <span class="pin-copy">copy</span>
      </div>`).join("");
    rows.querySelectorAll(".pin-row").forEach(row => {
      row.addEventListener("click", () => {
        const pin = pins[+row.dataset.i];
        if (pin) { copyText(pin.label); showToast(`copied ${pin.label}`); }
      });
    });
  }

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById("copy-toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1400);
  }

  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return; } catch (_) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = txt; ta.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════
     ROOM HELPERS
  ═══════════════════════════════════════════ */
  function getRoom()  { return DATA.rooms[state.roomId]; }

  function getSpawn(room, spawnId) {
    return room.spawns?.[spawnId] || room.spawns?.default || { x: 480, y: 270 };
  }

  function placeGhost(x, y) {
    state.x = x; state.y = y;
  }

  function makeBg(src) {
    const img = document.createElement("img");
    img.className = "karasuki-bg"; img.src = src; return img;
  }

  let currentBg;
  function renderInitialRoom() {
    const room  = getRoom();
    currentBg   = makeBg(room.bg);
    roomLayer.appendChild(currentBg);
    const spawn = getSpawn(room, state.spawnId);
    placeGhost(spawn.x, spawn.y);
  }

  /* ═══════════════════════════════════════════
     COLLISION
  ═══════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════
     FADE TRANSITION
  ═══════════════════════════════════════════ */
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
      roomLayer.innerHTML = ""; roomLayer.appendChild(nextBg); currentBg = nextBg;
      state.roomId  = exit.to;
      state.spawnId = exit.spawn || "default";
      const spawn   = getSpawn(nextRoom, state.spawnId);
      placeGhost(spawn.x, spawn.y);
      trail = []; pins = [];  // clear pins when room changes
      // update pin log header
      const lh = pinLog.querySelector(".log-header span");
      if (lh) lh.textContent = `PINS — ${state.roomId}`;
      renderPinLog();

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

  /* ═══════════════════════════════════════════
     TRAIL
  ═══════════════════════════════════════════ */
  function addTrailParticle(x, y, now) {
    if (now - state.lastTrailT < 45) return;
    state.lastTrailT = now;
    const [col1, col2] = roomColorPair(state.roomId);
    trail.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + GHOST_R * 0.55 + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 0.4, vy: -Math.random() * 0.5,
      life: 1, size: 2 + Math.random() * 4.5,
      color: Math.random() > 0.5 ? col1 : col2
    });
    if (trail.length > TRAIL_MAX) trail.shift();
  }

  /* ═══════════════════════════════════════════
     DRAW EXIT ARROWS
     Faint magical glowing chevron arrows at each
     exit point. Pulse and breathe over time.
  ═══════════════════════════════════════════ */
  function drawExitArrows(now) {
    const arrows = EXIT_ARROWS[state.roomId];
    if (!arrows) return;
    const sec = now / 1000;
    const [col1, col2] = roomColorPair(state.roomId);

    arrows.forEach((arrow, i) => {
      const angle  = DIR_ANGLE[arrow.dir] ?? 0;
      const pulse  = 0.5 + 0.5 * Math.sin(sec * 2.2 + i * 1.3);
      const bounce = Math.sin(sec * 2.2 + i * 1.3) * 5;  // arrow bobs toward edge
      const ax = arrow.x + Math.cos(angle) * bounce;
      const ay = arrow.y + Math.sin(angle) * bounce;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);

      /* outer glow */
      ctx.globalAlpha = (0.08 + pulse * 0.07);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 36);
      glow.addColorStop(0, col1); glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();

      /* draw two stacked chevrons (›› style) pointing right, rotated by angle */
      const drawChevron = (offsetX, alpha) => {
        ctx.globalAlpha = alpha * (0.35 + pulse * 0.30);
        ctx.strokeStyle = col1;
        ctx.lineWidth   = 2.2;
        ctx.lineCap     = "round";
        ctx.lineJoin    = "round";
        ctx.shadowBlur  = 10;
        ctx.shadowColor = col2;
        ctx.beginPath();
        ctx.moveTo(offsetX - 6, -9);
        ctx.lineTo(offsetX + 6,  0);
        ctx.lineTo(offsetX - 6,  9);
        ctx.stroke();
        ctx.shadowBlur = 0;
      };
      drawChevron(-10, 0.7);
      drawChevron(  4, 1.0);

      /* tiny dot at the tip */
      ctx.globalAlpha = 0.55 + pulse * 0.35;
      ctx.fillStyle   = "#fff";
      ctx.shadowBlur  = 8;
      ctx.shadowColor = col1;
      ctx.beginPath(); ctx.arc(8, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur  = 0;

      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     DRAW PINS (coord mode)
  ═══════════════════════════════════════════ */
  function drawPins(now) {
    if (!state.coordMode || !pins.length) return;
    const sec = now / 1000;
    pins.forEach((p, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(sec * 3 + i);
      ctx.save();

      /* crosshair */
      ctx.globalAlpha = 0.80 + pulse * 0.18;
      ctx.strokeStyle = "#ff8ae2";
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y);
      ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x, p.y + 14);
      ctx.stroke();
      ctx.setLineDash([]);

      /* dot */
      ctx.globalAlpha = 1;
      ctx.fillStyle   = "#ff4fc8";
      ctx.shadowBlur  = 8; ctx.shadowColor = "#ff8ae2";
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur  = 0;

      /* label badge */
      ctx.font        = "bold 10px monospace";
      const tw        = ctx.measureText(p.label).width;
      const bx        = p.x + 10, by = p.y - 18;
      ctx.globalAlpha = 0.88;
      ctx.fillStyle   = "rgba(0,0,0,.75)";
      ctx.beginPath();
      ctx.roundRect(bx - 4, by - 11, tw + 10, 15, 5);
      ctx.fill();
      ctx.fillStyle   = "#ff8ae2";
      ctx.globalAlpha = 1;
      ctx.fillText(`${i + 1}. ${p.label}`, bx + 1, by);

      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     MAIN DRAW FRAME
  ═══════════════════════════════════════════ */
  function drawFrame(now) {
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    const sec = now / 1000;
    const [col1, col2] = roomColorPair(state.roomId);

    /* ripples */
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.life -= 0.038;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = rp.life * 0.72;
      ctx.strokeStyle = "rgba(255,138,226,.95)";
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, (1 - rp.life) * 38 + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    /* trail */
    for (let i = trail.length - 1; i >= 0; i--) {
      const p  = trail[i];
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
      gr.addColorStop(0, p.color); gr.addColorStop(1, "transparent");
      ctx.globalAlpha = p.life * 0.48; ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.life * 0.90; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3,  0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      p.life -= 0.022; p.x += p.vx; p.y += p.vy;
    }
    trail = trail.filter(p => p.life > 0);

    /* exit arrows */
    drawExitArrows(now);

    /* ghost */
    const bobFreq = (Math.PI * 2) / (HOVER_PERIOD / 1000);
    const bob     = Math.sin(sec * bobFreq) * HOVER_AMP;
    const wobble  = Math.sin(sec * bobFreq * 2) * 1.5;
    const gx = state.x, gy = state.y + bob;
    const pulse = 0.5 + 0.5 * Math.sin(sec * 2.1);

    ctx.save();
    ctx.globalAlpha = 0.22 + pulse * 0.12;
    const halo = ctx.createRadialGradient(gx, gy + 3, 0, gx, gy + 3, GHOST_R * 2.2);
    halo.addColorStop(0, col1); halo.addColorStop(0.5, col2); halo.addColorStop(1, "transparent");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(gx, gy + 3, GHOST_R * 2.2, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 0.18 + pulse * 0.07;
    const shd = ctx.createRadialGradient(gx, gy + GHOST_R * 0.85, 0, gx, gy + GHOST_R * 0.85, GHOST_R * 0.9);
    shd.addColorStop(0, "rgba(0,0,0,.65)"); shd.addColorStop(1, "transparent");
    ctx.fillStyle = shd;
    ctx.beginPath(); ctx.arc(gx, gy + GHOST_R * 0.85, GHOST_R * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(wobble * Math.PI / 180);
    if (ghostImg.complete && ghostImg.naturalWidth > 0) {
      ctx.drawImage(ghostImg, -GHOST_R, -GHOST_R, GHOST_R * 2, GHOST_R * 2);
    } else {
      ctx.globalAlpha = 1; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 0, GHOST_R * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* pins on top */
    drawPins(now);
  }

  /* ═══════════════════════════════════════════
     MOVEMENT
  ═══════════════════════════════════════════ */
  function handleClickMovement(now) {
    if (!state.clickTarget) { state.moving = false; return; }
    const tx = state.clickTarget.x, ty = state.clickTarget.y;
    const dx = tx - state.x, dy = ty - state.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= CLICK_STOP_DIST) { state.clickTarget = null; state.moving = false; return; }
    const moved = tryMove(state.x + (dx / dist) * SPEED, state.y + (dy / dist) * SPEED);
    state.moving = moved;
    if (!moved) { state.clickTarget = null; state.moving = false; }
    else        addTrailParticle(state.x, state.y, now);
  }

  /* ═══════════════════════════════════════════
     MAIN LOOP
  ═══════════════════════════════════════════ */
  function tick(now) {
    if (!state.transitioning) {
      handleClickMovement(now);
      const exit = getExitAtEdge();
      if (exit) transitionTo(exit);
    }
    drawFrame(now);
    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════════════
     MUSIC
  ═══════════════════════════════════════════ */
  function startMusic() {
    if (state.musicStarted) return;
    state.musicStarted = true;
    music.play().catch(() => {});
  }

  /* ═══════════════════════════════════════════
     INPUT
  ═══════════════════════════════════════════ */
  function stagePointToWorld(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width)  * WORLD_W;
    const y = ((clientY - rect.top)  / rect.height) * WORLD_H;
    return clampToWorld(x, y);
  }

  function bindInput() {
    /* mouse move → live coord readout */
    stage.addEventListener("mousemove", (e) => {
      if (!state.coordMode) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      const el = document.getElementById("coord-xy");
      if (el) el.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    });

    /* click */
    stage.addEventListener("click", (e) => {
      startMusic();
      if (state.transitioning) return;
      const p = stagePointToWorld(e.clientX, e.clientY);

      if (state.coordMode) {
        /* COORD MODE: drop a pin, copy coords, do NOT move ghost */
        dropPin(p.x, p.y);
        ripples.push({ x: p.x, y: p.y, life: 1 });
        return;
      }

      /* NORMAL: move ghost */
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
    });

    /* touch */
    stage.addEventListener("touchend", (e) => {
      startMusic();
      if (state.transitioning || !e.changedTouches.length) return;
      const t0 = e.changedTouches[0];
      const p  = stagePointToWorld(t0.clientX, t0.clientY);

      if (state.coordMode) {
        dropPin(p.x, p.y);
        ripples.push({ x: p.x, y: p.y, life: 1 });
        e.preventDefault(); return;
      }

      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
      e.preventDefault();
    }, { passive: false });
  }

  /* ═══════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════ */
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
