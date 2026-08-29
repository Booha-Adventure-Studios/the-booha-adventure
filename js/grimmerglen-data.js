/* Shared Grimmerglen asset manifest. The room renderer uses the same
   1536x1024 world canvas as Karasuki and Utsuroba. */
window.GRIMMERGLEN_DATA = {
  world: { width: 1536, height: 1024 },
  roomClass: 'grimmerglen-room grimmerglen-pastel-pop',
  spriteClass: 'grimmerglen-sprite',
  rooms: Object.fromEntries(Array.from({ length: 9 }, (_, index) => {
    const room = String(index + 1).padStart(2, '0');
    return [`room_${room}`, {
      bg: `assets/img/grimmerglen/room_${room}.webp`,
    }];
  })),
  marietta: {
    poses: Array.from({ length: 5 }, (_, index) => {
      const pose = String(index + 1).padStart(2, '0');
      return `assets/img/grimmerglen/marietta/marietta_${pose}.webp`;
    }),
  },
};
