

/* =====================================================
   BLOCK ARCHETYPES — reference templates
   Copy and adjust x/y/w/h/floorOffset per level.

   RESIST SCALE:
     1.0  = normal damage
     0.5  = noticeable reduction
     0.2  = almost useless
     0.1  = hard counter wall

   GLOW COLORS (shown in-game):
     ultimateproof → magenta
     fireproof     → orange-red
     iceproof      → cyan
     heavyproof    → amber
     rockproof     → grey
     rainbowproof  → green
     burnimmune    → orange
     freezeimmune  → light blue
     convertimmune → lime
   ===================================================== */

const ARCHETYPES = {

  // ── Anchor Block ─────────────────────────────────────
  // Core of towers. Must be cracked or prepped before
  // Ultimate/Heavy can finish it. Glows magenta + amber.
  anchor: (overrides) => ({
    material: 'stone',
    hp: 4,
    traits: ['ultimateproof', 'heavyproof'],
    resist: { fire: 0.15, rock: 0.5 },
    w: 60, h: 60,
    ...overrides,
  }),

  // ── Spread Block ─────────────────────────────────────
  // No traits, no resist — but burns fast and spreads
  // fire aggressively. Makes Fire Booha risky near clusters.
  // burnBoost flag is read by applyFireBurn (chunk 6).
  spread: (overrides) => ({
    material: 'wood',
    hp: 2,
    traits: [],
    resist: {},
    burnBoost: true,
    w: 50, h: 40,
    ...overrides,
  }),

  // ── Glass Converter Block ─────────────────────────────
  // Soft to heavy, ideal Rainbow target.
  // Glows green (rainbowproof is NOT set — this encourages rainbow).
  glassConverter: (overrides) => ({
    material: 'soft',
    hp: 2,
    traits: [],
    resist: { heavy: 0.5 },
    w: 50, h: 50,
    ...overrides,
  }),

  // ── Frozen Core Block ────────────────────────────────
  // Fireproof + freeze immune (already frozen state).
  // Hard to heavy. Ice shatters it efficiently via
  // the existing freeze→shatter mechanic.
  // Glows orange-red (fireproof).
  frozenCore: (overrides) => ({
    material: 'ice',
    hp: 3,
    traits: ['fireproof', 'freezeimmune'],
    resist: { heavy: 0.6, rock: 0.4, ultimate: 0.5 },
    w: 55, h: 55,
    ...overrides,
  }),

  // ── Shock Block ──────────────────────────────────────
  // Deferred — placeholder only, not active yet.
  // shock: true flag reserved for future vertical
  // damage propagation system.
  shock: (overrides) => ({
    material: 'stone',
    hp: 2,
    traits: [],
    resist: {},
    shock: true,
    w: 50, h: 30,
    ...overrides,
  }),

};
// ============================================================
// Booha Destruction — Levels 1–10 (CORRECTED)
//
// Canvas: 1280×720, FLOOR_Y = 640
// Block y = center. Bottom edge = y + h/2 must not exceed 640.
// Rear blocker formula: y = 640 - h/2  (sits flush on floor)
// Slingshot at x=190, so structures stay between x≈650–1240
// ============================================================

/* ============================================================
  ZONE 1 — LEARN THE RULES (Rounds 1–10)
  No traits. Learn physics, Booha powers, basic collapse.
============================================================ */

window.BOOHA_DESTRUCTION_LEVELS = [
 /* 1 — First Shot+ */
{
  id: 1, name: "First Shot+",
  targetPercent: 100,
  blocks: [

    // ── MAIN CORE ──
    { x:900, y:620, w:90, h:40, material:'wood', hp:1 },
    { x:900, y:572, w:90, h:40, material:'wood', hp:1 },
    { x:900, y:524, w:90, h:40, material:'wood', hp:1 },

    // ── TOP CAP (burnimmune) ──
    { x:900, y:480, w:120, h:24, material:'stone', hp:2,
      traits:['burnimmune'] },

    // ── REAR BLOCKER flush on floor ──
    { x:980, y:540, w:40, h:200, material:'stone', hp:2,
      traits:['ultimateproof'] },

    // ── SIDE JUNK: leaning towers ──
    // Left: tall glass spine + soft cap leaning right
    { x:720, y:560, w:24, h:160, material:'glass', hp:1 },
    { x:740, y:468, w:70, h:30, material:'soft', hp:1 },
    { x:700, y:620, w:70, h:40, material:'wood', hp:1 },

    // Right: mirrored lean
    { x:1130, y:560, w:24, h:160, material:'glass', hp:1 },
    { x:1110, y:468, w:70, h:30, material:'soft', hp:1 },
    { x:1150, y:620, w:70, h:40, material:'wood', hp:1 },

    // ── FLOATING CHAOS ──
    { x:840, y:440, w:80, h:30, material:'wood', hp:1 },
    { x:960, y:420, w:80, h:30, material:'glass', hp:1 },
    { x:780, y:400, w:80, h:30, material:'wood', hp:1 },
  ]
},

/* 2 — Glass Aware+ */
{
  id: 2, name: "Glass Aware+",
  targetPercent: 100,
  blocks: [
    // main structure
    { x:880, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:980, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:880, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:980, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:930, y:512, w:180, h:24, material:'wood', hp:1 },

    // anti-fire cap
    { x:930, y:474, w:210, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1060, y:555, w:34, h:170, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: scattered rubble — random heights, no symmetry
    { x:700, y:620, w:60, h:40, material:'soft', hp:1 },
    { x:740, y:580, w:50, h:40, material:'wood', hp:1 },
    { x:680, y:550, w:40, h:30, material:'glass', hp:1 },

    { x:1160, y:620, w:70, h:40, material:'wood', hp:1 },
    { x:1190, y:580, w:50, h:30, material:'soft', hp:1 },
    { x:1145, y:545, w:40, h:30, material:'glass', hp:1 },
    { x:1210, y:545, w:40, h:30, material:'wood', hp:1 },

    // floating junk
    { x:840, y:436, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:418, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:394, w:110, h:24, material:'wood', hp:1 },
  ]
},

/* 3 — Glass Core+ */
{
  id: 3, name: "Glass Core+",
  targetPercent: 100,
  blocks: [
    // main structure
    { x:850, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:930, y:620, w:120, h:40, material:'glass', hp:1 },
    { x:930, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:930, y:524, w:80, h:40, material:'wood', hp:1 },

    // anti-fire top
    { x:930, y:480, w:140, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1070, y:550, w:34, h:180, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: pyramid stacks — wide base tapering up
    { x:700, y:620, w:100, h:36, material:'soft', hp:1 },
    { x:700, y:578, w:70, h:36, material:'wood', hp:1 },
    { x:700, y:542, w:40, h:30, material:'glass', hp:1 },

    { x:1180, y:620, w:100, h:36, material:'soft', hp:1 },
    { x:1180, y:578, w:70, h:36, material:'wood', hp:1 },
    { x:1180, y:542, w:40, h:30, material:'glass', hp:1 },

    // floating chaos
    { x:870, y:432, w:70, h:30, material:'wood', hp:1 },
    { x:990, y:408, w:70, h:30, material:'glass', hp:1 },
    { x:930, y:382, w:120, h:24, material:'soft', hp:1 },
  ]
},

/* 4 — Meet Heavy+*/
{
  id: 4, name: "Meet Heavy+",
  targetPercent: 100,
  blocks: [
    // core
    { x:820, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1020, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:572, w:280, h:24, material:'stone', hp:2 },
    { x:920, y:536, w:120, h:48, material:'wood', hp:1 },

    // anti-fire top
    { x:920, y:488, w:160, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1090, y:555, w:36, h:170, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: dominoes — thin tall planks spaced apart
    { x:690, y:582, w:20, h:76, material:'wood', hp:1 },
    { x:720, y:590, w:20, h:60, material:'glass', hp:1 },
    { x:748, y:598, w:20, h:44, material:'wood', hp:1 },

    { x:1170, y:598, w:20, h:44, material:'wood', hp:1 },
    { x:1198, y:590, w:20, h:60, material:'glass', hp:1 },
    { x:1226, y:582, w:20, h:76, material:'wood', hp:1 },

    // floating blocks
    { x:820, y:444, w:80, h:28, material:'wood', hp:1 },
    { x:1020, y:426, w:80, h:28, material:'wood', hp:1 },
    { x:920, y:392, w:130, h:24, material:'stone', hp:2 },
  ]
},

/* 5 — Spread Shot+*/
{
  id: 5, name: "Spread Shot+",
  targetPercent: 100,
  blocks: [
    // main spread targets
    { x:800, y:620, w:100, h:36, material:'soft', hp:1 },
    { x:920, y:620, w:100, h:36, material:'soft', hp:1 },
    { x:1040, y:620, w:100, h:36, material:'soft', hp:1 },
    { x:800, y:576, w:100, h:36, material:'soft', hp:1 },
    { x:1040, y:576, w:100, h:36, material:'soft', hp:1 },

    // center layer
    { x:920, y:570, w:120, h:24, material:'wood', hp:1 },

    // top anti-fire plate
    { x:920, y:524, w:160, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1110, y:555, w:34, h:170, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: arch — two short pillars + lintel cap
    { x:686, y:598, w:22, h:60, material:'stone', hp:2 },
    { x:736, y:598, w:22, h:60, material:'stone', hp:2 },
    { x:711, y:562, w:72, h:20, material:'wood', hp:1 },

    { x:1180, y:598, w:22, h:60, material:'stone', hp:2 },
    { x:1230, y:598, w:22, h:60, material:'stone', hp:2 },
    { x:1205, y:562, w:72, h:20, material:'wood', hp:1 },

    // mid-air splash surfaces
    { x:840, y:454, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:454, w:70, h:28, material:'wood', hp:1 },
    { x:920, y:420, w:140, h:24, material:'soft', hp:1 },
  ]
},

/* 6 — Tall Glass Tower+ */
{
  id: 6, name: "Tall Glass Tower+",
  targetPercent: 100,
  blocks: [
    // core
    { x:900, y:620, w:60, h:40, material:'stone', hp:2 },
    { x:900, y:572, w:24, h:88, material:'glass', hp:1 },
    { x:900, y:472, w:24, h:88, material:'glass', hp:1 },
    { x:900, y:424, w:80, h:40, material:'wood', hp:1 },
    { x:820, y:620, w:60, h:40, material:'wood', hp:1 },
    { x:980, y:620, w:60, h:40, material:'wood', hp:1 },

    // top fire cap
    { x:900, y:382, w:120, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1010, y:535, w:32, h:210, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: stepped shelves — horizontal planks at staggered heights
    { x:700, y:620, w:90, h:28, material:'wood', hp:1 },
    { x:680, y:586, w:60, h:24, material:'soft', hp:1 },
    { x:715, y:556, w:50, h:24, material:'wood', hp:1 },

    { x:1150, y:620, w:90, h:28, material:'wood', hp:1 },
    { x:1170, y:586, w:60, h:24, material:'soft', hp:1 },
    { x:1140, y:556, w:50, h:24, material:'wood', hp:1 },

    // floating stuff
    { x:840, y:340, w:70, h:28, material:'wood', hp:1 },
    { x:980, y:322, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 7 — First Choice+*/
{
  id: 7, name: "First Choice+",
  targetPercent: 100,
  blocks: [
    // left path
    { x:820, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:820, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:820, y:500, w:100, h:40, material:'wood', hp:1 },

    // right path
    { x:1020, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1020, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:1020, y:524, w:80, h:40, material:'stone', hp:2 },

    // anti-fire protection
    { x:820, y:456, w:130, h:24, material:'stone', hp:2, traits:['burnimmune'] },
    { x:1020, y:478, w:120, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1100, y:551, w:34, h:178, material:'stone', hp:2, traits:['ultimateproof'] },

    // center mess
    { x:920, y:620, w:90, h:36, material:'soft', hp:1 },
    { x:920, y:578, w:90, h:36, material:'wood', hp:1 },
    { x:920, y:540, w:24, h:78, material:'glass', hp:1 },

    // SIDE JUNK: cross/offset pairs — two blocks overlapping at 45°-ish
    { x:690, y:610, w:70, h:24, material:'wood', hp:1 },
    { x:690, y:586, w:24, h:70, material:'glass', hp:1 },

    { x:1195, y:610, w:70, h:24, material:'wood', hp:1 },
    { x:1195, y:586, w:24, h:70, material:'glass', hp:1 },

    // floating choice clutter
    { x:890, y:404, w:70, h:28, material:'glass', hp:1 },
    { x:1050, y:390, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 8 — Offset Tower+0 */
{
  id: 8, name: "Offset Tower+",
  targetPercent: 100,
  blocks: [
    // original offset idea
    { x:880, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:960, y:524, w:80, h:40, material:'glass', hp:1 },
    { x:1000, y:476, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:428, w:80, h:40, material:'soft', hp:1 },

    // top cap
    { x:1000, y:382, w:130, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1080, y:540, w:34, h:200, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: staircases — ascending blocks left-to-right
    // Left stair (ascending right)
    { x:676, y:620, w:40, h:40, material:'wood', hp:1 },
    { x:716, y:604, w:40, h:40, material:'soft', hp:1 },
    { x:756, y:588, w:40, h:40, material:'wood', hp:1 },

    // Right stair (descending right)
    { x:1170, y:588, w:40, h:40, material:'wood', hp:1 },
    { x:1210, y:604, w:40, h:40, material:'soft', hp:1 },
    { x:1240, y:620, w:40, h:40, material:'wood', hp:1 },

    // overhead clutter
    { x:890, y:350, w:70, h:28, material:'wood', hp:1 },
    { x:1040, y:330, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 9 — Bounce Intro+ */
{
  id: 9, name: "Bounce Intro+",
  targetPercent: 100,
  blocks: [
    // main
    { x:920, y:620, w:200, h:30, material:'stone', hp:2 },
    { x:830, y:582, w:60, h:40, material:'wood', hp:1 },
    { x:1010, y:582, w:60, h:40, material:'wood', hp:1 },
    { x:920, y:570, w:80, h:24, material:'glass', hp:1 },
    { x:920, y:530, w:120, h:40, material:'wood', hp:1 },

    // anti-fire cap
    { x:920, y:486, w:150, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1065, y:553, w:34, h:174, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: T-shapes — vertical post + wide horizontal arm
    // Left T
    { x:706, y:594, w:20, h:60, material:'glass', hp:1 },
    { x:706, y:556, w:70, h:20, material:'wood', hp:1 },

    // Right T
    { x:1196, y:594, w:20, h:60, material:'glass', hp:1 },
    { x:1196, y:556, w:70, h:20, material:'wood', hp:1 },

    // floating bounce bait
    { x:860, y:434, w:70, h:28, material:'wood', hp:1 },
    { x:980, y:412, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:386, w:120, h:24, material:'soft', hp:1 },
  ]
},

/* 10 — False Base+ 549 */
{
  id: 10, name: "False Base+",
  targetPercent: 100,
  blocks: [
    // original core
    { x:920, y:620, w:160, h:30, material:'stone', hp:2 },
    { x:920, y:582, w:80, h:40, material:'glass', hp:1 },
    { x:920, y:534, w:200, h:24, material:'wood', hp:1 },
    { x:860, y:494, w:60, h:40, material:'wood', hp:1 },
    { x:980, y:494, w:60, h:40, material:'wood', hp:1 },
    { x:920, y:446, w:120, h:40, material:'soft', hp:1 },

    // top blocker
    { x:920, y:398, w:160, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1050, y:549, w:34, h:182, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: zigzag — alternating left/right offset blocks stacked
    { x:686, y:620, w:50, h:36, material:'soft', hp:1 },
    { x:710, y:578, w:50, h:36, material:'wood', hp:1 },
    { x:686, y:538, w:50, h:36, material:'glass', hp:1 },

    { x:1214, y:620, w:50, h:36, material:'soft', hp:1 },
    { x:1190, y:578, w:50, h:36, material:'wood', hp:1 },
    { x:1214, y:538, w:50, h:36, material:'glass', hp:1 },

    // fake upper clutter
    { x:830, y:352, w:70, h:28, material:'wood', hp:1 },
    { x:1010, y:334, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:312, w:130, h:24, material:'wood', hp:1 },
  ]
}, 

// ============================================================
// Booha Destruction — Levels 11–20 (CORRECTED)
//
// Canvas: 1280×720, FLOOR_Y = 640
// Block y = center. Bottom edge = y + h/2 must not exceed 640.
// Rear blocker formula: y = 640 - h/2
// Structures centered around x=900–940, within x=650–1240
// ============================================================

/* ============================================================
  ZONE 2 — FIRST TRAITS (Rounds 11–20)
  One or two immune blocks introduced per round.
============================================================ */

/* 11 — Fireproof Anchor+ */
{
  id: 11, name: "Fireproof Anchor+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:920, y:620, w:180, h:36, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:840, y:576, w:80, h:36, material:'wood', hp:1 },
    { x:1000, y:576, w:80, h:36, material:'wood', hp:1 },
    { x:840, y:532, w:80, h:36, material:'wood', hp:1 },
    { x:1000, y:532, w:80, h:36, material:'wood', hp:1 },
    { x:920, y:532, w:80, h:36, material:'soft', hp:1 },
    { x:920, y:488, w:180, h:36, material:'wood', hp:1 },

    // anti-fire top control
    { x:920, y:444, w:220, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1062, y:548, w:34, h:184, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: castle battlements
    // Left battlement
    { x:690, y:620, w:80, h:36, material:'stone', hp:2 },
    { x:666, y:584, w:32, h:32, material:'stone', hp:2 },
    { x:714, y:584, w:32, h:32, material:'stone', hp:2 },

    // Right battlement
    { x:1180, y:620, w:80, h:36, material:'stone', hp:2 },
    { x:1156, y:584, w:32, h:32, material:'stone', hp:2 },
    { x:1204, y:584, w:32, h:32, material:'stone', hp:2 },

    // floating clutter
    { x:860, y:396, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:378, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:350, w:140, h:24, material:'soft', hp:1 },
  ]
},

/* 12 — Iceproof Column+*/
{
  id: 12, name: "Iceproof Column+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:850, y:540, w:70, h:200, material:'stone', hp:2,
      traits:['iceproof'] },
    { x:1010, y:540, w:70, h:200, material:'stone', hp:2,
      traits:['iceproof'] },
    { x:930, y:512, w:220, h:24, material:'glass', hp:1 },
    { x:860, y:476, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:476, w:80, h:40, material:'wood', hp:1 },
    { x:930, y:428, w:180, h:40, material:'soft', hp:1 },

    // top plate
    { x:930, y:382, w:220, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1058, y:535, w:34, h:210, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: fence posts — thin verticals at regular spacing
    { x:686, y:598, w:18, h:60, material:'wood', hp:1 },
    { x:710, y:598, w:18, h:60, material:'wood', hp:1 },
    { x:734, y:598, w:18, h:60, material:'wood', hp:1 },
    { x:698, y:562, w:60, h:16, material:'wood', hp:1 },

    { x:1166, y:598, w:18, h:60, material:'wood', hp:1 },
    { x:1190, y:598, w:18, h:60, material:'wood', hp:1 },
    { x:1214, y:598, w:18, h:60, material:'wood', hp:1 },
    { x:1190, y:562, w:60, h:16, material:'wood', hp:1 },

    // floating chaos
    { x:860, y:334, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:320, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 13 — Rainbow Wall+*/
{
  id: 13, name: "Rainbow Wall+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:840, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:1000, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:572, w:260, h:24, material:'stone', hp:2 },
    { x:870, y:536, w:80, h:40, material:'wood', hp:1 },
    { x:970, y:536, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:488, w:140, h:40, material:'wood', hp:1 },

    // top fire control
    { x:920, y:442, w:180, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1042, y:548, w:34, h:184, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: hourglass — wide base, narrow waist, wide cap
    { x:696, y:620, w:70, h:28, material:'soft', hp:1 },
    { x:696, y:590, w:30, h:28, material:'wood', hp:1 },
    { x:696, y:560, w:70, h:28, material:'glass', hp:1 },

    { x:1184, y:620, w:70, h:28, material:'soft', hp:1 },
    { x:1184, y:590, w:30, h:28, material:'wood', hp:1 },
    { x:1184, y:560, w:70, h:28, material:'glass', hp:1 },

    // floating clutter
    { x:860, y:394, w:70, h:28, material:'wood', hp:1 },
    { x:995, y:374, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 14 — Heavyproof Soft Wall+ */
{
  id: 14, name: "Heavyproof Soft Wall+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:800, y:620, w:90, h:36, material:'soft', hp:1, traits:['heavyproof'] },
    { x:900, y:620, w:90, h:36, material:'soft', hp:1, traits:['heavyproof'] },
    { x:1000, y:620, w:90, h:36, material:'soft', hp:1, traits:['heavyproof'] },
    { x:800, y:576, w:90, h:36, material:'soft', hp:1, traits:['heavyproof'] },
    { x:900, y:576, w:90, h:36, material:'soft', hp:1, traits:['heavyproof'] },
    { x:1000, y:576, w:90, h:36, material:'soft', hp:1, traits:['heavyproof'] },
    { x:900, y:532, w:290, h:24, material:'stone', hp:2 },
    { x:900, y:484, w:120, h:40, material:'wood', hp:1 },

    // top cap
    { x:900, y:438, w:170, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1075, y:551, w:34, h:178, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: boulders — chunky square stone blocks
    { x:686, y:612, w:52, h:52, material:'stone', hp:2 },
    { x:714, y:568, w:40, h:40, material:'stone', hp:2 },

    { x:1194, y:612, w:52, h:52, material:'stone', hp:2 },
    { x:1166, y:568, w:40, h:40, material:'stone', hp:2 },

    // floating mess
    { x:820, y:390, w:70, h:28, material:'wood', hp:1 },
    { x:980, y:370, w:70, h:28, material:'glass', hp:1 },
    { x:900, y:344, w:150, h:24, material:'soft', hp:1 },
  ]
},

/* 15 — Chain Reaction+ */
{
  id: 15, name: "Chain Reaction+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:620, w:70, h:40, material:'wood', hp:1 },
    { x:830, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:870, y:512, w:200, h:24, material:'wood', hp:1 },
    { x:970, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:970, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:970, y:524, w:80, h:40, material:'wood', hp:1 },
    { x:970, y:476, w:80, h:40, material:'wood', hp:1 },

    // top control
    { x:970, y:432, w:130, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1042, y:537, w:34, h:206, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: bridge segments — flat planks at staggered mid heights
    { x:690, y:590, w:80, h:20, material:'wood', hp:1 },
    { x:690, y:564, w:80, h:20, material:'glass', hp:1 },
    { x:690, y:538, w:80, h:20, material:'wood', hp:1 },

    { x:1180, y:590, w:80, h:20, material:'wood', hp:1 },
    { x:1180, y:564, w:80, h:20, material:'glass', hp:1 },
    { x:1180, y:538, w:80, h:20, material:'wood', hp:1 },

    // upper clutter
    { x:900, y:454, w:80, h:28, material:'wood', hp:1 },
    { x:980, y:384, w:130, h:24, material:'soft', hp:1 },
  ]
},

/* 16 — Nightmare Intro+*/
{
  id: 16, name: "Nightmare Intro+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:860, y:540, w:40, h:200, material:'stone', hp:2 },
    { x:860, y:432, w:40, h:24, material:'stone', hp:2 },
    { x:1000, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:524, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:476, w:80, h:40, material:'glass', hp:1 },
    { x:1000, y:428, w:120, h:40, material:'wood', hp:1 },

    // top cap
    { x:1000, y:382, w:160, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1068, y:535, w:34, h:210, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: L-shapes — corner brackets
    // Left L
    { x:676, y:620, w:60, h:36, material:'wood', hp:1 },
    { x:660, y:584, w:28, h:72, material:'glass', hp:1 },

    // Right L (mirrored)
    { x:1184, y:620, w:60, h:36, material:'wood', hp:1 },
    { x:1200, y:584, w:28, h:72, material:'glass', hp:1 },

    // central bounce junk
    { x:920, y:620, w:90, h:36, material:'soft', hp:1 },
    { x:930, y:580, w:80, h:30, material:'wood', hp:1 },

    // upper bait
    { x:880, y:346, w:70, h:28, material:'glass', hp:1 },
    { x:1020, y:326, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 17 — Burn Spread+*/
{
  id: 17, name: "Burn Spread+",
  targetPercent: 100,
  blocks: [
    // core lesson — grid of burnable blocks
    { x:840, y:620, w:70, h:40, material:'wood', hp:1 },
    { x:920, y:620, w:70, h:40, material:'soft', hp:1 },
    { x:1000, y:620, w:70, h:40, material:'wood', hp:1 },
    { x:840, y:572, w:70, h:40, material:'wood', hp:1 },
    { x:920, y:572, w:70, h:40, material:'soft', hp:1 },
    { x:1000, y:572, w:70, h:40, material:'wood', hp:1 },
    { x:840, y:524, w:70, h:40, material:'wood', hp:1 },
    { x:920, y:524, w:70, h:40, material:'soft', hp:1 },
    { x:1000, y:524, w:70, h:40, material:'wood', hp:1 },

    // anti-fire overcap
    { x:920, y:478, w:220, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1058, y:547, w:34, h:186, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: campfire log-cabin stacks — alternating horizontal layers
    { x:692, y:620, w:70, h:22, material:'wood', hp:1 },
    { x:692, y:594, w:22, h:36, material:'wood', hp:1 },
    { x:718, y:594, w:22, h:36, material:'wood', hp:1 },
    { x:692, y:572, w:70, h:22, material:'soft', hp:1 },

    { x:1188, y:620, w:70, h:22, material:'wood', hp:1 },
    { x:1176, y:594, w:22, h:36, material:'wood', hp:1 },
    { x:1202, y:594, w:22, h:36, material:'wood', hp:1 },
    { x:1188, y:572, w:70, h:22, material:'soft', hp:1 },

    // floating chaos
    { x:860, y:430, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:410, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 18 — Fireproof Wall+*/
{
  id: 18, name: "Fireproof Wall+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:840, y:540, w:40, h:200, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:980, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:980, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:980, y:524, w:80, h:40, material:'glass', hp:1 },
    { x:980, y:476, w:80, h:40, material:'wood', hp:1 },
    { x:980, y:428, w:120, h:40, material:'soft', hp:1 },

    // top cap
    { x:980, y:382, w:160, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1052, y:534, w:34, h:212, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: tumbled rubble — odd-size chunks at varied heights
    { x:682, y:620, w:48, h:36, material:'stone', hp:2 },
    { x:716, y:604, w:36, h:52, material:'stone', hp:2 },
    { x:692, y:568, w:52, h:28, material:'wood', hp:1 },

    { x:1178, y:620, w:48, h:36, material:'stone', hp:2 },
    { x:1204, y:600, w:36, h:52, material:'stone', hp:2 },
    { x:1186, y:564, w:52, h:28, material:'wood', hp:1 },

    // floating bait
    { x:910, y:340, w:70, h:28, material:'glass', hp:1 },
    { x:1040, y:320, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 19 — False Center+ */
{
  id: 19, name: "False Center+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:830, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:1010, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:920, y:512, w:260, h:36, material:'stone', hp:2 },
    { x:920, y:466, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:418, w:140, h:40, material:'soft', hp:1 },

    // anti-fire top
    { x:920, y:372, w:180, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1058, y:533, w:34, h:214, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: tripod legs — angled pairs with cap
    // Left tripod
    { x:676, y:610, w:20, h:60, material:'wood', hp:1 },
    { x:708, y:610, w:20, h:60, material:'wood', hp:1 },
    { x:692, y:584, w:54, h:20, material:'stone', hp:2 },

    // Right tripod
    { x:1164, y:610, w:20, h:60, material:'wood', hp:1 },
    { x:1196, y:610, w:20, h:60, material:'wood', hp:1 },
    { x:1180, y:584, w:54, h:20, material:'stone', hp:2 },

    // fake upper clutter
    { x:860, y:324, w:70, h:28, material:'wood', hp:1 },
    { x:995, y:306, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 20 — Vertical Collapse+ */
{
  id: 20, name: "Vertical Collapse+",
  targetPercent: 100,
  blocks: [
    // core lesson — tall tower
    { x:920, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:524, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:476, w:80, h:24, material:'glass', hp:1 },
    { x:920, y:440, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:392, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:344, w:120, h:40, material:'stone', hp:2 },

    // top cap
    { x:920, y:296, w:150, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor (tallest in zone 2)
    { x:978, y:480, w:30, h:320, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: scaffolding — vertical post + horizontal rungs
    // Left scaffold
    { x:676, y:580, w:16, h:120, material:'wood', hp:1 },
    { x:700, y:568, w:42, h:14, material:'wood', hp:1 },
    { x:700, y:540, w:42, h:14, material:'wood', hp:1 },
    { x:700, y:512, w:42, h:14, material:'wood', hp:1 },

    // Right scaffold
    { x:1164, y:580, w:16, h:120, material:'wood', hp:1 },
    { x:1140, y:568, w:42, h:14, material:'wood', hp:1 },
    { x:1140, y:540, w:42, h:14, material:'wood', hp:1 },
    { x:1140, y:512, w:42, h:14, material:'wood', hp:1 },

    // overhead chaos
    { x:860, y:250, w:70, h:28, material:'wood', hp:1 },
    { x:995, y:232, w:70, h:28, material:'glass', hp:1 },
  ]
},
    
// ============================================================
// Booha Destruction — Levels 21–30 (CORRECTED)
//
// Canvas: 1280×720, FLOOR_Y = 640
// Block y = center. Bottom edge = y + h/2 must not exceed 640.
// Rear blocker formula: y = 640 - h/2
// Structures centered around x=900–940, within x=650–1240
// ============================================================

/* ============================================================
  ZONE 3 — TRAITS AS PUZZLE (Rounds 21–30)
  Right Booha mechanically required. Wrong approach costs 4+ shots.
============================================================ */

/* 21 — Fireproof Core+ */
{
  id: 21, name: "Fireproof Core+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:920, y:572, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:830, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:524, w:280, h:24, material:'wood', hp:1 },
    { x:920, y:476, w:120, h:40, material:'soft', hp:1 },

    // top cap
    { x:920, y:430, w:220, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1052, y:545, w:36, h:190, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: wrecking balls — thin glass post + heavy stone cap
    { x:686, y:594, w:16, h:80, material:'glass', hp:1 },
    { x:686, y:546, w:50, h:50, material:'stone', hp:2 },

    { x:1184, y:594, w:16, h:80, material:'glass', hp:1 },
    { x:1184, y:546, w:50, h:50, material:'stone', hp:2 },

    // floating clutter
    { x:860, y:382, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:364, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:336, w:140, h:24, material:'soft', hp:1 },
  ]
},

/* 22 — Iceproof Base+ */
{
  id: 22, name: "Iceproof Base+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:920, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune'] },
    { x:920, y:572, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune'] },
    { x:920, y:524, w:80, h:40, material:'stone', hp:2 },
    { x:830, y:580, w:60, h:80, material:'wood', hp:1 },
    { x:1010, y:580, w:60, h:80, material:'wood', hp:1 },
    { x:830, y:476, w:260, h:24, material:'wood', hp:1 },
    { x:920, y:428, w:100, h:40, material:'soft', hp:1 },

    // top control
    { x:920, y:382, w:180, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:998, y:530, w:32, h:220, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: igloo arches — stone pillars with rounded cap feel
    { x:678, y:608, w:34, h:52, material:'stone', hp:2 },
    { x:712, y:608, w:34, h:52, material:'stone', hp:2 },
    { x:695, y:574, w:68, h:22, material:'stone', hp:2 },
    { x:695, y:548, w:40, h:20, material:'soft', hp:1 },

    { x:1166, y:608, w:34, h:52, material:'stone', hp:2 },
    { x:1200, y:608, w:34, h:52, material:'stone', hp:2 },
    { x:1183, y:574, w:68, h:22, material:'stone', hp:2 },
    { x:1183, y:548, w:40, h:20, material:'soft', hp:1 },

    // upper clutter
    { x:860, y:334, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:314, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 23 — Convertimmune Tower+ */
{
  id: 23, name: "Convertimmune Tower+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:920, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:920, y:572, w:280, h:24, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:870, y:536, w:80, h:40, material:'wood', hp:1 },
    { x:970, y:536, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:488, w:140, h:40, material:'wood', hp:1 },

    // top cap
    { x:920, y:442, w:180, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1052, y:546, w:36, h:188, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: windmill sails — two overlapping planks forming a cross
    { x:692, y:594, w:60, h:18, material:'wood', hp:1 },
    { x:692, y:594, w:18, h:60, material:'glass', hp:1 },

    { x:1188, y:594, w:60, h:18, material:'wood', hp:1 },
    { x:1188, y:594, w:18, h:60, material:'glass', hp:1 },

    // side piles
    { x:672, y:620, w:50, h:36, material:'soft', hp:1 },
    { x:1208, y:620, w:50, h:36, material:'soft', hp:1 },

    // floating clutter
    { x:860, y:394, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:374, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 24 — Mixed Proof Tower+ */
{
  id: 24, name: "Mixed Proof Tower+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:540, w:80, h:200, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:1010, y:540, w:80, h:200, material:'stone', hp:2,
      traits:['iceproof','freezeimmune'] },
    { x:920, y:572, w:220, h:24, material:'glass', hp:1 },
    { x:860, y:536, w:80, h:40, material:'wood', hp:1 },
    { x:980, y:536, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:488, w:180, h:40, material:'soft', hp:1 },

    // top cap
    { x:920, y:442, w:220, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1062, y:534, w:34, h:212, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: oil drums — wide squat blocks stacked 2 high
    { x:686, y:620, w:64, h:36, material:'stone', hp:2 },
    { x:686, y:582, w:64, h:36, material:'stone', hp:2 },

    { x:1184, y:620, w:64, h:36, material:'stone', hp:2 },
    { x:1184, y:582, w:64, h:36, material:'stone', hp:2 },

    // extra bounce glass
    { x:752, y:546, w:24, h:84, material:'glass', hp:1 },
    { x:1118, y:546, w:24, h:84, material:'glass', hp:1 },

    // upper clutter
    { x:860, y:388, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:370, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 25 — Ultimateproof Anchor+*/
{
  id: 25, name: "Ultimateproof Anchor+",
  targetPercent: 90,
  blocks: [
    // core lesson
    { x:800, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['ultimateproof'] },
    { x:1040, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:572, w:300, h:24, material:'wood', hp:1 },
    { x:840, y:536, w:80, h:40, material:'glass', hp:1 },
    { x:920, y:536, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:536, w:80, h:40, material:'glass', hp:1 },
    { x:920, y:488, w:200, h:40, material:'soft', hp:1 },
    { x:920, y:440, w:140, h:40, material:'wood', hp:1 },

    // top control
    { x:920, y:394, w:200, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1068, y:544, w:34, h:192, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: radar dishes — thin post + wide flat cap
    { x:686, y:600, w:16, h:64, material:'wood', hp:1 },
    { x:686, y:562, w:80, h:18, material:'stone', hp:2 },

    { x:1184, y:600, w:16, h:64, material:'wood', hp:1 },
    { x:1184, y:562, w:80, h:18, material:'stone', hp:2 },

    // ricochet bait
    { x:760, y:546, w:24, h:82, material:'glass', hp:1 },
    { x:1110, y:546, w:24, h:82, material:'glass', hp:1 },

    // upper clutter
    { x:860, y:346, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:328, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 26 — Resist Wall+*/
{
  id: 26, name: "Resist Wall+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:620, w:80, h:40, material:'stone', hp:2, resist:{fire:0.25} },
    { x:920, y:620, w:80, h:40, material:'stone', hp:2, resist:{fire:0.25} },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2, resist:{fire:0.25} },
    { x:830, y:572, w:80, h:40, material:'stone', hp:2, resist:{fire:0.25} },
    { x:920, y:572, w:80, h:40, material:'stone', hp:2, resist:{fire:0.25} },
    { x:1010, y:572, w:80, h:40, material:'stone', hp:2, resist:{fire:0.25} },
    { x:920, y:524, w:280, h:24, material:'wood', hp:1 },
    { x:920, y:476, w:100, h:40, material:'soft', hp:1 },

    // top cap
    { x:920, y:432, w:190, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1058, y:545, w:34, h:190, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: sandbag walls — staggered brick rows
    { x:692, y:620, w:76, h:28, material:'soft', hp:1 },
    { x:680, y:590, w:52, h:28, material:'soft', hp:1 },
    { x:704, y:590, w:52, h:28, material:'soft', hp:1 },
    { x:692, y:560, w:76, h:28, material:'soft', hp:1 },

    { x:1198, y:620, w:76, h:28, material:'soft', hp:1 },
    { x:1186, y:590, w:52, h:28, material:'soft', hp:1 },
    { x:1210, y:590, w:52, h:28, material:'soft', hp:1 },
    { x:1198, y:560, w:76, h:28, material:'soft', hp:1 },

    // side glass bait
    { x:758, y:536, w:24, h:84, material:'glass', hp:1 },
    { x:1102, y:536, w:24, h:84, material:'glass', hp:1 },

    // upper clutter
    { x:860, y:384, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:364, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 27 — Puzzle Tower+ */
{
  id: 27, name: "Puzzle Tower+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:540, w:70, h:200, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:1010, y:540, w:70, h:200, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:920, y:620, w:100, h:40, material:'wood', hp:1 },
    { x:920, y:572, w:100, h:40, material:'wood', hp:1 },
    { x:920, y:524, w:100, h:40, material:'wood', hp:1 },
    { x:920, y:476, w:100, h:40, material:'wood', hp:1 },
    { x:920, y:428, w:120, h:40, material:'soft', hp:1 },

    // top plate
    { x:920, y:382, w:170, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1058, y:533, w:34, h:214, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: rocket fins — tall spine + two short angled base blocks
    { x:684, y:582, w:16, h:100, material:'wood', hp:1 },
    { x:668, y:616, w:30, h:32, material:'stone', hp:2 },
    { x:700, y:616, w:30, h:32, material:'stone', hp:2 },

    { x:1186, y:582, w:16, h:100, material:'wood', hp:1 },
    { x:1170, y:616, w:30, h:32, material:'stone', hp:2 },
    { x:1202, y:616, w:30, h:32, material:'stone', hp:2 },

    // floating chaos
    { x:860, y:336, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:318, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 28 — Bounce Scaling+ */
{
  id: 28, name: "Bounce Scaling+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:920, y:620, w:360, h:28, material:'stone', hp:2 },
    { x:800, y:580, w:70, h:40, material:'wood', hp:1 },
    { x:880, y:580, w:70, h:40, material:'stone', hp:2 },
    { x:960, y:580, w:70, h:40, material:'wood', hp:1 },
    { x:1040, y:580, w:70, h:40, material:'stone', hp:2 },
    { x:840, y:532, w:160, h:24, material:'wood', hp:1 },
    { x:1000, y:532, w:160, h:24, material:'wood', hp:1 },
    { x:920, y:484, w:200, h:40, material:'soft', hp:1 },

    // anti-fire top
    { x:920, y:438, w:230, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1088, y:547, w:34, h:186, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: pinball bumpers — tight 2x2 cluster of small blocks
    { x:672, y:612, w:34, h:34, material:'stone', hp:2 },
    { x:706, y:612, w:34, h:34, material:'stone', hp:2 },
    { x:672, y:578, w:34, h:34, material:'glass', hp:1 },
    { x:706, y:578, w:34, h:34, material:'glass', hp:1 },

    { x:1164, y:612, w:34, h:34, material:'stone', hp:2 },
    { x:1198, y:612, w:34, h:34, material:'stone', hp:2 },
    { x:1164, y:578, w:34, h:34, material:'glass', hp:1 },
    { x:1198, y:578, w:34, h:34, material:'glass', hp:1 },

    // overhead clutter
    { x:840, y:390, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:370, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:344, w:140, h:24, material:'soft', hp:1 },
  ]
},

/* 29 — Center Blast+*/
{
  id: 29, name: "Center Blast+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:780, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:880, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:980, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1080, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:830, y:572, w:80, h:40, material:'glass', hp:1 },
    { x:1030, y:572, w:80, h:40, material:'glass', hp:1 },
    { x:930, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:830, y:524, w:80, h:40, material:'wood', hp:1 },
    { x:1030, y:524, w:80, h:40, material:'wood', hp:1 },
    { x:930, y:524, w:80, h:40, material:'soft', hp:1 },

    // top control
    { x:930, y:478, w:180, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1068, y:545, w:34, h:190, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: totem poles — three stacked blocks, wide to narrow
    { x:684, y:620, w:70, h:34, material:'wood', hp:1 },
    { x:684, y:582, w:50, h:34, material:'glass', hp:1 },
    { x:684, y:548, w:30, h:30, material:'stone', hp:2 },

    { x:1186, y:620, w:70, h:34, material:'wood', hp:1 },
    { x:1186, y:582, w:50, h:34, material:'glass', hp:1 },
    { x:1186, y:548, w:30, h:30, material:'stone', hp:2 },

    // upper clutter
    { x:860, y:392, w:70, h:28, material:'wood', hp:1 },
    { x:1005, y:374, w:70, h:28, material:'glass', hp:1 },
    { x:930, y:346, w:150, h:24, material:'soft', hp:1 },
  ]
},

/* 30 — Three-Zone Traits+ */
{
  id: 30, name: "Three-Zone Traits+",
  targetPercent: 100,
  blocks: [
    // core lesson — left zone fireproof
    { x:800, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:800, y:572, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:800, y:524, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },

    // center zone soft
    { x:920, y:620, w:90, h:36, material:'soft', hp:1 },
    { x:920, y:576, w:90, h:36, material:'soft', hp:1 },
    { x:920, y:532, w:90, h:36, material:'soft', hp:1 },

    // right zone iceproof
    { x:1040, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune'] },
    { x:1040, y:572, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune'] },
    { x:1040, y:524, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune'] },

    // cross-top control
    { x:920, y:478, w:360, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1088, y:546, w:34, h:188, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: fallen columns — long horizontal planks on the ground
    { x:706, y:620, w:120, h:28, material:'stone', hp:2 },
    { x:696, y:588, w:80, h:20, material:'wood', hp:1 },

    { x:1194, y:620, w:120, h:28, material:'stone', hp:2 },
    { x:1204, y:588, w:80, h:20, material:'wood', hp:1 },

    // middle bounce bait
    { x:860, y:440, w:70, h:28, material:'wood', hp:1 },
    { x:980, y:420, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:392, w:150, h:24, material:'soft', hp:1 },
  ]
},  
// ============================================================
// Booha Destruction — Levels 31–40 (CORRECTED)
//
// Canvas: 1280×720, FLOOR_Y = 640
// Block y = center. Bottom edge = y + h/2 must not exceed 640.
// Rear blocker formula: y = 640 - h/2
// Structures centered around x=900–940, within x=650–1240
// ============================================================

/* ============================================================
  ZONE 4 — MULTI-STEP + TRAITS (Rounds 31–40)
  Collapse sequencing AND immune blocks. Both required.
============================================================ */

/* 31 — Delayed Collapse+*/
{
  id: 31, name: "Delayed Collapse+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:860, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:930, y:572, w:220, h:24, material:'glass', hp:1 },
    { x:860, y:524, w:80, h:40, material:'stone', hp:2 },
    { x:1000, y:524, w:80, h:40, material:'stone', hp:2 },
    { x:930, y:476, w:220, h:24, material:'stone', hp:2 },
    { x:930, y:428, w:140, h:40, material:'stone', hp:2 },
    { x:930, y:380, w:100, h:40, material:'soft', hp:1 },

    // anti-fire cap
    { x:930, y:334, w:170, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1058, y:526, w:36, h:228, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: diving boards — short post + long horizontal arm
    { x:672, y:612, w:20, h:50, material:'stone', hp:2 },
    { x:700, y:604, w:70, h:20, material:'wood', hp:1 },

    { x:1188, y:612, w:20, h:50, material:'stone', hp:2 },
    { x:1160, y:604, w:70, h:20, material:'wood', hp:1 },

    // left and right ground junk
    { x:670, y:620, w:50, h:36, material:'soft', hp:1 },
    { x:1210, y:620, w:50, h:36, material:'soft', hp:1 },

    // floating clutter
    { x:860, y:286, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:268, w:70, h:28, material:'glass', hp:1 },
    { x:930, y:242, w:150, h:24, material:'soft', hp:1 },
  ]
},

/* 32 — Immune Bridge+ */
{
  id: 32, name: "Immune Bridge+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:830, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:1010, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:548, w:220, h:24, material:'stone', hp:2,
      traits:['ultimateproof'] },
    { x:830, y:500, w:80, h:40, material:'glass', hp:1 },
    { x:1010, y:500, w:80, h:40, material:'glass', hp:1 },
    { x:920, y:452, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:404, w:140, h:40, material:'soft', hp:1 },

    // anti-fire top
    { x:920, y:358, w:190, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1062, y:525, w:36, h:230, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: tank traps — two planks in an X shape
    { x:680, y:600, w:64, h:18, material:'stone', hp:2 },
    { x:680, y:600, w:18, h:64, material:'stone', hp:2 },

    { x:1190, y:600, w:64, h:18, material:'stone', hp:2 },
    { x:1190, y:600, w:18, h:64, material:'stone', hp:2 },

    // side ground pads
    { x:668, y:620, w:56, h:32, material:'soft', hp:1 },
    { x:1210, y:620, w:56, h:32, material:'soft', hp:1 },

    // upper clutter
    { x:860, y:312, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:294, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 33 — Fireproof Shell+*/
{
  id: 33, name: "Fireproof Shell+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:920, y:620, w:300, h:28, material:'wood', hp:1 },
    { x:830, y:580, w:80, h:40, material:'wood', hp:1 },
    { x:1010, y:580, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:580, w:80, h:40, material:'stone', hp:2,
      traits:['burnimmune'] },
    { x:920, y:532, w:240, h:24, material:'wood', hp:1 },
    { x:830, y:484, w:80, h:40, material:'wood', hp:1 },
    { x:1010, y:484, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:484, w:80, h:40, material:'stone', hp:2,
      traits:['burnimmune'] },
    { x:920, y:436, w:180, h:40, material:'soft', hp:1 },

    // top control
    { x:920, y:390, w:230, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1062, y:526, w:36, h:228, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: hay bales — wide soft blocks in staggered brick rows
    { x:682, y:620, w:80, h:30, material:'soft', hp:1 },
    { x:668, y:588, w:56, h:30, material:'soft', hp:1 },
    { x:698, y:588, w:56, h:30, material:'soft', hp:1 },

    { x:1198, y:620, w:80, h:30, material:'soft', hp:1 },
    { x:1184, y:588, w:56, h:30, material:'soft', hp:1 },
    { x:1214, y:588, w:56, h:30, material:'soft', hp:1 },

    // side bait glass
    { x:652, y:548, w:24, h:72, material:'glass', hp:1 },
    { x:1218, y:548, w:24, h:72, material:'glass', hp:1 },

    // floating clutter
    { x:860, y:344, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:324, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 34 — Dual Illusion+ */
{
  id: 34, name: "Dual Illusion+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:820, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1020, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:820, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:1020, y:556, w:24, h:88, material:'stone', hp:2 },
    { x:920, y:512, w:260, h:24, material:'wood', hp:1 },
    { x:920, y:464, w:100, h:40, material:'stone', hp:2 },
    { x:820, y:512, w:80, h:40, material:'soft', hp:1 },
    { x:1020, y:512, w:80, h:40, material:'wood', hp:1 },

    // top cap
    { x:920, y:418, w:190, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1070, y:527, w:36, h:226, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: ship masts — tall thin post with a short crossbeam
    { x:672, y:572, w:14, h:130, material:'wood', hp:1 },
    { x:672, y:498, w:60, h:14, material:'wood', hp:1 },
    { x:672, y:620, w:40, h:36, material:'stone', hp:2 },

    { x:1188, y:572, w:14, h:130, material:'wood', hp:1 },
    { x:1188, y:498, w:60, h:14, material:'wood', hp:1 },
    { x:1188, y:620, w:40, h:36, material:'stone', hp:2 },

    // upper clutter
    { x:860, y:372, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:352, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:326, w:150, h:24, material:'soft', hp:1 },
  ]
},

/* 35 — Immunity Collapse+ */
{
  id: 35, name: "Immunity Collapse+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:820, y:620, w:70, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:820, y:564, w:24, h:88, material:'glass', hp:1 },
    { x:820, y:500, w:80, h:56, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:960, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:960, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:960, y:524, w:80, h:40, material:'wood', hp:1 },
    { x:960, y:476, w:80, h:40, material:'soft', hp:1 },
    { x:1040, y:620, w:80, h:40, material:'glass', hp:1 },
    { x:1040, y:572, w:80, h:40, material:'wood', hp:1 },

    // top control
    { x:960, y:430, w:170, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1100, y:524, w:36, h:232, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: lego studs — base plate + small square bumps on top
    { x:682, y:620, w:80, h:22, material:'stone', hp:2 },
    { x:668, y:598, w:22, h:22, material:'stone', hp:2 },
    { x:690, y:598, w:22, h:22, material:'stone', hp:2 },
    { x:712, y:598, w:22, h:22, material:'stone', hp:2 },

    { x:1198, y:620, w:80, h:22, material:'stone', hp:2 },
    { x:1184, y:598, w:22, h:22, material:'stone', hp:2 },
    { x:1206, y:598, w:22, h:22, material:'stone', hp:2 },
    { x:1228, y:598, w:22, h:22, material:'stone', hp:2 },

    // upper clutter
    { x:890, y:382, w:70, h:28, material:'wood', hp:1 },
    { x:1040, y:362, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 36 — Top First+ */
{
  id: 36, name: "Top First+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:860, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:1000, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:860, y:556, w:24, h:88, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:1000, y:556, w:24, h:88, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:930, y:512, w:240, h:24, material:'wood', hp:1 },
    { x:930, y:460, w:200, h:40, material:'stone', hp:2 },
    { x:860, y:412, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:412, w:80, h:40, material:'wood', hp:1 },
    { x:930, y:364, w:220, h:40, material:'soft', hp:1 },

    // top cap
    { x:930, y:318, w:240, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1056, y:520, w:36, h:240, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: mushrooms — narrow stem + wide flat cap
    { x:672, y:604, w:20, h:50, material:'wood', hp:1 },
    { x:680, y:570, w:70, h:20, material:'soft', hp:1 },
    { x:680, y:620, w:44, h:32, material:'stone', hp:2 },

    { x:1188, y:604, w:20, h:50, material:'wood', hp:1 },
    { x:1188, y:570, w:70, h:20, material:'soft', hp:1 },
    { x:1188, y:620, w:44, h:32, material:'stone', hp:2 },

    // ricochet bait
    { x:660, y:530, w:24, h:86, material:'glass', hp:1 },
    { x:1210, y:530, w:24, h:86, material:'glass', hp:1 },

    // upper clutter
    { x:860, y:272, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:254, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 37 — Heavy-Only Core+ */
{
  id: 37, name: "Heavy-Only Core+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:620, w:80, h:40, material:'soft', hp:1, traits:['heavyproof'] },
    { x:1010, y:620, w:80, h:40, material:'soft', hp:1, traits:['heavyproof'] },
    { x:830, y:576, w:80, h:40, material:'soft', hp:1, traits:['heavyproof'] },
    { x:1010, y:576, w:80, h:40, material:'soft', hp:1, traits:['heavyproof'] },
    { x:920, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:576, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:532, w:280, h:24, material:'wood', hp:1 },
    { x:920, y:484, w:140, h:40, material:'soft', hp:1 },

    // anti-fire top
    { x:920, y:438, w:200, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1058, y:543, w:34, h:194, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: satellite dishes — square body + two flat wing panels
    { x:672, y:600, w:36, h:36, material:'stone', hp:2 },
    { x:650, y:600, w:18, h:20, material:'glass', hp:1 },
    { x:694, y:600, w:18, h:20, material:'glass', hp:1 },
    { x:672, y:620, w:36, h:36, material:'stone', hp:2 },

    { x:1188, y:600, w:36, h:36, material:'stone', hp:2 },
    { x:1166, y:600, w:18, h:20, material:'glass', hp:1 },
    { x:1210, y:600, w:18, h:20, material:'glass', hp:1 },
    { x:1188, y:620, w:36, h:36, material:'stone', hp:2 },

    // side glass spine
    { x:656, y:546, w:24, h:84, material:'glass', hp:1 },
    { x:1214, y:546, w:24, h:84, material:'glass', hp:1 },

    // floating clutter
    { x:860, y:392, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:372, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 38 — Collapse Direction+ */
{
  id: 38, name: "Collapse Direction+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:830, y:620, w:80, h:40, material:'glass', hp:1 },
    { x:830, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:830, y:524, w:80, h:40, material:'glass', hp:1 },
    { x:920, y:572, w:180, h:24, material:'wood', hp:1 },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:524, w:80, h:40, material:'glass', hp:1 },
    { x:1010, y:476, w:80, h:40, material:'wood', hp:1 },
    { x:1010, y:428, w:120, h:40, material:'soft', hp:1 },

    // top cap
    { x:1010, y:382, w:170, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1088, y:522, w:36, h:236, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: speed bumps — low wide rounded-feel blocks at ground
    { x:692, y:619, w:100, h:28, material:'stone', hp:2 },
    { x:684, y:601, w:80, h:22, material:'soft', hp:1 },

    { x:1198, y:622, w:100, h:30, material:'stone', hp:2 },
    { x:1206, y:604, w:80, h:24, material:'soft', hp:1 },

    // upper bait
    { x:860, y:336, w:70, h:28, material:'wood', hp:1 },
    { x:1020, y:316, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 39 — Setup Shot+ */
{
  id: 39, name: "Setup Shot+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:840, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:840, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:920, y:548, w:24, h:56, material:'glass', hp:1 },
    { x:920, y:508, w:280, h:30, material:'stone', hp:2 },
    { x:840, y:460, w:80, h:40, material:'stone', hp:2 },
    { x:1000, y:460, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:412, w:180, h:40, material:'soft', hp:1 },

    // top control
    { x:920, y:366, w:210, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1062, y:524, w:36, h:232, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: domino run — thin planks at staggered descending heights
    { x:660, y:606, w:16, h:52, material:'wood', hp:1 },
    { x:678, y:610, w:16, h:52, material:'wood', hp:1 },
    { x:696, y:612, w:16, h:52, material:'glass', hp:1 },
    { x:714, y:614, w:16, h:52, material:'wood', hp:1 },

    { x:1196, y:614, w:16, h:52, material:'wood', hp:1 },
    { x:1214, y:612, w:16, h:52, material:'glass', hp:1 },
    { x:1232, y:610, w:16, h:52, material:'wood', hp:1 },
    { x:1250, y:606, w:16, h:52, material:'wood', hp:1 },

    // glass bait
    { x:652, y:536, w:24, h:84, material:'glass', hp:1 },

    // floating clutter
    { x:860, y:320, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:300, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:274, w:150, h:24, material:'soft', hp:1 },
  ]
},

/* 40 — Immune Domino+ */
{
  id: 40, name: "Immune Domino+",
  targetPercent: 100,
  blocks: [
    // core lesson
    { x:800, y:580, w:80, h:120, material:'stone', hp:2,
      traits:['ultimateproof'] },
    { x:880, y:548, w:180, h:24, material:'wood', hp:1 },
    { x:960, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:960, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:960, y:524, w:80, h:40, material:'glass', hp:1 },
    { x:960, y:476, w:80, h:40, material:'wood', hp:1 },
    { x:1040, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:1040, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:1040, y:524, w:80, h:40, material:'soft', hp:1 },

    // top control
    { x:1000, y:430, w:190, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1114, y:523, w:36, h:234, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: crate stacks — chunky square blocks in an L
    { x:664, y:616, w:48, h:40, material:'wood', hp:1 },
    { x:712, y:616, w:48, h:40, material:'wood', hp:1 },
    { x:664, y:572, w:48, h:40, material:'wood', hp:1 },

    { x:1178, y:616, w:48, h:40, material:'wood', hp:1 },
    { x:1226, y:616, w:48, h:40, material:'wood', hp:1 },
    { x:1226, y:572, w:48, h:40, material:'wood', hp:1 },

    // ricochet glass
    { x:652, y:524, w:24, h:88, material:'glass', hp:1 },
    { x:1238, y:524, w:24, h:88, material:'glass', hp:1 },

    // upper clutter
    { x:900, y:382, w:70, h:28, material:'wood', hp:1 },
    { x:1040, y:362, w:70, h:28, material:'glass', hp:1 },
    { x:970, y:336, w:150, h:24, material:'soft', hp:1 },
  ]
},  
// ============================================================
// Booha Destruction — Levels 41–50 (CORRECTED)
//
// Canvas: 1280×720, FLOOR_Y = 640
// Block y = center. Bottom edge = y + h/2 must not exceed 640.
// Rear blocker formula: y = 640 - h/2
// Structures centered around x=900–940, within x=650–1240
// ============================================================

/* ============================================================
  ZONE 5 — FULL CHAOS (Rounds 41–50)
  Every tool needed. Multiple immune blocks per structure.
  Planning required. Second attempts are execution.
============================================================ */

/* 41 — Three Stack System++ */
{
  id: 41, name: "Three Stack System++",
  targetPercent: 100,
  blocks: [
    // left stack
    { x:800, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:800, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:800, y:500, w:100, h:40, material:'stone', hp:2 },

    // center stack
    { x:920, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:524, w:80, h:40, material:'stone', hp:2 },

    // right stack
    { x:1040, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:1040, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:1040, y:500, w:100, h:40, material:'stone', hp:2 },

    { x:920, y:476, w:300, h:24, material:'wood', hp:1 },
    { x:920, y:428, w:140, h:40, material:'soft', hp:1 },

    // fire control
    { x:920, y:382, w:220, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1098, y:521, w:38, h:238, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: spinning tops — wide base tapering to a point (stacked wedge feel)
    { x:676, y:620, w:70, h:30, material:'soft', hp:1 },
    { x:676, y:588, w:46, h:28, material:'wood', hp:1 },
    { x:676, y:562, w:22, h:24, material:'glass', hp:1 },

    { x:1196, y:620, w:70, h:30, material:'soft', hp:1 },
    { x:1196, y:588, w:46, h:28, material:'wood', hp:1 },
    { x:1196, y:562, w:22, h:24, material:'glass', hp:1 },

    // floating clutter
    { x:840, y:336, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:320, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:292, w:150, h:24, material:'soft', hp:1 },
    { x:860, y:252, w:70, h:28, material:'glass', hp:1 },
    { x:980, y:236, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 42 — Asymmetric Immunity++ */
{
  id: 42, name: "Asymmetric Immunity++",
  targetPercent: 100,
  blocks: [
    // left column — normal stone
    { x:820, y:620, w:70, h:40, material:'stone', hp:2 },
    { x:820, y:572, w:70, h:40, material:'stone', hp:2 },
    { x:820, y:524, w:70, h:40, material:'stone', hp:2 },
    { x:820, y:476, w:70, h:40, material:'stone', hp:2 },
    { x:820, y:428, w:80, h:40, material:'soft', hp:1 },

    // right column — iceproof + rainbowproof
    { x:1000, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune','rainbowproof','convertimmune'] },
    { x:1000, y:572, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune','rainbowproof','convertimmune'] },
    { x:1000, y:524, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune','rainbowproof','convertimmune'] },
    { x:1000, y:476, w:80, h:40, material:'stone', hp:2,
      traits:['iceproof','freezeimmune','rainbowproof','convertimmune'] },
    { x:1000, y:428, w:80, h:40, material:'glass', hp:1 },

    // shared top control
    { x:910, y:382, w:300, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1078, y:520, w:38, h:240, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: crow's nests — thin post + small box cap
    { x:664, y:582, w:14, h:110, material:'wood', hp:1 },
    { x:664, y:520, w:44, h:44, material:'wood', hp:1 },
    { x:664, y:620, w:40, h:32, material:'stone', hp:2 },

    { x:1186, y:582, w:14, h:110, material:'wood', hp:1 },
    { x:1186, y:520, w:44, h:44, material:'wood', hp:1 },
    { x:1186, y:620, w:40, h:32, material:'stone', hp:2 },

    // floating mess
    { x:860, y:334, w:70, h:28, material:'wood', hp:1 },
    { x:995, y:316, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:288, w:150, h:24, material:'soft', hp:1 },
    { x:820, y:248, w:70, h:28, material:'glass', hp:1 },
    { x:1020, y:230, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 43 — Float and Ground++ */
{
  id: 43, name: "Float and Ground++",
  targetPercent: 100,
  blocks: [
    // ground structure
    { x:830, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:830, y:556, w:24, h:88, material:'stone', hp:2 },
    { x:1010, y:556, w:24, h:88, material:'stone', hp:2 },
    { x:920, y:512, w:260, h:24, material:'wood', hp:1 },

    // floating structure above
    { x:920, y:460, w:200, h:30, material:'glass', hp:1 },
    { x:860, y:422, w:80, h:40, material:'stone', hp:2 },
    { x:980, y:422, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:374, w:180, h:40, material:'soft', hp:1 },

    // fire control
    { x:920, y:328, w:220, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1062, y:518, w:38, h:244, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: anchors — wide flukes at bottom, thin shank, crossbar
    { x:672, y:620, w:60, h:24, material:'stone', hp:2 },
    { x:672, y:594, w:14, h:50, material:'stone', hp:2 },
    { x:672, y:564, w:44, h:14, material:'stone', hp:2 },

    { x:1196, y:620, w:60, h:24, material:'stone', hp:2 },
    { x:1196, y:594, w:14, h:50, material:'stone', hp:2 },
    { x:1196, y:564, w:44, h:14, material:'stone', hp:2 },

    // float clutter
    { x:860, y:282, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:264, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:236, w:150, h:24, material:'soft', hp:1 },
    { x:860, y:198, w:70, h:28, material:'glass', hp:1 },
    { x:1000, y:182, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 44 — Immune Fort++ */
{
  id: 44, name: "Immune Fort++",
  targetPercent: 100,
  blocks: [
    // outer corners
    { x:830, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:830, y:572, w:80, h:40, material:'stone', hp:2 },
    { x:1010, y:572, w:80, h:40, material:'stone', hp:2 },

    // immune center
    { x:920, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune','iceproof','freezeimmune'] },
    { x:920, y:572, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune','iceproof','freezeimmune'] },

    { x:920, y:524, w:280, h:24, material:'wood', hp:1 },
    { x:920, y:476, w:140, h:40, material:'soft', hp:1 },
    { x:920, y:428, w:100, h:40, material:'glass', hp:1 },

    // top cap
    { x:920, y:382, w:220, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1068, y:518, w:38, h:244, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: barbican towers — two short pillars + crenellated cap
    { x:656, y:608, w:30, h:56, material:'stone', hp:2 },
    { x:690, y:608, w:30, h:56, material:'stone', hp:2 },
    { x:656, y:574, w:26, h:20, material:'stone', hp:2 },
    { x:690, y:574, w:26, h:20, material:'stone', hp:2 },
    { x:673, y:574, w:18, h:12, material:'wood', hp:1 },

    { x:1180, y:608, w:30, h:56, material:'stone', hp:2 },
    { x:1214, y:608, w:30, h:56, material:'stone', hp:2 },
    { x:1180, y:574, w:26, h:20, material:'stone', hp:2 },
    { x:1214, y:574, w:26, h:20, material:'stone', hp:2 },
    { x:1197, y:574, w:18, h:12, material:'wood', hp:1 },

    // overhead clutter
    { x:860, y:336, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:318, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:290, w:150, h:24, material:'soft', hp:1 },
  ]
},

/* 45 — Precision Only++ */
{
  id: 45, name: "Precision Only++",
  targetPercent: 100,
  blocks: [
    // tall flanking pillars
    { x:830, y:540, w:70, h:200, material:'stone', hp:2 },
    { x:1010, y:540, w:70, h:200, material:'stone', hp:2 },

    // interior targets
    { x:920, y:620, w:100, h:40, material:'wood', hp:1 },
    { x:920, y:564, w:100, h:40, material:'glass', hp:1 },
    { x:920, y:508, w:100, h:40, material:'wood', hp:1 },
    { x:920, y:452, w:100, h:40, material:'glass', hp:1 },
    { x:920, y:396, w:100, h:40, material:'soft', hp:1 },

    // top control
    { x:920, y:350, w:170, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1062, y:501, w:38, h:278, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: periscopes — vertical shaft + horizontal elbow at top
    { x:664, y:582, w:16, h:110, material:'glass', hp:1 },
    { x:686, y:520, w:50, h:16, material:'glass', hp:1 },
    { x:664, y:620, w:38, h:34, material:'stone', hp:2 },

    { x:1186, y:582, w:16, h:110, material:'glass', hp:1 },
    { x:1164, y:520, w:50, h:16, material:'glass', hp:1 },
    { x:1198, y:620, w:38, h:34, material:'stone', hp:2 },

    // fake upper bait
    { x:860, y:302, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:286, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:256, w:150, h:24, material:'soft', hp:1 },
    { x:860, y:214, w:70, h:28, material:'glass', hp:1 },
    { x:1000, y:198, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 46 — Fireproof Cage++*/
{
  id: 46, name: "Fireproof Cage++",
  targetPercent: 100,
  blocks: [
    // fireproof cage walls
    { x:860, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:980, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:860, y:560, w:24, h:80, material:'glass', hp:1 },
    { x:980, y:560, w:24, h:80, material:'glass', hp:1 },
    { x:920, y:560, w:60, h:80, material:'wood', hp:1 },
    { x:920, y:516, w:260, h:30, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:860, y:468, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:980, y:468, w:80, h:40, material:'stone', hp:2,
      traits:['fireproof','burnimmune'] },
    { x:920, y:420, w:200, h:40, material:'soft', hp:1 },

    // top control
    { x:920, y:374, w:230, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1070, y:515, w:38, h:250, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: oil rigs — wide base, narrow mid, small top platform
    { x:676, y:620, w:70, h:30, material:'stone', hp:2 },
    { x:676, y:588, w:30, h:56, material:'stone', hp:2 },
    { x:676, y:554, w:56, h:18, material:'stone', hp:2 },

    { x:1196, y:620, w:70, h:30, material:'stone', hp:2 },
    { x:1196, y:588, w:30, h:56, material:'stone', hp:2 },
    { x:1196, y:554, w:56, h:18, material:'stone', hp:2 },

    // floating clutter
    { x:860, y:326, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:308, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:280, w:150, h:24, material:'soft', hp:1 },
  ]
},

/* 47 — Delayed Trap++*/
{
  id: 47, name: "Delayed Trap++",
  targetPercent: 100,
  blocks: [
    // ground piers
    { x:810, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:1030, y:620, w:80, h:40, material:'stone', hp:2 },
    { x:810, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:1030, y:556, w:24, h:88, material:'glass', hp:1 },

    // suspended deck
    { x:920, y:512, w:320, h:24, material:'stone', hp:2 },
    { x:920, y:468, w:100, h:40, material:'glass', hp:1 },

    // upper structure
    { x:860, y:420, w:80, h:40, material:'stone', hp:2 },
    { x:980, y:420, w:80, h:40, material:'stone', hp:2 },
    { x:920, y:372, w:200, h:40, material:'soft', hp:1 },

    // top control
    { x:920, y:326, w:240, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1082, y:516, w:38, h:248, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: trebuchets — pivot post + long unbalanced arm
    { x:664, y:604, w:16, h:56, material:'wood', hp:1 },
    { x:686, y:592, w:70, h:14, material:'wood', hp:1 },
    { x:662, y:620, w:36, h:34, material:'stone', hp:2 },

    { x:1186, y:604, w:16, h:56, material:'wood', hp:1 },
    { x:1164, y:592, w:70, h:14, material:'wood', hp:1 },
    { x:1200, y:620, w:36, h:34, material:'stone', hp:2 },

    // upper clutter
    { x:860, y:278, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:260, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:232, w:150, h:24, material:'soft', hp:1 },
    { x:860, y:192, w:70, h:28, material:'glass', hp:1 },
    { x:1000, y:176, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 48 — Full Synergy++*/
{
  id: 48, name: "Full Synergy++",
  targetPercent: 100,
  blocks: [
    // left immune column
    { x:780, y:572, w:70, h:136, material:'stone', hp:2,
      traits:['iceproof','freezeimmune','fireproof','burnimmune'] },

    // center soft column
    { x:880, y:620, w:80, h:36, material:'soft', hp:1 },
    { x:880, y:576, w:80, h:36, material:'soft', hp:1 },
    { x:880, y:532, w:80, h:36, material:'soft', hp:1 },
    { x:880, y:488, w:80, h:36, material:'soft', hp:1 },

    // right wood column
    { x:990, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:990, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:990, y:524, w:80, h:40, material:'glass', hp:1 },
    { x:990, y:476, w:80, h:40, material:'wood', hp:1 },

    // rainbowproof cross bars
    { x:920, y:436, w:320, h:24, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:920, y:388, w:260, h:40, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },

    // top cap
    { x:920, y:342, w:340, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1082, y:514, w:38, h:252, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: signal towers — post with two crossbars at different heights
    { x:668, y:576, w:14, h:120, material:'wood', hp:1 },
    { x:668, y:530, w:50, h:12, material:'wood', hp:1 },
    { x:668, y:490, w:36, h:12, material:'wood', hp:1 },
    { x:668, y:620, w:44, h:32, material:'stone', hp:2 },

    { x:1188, y:576, w:14, h:120, material:'wood', hp:1 },
    { x:1188, y:530, w:50, h:12, material:'wood', hp:1 },
    { x:1188, y:490, w:36, h:12, material:'wood', hp:1 },
    { x:1188, y:620, w:44, h:32, material:'stone', hp:2 },

    // high clutter
    { x:860, y:294, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:276, w:70, h:28, material:'glass', hp:1 },
    { x:920, y:248, w:150, h:24, material:'soft', hp:1 },
    { x:860, y:208, w:70, h:28, material:'glass', hp:1 },
    { x:1000, y:192, w:70, h:28, material:'wood', hp:1 },
  ]
},

/* 49 — Domino Chain++ */
{
  id: 49, name: "Domino Chain++",
  targetPercent: 100,
  blocks: [
    // domino chain — 5 segments
    { x:780, y:620, w:60, h:40, material:'stone', hp:2 },
    { x:780, y:548, w:24, h:120, material:'stone', hp:2 },
    { x:780, y:500, w:80, h:40, material:'wood', hp:1 },

    { x:860, y:620, w:60, h:40, material:'wood', hp:1 },
    { x:860, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:860, y:500, w:80, h:40, material:'soft', hp:1 },

    { x:940, y:620, w:60, h:40, material:'wood', hp:1 },
    { x:940, y:548, w:24, h:120, material:'wood', hp:1 },
    { x:940, y:500, w:80, h:40, material:'glass', hp:1 },

    { x:1020, y:620, w:60, h:40, material:'stone', hp:2 },
    { x:1020, y:556, w:24, h:88, material:'glass', hp:1 },
    { x:1020, y:500, w:80, h:40, material:'soft', hp:1 },

    { x:1100, y:620, w:60, h:40, material:'wood', hp:1 },
    { x:1100, y:572, w:60, h:40, material:'stone', hp:2 },
    { x:1100, y:524, w:80, h:40, material:'wood', hp:1 },

    // top control
    { x:940, y:454, w:420, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1170, y:511, w:38, h:258, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: suspension cables — diagonal staircase of small blocks
    // Left cable (descending right)
    { x:654, y:578, w:18, h:18, material:'glass', hp:1 },
    { x:672, y:594, w:18, h:18, material:'glass', hp:1 },
    { x:690, y:610, w:18, h:18, material:'glass', hp:1 },
    { x:666, y:620, w:50, h:28, material:'stone', hp:2 },

    // Right cable (descending left) — shifted to avoid right edge
    { x:1216, y:578, w:18, h:18, material:'glass', hp:1 },
    { x:1198, y:594, w:18, h:18, material:'glass', hp:1 },
    { x:1180, y:610, w:18, h:18, material:'glass', hp:1 },
    { x:1198, y:620, w:50, h:28, material:'stone', hp:2 },

    // floating clutter
    { x:860, y:406, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:388, w:70, h:28, material:'glass', hp:1 },
    { x:1100, y:370, w:70, h:28, material:'wood', hp:1 },
    { x:940, y:340, w:180, h:24, material:'soft', hp:1 },
    { x:940, y:300, w:70, h:28, material:'glass', hp:1 },
  ]
},

/* 50 — BOOHA ENDGAME+++ */
{
  id: 50, name: "BOOHA ENDGAME+++",
  targetPercent: 95,
  blocks: [
    // left immune column
    { x:780, y:572, w:70, h:136, material:'stone', hp:2,
      traits:['iceproof','freezeimmune','fireproof','burnimmune'] },

    // soft mid column
    { x:880, y:620, w:80, h:36, material:'soft', hp:1 },
    { x:880, y:576, w:80, h:36, material:'soft', hp:1 },
    { x:880, y:532, w:80, h:36, material:'soft', hp:1 },

    // glass pivot
    { x:920, y:488, w:80, h:80, material:'glass', hp:1 },

    // right wood cluster
    { x:1000, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:1080, y:620, w:80, h:40, material:'wood', hp:1 },
    { x:1000, y:572, w:80, h:40, material:'glass', hp:1 },
    { x:1080, y:572, w:80, h:40, material:'wood', hp:1 },
    { x:1040, y:524, w:200, h:24, material:'wood', hp:1 },

    // ultimateproof anchor
    { x:920, y:620, w:80, h:40, material:'stone', hp:2,
      traits:['ultimateproof'] },

    // rainbowproof top layers
    { x:930, y:436, w:380, h:24, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:830, y:388, w:340, h:40, material:'stone', hp:2,
      traits:['rainbowproof','convertimmune'] },
    { x:830, y:340, w:200, h:40, material:'soft', hp:1 },

    // fire control
    { x:940, y:294, w:460, h:24, material:'stone', hp:2, traits:['burnimmune'] },

    // rear blocker flush on floor
    { x:1190, y:504, w:42, h:272, material:'stone', hp:2, traits:['ultimateproof'] },

    // SIDE JUNK: fortified walls — thick base + two guard towers
    // Left fort
    { x:672, y:620, w:64, h:32, material:'stone', hp:2 },
    { x:658, y:588, w:24, h:56, material:'stone', hp:2 },
    { x:686, y:588, w:24, h:56, material:'stone', hp:2 },
    { x:658, y:552, w:20, h:16, material:'stone', hp:2 },
    { x:686, y:552, w:20, h:16, material:'stone', hp:2 },

    // Right fort
    { x:1190, y:620, w:80, h:32, material:'stone', hp:2 },
    { x:1178, y:588, w:24, h:56, material:'stone', hp:2 },
    { x:1202, y:588, w:24, h:56, material:'stone', hp:2 },
    { x:1178, y:552, w:20, h:16, material:'stone', hp:2 },
    { x:1202, y:552, w:20, h:16, material:'stone', hp:2 },

    // overhead chaos field
    { x:860, y:248, w:70, h:28, material:'wood', hp:1 },
    { x:1000, y:230, w:70, h:28, material:'glass', hp:1 },
    { x:1120, y:212, w:70, h:28, material:'wood', hp:1 },
    { x:940, y:184, w:180, h:24, material:'soft', hp:1 },
    { x:860, y:144, w:70, h:28, material:'glass', hp:1 },
    { x:1000, y:128, w:70, h:28, material:'wood', hp:1 },
    { x:1120, y:112, w:70, h:28, material:'glass', hp:1 },
  ]
},


]; // end BOOHA_DESTRUCTION_LEVELS
