# The Booha Adventure

*[日本語版はこちら](README.ja.md)*

The Booha Adventure is a browser-based educational adventure that combines English practice, story exploration, mini-games, and persistent progress inside one strange little world.

It is designed for learners who benefit from short sessions, strong visual and audio feedback, and a reason to return tomorrow.

## What players can do

- Explore the Booha Adventure maze.
- Visit story worlds including Karasuki, Utsuroba, and Muenba.
- Practice vocabulary, sentences, listening, reading, spelling, and comprehension.
- Play short bonus games built around the Booha characters.
- Unlock story scenes, collectibles, character profiles, and adventure progress.
- Use the experience as a web app or installable progressive web app.

## Educational approach

The project is built around a few simple ideas:

- Practice should feel like part of an adventure.
- Short, repeatable activities are easier to return to.
- Mistakes should provide useful feedback rather than end the experience.
- Story, sound, artwork, and language practice should support one another.
- Progress should feel personal and visible.

## Technical overview

The Booha Adventure is intentionally built as a lightweight, framework-free web application using:

- HTML
- CSS
- Vanilla JavaScript
- JSON-driven curriculum and story content
- HTML5 audio and video
- Web Audio API effects
- Progressive Web App features
- A service worker for caching and offline support
- External services for authorized access and player progress

The project does not require a frontend framework or bundler.

## Repository structure

```text
index.html              Main entry point
maze.html               Adventure maze and world navigation
curriculum/             Curriculum hubs and study activities
content/                Story and learning content
games/                  Reusable language-game modules
js/                     Application logic and shared systems
theme/                  Page and game styles
assets/                 Artwork, audio, and video
tests/                  Automated content and behavior audits
verify.sh               Pre-deployment verification script
```

Individual world and game pages — for example `karasuki.html`, `muenba.html`, and `liar_machine.html` — live at the repo root alongside `index.html` and `maze.html`, one file per experience.

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

The verification suite checks content data, navigation contracts, game behavior, service-worker paths, media assets, responsive behavior, and performance-related safeguards.

Full verification requires Node.js, Python 3, and ffmpeg (ffprobe is included) for the media-inspection checks.

## Project status

The Booha Adventure is an actively developed educational and creative project. New areas, characters, stories, games, and learning activities are added over time.

Interfaces, content, and internal systems may change as the project grows.

## Copyright and use

Unless otherwise noted, The Booha Adventure's original characters, stories, dialogue, artwork, music, authored learning materials, and software are copyright of Bryan Harper. All rights reserved.

Public visibility of this repository does not grant permission to copy, adapt, redistribute, or commercially use the original Booha Adventure content, characters, branding, or assets.

Third-party fonts, libraries, media, and other materials remain subject to their respective licenses and terms.
