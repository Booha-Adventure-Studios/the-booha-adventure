
/* ═══════════════════════════════════════════════════════════
   KARASUKI — ATMOSPHERE DATA
   Design layer only. No logic lives here.
   Engine: js/karasuki-atmosphere.js
   Load order: after karasuki-data.js, before karasuki.js

   Coordinates are WORLD pixels (1536 x 1024), same space as
   spawns / NPP / OBSERVER_COORDS.

   SAFE BAND: fitStage() scales with Math.max, so the world is
   cropped, not letterboxed. On a landscape phone only roughly
   y 165–865 is ever visible. Keep anything that must be seen
   inside that band. Horizontal is safe (landscape is enforced).
   ═══════════════════════════════════════════════════════════ */

window.KARASUKI_ATMOS = {

  /* ── Vitality ladder ──────────────────────────────────────
     Life APPEARS in stages rather than fading up linearly.
     Values are 0..1 on the combined vitality score.        */
  thresholds: {
    motes  : 0.20,   // particles fill in
    flies  : 0.35,   // fireflies wake
    life   : 0.55,   // moths, butterflies, critters
    secret : 0.75,   // this room's signature event
    deep   : 0.90    // crow, silence beat, observer glints
  },

  /* ── Particle presets ─────────────────────────────────────
     cols  : pool of RGB triples, one picked per mote
     size  : [min,max] radius in world px
     fall  : base speed (px/sec at mid depth)
     sway  : lateral wander
     glow  : true = soft sprite, false = solid flake
     rise  : true = drifts upward
     dens  : density multiplier vs the global count       */
  presets: {
    dust      : { cols:[[214,224,224]],                                   size:[1.2,3.0], fall:6,  sway:18, glow:true,  rise:true,  dens:1.00 },
    sparse    : { cols:[[206,218,220]],                                   size:[1.0,2.6], fall:5,  sway:16, glow:true,  rise:true,  dens:0.55 },
    ember     : { cols:[[236,192,124],[255,214,150]],                     size:[1.3,3.2], fall:7,  sway:16, glow:true,  rise:true,  dens:1.00 },
    spark     : { cols:[[255,140,60],[255,190,90]],                       size:[1.2,3.0], fall:11, sway:13, glow:true,  rise:true,  dens:1.15 },
    bluespore : { cols:[[120,190,255],[160,215,255]],                     size:[1.3,3.0], fall:5,  sway:22, glow:true,  rise:true,  dens:1.00 },
    colormote : { cols:[[255,150,190],[140,200,255],[255,214,130],[180,255,200]], size:[1.4,3.2], fall:6, sway:20, glow:true, rise:true, dens:1.10 },
    petal     : { cols:[[244,186,208],[255,214,224]],                     size:[4,8],     fall:26, sway:38, glow:false, rise:false, dens:0.90 },
    candy     : { cols:[[255,150,180],[150,205,255],[255,220,130],[190,160,255]], size:[4,8],   fall:24, sway:40, glow:false, rise:false, dens:0.95 },
    autumn    : { cols:[[212,132,60],[186,96,44],[224,168,86]],           size:[4,9],     fall:34, sway:44, glow:false, rise:false, dens:0.95 }
  },

  /* ── Firefly palettes ──────────────────────────────────── */
  flyColors: {
    teal  : [150,235,205],
    amber : [255,200,120],
    blue  : [130,190,255],
    pink  : [255,170,205]
  },

  /* ── Per-room configuration ───────────────────────────────
     preset      : key from presets above
     fog / cloud : 0..1 amount, 0 = off
     pathLight   : [x,y] the spot the room breathes around,
                   and where memory-motes travel to
     flyZones    : [x, y, w, h] rects fireflies live in
     flyPalette  : keys from flyColors
     events      : weights for the rare-event scheduler.
                   'observer' is auto-suppressed in whichever
                   room the real Observer occupies this week.
     signature   : this room's one secret. Types:
                   glowPulse | wisp | darkShape | sparkle
                   orbit | emberRise | sway                */
  rooms: {

    room_01: {
      name: 'The Overgrown Home',
      mood: 'Someone lived here, and the forest took it back.',
      preset: 'dust', fog: 0.90, cloud: 0.00,
      pathLight: [740, 500],
      flyZones: [[60, 290, 220, 150], [950, 240, 540, 220]],
      flyPalette: ['teal', 'amber'],
      events: { crow: 2, critter: 2, moth: 2, observer: 2.5, hush: 2 },
      signature: {
        type: 'glowPulse',
        label: 'a window dims, then remembers itself',
        points: [[250, 238], [400, 232], [545, 228]],
        color: [255, 196, 110], radius: 34
      }
    },

    room_02: {
      name: 'The Lantern Tree',
      mood: 'A tree full of small lit windows. Somebody is home.',
      preset: 'ember', fog: 0.00, cloud: 0.00,
      pathLight: [745, 470],
      flyZones: [[60, 210, 420, 200], [900, 190, 600, 210]],
      flyPalette: ['blue', 'teal', 'amber'],
      events: { moth: 3, butterfly: 2, critter: 2, crow: 1.5, observer: 1.5 },
      signature: {
        type: 'glowPulse',
        label: 'a dark window lights — someone came home',
        points: [[1075, 205], [1155, 265], [1195, 300]],
        color: [255, 206, 124], radius: 30
      }
    },

    room_03: {
      name: 'The Forked Path',
      mood: 'Two ways, one light at the end. The room that asks you to choose.',
      preset: 'ember', fog: 0.50, cloud: 0.35,
      pathLight: [768, 220],
      flyZones: [[30, 270, 320, 280], [1180, 240, 330, 320]],
      flyPalette: ['teal', 'amber'],
      events: { moth: 2, butterfly: 2, critter: 2, crow: 2, observer: 3, hush: 2.5 },
      signature: {
        type: 'wisp',
        label: 'a wisp drifts down the left fork and is gone',
        from: [660, 430], to: [180, 600],
        color: [190, 230, 225]
      }
    },

    room_04: {
      name: 'The Pumpkin Patch',
      mood: 'Harvest left out in the dark. Round, patient, faintly comic.',
      preset: 'autumn', fog: 0.25, cloud: 0.55,
      pathLight: [768, 470],
      flyZones: [[40, 250, 260, 200], [900, 200, 600, 240]],
      flyPalette: ['amber', 'teal'],
      events: { critter: 4, moth: 2, crow: 2, observer: 1.5, hush: 1.5 },
      signature: {
        type: 'darkShape',
        label: 'something small vanishes into the pumpkins',
        from: [960, 430], to: [1180, 330], size: 11
      }
    },

    room_05: {
      name: 'The Lit House',
      mood: 'Warm windows, a white fence. The one place that looks safe.',
      preset: 'dust', fog: 0.00, cloud: 0.25,
      pathLight: [768, 530],
      flyZones: [[20, 280, 240, 180], [900, 240, 600, 220]],
      flyPalette: ['teal', 'amber'],
      events: { moth: 4, butterfly: 2, critter: 2, crow: 1, observer: 1 },
      signature: {
        type: 'orbit',
        label: 'a moth circles the porch lantern, then leaves',
        at: [1053, 205], r: 26, color: [236, 224, 190]
      }
    },

    room_06: {
      name: 'The Watchers',
      mood: 'Three figures that do not move. The wind moves them instead.',
      preset: 'sparse', fog: 0.85, cloud: 0.00,
      pathLight: [768, 430],
      flyZones: [[20, 300, 180, 180], [1200, 240, 320, 240]],
      flyPalette: ['teal'],
      events: { crow: 3, observer: 4, hush: 4, critter: 1.5, moth: 1 },
      signature: {
        type: 'sway',
        label: 'their straw arms stir, though nothing else does',
        at: [300, 270], spread: 210
      }
    },

    room_07: {
      name: 'The Candy Bloom',
      mood: 'Something sugary growing where it has no business growing.',
      preset: 'candy', fog: 0.15, cloud: 0.20,
      pathLight: [768, 380],
      flyZones: [[20, 260, 220, 220], [900, 190, 600, 250]],
      flyPalette: ['pink', 'amber', 'teal'],
      events: { butterfly: 5, moth: 3, critter: 2, observer: 1, crow: 1 },
      signature: {
        type: 'sparkle',
        label: 'a petal comes loose and dissolves into sugar',
        at: [1130, 245], color: [255, 180, 205]
      }
    },

    room_08: {
      name: 'The Tunnel Mouth',
      mood: 'A brick arch going under. Two lanterns, and dark that does not end.',
      preset: 'dust', fog: 1.00, cloud: 0.00,
      pathLight: [880, 420],
      flyZones: [[20, 290, 200, 200], [950, 190, 560, 260]],
      flyPalette: ['teal', 'amber'],
      events: { observer: 4, crow: 2, hush: 3, critter: 2, moth: 1.5 },
      signature: {
        type: 'darkShape',
        label: 'something crosses the opening, inside',
        from: [300, 290], to: [440, 290], size: 26
      }
    },

    room_09: {
      name: 'The Revel',
      mood: 'Four skeletons caught mid-dance. Nobody told them the music stopped.',
      preset: 'sparse', fog: 0.45, cloud: 0.00,
      pathLight: [860, 330],
      flyZones: [[20, 230, 240, 260], [1300, 300, 220, 200]],
      flyPalette: ['teal', 'amber'],
      events: { critter: 4, crow: 2, moth: 2, hush: 2, observer: 2 },
      signature: {
        type: 'glowPulse',
        label: 'the light on them pulses, like a beat',
        points: [[960, 400]],
        color: [236, 214, 150], radius: 70
      }
    },

    room_10: {
      name: 'The Festival Tree',
      mood: 'Hung with lights someone tied there. A celebration nobody attended.',
      preset: 'petal', fog: 0.20, cloud: 0.20,
      pathLight: [768, 560],
      flyZones: [[20, 200, 600, 240], [1280, 220, 240, 220]],
      flyPalette: ['blue', 'pink', 'amber'],
      events: { butterfly: 4, moth: 3, critter: 2, observer: 1.5, crow: 1 },
      signature: {
        type: 'sway',
        label: 'every hanging light sways at once',
        at: [220, 240], spread: 360
      }
    },

    room_11: {
      name: 'The Ember Heart',
      mood: 'A tree burning from the inside and never burning down.',
      preset: 'spark', fog: 0.00, cloud: 0.00,
      pathLight: [768, 530],
      flyZones: [[20, 250, 220, 220], [880, 190, 620, 250]],
      flyPalette: ['amber'],
      events: { crow: 2.5, observer: 3, critter: 2, moth: 1.5, hush: 2 },
      signature: {
        type: 'emberRise',
        label: 'an ember works loose and climbs',
        at: [420, 300], color: [255, 132, 54]
      }
    },

    room_12: {
      name: 'The Bloom Tree',
      mood: 'Colour spilling out of a hollow trunk. Generous, and slightly too much.',
      preset: 'colormote', fog: 0.15, cloud: 0.15,
      pathLight: [768, 470],
      flyZones: [[20, 220, 440, 260], [830, 190, 700, 280]],
      flyPalette: ['blue', 'pink', 'amber', 'teal'],
      events: { butterfly: 4, moth: 3, critter: 2, observer: 1.5, crow: 1 },
      signature: {
        type: 'glowPulse',
        label: 'a hollow lights — something inside woke up',
        points: [[990, 353], [1160, 374]],
        color: [150, 210, 255], radius: 36
      }
    },

    room_13: {
      name: 'The Hearth Hollow',
      mood: 'A warm mouth in a cold trunk. It is an invitation. Probably.',
      preset: 'ember', fog: 0.40, cloud: 0.00,
      pathLight: [660, 460],
      flyZones: [[20, 220, 240, 240], [950, 190, 560, 240]],
      flyPalette: ['teal', 'amber'],
      events: { moth: 4, crow: 2, observer: 2.5, critter: 2, hush: 2 },
      signature: {
        type: 'orbit',
        label: 'a moth finds the hollow and goes in',
        at: [1130, 305], r: 30, color: [240, 222, 186]
      }
    },

    room_14: {
      name: 'The Spirit Tree',
      mood: 'Blue light in the roots. Cold, sacred, and not interested in you.',
      preset: 'bluespore', fog: 0.70, cloud: 0.00,
      pathLight: [768, 430],
      flyZones: [[20, 210, 620, 260], [1260, 190, 260, 240]],
      flyPalette: ['blue'],
      events: { observer: 4, hush: 3, crow: 2, moth: 2, critter: 1.5 },
      signature: {
        type: 'wisp',
        label: 'a wisp lets go of the tree and rises',
        from: [420, 270], to: [660, 180],
        color: [120, 190, 255]
      }
    },

    room_15: {
      name: 'The Shrine Gate',
      mood: 'A torii, three stone lanterns, and the manners to be quiet here.',
      preset: 'sparse', fog: 0.55, cloud: 0.00,
      pathLight: [790, 470],
      flyZones: [[20, 280, 240, 240], [950, 220, 560, 260]],
      flyPalette: ['teal', 'amber'],
      events: { hush: 4, observer: 3, crow: 2.5, moth: 2, critter: 1.5 },
      signature: {
        type: 'glowPulse',
        label: 'the lantern flames gutter together, then steady',
        points: [[265, 190], [318, 253], [490, 213]],
        color: [255, 206, 130], radius: 26
      }
    }

  }
};
