
const DATA = window.KARASUKI_DATA;

const roomStage = document.getElementById("roomStage");
const roomA = document.getElementById("roomA");
const roomB = document.getElementById("roomB");
const player = document.getElementById("player");
const promptEl = document.getElementById("prompt");
const fade = document.getElementById("fade");

const overlay = document.getElementById("overlay");
const overlayImage = document.getElementById("overlayImage");
const overlayHotspots = document.getElementById("overlayHotspots");
const closeOverlayBtn = document.getElementById("closeOverlay");
const debugLayer = document.getElementById("debugLayer");

const WORLD_W = 960;
const WORLD_H = 540;
const PLAYER_W = 42;
const PLAYER_H = 42;
const SPEED = 3;

let currentRoomId = null;
let currentRoom = null;

let activeRoomEl = roomA;
let inactiveRoomEl = roomB;

let px = 0;
let py = 0;

let transitioning = false;
let overlayOpen = false;

const keys = Object.create(null);
const pressed = Object.create(null);

const DEBUG_COLLISIONS = false;

document.addEventListener("keydown", (e) => {
  const k = normalizeKey(e.key);
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
});

document.addEventListener("keyup", (e) => {
  const k = normalizeKey(e.key);
  keys[k] = false;
});

function normalizeKey(k){
  if (!k) return "";
  if (k === "ArrowLeft") return "left";
  if (k === "ArrowRight") return "right";
  if (k === "ArrowUp") return "up";
  if (k === "ArrowDown") return "down";
  if (k === "a" || k === "A") return "left";
  if (k === "d" || k === "D") return "right";
  if (k === "w" || k === "W") return "up";
  if (k === "s" || k === "S") return "down";
  if (k === "Enter") return "enter";
  if (k === "e" || k === "E") return "enter";
  if (k === "Escape") return "escape";
  return k.toLowerCase();
}

function consumePressed(k){
  if (pressed[k]) {
    pressed[k] = false;
    return true;
  }
  return false;
}

function rectsOverlap(a, b){
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function getPlayerRect(x = px, y = py){
  return { x, y, w: PLAYER_W, h: PLAYER_H };
}

function isBlocked(nx, ny){
  const r = getPlayerRect(nx, ny);
  const boxes = currentRoom.collisions || [];
  return boxes.some(box => rectsOverlap(r, box));
}

function clampPlayer(){
  px = Math.max(0, Math.min(px, WORLD_W - PLAYER_W));
  py = Math.max(0, Math.min(py, WORLD_H - PLAYER_H));
}

function setRoomBackground(el, room){
  el.style.backgroundImage = `url("${room.bg}")`;
  el.style.transform = "translate3d(0,0,0)";
}

function loadRoom(roomId, spawnId = "default"){
  currentRoomId = roomId;
  currentRoom = DATA.rooms[roomId];
  setRoomBackground(activeRoomEl, currentRoom);

  const spawn = currentRoom.spawns?.[spawnId] || currentRoom.spawns?.default || { x: 100, y: 100 };
  px = spawn.x;
  py = spawn.y;
  clampPlayer();
  updatePlayer();
  renderDebugCollisions();
}

function updatePlayer(){
  player.style.left = `${(px / WORLD_W) * 100}%`;
  player.style.top = `${(py / WORLD_H) * 100}%`;
}

function getNearbyHotspot(){
  const hotspots = currentRoom.hotspots || [];
  const pr = getPlayerRect();
  const padding = 18;

  for (const h of hotspots) {
    const zone = {
      x: h.x - padding,
      y: h.y - padding,
      w: h.w + padding * 2,
      h: h.h + padding * 2
    };
    if (rectsOverlap(pr, zone)) return h;
  }
  return null;
}

function handleHotspotAction(h){
  if (!h) return;

  if (h.action === "overlay") {
    openOverlay(h.target);
    return;
  }

  if (h.action === "goto" && h.href) {
    window.location.href = h.href;
    return;
  }

  if (h.action === "popup") {
    alert(h.message || "Popup");
  }
}

function updatePrompt(){
  if (overlayOpen || transitioning) {
    promptEl.classList.remove("show");
    return;
  }

  const h = getNearbyHotspot();
  if (!h) {
    promptEl.classList.remove("show");
    return;
  }

  promptEl.textContent = h.prompt || "ENTER";
  promptEl.classList.add("show");

  if (consumePressed("enter")) {
    handleHotspotAction(h);
  }
}

function tryMove(dx, dy){
  if (!dx && !dy) return;

  const nx = px + dx;
  const ny = py + dy;

  if (!isBlocked(nx, py)) px = nx;
  if (!isBlocked(px, ny)) py = ny;

  clampPlayer();
}

function checkEdgeExit(){
  if (transitioning || overlayOpen) return;

  const exits = currentRoom.exits || {};
  const edgePad = 2;

  if (px <= edgePad && exits.left) {
    slideToRoom(exits.left);
    return;
  }
  if (px >= WORLD_W - PLAYER_W - edgePad && exits.right) {
    slideToRoom(exits.right);
    return;
  }
  if (py <= edgePad && exits.up) {
    slideToRoom(exits.up);
    return;
  }
  if (py >= WORLD_H - PLAYER_H - edgePad && exits.down) {
    slideToRoom(exits.down);
    return;
  }
}

function swapRoomEls(){
  const oldActive = activeRoomEl;
  activeRoomEl = inactiveRoomEl;
  inactiveRoomEl = oldActive;
}

function slideToRoom(exit){
  if (transitioning) return;
  transitioning = true;
  promptEl.classList.remove("show");

  const nextRoom = DATA.rooms[exit.to];
  setRoomBackground(inactiveRoomEl, nextRoom);

  let startX = 0;
  let startY = 0;
  let endActiveX = 0;
  let endActiveY = 0;

  switch (exit.dir) {
    case "right":
      startX = 100;
      endActiveX = -100;
      break;
    case "left":
      startX = -100;
      endActiveX = 100;
      break;
    case "up":
      startY = -100;
      endActiveY = 100;
      break;
    case "down":
      startY = 100;
      endActiveY = -100;
      break;
  }

  inactiveRoomEl.style.transition = "none";
  activeRoomEl.style.transition = "none";
  inactiveRoomEl.style.transform = `translate(${startX}%, ${startY}%)`;

  requestAnimationFrame(() => {
    inactiveRoomEl.style.transition = "transform .35s linear";
    activeRoomEl.style.transition = "transform .35s linear";

    inactiveRoomEl.style.transform = "translate(0%, 0%)";
    activeRoomEl.style.transform = `translate(${endActiveX}%, ${endActiveY}%)`;

    setTimeout(() => {
      swapRoomEls();

      currentRoomId = exit.to;
      currentRoom = nextRoom;

      const spawn = currentRoom.spawns?.[exit.spawn] || currentRoom.spawns?.default || { x: 100, y: 100 };
      px = spawn.x;
      py = spawn.y;
      clampPlayer();
      updatePlayer();

      inactiveRoomEl.style.transition = "none";
      activeRoomEl.style.transition = "none";
      inactiveRoomEl.style.transform = "translate(0%, 0%)";
      activeRoomEl.style.transform = "translate(0%, 0%)";

      renderDebugCollisions();
      transitioning = false;
    }, 360);
  });
}

function openOverlay(id){
  const data = DATA.overlays?.[id];
  if (!data) return;

  overlayOpen = true;
  overlay.classList.remove("hidden");
  overlayImage.src = data.image || "";
  overlayHotspots.innerHTML = "";

  const items = data.hotspots || [];
  for (const h of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "overlay-hotspot";
    btn.style.left = `${h.x}%`;
    btn.style.top = `${h.y}%`;
    btn.style.width = `${h.w}%`;
    btn.style.height = `${h.h}%`;
    btn.title = h.id || "";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      if (h.action === "goto" && h.href) {
        window.location.href = h.href;
        return;
      }

      if (h.action === "popup") {
        alert(h.message || "Popup");
        return;
      }
    });

    overlayHotspots.appendChild(btn);
  }
}

function closeOverlay(){
  overlayOpen = false;
  overlay.classList.add("hidden");
  overlayHotspots.innerHTML = "";
}

closeOverlayBtn.addEventListener("click", closeOverlay);

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeOverlay();
});

function renderDebugCollisions(){
  debugLayer.innerHTML = "";
  if (!DEBUG_COLLISIONS) return;

  for (const box of (currentRoom.collisions || [])) {
    const div = document.createElement("div");
    div.className = "debug-box";
    div.style.left = `${(box.x / WORLD_W) * 100}%`;
    div.style.top = `${(box.y / WORLD_H) * 100}%`;
    div.style.width = `${(box.w / WORLD_W) * 100}%`;
    div.style.height = `${(box.h / WORLD_H) * 100}%`;
    debugLayer.appendChild(div);
  }
}

function update(){
  if (!overlayOpen && !transitioning) {
    let dx = 0;
    let dy = 0;

    if (keys.left) dx -= SPEED;
    if (keys.right) dx += SPEED;
    if (keys.up) dy -= SPEED;
    if (keys.down) dy += SPEED;

    tryMove(dx, dy);
    checkEdgeExit();
    updatePrompt();
  } else {
    promptEl.classList.remove("show");
  }

  if (overlayOpen && consumePressed("escape")) {
    closeOverlay();
  }

  updatePlayer();
  requestAnimationFrame(update);
}

loadRoom(DATA.startRoom);
update();
