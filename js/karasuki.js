
const DATA = window.KARASUKI_DATA

const stage = document.getElementById("roomStage")
const roomA = document.getElementById("roomA")
const roomB = document.getElementById("roomB")
const player = document.getElementById("player")

const overlay = document.getElementById("overlay")
const overlayImage = document.getElementById("overlayImage")

const fade = document.getElementById("fade")

let currentRoom
let roomData

let px = 0
let py = 0

const speed = 3

const keys = {}

document.addEventListener("keydown",e=>keys[e.key]=true)
document.addEventListener("keyup",e=>keys[e.key]=false)

function loadRoom(id,spawn="default"){

currentRoom = id
roomData = DATA.rooms[id]

roomA.style.backgroundImage = `url(${roomData.bg})`

const spawnPoint = roomData.spawns[spawn] || roomData.spawns.default

px = spawnPoint.x
py = spawnPoint.y

updatePlayer()

}

function updatePlayer(){

player.style.left = px+"px"
player.style.top = py+"px"

}

function checkHotspots(){

if(!roomData.hotspots) return

for(const h of roomData.hotspots){

if(
px > h.x &&
px < h.x + h.w &&
py > h.y &&
py < h.y + h.h
){

if(keys["Enter"]){

triggerHotspot(h)

}

}

}

}

function triggerHotspot(h){

if(h.action === "overlay"){

openOverlay(h.target)

}

}

function openOverlay(id){

const o = DATA.overlays[id]

overlayImage.src = o.image

overlay.classList.remove("hidden")

}

overlay.addEventListener("click",()=>{
overlay.classList.add("hidden")
})

function checkExits(){

if(!roomData.exits) return

if(px > 920 && roomData.exits.right){

changeRoom(roomData.exits.right)

}

if(px < 0 && roomData.exits.left){

changeRoom(roomData.exits.left)

}

if(py < 0 && roomData.exits.up){

changeRoom(roomData.exits.up)

}

if(py > 500 && roomData.exits.down){

changeRoom(roomData.exits.down)

}

}

function changeRoom(exit){

fade.classList.add("active")

setTimeout(()=>{

loadRoom(exit.to,exit.spawn)

fade.classList.remove("active")

},300)

}

function update(){

if(overlay.classList.contains("hidden")){

if(keys["ArrowLeft"] || keys["a"]) px -= speed
if(keys["ArrowRight"] || keys["d"]) px += speed
if(keys["ArrowUp"] || keys["w"]) py -= speed
if(keys["ArrowDown"] || keys["s"]) py += speed

checkExits()
checkHotspots()

}

updatePlayer()

requestAnimationFrame(update)

}

loadRoom(DATA.startRoom)

update()
