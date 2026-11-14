# Booha Adventure rewards: design rules

Status: **Karasuki finds are live** (November 2026). This document records
the rules the code follows. Change the rules here first, then the code.

## 1. Principles

1. **Reward completion, not activity.** Rewards come from finishing real
   work: Daily Checks, Blitz clears, maze games, world progress. Time spent,
   taps and page visits never earn a reward on their own.
2. **No one ever sees a week they missed.** Anything time-limited shows only
   what the player owns. Anything that never expires may show what is still
   ahead. The closet (missed skins hidden, counts from the visible set) and
   the oddities cabinet (owned items only, no total) both follow this.
3. **Many rewards, few systems.** Adding a reward should mean adding art and
   one data entry, not new code. `js/core/trophy-case.js` and
   `js/core/collectibles-data.js` are the models.
4. **One reveal at a quiet moment.** Rewards announce themselves through
   `js/ui/medal-toast.js`, which queues and waits for a natural break (never
   during a Blitz run, a Daily Check question or an intro).
5. **Per student, never device-wide.** Every reward lives in the student's
   own save, so shared iPads stay separate.

## 2. Three kinds of reward

| Kind | Resets | Examples |
| --- | --- | --- |
| Weekly | Sunday (Tokyo) | stars, link stars, rainbow stars, crowns, weekly medals, arcade unlocks, wearable weekly skin, maze arrival reward |
| Permanent | never | level and rank coin, trophies, postcards, skin collection, Wanderers, travelers, Karasuki Cards, world records |
| Odd finds | never (earned weekly) | Karasuki finds (section 3) |

Weekly rewards show this week's effort and vanish on Sunday without leaving
a "missed" mark. Permanent rewards only ever grow.

## 3. Karasuki finds (oddities)

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
- **3/3 Blitz:** the same rule as the weekly skin: all three Blitz types
  cleared in one curriculum this week.
- **Calendar week:** the current occurrence key from `CALENDAR`. Never the
  browser clock; if `CALENDAR` is missing, nothing is evaluated.

### 3.3 Safeguards

1. Each channel can trigger at most **once per calendar week**.
2. Repeated Daily Check events on one day do not count twice.
3. Standard and special finds use **separate pools**.
4. Order does not matter: a 7/7 week without Blitz earns the special bonus,
   and completing Blitz later that week still earns the standard draw.
5. Past weeks are never back-filled. Finds start the week the feature
   shipped.
6. **Never lost:** draws are checked when a Daily Check or Blitz game
   finishes **and** on every page load once the student is identified. The
   curriculum game boards load the draw logic, because the Daily Check runs
   there too. Checking again is always safe (rule 1).

### 3.4 Drawing an item

- **Per student:** each student has a random seed in their own save
  (`meta.findsSeed`, synced, never device-wide, not derived from the
  student id). Classmates draw different items in a different order.
- The draw picks from items the student **does not own and is not already
  hunting**. An item waiting in Karasuki is never drawn a second time.
- **Duplicates:** only when that set is empty is a **second copy** of an
  owned item drawn. It is placed and picked up like any other find, and the
  cabinet shows it as **×2** (×3 and so on). There is no conversion currency.
- The chosen item is written to the save the moment it is earned, so adding
  new art later never changes a find that is already waiting.

### 3.5 Announcing, the clue, and pickup

- **Earning is a mystery.** The reveal queue shows "SOMETHING STRANGE" (or
  "THIS WEEK'S FINDS" when both channels are earned together, in one
  reveal, not two). It never shows the item's name or art.
- **The clue.** When a student enters Karasuki with a find waiting, a dark,
  odd popup appears (shared world-popup frame) and has to be closed. It
  shows once per visit and waits until no other dialog is open.
- **Directions, not room numbers.** Players never see room numbers, so the
  clue gives the first step along Karasuki's doors ("→ Go right. /
  みぎへ いこう。"), or "It is in this room. Look for the glint." A small hint
  panel keeps showing the direction after the popup is closed.
- **Placement:** a stable spot per student, week and item, using Karasuki's
  existing safe-spot rules (away from trees, exits and edges). The spot is
  saved once placed, so reloads and other devices agree. The find bobs and
  glints; no invisible pixel hunt.
- **Unpicked finds** stay in Karasuki until picked up. They never block the
  next week's draws.
- **Pickup is the reveal:** the item's own discovery line in English and
  Japanese. A duplicate adds "Another one! / もう ひとつ！".
- **Juku students** follow the same rules as everyone else.

### 3.6 Cabinet

- On the Adventure profile. Shows **only owned items**: no ??? slots and
  **no total** ("2 found · 2こ みつけた", never "2 of 12"), so the pool can grow
  without creating gaps.
- The **special shelf** (SPECIAL · とくべつ) stays hidden until the first
  special find.
- Each card: art, English and Japanese name, material, description, a ×N
  badge for copies, and a closed **"✦ ひみつ · A secret"** line that opens to
  the item's story hook.

### 3.7 Data

Permanent, in the student's save (never device-wide):

```
collectibles[<itemId>] = { found: true, foundAt, channel, week, copies? }
meta.findsSeed = '<random string>'            // per-student draw order
meta.findsLog[<occurrenceKey>] = {
  standard: { itemId, earnedAt, foundAt, duplicate, room, x, y, placedAt, revealedAt },
  special:  { ...same... }
}
```

`meta.findsLog` survives the Sunday reset, which is what lets one channel
trigger only once per week. `revealedAt` marks the earn announcement as
shown, so an unshown one is retried on the next page.

### 3.8 Catalogue

`js/core/collectibles-data.js` lists every find. Adding an oddity means art
plus one entry; nothing else changes. Entry shape:

```
{ id, pool: 'standard' | 'special', scale: 'small' | 'medium' | 'large', asset,
  name, material, discovery, collection, storyHook,
  nameJp, materialJp, discoveryJp, collectionJp, storyHookJp }
```

- Every English line has a Japanese twin: kid-facing hiragana and katakana
  with word spaces. No em dashes in any line. A test requires all fields.
- **Launch pool:** 9 standard and 3 special (apothecary theme). New finds
  join the pool whenever they are ready; the cabinet never shows a total, so
  growth never shows as a gap.
- **Art:** square-ish WebP with transparency in `assets/img/collectibles/`.
  Finds are drawn at 30 to 82 px in Karasuki and 112 px in the cabinet.
  Recommended export for new art: about 256 to 320 px wide, under 48 KB.
  The 12 launch images are 768 px wide (47 to 92 KB); re-exporting them
  smaller is optional and would cut decoded memory on older iPads. There is
  no per-directory budget line for this folder yet.

## 4. Still to do

1. **Reveal moments.** About six separate "you got something!" moments
   remain (level-up, skin popup, card reveal, maze congratulations, week
   sealed, plus medals and oddities already on the shared queue). Move them
   onto the shared queue one per pass, only where it fits, so popups never
   stack.
2. **One reward list.** A single registry of every reward type, worth
   building once more kinds of reward are added.
3. **Adventure Log past weeks.** The past-week strip labels a logged week
   with nothing completed "休 おやすみ". Check whether that reads as a missed
   week.
4. **Art budget.** Add an `assets/img/collectibles/` line to
   PERFORMANCE-BUDGETS.md when the export size is settled.

Every code pass: read-only first, approval per pass, `./verify.sh` after every
change, a test in `tests/` for each change.
