
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

  const PORTAL = { x: 357, y: 342, r: 40, href: "adventure-profile.html" };

  const MAZE_EXIT = {
    roomId  : "room_03",
    x       : 785,
    y       : 870,
    r       : 44,
    mazeUrl : "maze.html",
    treeIX  : 535,
    treeIY  : 300,
  };

  const ARRIVAL_ARROW_DELAY_MS  = 2000;
  const TRANSITION_COOLDOWN_MS  = 1400;
  const ARROW_MOVE_THRESHOLD    = 30;
  const PORTAL_TRIGGER_R        = 36;

  const MONTH_COLORS = [
    ['#ff3bbd','#ff79d7'],['#ff6b3b','#ffaa5e'],['#3bc8ff','#a8edff'],
    ['#3bffee','#b2ffda'],['#ffd700','#fff176'],['#3b6fff','#90aaff'],
    ['#a03bff','#d49aff'],['#ff9f3b','#ffd08a'],['#3bffee','#a8fff8'],
    ['#c8ff3b','#e8ffaa'],['#ff3b6f','#ff85a1'],['#ff3bbd','#ff79d7'],
  ];

  function monthPrimary(w)   { return MONTH_COLORS[Math.max(0,Math.min(11,Math.floor((w-1)/4)))][0]; }
  function monthSecondary(w) { return MONTH_COLORS[Math.max(0,Math.min(11,Math.floor((w-1)/4)))][1]; }

  function roomColorPair(roomId) {
    const n = parseInt((roomId || "room_01").replace(/\D/g,""), 10) || 1;
    return MONTH_COLORS[(n - 1) % MONTH_COLORS.length];
  }

  const boohaWeek = parseInt(sessionStorage.getItem('booha_active_week') || '1', 10);
  const primary   = monthPrimary(boohaWeek);
  const secondary = monthSecondary(boohaWeek);

  /* ═══════════════════════════════════════════
     NPP
  ═══════════════════════════════════════════ */
  const NPP_RADIUS = 40;

  const NPP = {
    room_01: [
      { dir: "right", x: 1410, y: 658,  to: "room_02", spawn: "fromLeft"  },
      { dir: "up",    x: 1084, y: 185,  to: "room_06", spawn: "fromDown"  }
    ],
    room_02: [
      { dir: "left",  x: 180,  y: 255,  to: "room_01", spawn: "fromRight" },
      { dir: "right", x: 1410, y: 727,  to: "room_03", spawn: "fromLeft"  },
      { dir: "up",    x: 765,  y: 155,  to: "room_07", spawn: "fromDown"  }
    ],
    room_03: [
      { dir: "left",  x: 250,  y: 328,  to: "room_02", spawn: "fromRight" },
      { dir: "right", x: 1170, y: 237,  to: "room_04", spawn: "fromLeft"  },
      { dir: "up",    x: 785,  y: 200,  to: "room_08", spawn: "fromDown"  }
    ],
    room_04: [
      { dir: "left",  x: 130,  y: 635,  to: "room_03", spawn: "fromRight" },
      { dir: "right", x: 1400, y: 734,  to: "room_05", spawn: "fromLeft"  },
      { dir: "up",    x: 548,  y: 200,  to: "room_09", spawn: "fromDown"  }
    ],
    room_05: [
      { dir: "left",  x: 250,  y: 328,  to: "room_04", spawn: "fromRight" },
      { dir: "up",    x: 785,  y: 200,  to: "room_10", spawn: "fromDown"  }
    ],
    room_06: [
      { dir: "right", x: 1410, y: 684,  to: "room_07", spawn: "fromLeft"  },
      { dir: "up",    x: 1096, y: 165,  to: "room_11", spawn: "fromDown"  },
      { dir: "down",  x: 623,  y: 910,  to: "room_01", spawn: "fromUp"    }
    ],
    room_07: [
      { dir: "left",  x: 80,   y: 687,  to: "room_06", spawn: "fromRight" },
      { dir: "right", x: 1440, y: 615,  to: "room_08", spawn: "fromLeft"  },
      { dir: "up",    x: 555,  y: 185,  to: "room_12", spawn: "fromDown"  },
      { dir: "down",  x: 901,  y: 865,  to: "room_02", spawn: "fromUp"    }
    ],
    room_08: [
      { dir: "left",  x: 109,  y: 776,  to: "room_07", spawn: "fromRight" },
      { dir: "right", x: 1460, y: 592,  to: "room_09", spawn: "fromLeft"  },
      { dir: "up",    x: 984,  y: 168,  to: "room_13", spawn: "fromDown"  },
      { dir: "down",  x: 848,  y: 917,  to: "room_03", spawn: "fromUp"    }
    ],
    room_09: [
      { dir: "left",  x: 80,   y: 702,  to: "room_08", spawn: "fromRight" },
      { dir: "right", x: 1365, y: 224,  to: "room_10", spawn: "fromLeft"  },
      { dir: "up",    x: 449,  y: 200,  to: "room_14", spawn: "fromDown"  },
      { dir: "down",  x: 918,  y: 860,  to: "room_04", spawn: "fromUp"    }
    ],
    room_10: [
      { dir: "left",  x: 80,   y: 702,  to: "room_09", spawn: "fromRight" },
      { dir: "up",    x: 838,  y: 200,  to: "room_15", spawn: "fromDown"  },
      { dir: "down",  x: 776,  y: 865,  to: "room_05", spawn: "fromUp"    }
    ],
    room_11: [
      { dir: "right", x: 1320, y: 312,  to: "room_12", spawn: "fromLeft"  },
      { dir: "down",  x: 804,  y: 855,  to: "room_06", spawn: "fromUp"    }
    ],
    room_12: [
      { dir: "left",  x: 210,  y: 344,  to: "room_11", spawn: "fromRight" },
      { dir: "right", x: 1440, y: 716,  to: "room_13", spawn: "fromLeft"  },
      { dir: "down",  x: 751,  y: 888,  to: "room_07", spawn: "fromUp"    }
    ],
    room_13: [
      { dir: "left",  x: 120,  y: 568,  to: "room_12", spawn: "fromRight" },
      { dir: "right", x: 1380, y: 242,  to: "room_14", spawn: "fromLeft"  },
      { dir: "down",  x: 910,  y: 888,  to: "room_08", spawn: "fromUp"    }
    ],
    room_14: [
      { dir: "left",  x: 210,  y: 344,  to: "room_13", spawn: "fromRight" },
      { dir: "right", x: 1440, y: 716,  to: "room_15", spawn: "fromLeft"  },
      { dir: "down",  x: 751,  y: 888,  to: "room_09", spawn: "fromUp"    }
    ],
    room_15: [
      { dir: "left",  x: 120,  y: 568,  to: "room_14", spawn: "fromRight" },
      { dir: "down",  x: 663,  y: 868,  to: "room_10", spawn: "fromUp"    }
    ]
  };

  const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

  let arrivalArrowHiddenUntil = 0;

  /* ═══════════════════════════════════════════
     WANDERER DEFINITIONS — 27 total
  ═══════════════════════════════════════════ */
  const WANDERER_DEFS = [
    { index:0,  roomId:'room_01', x:600,  y:400, type:'wander', img:null, color:'#ff79d7', radius:60 },
    { index:1,  roomId:'room_02', x:900,  y:500, type:'wander', img:null, color:'#ffaa5e', radius:55 },
    { index:2,  roomId:'room_03', x:500,  y:600, type:'wander', img:null, color:'#a8edff', radius:70 },
    { index:3,  roomId:'room_04', x:800,  y:450, type:'wander', img:null, color:'#b2ffda', radius:65 },
    { index:4,  roomId:'room_05', x:700,  y:550, type:'wander', img:null, color:'#fff176', radius:50 },
    { index:5,  roomId:'room_06', x:400,  y:400, type:'wander', img:null, color:'#90aaff', radius:60 },
    { index:6,  roomId:'room_07', x:1000, y:500, type:'wander', img:null, color:'#d49aff', radius:75 },
    { index:7,  roomId:'room_08', x:700,  y:600, type:'wander', img:null, color:'#ffd08a', radius:55 },
    { index:8,  roomId:'room_09', x:550,  y:480, type:'wander', img:null, color:'#a8fff8', radius:65 },
    { index:9,  roomId:'room_10', x:850,  y:550, type:'wander', img:null, color:'#e8ffaa', radius:70 },
    { index:10, roomId:'room_11', x:650,  y:420, type:'wander', img:null, color:'#ff85a1', radius:60 },
    { index:11, roomId:'room_12', x:750,  y:500, type:'wander', img:null, color:'#ff79d7', radius:55 },
    { index:12, roomId:'room_13', x:600,  y:560, type:'wander', img:null, color:'#7fffd4', radius:65 },
    { index:13, roomId:'room_14', x:900,  y:480, type:'wander', img:null, color:'#ffcc66', radius:70 },
    { index:14, roomId:'room_01', x:300,  y:300, type:'stay',   img:null, color:'#c8b8ff', radius:0  },
    { index:15, roomId:'room_02', x:1100, y:300, type:'stay',   img:null, color:'#88ffcc', radius:0  },
    { index:16, roomId:'room_03', x:400,  y:700, type:'stay',   img:null, color:'#ffb088', radius:0  },
    { index:17, roomId:'room_04', x:1200, y:600, type:'stay',   img:null, color:'#ff9eb5', radius:0  },
    { index:18, roomId:'room_05', x:350,  y:500, type:'stay',   img:null, color:'#66bbff', radius:0  },
    { index:19, roomId:'room_06', x:900,  y:300, type:'stay',   img:null, color:'#ffcc66', radius:0  },
    { index:20, roomId:'room_07', x:500,  y:600, type:'stay',   img:null, color:'#c8b8ff', radius:0  },
    { index:21, roomId:'room_08', x:1100, y:400, type:'stay',   img:null, color:'#7fffd4', radius:0  },
    { index:22, roomId:'room_09', x:700,  y:700, type:'stay',   img:null, color:'#ff9eb5', radius:0  },
    { index:23, roomId:'room_10', x:400,  y:400, type:'stay',   img:null, color:'#ffb088', radius:0  },
    { index:24, roomId:'room_11', x:1000, y:600, type:'stay',   img:null, color:'#88ffcc', radius:0  },
    { index:25, roomId:'room_12', x:600,  y:300, type:'stay',   img:null, color:'#66bbff', radius:0  },
    { index:26, roomId:'room_15', x:800,  y:450, type:'stay',   img:null, color:'#ffcc66', radius:0  },
  ];

  /* ═══════════════════════════════════════════
     BONUS TREE DEFINITIONS — 5 total
  ═══════════════════════════════════════════ */
  const BONUS_TREES = [
    { id:'booha_invaders',      roomId:'room_11', x:800, y:300, r:44, url:'booha_invaders.html',  label:'INVADERS', color:'#44ff88', lockMsg:'This game is locked. Better play some games in the maze.' },
    { id:'booha_blocks',        roomId:'room_13', x:700, y:300, r:44, url:'booha_blocks.html',    label:'BLOCKS',   color:'#44aaff', lockMsg:'This game is locked. Better play some games in the maze.' },
    { id:'bonus_placeholder_1', roomId:'room_12', x:500, y:200, r:44, url:'bonus_game_1.html',    label:'???',      color:'#cc88ff', lockMsg:'This game is locked. Better play some games in the maze.' },
    { id:'bonus_placeholder_2', roomId:'room_14', x:900, y:250, r:44, url:'bonus_game_2.html',    label:'???',      color:'#ffcc44', lockMsg:'This game is locked. Better play some games in the maze.' },
    { id:'bonus_placeholder_3', roomId:'room_15', x:600, y:300, r:44, url:'bonus_game_3.html',    label:'???',      color:'#ff9966', lockMsg:'This game is locked. Better play some games in the maze.' },
  ];

  /* ═══════════════════════════════════════════
     WANDERER RUNTIME
  ═══════════════════════════════════════════ */
  let activeWanderers  = [];
  const wandererImages = {};

  const WANDER_SPEED       = 0.55;
  const WANDER_TARGET_WAIT = 3000;
  const WANDER_REACT_DIST  = 120;
  const SCATTER_SPEED      = 2.8;
  const SCATTER_DECAY      = 0.88;
  const WANDERER_SIZE      = 22;

  function preloadWandererImages() {
    WANDERER_DEFS.forEach(def => {
      if (!def.img) return;
      const img = new Image();
      img.src = def.img;
      wandererImages[def.index] = img;
    });
  }

  function refreshWanderersForRoom() {
  let unlockedIndices = [];

  if (window.__devAllWanderers) {                 // ← add this block
    unlockedIndices = WANDERER_DEFS.map(d => d.index);
  } else {
    try {
      const data = window.BoohaAdventure && BoohaAdventure.save
        ? BoohaAdventure.save.load() : null;
      if (data && data.weekly && data.weekly.wanderers) {
        unlockedIndices = data.weekly.wanderers;
      }
    } catch (_) {}
  }

  activeWanderers = WANDERER_DEFS
    .filter(def => def.roomId === state.roomId && unlockedIndices.includes(def.index))
    .map(def => ({ /* ... unchanged ... */ }));
}

    
    try {
      const data = window.BoohaAdventure && BoohaAdventure.save
        ? BoohaAdventure.save.load() : null;
      if (data && data.weekly && data.weekly.wanderers) {
        unlockedIndices = data.weekly.wanderers;
      }
    } catch (_) {}

    activeWanderers = WANDERER_DEFS
      .filter(def => def.roomId === state.roomId && unlockedIndices.includes(def.index))
      .map(def => ({
        ...def,
        rx: def.x, ry: def.y,
        targetX: def.x, targetY: def.y,
        nextTargetAt: 0,
        wobblePhase: Math.random() * Math.PI * 2,
        scattering: false, scatterVx: 0, scatterVy: 0,
        image: wandererImages[def.index] || null,
      }));
  }

  function initWanderers() {
    preloadWandererImages();
    refreshWanderersForRoom();
  }
}
  function onRoomChanged() {
    refreshWanderersForRoom();
  }

  function updateWanderers(now) {
    if (!activeWanderers.length) return;
    activeWanderers.forEach(w => {
      const ghostDist = Math.hypot(state.x - w.rx, state.y - w.ry);
      if (ghostDist < WANDER_REACT_DIST && state.moving) {
        if (!w.scattering) {
          const angle = Math.atan2(w.ry - state.y, w.rx - state.x);
          w.scatterVx = Math.cos(angle) * SCATTER_SPEED;
          w.scatterVy = Math.sin(angle) * SCATTER_SPEED;
          w.scattering = true;
        }
      }
      if (w.scattering) {
        w.rx += w.scatterVx; w.ry += w.scatterVy;
        w.scatterVx *= SCATTER_DECAY; w.scatterVy *= SCATTER_DECAY;
        w.rx = Math.max(40, Math.min(WORLD_W - 40, w.rx));
        w.ry = Math.max(40, Math.min(WORLD_H - 40, w.ry));
        if (Math.abs(w.scatterVx) < 0.05 && Math.abs(w.scatterVy) < 0.05) w.scattering = false;
        return;
      }
      if (w.type === 'wander') {
        if (now > w.nextTargetAt || Math.hypot(w.rx - w.targetX, w.ry - w.targetY) < 4) {
          const angle = Math.random() * Math.PI * 2;
          const dist  = (Math.random() * 0.7 + 0.3) * w.radius;
          w.targetX = Math.max(40, Math.min(WORLD_W - 40, w.x + Math.cos(angle) * dist));
          w.targetY = Math.max(40, Math.min(WORLD_H - 40, w.y + Math.sin(angle) * dist));
          w.nextTargetAt = now + WANDER_TARGET_WAIT + Math.random() * 2000;
        }
        const dx = w.targetX - w.rx, dy = w.targetY - w.ry;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) { w.rx += (dx / dist) * WANDER_SPEED; w.ry += (dy / dist) * WANDER_SPEED; }
      }
    });
  }

  function drawWanderers(now) {
    if (!activeWanderers.length) return;
    const sec = now / 1000;
    activeWanderers.forEach(w => {
      const drawX = w.rx;
      const drawY = w.ry + (w.type === 'stay'
        ? Math.sin(sec * 1.6 + w.wobblePhase) * 5
        : Math.sin(sec * 2.1 + w.wobblePhase) * 3);
      ctx.save();
      const pulse = 0.5 + 0.5 * Math.sin(sec * 2.4 + w.wobblePhase);
      const halo  = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, WANDERER_SIZE * 2.2);
      halo.addColorStop(0, w.color + '55'); halo.addColorStop(0.5, w.color + '22'); halo.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.35 + pulse * 0.25; ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(drawX, drawY, WANDERER_SIZE * 2.2, 0, Math.PI * 2); ctx.fill();
      const img = w.image;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = 0.92;
        ctx.drawImage(img, drawX - WANDERER_SIZE, drawY - WANDERER_SIZE, WANDERER_SIZE * 2, WANDERER_SIZE * 2);
      } else {
        const ig = ctx.createRadialGradient(drawX - WANDERER_SIZE * 0.3, drawY - WANDERER_SIZE * 0.3, 0, drawX, drawY, WANDERER_SIZE);
        ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.4, w.color); ig.addColorStop(1, w.color + 'aa');
        ctx.globalAlpha = 0.88 + pulse * 0.1; ctx.shadowBlur = 14; ctx.shadowColor = w.color;
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(drawX, drawY, WANDERER_SIZE, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.7; ctx.fillStyle = '#000'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
        ctx.fillText(w.type === 'wander' ? 'w' : 's', drawX, drawY + 4); ctx.textAlign = 'left';
      }
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     BONUS TREE SYSTEM
  ═══════════════════════════════════════════ */
  let bonusLockOverlay = null;

  function injectBonusLockOverlay() {
    if (bonusLockOverlay) return;
    bonusLockOverlay = document.createElement('div');
    bonusLockOverlay.id = 'bonus-lock-overlay';
    bonusLockOverlay.style.cssText = `
      display:none; position:fixed; inset:0; z-index:9100;
      align-items:center; justify-content:center;
      background:rgba(0,0,0,0); transition:background 0.3s ease;`;
    bonusLockOverlay.innerHTML = `
      <div id="bonus-lock-box" style="
        background:#080810; border:1px solid #3a1055; border-radius:6px;
        padding:36px 40px 28px; max-width:min(400px,90vw); width:90vw;
        text-align:center; font-family:'Georgia',serif;
        box-shadow:0 0 0 1px rgba(160,40,220,.6),0 0 40px rgba(160,40,220,.5),0 0 90px rgba(120,0,180,.3);
        animation:portalAppear 0.25s ease-out;">
        <div style="font-size:2.5rem;margin-bottom:12px;">🔒</div>
        <p id="bonus-lock-msg" style="font-size:clamp(.9rem,3vw,1.05rem);color:#f0e8ff;margin:0 0 24px;line-height:1.6;letter-spacing:.03em;"></p>
        <button id="bonus-lock-ok" style="background:transparent;border:1.5px solid rgba(160,70,210,.9);color:#e8d8ff;font-family:'Georgia',serif;font-size:.9rem;letter-spacing:.12em;padding:8px 30px;border-radius:3px;cursor:pointer;transition:all .18s;">OK</button>
      </div>`;
    document.body.appendChild(bonusLockOverlay);
    document.getElementById('bonus-lock-ok').addEventListener('click', closeBonusLock);
    bonusLockOverlay.addEventListener('click', e => { if (e.target === bonusLockOverlay) closeBonusLock(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeBonusLock(); });
  }

  function openBonusLock(msg) {
    document.getElementById('bonus-lock-msg').textContent = msg;
    bonusLockOverlay.style.display   = 'flex';
    bonusLockOverlay.style.background = 'rgba(0,0,0,0.82)';
    state.clickTarget = null;
  }
  function closeBonusLock() {
    bonusLockOverlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(() => { bonusLockOverlay.style.display = 'none'; }, 300);
  }
  function isBonusLockOpen() {
    return bonusLockOverlay && bonusLockOverlay.style.display === 'flex';
  }

  function _bonusUnlocked(bonusId) {
      if (window.__devAllGames) return true;          // ← add this line**TESTING
    try {
      if (window.BoohaAdventure && BoohaAdventure.unlocks) {
        return BoohaAdventure.unlocks.isBonusGameUnlocked(bonusId);
      }
    } catch (_) {}
    return false;
  }

  function handleBonusTreeInteraction(tree) {
    if (_bonusUnlocked(tree.id)) {
      window.location.href = tree.url;
    } else {
      openBonusLock(tree.lockMsg);
    }
  }

  function checkBonusTrees() {
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    if (!trees.length || state.distMovedSinceSpawn < ARROW_MOVE_THRESHOLD) return;
    for (const tree of trees) {
      if (Math.hypot(state.x - tree.x, state.y - tree.y) <= tree.r) {
        handleBonusTreeInteraction(tree);
        state.clickTarget = null;
        return;
      }
    }
  }

  function clickBonusTree(worldX, worldY) {
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    for (const tree of trees) {
      if (Math.hypot(worldX - tree.x, worldY - tree.y) <= tree.r) {
        handleBonusTreeInteraction(tree);
        return true;
      }
    }
    return false;
  }

  function drawBonusTrees(now) {
    const trees = BONUS_TREES.filter(t => t.roomId === state.roomId);
    if (!trees.length) return;
    const sec        = now / 1000;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    trees.forEach(tree => {
      const unlocked = _bonusUnlocked(tree.id);
      const pulse    = 0.5 + 0.5 * Math.sin(sec * 1.8);
      const bounce   = Math.sin(sec * 1.8) * 5;
      ctx.save();
      ctx.globalAlpha = moveReveal;
      if (unlocked) {
        const glow = ctx.createRadialGradient(tree.x, tree.y + bounce, 0, tree.x, tree.y + bounce, 48);
        glow.addColorStop(0, tree.color + '88'); glow.addColorStop(0.5, tree.color + '33'); glow.addColorStop(1, 'transparent');
        ctx.globalAlpha = moveReveal * (0.5 + pulse * 0.35); ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, 48, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = moveReveal * (0.85 + pulse * 0.13);
        ctx.shadowBlur = 20 + pulse * 14; ctx.shadowColor = tree.color; ctx.fillStyle = tree.color;
        ctx.beginPath(); ctx.arc(tree.x, tree.y + bounce, 16, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = moveReveal * (0.75 + pulse * 0.2); ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
        ctx.shadowBlur = 8; ctx.shadowColor = tree.color;
        ctx.fillText(tree.label, tree.x, tree.y + bounce - 26);
        ctx.shadowBlur = 0; ctx.textAlign = 'left';
      } else {
        ctx.globalAlpha = moveReveal * 0.35; ctx.fillStyle = '#666';
        ctx.shadowBlur = 8; ctx.shadowColor = '#888';
        ctx.beginPath(); ctx.arc(tree.x, tree.y, 16, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = moveReveal * 0.55; ctx.fillStyle = '#aaa';
        ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
        ctx.fillText('🔒', tree.x, tree.y + 5); ctx.textAlign = 'left';
      }
      ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════ */
  const state = {
    roomId            : DATA.startRoom,
    spawnId           : "default",
    x                 : 732,
    y                 : 876,
    spawnX            : 732,
    spawnY            : 876,
    arrivalDir        : null,
    transitioning     : false,
    transitionReadyAt : 0,
    clickTarget       : null,
    moving            : false,
    distMovedSinceSpawn : 0,
    mazeExiting       : false,
    coordMode         : false,
    musicStarted      : false,
    lastTrailT        : 0
  };

  (function checkReturnFromProfile() {
    try {
      const ret = sessionStorage.getItem('karasuki_return_room');
      if (ret === 'room_08') {
        state.roomId  = 'room_08';
        state.spawnId = 'default';
        sessionStorage.removeItem('karasuki_return_room');
      }
    } catch (_) {}
  })();

  let pins    = [];
  let trail   = [];
  let ripples = [];

  const ghostImg = new Image();
  ghostImg.src   = "assets/img/booha_ghost.png";
  const music    = new Audio("assets/audio/karasuki-music.mp3");
  music.loop     = true;
  music.volume   = 0.65;

  let app, stage, canvas, ctx, roomLayer, coordToggle, coordReadout, pinLog;
  let portalOverlay = null;

  /* ═══════════════════════════════════════════
     STYLES
  ═══════════════════════════════════════════ */
  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = `
      html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}
      body{display:grid;place-items:center;}
      #karasuki-app{position:relative;width:100vw;height:100vh;overflow:hidden;background:#000;}
      #karasuki-stage{position:absolute;left:50%;top:50%;width:${WORLD_W}px;height:${WORLD_H}px;transform-origin:50% 50%;overflow:hidden;cursor:crosshair;}
      #karasuki-room-layer{position:absolute;inset:0;}
      .karasuki-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;pointer-events:none;user-select:none;}
      #kara-canvas{position:absolute;inset:0;z-index:10;pointer-events:none;}
      #kara-fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20;}
      #rotate-overlay{display:none;position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:32px;}
      @media screen and (orientation:portrait) and (max-width:1023px){#rotate-overlay{display:flex !important;}}
      .rotate-phone{font-size:64px;display:block;animation:rotatehint 2.4s ease-in-out infinite;transform-origin:center;}
      @keyframes rotatehint{0%,100%{transform:rotate(0deg);}40%,60%{transform:rotate(-90deg);}}
      .rotate-bar{width:120px;height:3px;border-radius:999px;background:linear-gradient(90deg,#ff3bbd,#ff79d7,#ff3bbd);background-size:200%;animation:barshimmer 2s linear infinite;box-shadow:0 0 14px rgba(255,59,189,.5);}
      @keyframes barshimmer{0%{background-position:0%}100%{background-position:200%}}
      .rotate-title{font-family:system-ui,-apple-system,sans-serif;font-size:clamp(18px,5vw,28px);font-weight:900;letter-spacing:1px;color:#fff;margin:0;text-shadow:0 0 28px rgba(255,140,255,.7);}
      .rotate-sub{font-size:14px;color:rgba(255,255,255,.55);margin:0;line-height:1.7;}
      #coord-toggle{position:fixed;bottom:18px;right:18px;z-index:200;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.80);color:#ff8ae2;font:700 11px/1 monospace;padding:7px 13px;border-radius:20px;cursor:pointer;border:1px solid rgba(255,138,226,.40);user-select:none;letter-spacing:.06em;}
      .toggle-pill{width:30px;height:16px;border-radius:8px;background:rgba(255,138,226,.18);position:relative;transition:background .2s;}
      .toggle-pill::after{content:"";position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:#ff8ae2;transition:transform .2s;}
      #coord-toggle.active .toggle-pill{background:rgba(255,138,226,.55);}
      #coord-toggle.active .toggle-pill::after{transform:translateX(14px);}
      #coord-readout{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:200;background:rgba(0,0,0,.80);color:#ff8ae2;font:700 13px/1.4 monospace;padding:6px 16px;border-radius:20px;pointer-events:none;border:1px solid rgba(255,138,226,.30);letter-spacing:.05em;opacity:0;transition:opacity .2s;white-space:nowrap;text-align:center;}
      #coord-readout.show{opacity:1;}
      #coord-readout .hint{font-size:10px;color:rgba(255,138,226,.55);display:block;margin-top:2px;}
      #pin-log{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:200;max-height:60vh;overflow-y:auto;background:rgba(0,0,0,.85);border:1px solid rgba(255,138,226,.25);border-radius:14px;padding:10px 12px;font:700 11px/1.6 monospace;color:#ff8ae2;letter-spacing:.04em;display:none;min-width:160px;}
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
      #copy-toast{position:fixed;top:52px;left:50%;transform:translateX(-50%);z-index:300;background:rgba(20,0,30,.92);color:#fff;font:700 12px/1 monospace;padding:6px 18px;border-radius:20px;pointer-events:none;opacity:0;transition:opacity .18s;letter-spacing:.05em;}
      #copy-toast.show{opacity:1;}
      #portal-overlay{display:none;position:fixed;inset:0;z-index:9000;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 0.3s ease;}
      #portal-overlay.active{display:flex;background:rgba(0,0,0,0.82);}
      #portal-box{background:#080810;border:1px solid #3a1055;border-radius:6px;padding:clamp(24px,5vw,44px) clamp(20px,6vw,52px) clamp(20px,4vw,36px);max-width:min(440px,92vw);width:92vw;text-align:center;box-shadow:0 0 0 1px rgba(160,40,220,.6),0 0 40px rgba(160,40,220,.7),0 0 90px rgba(120,0,180,.45),0 0 160px rgba(100,0,160,.2),inset 0 0 50px rgba(0,0,0,.5);font-family:'Georgia',serif;position:relative;animation:portalAppear 0.25s ease-out;}
      @keyframes portalAppear{from{opacity:0;transform:scale(0.92) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}
      #portal-box::before,#portal-box::after{content:"";position:absolute;width:20px;height:20px;border-color:rgba(180,80,220,.7);border-style:solid;}
      #portal-box::before{top:10px;left:10px;border-width:1.5px 0 0 1.5px;}
      #portal-box::after{bottom:10px;right:10px;border-width:0 1.5px 1.5px 0;}
      #portal-en{font-size:clamp(.9rem,3.5vw,1.1rem);margin:0 0 10px;letter-spacing:.04em;color:#f0e8ff;line-height:1.55;text-shadow:0 0 20px rgba(200,180,255,.5);}
      #portal-ja{font-size:clamp(.78rem,3vw,.92rem);margin:0 0 6px;color:#cdb8e8;letter-spacing:.05em;}
      #portal-kanji{font-size:clamp(.72rem,2.5vw,.84rem);margin:0 0 clamp(18px,4vw,32px);color:#a888cc;letter-spacing:.08em;}
      .portal-btn{background:transparent;font-family:'Georgia',serif;font-size:clamp(.82rem,3vw,.95rem);letter-spacing:.12em;cursor:pointer;transition:color .18s,border-color .18s,box-shadow .18s,background .18s;padding:clamp(6px,2vw,10px) clamp(20px,5vw,34px);border-radius:3px;}
      #portal-yes{border:1.5px solid rgba(160,70,210,.9);color:#e8d8ff;margin-right:16px;background:rgba(100,30,150,.15);}
      #portal-yes:hover{color:#fff;border-color:rgba(210,120,255,1);background:rgba(140,50,200,.3);box-shadow:0 0 20px rgba(180,80,240,.6),0 0 40px rgba(140,40,200,.3);}
      #portal-no{border:1.5px solid rgba(70,45,90,.8);color:#b8a8c8;background:rgba(40,25,60,.2);}
      #portal-no:hover{color:#ddd0ff;border-color:rgba(130,90,160,.9);background:rgba(70,45,100,.3);}
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

    /* ── Step 1: inject bonus lock overlay ── */
    injectBonusLockOverlay();

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

    document.getElementById("portal-yes").addEventListener("click", () => {
      try { sessionStorage.setItem('karasuki_return_room', 'room_08'); } catch (_) {}
      window.location.href = PORTAL.href;
    });
    document.getElementById("portal-no").addEventListener("click", closePortal);
    portalOverlay.addEventListener("click", (e) => { if (e.target === portalOverlay) closePortal(); });
  }

  function openPortal()  { portalOverlay.classList.add("active"); state.clickTarget = null; }
  function closePortal() { portalOverlay.classList.remove("active"); }
  function isPortalOpen(){ return portalOverlay.classList.contains("active"); }

  function exitToMaze() {
    if (state.mazeExiting) return;
    state.mazeExiting = true;
    state.clickTarget = null;
    try { music.pause(); music.currentTime = 0; } catch (_) {}
    try {
      sessionStorage.setItem('booha_return_to_checkpoint', '1');
      const storedWeek  = sessionStorage.getItem('booha_active_week');
      const storedGhost = sessionStorage.getItem('booha_active_ghost');
      if (storedWeek)  sessionStorage.setItem('booha_return_week',  storedWeek);
      if (storedGhost) sessionStorage.setItem('booha_return_ghost', storedGhost);
      sessionStorage.setItem('booha_return_ix', String(MAZE_EXIT.treeIX));
      sessionStorage.setItem('booha_return_iy', String(MAZE_EXIT.treeIY));
    } catch (_) {}
    const fadeEl = document.getElementById("kara-fade");
    fadeEl.style.transition = `opacity ${FADE_MS}ms ease-in`;
    fadeEl.style.opacity    = "1";
    setTimeout(() => { window.location.href = MAZE_EXIT.mazeUrl; }, FADE_MS + 60);
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
    renderPinLog(); copyText(label); showToast(`pinned ${label}`);
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
    t.textContent = msg; t.classList.add("show");
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
    state.spawnX = spawn.x;
    state.spawnY = spawn.y;
    const now = performance.now();
    state.transitionReadyAt   = now + TRANSITION_COOLDOWN_MS;
    arrivalArrowHiddenUntil   = now + ARRIVAL_ARROW_DELAY_MS;
    state.distMovedSinceSpawn = 0;
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
      /* ── Step 3: refresh wanderers for new room ── */
      onRoomChanged();
      state.spawnId    = exit.spawn || "default";
      const spawn      = getSpawn(nextRoom, state.spawnId);
      placeGhost(spawn.x, spawn.y);
      state.spawnX     = spawn.x;
      state.spawnY     = spawn.y;
      state.arrivalDir = exit.dir || null;
      trail = []; pins = [];

      const now = performance.now();
      state.transitionReadyAt   = now + TRANSITION_COOLDOWN_MS;
      arrivalArrowHiddenUntil   = now + ARRIVAL_ARROW_DELAY_MS;
      state.distMovedSinceSpawn = 0;

      const lh = pinLog.querySelector(".log-header span");
      if (lh) lh.textContent = `PINS — ${state.roomId}`;
      renderPinLog();

      fadeEl.style.transition = `opacity ${FADE_MS / 2}ms ease-out`;
      fadeEl.style.opacity    = "0";
      setTimeout(() => { state.transitioning = false; }, FADE_MS / 2 + 30);
    }, FADE_MS / 2 + 20);
  }

  function getNPPExit(now) {
    if (now < state.transitionReadyAt) return null;
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
    const moved = state.distMovedSinceSpawn;
    const moveReveal = Math.min(1, moved / ARROW_MOVE_THRESHOLD);
    if (moveReveal <= 0) return;
    const sec = now / 1000;
    const [col1, col2] = roomColorPair(state.roomId);
    const OPPOSITE = { left: "right", right: "left", up: "down", down: "up" };
    const arrivalExit = state.arrivalDir ? OPPOSITE[state.arrivalDir] : null;
    const delayRemaining = arrivalArrowHiddenUntil - now;
    const revealFade = delayRemaining > 400
      ? 0 : Math.min(1, Math.max(0, 1 - (delayRemaining / ARRIVAL_ARROW_DELAY_MS)));
    npps.forEach((npp, i) => {
      if (!npp.dir) return;
      const isArrivalDir = (npp.dir === arrivalExit);
      if (isArrivalDir && delayRemaining > 400) return;
      const angle  = DIR_ANGLE[npp.dir] ?? 0;
      const pulse  = 0.5 + 0.5 * Math.sin(sec * 2.2 + i * 1.3);
      const bounce = Math.sin(sec * 2.2 + i * 1.3) * 6;
      const ax = npp.x + Math.cos(angle) * bounce;
      const ay = npp.y + Math.sin(angle) * bounce;
      const baseFade  = isArrivalDir ? revealFade : 1;
      const fadeAlpha = baseFade * moveReveal;
      ctx.save();
      ctx.translate(ax, ay); ctx.rotate(angle);
      const ga = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
      ga.addColorStop(0, col1); ga.addColorStop(1, "transparent");
      ctx.globalAlpha = fadeAlpha * (0.10 + pulse * 0.08); ctx.fillStyle = ga;
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
      [{ ox: -11, a: 0.65 }, { ox: 4, a: 1.0 }].forEach(({ ox, a }) => {
        ctx.globalAlpha = fadeAlpha * a * (0.38 + pulse * 0.32);
        ctx.strokeStyle = col1; ctx.lineWidth = 2.5;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.shadowBlur = 12; ctx.shadowColor = col2;
        ctx.beginPath(); ctx.moveTo(ox - 7, -10); ctx.lineTo(ox + 7, 0); ctx.lineTo(ox - 7, 10); ctx.stroke();
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = fadeAlpha * (0.60 + pulse * 0.38);
      ctx.fillStyle = "#fff"; ctx.shadowBlur = 14; ctx.shadowColor = col1;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
    });
  }

  /* ═══════════════════════════════════════════
     DRAW PORTAL ORB
  ═══════════════════════════════════════════ */
  const PORTAL_COLORS = ['#8b00ff','#00bfff','#ff007f','#00ff99','#ffaa00','#aa00ff'];

  function drawPortalOrb(now) {
    if (state.roomId !== "room_08") return;
    const sec    = now / 1000;
    const cycleT = (sec * 0.28) % PORTAL_COLORS.length;
    const idx0   = Math.floor(cycleT) % PORTAL_COLORS.length;
    const idx1   = (idx0 + 1) % PORTAL_COLORS.length;
    const t      = cycleT - Math.floor(cycleT);
    const col    = lerpHex(PORTAL_COLORS[idx0], PORTAL_COLORS[idx1], t);
    const col2   = lerpHex(PORTAL_COLORS[(idx1 + 1) % PORTAL_COLORS.length], PORTAL_COLORS[(idx1 + 2) % PORTAL_COLORS.length], t);
    const pulse  = 0.5 + 0.5 * Math.sin(sec * 2.6);
    const pulse2 = 0.5 + 0.5 * Math.sin(sec * 1.8 + 1.2);
    ctx.save();
    const ambient = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, 72);
    ambient.addColorStop(0, col + "00"); ambient.addColorStop(0.3, col + "28"); ambient.addColorStop(0.6, col + "44"); ambient.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.55 + pulse * 0.35; ctx.fillStyle = ambient;
    ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, 72, 0, Math.PI * 2); ctx.fill();
    const cloud2 = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, 52);
    cloud2.addColorStop(0, col2 + "00"); cloud2.addColorStop(0.25, col2 + "22"); cloud2.addColorStop(0.55, col2 + "38"); cloud2.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.4 + pulse2 * 0.3; ctx.fillStyle = cloud2;
    ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, 52, 0, Math.PI * 2); ctx.fill();
    const innerR = 10 + pulse * 6;
    const energy = ctx.createRadialGradient(PORTAL.x, PORTAL.y, 0, PORTAL.x, PORTAL.y, innerR * 2.8);
    energy.addColorStop(0, "transparent"); energy.addColorStop(0.25, col + "55"); energy.addColorStop(0.55, col + "cc"); energy.addColorStop(0.75, col + "66"); energy.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.85 + pulse * 0.13; ctx.shadowBlur = 18 + pulse * 16; ctx.shadowColor = col; ctx.fillStyle = energy;
    ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, innerR * 2.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    const dotCount = 8;
    for (let d = 0; d < dotCount; d++) {
      const ringR  = 18 + pulse * 4 + (d % 2) * 8;
      const speed  = d % 2 === 0 ? 0.7 : -0.5;
      const angle  = (sec * speed) + (d / dotCount) * Math.PI * 2;
      const dx     = PORTAL.x + Math.cos(angle) * ringR;
      const dy     = PORTAL.y + Math.sin(angle) * ringR;
      const sparkA = 0.3 + 0.7 * Math.abs(Math.sin(sec * 2.5 + d * 0.8));
      const sparkR = 1.2 + pulse * 1.0;
      ctx.globalAlpha = sparkA;
      const sparkCol = d % 2 === 0 ? col : col2;
      ctx.fillStyle = sparkCol; ctx.shadowBlur = 8; ctx.shadowColor = sparkCol;
      ctx.beginPath(); ctx.arc(dx, dy, sparkR, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    const wispCount = 3;
    for (let w = 0; w < wispCount; w++) {
      const wAngle = (sec * 0.4) + (w / wispCount) * Math.PI * 2;
      const wR     = 14 + pulse2 * 5;
      ctx.globalAlpha = 0.18 + pulse * 0.14; ctx.strokeStyle = w % 2 === 0 ? col : col2;
      ctx.lineWidth = 1.5; ctx.shadowBlur = 10; ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(PORTAL.x, PORTAL.y, wR, wAngle, wAngle + Math.PI * 0.7); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  /* ═══════════════════════════════════════════
     DRAW MAZE EXIT ARROW
  ═══════════════════════════════════════════ */
  function drawMazeExitArrow(now) {
    if (state.roomId !== MAZE_EXIT.roomId) return;
    const moveReveal = Math.min(1, state.distMovedSinceSpawn / ARROW_MOVE_THRESHOLD);
    if (moveReveal <= 0) return;
    const sec   = now / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(sec * 2.4);
    const bounce= Math.sin(sec * 2.4) * 7;
    const ax    = MAZE_EXIT.x;
    const ay    = MAZE_EXIT.y + bounce;
    const col1  = "#44ff88"; const col2 = "#aa44ff"; const col3 = "#aaffcc";
    ctx.save();
    ctx.globalAlpha = moveReveal;
    const ambient = ctx.createRadialGradient(ax, ay, 0, ax, ay, 56);
    ambient.addColorStop(0, col1 + "44"); ambient.addColorStop(0.5, col2 + "22"); ambient.addColorStop(1, "transparent");
    ctx.globalAlpha = moveReveal * (0.18 + pulse * 0.14); ctx.fillStyle = ambient;
    ctx.beginPath(); ctx.arc(ax, ay, 56, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.PI / 2);
    [{ ox: -12, a: 0.55 }, { ox: 5, a: 1.0 }].forEach(({ ox, a }) => {
      ctx.globalAlpha = moveReveal * a * (0.42 + pulse * 0.38);
      ctx.strokeStyle = col1; ctx.lineWidth = 3.0; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.shadowBlur = 16; ctx.shadowColor = col2;
      ctx.beginPath(); ctx.moveTo(ox - 9, -12); ctx.lineTo(ox + 9, 0); ctx.lineTo(ox - 9, 12); ctx.stroke();
      ctx.shadowBlur = 0;
    });
    ctx.restore();
    ctx.globalAlpha = moveReveal * (0.70 + pulse * 0.28); ctx.shadowBlur = 18; ctx.shadowColor = col1;
    const dotG = ctx.createRadialGradient(ax, ay, 0, ax, ay, 7);
    dotG.addColorStop(0, col3); dotG.addColorStop(0.5, col1); dotG.addColorStop(1, "transparent");
    ctx.fillStyle = dotG; ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.globalAlpha = moveReveal * (0.55 + pulse * 0.25);
    ctx.font = "bold 13px monospace"; ctx.fillStyle = col3; ctx.textAlign = "center";
    ctx.shadowBlur = 10; ctx.shadowColor = col1;
    ctx.fillText("MAZE", ax, ay - 28); ctx.shadowBlur = 0; ctx.textAlign = "left";
    ctx.restore();
  }

  function lerpHex(a, b, t) {
    const ah = parseInt(a.replace('#',''), 16), bh = parseInt(b.replace('#',''), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t), rg = Math.round(ag + (bg - ag) * t), rb = Math.round(ab + (bb - ab) * t);
    return '#' + [rr, rg, rb].map(v => v.toString(16).padStart(2,'0')).join('');
  }

  /* ═══════════════════════════════════════════
     DRAW PINS
  ═══════════════════════════════════════════ */
  function drawPins(now) {
    if (!state.coordMode || !pins.length) return;
    const sec = now / 1000;
    pins.forEach((p, i) => {
      const pulse = 0.5 + 0.5 * Math.sin(sec * 3 + i);
      ctx.save();
      ctx.globalAlpha = 0.80 + pulse * 0.18; ctx.strokeStyle = "#ff8ae2"; ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y); ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x, p.y + 14); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.fillStyle = "#ff4fc8"; ctx.shadowBlur = 8; ctx.shadowColor = "#ff8ae2";
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
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

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i]; rp.life -= 0.038;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = rp.life * 0.72;
      ctx.strokeStyle = "rgba(255,138,226,.95)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, (1 - rp.life) * 38 + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    for (let i = trail.length - 1; i >= 0; i--) {
      const p  = trail[i];
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
      gr.addColorStop(0, p.color); gr.addColorStop(1, "transparent");
      ctx.globalAlpha = p.life * 0.48; ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.life * 0.90; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; p.life -= 0.022; p.x += p.vx; p.y += p.vy;
    }
    trail = trail.filter(p => p.life > 0);

    drawPortalOrb(now);
    drawExitArrows(now);
    drawMazeExitArrow(now);

    /* ── Step 4: draw bonus trees and wanderers ── */
    drawBonusTrees(now);
    drawWanderers(now);

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
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gx, gy + 3, GHOST_R * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.18 + pulse * 0.07;
    const shd = ctx.createRadialGradient(gx, gy + GHOST_R * 0.85, 0, gx, gy + GHOST_R * 0.85, GHOST_R * 0.9);
    shd.addColorStop(0, "rgba(0,0,0,.65)"); shd.addColorStop(1, "transparent");
    ctx.fillStyle = shd; ctx.beginPath(); ctx.arc(gx, gy + GHOST_R * 0.85, GHOST_R * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save(); ctx.translate(gx, gy); ctx.rotate(wobble * Math.PI / 180); ctx.scale(sx, sy);
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
    const prevX = state.x, prevY = state.y;
    const moved = tryMove(state.x + (dx / dist) * SPEED, state.y + (dy / dist) * SPEED);
    state.moving = moved;
    if (!moved) {
      state.clickTarget = null; state.moving = false;
    } else {
      state.distMovedSinceSpawn += Math.hypot(state.x - prevX, state.y - prevY);
      addTrailParticle(state.x, state.y, now);
    }
  }

  /* ═══════════════════════════════════════════
     MAIN LOOP
  ═══════════════════════════════════════════ */
  function tick(now) {
    /* ── Step 5 & 8: include isBonusLockOpen() in the guard ── */
    if (!state.transitioning && !isPortalOpen() && !state.mazeExiting && !isBonusLockOpen()) {
      handleClickMovement(now);

      /* ── Step 5: update wanderers ── */
      updateWanderers(now);

      if (state.roomId === "room_08" && state.moving) {
        const dPortal = Math.hypot(state.x - PORTAL.x, state.y - PORTAL.y);
        if (dPortal <= PORTAL_TRIGGER_R) { state.clickTarget = null; openPortal(); }
      }

      if (state.roomId === MAZE_EXIT.roomId && state.distMovedSinceSpawn >= ARROW_MOVE_THRESHOLD) {
        const dMaze = Math.hypot(state.x - MAZE_EXIT.x, state.y - MAZE_EXIT.y);
        if (dMaze <= MAZE_EXIT.r) exitToMaze();
      }

      if (state.distMovedSinceSpawn >= ARROW_MOVE_THRESHOLD) {
        const exit = getNPPExit(now);
        if (exit) transitionTo(exit);
      }

      /* ── Step 5: check bonus trees by proximity ── */
      checkBonusTrees();
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
      if (state.coordMode) { dropPin(p.x, p.y); ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      if (isNearPortal(p)) { openPortal(); ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      /* ── Step 6: bonus tree direct click ── */
      if (clickBonusTree(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); return; }
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
    });

    stage.addEventListener("touchend", (e) => {
      startMusic();
      if (state.transitioning || !e.changedTouches.length) return;
      const t0 = e.changedTouches[0];
      const p  = stagePointToWorld(t0.clientX, t0.clientY);
      if (state.coordMode) { dropPin(p.x, p.y); ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      if (isNearPortal(p)) { openPortal(); ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      /* ── Step 7: bonus tree direct touch ── */
      if (clickBonusTree(p.x, p.y)) { ripples.push({ x: p.x, y: p.y, life: 1 }); e.preventDefault(); return; }
      state.clickTarget = { x: p.x, y: p.y };
      ripples.push({ x: p.x, y: p.y, life: 1 });
      e.preventDefault();
    }, { passive: false });

    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePortal(); });
    document.addEventListener("click",    startMusic, { once: false });
    document.addEventListener("touchend", startMusic, { once: false, passive: true });
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
    /* ── Step 2: init wanderers after room is ready ── */
    initWanderers();
    bindInput();
    window.addEventListener("resize", () => { fitStage(); resizeCanvas(); });
    requestAnimationFrame(tick);
  }

/* ═══════════════════════════════════════════
   DEV TESTING TOGGLE (remove before shipping)
═══════════════════════════════════════════ */
(function injectDevPanel() {
  const panel = document.createElement('div');
  panel.id = 'dev-panel';
  panel.style.cssText = `
    position:fixed; bottom:60px; right:18px; z-index:9999;
    background:rgba(0,0,0,.88); border:1px solid rgba(255,200,0,.4);
    border-radius:10px; padding:10px 14px; font:700 11px/1.8 monospace;
    color:#ffd700; letter-spacing:.06em; min-width:160px;
    box-shadow:0 0 20px rgba(255,200,0,.2);`;

  panel.innerHTML = `
    <div style="font-size:9px;color:rgba(255,200,0,.5);letter-spacing:.14em;margin-bottom:6px;">DEV MODE</div>
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:4px;">
      <input type="checkbox" id="dev-all-wanderers"> All wanderers
    </label>
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
      <input type="checkbox" id="dev-all-games"> All games unlocked
    </label>
    <div id="dev-room-info" style="font-size:9px;color:rgba(255,200,0,.45);margin-top:8px;"></div>`;

  document.body.appendChild(panel);

  // Patch _bonusUnlocked to check the override flag
  const _origBonusUnlocked = window._bonusUnlocked || _bonusUnlocked;
  // Since _bonusUnlocked is a closure, we override via the dev flag checked inside it.
  // Instead, we shadow the check by monkey-patching handleBonusTreeInteraction:
  const _origHandle = handleBonusTreeInteraction;
  // Re-point handleBonusTreeInteraction using the outer-scope reference trick:
  // (This works because handleBonusTreeInteraction is called by name in checkBonusTrees/clickBonusTree)

  // Simpler: patch _bonusUnlocked's result via a global dev flag the IIFE can see
  window.__devAllGames = false;
  window.__devAllWanderers = false;

  document.getElementById('dev-all-games').addEventListener('change', function() {
    window.__devAllGames = this.checked;
  });

  document.getElementById('dev-all-wanderers').addEventListener('change', function() {
    window.__devAllWanderers = this.checked;
    refreshWanderersForRoom();
  });

  // Tick the room info display
  setInterval(() => {
    const el = document.getElementById('dev-room-info');
    if (el) el.textContent = `room: ${state.roomId} | moved: ${Math.round(state.distMovedSinceSpawn)}`;
  }, 200);
})();


  
  init();
})();    
