
(() => {
  const DATA = window.KARASUKI_DATA;
  if (!DATA || !DATA.rooms) { console.error("KARASUKI_DATA not found."); return; }

  /* ═══════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════ */
  const WORLD_W         = 1536;
  const WORLD_H         = 1024;
  const GHOST_R         = 26;
  const GHOST_RADIUS    = 18;
  const SPEED           = 3.2;
  const FADE_MS         = 600;
  const CLICK_STOP_DIST = 6;
  const HOVER_AMP       = 9;
  const HOVER_PERIOD    = 1500;
  const TRAIL_MAX       = 90;

  /* ── Profile portal (room_08) ── */
  const PORTAL = { x: 357, y: 342, r: 28, href: "adventure-profile.html" };

  /* color ramps */
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
     NPP — NEXT PAGE POINTS
  ═══════════════════════════════════════════ */
  const NPP_RADIUS = 40;

  const NPP = {
    room_01: [
      { dir: "right", x: 1455, y: 658,  to: "room_02", spawn: "fromLeft"  },
      { dir: "up",    x: 1084, y: 162,  to: "room_06", spawn: "fromDown"  }
    ],
    room_02: [
      { dir: "left",  x: 149,  y: 255,  to: "room_01", spawn: "fromRight" },
      { dir: "right", x: 1458, y: 727,  to: "room_03", spawn: "fromLeft"  },
      { dir: "up",    x: 765,  y: 126,  to: "room_07", spawn: "fromDown"  }
    ],
    room_03: [
      { dir: "left",  x: 218,  y: 328,  to: "room_02", spawn: "fromRight" },
      { dir: "right", x: 1216, y: 237,  to: "room_04", spawn: "fromLeft"  },
      { dir: "up",    x: 785,  y: 171,  to: "room_08", spawn: "fromDown"  }
    ],
    room_04: [
      { dir: "left",  x: 94,   y: 635,  to: "room_03", spawn: "fromRight" },
      { dir: "right", x: 1443, y: 734,  to: "room_05", spawn: "fromLeft"  },
      { dir: "up",    x: 548,  y: 169,  to: "room_09", spawn: "fromDown"  }
    ],
    room_05: [
      { dir: "left",  x: 218,  y: 328,  to: "room_04", spawn: "fromRight" },
      { dir: "up",    x: 785,  y: 171,  to: "room_10", spawn: "fromDown"  }
    ],

    room_06: [
      { dir: "right", x: 1468, y: 684,  to: "room_07", spawn: "fromLeft"  },
      { dir: "up",    x: 1096, y: 136,  to: "room_11", spawn: "fromDown"  },
      { dir: "down",  x: 623,  y: 937,  to: "room_01", spawn: "fromUp"    }
    ],
    room_07: [
      { dir: "left",  x: 28,   y: 687,  to: "room_06", spawn: "fromRight" },
      { dir: "right", x: 1484, y: 615,  to: "room_08", spawn: "fromLeft"  },
      { dir: "up",    x: 555,  y: 157,  to: "room_12", spawn: "fromDown"  },
      { dir: "down",  x: 901,  y: 892,  to: "room_02", spawn: "fromUp"    }
    ],
    room_08: [
      { dir: "left",  x: 47,   y: 809,  to: "room_07", spawn: "fromRight" },
      { dir: "right", x: 1520, y: 597,  to: "room_09", spawn: "fromLeft"  },
      { dir: "up",    x: 992,  y: 160,  to: "room_13", spawn: "fromDown"  },
      { dir: "down",  x: 860,  y: 874,  to: "room_03", spawn: "fromUp"    }
    ],
    room_09: [
      { dir: "left",  x: 50,   y: 702,  to: "room_08", spawn: "fromRight" },
      { dir: "right", x: 1365, y: 224,  to: "room_10", spawn: "fromLeft"  },
      { dir: "up",    x: 449,  y: 169,  to: "room_14", spawn: "fromDown"  },
      { dir: "down",  x: 918,  y: 883,  to: "room_04", spawn: "fromUp"    }
    ],
    room_10: [
      { dir: "left",  x: 50,   y: 702,  to: "room_09", spawn: "fromRight" },
      { dir: "up",    x: 838,  y: 173,  to: "room_15", spawn: "fromDown"  },
      { dir: "down",  x: 776,  y: 891,  to: "room_05", spawn: "fromUp"    }
    ],

    room_11: [
      { dir: "right", x: 1364, y: 312,  to: "room_12", spawn: "fromLeft"  },
      { dir: "down",  x: 804,  y: 881,  to: "room_06", spawn: "fromUp"    }
    ],
    room_12: [
      { dir: "left",  x: 173,  y: 344,  to: "room_11", spawn: "fromRight" },
      { dir: "right", x: 1485, y: 716,  to: "room_13", spawn: "fromLeft"  },
      { dir: "down",  x: 751,  y: 914,  to: "room_07", spawn: "fromUp"    }
    ],
    room_13: [
      { dir: "left",  x: 88,   y: 568,  to: "room_12", spawn: "fromRight" },
      { dir: "right", x: 1421, y: 242,  to: "room_14", spawn: "fromLeft"  },
      { dir: "down",  x: 910,  y: 913,  to: "room_08", spawn: "fromUp"    }
    ],
    room_14: [
      { dir: "left",  x: 173,  y: 344,  to: "room_13", spawn: "fromRight" },
      { dir: "right", x: 1485, y: 716,  to: "room_15", spawn: "fromLeft"  },
      { dir: "down",  x: 751,  y: 914,  to: "room_09", spawn: "fromUp"    }
    ],
    room_15: [
      { dir: "left",  x: 88,   y: 568,  to: "room_14", spawn: "fromRight" },
      { dir: "down",  x: 663,  y: 894,  to: "room_10", spawn: "fromUp"    }
    ]
  };

  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const ARRIVE_HIDE_DIST = 120;

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */
  const state = {
    roomId        : DATA.startRoom,
    spawnId       : "default",
    x             : 721,
    y             : 876,
    spawnX        : 721,
    spawnY        : 876,
    arrivalDir    : null,
    transitioning : false,
    clickTarget   : null,
    moving        : false,
    coordMode     : false,
    musicStarted  : false,
    lastTrailT    : 0
  };

  let pins    = [];
  let trail   = [];
  let ripples = [];

  const ghostImg = new Image();
  ghostImg.src   = "assets/img/booha_ghost.png";
  const music    = new Audio("assets/audio/karasuki-music.mp3");
  music.loop     = true;
  music.volume   = 0.65;

  let app, stage, canvas, ctx, roomLayer, coordToggle, coordReadout, pinLog;
  let portalOverlay = null;   // DOM popup for profile portal

  /* ═══════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════ */
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
        display:none;position:fixed;inset:0;z-index:9999;background:#000;
        flex-direction:column;align-items:center;justify-content:center;gap:18px;
        text-align:center;padding:32px;
      }
      @media screen and (orientation:portrait) and (max-width:1023px){
        #rotate-overlay{ display:flex !important; }
      }
      .rotate-phone{font-size:64px;display:block;animation:rotatehint 2.4s ease-in-out infinite;transform-origin:center;}
      @keyframes rotatehint{0%,100%{transform:rotate(0deg);}40%,60%{transform:rotate(-90deg);}}
      .rotate-bar{
        width:120px;height:3px;border-radius:999px;
        background:linear-gradient(90deg,#ff3bbd,#ff79d7,#ff3bbd);background-size:200%;
        animation:barshimmer 2s linear infinite;box-shadow:0 0 14px rgba(255,59,189,.5);
      }
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{
        font-family:system-ui,-apple-system,sans-serif;
        font-size:clamp(18px,5vw,28px);font-weight:900;letter-spacing:1px;color:#fff;margin:0;
        text-shadow:0 0 28px rgba(255,140,255,.7);
      }
      .rotate-sub{font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;}

      /* ── coord toggle pill ── */
      #coord-toggle{
        position:fixed;bottom:18px;right:18px;z-index:200;
        display:flex;align-items:center;gap:8px;
        background:rgba(0,0,0,.80);color:#ff8ae2;font:700 11px/1 monospace;
        padding:7px 13px;border-radius:20px;cursor:pointer;
        border:1px solid rgba(255,138,226,.40);user-select:none;letter-spacing:.06em;
      }
      .toggle-pill{width:30px;height:16px;border-radius:8px;background:rgba(255,138,226,.18);position:relative;transition:background .2s;}
      .toggle-pill::after{content:"";position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:#ff8ae2;transition:transform .2s;}
      #coord-toggle.active .toggle-pill{background:rgba(255,138,226,.55);}
      #coord-toggle.active .toggle-pill::after{transform:translateX(14px);}

      #coord-readout{
        position:fixed;top:12px;left:50%;transform:translateX(-50%);
        z-index:200;background:rgba(0,0,0,.80);
        color:#ff8ae2;font:700 13px/1.4 monospace;
        padding:6px 16px;border-radius:20px;pointer-events:none;
        border:1px solid rgba(255,138,226,.30);letter-spacing:.05em;
        opacity:0;transition:opacity .2s;white-space:nowrap;text-align:center;
      }
      #coord-readout.show{opacity:1;}
      #coord-readout .hint{font-size:10px;color:rgba(255,138,226,.55);display:block;margin-top:2px;}

      #pin-log{
        position:fixed;right:18px;top:50%;transform:translateY(-50%);
        z-index:200;max-height:60vh;overflow-y:auto;
        background:rgba(0,0,0,.85);border:1px solid rgba(255,138,226,.25);
        border-radius:14px;padding:10px 12px;
        font:700 11px/1.6 monospace;color:#ff8ae2;
        letter-spacing:.04em;display:none;min-width:160px;
      }
      #pin-log.show{display:block;}
      #pin-log .pin-row{display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,138,226,.12);cursor:pointer;}
      #pin-log .pin-row:last-child{border-bottom:none;}
      #pin-log .pin-row:hover{color:#fff;}
      #pin-log .pin-idx{min-width:18px;text-align:right;color:rgba(255,138,226,.55);font-size:10px;}
      #pin-log .pin-coords{flex:1;}
      #pin-log .pin-copy{font-size:9px;color:rgba(255,138,226,.45);padding:1px 5px;border-radius:6px;border:1px solid rgba(255,138,226,.2);}
      #pin-log .pin-row:hover .pin-copy{color:#fff;border-color:rgba(255,138,226,.6);}
      #pin-log .log-header{font-size:9px;color:rgba(255,138,226,.45);letter-spacing:.12em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;}
      #pin-log .clear-btn{font-size:9px;color:rgba(255,138,226,.4);cursor:pointer;padding:1px 6px;border-radius:6px;border:1px solid rgba(255,138,226,.18);}
      #pin-log .clear-btn:hover{color:#fff;border-color:rgba(255,138,226,.6);}
      #copy-toast{
        position:fixed;top:52px;left:50%;transform:translateX(-50%);
        z-index:300;background:rgba(20,0,30,.92);color:#fff;
        font:700 12px/1 monospace;padding:6px 18px;border-radius:20px;
        pointer-events:none;opacity:0;transition:opacity .18s;letter-spacing:.05em;
      }
      #copy-toast.show{opacity:1;}

      /* ── Profile portal popup ── */
      #portal-overlay{
        display:none;position:fixed;inset:0;z-index:9000;
        align-items:center;justify-content:center;
        background:rgba(0,0,0,0);
        transition:background 0.3s ease;
      }
      #portal-overlay.active{
        display:flex;
        background:rgba(0,0,0,0.78);
      }
      #portal-box{
        background:#0a0a0f;
        border:1px solid #1e0e2a;
        border-radius:3px;
        padding:40px 50px 34px;
        max-width:400px;width:88%;
        text-align:center;
        box-shadow:
          0 0 0 1px rgba(80,0,110,.4),
          0 0 30px rgba(80,0,110,.45),
          0 0 80px rgba(60,0,90,.25),
          inset 0 0 40px rgba(0,0,0,.6);
        font-family:'Georgia',serif;
        position:relative;
        animation:portalAppear 0.25s ease-out;
      }
      @keyframes portalAppear{
        from{opacity:0;transform:scale(0.94) translateY(6px);}
        to{opacity:1;transform:scale(1) translateY(0);}
      }
      /* faint corner accents */
      #portal-box::before,#portal-box::after{
        content:"";position:absolute;width:18px;height:18px;
        border-color:rgba(120,40,160,.5);border-style:solid;
      }
      #portal-box::before{top:10px;left:10px;border-width:1px 0 0 1px;}
      #portal-box::after{bottom:10px;right:10px;border-width:0 1px 1px 0;}
      #portal-en{
        font-size:1rem;margin:0 0 8px;letter-spacing:.04em;
        color:#d4c8de;line-height:1.55;
      }
      #portal-ja{
        font-size:.84rem;margin:0 0 5px;color:#9a85aa;
        letter-spacing:.05em;
      }
      #portal-kanji{
        font-size:.77rem;margin:0 0 30px;color:#6a5478;
        letter-spacing:.08em;
      }
      .portal-btn{
        background:transparent;
        font-family:'Georgia',serif;
        font-size:.88rem;letter-spacing:.12em;
        cursor:pointer;
        transition:color .18s, border-color .18s, box-shadow .18s;
        padding:8px 30px;border-radius:2px;
      }
      #portal-yes{
        border:1px solid rgba(110,40,150,.7);
        color:#c0a8d0;margin-right:14px;
      }
      #portal-yes:hover{
        color:#fff;border-color:rgba(160,80,200,.9);
        box-shadow:0 0 12px rgba(140,40,180,.4);
      }
      #portal-no{
        border:1px solid rgba(50,35,60,.7);
        color:#5a4a64;
      }
      #portal-no:hover{
        color:#9a8aaa;border-color:rgba(80,55,100,.8);
      }
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════════ */
  function buildApp() {
    app       = document.createElement("div"); app.id = "karasuki-app";
    stage     = document.createElement("div"); stage.id = "karasuki-stage";
    roomLayer = document.createElement("div"); roomLayer.id = "karasuki-room-layer";
    canvas    = document.createElement("canvas"); canvas.id = "kara-canvas";
    const fade = document.createElement("div"); fade.id = "kara-fade";

    stage.appendChild(roomLayer);
    stage.appendChild(canvas);
    stage.appendChild(fade);
    app.appendChild(stage);

    coordToggle = document.createElement("div");
    coordToggle.id = "coord-toggle";
    coordToggle.innerHTML = `<span>COORDS</span><div class="toggle-pill"></div>`;
    coordToggle.addEventListener("click", toggleCoordMode);

    coordReadout = document.createElement("div");
    coordReadout.id = "coord-readout";
    coordReadout.innerHTML = `<span id="coord-xy">—</span><span class="hint">click to pin · hover to read</span>`;

    pinLog = document.createElement("div");
    pinLog.id = "pin-log";
    pinLog.innerHTML = `<div class="log-header"><span>PINS — ${state.roomId}</span><span class="clear-btn" id="clear-pins">CLEAR</span></div><div id="pin-rows"></div>`;

    const toast = document.createElement("div");
    toast.id = "copy-toast";
    toast.textContent = "copied!";

    /* ── Profile portal popup ── */
    portalOverlay = document.createElement("div");
    portalOverlay.id = "portal-overlay";
    portalOverlay.innerHTML = `
      <div id="portal-box">
        <p id="portal-en">Do you want to go to your profile page?</p>
        <p id="portal-ja">プロフィールページに行きますか？</p>
        <p id="portal-kanji">貴方の横顔の頁へ参りますか？</p>
        <button class="portal-btn" id="portal-yes">Yes</button>
        <button class="portal-btn" id="portal-no">No</button>
      </div>`;

    document.body.innerHTML = "";
    document.body.appendChild(app);
    document.body.appendChild(coordToggle);
    document.body.appendChild(coordReadout);
    document.body.appendChild(pinLog);
    document.body.appendChild(toast);
    document.body.appendChild(portalOverlay);

    /* landscape lock */
    const rotateOverlay = document.createElement("div");
    rotateOverlay.id = "rotate-overlay";
    rotateOverlay.innerHTML = `
      <span class="rotate-phone">📱</span>
      <div class="rotate-bar"></div>
      <p class="rotate-title">Rotate to play!</p>
      <p class="rotate-sub">Karasuki works best in<br><strong style="color:#ff79d7">landscape mode</strong></p>`;
    document.body.appendChild(rotateOverlay);

    ctx = canvas.getContext("2d");

    document.getElementById("clear-pins").addEventListener("click", () => { pins = []; renderPinLog(); });

    /* portal button events */
    document.getElementById("portal-yes").addEventListener("click", () => {
      window.location.href = PORTAL.href;
    });
    document.getElementById("portal-no").addEventListener("click", closePortal);
    portalOverlay.addEventListener("click", (e) => { if (e.target === portalOverlay) closePortal(); });
  }

  function openPortal()  {
    portalOverlay.classList.add("active");
    state.clickTarget = null;
  }
  function closePortal() {
    portalOverlay.classList.remove("active");
  }
  function isPortalOpen() {
    return portalOverlay.classList.contains("active");
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

  function placeGhost(x, y) { state.x = x; state.y = y; }

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
    const c = clampToWorld(nx, ny);
    if (canMoveTo(c.x, c.y))           { placeGhost(c.x, c.y); return true; }
    const tx = clampToWorld(nx, state.y);
    if (canMoveTo(tx.x, tx.y))         { placeGhost(tx.x, tx.y); return true; }
    const ty = clampToWorld(state.x, ny);
    if (canMoveTo(ty.x, ty.y))         { placeGhost(ty.x, ty.y); return true; }
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
      state.roomId     = exit.to;
      state.spawnId    = exit.spawn || "default";
      const spawn      = getSpawn(nextRoom, state.spawnId);
      placeGhost(spawn.x, spawn.y);
      state.spawnX     = spawn.x;
      state.spawnY     = spawn.y;
      state.arrivalDir = exit.dir || null;
      trail = []; pins = [];
      const lh = pinLog.querySelector(".log-header span");
      if (lh) lh.textContent = `PINS — ${state.roomId}`;
      renderPinLog();

      fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-out`;
      fadeEl.style.opacity    = "0";
      setTimeout(() => { state.transitioning = false; }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  function getNPPExit() {
    const npps = NPP[state.roomId];
    if (!npps) return null;
    for (const npp of npps) {
      if (Math.hypot(state.x - npp.x, state.y - npp.y) <= NPP_RADIUS) return npp;
    }
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
  ═══════════════════════════════════════════ */
  function drawExitArrows(now) {
    const npps = NPP[state.roomId];
    if (!npps) return;
    const sec = now / 1000;
    const [col1, col2] = roomColorPair(state.roomId);
    const OPPOSITE = { left: "right", right: "left", up: "down", down: "up" };
    const arrivalExit  = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    const distFromSpawn = Math.hypot(state.x - state.spawnX, state.y - state.spawnY);
    const arrivalRevealed = distFromSpawn >= ARRIVE_HIDE_DIST;

    npps.forEach((npp, i) => {
      if (!npp.dir) return;
      if (npp.dir === arrivalExit && !arrivalRevealed) return;

      const angle  = DIR_ANGLE[npp.dir] ?? 0;
      const pulse  = 0.5 + 0.5 * Math.sin(sec * 2.2 + i * 1.3);
      const bounce = Math.sin(sec * 2.2 + i * 1.3) * 6;
      const ax = npp.x + Math.cos(angle) * bounce;
      const ay = npp.y + Math.sin(angle) * bounce;

      const fadeAlpha = (npp.dir === arrivalExit)
        ? Math.min((distFromSpawn - ARRIVE_HIDE_DIST) / 60, 1)
        : 1;

      ctx.save();
      ctx.globalAlpha = fadeAlpha;
      ctx.translate(ax, ay);
      ctx.rotate(angle);

      const ga = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
      ga.addColorStop(0, col1); ga.addColorStop(1, "transparent");
      ctx.globalAlpha = fadeAlpha * (0.10 + pulse * 0.08);
      ctx.fillStyle = ga;
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();

      [{ ox: -11, a: 0.65 }, { ox: 4, a: 1.0 }].forEach(({ ox, a }) => {
        ctx.globalAlpha = fadeAlpha * a * (0.38 + pulse * 0.32);
        ctx.strokeStyle = col1;
        ctx.lineWidth   = 2.5;
        ctx.lineCap     = "round"; ctx.lineJoin = "round";
        ctx.shadowBlur  = 12; ctx.shadowColor = col2;
        ctx.beginPath();
        ctx.moveTo(ox - 7, -10); ctx.lineTo(ox + 7, 0); ctx.lineTo(ox - 7, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      ctx.globalAlpha = fadeAlpha * (0.60 + pulse * 0.38);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 14; ctx.shadowColor = col1;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     DRAW PORTAL ORB  (room_08 only)
     — color-cycling glow, no text, no arrows
  ═══════════════════════════════════════════ */
  const PORTAL_COLORS = [
    '#8b00ff','#00bfff','#ff007f','#00ff99','#ffaa00','#aa00ff'
  ];

  function drawPortalOrb(now) {
    if (state.roomId !== "room_08") return;

    const sec   = now / 1000;
    /* slow cycle through hue palette */
    const cycleT = (sec * 0.28) % PORTAL_COLORS.length;
    const idx0   = Math.floor(cycleT) % PORTAL_COLORS.length;
    const idx1   = (idx0 + 1) % PORTAL_COLORS.length;
    const t      = cycleT - Math.floor(cycleT);
    const col    = lerpHex(PORTAL_COLORS[idx0], PORTAL_COLORS[idx1], t);

    const pulse  = 0.5 + 0.5 * Math.sin(sec * 2.6);
    const r      = 6 + pulse * 3;   /* small orb */

    ctx.save();

    /* outer soft halo */
    const halo = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, 38);
    halo.addColorStop(0, col + "55");
    halo.addColorStop(0.45, col + "22");
    halo.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.6 + pulse * 0.35;
    ctx.fillStyle   = halo;
    ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, 38, 0, Math.PI * 2); ctx.fill();

    /* inner glow ring */
    const ring = ctx.createRadialGradient(PORTAL.x, PORTAL.y, r * 0.3, PORTAL.x, PORTAL.y, r * 2.2);
    ring.addColorStop(0, "#fff");
    ring.addColorStop(0.35, col);
    ring.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.85 + pulse * 0.12;
    ctx.shadowBlur  = 18 + pulse * 10;
    ctx.shadowColor = col;
    ctx.fillStyle   = ring;
    ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;

    ctx.restore();
  }

  /* simple hex color lerp */
  function lerpHex(a, b, t) {
    const ah = parseInt(a.replace('#',''), 16);
    const bh = parseInt(b.replace('#',''), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `rgb(${rr},${rg},${rb})`;
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
      ctx.globalAlpha = 0.80 + pulse * 0.18;
      ctx.strokeStyle = "#ff8ae2"; ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y);
      ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x, p.y + 14);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ff4fc8"; ctx.shadowBlur = 8; ctx.shadowColor = "#ff8ae2";
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = "bold 10px monospace";
      const tw = ctx.measureText(p.label).width;
      const bx = p.x + 10, by = p.y - 18;
      ctx.globalAlpha = 0.88; ctx.fillStyle = "rgba(0,0,0,.75)";
      ctx.beginPath(); ctx.roundRect(bx - 4, by - 11, tw + 10, 15, 5); ctx.fill();
      ctx.fillStyle = "#ff8ae2"; ctx.globalAlpha = 1;
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
      ctx.strokeStyle = "rgba(255,138,226,.95)"; ctx.lineWidth = 1.5;
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
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      p.life -= 0.022; p.x += p.vx; p.y += p.vy;
    }
    trail = trail.filter(p => p.life > 0);

    /* portal orb — drawn before arrows so arrows are on top */
    drawPortalOrb(now);

    /* exit arrows */
    drawExitArrows(now);

    /* ghost */
    const bobFreq  = (Math.PI * 2) / (HOVER_PERIOD / 1000);
    const bobPhase = sec * bobFreq;
    const bob      = Math.sin(bobPhase) * HOVER_AMP;
    const wobble   = Math.sin(bobPhase * 2) * 2.2;
    const gx = state.x, gy = state.y + bob;
    const pulse = 0.5 + 0.5 * Math.sin(sec * 2.1);

    const stretchY = 1 + Math.sin(bobPhase) * 0.10;
    const stretchX = 1 - Math.sin(bobPhase) * 0.07;
    const movingStretch = state.moving ? 1.08 : 1.0;
    const sx = stretchX, sy = stretchY * movingStretch;

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
    ctx.scale(sx, sy);
    if (ghostImg.complete && ghostImg.naturalWidth > 0) {
      ctx.drawImage(ghostImg, -GHOST_R, -GHOST_R, GHOST_R * 2, GHOST_R * 2);
    } else {
      ctx.globalAlpha = 1; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 0, GHOST_R * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

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
    if (!state.transitioning && !isPortalOpen()) {
      handleClickMovement(now);
      const exit = getNPPExit();
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

  function isNearPortal(p) {
    return state.roomId === "room_08" &&
           Math.hypot(p.x - PORTAL.x, p.y - PORTAL.y) <= PORTAL.r;
  }

  function bindInput() {
    stage.addEventListener("mousemove", (e) => {
      if (!state.coordMode) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      const el = document.getElementById("coord-xy");
      if (el) el.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    });

    stage.addEventListener("click", (e) => {
      startMusic();
      if (state.transitioning) return;
      const p = stagePointToWorld(e.clientX, e.clientY);

      if (state.coordMode) {
        dropPin(p.x, p.y);
        ripples.push({ x: p.x, y: p.y, life: 1 });
        return;
      }

      /* portal tap — open popup, don't move ghost */
      if (isNearPortal(p)) {
        openPortal();
        ripples.push({ x: p.x, y: p.y, life: 1 });
        return;
      }

      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
    });

    stage.addEventListener("touchend", (e) => {
      startMusic();
      if (state.transitioning || !e.changedTouches.length) return;
      const t0 = e.changedTouches[0];
      const p  = stagePointToWorld(t0.clientX, t0.clientY);

      if (state.coordMode) {
        dropPin(p.x, p.y); ripples.push({ x: p.x, y: p.y, life: 1 });
        e.preventDefault(); return;
      }

      if (isNearPortal(p)) {
        openPortal(); ripples.push({ x: p.x, y: p.y, life: 1 });
        e.preventDefault(); return;
      }

      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
      e.preventDefault();
    }, { passive: false });

    /* Esc closes popup */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePortal();
    });
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

