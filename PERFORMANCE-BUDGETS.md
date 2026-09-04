# Booha Adventure performance budgets

These are enforceable file/cache limits or runtime targets, not claims about every device.

| Budget | Target |
| --- | ---: |
| Initial world image payload | 12 MiB |
| Maximum individual room image | 700 KiB |
| Maximum transparent character file | 1.5 MiB |
| Maximum decoded room neighborhood cache | current room + direct exits |
| Maximum decoded Wanderer cache | 48 MiB |
| Canvas DPR | high: device-capped; low: 1 |
| High-tier frame target | 60 FPS |
| Low-tier frame target | deliberate 30 FPS |
| Room-transition delay | 1.6 s readiness timeout |
| Acceptable long frame | under 100 ms during active play |

Node audits enforce file sizes, WebP structure, references, dimensions, and the
decoded Wanderer-cache model. Browser runtime monitors measure actual frame
windows and memory estimates. Representative-device testing is still required
for Safari/iOS thermal behavior, page hide/resume, audio activity, and visual
edge quality.
