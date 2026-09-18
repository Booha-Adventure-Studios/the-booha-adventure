# Family Room → The House: Pass 1 Design Lock

This document records the decisions that later gameplay and image passes must consume. Genkan is now an authored, selectable case; Chanoma remains the reference case.

## House order

The house is entered through the Engawa hub. Cases unlock room by room:

| Number | Room | Japanese | Role |
| ---: | --- | --- | --- |
| — | Engawa | えんがわ | Safe hub, case select, room review, and exit |
| 01 | Genkan | げんかん | Ordinary tutorial |
| 02 | Chanoma | ちゃのま | Existing reference case |
| 03 | Daidokoro | だいどころ | Kitchen atmosphere |
| 04 | Rōka | ろうか | State-change corridor |
| 05 | Kodomo-beya | こどもべや | Vocabulary-focused children’s room |
| 06 | Ofuro | おふろ | Mirror and steam room |
| 07 | Oshiire | おしいれ | Sliding-closet dread |
| 08 | Nando | なんど | Pataskala’s deepest room |

Case 07 is locked as Oshiire for the first children’s release. Butsuma remains a possible later alternative and is not active content yet.

The reference room is Case 02, Chanoma, and Case 01 Genkan is now selectable from the Family Room entry panel. The save identity remains `bonus:family_room`; the case number is content metadata, not a new weekly bonus-game unlock.

## Locked behavior for later passes

- Each case has eleven rounds across three phases: quiet (3), uneasy (4), and danger (4).
- Each case begins with a player-dismissed lit study phase; there is no study countdown.
- A case restart does not replay the study phase.
- The Engawa hub provides a separate room-review path.
- A mistake restarts the whole case, with unlimited restarts.
- Patient uses zero-or-one changes; Quicker introduces occasional two-change rounds; Lies uses more two-change rounds.
- Removal changes are markable as empty spaces.
- A wrong confirmed mark becomes a red hazard: reach the bottom exit edge to
  continue the round, or let it touch Booha and restart the case.
- Some rounds may be audio-only: the room is visually unchanged, but a sound
  tells the player to report the room without marking a location.
- Pataskala is a non-markable threat, never a scored ordinary object.
- Pataskala appears silently inside the room, has a short discovery window, then
  advances toward Booha. The player must reach the bottom threshold to escape;
  escaping resumes the same investigation without regenerating its anomalies.
- During a Pataskala threat, report, undo, mark, and mark confirmation are
  disabled while movement remains active. A catch restarts the case.
- Pataskala uses the authored staged sprites `far`, `enter`, `approach`, `near`,
  and `catch`; the same assets may be mirrored and placed at multiple room
  anchors.

## Viewport and room-space lock

- The browser canvas fills the visible viewport, but the 1024×1536 master room
  is always contained inside it with `Math.min` scaling. Wide screens show dark
  presentation pillars; no room art is cropped or stretched.
- `plate` is the gameplay world. Booha, marks, anomaly anchors, Pataskala,
  hazards, the light radius, and the exit are all mapped through `plate.x`,
  `plate.y`, `plate.w`, and `plate.h`.
- Pointer input in presentation pillars is ignored. Keyboard and pointer
  movement are clamped to the contained room. Resize/orientation changes
  preserve Booha’s normalized position within the old and new plate.
- Environmental changes store their `anchorId` and `region` directly on each
  generated instance so repeat avoidance does not reconstruct metadata from
  floating-point coordinates.

## Locked change vocabulary

Every future object record uses one or more of:

`ADD` · `REMOVE` · `MOVE` · `TURN` · `SWAP` · `COUNT` · `STATE` · `WRONG`

`WRONG` is reserved for impossible or threatening changes such as eyes in shoji, a shadow kneeling, or a room becoming physically impossible.

## Asset production lock

- Generate one photoreal lit master per room at 1024×1536.
- Derive darkness from the lit master; never generate a separate dark version.
- Make overlays from that exact lit master so pixels and coordinates align.
- Keep markable objects inside the portrait-safe horizontal band `u = 0.22–0.78`.
- Show a doorway, threshold, step, or other escape edge along the bottom of every room.
- Use one visible warm practical light source per room.
- Chanoma’s minimum Pataskala production set is `pataskala_far.webp`,
  `pataskala_enter.webp`, `pataskala_approach.webp`, `pataskala_near.webp`,
  and `pataskala_catch.webp`; these are deferred until room entry and reused
  left/center/right with canvas mirroring.
- New rooms still require their own 1024×1536 master, aligned overlays, anchors, and a focused playtest before they are added to the case picker. The Chanoma revised loop has cleared the first live-playtest gate; Genkan is the first expansion case.

## Pass gate

Pass 1 is complete when the case order, restart/study policy, Pataskala role, change vocabulary, and Case 02 label are stable. The current implementation now includes the Genkan art/content case while keeping Chanoma as the default selection for existing players.
