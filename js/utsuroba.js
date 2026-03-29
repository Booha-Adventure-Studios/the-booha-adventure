
(() => {
  const DATA = window.UTSUROBA_DATA;
  if (!DATA || !DATA.rooms) { console.error("UTSUROBA_DATA not found."); return; }

  /* ═══════════════════════════════════════════
     CONSTANTS
  ═══════════════════════════════════════════ */
  const WORLD_W         = 1536;
  const WORLD_H         = 1024;
  const GHOST_R         = 26;
  const GHOST_RADIUS    = 18;
  const BASE_SPEED      = 3.2;
  const FADE_MS         = 600;
  const CLICK_STOP_DIST = 6;
  const HOVER_AMP       = 9;
  const HOVER_PERIOD    = 1500;
  const TRAIL_MAX       = 90;

  const TARGET_DT    = 1000 / 60;
  let   lastTickTime = 0;
  let   SPEED        = BASE_SPEED;

  const DEV_MODE = false; // flip true only for local coord work

  const ARRIVAL_ARROW_DELAY_MS        = 2000;
  const ARRIVAL_ARROW_BACK_MULTIPLIER = 3;
  const TRANSITION_COOLDOWN_MS        = 1400;
  const ARROW_MOVE_THRESHOLD          = 30;

  /* ── Popup cooldown ── */
  const POPUP_COOLDOWN_MS = 900;

  /* ── Exit back to Karasuki ── */
  const KARASUKI_EXIT = {
    roomId : "room_01",   // show exit marker in utsuroba room_01 (entry room)
    x      : 742,
    y      : 876,
    r      : 44,
    href   : "karasuki.html",
  };

  /* ═══════════════════════════════════════════
     MONTH COLOURS  (muted / de-saturated)
  ═══════════════════════════════════════════ */
  const MONTH_COLORS = [
    ['#9b2c7a','#c45fa3'],
    ['#a14a2f','#c97a5a'],
    ['#2f6f8f','#6aa6c9'],
    ['#2f8f5a','#79c7a3'],
    ['#a89b2f','#d6c76a'],
    ['#2f4fa8','#7f9de0'],
    ['#6f2fa8','#b07fe0'],
    ['#a86a2f','#d6a06a'],
    ['#2f8f8a','#7fd6cf'],
    ['#7a8f2f','#b8d66a'],
    ['#a82f4f','#e07f97'],
    ['#9b2c7a','#c45fa3'],
  ];

  function monthPrimary(w)   { return MONTH_COLORS[Math.max(0,Math.min(11,Math.floor((w-1)/4)))][0]; }
  function monthSecondary(w) { return MONTH_COLORS[Math.max(0,Math.min(11,Math.floor((w-1)/4)))][1]; }

  function roomColorPair(roomId) {
    const n = parseInt((roomId || 'room_01').replace(/\D/g,''), 10) || 1;
    return MONTH_COLORS[(n - 1) % MONTH_COLORS.length];
  }

  const boohaWeek = parseInt(sessionStorage.getItem('booha_active_week') || '1', 10);

  /* ═══════════════════════════════════════════
     NPP — same 15-room topology as Karasuki
  ═══════════════════════════════════════════ */
  const NPP_RADIUS = 40;

  const NPP = {
    room_01: [
      { dir: 'right', x: 1340, y: 658,  to: 'room_02', spawn: 'fromLeft'  },
      { dir: 'up',    x: 1084, y: 250,  to: 'room_06', spawn: 'fromDown'  }
    ],
    room_02: [
      { dir: 'left',  x: 260,  y: 255,  to: 'room_01', spawn: 'fromRight' },
      { dir: 'right', x: 1340, y: 727,  to: 'room_03', spawn: 'fromLeft'  },
      { dir: 'up',    x: 765,  y: 230,  to: 'room_07', spawn: 'fromDown'  }
    ],
    room_03: [
      { dir: 'left',  x: 320,  y: 328,  to: 'room_02', spawn: 'fromRight' },
      { dir: 'right', x: 1170, y: 237,  to: 'room_04', spawn: 'fromLeft'  },
      { dir: 'up',    x: 785,  y: 270,  to: 'room_08', spawn: 'fromDown'  }
    ],
    room_04: [
      { dir: 'left',  x: 210,  y: 635,  to: 'room_03', spawn: 'fromRight' },
      { dir: 'right', x: 1330, y: 734,  to: 'room_05', spawn: 'fromLeft'  },
      { dir: 'up',    x: 548,  y: 270,  to: 'room_09', spawn: 'fromDown'  }
    ],
    room_05: [
      { dir: 'left',  x: 212,  y: 642,  to: 'room_04', spawn: 'fromRight' },
      { dir: 'up',    x: 435,  y: 310,  to: 'room_10', spawn: 'fromDown'  }
    ],
    room_06: [
      { dir: 'right', x: 1229, y: 652,  to: 'room_07', spawn: 'fromLeft'  },
      { dir: 'up',    x: 1065, y: 239,  to: 'room_11', spawn: 'fromDown'  },
      { dir: 'down',  x: 623,  y: 840,  to: 'room_01', spawn: 'fromUp'    }
    ],
    room_07: [
      { dir: 'left',  x: 160,  y: 687,  to: 'room_06', spawn: 'fromRight' },
      { dir: 'right', x: 1220, y: 614,  to: 'room_08', spawn: 'fromLeft'  },
      { dir: 'up',    x: 555,  y: 250,  to: 'room_12', spawn: 'fromDown'  },
      { dir: 'down',  x: 901,  y: 800,  to: 'room_02', spawn: 'fromUp'    }
    ],
    room_08: [
      { dir: 'left',  x: 190,  y: 776,  to: 'room_07', spawn: 'fromRight' },
      { dir: 'right', x: 1390, y: 592,  to: 'room_09', spawn: 'fromLeft'  },
      { dir: 'up',    x: 984,  y: 240,  to: 'room_13', spawn: 'fromDown'  },
      { dir: 'down',  x: 848,  y: 847,  to: 'room_03', spawn: 'fromUp'    }
    ],
    room_09: [
      { dir: 'left',  x: 160,  y: 702,  to: 'room_08', spawn: 'fromRight' },
      { dir: 'right', x: 1365, y: 224,  to: 'room_10', spawn: 'fromLeft'  },
      { dir: 'up',    x: 449,  y: 270,  to: 'room_14', spawn: 'fromDown'  },
      { dir: 'down',  x: 918,  y: 800,  to: 'room_04', spawn: 'fromUp'    }
    ],
    room_10: [
      { dir: 'left',  x: 160,  y: 702,  to: 'room_09', spawn: 'fromRight' },
      { dir: 'up',    x: 838,  y: 270,  to: 'room_15', spawn: 'fromDown'  },
      { dir: 'down',  x: 776,  y: 800,  to: 'room_05', spawn: 'fromUp'    }
    ],
    room_11: [
      { dir: 'right', x: 1250, y: 312,  to: 'room_12', spawn: 'fromLeft'  },
      { dir: 'down',  x: 804,  y: 800,  to: 'room_06', spawn: 'fromUp'    }
    ],
    room_12: [
      { dir: 'left',  x: 290,  y: 344,  to: 'room_11', spawn: 'fromRight' },
      { dir: 'right', x: 1251, y: 671,  to: 'room_13', spawn: 'fromLeft'  },
      { dir: 'down',  x: 751,  y: 820,  to: 'room_07', spawn: 'fromUp'    }
    ],
    room_13: [
      { dir: 'left',  x: 200,  y: 568,  to: 'room_12', spawn: 'fromRight' },
      { dir: 'right', x: 1310, y: 242,  to: 'room_14', spawn: 'fromLeft'  },
      { dir: 'down',  x: 910,  y: 820,  to: 'room_08', spawn: 'fromUp'    }
    ],
    room_14: [
      { dir: 'left',  x: 303,  y: 631,  to: 'room_13', spawn: 'fromRight' },
      { dir: 'right', x: 1370, y: 716,  to: 'room_15', spawn: 'fromLeft'  },
      { dir: 'down',  x: 751,  y: 820,  to: 'room_09', spawn: 'fromUp'    }
    ],
    room_15: [
      { dir: 'left',  x: 200,  y: 568,  to: 'room_14', spawn: 'fromRight' },
      { dir: 'down',  x: 663,  y: 800,  to: 'room_10', spawn: 'fromUp'    }
    ]
  };

  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

  let arrivalArrowHiddenUntil     = 0;
  let arrivalArrowBackHiddenUntil = 0;

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */
  const state = {
    roomId: (() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || DATA.startRoom;
    })(),
    spawnId             : 'default',
    x                   : 742,
    y                   : 512,
    spawnX              : 742,
    spawnY              : 512,
    arrivalDir          : null,
    transitioning       : false,
    transitionReadyAt   : 0,
    clickTarget         : null,
    moving              : false,
    distMovedSinceSpawn : 0,
    coordMode           : false,
    musicStarted        : false,
    lastTrailT          : 0,
    spawnLockUntil      : 0,
    exitingToKarasuki   : false,
  };

  let pins    = [];
  let trail   = [];
  let ripples = [];

  const ghostImg = new Image();
  ghostImg.src   = './assets/img/booha_ghost.png';

  const music  = new Audio('./assets/audio/utsuroba-music.mp3');
  music.loop   = true;
  music.volume = 0.65;

  let app, stage, canvas, ctx, roomLayer;
  let coordToggle, coordReadout, pinLog; // dev only

  /* ── Exit popup ── */
  let exitPopOverlay     = null;
  let exitPopCooldownUntil = 0;

  /* ═══════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════ */
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
      body{display:grid;place-items:center;}
      #utsuroba-app{position:relative;width:100vw;height:100vh;overflow:hidden;background:#000;}
      #utsuroba-stage{position:absolute;left:50%;top:50%;width:${WORLD_W}px;height:${WORLD_H}px;transform-origin:50% 50%;overflow:hidden;cursor:crosshair;}
      #utsuroba-room-layer{position:absolute;inset:0;}
      .utsuroba-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;pointer-events:none;user-select:none;}
      #buki-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #buki-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20;}
      /* rotate overlay */
      #rotate-overlay{display:none;position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:32px;}
      @media screen and (orientation:portrait) and (max-width:1023px){#rotate-overlay{display:flex !important;}}
      .rotate-phone{font-size:64px;display:block;animation:rotatehint 2.4s ease-in-out infinite;transform-origin:center;}
      @keyframes rotatehint{0%,100%{transform:rotate(0deg);}40%,60%{transform:rotate(-90deg);}}
      .rotate-bar{width:120px;height:3px;border-radius:999px;background:linear-gradient(90deg,#9b2c7a,#c45fa3,#9b2c7a);background-size:200%;animation:barshimmer 2s linear infinite;box-shadow:0 0 14px rgba(155,44,122,.5);}
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{font-family:system-ui,-apple-system,sans-serif;font-size:clamp(18px,5vw,28px);font-weight:900;letter-spacing:1px;color:#fff;margin:0;}
      .rotate-sub{font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;}
      /* exit popup */
      @keyframes utsuAppear{from{opacity:0;transform:scale(0.93) translateY(6px);}to{opacity:1;transform:scale(1) translateY(0);}}
      /* dev tools */
      #buki-coord-toggle{position:fixed;bottom:18px;right:18px;z-index:200;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.80);color:#a8d8a8;font:700 11px/1 monospace;padding:7px 13px;border-radius:20px;cursor:pointer;border:1px solid rgba(168,216,168,.40);user-select:none;letter-spacing:.06em;}
      .toggle-pill{width:30px;height:16px;border-radius:8px;background:rgba(168,216,168,.18);position:relative;transition:background .2s;}
      .toggle-pill::after{content:"";position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:#a8d8a8;transition:transform .2s;}
      #buki-coord-toggle.active .toggle-pill{background:rgba(168,216,168,.55);}
      #buki-coord-toggle.active .toggle-pill::after{transform:translateX(14px);}
      #buki-coord-readout{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:200;background:rgba(0,0,0,.80);color:#a8d8a8;font:700 13px/1.4 monospace;padding:6px 16px;border-radius:20px;pointer-events:none;border:1px solid rgba(168,216,168,.30);letter-spacing:.05em;opacity:0;transition:opacity .2s;white-space:nowrap;text-align:center;}
      #buki-coord-readout.show{opacity:1;}
      #buki-coord-readout .hint{font-size:10px;color:rgba(168,216,168,.55);display:block;margin-top:2px;}
      #buki-pin-log{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:200;max-height:60vh;overflow-y:auto;background:rgba(0,0,0,.85);border:1px solid rgba(168,216,168,.25);border-radius:14px;padding:10px 12px;font:700 11px/1.6 monospace;color:#a8d8a8;letter-spacing:.04em;display:none;min-width:160px;}
      #buki-pin-log.show{display:block;}
      #buki-pin-log .pin-row{display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(168,216,168,.12);cursor:pointer;}
      #buki-pin-log .pin-row:last-child{border-bottom:none;}
      #buki-pin-log .pin-row:hover{color:#fff;}
      #buki-pin-log .pin-idx{min-width:18px;text-align:right;color:rgba(168,216,168,.55);font-size:10px;}
      #buki-pin-log .pin-coords{flex:1;}
      #buki-pin-log .pin-copy{font-size:9px;color:rgba(168,216,168,.45);padding:1px 5px;border-radius:6px;border:1px solid rgba(168,216,168,.2);}
      #buki-pin-log .pin-row:hover .pin-copy{color:#fff;border-color:rgba(168,216,168,.6);}
      #buki-pin-log .log-header{font-size:9px;color:rgba(168,216,168,.45);letter-spacing:.12em;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;}
      #buki-pin-log .clear-btn{font-size:9px;color:rgba(168,216,168,.4);cursor:pointer;padding:1px 6px;border-radius:6px;border:1px solid rgba(168,216,168,.18);}
      #buki-pin-log .clear-btn:hover{color:#fff;border-color:rgba(168,216,168,.6);}
      #buki-copy-toast{position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:300;background:rgba(20,0,30,.92);color:#fff;font:700 12px/1 monospace;padding:6px 18px;border-radius:20px;pointer-events:none;opacity:0;transition:opacity .18s;letter-spacing:.05em;}
      #buki-copy-toast.show{opacity:1;}
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════
     DEV PANEL
  ═══════════════════════════════════════════ */
  function injectDevPanel() {
    if (document.getElementById('buki-dev-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'buki-dev-panel';
    panel.style.cssText = `position:fixed;bottom:60px;right:18px;z-index:9999;background:rgba(0,0,0,.88);border:1px solid rgba(168,216,168,.4);border-radius:10px;padding:10px 14px;font:700 11px/1.8 monospace;color:#a8d8a8;letter-spacing:.06em;min-width:160px;box-shadow:0 0 20px rgba(168,216,168,.15);`;
    panel.innerHTML = `<div style="font-size:9px;color:rgba(168,216,168,.5);letter-spacing:.14em;margin-bottom:6px;">DEV — utsuroba</div><div id="buki-dev-room-info" style="font-size:9px;color:rgba(168,216,168,.45);margin-top:4px;"></div>`;
    document.body.appendChild(panel);
    setInterval(() => { const el = document.getElementById('buki-dev-room-info'); if (el) el.textContent = `room: ${state.roomId} | moved: ${Math.round(state.distMovedSinceSpawn)}`; }, 200);
  }

  /* ═══════════════════════════════════════════
     EXIT POPUP — back to Karasuki
  ═══════════════════════════════════════════ */
  function injectExitPopOverlay() {
    if (exitPopOverlay) return;
    exitPopOverlay = document.createElement('div');
    exitPopOverlay.id = 'utsuroba-exit-overlay';
    exitPopOverlay.style.cssText = `
      display:none; position:fixed; inset:0; z-index:9200;
      align-items:center; justify-content:center;
      background:rgba(0,0,0,0); transition:background 0.35s ease;`;

    exitPopOverlay.innerHTML = `
      <div id="utsuroba-exit-box" style="
        background:#04000a;
        border:1px solid #1e0030;
        border-radius:4px;
        padding:clamp(26px,5vw,42px) clamp(22px,6vw,50px) clamp(20px,4vw,34px);
        max-width:min(420px,92vw); width:92vw;
        text-align:center;
        box-shadow:
          0 0 0 1px rgba(60,0,100,.5),
          0 0 36px rgba(30,0,60,.75),
          0 0 80px rgba(15,0,35,.5),
          inset 0 0 50px rgba(0,0,0,.65);
        font-family:'Georgia',serif;
        position:relative;
        animation:utsuAppear 0.3s ease-out;">

        <div style="position:absolute;top:9px;left:9px;width:14px;height:14px;border:1px solid rgba(60,0,100,.55);border-right:none;border-bottom:none;"></div>
        <div style="position:absolute;top:9px;right:9px;width:14px;height:14px;border:1px solid rgba(60,0,100,.55);border-left:none;border-bottom:none;"></div>
        <div style="position:absolute;bottom:9px;left:9px;width:14px;height:14px;border:1px solid rgba(60,0,100,.55);border-right:none;border-top:none;"></div>
        <div style="position:absolute;bottom:9px;right:9px;width:14px;height:14px;border:1px solid rgba(60,0,100,.55);border-left:none;border-top:none;"></div>

        <button id="utsuroba-exit-close" style="
          position:absolute;top:11px;right:13px;
          background:transparent;border:none;cursor:pointer;
          font-size:.95rem;color:rgba(80,0,130,.5);
          transition:color .18s;padding:4px 7px;">✕</button>

        <p id="utsuroba-exit-en" style="
          font-size:clamp(.88rem,3vw,1.04rem); color:#b090d0;
          margin:0 0 10px; line-height:1.6; letter-spacing:.04em;
          text-shadow:0 0 16px rgba(100,0,160,.35);">
          Do you want to leave Utsuroba?
        </p>
        <p id="utsuroba-exit-jp" style="
          font-size:clamp(.78rem,2.5vw,.92rem); color:#8060a8;
          margin:0 0 6px; letter-spacing:.07em;">
          うつろばを出ますか？
        </p>
        <p id="utsuroba-exit-kanji" style="
          font-size:clamp(.7rem,2.1vw,.82rem); color:#503070;
          margin:0 0 26px; letter-spacing:.12em; opacity:.65;">
          空洞場を去りますか？
        </p>

        <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
          <button id="utsuroba-exit-yes" style="
            background:rgba(35,0,60,.3); font-family:'Georgia',serif;
            font-size:clamp(.8rem,2.7vw,.92rem); letter-spacing:.12em;
            cursor:pointer; padding:8px 28px; border-radius:2px;
            border:1px solid rgba(100,0,160,.65); color:#c8a0e8;
            transition:all .2s;">はい / Yes</button>
          <button id="utsuroba-exit-no" style="
            background:transparent; font-family:'Georgia',serif;
            font-size:clamp(.8rem,2.7vw,.92rem); letter-spacing:.12em;
            cursor:pointer; padding:8px 28px; border-radius:2px;
            border:1px solid rgba(45,15,65,.6); color:#6a4888;
            transition:all .2s;">いいえ / No</button>
        </div>
      </div>`;

    document.body.appendChild(exitPopOverlay);

    document.getElementById('utsuroba-exit-close').addEventListener('click', closeExitPop);
    document.getElementById('utsuroba-exit-no').addEventListener('click', closeExitPop);
    document.getElementById('utsuroba-exit-yes').addEventListener('click', doExitToKarasuki);
    exitPopOverlay.addEventListener('click', e => { if (e.target === exitPopOverlay) closeExitPop(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isExitPopOpen()) closeExitPop(); });
  }

  function openExitPop() {
    exitPopOverlay.style.display    = 'flex';
    exitPopOverlay.style.background = 'rgba(0,0,0,0.88)';
    state.clickTarget = null;
  }

  function closeExitPop() {
    exitPopCooldownUntil = performance.now() + POPUP_COOLDOWN_MS;
    exitPopOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { exitPopOverlay.style.display = 'none'; }, 350);
  }

  function isExitPopOpen() {
    return exitPopOverlay && exitPopOverlay.style.display === 'flex';
  }

  function doExitToKarasuki() {
    if (state.exitingToKarasuki) return;
    state.exitingToKarasuki = true;
    state.clickTarget = null; state.moving = false;
    try { music.pause(); music.currentTime = 0; } catch (_) {}

    exitPopOverlay.style.background = 'rgba(0,0,0,0)';
    exitPopOverlay.style.display    = 'none';

    const fadeEl = document.getElementById('buki-fade');
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity    = '1';

    setTimeout(() => {
      try { sessionStorage.setItem('utsuroba_return_room', 'room_15'); } catch (_) {}
      window.location.href = KARASUKI_EXIT.href;
    }, FADE_MS + 60);
  }

  /* ── Draw exit arrow for room_01 ── */
  function drawKarasukiExitArrow(now) {
    if (state.roomId !== KARASUKI_EXIT.roomId) return;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    if (moveReveal <= 0) return;

    const sec    = now / 1000;
    const pulse  = 0.5 + 0.5 * Math.sin(sec * 1.6);
    const bounce = Math.sin(sec * 1.6) * 7;
    const ax = KARASUKI_EXIT.x;
    const ay = KARASUKI_EXIT.y + bounce;

    // Muted crimson palette — distinct from the NPP arrows
    const col1 = '#6b1a2a';
    const col2 = '#a03050';
    const col3 = '#c06080';

    ctx.save();
    ctx.globalAlpha = moveReveal;

    // ambient glow
    const ambient = ctx.createRadialGradient(ax, ay, 0, ax, ay, 52);
    ambient.addColorStop(0, col1 + '44'); ambient.addColorStop(0.5, col2 + '22'); ambient.addColorStop(1, 'transparent');
    ctx.globalAlpha = moveReveal * (0.18 + pulse * 0.12); ctx.fillStyle = ambient;
    ctx.beginPath(); ctx.arc(ax, ay, 52, 0, Math.PI * 2); ctx.fill();

    // arrow pointing down (exit direction)
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.PI / 2);
    [{ ox: -12, a: 0.5 }, { ox: 5, a: 0.9 }].forEach(({ ox, a }) => {
      ctx.globalAlpha = moveReveal * a * (0.35 + pulse * 0.32);
      ctx.strokeStyle = col2; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowBlur = 12; ctx.shadowColor = col1;
      ctx.beginPath(); ctx.moveTo(ox - 8, -11); ctx.lineTo(ox + 8, 0); ctx.lineTo(ox - 8, 11); ctx.stroke();
      ctx.shadowBlur = 0;
    });
    ctx.restore();

    // dot
    ctx.globalAlpha = moveReveal * (0.65 + pulse * 0.28); ctx.shadowBlur = 16; ctx.shadowColor = col2;
    const dotG = ctx.createRadialGradient(ax, ay, 0, ax, ay, 6);
    dotG.addColorStop(0, col3); dotG.addColorStop(0.5, col2); dotG.addColorStop(1, 'transparent');
    ctx.fillStyle = dotG; ctx.beginPath(); ctx.arc(ax, ay, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

    // label
    ctx.globalAlpha = moveReveal * (0.50 + pulse * 0.22);
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = col3; ctx.textAlign = 'center';
    ctx.shadowBlur = 8; ctx.shadowColor = col1;
    ctx.fillText('LEAVE', ax, ay - 26); ctx.shadowBlur = 0; ctx.textAlign = 'left';

    ctx.restore();
  }

  /* ── Proximity walk-in check ── */
  function checkKarasukiExit() {
    if (state.roomId !== KARASUKI_EXIT.roomId) return;
    if (performance.now() < exitPopCooldownUntil) return;
    if (state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    if (Math.hypot(state.x - KARASUKI_EXIT.x, state.y - KARASUKI_EXIT.y) <= KARASUKI_EXIT.r) {
      state.clickTarget = null; state.moving = false;
      openExitPop();
    }
  }

  function clickCheckKarasukiExit(worldX, worldY) {
    if (state.roomId !== KARASUKI_EXIT.roomId) return false;
    if (performance.now() < exitPopCooldownUntil) return false;
    if (Math.hypot(worldX - KARASUKI_EXIT.x, worldY - KARASUKI_EXIT.y) <= KARASUKI_EXIT.r) {
      openExitPop(); return true;
    }
    return false;
  }

  /* ═══════════════════════════════════════════
     DOM BUILD
  ═══════════════════════════════════════════ */
  function buildApp() {
    app       = document.createElement('div'); app.id = 'utsuroba-app';
    stage     = document.createElement('div'); stage.id = 'utsuroba-stage';
    roomLayer = document.createElement('div'); roomLayer.id = 'utsuroba-room-layer';
    canvas    = document.createElement('canvas'); canvas.id = 'buki-canvas';
    const fade = document.createElement('div'); fade.id = 'buki-fade';

    stage.appendChild(roomLayer); stage.appendChild(canvas); stage.appendChild(fade);
    app.appendChild(stage);

    const toast = document.createElement('div');
    toast.id = 'buki-copy-toast'; toast.textContent = 'copied!';

    document.body.innerHTML = '';
    document.body.appendChild(app);
    document.body.appendChild(toast);

    injectExitPopOverlay();

    if (DEV_MODE) {
      coordToggle = document.createElement('div');
      coordToggle.id = 'buki-coord-toggle';
      coordToggle.innerHTML = '<span>COORDS</span><div class="toggle-pill"></div>';
      coordToggle.addEventListener('click', toggleCoordMode);

      coordReadout = document.createElement('div');
      coordReadout.id = 'buki-coord-readout';
      coordReadout.innerHTML = '<span id="buki-coord-xy">—</span><span class="hint">click to pin · hover to read</span>';

      pinLog = document.createElement('div');
      pinLog.id = 'buki-pin-log';
      pinLog.innerHTML = `<div class="log-header"><span>PINS — ${state.roomId}</span><span class="clear-btn" id="buki-clear-pins">CLEAR</span></div><div id="buki-pin-rows"></div>`;

      document.body.appendChild(coordToggle);
      document.body.appendChild(coordReadout);
      document.body.appendChild(pinLog);

      document.getElementById('buki-clear-pins').addEventListener('click', () => { pins = []; renderPinLog(); });
      injectDevPanel();
    }

    const rotateOverlay = document.createElement('div');
    rotateOverlay.id = 'rotate-overlay';
    rotateOverlay.innerHTML = `
      <span class="rotate-phone">📱</span>
      <div class="rotate-bar"></div>
      <p class="rotate-title">横にして遊ぼう！</p>
      <p class="rotate-sub">うつろばは<strong style="color:#c45fa3">横画面</strong>で遊べるよ。<br>スマホを横にしてね。</p>`;
    document.body.appendChild(rotateOverlay);

    ctx = canvas.getContext('2d');
  }

  /* ═══════════════════════════════════════════
     CANVAS / FIT
  ═══════════════════════════════════════════ */
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width  = WORLD_W + 'px'; canvas.style.height = WORLD_H + 'px';
    canvas.width  = Math.round(WORLD_W * dpr); canvas.height = Math.round(WORLD_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function fitStage() {
    const scale = Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /* ═══════════════════════════════════════════
     COORD MODE  (dev only)
  ═══════════════════════════════════════════ */
  function toggleCoordMode() {
    state.coordMode = !state.coordMode;
    coordToggle.classList.toggle('active', state.coordMode);
    coordReadout.classList.toggle('show',  state.coordMode);
    pinLog.classList.toggle('show',        state.coordMode);
    pinLog.querySelector('.log-header span').textContent = `PINS — ${state.roomId}`;
  }

  function dropPin(wx, wy) {
    const label = `${Math.round(wx)}, ${Math.round(wy)}`;
    pins.push({ x: wx, y: wy, label }); renderPinLog(); copyText(label); showToast(`pinned ${label}`);
  }

  function renderPinLog() {
    const rows = document.getElementById('buki-pin-rows'); if (!rows) return;
    rows.innerHTML = pins.map((p, i) => `<div class="pin-row" data-i="${i}"><span class="pin-idx">${i + 1}</span><span class="pin-coords">${p.label}</span><span class="pin-copy">copy</span></div>`).join('');
    rows.querySelectorAll('.pin-row').forEach(row => { row.addEventListener('click', () => { const pin = pins[+row.dataset.i]; if (pin) { copyText(pin.label); showToast(`copied ${pin.label}`); } }); });
  }

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById('buki-copy-toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
  }

  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return; } catch (_) {}
    try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch (_) {}
  }

  /* ═══════════════════════════════════════════
     ROOM HELPERS
  ═══════════════════════════════════════════ */
  function getRoom()  { return DATA.rooms[state.roomId]; }

  function getSpawn(room, spawnId) {
    return room.spawns?.[spawnId] || room.spawns?.default || { x: 742, y: 512 };
  }

  function placeGhost(x, y) { state.x = x; state.y = y; }

  function makeBg(src) {
    const img = document.createElement('img'); img.className = 'utsuroba-bg'; img.src = src; return img;
  }

  let currentBg;

  function renderInitialRoom() {
    const room  = getRoom(); currentBg = makeBg(room.bg); roomLayer.appendChild(currentBg);
    const spawn = getSpawn(room, state.spawnId); placeGhost(spawn.x, spawn.y);
    state.spawnX = spawn.x; state.spawnY = spawn.y;
    const now = performance.now();
    state.transitionReadyAt     = now + TRANSITION_COOLDOWN_MS;
    arrivalArrowHiddenUntil     = now + ARRIVAL_ARROW_DELAY_MS;
    arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
    state.distMovedSinceSpawn   = 0;
    state.clickTarget           = null;
    state.moving                = false;
    state.spawnLockUntil        = now + 500;
  }

  /* ═══════════════════════════════════════════
     COLLISION
  ═══════════════════════════════════════════ */
  function clampToWorld(nx, ny) { return { x: Math.max(GHOST_RADIUS, Math.min(WORLD_W - GHOST_RADIUS, nx)), y: Math.max(GHOST_RADIUS, Math.min(WORLD_H - GHOST_RADIUS, ny)) }; }
  function pointInRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }
  function canMoveTo(nx, ny) { const rects = getRoom()?.collisions || []; if (!rects.length) return true; for (const r of rects) { if (pointInRect(nx, ny, r)) return true; } return false; }
  function tryMove(nx, ny) {
    const c = clampToWorld(nx, ny); if (canMoveTo(c.x, c.y)) { placeGhost(c.x, c.y); return true; }
    const tx = clampToWorld(nx, state.y); if (canMoveTo(tx.x, tx.y)) { placeGhost(tx.x, tx.y); return true; }
    const ty = clampToWorld(state.x, ny); if (canMoveTo(ty.x, ty.y)) { placeGhost(ty.x, ty.y); return true; }
    return false;
  }

  /* ═══════════════════════════════════════════
     FADE TRANSITION
  ═══════════════════════════════════════════ */
  function transitionTo(exit) {
    if (!exit?.to || state.transitioning) return;
    const nextRoom = DATA.rooms[exit.to]; if (!nextRoom) return;
    state.transitioning = true; state.clickTarget = null;
    const fadeEl = document.getElementById('buki-fade');
    fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-in`; fadeEl.style.opacity = '1';
    setTimeout(() => {
      const nextBg = makeBg(nextRoom.bg); roomLayer.innerHTML = ''; roomLayer.appendChild(nextBg); currentBg = nextBg;
      state.roomId     = exit.to;
      state.spawnId    = exit.spawn || 'default';
      const spawn      = getSpawn(nextRoom, state.spawnId); placeGhost(spawn.x, spawn.y);
      state.spawnX     = spawn.x; state.spawnY = spawn.y;
      state.arrivalDir = exit.dir || null;
      trail = []; pins = [];
      const now = performance.now();
      state.transitionReadyAt     = now + TRANSITION_COOLDOWN_MS;
      arrivalArrowHiddenUntil     = now + ARRIVAL_ARROW_DELAY_MS;
      arrivalArrowBackHiddenUntil = now + ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER;
      state.distMovedSinceSpawn   = 0;
      state.spawnLockUntil        = now + 500;
      if (DEV_MODE) { const lh = pinLog?.querySelector('.log-header span'); if (lh) lh.textContent = `PINS — ${state.roomId}`; renderPinLog(); }
      fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-out`; fadeEl.style.opacity = '0';
      setTimeout(() => { state.transitioning = false; }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  function getNPPExit(now) {
    if (now < state.transitionReadyAt) return null;
    const npps = NPP[state.roomId]; if (!npps) return null;
    const OPPOSITE = { left:'right', right:'left', up:'down', down:'up' };
    const arrivalExit = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    for (const npp of npps) {
      if (Math.hypot(state.x - npp.x, state.y - npp.y) <= NPP_RADIUS) {
        if (npp.dir === arrivalExit && now < arrivalArrowBackHiddenUntil) return null;
        return npp;
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════
     TRAIL
  ═══════════════════════════════════════════ */
  function addTrailParticle(x, y, now) {
    if (now - state.lastTrailT < 45) return; state.lastTrailT = now;
    const [col1, col2] = roomColorPair(state.roomId);
    trail.push({ x: x + (Math.random() - 0.5) * 10, y: y + GHOST_R * 0.55 + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 0.4, vy: -Math.random() * 0.5, life: 1, size: 2 + Math.random() * 4.5, color: Math.random() > 0.5 ? col1 : col2 });
    if (trail.length > TRAIL_MAX) trail.shift();
  }

  /* ═══════════════════════════════════════════
     DRAW EXIT ARROWS
  ═══════════════════════════════════════════ */
  function drawExitArrows(now) {
    const npps = NPP[state.roomId]; if (!npps) return;
    const moved = state.distMovedSinceSpawn; const moveReveal = Math.min(1, moved / ARROW_MOVE_THRESHOLD);
    if (moveReveal <= 0) return;
    const sec = now / 1000; const [col1, col2] = roomColorPair(state.roomId);
    const OPPOSITE = { left:'right', right:'left', up:'down', down:'up' };
    const arrivalExit = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    npps.forEach((npp, i) => {
      if (!npp.dir) return;
      const isBackDir   = (npp.dir === arrivalExit);
      const hiddenUntil = isBackDir ? arrivalArrowBackHiddenUntil : arrivalArrowHiddenUntil;
      const delayRemaining = hiddenUntil - now;
      if (delayRemaining > 400) return;
      const revealFade = Math.min(1, Math.max(0, 1 - (delayRemaining / (isBackDir ? ARRIVAL_ARROW_DELAY_MS * ARRIVAL_ARROW_BACK_MULTIPLIER : ARRIVAL_ARROW_DELAY_MS))));
      const angle = DIR_ANGLE[npp.dir] ?? 0; const pulse = 0.5 + 0.5 * Math.sin(sec * 2.2 + i * 1.3);
      const bounce = Math.sin(sec * 2.2 + i * 1.3) * 6;
      const ax = npp.x + Math.cos(angle) * bounce; const ay = npp.y + Math.sin(angle) * bounce;
      const fadeAlpha = revealFade * moveReveal;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(angle);
      const ga = ctx.createRadialGradient(0, 0, 0, 0, 0, 40); ga.addColorStop(0, col1); ga.addColorStop(1, 'transparent');
      ctx.globalAlpha = fadeAlpha * (0.10 + pulse * 0.08); ctx.fillStyle = ga;
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
      [{ ox: -11, a: 0.65 }, { ox: 4, a: 1.0 }].forEach(({ ox, a }) => {
        ctx.globalAlpha = fadeAlpha * a * (0.38 + pulse * 0.32); ctx.strokeStyle = col1; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowBlur = 12; ctx.shadowColor = col2;
        ctx.beginPath(); ctx.moveTo(ox - 7, -10); ctx.lineTo(ox + 7, 0); ctx.lineTo(ox - 7, 10); ctx.stroke(); ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = fadeAlpha * (0.60 + pulse * 0.38); ctx.fillStyle = '#fff'; ctx.shadowBlur = 14; ctx.shadowColor = col1;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     DRAW PINS  (dev only)
  ═══════════════════════════════════════════ */
  function drawPins(now) {
    if (!state.coordMode || !pins.length) return;
    const sec = now / 1000;
    pins.forEach((p, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(sec * 3 + i);
      ctx.save();
      ctx.globalAlpha = 0.80 + pulse * 0.18; ctx.strokeStyle = '#a8d8a8'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y); ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x, p.y + 14); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.fillStyle = '#5faa7a'; ctx.shadowBlur = 8; ctx.shadowColor = '#a8d8a8';
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = 'bold 10px monospace'; const tw = ctx.measureText(p.label).width;
      const bx = p.x + 10, by = p.y - 18;
      ctx.globalAlpha = 0.88; ctx.fillStyle = 'rgba(0,0,0,.75)';
      ctx.beginPath(); ctx.roundRect(bx - 4, by - 11, tw + 10, 15, 5); ctx.fill();
      ctx.fillStyle = '#a8d8a8'; ctx.globalAlpha = 1; ctx.fillText(`${i + 1}. ${p.label}`, bx + 1, by);
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
      const rp = ripples[i]; rp.life -= 0.038;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = rp.life * 0.72;
      ctx.strokeStyle = col1 + 'cc'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, (1 - rp.life) * 38 + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    /* trail */
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
      gr.addColorStop(0, p.color); gr.addColorStop(1, 'transparent');
      ctx.globalAlpha = p.life * 0.48; ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.life * 0.90; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; p.life -= 0.022; p.x += p.vx; p.y += p.vy;
    }
    trail = trail.filter(p => p.life > 0);

    drawExitArrows(now);
    drawKarasukiExitArrow(now);

    /* ghost */
    const bobFreq  = (Math.PI * 2) / (HOVER_PERIOD / 1000);
    const bobPhase = sec * bobFreq;
    const bob      = Math.sin(bobPhase) * HOVER_AMP;
    const wobble   = Math.sin(bobPhase * 2) * 2.2;
    const gx = state.x, gy = state.y + bob;
    const pulse = 0.5 + 0.5 * Math.sin(sec * 2.1);
    const stretchY = 1 + Math.sin(bobPhase) * 0.10;
    const stretchX = 1 - Math.sin(bobPhase) * 0.07;
    const sx = stretchX, sy = stretchY * (state.moving ? 1.08 : 1.0);

    ctx.save();
    ctx.globalAlpha = 0.22 + pulse * 0.12;
    const halo = ctx.createRadialGradient(gx, gy + 3, 0, gx, gy + 3, GHOST_R * 2.2);
    halo.addColorStop(0, col1); halo.addColorStop(0.5, col2); halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gx, gy + 3, GHOST_R * 2.2, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 0.18 + pulse * 0.07;
    const shd = ctx.createRadialGradient(gx, gy + GHOST_R * 0.85, 0, gx, gy + GHOST_R * 0.85, GHOST_R * 0.9);
    shd.addColorStop(0, 'rgba(0,0,0,.65)'); shd.addColorStop(1, 'transparent');
    ctx.fillStyle = shd; ctx.beginPath(); ctx.arc(gx, gy + GHOST_R * 0.85, GHOST_R * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save(); ctx.translate(gx, gy); ctx.rotate(wobble * Math.PI / 180); ctx.scale(sx, sy);
    if (ghostImg.complete && ghostImg.naturalWidth > 0) {
      ctx.drawImage(ghostImg, -GHOST_R, -GHOST_R, GHOST_R * 2, GHOST_R * 2);
    } else {
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, GHOST_R * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    if (DEV_MODE) drawPins(now);
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
    const prevX = state.x, prevY = state.y;
    const moved = tryMove(state.x + (dx / dist) * SPEED, state.y + (dy / dist) * SPEED);
    state.moving = moved;
    if (!moved) { state.clickTarget = null; state.moving = false; }
    else { state.distMovedSinceSpawn += Math.hypot(state.x - prevX, state.y - prevY); addTrailParticle(state.x, state.y, now); }
  }

  /* ═══════════════════════════════════════════
     MAIN LOOP
  ═══════════════════════════════════════════ */
  function tick(now) {
    const dt = Math.min(50, Math.max(8, now - (lastTickTime || now)));
    lastTickTime = now;
    SPEED = BASE_SPEED * (dt / TARGET_DT);

    const anyModalOpen = state.transitioning || isExitPopOpen() || state.exitingToKarasuki;

    if (!anyModalOpen) {
      handleClickMovement(now);

      const spawnUnlocked =
        now >= state.spawnLockUntil &&
        state.distMovedSinceSpawn >= ARROW_MOVE_THRESHOLD;

      if (spawnUnlocked) checkKarasukiExit();

      if (spawnUnlocked) {
        const exit = getNPPExit(now);
        if (exit) { state.clickTarget = null; state.moving = false; transitionTo(exit); }
      }
    }

    drawFrame(now);
    requestAnimationFrame(tick);
  }

  /* ═══════════════════════════════════════════
     MUSIC  — first click anywhere starts loop
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
    if (DEV_MODE) {
      stage.addEventListener('mousemove', (e) => {
        if (!state.coordMode) return;
        const p  = stagePointToWorld(e.clientX, e.clientY);
        const el = document.getElementById('buki-coord-xy');
        if (el) el.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
      });
    }

    stage.addEventListener('click', (e) => {
      startMusic();
      if (state.transitioning) return;
      const p = stagePointToWorld(e.clientX, e.clientY);
      if (DEV_MODE && state.coordMode) { dropPin(p.x, p.y); ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      if (clickCheckKarasukiExit(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
    });

    stage.addEventListener('touchend', (e) => {
      startMusic();
      if (state.transitioning || !e.changedTouches.length) return;
      const t0 = e.changedTouches[0];
      const p  = stagePointToWorld(t0.clientX, t0.clientY);
      if (DEV_MODE && state.coordMode) { dropPin(p.x, p.y); ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      if (clickCheckKarasukiExit(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
      e.preventDefault();
    }, { passive: false });

    // Music also starts on any document interaction — matches karasuki pattern
    document.addEventListener('click',    startMusic, { once: false });
    document.addEventListener('touchend', startMusic, { once: false, passive: true });
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
    window.addEventListener('resize', () => { fitStage(); resizeCanvas(); });
    requestAnimationFrame(tick);
  }

  init();
})();
