# Family Room → The House: Pass 1 Design Lock

This document records the decisions that later gameplay and image passes must consume. It does not change the current Chanoma gameplay loop by itself.

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

The current built room is Case 02, Chanoma. The save identity remains `bonus:family_room`; the case number is content metadata, not a new weekly bonus-game unlock.

## Locked behavior for later passes

- Each case has seven rounds.
- Each case begins with a player-dismissed lit study phase; there is no study countdown.
- A case restart does not replay the study phase.
- The Engawa hub provides a separate room-review path.
- A mistake restarts the whole case, with unlimited restarts.
- Patient uses zero-or-one changes; Quicker introduces occasional two-change rounds; Lies uses more two-change rounds.
- Removal changes are markable as empty spaces.
- A wrong confirmed mark becomes a red hazard: reach the bottom exit edge to
  continue the round, or let it touch Booha and restart the case.
- Pataskala is initially an atmospheric presence, not a scored ordinary object.
- Pataskala’s presence rises with case depth and is strongest in Nando.

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
- Do not generate new rooms until Chanoma’s revised loop has been playtested.

## Pass gate

Pass 1 is complete when the case order, restart/study policy, Pataskala role, change vocabulary, and Case 02 label are stable. Pass 2 can now implement the Chanoma study flow without requiring new room art.
