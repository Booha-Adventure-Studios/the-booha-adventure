# The Booha Adventure

*[日本語版はこちら](README.ja.md)* · [Visit Booha World ↗](https://booha-adventure-studios.github.io/booha-world/)

The Booha Adventure is a browser-based English-learning adventure for Japanese learners. Weekly curriculum practice, story worlds, mini-games, and persistent progress live inside one strange little world.

It is designed for learners who benefit from short sessions, strong visual and audio feedback, and a reason to return tomorrow.

*Last updated: 2026-10-25*

## What players can do

- **Play the weekly curriculum.** Each week brings nine short games in three lanes, built from that week's lesson content:
  - **Words:** Vocab Tap, Spell the Word, Vocab Speed
  - **Sentences:** Sentence Tap, Sentence Order, Sentence Speed
  - **Listen:** Say a Word, Say a Sentence, Ask a Sentence
- **Choose a course.** Three curricula share the same game system: Pre-Boo (youngest learners, hiragana support), Boo-riculum, and Boo-Continuum.
- **Follow the weekly trail.** Stars on each game light the path between neighbours (+1★ links). ★★ on all nine opens the arcade chest, three Blitz challenges unlock a weekly Booha skin, and everything resets each Sunday (Tokyo time).
- **Try Bonus Games.** Booha Bites (find the missing word), Echo (listen and type), and the Week Boss (a final-boss review that opens after all nine games are played). Bonus Games never change the nine-game unlock.
- **Explore story worlds:**
  - **Karasuki:** the hub world, home of the Wanderers, a collectable cast of characters with their own stories.
  - **Grimmerglen:** a house of lost memories, recovered through tiered typing (choices → clues → whole-memory recall).
  - **Utsuroba:** reading-centred episodes with sequence, detail, and inference tasks, plus drifter quests. Akiya (the Family Room) is a quiet study space inside it.
  - **Muenba:** a ghost cemetery with briefings, hunts, hiding, and reading gates.
  - **Mister Happy's House:** the Liar Machine (local two-player, pass-and-play) and the Snap Test.
- **Unlock arcade games:** Booha Invaders, Booha Blocks, Booha Destruction, and Feed Booha.
- **Grow a profile:** levels and rank coins, eight weekly medals (bronze, silver, gold), permanent Adventure Tokens, a Wanderer collection, and an adventure calendar.
- **Use English Juku** (for juku students): a classroom lesson mode with dictation, open-response translation, writing, and reading, plus a weekly report.
- **Install it** as a web app (PWA) with offline caching.

## Educational approach

These are the mechanisms the app actually uses:

- **Retrieval practice.** Learners produce answers (typing words and sentences, ordering, listening and choosing) instead of only recognising them. Grimmerglen, Echo, and the Week Boss ask for recall from memory.
- **First-try scoring with recovery.** A right answer on the first try earns full points and builds a combo; a corrected answer still earns partial credit in games where guessing can't pay. Mistakes give feedback and the game continues.
- **Rewarding preparation, not speed.** *Ready pace* (rainbow stars) is awarded when most answers are right on the first try at a steady pace. It uses the median answer time, so pausing to check a notebook never costs it, and frantic tapping is excluded. Speed games judge accuracy only.
- **Short weekly cycles.** Content is organised by curriculum week; progress, medals, and bonus goals reset each Sunday so every week is a fresh start, while permanent records (tokens, ready weeks, collections) carry forward.
- **Japanese support by level.** Instructions are bilingual; Pre-Boo uses hiragana, older courses use kanji with furigana.
- **Visible, personal progress.** Stars, links, lane breakdowns ("Words 2/3 · Sentences 1/3 · Listen 1/3"), and a personal best week give learners a concrete next step.
- **Low stakes.** Game activity is practice. In Juku, game results are never used as learning evidence and never change a score.

## Privacy and student data

- The only student information is a **first and last name**. The last name never appears in the app; it stays on the school's own server (Wix).
- Progress is saved **per student** (synced to the school's server and kept in the browser), so students can share an iPad without seeing or affecting each other's progress.
- There is **no teacher or parent dashboard**. Progress can only be viewed on the student's own device or with their PIN. The app is designed this way on purpose.
- The app contains **no advertising and no third-party analytics scripts**.

## Technical overview

The Booha Adventure is intentionally built as a lightweight, framework-free web application using:

- HTML, CSS, and vanilla JavaScript (no framework, no bundler)
- JSON-driven curriculum and story content
- HTML5 audio and video, plus Web Audio API sound effects
- Progressive Web App features and a service worker for caching and offline support
- Authorized access and per-student progress sync through the school's own backend

**Devices:** older iPads are a primary target. Images follow explicit size budgets ([PERFORMANCE-BUDGETS.md](PERFORMANCE-BUDGETS.md)), animations use transform and opacity only, and motion and effects scale down for reduced-motion settings and slower devices.

## Repository structure

```text
index.html              Main entry point
maze.html               Adventure maze and world navigation
game.html               Shared host for the nine curriculum games and Bonus Games
profile.html            Student profile: trail, medals, tokens, records
curriculum/             Curriculum hubs (games and study menus per course)
content/                Weekly lesson decks and story content
games/                  Game engines (nine curriculum games + Bonus Games)
js/                     Application logic and shared systems (js/core/ = save, scores, unlocks, tokens)
theme/                  Page and game styles
assets/                 Artwork, audio, and video
tests/                  Automated content and behaviour audits
tools/                  Maintenance tools (e.g. pace-report.cjs for ready-pace calibration)
verify.sh               Pre-deployment verification script
```

Individual world and game pages, for example `karasuki.html`, `muenba.html`, and `liar_machine.html`, live at the repo root alongside `index.html` and `maze.html`, one file per experience.

Design notes: [PERFORMANCE-BUDGETS.md](PERFORMANCE-BUDGETS.md), [JUKU-ASSESSMENT-DESIGN.md](JUKU-ASSESSMENT-DESIGN.md), [family-room-design-lock.md](family-room-design-lock.md). A plain-text map for AI tools is in [llms.txt](llms.txt).

## Local development

The project is a static web application. A small local preview server is included for development and testing.

```bash
node tests/serve-preview.cjs
```

Then open:

```
http://localhost:8127/index.html
```

## Verification

Before deployment, run:

```bash
./verify.sh
```

The verification suite (about 300 checks) covers content data, navigation contracts, game behaviour, scoring and save rules, weekly rollover, service-worker paths, media assets, responsive behaviour, and performance budgets.

Full verification requires Node.js, Python 3, and ffmpeg (ffprobe is included) for the media-inspection checks.

## Project status

The Booha Adventure is an actively developed educational and creative project. New areas, characters, stories, games, and learning activities are added over time.

Interfaces, content, and internal systems may change as the project grows.

## Copyright and use

Unless otherwise noted, The Booha Adventure's original characters, stories, dialogue, artwork, music, authored learning materials, and software are copyright of Bryan Harper. All rights reserved.

Public visibility of this repository does not grant permission to copy, adapt, redistribute, or commercially use the original Booha Adventure content, characters, branding, or assets.

Third-party fonts, libraries, media, and other materials remain subject to their respective licenses and terms.
