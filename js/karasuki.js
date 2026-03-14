
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

  const state = {
    roomId: DATA.startRoom,
    spawnId: "default",
    x: 480,
    y: 270,
    keys: { up: false, down: false, left: false, right: false }
  };

  let app, stage, bg, ghost;

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
      }

      #karasuki-bg {
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
        z-index: 5;
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
        filter: brightness(.98);
      }
    `;
    document.head.appendChild(style);
  }

  function buildApp() {
    app = document.createElement("div");
    app.id = "karasuki-app";

    stage = document.createElement("div");
    stage.id = "karasuki-stage";

    bg = document.createElement("img");
    bg.id = "karasuki-bg";
    bg.alt = "";

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

    stage.appendChild(bg);
    stage.appendChild(ghost);
    app.appendChild(stage);
    document.body.innerHTML = "";
    document.body.appendChild(app);
  }

  function fitStage() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / WORLD_W, vh / WORLD_H);
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

  function renderRoom() {
    const room = getRoom();
    if (!room) {
      console.error(`Room not found: ${state.roomId}`);
      return;
    }

    bg.src = room.bg;
    const spawn = getSpawn(room, state.spawnId);
    placeGhost(spawn.x, spawn.y);
  }

  function clampToWorld(nx, ny) {
    const minX = GHOST_RADIUS;
    const maxX = WORLD_W - GHOST_RADIUS;
    const minY = GHOST_RADIUS;
    const maxY = WORLD_H - GHOST_RADIUS;

    return {
      x: Math.max(minX, Math.min(maxX, nx)),
      y: Math.max(minY, Math.min(maxY, ny))
    };
  }

  function handleMovement() {
    let dx = 0;
    let dy = 0;

    if (state.keys.left) dx -= 1;
    if (state.keys.right) dx += 1;
    if (state.keys.up) dy -= 1;
    if (state.keys.down) dy += 1;

    if (!dx && !dy) return;

    if (dx && dy) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }

    const nx = state.x + dx * SPEED;
    const ny = state.y + dy * SPEED;
    const clamped = clampToWorld(nx, ny);

    placeGhost(clamped.x, clamped.y);
  }

  function setKey(code, isDown) {
    if (code === "ArrowUp" || code === "KeyW") state.keys.up = isDown;
    if (code === "ArrowDown" || code === "KeyS") state.keys.down = isDown;
    if (code === "ArrowLeft" || code === "KeyA") state.keys.left = isDown;
    if (code === "ArrowRight" || code === "KeyD") state.keys.right = isDown;
  }

  function bindKeys() {
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault();
        setKey(e.code, true);
      }
    });

    window.addEventListener("keyup", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault();
        setKey(e.code, false);
      }
    });

    window.addEventListener("blur", () => {
      state.keys.up = false;
      state.keys.down = false;
      state.keys.left = false;
      state.keys.right = false;
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
    renderRoom();
    bindKeys();
    window.addEventListener("resize", fitStage);
    requestAnimationFrame(tick);
  }

  init();
})();
