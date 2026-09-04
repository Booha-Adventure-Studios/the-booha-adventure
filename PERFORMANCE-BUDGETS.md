# Booha Adventure performance budgets

These are enforceable file/cache limits or runtime targets, not claims about every device.

| Budget | Target |
| --- | ---: |
| Initial world image payload | 12 MiB |
| Maximum individual room image | 700 KiB |
| Maximum deployed image file | 700 KiB (2 MiB only for explicit lossless allowlist) |
| Maximum decoded room neighborhood cache | current room + direct exits |
| Maximum decoded Wanderer cache | 48 MiB |
| Maximum deployed image payload | 50 MiB |
| Lossless WebP policy | explicit allowlist only; all other deployed WebP images must be lossy |
| Root image-directory payload | 8 MiB |
| Drifter image-directory payload | 1.8 MiB |
| Grimmerglen image-directory payload | 12.9 MiB |
| Karasuki image-directory payload | 3.5 MiB |
| Muenba image-directory payload | 9.2 MiB |
| Utsuroba image-directory payload | 5.75 MiB |
| Wanderer image-directory payload | 11.5 MiB |
| Canvas DPR | high: device-capped; low: 1 |
| High-tier frame target | 60 FPS |
| Low-tier frame target | deliberate 30 FPS |
| Room-transition delay | 1.6 s readiness timeout |
| Acceptable long frame | under 100 ms during active play |

Node audits enforce file sizes, WebP structure, references, dimensions, the
explicit lossless allowlist, and the decoded Wanderer-cache model. Browser
runtime monitors measure actual frame windows and memory estimates.
Representative-device testing is still required for Safari/iOS thermal
behavior, page hide/resume, audio activity, and visual edge quality.
