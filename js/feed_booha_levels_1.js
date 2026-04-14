
// =====================================================
// Feed Booha — Level Data (v4)  Portrait 540×960
// =====================================================
// CHANGES v4:
//   • parCuts added to every level
//     3★ = cutCount ≤ parCuts
//     2★ = cutCount ≤ parCuts + 1
//     1★ = anything else that clears
//   • Rule: levels with 2 ropes → parCuts: 2
//            levels with 1 rope → parCuts: 1
// =====================================================

const FEED_BOOHA_LEVELS = [
  // Level 1 — Simple Drop (teach the cut)
  // Kept truly simple, but anchor is slightly offset so the candy swings
  // a little before dropping — teaches that physics exist.
  {
    id: 1, parCuts: 1,
    candy: { x: 270, y: 220 },
    booha: { x: 270, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 310, y: 100 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 2 — Offset drop (aim matters)
  // Unchanged — already works well.
  {
    id: 2, parCuts: 1,
    candy: { x: 200, y: 230 },
    booha: { x: 340, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 200, y: 100 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 3 — Two ropes, cut order matters (fixed)
  // Anchors are now asymmetric: cutting r1 first swings candy right toward
  // Booha; cutting r2 first swings it left and misses. One correct order.
  {
    id: 3, parCuts: 2,
    candy: { x: 200, y: 270 },
    booha: { x: 340, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 130, y: 130 }, type: 'normal' },
      { id: 'r2', anchor: { x: 340, y: 110 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 4 — Bounce pad (trajectory + platform)
  // Unchanged — already works well.
  {
    id: 4, parCuts: 1,
    candy: { x: 180, y: 230 },
    booha: { x: 360, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 180, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 310, y: 580, width: 120, height: 20 }
    ]
  },

  // Level 5 — Moving Booha with OFFSET anchor (timing, not luck)
  // Previously the candy dropped straight down onto a moving Booha —
  // pure luck. Now the anchor is far left so the candy swings rightward
  // in a predictable arc. Player must time the cut to match Booha's
  // position at the arc's landing point.
  {
    id: 5, parCuts: 1,
    candy: { x: 270, y: 240 },
    booha: {
      x: 270, y: 800,
      behavior: 'horizontal',
      range: { min: 160, max: 380 },
      speed: 1.8
    },
    ropes: [
      { id: 'r1', anchor: { x: 130, y: 130 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 6 — Delayed rope intro (fixed)
  // Previously a straight drop + delay — identical to L1 but slower.
  // Now candy is offset LEFT, Booha is offset RIGHT, and the delayed rope
  // is the only connection. Player must realize the delay exists and
  // account for the swing arc, not just click and wait.
  {
    id: 6, parCuts: 1,
    candy: { x: 180, y: 250 },
    booha: { x: 370, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 180, y: 100 }, type: 'delayed', delayMs: 450 }
    ],
    objects: [
      { type: 'bounce', x: 310, y: 580, width: 100, height: 20 }
    ]
  },

  // Level 7 — Fan redirect (player control)
  // Unchanged — already works well.
  {
    id: 7, parCuts: 1,
    candy: { x: 160, y: 230 },
    booha: { x: 380, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 160, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'fan', x: 200, y: 620, direction: 'right' }
    ]
  },

  // Level 8 — Two ropes + moving Booha (judgment call, fixed)
  // Previously the candy hung centrally so either rope worked equally —
  // no real decision. Now r1 is a short anchor (candy drops steeply left),
  // r2 is a long anchor (candy swings wide right). Player must read
  // Booha's current position and pick the rope that lands in time.
  {
    id: 8, parCuts: 2,
    candy: { x: 260, y: 270 },
    booha: {
      x: 200, y: 800,
      behavior: 'horizontal',
      range: { min: 140, max: 400 },
      speed: 2.2
    },
    ropes: [
      { id: 'r1', anchor: { x: 180, y: 200 }, type: 'normal' },
      { id: 'r2', anchor: { x: 400, y: 110 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 9 — Bounce + fan combo (multi-step)
  // Unchanged — already works well.
  {
    id: 9, parCuts: 1,
    candy: { x: 140, y: 230 },
    booha: { x: 400, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 220, y: 560, width: 110, height: 20 },
      { type: 'fan',    x: 300, y: 480, direction: 'right' }
    ]
  },

  // Level 10 — Everything (full challenge, fixed)
  // Previously the bounce pad was centered under the drop — it added
  // nothing since candy bounced straight back up. Now the pad is offset
  // LEFT so it redirects candy toward Booha's range. The delayed rope
  // means cutting r1 first lets candy swing+bounce into range; cutting
  // r2 first causes the delayed snap to pull it the wrong way. One
  // clearly correct sequence exists.
  {
    id: 10, parCuts: 2,
    candy: { x: 220, y: 260 },
    booha: {
      x: 300, y: 800,
      behavior: 'horizontal',
      range: { min: 160, max: 400 },
      speed: 2.4
    },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 120 }, type: 'normal' },
      { id: 'r2', anchor: { x: 350, y: 110 }, type: 'delayed', delayMs: 400 }
    ],
    objects: [
      { type: 'bounce', x: 190, y: 540, width: 110, height: 20 }
    ]
  },

 // Level 11 — Double bounce path
  // Unchanged — candy left, two staggered bounce pads walk it rightward
  // to Booha. Clear chain to read, no luck involved.
  {
    id: 11, parCuts: 1,
    candy: { x: 140, y: 240 },
    booha: { x: 400, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 220, y: 600, width: 100, height: 20 },
      { type: 'bounce', x: 340, y: 520, width: 100, height: 20 }
    ]
  },

  // Level 12 — Moving target + fan assist (fixed)
  // Anchor was centered above candy making the fan redundant for aiming.
  // Anchor moved far left — candy naturally falls left of the fan.
  // Player must cut early enough that the fan pushes candy into
  // Booha's rightward sweep; cut too late and candy misses left.
  {
    id: 12, parCuts: 1,
    candy: { x: 240, y: 240 },
    booha: {
      x: 380, y: 800,
      behavior: 'horizontal',
      range: { min: 200, max: 430 },
      speed: 2.4
    },
    ropes: [
      { id: 'r1', anchor: { x: 130, y: 120 }, type: 'normal' }
    ],
    objects: [
      { type: 'fan', x: 270, y: 600, direction: 'right' }
    ]
  },

  // Level 13 — Delayed swing timing (fixed)
  // Candy and Booha were both centered — the two ropes were mirrors of
  // each other so cut order never mattered. Now candy is left of center,
  // Booha is right. Cutting r2 (normal, right anchor) first swings candy
  // further right then the delayed r1 snap pulls it back — overshoots.
  // Cutting r1 (delayed, left anchor) first keeps candy swinging right
  // naturally onto Booha. One correct sequence.
  {
    id: 13, parCuts: 2,
    candy: { x: 210, y: 260 },
    booha: { x: 360, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 120 }, type: 'delayed', delayMs: 400 },
      { id: 'r2', anchor: { x: 350, y: 110 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 14 — Tight bounce angle
  // Unchanged — candy drops left of the bounce pad, pad angle sends
  // it right toward Booha. The 80px width keeps it tight but fair.
  {
    id: 14, parCuts: 1,
    candy: { x: 200, y: 250 },
    booha: { x: 340, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 200, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 300, y: 600, width: 80, height: 20 }
    ]
  },

  // Level 15 — Moving + delayed combo (fixed)
  // Was a centered anchor + centered Booha + delayed rope — identical
  // to the original broken L6. Now the anchor is hard left so the candy
  // swings rightward in a wide arc. The delay means the player must
  // predict where the candy will be when the rope finally releases —
  // the arc's rightward momentum must align with Booha's position.
  {
    id: 15, parCuts: 1,
    candy: { x: 260, y: 250 },
    booha: {
      x: 300, y: 800,
      behavior: 'horizontal',
      range: { min: 150, max: 410 },
      speed: 2.6
    },
    ropes: [
      { id: 'r1', anchor: { x: 120, y: 130 }, type: 'delayed', delayMs: 420 }
    ],
    objects: []
  },

  // Level 16 — Fan chain
  // Unchanged — two fans in sequence push candy across a wide gap.
  // Clear spatial logic, no luck.
  {
    id: 16, parCuts: 1,
    candy: { x: 120, y: 240 },
    booha: { x: 420, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 120, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'fan', x: 200, y: 650, direction: 'right' },
      { type: 'fan', x: 300, y: 550, direction: 'right' }
    ]
  },

  // Level 17 — Cross ropes, decision trap (fixed)
  // Candy and Booha were centered making both ropes spatially equivalent
  // — no real trap. Now candy is left, Booha is right. Cutting r1
  // (left normal anchor) first releases candy to swing right freely,
  // then the delayed r2 snap gives extra rightward push — reaches Booha.
  // Cutting r2 first triggers its delay clock immediately; by the time
  // r1 is cut the delayed snap pulls candy back left — misses.
  {
    id: 17, parCuts: 2,
    candy: { x: 200, y: 280 },
    booha: { x: 370, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 150, y: 120 }, type: 'normal' },
      { id: 'r2', anchor: { x: 380, y: 115 }, type: 'delayed', delayMs: 350 }
    ],
    objects: []
  },

  // Level 18 — Bounce + moving Booha timing
  // Unchanged — candy falls left of bounce pad, pad redirects it
  // rightward. Player must read where Booha will be when candy lands.
  // Bounce pad is not centered under drop so it stays skill-based.
  {
    id: 18, parCuts: 1,
    candy: { x: 180, y: 240 },
    booha: {
      x: 300, y: 800,
      behavior: 'horizontal',
      range: { min: 160, max: 420 },
      speed: 2.8
    },
    ropes: [
      { id: 'r1', anchor: { x: 180, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 260, y: 600, width: 90, height: 20 }
    ]
  },

  // Level 19 — Double delayed trap (fixed)
  // Both ropes symmetric around a centered Booha meant both delays
  // produced identical outcomes — no trap at all. Now candy is left,
  // Booha is right. r1 has a shorter delay (fires sooner, gentler pull),
  // r2 has a longer delay (fires later, stronger rightward snap).
  // Cutting r2 first starts its long delay clock; cutting r1 next
  // releases candy early — the r2 snap then yanks it right onto Booha.
  // Reversing the order leaves candy swinging freely too long and it
  // drifts past Booha.
  {
    id: 19, parCuts: 2,
    candy: { x: 200, y: 260 },
    booha: { x: 360, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 120 }, type: 'delayed', delayMs: 300 },
      { id: 'r2', anchor: { x: 370, y: 115 }, type: 'delayed', delayMs: 500 }
    ],
    objects: []
  },

  // Level 20 — Multi-step routing
  // Unchanged — the existing bounce + fan chain is spatially offset and
  // already requires reading a two-step redirect. No luck element.
  {
    id: 20, parCuts: 1,
    candy: { x: 150, y: 240 },
    booha: { x: 400, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 150, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 240, y: 600, width: 100, height: 20 },
      { type: 'fan',    x: 300, y: 500, direction: 'right' }
    ]
  },

 // Level 21 — Bounce into moving Booha
  // Unchanged — candy falls left of bounce pad, pad redirects right.
  // Player reads where Booha will be when candy arrives. Fair timing puzzle.
  {
    id: 21, parCuts: 1,
    candy: { x: 200, y: 240 },
    booha: { x: 340, y: 800, behavior: 'horizontal', range: { min: 180, max: 420 }, speed: 2.8 },
    ropes: [
      { id: 'r1', anchor: { x: 200, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 300, y: 600, width: 80, height: 20 }
    ]
  },

  // Level 22 — Fan + bounce redirect
  // Unchanged — clear two-step redirect chain, spatially offset throughout.
  {
    id: 22, parCuts: 1,
    candy: { x: 140, y: 240 },
    booha: { x: 420, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'fan',    x: 200, y: 650, direction: 'right' },
      { type: 'bounce', x: 320, y: 560, width: 80, height: 20 }
    ]
  },

  // Level 23 — Mixed ropes, fast moving Booha (fixed)
  // Candy and Booha were centered with symmetric anchors — no spatial
  // reason to prefer either rope or cut order. Now candy is left, Booha
  // sweeps right-heavy. Cutting r1 (normal, left) first releases candy
  // to swing rightward; the delayed r2 snap then adds a late rightward
  // nudge — lands in Booha's range. Cutting r2 first starts its delay
  // clock and the eventual snap pulls candy back left while it's already
  // falling — misses. One readable correct sequence.
  {
    id: 23, parCuts: 2,
    candy: { x: 210, y: 260 },
    booha: { x: 330, y: 800, behavior: 'horizontal', range: { min: 200, max: 420 }, speed: 3.0 },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 120 }, type: 'normal' },
      { id: 'r2', anchor: { x: 370, y: 115 }, type: 'delayed', delayMs: 380 }
    ],
    objects: []
  },

  // Level 24 — Delayed drop into bounce
  // Unchanged — anchor left of bounce pad, delay means candy is still
  // swinging when released, hits pad at an angle, redirects to Booha.
  // Spatial offset is present throughout.
  {
    id: 24, parCuts: 1,
    candy: { x: 180, y: 240 },
    booha: { x: 360, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 180, y: 110 }, type: 'delayed', delayMs: 420 }
    ],
    objects: [
      { type: 'bounce', x: 260, y: 600, width: 70, height: 20 }
    ]
  },

  // Level 25 — Delayed + fan + moving Booha (fixed)
  // All three elements were on x=270 — anchor, fan, and Booha center
  // all aligned. Cutting released candy straight into a centered fan
  // pushing it straight down onto a centered Booha — pure luck on timing.
  // Now anchor is hard left so candy swings rightward. The fan is offset
  // to catch candy mid-arc and push it further right. Player must cut
  // early in the swing so the arc puts candy over the fan at the right
  // moment; Booha's position then determines the final timing read.
  {
    id: 25, parCuts: 1,
    candy: { x: 230, y: 250 },
    booha: { x: 360, y: 800, behavior: 'horizontal', range: { min: 200, max: 430 }, speed: 3.0 },
    ropes: [
      { id: 'r1', anchor: { x: 120, y: 130 }, type: 'delayed', delayMs: 350 }
    ],
    objects: [
      { type: 'fan', x: 290, y: 580, direction: 'right' }
    ]
  },

  // Level 26 — Two-step redirect
  // Unchanged — candy drops onto bounce, bounce sends it into fan, fan
  // pushes it right to Booha. Clean chain, all offset correctly.
  {
    id: 26, parCuts: 1,
    candy: { x: 160, y: 240 },
    booha: { x: 400, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 160, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 240, y: 620, width: 85, height: 20 },
      { type: 'fan',    x: 300, y: 540, direction: 'right' }
    ]
  },

  // Level 27 — Double rope timing (fixed)
  // Symmetric anchors around a centered candy and centered Booha — both
  // ropes produced the same outcome regardless of cut order or timing.
  // Now candy is offset left, Booha sweeps left-heavy. r1 is a short
  // steep anchor (candy drops quickly, lands left), r2 is a long wide
  // anchor (candy swings far right). Player must cut r2 first to get
  // the wide swing, then cut r1 to release — candy arcs right into
  // Booha's range. Cutting r1 first drops candy too early and it lands
  // left of Booha's sweep.
  {
    id: 27, parCuts: 2,
    candy: { x: 240, y: 270 },
    booha: {
      x: 220, y: 800,
      behavior: 'horizontal',
      range: { min: 140, max: 360 },
      speed: 2.8
    },
    ropes: [
      { id: 'r1', anchor: { x: 200, y: 210 }, type: 'normal' },
      { id: 'r2', anchor: { x: 400, y: 110 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 28 — Delayed bounce catch
  // Unchanged — anchor left of bounce pad, delayed release means candy
  // has built up swing momentum before it goes free. Hits pad at angle,
  // deflects to Booha. Spatial logic is clear.
  {
    id: 28, parCuts: 1,
    candy: { x: 210, y: 245 },
    booha: { x: 350, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 210, y: 110 }, type: 'delayed', delayMs: 380 }
    ],
    objects: [
      { type: 'bounce', x: 290, y: 610, width: 75, height: 20 }
    ]
  },

  // Level 29 — Fan ladder
  // Unchanged — two fans step candy across a large horizontal gap.
  // Candy starts far left, each fan hands it to the next, Booha is far
  // right. Spatial chain is readable and fair.
  {
    id: 29, parCuts: 1,
    candy: { x: 130, y: 235 },
    booha: { x: 410, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 130, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'fan', x: 190, y: 680, direction: 'right' },
      { type: 'fan', x: 270, y: 570, direction: 'right' }
    ]
  },

  // Level 30 — Tight moving target (fixed)
  // Anchor at x=250, candy at x=250, Booha centered at x=270 — nearly
  // a straight drop onto a moving target, delay adds nothing spatial.
  // Now anchor is hard left, candy hangs right of center, Booha sweeps
  // a wide range. The delayed release means candy is mid-swing rightward
  // when it finally drops — player must predict where in the swing arc
  // the candy will be after the delay, then judge where Booha will be
  // at that same moment. Two compounding reads required.
  {
    id: 30, parCuts: 1,
    candy: { x: 300, y: 250 },
    booha: {
      x: 350, y: 800,
      behavior: 'horizontal',
      range: { min: 160, max: 430 },
      speed: 3.1
    },
    ropes: [
      { id: 'r1', anchor: { x: 130, y: 140 }, type: 'delayed', delayMs: 340 }
    ],
    objects: []
  },
  
// Level 31 — Bounce into moving Booha
  // Unchanged — candy drops left of pad, pad redirects right, player
  // times the cut to land candy when Booha sweeps through the landing zone.
  {
    id: 31, parCuts: 1,
    candy: { x: 170, y: 240 },
    booha: {
      x: 330, y: 800,
      behavior: 'horizontal',
      range: { min: 180, max: 420 },
      speed: 3.0
    },
    ropes: [
      { id: 'r1', anchor: { x: 170, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 260, y: 610, width: 70, height: 20 }
    ]
  },

  // Level 32 — Mixed rope judgment (fixed)
  // Candy and Booha were both centered — the delayed vs normal rope
  // distinction had no spatial consequence at all. Now candy is left,
  // Booha is right. r2 (normal, right anchor) pulls candy rightward
  // immediately on cut; r1 (delayed, left anchor) will eventually snap
  // it back left. Cutting r2 first swings candy right freely, then r1's
  // delayed snap gives a final leftward correction into Booha's mouth.
  // Cutting r1 first starts its delay clock — by the time it fires it
  // yanks candy left just as it was swinging right, overshooting Booha.
  {
    id: 32, parCuts: 2,
    candy: { x: 205, y: 275 },
    booha: { x: 370, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 145, y: 125 }, type: 'delayed', delayMs: 360 },
      { id: 'r2', anchor: { x: 380, y: 115 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 33 — Bounce, fan, then timing
  // Unchanged — candy drops onto bounce pad, fan pushes it right into
  // a moving Booha's sweep. Three-step chain is all spatially offset.
  {
    id: 33, parCuts: 1,
    candy: { x: 150, y: 240 },
    booha: {
      x: 390, y: 800,
      behavior: 'horizontal',
      range: { min: 220, max: 420 },
      speed: 3.2
    },
    ropes: [
      { id: 'r1', anchor: { x: 150, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 235, y: 625, width: 70, height: 20 },
      { type: 'fan',    x: 305, y: 540, direction: 'right' }
    ]
  },

  // Level 34 — Double delayed, moving Booha (fixed)
  // Symmetric anchors around centered candy and centered Booha — both
  // delays produced identical arcs, moving Booha made it pure luck.
  // Now candy is left, Booha sweeps right-heavy. r1 (short delay, left
  // anchor) fires first and nudges candy rightward gently. r2 (long
  // delay, far right anchor) fires later with a strong rightward snap.
  // Cutting r2 first starts its long clock; cutting r1 next releases
  // candy just before r2 snaps — the combined momentum carries candy
  // into Booha's right-side sweep. Reversing the order lets candy fall
  // too early before r2 fires, missing left.
  {
    id: 34, parCuts: 2,
    candy: { x: 200, y: 260 },
    booha: {
      x: 340, y: 800,
      behavior: 'horizontal',
      range: { min: 220, max: 430 },
      speed: 3.2
    },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 125 }, type: 'delayed', delayMs: 300 },
      { id: 'r2', anchor: { x: 390, y: 115 }, type: 'delayed', delayMs: 450 }
    ],
    objects: []
  },

  // Level 35 — Tight bounce route
  // Unchanged — clean offset drop-to-bounce-to-Booha, narrow pad
  // demands accurate cut timing.
  {
    id: 35, parCuts: 1,
    candy: { x: 190, y: 240 },
    booha: { x: 360, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 190, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 280, y: 610, width: 70, height: 20 }
    ]
  },

  // Level 36 — Bounce + fan to moving Booha
  // Unchanged — tight two-step redirect into a fast moving target.
  // 60px bounce pad keeps it demanding without being unfair.
  {
    id: 36, parCuts: 1,
    candy: { x: 150, y: 240 },
    booha: {
      x: 400, y: 800,
      behavior: 'horizontal',
      range: { min: 200, max: 420 },
      speed: 3.4
    },
    ropes: [
      { id: 'r1', anchor: { x: 150, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 260, y: 600, width: 60, height: 20 },
      { type: 'fan',    x: 320, y: 520, direction: 'right' }
    ]
  },

  // Level 37 — Double rope moving target (fixed)
  // Symmetric anchors around centered candy and centered Booha — same
  // broken structure as the original L27. Now candy hangs right of
  // center, Booha sweeps left-heavy. r1 is a steep short anchor
  // (drops candy quickly, lands left-center), r2 is a long shallow
  // anchor (wide swing, lands right). Player must cut r1 first to pull
  // candy left into a steep drop, then r2 releases it with residual
  // leftward momentum — lands in Booha's left sweep. Cutting r2 first
  // sends candy on the wide arc, too far right for Booha's range.
  {
    id: 37, parCuts: 2,
    candy: { x: 300, y: 275 },
    booha: {
      x: 230, y: 800,
      behavior: 'horizontal',
      range: { min: 140, max: 340 },
      speed: 3.4
    },
    ropes: [
      { id: 'r1', anchor: { x: 240, y: 210 }, type: 'normal' },
      { id: 'r2', anchor: { x: 420, y: 110 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 38 — Double delayed, fast moving Booha (fixed)
  // Same broken structure as L34 original — symmetric delays around
  // centered everything, no decision available. Now candy is right of
  // center, Booha sweeps left-heavy. r1 (left anchor, shorter delay)
  // pulls candy leftward when it fires; r2 (right anchor, longer delay)
  // holds candy in a rightward lean until it fires late. Cutting r1
  // first lets its short delay pass quickly, nudging candy left; r2's
  // later snap then swings it further left into Booha's range. Cutting
  // r2 first idles too long — r1 fires while r2 is still holding,
  // sending candy rightward away from Booha.
  {
    id: 38, parCuts: 2,
    candy: { x: 310, y: 260 },
    booha: {
      x: 240, y: 800,
      behavior: 'horizontal',
      range: { min: 140, max: 360 },
      speed: 3.6
    },
    ropes: [
      { id: 'r1', anchor: { x: 150, y: 120 }, type: 'delayed', delayMs: 280 },
      { id: 'r2', anchor: { x: 400, y: 115 }, type: 'delayed', delayMs: 440 }
    ],
    objects: []
  },

  // Level 39 — Two-step fan ladder, tight timing
  // Unchanged — candy far left, two fans step it rightward, Booha far
  // right. Same structure as L29 but fans are tighter, demanding a
  // crisper cut to enter the first fan's stream correctly.
  {
    id: 39, parCuts: 1,
    candy: { x: 130, y: 235 },
    booha: { x: 420, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 130, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'fan', x: 210, y: 660, direction: 'right' },
      { type: 'fan', x: 300, y: 540, direction: 'right' }
    ]
  },

  // Level 40 — Double bounce staircase into moving Booha
  // Unchanged — two descending bounce pads walk candy rightward in a
  // staircase. Moving Booha at speed 3.8 means the player must read
  // the full travel time through both pads, not just the initial drop.
  // Demands forward planning across the whole chain.
  {
    id: 40, parCuts: 1,
    candy: { x: 180, y: 240 },
    booha: {
      x: 360, y: 800,
      behavior: 'horizontal',
      range: { min: 160, max: 420 },
      speed: 3.8
    },
    ropes: [
      { id: 'r1', anchor: { x: 180, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 260, y: 600, width: 60, height: 20 },
      { type: 'bounce', x: 340, y: 520, width: 60, height: 20 }
    ]
  },

  
 // Level 41 — Delayed drop into bounce
  // Unchanged — anchor above candy, bounce pad offset right, delay means
  // candy has swung before releasing. Spatial offset is real.
  {
    id: 41, parCuts: 1,
    candy: { x: 220, y: 245 },
    booha: { x: 350, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 220, y: 110 }, type: 'delayed', delayMs: 300 }
    ],
    objects: [
      { type: 'bounce', x: 300, y: 610, width: 60, height: 20 }
    ]
  },

  // Level 42 — Mixed ropes, moving Booha (fixed)
  // Candy was centered with near-symmetric anchors and centered Booha —
  // no real decision. Now candy is left, Booha sweeps right-heavy.
  // r1 (normal, left anchor) swings candy right freely when cut.
  // r2 (delayed, right anchor) holds a rightward tension that fires
  // late. Cutting r1 first lets candy swing right; r2's delayed snap
  // then accelerates it further right into Booha's range. Cutting r2
  // first starts its clock — it fires while r1 still holds, yanking
  // candy right prematurely before the swing has built momentum, and
  // candy falls short left of Booha's sweep center.
  {
    id: 42, parCuts: 2,
    candy: { x: 205, y: 270 },
    booha: {
      x: 350, y: 800,
      behavior: 'horizontal',
      range: { min: 230, max: 430 },
      speed: 3.2
    },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 120 }, type: 'normal' },
      { id: 'r2', anchor: { x: 390, y: 115 }, type: 'delayed', delayMs: 340 }
    ],
    objects: []
  },

  // Level 43 — Bounce then fan precision
  // Unchanged — clean three-step chain, all spatially offset.
  {
    id: 43, parCuts: 1,
    candy: { x: 150, y: 240 },
    booha: { x: 410, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 150, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 235, y: 620, width: 60, height: 20 },
      { type: 'fan',    x: 305, y: 540, direction: 'right' }
    ]
  },

  // Level 44 — Delayed double-rope judgment (fixed)
  // Candy and Booha both centered, symmetric anchors — the delayed r1
  // vs normal r2 had zero spatial consequence. Now candy is left, Booha
  // is right and idle. r2 (normal, right anchor) immediately pulls candy
  // rightward on cut. r1 (delayed, left anchor) will snap it back left
  // after its delay. Cutting r2 first swings candy right; cutting r1
  // next starts the delay clock — by the time r1 fires the candy is
  // already falling rightward and the leftward snap is too weak to
  // redirect it, landing on Booha. Cutting r1 first starts its clock
  // immediately; r2 then swings candy hard right but r1 fires mid-swing
  // yanking it back left — misses.
  {
    id: 44, parCuts: 2,
    candy: { x: 200, y: 275 },
    booha: { x: 375, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 120 }, type: 'delayed', delayMs: 280 },
      { id: 'r2', anchor: { x: 375, y: 115 }, type: 'normal' }
    ],
    objects: []
  },

  // Level 45 — Double fan carry into moving Booha
  // Unchanged structurally, but speed reduced 4.2→3.4. Two fans already
  // make this hard enough; the extra speed was making it a reflex test.
  {
    id: 45, parCuts: 1,
    candy: { x: 140, y: 240 },
    booha: {
      x: 400, y: 800,
      behavior: 'horizontal',
      range: { min: 200, max: 420 },
      speed: 3.4
    },
    ropes: [
      { id: 'r1', anchor: { x: 140, y: 110 }, type: 'delayed', delayMs: 320 }
    ],
    objects: [
      { type: 'fan', x: 220, y: 650, direction: 'right' },
      { type: 'fan', x: 300, y: 520, direction: 'right' }
    ]
  },

  // Level 46 — Tiny bounce, moving target
  // Speed reduced 4.2→3.3. The 55px pad is already the real difficulty;
  // hitting it precisely while timing a moving Booha is enough.
  {
    id: 46, parCuts: 1,
    candy: { x: 200, y: 240 },
    booha: {
      x: 350, y: 800,
      behavior: 'horizontal',
      range: { min: 180, max: 420 },
      speed: 3.3
    },
    ropes: [
      { id: 'r1', anchor: { x: 200, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 290, y: 610, width: 55, height: 20 }
    ]
  },

  // Level 47 — Full combo with mixed rope timing
  // Unchanged — this one is genuinely well-constructed. Candy left,
  // two ropes with different types, bounce pad, fan, idle Booha far
  // right. Every element does real spatial work.
  {
    id: 47, parCuts: 2,
    candy: { x: 160, y: 245 },
    booha: { x: 400, y: 800, behavior: 'idle' },
    ropes: [
      { id: 'r1', anchor: { x: 160, y: 110 }, type: 'normal' },
      { id: 'r2', anchor: { x: 310, y: 130 }, type: 'delayed', delayMs: 300 }
    ],
    objects: [
      { type: 'bounce', x: 250, y: 620, width: 55, height: 20 },
      { type: 'fan',    x: 315, y: 540, direction: 'right' }
    ]
  },

  // Level 48 — Fast double rope (fixed)
  // Centered candy, near-symmetric anchors, centered Booha at speed 4.3
  // — same broken structure as original L3, just faster. Now candy is
  // right of center, Booha sweeps left-heavy. r1 (normal, left anchor)
  // pulls candy left immediately; r2 (delayed, right anchor) holds
  // rightward tension until it fires. Cutting r1 first swings candy
  // left toward Booha's range; r2's delayed rightward snap fires as
  // candy is descending and corrects it back into the center of Booha's
  // sweep. Cutting r2 first starts its clock — when it fires it pulls
  // candy right, away from Booha's left-biased range.
  {
    id: 48, parCuts: 2,
    candy: { x: 310, y: 280 },
    booha: {
      x: 230, y: 800,
      behavior: 'horizontal',
      range: { min: 140, max: 340 },
      speed: 3.4
    },
    ropes: [
      { id: 'r1', anchor: { x: 145, y: 115 }, type: 'normal' },
      { id: 'r2', anchor: { x: 400, y: 120 }, type: 'delayed', delayMs: 260 }
    ],
    objects: []
  },

  // Level 49 — Narrow staircase route
  // Unchanged — three-step chain (bounce → bounce → fan) is already
  // the hardest routing puzzle in the set. Speed reduced 4.3→3.3 so
  // the staircase timing is the challenge, not the reflex.
  {
    id: 49, parCuts: 1,
    candy: { x: 150, y: 235 },
    booha: {
      x: 400, y: 800,
      behavior: 'horizontal',
      range: { min: 220, max: 420 },
      speed: 3.3
    },
    ropes: [
      { id: 'r1', anchor: { x: 150, y: 110 }, type: 'normal' }
    ],
    objects: [
      { type: 'bounce', x: 235, y: 640, width: 55, height: 20 },
      { type: 'bounce', x: 310, y: 540, width: 55, height: 20 },
      { type: 'fan',    x: 360, y: 470, direction: 'right' }
    ]
  },

  // Level 50 — Final exam (fixed)
  // Centered candy, symmetric anchors, centered Booha — the final level
  // was the same broken structure as L3 original, just with objects
  // added that didn't fix the core alignment problem. Now candy is left,
  // Booha sweeps right-heavy. r1 (normal, left) swings candy right;
  // r2 (delayed, right) fires late to add a rightward push. The bounce
  // pad is offset left of center so it redirects candy rightward onto
  // the fan, which carries it into Booha's right-side sweep. Cutting
  // r2 first idles too long — candy falls before the delayed snap and
  // misses the bounce pad entirely. One correct sequence, three elements
  // all doing real work, speed kept at 3.5 so mastery — not reflexes —
  // decides the final level.
  {
    id: 50, parCuts: 2,
    candy: { x: 190, y: 260 },
    booha: {
      x: 360, y: 800,
      behavior: 'horizontal',
      range: { min: 220, max: 430 },
      speed: 3.5
    },
    ropes: [
      { id: 'r1', anchor: { x: 130, y: 120 }, type: 'normal' },
      { id: 'r2', anchor: { x: 370, y: 115 }, type: 'delayed', delayMs: 350 }
    ],
    objects: [
      { type: 'bounce', x: 230, y: 600, width: 60, height: 20 },
      { type: 'fan',    x: 300, y: 520, direction: 'right' }
    ]
  },

];

window.FEED_BOOHA_LEVELS = FEED_BOOHA_LEVELS;

