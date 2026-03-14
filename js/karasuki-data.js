
window.KARASUKI_DATA = {

startRoom: "entrance",

rooms:{

entrance:{

bg:"assets/karasuki/rooms/entrance.png",

spawns:{
default:{x:200,y:380}
},

exits:{
right:{to:"archives_hall",spawn:"left"}
},

hotspots:[
{
id:"archivesDoor",
x:700,
y:200,
w:150,
h:200,
action:"overlay",
target:"archives"
}
]

},

archives_hall:{

bg:"assets/karasuki/rooms/archives_hall.png",

spawns:{
default:{x:100,y:380},
left:{x:80,y:380}
},

exits:{
left:{to:"entrance",spawn:"default"}
},

hotspots:[
{
id:"archives",
x:420,
y:140,
w:120,
h:200,
action:"overlay",
target:"archives"
}
]

}

},

overlays:{

archives:{
image:"assets/karasuki/rooms/archives_overlay.png"
}

}

};
