# Booha Adventure performance budgets

These are enforceable file/cache limits or runtime targets, not claims about every device.

| Budget | Target |
| --- | ---: |
| Initial world image payload | 12 MiB |
| Maximum individual room image | 700 KiB |
| Maximum deployed image file | 700 KiB (2 MiB only for explicit lossless allowlist) |
| Maximum decoded room neighborhood cache | current room + direct exits |
| Maximum decoded Wanderer cache | 48 MiB |
| Maximum deployed image payload | 52 MiB (every raster under assets/img counts) |
| Profile medal / trophy art | 48 KiB and 256 px per file |
| Profile, Blitz, Menu image directories | 1.6 / 1.4 / 0.5 MiB |
| Lossless WebP policy | explicit allowlist only; all other deployed WebP images must be lossy |
| Root image-directory payload | 8 MiB |
| Drifter image-directory payload | 1.8 MiB |
| Grimmerglen image-directory payload | 12.9 MiB |
| Family Room image-directory payload | 3 MiB |
| Karasuki image-directory payload | 3.5 MiB |
| Muenba image-directory payload | 9.2 MiB |
| Utsuroba image-directory payload | 5.75 MiB |
| Wanderer image-directory payload | 11.5 MiB |
| Karasuki Cards image-directory payload (300×450 WebP, ~50 KB each, lazy-loaded) | 1 MiB |
| Canvas DPR | high: device-capped; low: 1 |
| High-tier frame target | 60 FPS |
| Low-tier frame target | deliberate 30 FPS |
| Room-transition delay | 1.6 s readiness timeout |
| Acceptable long frame | under 100 ms during active play |

Node audits enforce file sizes, WebP structure, references, dimensions, the
explicit lossless allowlist, Family Room assets outside `assets/img/`, and the
decoded Wanderer-cache model. Browser
runtime monitors measure actual frame windows and memory estimates.
Representative-device testing is still required for Safari/iOS thermal
behavior, page hide/resume, audio activity, and visual edge quality.

## Blitz pre-release check

Before shipping a Blitz visual or performance change, run the three games
with `?blitzdiag=1` and check the following in Chrome DevTools:

1. Use Performance CPU throttling at 6×, then 20×, and confirm the runtime
   tier settles to `reduced` or `minimal` without making the run unusable.
2. In Rendering, emulate `prefers-reduced-motion` and confirm the game stays
   readable, answerable, and restartable.
3. Use the device toolbar at `1024 × 600` landscape and confirm all six
   answers remain reachable; repeat at `1280 × 600` and `960 × 540`.
4. Verify a clean perfect run updates the HUB pill immediately, and a weekly
   reset updates it without requiring a tab switch or page reload.

The diagnostic overlay reports the active hardware/runtime tier, average frame
time, slow-frame ratio, and sample window. These checks complement the static
audits in `verify.sh`; they do not replace testing on a representative phone
or tablet when one is available.

## Trophy Case pass (2026-10-22)

The global image total moved from 50 MiB to 52 MiB, and it now counts every
PNG/JPG/GIF under `assets/img`, not only WebP. The ten unreferenced PNG
source originals (13 MB, all with WebP twins) were deleted from the repo; the
only remaining non-WebP raster is the 70 KB Juku logo, allowlisted with its
own ceiling.

The total is not what makes the app smooth. Frame time and memory come from
the per-file ceilings (700 KiB, 48 KiB for medals), per-directory budgets,
lossy-by-default encoding, lazy loading and the decoded-image cache limits
above. The total only bounds what a student downloads after visiting every
world, and the service worker never precaches world art in bulk. A small raise
for the new trophy art keeps every per-file and per-directory ceiling in place.

## Replacing art

Every committed version of a binary file remains in Git history unless
history is deliberately rewritten, whether the file is overwritten in place or
replaced under a new filename. A new filename protects students from stale
cached art; it does not keep the old version out of the repository. The way to
keep history small is fewer, more deliberate art swaps.

1. **Drafts stay out of Git.** Source masters, experiments and work-in-progress
   art live outside the repository or in the local-only, ignored `_drafts/`
   folder. Only finished art is promoted into the live asset tree.
2. **Batch art changes.** Group related replacements into one visual pass or
   release. Avoid tiny iterative swaps; replace art only when the improvement
   is worth another permanent copy in history.
3. **New filename for student-visible replacements.** When a replacement must
   reach iPads that may hold the old file in cache, give it a new filename
   rather than overwriting. Art not yet deployed to students can be
   overwritten.
4. **Update everything together.** Update every reference (HTML, JS, JSON) and
   the relevant cache version in `sw.js`: `pages` for changed precached pages,
   `assets` for changed cache-first assets or `CORE_ASSETS`, and `decks` for
   curriculum/content JSON. Add or remove precache entries when applicable.
   Runtime assets under `/assets/` are cache-first even when they are not in
   `CORE_ASSETS`.
5. **Check before committing.** Run `./verify.sh`; the asset-budget,
   tracked-file and video-loading guards must pass. Review the size of the
   change with `git diff --cached --stat` before committing art.
