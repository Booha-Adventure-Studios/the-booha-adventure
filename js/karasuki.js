
(() => {
  const DATA = window.KARASUKI_DATA;
  if (!DATA || !DATA.rooms) {
    console.error("KARASUKI_DATA not found.");
    return;
  }

  const WORLD_W = 960;
  const WORLD_H = 540;
  const GHOST_SIZE = 38;
  const GHOST_RADIUS = 16;
  const SPEED = 2.6;
  const TRANSITION_MS = 260;
  const CLICK_STOP_DIST = 6;

  const state = {
    roomId: DATA.startRoom,
    spawnId: "default",
    x: 480,
    y: 270,
    keys: { up: false, down: false, left: false, right: false },
    transitioning: false,
    clickTarget: null
  };

  let app, stage, roomLayer, ghost;
  let currentBg;

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #000;
        overflow: hidden;
      }
      body {
        display: grid;
        place-items: center;
      }
      #karasuki-app {
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: #000;
      }
      #karasuki-stage {
        position: absolute;
        left: 50%;
        top: 50%;
        width: ${WORLD_W}px;
        height: ${WORLD_H}px;
        transform-origin: 50% 50%;
        overflow: hidden;
        cursor: pointer;
      }
      #karasuki-room-layer {
        position: absolute;
        inset: 0;
      }
      .karasuki-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: fill;
        display: block;
        pointer-events: none;
        user-select: none;
      }
      #booha-ghost {
        position: absolute;
        width: ${GHOST_SIZE}px;
        height: ${GHOST_SIZE}px;
        margin-left: -${GHOST_SIZE / 2}px;
        margin-top: -${GHOST_SIZE / 2}px;
        border-radius: 50%;
        background:
          radial-gradient(circle at 35% 35%, #ffffff 0 18%, #f8f8f8 19% 28%, #ffd9ff 29% 48%, #ff8ae2 49% 68%, #ff4fc8 69% 100%);
        box-shadow:
          0 0 10px rgba(255,255,255,.7),
          0 0 22px rgba(255,105,214,.65),
          0 0 40px rgba(255,0,170,.35);
        z-index: 10;
        pointer-events: none;
      }
      #booha-ghost::before,
      #booha-ghost::after {
        content: "";
        position: absolute;
        top: 12px;
        width: 5px;
        height: 7px;
        border-radius: 50%;
        background: #000;
      }
      #booha-ghost::before { left: 11px; }
      #booha-ghost::after  { right: 11px; }
      #booha-ghost .pupil-left,
      #booha-ghost .pupil-right {
        position: absolute;
        top: 13px;
        width: 2px;
        height: 3px;
        border-radius: 50%;
        background: #f8f8f8;
      }
      #booha-ghost .pupil-left  { left: 12px; }
      #booha-ghost .pupil-right { right: 12px; }
      #booha-ghost .tail {
        position: absolute;
        left: 8px;
        right: 8px;
        bottom: -4px;
        height: 12px;
        background: inherit;
        clip-path: polygon(0 20%, 18% 60%, 35% 18%, 50% 70%, 65% 18%, 82% 60%, 100% 20%, 100% 100%, 0 100%);
      }
    `;
    document.head.appendChild(style);
  }

  function buildApp() {
    app = document.createElement("div");
    app.id = "karasuki-app";

    stage = document.createElement("div");
    stage.id = "karasuki-stage";

    roomLayer = document.createElement("div");
    roomLayer.id = "karasuki-room-layer";

    ghost = document.createElement("div");
    ghost.id = "booha-ghost";

    const pupilLeft = document.createElement("div");
    pupilLeft.className = "pupil-left";
    const pupilRight = document.createElement("div");
    pupilRight.className = "pupil-right";
    const tail = document.createElement("div");
    tail.className = "tail";

    ghost.appendChild(pupilLeft);
    ghost.appendChild(pupilRight);
    ghost.appendChild(tail);

    stage.appendChild(roomLayer);
    stage.appendChild(ghost);
    app.appendChild(stage);
    document.body.innerHTML = "";
    document.body.appendChild(app);
  }

  function fitStage() {
    const scale = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function getRoom() {
    return DATA.rooms[state.roomId];
  }

  function getSpawn(room, spawnId) {
    return room.spawns?.[spawnId] || room.spawns?.default || { x: 480, y: 270 };
  }

  function placeGhost(x, y) {
    state.x = x;
    state.y = y;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
  }

  function makeBg(src) {
    const img = document.createElement("img");
    img.className = "karasuki-bg";
    img.src = src;
    return img;
  }

  function renderInitialRoom() {
    const room = getRoom();
    currentBg = makeBg(room.bg);
    roomLayer.appendChild(currentBg);
    const spawn = getSpawn(room, state.spawnId);
    placeGhost(spawn.x, spawn.y);
  }

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
    for (const r of rects) {
      if (pointInRect(nx, ny, r)) return true;
    }
    return false;
  }

  function tryMove(nx, ny) {
    const clamped = clampToWorld(nx, ny);

    if (canMoveTo(clamped.x, clamped.y)) {
      placeGhost(clamped.x, clamped.y);
      return true;
    }

    const tryX = clampToWorld(nx, state.y);
    if (canMoveTo(tryX.x, tryX.y)) {
      placeGhost(tryX.x, tryX.y);
      return true;
    }

    const tryY = clampToWorld(state.x, ny);
    if (canMoveTo(tryY.x, tryY.y)) {
      placeGhost(tryY.x, tryY.y);
      return true;
    }

    return false;
  }

  function getExitAtEdge() {
    const room = getRoom();
    const exits = room?.exits || {};

    if (state.x <= GHOST_RADIUS + 2 && exits.left) return exits.left;
    if (state.x >= WORLD_W - GHOST_RADIUS - 2 && exits.right) return exits.right;
    if (state.y <= GHOST_RADIUS + 2 && exits.up) return exits.up;
    if (state.y >= WORLD_H - GHOST_RADIUS - 2 && exits.down) return exits.down;

    return null;
  }

  function getTransitionOffsets(dir) {
    if (dir === "left")  return { startX: -WORLD_W, startY: 0, oldEndX: WORLD_W, oldEndY: 0 };
    if (dir === "right") return { startX: WORLD_W, startY: 0, oldEndX: -WORLD_W, oldEndY: 0 };
    if (dir === "up")    return { startX: 0, startY: -WORLD_H, oldEndX: 0, oldEndY: WORLD_H };
    if (dir === "down")  return { startX: 0, startY: WORLD_H, oldEndX: 0, oldEndY: -WORLD_H };
    return { startX: 0, startY: 0, oldEndX: 0, oldEndY: 0 };
  }

  function transitionTo(exit) {
    if (!exit?.to || state.transitioning) return;

    const nextRoom = DATA.rooms[exit.to];
    if (!nextRoom) return;

    state.transitioning = true;
    state.clickTarget = null;

    const nextBg = makeBg(nextRoom.bg);
    const { startX, startY, oldEndX, oldEndY } = getTransitionOffsets(exit.dir);

    nextBg.style.transform = `translate(${startX}px, ${startY}px)`;
    currentBg.style.transform = `translate(0px, 0px)`;

    nextBg.style.transition = `transform ${TRANSITION_MS}ms linear`;
    currentBg.style.transition = `transform ${TRANSITION_MS}ms linear`;

    roomLayer.appendChild(nextBg);

    const spawn = getSpawn(nextRoom, exit.spawn);
    placeGhost(spawn.x, spawn.y);

    requestAnimationFrame(() => {
      nextBg.style.transform = `translate(0px, 0px)`;
      currentBg.style.transform = `translate(${oldEndX}px, ${oldEndY}px)`;
    });

    window.setTimeout(() => {
      if (currentBg && currentBg.parentNode) currentBg.parentNode.removeChild(currentBg);
      currentBg = nextBg;
      currentBg.style.transition = "";
      currentBg.style.transform = "";

      state.roomId = exit.to;
      state.spawnId = exit.spawn;
      state.transitioning = false;
    }, TRANSITION_MS + 20);
  }

  function handleKeyboardMovement() {
    let dx = 0;
    let dy = 0;

    if (state.keys.left) dx -= 1;
    if (state.keys.right) dx += 1;
    if (state.keys.up) dy -= 1;
    if (state.keys.down) dy += 1;

    if (!dx && !dy) return false;

    state.clickTarget = null;

    if (dx && dy) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }

    tryMove(state.x + dx * SPEED, state.y + dy * SPEED);
    return true;
  }

  function handleClickMovement() {
    if (!state.clickTarget) return;

    const tx = state.clickTarget.x;
    const ty = state.clickTarget.y;
    const dx = tx - state.x;
    const dy = ty - state.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= CLICK_STOP_DIST) {
      state.clickTarget = null;
      return;
    }

    const ux = dx / dist;
    const uy = dy / dist;

    const moved = tryMove(state.x + ux * SPEED, state.y + uy * SPEED);

    if (!moved) {
      state.clickTarget = null;
    }
  }

  function handleMovement() {
    if (state.transitioning) return;

    const usedKeyboard = handleKeyboardMovement();
    if (!usedKeyboard) handleClickMovement();

    const exit = getExitAtEdge();
    if (exit) transitionTo(exit);
  }

  function setKey(code, isDown) {
    if (code === "ArrowUp" || code === "KeyW") state.keys.up = isDown;
    if (code === "ArrowDown" || code === "KeyS") state.keys.down = isDown;
    if (code === "ArrowLeft" || code === "KeyA") state.keys.left = isDown;
    if (code === "ArrowRight" || code === "KeyD") state.keys.right = isDown;
  }

  function bindKeys() {
    const valid = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];

    window.addEventListener("keydown", (e) => {
      if (!valid.includes(e.code)) return;
      e.preventDefault();
      setKey(e.code, true);
    });

    window.addEventListener("keyup", (e) => {
      if (!valid.includes(e.code)) return;
      e.preventDefault();
      setKey(e.code, false);
    });

    window.addEventListener("blur", () => {
      state.keys.up = false;
      state.keys.down = false;
      state.keys.left = false;
      state.keys.right = false;
    });
  }

  function stagePointToWorld(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WORLD_W;
    const y = ((clientY - rect.top) / rect.height) * WORLD_H;
    return clampToWorld(x, y);
  }

  function bindMouse() {
    stage.addEventListener("click", (e) => {
      const p = stagePointToWorld(e.clientX, e.clientY);
      state.clickTarget = { x: p.x, y: p.y };
    });
  }

  function tick() {
    handleMovement();
    requestAnimationFrame(tick);
  }

  function init() {
    injectStyles();
    buildApp();
    fitStage();
    renderInitialRoom();
    bindKeys();
    bindMouse();
    window.addEventListener("resize", fitStage);
    requestAnimationFrame(tick);
  }

  init();
})();
