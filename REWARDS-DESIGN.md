# Booha Adventure rewards: design rules

Status: draft for review (Pass 3, November 2026). No code follows this
document until it is approved. Later reward passes consume it.

## 1. Principles

1. **Reward completion, not activity.** Rewards come from finishing real
   work: Daily Checks, Blitz clears, maze games, world progress. Time spent,
   taps and page visits never earn a reward on their own.
2. **No one ever sees a week they missed.** Anything time-limited shows only
   what the player owns. Anything that never expires may show what is still
   ahead. (The closet follows this as of the Closet Pass.)
3. **Many rewards, few systems.** Adding a reward should mean adding art and
   one data entry, not new code. `js/core/trophy-case.js` is the model: one
   list, and an entry appears with nothing else to wire.
4. **One reveal at a quiet moment.** Rewards announce themselves through one
   shared queue that waits for a natural break. `js/ui/medal-toast.js` is the
   model: it never interrupts a Blitz run, a Daily Check question or an intro.
5. **Per student, never device-wide.** Every reward lives in the student's
   own save, so shared iPads stay separate.

## 2. Three kinds of reward

| Kind | Resets | Examples today |
| --- | --- | --- |
| Weekly | Sunday (Tokyo) | stars, link stars, rainbow stars, crowns, weekly medals, arcade unlocks, wearable weekly skin, maze arrival reward |
| Permanent | never | level and rank coin, trophies, postcards, skin collection, Wanderers, travelers, Karasuki Cards, world records |
| Odd finds | never (earned weekly) | Karasuki finds (this document, section 3) |

Weekly rewards show this week's effort and vanish on Sunday without leaving
a "missed" mark. Permanent rewards only ever grow.

## 3. Karasuki finds

Odd, permanent collectibles found in Karasuki, the place where forgotten
things go. Two explicit reward channels, each with its own pool.

### 3.1 Channels

| Channel | Trigger (same calendar week, Sunday to Saturday, Tokyo) | Pool |
| --- | --- | --- |
| **Weekly oddity draw** | 3 completed Daily Checks on distinct days **and** 3/3 Blitz | standard |
| **Perfect Check Week bonus** | 7 completed Daily Checks on distinct days, regardless of Blitz | special |

A student who meets both triggers earns two finds that week. There is no
other way to earn a find.

### 3.2 Definitions

- **Completed Daily Check:** a day whose record is
  `meta.checkIn[<day>].st === 'done'`. Skips, closes, load or save failures
  (`meta.dailyCheckEvents`) and the legacy `st: 'skip'` never count.
- **Distinct days:** Tokyo day keys from `CALENDAR`. A Daily Check redone the
  same day (`retries`) still counts as one day.
- **3/3 Blitz:** the same rule as the weekly skin
  (`hasCurrentBlitzTriple` in `js/core/booha-skins.js`): all three Blitz types
  cleared in one curriculum this week.
- **Calendar week:** the current occurrence key from `CALENDAR`. Never the
  browser clock; if `CALENDAR` is missing, nothing is evaluated.

### 3.3 Safeguards

1. Each channel can trigger at most **once per calendar week**.
2. Repeated Daily Check events on one day do not count twice.
3. Standard and special finds use **separate pools**.
4. **Duplicates:** draw from items the student does not own yet. Only when a
   pool is exhausted for that student does a duplicate convert into a
   separate currency (see open question 2).
5. If both channels are earned, they are announced in **one queued "This
   week's finds" reveal**, not two interruptions.
6. Order does not matter: a 7/7 week without Blitz earns the special bonus,
   and completing Blitz later that week still earns the standard draw.
7. Past weeks are never back-filled. The first evaluated week is the week
   the feature ships.

### 3.4 Placement and clue

- Each earned find is placed at a **deterministic "random" spot in
  Karasuki** for that student, week and channel. The seed combines the
  student's save identity, the week's occurrence key and the channel, so
  reloads and other devices agree.
- Spots reuse Karasuki's existing placement rules (the seeded orb placement
  and `isOrbPositionClear`: away from trees, exits and screen edges).
- The chosen item and spot are **written to the save when the find is
  earned**, so later art additions never change a find already waiting.
- **No pixel hunt:** the find shows a visible glint in its room, and the
  player gets a small clue naming the room when they enter Karasuki.
- Picking it up is the player's own action, so the pickup moment is not an
  interruption.

### 3.5 Display

- A **cabinet of finds** on the Adventure profile shows only owned items,
  each with its name, art and a short lore line (English and Japanese).
- The cabinet shows how many the student has found, **without a total**
  ("12 found", never "12 of 40"), so the pool can grow without creating
  gaps.
- Standard and special finds sit on separate shelves; the special shelf stays
  hidden until the first special find (no hints, like the Special Card
  shelf).

### 3.6 Data

Permanent, in the student's save (never device-wide):

```
collectibles[<itemId>] = { found: true, foundAt, channel, week }
meta.findsLog[<occurrenceKey>] = {
  standard: { itemId, room, x, y, earnedAt, foundAt },   // when earned
  special:  { itemId, room, x, y, earnedAt, foundAt }
}
```

`collectibles` already exists in the save. `meta.findsLog` survives the
Sunday reset, which is what lets one channel trigger only once per week.

### 3.7 Catalogue

One data file lists every find (trophy-case style). Proposed entry shape:

```
{ id, pool: 'standard' | 'special', en, jp, loreEn, loreJp, img, addedAt }
```

Art: square WebP, lossy, within the profile art budget (48 KiB and 256 px
per file; see PERFORMANCE-BUDGETS.md), kept in its own image directory with
its own budget line. The standard pool should hold at least 40 items so a
full school year does not exhaust it.

### 3.8 Existing Collectibles system

`js/core/collectible-system.js` becomes the home for finds once its
curriculum-week and page fields are removed (they tie items to weeks, which
breaks principle 2). Its one unused placeholder item (the Secret Scroll) is
retired. Its `collect()` entry point stays.

## 4. Shared foundation (Pass 4)

Built before the first finds, and used by them first:

1. **Reward catalogue:** one registry that reward types plug into.
2. **Reveal queue:** extend the medal-toast queue so any reward type can
   queue a reveal, including the combined "This week's finds".
3. **Cabinet:** one collection view on the Adventure profile.

Existing systems (medals, trophies, postcards, cards, skins) are not moved in
Pass 4. Each moves later, one per pass, only if it fits.

## 5. Pass plan

| Pass | Scope | Code |
| --- | --- | --- |
| 3 | This document | no |
| 4 | Shared foundation: catalogue, reveal queue, cabinet | yes |
| 5 | Karasuki finds: triggers, placement, glint and clue, first items | yes (needs Bryan's art) |
| 6+ | Move existing systems onto the foundation, one per pass | yes |

Every code pass: read-only first, approval per pass, `./verify.sh` after every
change, a test in `tests/` for each change.

## 6. Open questions

1. **Unpicked finds at the week's end.** Recommended: an earned find stays in
   Karasuki until picked up (it was earned, so it is never lost), and does
   not block the next week's draws.
2. **Duplicate currency.** What duplicates convert into once a pool runs out,
   and what it buys. Not needed until a pool is exhausted.
3. **Who gives the clue.** A Karasuki host, Mister Happy, or a plain line of
   text.
4. **Juku students.** Same rules, or separate? Recommended: same rules.
5. **Initial pool sizes** for the first release (standard and special).
