
#!/usr/bin/env bash
# ============================================================
#  The Booha Adventure — pre-deploy verification
#  Usage: ./verify.sh   (from repo root, before every push)
#  Exit 0 = safe to deploy. Exit 1 = fix something first.
# ============================================================
set -u
cd "$(dirname "$0")"

PASS=0; FAIL=0; WARN=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN+1)); }

echo "🔍 Booha Adventure pre-deploy check"
echo "───────────────────────────────────"

# ── 1. JSON validity (non-empty files must parse) ────────────
echo "[1/36] Content JSON validity"
json_bad=0; json_empty=0; json_ok=0
while IFS= read -r f; do
  if [ "$(wc -c < "$f")" -le 2 ]; then
    json_empty=$((json_empty+1))
  elif python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>/dev/null; then
    json_ok=$((json_ok+1))
  else
    bad "invalid JSON: $f"
    json_bad=$((json_bad+1))
  fi
done < <(find content data -name "*.json" 2>/dev/null)
[ $json_bad -eq 0 ] && ok "$json_ok JSON files valid ($json_empty empty placeholders skipped)"

# ── 2. Service worker manifest: every CORE_FILES path exists ─
echo "[2/36] sw.js CORE_FILES exist on disk (addAll is all-or-nothing)"
sw_bad=0; sw_ok=0
while IFS= read -r rel; do
  [ -z "$rel" ] && continue
  path="${rel#/}"                    # strip leading slash
  [ -z "$path" ] && path="index.html" # `${BASE}/` root entry
  if [ -f "$path" ]; then
    sw_ok=$((sw_ok+1))
  else
    bad "sw.js lists missing file: $path"
    sw_bad=$((sw_bad+1))
  fi
done < <(sed -n '/const CORE_FILES = \[/,/\];/p' sw.js \
         | grep -oE '\$\{BASE\}/[^`]*' | sed 's|^\${BASE}/||')
[ $sw_bad -eq 0 ] && ok "$sw_ok precached files all present"

# ── 3. Independent cache version constants ──────────────────
echo "[3/36] Independent cache version validation"
cache_bad=0
cache_summary=""
for cache_kind in pages assets decks; do
  cache_versions=$(grep -oE "booha-${cache_kind}-[A-Za-z0-9-]+" sw.js \
                   | sed "s/booha-${cache_kind}-//" | sort -u)
  cache_count=$(printf '%s\n' "$cache_versions" | grep -c . || true)
  if [ "$cache_count" -eq 1 ]; then
    cache_summary="$cache_summary ${cache_kind}=$(printf '%s' "$cache_versions")"
  else
    cache_summary="$cache_summary ${cache_kind}=INVALID"
    cache_bad=1
  fi
done
if [ "$cache_bad" -eq 0 ]; then
  ok "independent cache versions valid:$cache_summary"
else
  bad "invalid cache version entries:$cache_summary"
fi

# ── 4. Cache bump reminder (needs git) ───────────────────────
echo "[4/36] Cache bump vs. changed files"
if git rev-parse --git-dir >/dev/null 2>&1; then
  changed=$(git diff HEAD --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null)
  cached_changed=$(echo "$changed" | grep -cE '\.(html|js|css|json)$' || true)
  sw_bumped=$(echo "$changed" | grep -c '^sw\.js$' || true)
  if [ "$cached_changed" -gt 0 ] && [ "$sw_bumped" -eq 0 ]; then
    warn "$cached_changed cached file(s) changed but sw.js untouched — did you bump the cache version?"
  else
    ok "no bump needed, or sw.js already touched"
  fi
else
  warn "not a git repo here — skipping bump check"
fi

# ── 5. No leading-slash asset paths (GitHub Pages trap) ──────
echo "[5/36] Leading-slash paths"
ls_hits=$(grep -rnE 'src="/[^/t]|href="/[^/t]' --include="*.html" . 2>/dev/null \
          | grep -v '/the-booha-adventure/' | head -5)
if [ -z "$ls_hits" ]; then
  ok "no bad leading-slash paths"
else
  bad "leading-slash paths found:"; echo "$ls_hits" | sed 's/^/       /'
fi

# ── 6. Script order: calendar.js before core stack ───────────
echo "[6/36] calendar.js loads before core stack"
order_bad=0
while IFS= read -r page; do
  cal=$(grep -n 'calendar\.js' "$page" | head -1 | cut -d: -f1)
  core=$(grep -n 'adventure-core\.js' "$page" | head -1 | cut -d: -f1)
  if [ -n "$cal" ] && [ -n "$core" ] && [ "$cal" -gt "$core" ]; then
    bad "$page: calendar.js loads AFTER adventure-core.js"
    order_bad=$((order_bad+1))
  fi
done < <(grep -rlE 'adventure-core\.js' --include="*.html" . 2>/dev/null)
[ $order_bad -eq 0 ] && ok "script order correct on all core-stack pages"


# ── 7. Juku content validation ───────────────────────────────
echo "[7/36] juku.json content checks"
juku_files=$(find content -name "juku.json" 2>/dev/null)
if [ -z "$juku_files" ]; then
  warn "no juku.json files found"
else
  juku_bad=0; juku_ok=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if python3 - "$f" << 'PYEOF'
import json, re, sys
f = sys.argv[1]
try:
    d = json.load(open(f))
except Exception as e:
    print('       cannot parse:', e); sys.exit(1)
errs = []
is_pb = '/pb/' in f
kana = re.compile(r'^[\u3040-\u309F\u30A0-\u30FFー\s]+$')
weeks = d.get('weeks', [])
if [w.get('week') for w in weeks] != [1, 2, 3, 4]:
    errs.append('weeks must be exactly 1-4')
for w in weeks:
    wk = w.get('week', 0)
    lo, hi = (wk - 1) * 15 + 1, wk * 15
    ns = [x.get('n') for x in w.get('definitions', [])]
    if ns != list(range(lo, hi + 1)):
        errs.append(f'w{wk}: definition n range must be {lo}-{hi}')
    for x in w.get('definitions', []):
        if not x.get('pos'):
            errs.append(f'w{wk}: def n{x.get("n")} missing pos')
    p = w.get('passage', {})
    if 'mp3' in p or 'dictation' in p:
        errs.append(f'w{wk}: passage has mp3/dictation (no-juku-audio rule)')
    if not p.get('text') or not p.get('comprehension'):
        errs.append(f'w{wk}: passage needs text + comprehension')
    reads = [q for q in w.get('questions', []) if q.get('type') == 'read']
    for arr, lab in [(p.get('comprehension', []), 'comp'), (reads, 'read')]:
        for q in arr:
            if not (0 <= q.get('correct', -1) < len(q.get('choices', []))):
                errs.append(f'w{wk} {lab} n{q.get("n")}: correct index out of range')
            if len(set(q.get('choices', []))) != len(q.get('choices', [])):
                errs.append(f'w{wk} {lab} n{q.get("n")}: duplicate choices')
    qns = [q.get('n') for q in w.get('questions', [])]
    if qns != list(range(1, len(qns) + 1)):
        errs.append(f'w{wk}: question n not sequential from 1')
    for q in w.get('questions', []):
        t = q.get('type')
        if t == 'translate':
            if re.search(r'[.!?]$', q.get('en', '')):
                errs.append(f'w{wk} translate n{q.get("n")}: terminal punctuation in en')
            tw = set(x.lower() for x in q.get('en', '').split())
            dup = [e for e in q.get('extra', []) if e.lower() in tw]
            if dup:
                errs.append(f'w{wk} translate n{q.get("n")}: extra duplicates target {dup}')
        elif t == 'write':
            if not q.get('en', '').strip():
                errs.append(f'w{wk} write n{q.get("n")}: en must not be empty')
            if is_pb and not kana.match(q.get('jp', '')):
                errs.append(f'w{wk} write n{q.get("n")}: pb write prompt must be kana: {q.get("jp")}')
for e in errs:
    print('       ' + e)
sys.exit(1 if errs else 0)
PYEOF
    then juku_ok=$((juku_ok+1))
    else bad "juku.json checks failed: $f"; juku_bad=$((juku_bad+1)); fi
  done <<< "$juku_files"
  [ $juku_bad -eq 0 ] && ok "$juku_ok juku.json file(s) pass all content checks"
fi

# ── 8. Utsuroba reading contracts ───────────────────────────
echo "[8/36] Utsuroba episode audit"
if node tests/utsuroba-episode-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba episode data and answer contracts pass"
else
  bad "Utsuroba episode audit failed"
fi

echo "[9/36] Utsuroba resolver audit"
if node tests/utsuroba-resolver-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba Starter/Case/Deep runtime resolution contracts pass"
else
  bad "Utsuroba resolver audit failed"
fi

echo "[10/36] Utsuroba memory progress audit"
if node tests/utsuroba-memory-progress-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba Start/Fresh/Deep progress contracts pass"
else
  bad "Utsuroba memory progress audit failed"
fi

echo "[11/36] Utsuroba journal audit"
if node tests/utsuroba-journal-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba reading journal contracts pass"
else
  bad "Utsuroba journal audit failed"
fi

echo "[12/36] Muenba case audit"
if node tests/muenba-case-audit.cjs >/dev/null 2>&1; then
  ok "Muenba case order and English-only record contracts pass"
else
  bad "Muenba case audit failed"
fi

echo "[13/36] Muenba reading-lock audit"
if node tests/muenba-reading-lock-audit.cjs >/dev/null 2>&1; then
  ok "Muenba reading lock, review, penalty, and rhythm handoff contracts pass"
else
  bad "Muenba reading-lock audit failed"
fi

echo "[14/36] Muenba popup audit"
if node tests/muenba-popup-audit.cjs >/dev/null 2>&1; then
  ok "Muenba popup top anchoring and scroll-reset contracts pass"
else
  bad "Muenba popup audit failed"
fi

echo "[15/36] Muenba celebration audit"
if node tests/muenba-celebration-audit.cjs >/dev/null 2>&1; then
  ok "Muenba center dance and Hide lock contracts pass"
else
  bad "Muenba celebration audit failed"
fi

echo "[16/36] Muenba spawn audit"
if node tests/muenba-spawn-audit.cjs >/dev/null 2>&1; then
  ok "Muenba hunt-target spawn safety contracts pass"
else
  bad "Muenba spawn audit failed"
fi

echo "[17/36] Muenba return-threat audit"
if node tests/muenba-return-threat-audit.cjs >/dev/null 2>&1; then
  ok "Muenba return-trip Jerk escalation and cleanup contracts pass"
else
  bad "Muenba return-threat audit failed"
fi

echo "[18/36] Muenba Pass 17 regression audit"
if node tests/muenba-pass17-regression-audit.cjs >/dev/null 2>&1; then
  ok "Muenba Pass 17 integration contracts pass"
else
  bad "Muenba Pass 17 regression audit failed"
fi

echo "[19/36] Muenba 19H journey audit"
if node tests/muenba-journey-audit.cjs >/dev/null 2>&1; then
  ok "Muenba full hunt-to-reward journey contracts pass"
else
  bad "Muenba journey audit failed"
fi

echo "[20/36] Muenba 19I entry audit"
if node tests/muenba-entry-audit.cjs >/dev/null 2>&1; then
  ok "Muenba live page boot, portal, and cache wiring contracts pass"
else
  bad "Muenba entry audit failed"
fi

echo "[21/36] Muenba memory progress audit"
if node tests/muenba-memory-progress-audit.cjs >/dev/null 2>&1; then
  ok "Muenba memory migration and per-mode progress contracts pass"
else
  bad "Muenba memory progress audit failed"
fi

echo "[22/36] Muenba navigation audit"
if node tests/muenba-navigation-audit.cjs >/dev/null 2>&1; then
  ok "Muenba room entry and arrow reveal contracts pass"
else
  bad "Muenba navigation audit failed"
fi

echo "[23/36] Muenba ghost audit"
if node tests/muenba-ghost-audit.cjs >/dev/null 2>&1; then
  ok "Muenba ghost tension and carried-energy behavior pass"
else
  bad "Muenba ghost audit failed"
fi

echo "[24/36] Muenba audio audit"
if node tests/muenba-audio-audit.cjs >/dev/null 2>&1 && node tests/muenba-rhythm-performance-audit.cjs >/dev/null 2>&1 && node tests/muenba-rhythm-clarity-audit.cjs >/dev/null 2>&1; then
  ok "Muenba audio, rhythm performance, and clarity contracts pass"
else
  bad "Muenba audio, rhythm performance, or clarity audit failed"
fi

echo "[24A/36] Muenba rhythm balance audit"
if node tests/muenba-rhythm-balance-audit.cjs >/dev/null 2>&1; then
  ok "Muenba rhythm approach speed and decoy fairness contracts pass"
else
  bad "Muenba rhythm balance audit failed"
fi

echo "[24B/36] Muenba rhythm mode audit"
if node tests/muenba-rhythm-mode-audit.cjs >/dev/null 2>&1; then
  ok "Muenba rhythm touch, keyboard, practice, danger, and reduced-motion contracts pass"
else
  bad "Muenba rhythm mode audit failed"
fi

echo "[24C/36] Muenba handoff audit"
if node tests/muenba-handoff-audit.cjs >/dev/null 2>&1; then
  ok "Muenba case, danger, return-trip, cleanup, and reward handoff contracts pass"
else
  bad "Muenba handoff audit failed"
fi

echo "[24D/36] Muenba content integrity audit"
if node tests/muenba-content-integrity-audit.cjs >/dev/null 2>&1; then
  ok "Muenba room, ghost, case, asset, tier, and shared-data contracts pass"
else
  bad "Muenba content integrity audit failed"
fi

echo "[24E/36] Grimmerglen profile-link audit"
if node tests/grimmerglen-profile-link-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen profile link and dance-only lock contracts pass"
else
  bad "Grimmerglen profile-link audit failed"
fi

echo "[24F/36] Muenba room_01 gate audit"
if node tests/muenba-room-gate-audit.cjs >/dev/null 2>&1; then
  ok "Muenba hunt acceptance, room gate, and dance-only control contracts pass"
else
  bad "Muenba room_01 gate audit failed"
fi

echo "[25/36] Feed Booha level audit"
if node tests/feed-level-audit.cjs >/dev/null 2>&1; then
  ok "Feed Booha geometry and timing guardrails pass"
else
  bad "Feed Booha level audit failed"
fi

# ── 10. Feed Booha playability simulation ───────────────────
echo "[26/36] Feed Booha playability simulation"
if node tests/feed-playability-audit.cjs >/dev/null 2>&1; then
  ok "Feed Booha has a simulated successful feed path for all 50 levels"
else
  bad "Feed Booha playability simulation failed"
fi

echo "[27/36] UtsuCard 20A celebration audit"
if node tests/utsu-card-celebration-audit.cjs >/dev/null 2>&1; then
  ok "UtsuCard stable celebration foundation contracts pass"
else
  bad "UtsuCard celebration audit failed"
fi

echo "[28/36] Karasuki 20B Wanderer celebration audit"
if node tests/karasuki-wanderer-celebration-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki Wanderer discovery celebration contracts pass"
else
  bad "Karasuki Wanderer celebration audit failed"
fi

echo "[29/36] Karasuki 20C return celebration audit"
if node tests/karasuki-wanderer-return-celebration-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki Wanderer return celebration contracts pass"
else
  bad "Karasuki return celebration audit failed"
fi

echo "[30/36] Karasuki 20D Nuppi furigana audit"
if node tests/karasuki-nuppi-furigana-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki Nuppi furigana contracts pass"
else
  bad "Karasuki Nuppi furigana audit failed"
fi

echo "[31/36] Karasuki 20E Observer audit"
if node tests/karasuki-observer-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki Observer upgrade contracts pass"
else
  bad "Karasuki Observer audit failed"
fi

echo "[32/36] Karasuki 20F celebration audio audit"
if node tests/karasuki-celebration-audio-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki celebration audio contracts pass"
else
  bad "Karasuki celebration audio audit failed"
fi

echo "[33/36] Karasuki 20G integration regression audit"
if node tests/karasuki-celebration-regression-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki celebration integration contracts pass"
else
  bad "Karasuki celebration integration audit failed"
fi

echo "[34/36] Karasuki 20H visual audit"
if node tests/karasuki-celebration-visual-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki celebration visual contracts pass"
else
  bad "Karasuki celebration visual audit failed"
fi

echo "[35/36] Karasuki 20I popup foreground audit"
if node tests/karasuki-popup-foreground-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki popup foreground and Nuppi contracts pass"
else
  bad "Karasuki popup foreground audit failed"
fi

echo "[36/36] Karasuki 20J Wanderer consistency audit"
if node tests/karasuki-wanderer-consistency-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki Wanderer consistency contracts pass"
else
  bad "Karasuki Wanderer consistency audit failed"
fi

echo "[37/37] Popup procedural audio audit"
if node tests/popup-sfx-audit.cjs >/dev/null 2>&1; then
  ok "shared popup and click audio contracts pass"
else
  bad "popup procedural audio audit failed"
fi

echo "[38/38] Karasuki 21A weekly Wanderer popup audit"
if node tests/karasuki-wanderer-weekly-popup-audit.cjs >/dev/null 2>&1; then
  ok "weekly Wanderer popup cadence contracts pass"
else
  bad "weekly Wanderer popup audit failed"
fi

echo "[39/39] Karasuki 21B Wanderer mobile audit"
if node tests/karasuki-wanderer-mobile-audit.cjs >/dev/null 2>&1; then
  ok "Wanderer mobile popup contracts pass"
else
  bad "Wanderer mobile popup audit failed"
fi

echo "[40/40] UtsuCard 21C celebration accessibility audit"
if node tests/utsu-card-celebration-a11y-audit.cjs >/dev/null 2>&1; then
  ok "celebration modal accessibility contracts pass"
else
  bad "celebration modal accessibility audit failed"
fi

echo "[41/41] UtsuCard 21D celebration containment audit"
if node tests/utsu-card-celebration-containment-audit.cjs >/dev/null 2>&1; then
  ok "celebration modal containment contracts pass"
else
  bad "celebration modal containment audit failed"
fi

echo "[42/42] UtsuCard 21E celebration mobile audit"
if node tests/utsu-card-celebration-mobile-audit.cjs >/dev/null 2>&1; then
  ok "celebration modal mobile contracts pass"
else
  bad "celebration modal mobile audit failed"
fi

echo "[43/43] Index 22A+22B image performance audit"
if node tests/index-performance-audit.cjs >/dev/null 2>&1; then
  ok "index WebP and asset precache contracts pass"
else
  bad "index image performance audit failed"
fi

echo "[44/44] Index 22C CSS and image hint audit"
if node tests/index-css-hints-audit.cjs >/dev/null 2>&1; then
  ok "index CSS and decoding hint contracts pass"
else
  bad "index CSS and image hint audit failed"
fi

echo "[45/45] Index 22D WebAudio SFX audit"
if node tests/index-sfx-audit.cjs >/dev/null 2>&1; then
  ok "index WebAudio button contracts pass"
else
  bad "index WebAudio SFX audit failed"
fi

echo "[46/46] Index 22E final performance/runtime audit"
if node tests/index-final-audit.cjs >/dev/null 2>&1; then
  ok "index final performance and runtime guardrails pass"
else
  bad "index final performance/runtime audit failed"
fi

echo "[47/47] Maze 23A WebP asset audit"
if node tests/maze-performance-audit.cjs >/dev/null 2>&1; then
  ok "Maze WebP asset contracts pass"
else
  bad "Maze WebP asset audit failed"
fi

echo "[48/48] Maze 23B deferred image-loading audit"
if node tests/maze-image-loading-audit.cjs >/dev/null 2>&1; then
  ok "Maze deferred image-loading contracts pass"
else
  bad "Maze deferred image-loading audit failed"
fi

echo "[49/49] Maze 23C deferred media-loading audit"
if node tests/maze-media-loading-audit.cjs >/dev/null 2>&1; then
  ok "Maze deferred media-loading contracts pass"
else
  bad "Maze deferred media-loading audit failed"
fi

echo "[50/50] Maze 23D travel audit"
if node tests/maze-travel-audit.cjs >/dev/null 2>&1; then
  ok "Maze automatic travel contracts pass"
else
  bad "Maze travel audit failed"
fi

echo "[51/51] Maze 23E arrival celebration audit"
if node tests/maze-arrival-audit.cjs >/dev/null 2>&1; then
  ok "Maze arrival celebration contracts pass"
else
  bad "Maze arrival celebration audit failed"
fi

echo "[52/52] Maze PNG retirement audit"
if node tests/png-retirement-audit.cjs >/dev/null 2>&1; then
  ok "Maze PNG retirement contracts pass"
else
  bad "Maze PNG retirement audit failed"
fi

echo "[53/53] Karasuki 24A room WebP audit"
if node tests/karasuki-room-webp-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki room WebP contracts pass"
else
  bad "Karasuki room WebP audit failed"
fi

echo "[54/54] Karasuki 24B wanderer WebP audit"
if node tests/karasuki-wanderer-webp-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki wanderer WebP contracts pass"
else
  bad "Karasuki wanderer WebP audit failed"
fi

echo "[55/55] Karasuki 24C Observer WebP audit"
if node tests/karasuki-observer-webp-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki Observer WebP contracts pass"
else
  bad "Karasuki Observer WebP audit failed"
fi

echo "[56/56] Karasuki 24D Observer dedupe audit"
if node tests/karasuki-observer-dedupe-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki Observer dedupe contracts pass"
else
  bad "Karasuki Observer dedupe audit failed"
fi

echo "[57/57] Karasuki 24E supporting-art WebP audit"
if node tests/karasuki-supporting-webp-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki supporting-art WebP contracts pass"
else
  bad "Karasuki supporting-art WebP audit failed"
fi

echo "[58/58] Karasuki 24F discovery-gold audit"
if node tests/karasuki-wanderer-discovery-gold-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki discovery-gold contracts pass"
else
  bad "Karasuki discovery-gold audit failed"
fi

echo "[59/59] Utsuroba 25A room WebP audit"
if node tests/utsuroba-room-webp-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba room WebP contracts pass"
else
  bad "Utsuroba room WebP audit failed"
fi

echo "[60/60] Utsuroba 25B drifter WebP audit"
if node tests/utsuroba-drifter-webp-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba drifter WebP contracts pass"
else
  bad "Utsuroba drifter WebP audit failed"
fi

echo "[61/61] Utsuroba 25C image-loading audit"
if node tests/utsuroba-image-loading-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba image-loading contracts pass"
else
  bad "Utsuroba image-loading audit failed"
fi

echo "[62/62] Utsuroba 25D dance WebP audit"
if node tests/utsuroba-dance-webp-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba dance WebP contracts pass"
else
  bad "Utsuroba dance WebP audit failed"
fi

echo "[63/67] Muenba 26A room WebP audit"
if node tests/muenba-room-webp-audit.cjs >/dev/null 2>&1; then
  ok "Muenba room WebP contracts pass"
else
  bad "Muenba room WebP audit failed"
fi

echo "[64/67] Muenba 26B ghost WebP audit"
if node tests/muenba-ghost-webp-audit.cjs >/dev/null 2>&1; then
  ok "Muenba ghost WebP contracts pass"
else
  bad "Muenba ghost WebP audit failed"
fi

echo "[65/67] Muenba 26C supporting-art WebP audit"
if node tests/muenba-supporting-webp-audit.cjs >/dev/null 2>&1; then
  ok "Muenba supporting-art WebP contracts pass"
else
  bad "Muenba supporting-art WebP audit failed"
fi

echo "[66/67] Muenba 26D media-loading audit"
if node tests/muenba-media-loading-audit.cjs >/dev/null 2>&1; then
  ok "Muenba media-loading contracts pass"
else
  bad "Muenba media-loading audit failed"
fi

echo "[67/67] Muenba 26F danger-audio audit"
if node tests/muenba-danger-audio-audit.cjs >/dev/null 2>&1; then
  ok "Muenba danger-audio contracts pass"
else
  bad "Muenba danger-audio audit failed"
fi

echo "[68/68] Muenba 27A orientation audit"
if node tests/muenba-orientation-audit.cjs >/dev/null 2>&1; then
  ok "Muenba orientation contracts pass"
else
  bad "Muenba orientation audit failed"
fi

echo "[69/69] Muenba 27B popup-top audit"
if node tests/muenba-popup-top-audit.cjs >/dev/null 2>&1; then
  ok "Muenba popup-top contracts pass"
else
  bad "Muenba popup-top audit failed"
fi

echo "[70/70] Muenba 27C portrait-popup audit"
if node tests/muenba-portrait-popup-audit.cjs >/dev/null 2>&1; then
  ok "Muenba portrait-popup contracts pass"
else
  bad "Muenba portrait-popup audit failed"
fi

echo "[71/71] Muenba 27D rhythm-portrait audit"
if node tests/muenba-rhythm-portrait-audit.cjs >/dev/null 2>&1; then
  ok "Muenba rhythm-portrait contracts pass"
else
  bad "Muenba rhythm-portrait audit failed"
fi

echo "[72/72] Muenba 27E landscape-return audit"
if node tests/muenba-landscape-return-audit.cjs >/dev/null 2>&1; then
  ok "Muenba landscape-return contracts pass"
else
  bad "Muenba landscape-return audit failed"
fi

echo "[73/73] Muenba 27F mobile-surface audit"
if node tests/muenba-mobile-surface-audit.cjs >/dev/null 2>&1; then
  ok "Muenba mobile-surface contracts pass"
else
  bad "Muenba mobile-surface audit failed"
fi

echo "[74/74] Muenba 27G visual-viewport audit"
if node tests/muenba-visual-viewport-audit.cjs >/dev/null 2>&1; then
  ok "Muenba visual-viewport contracts pass"
else
  bad "Muenba visual-viewport audit failed"
fi

echo "[75/75] Muenba scream asset audit"
if node tests/muenba-scream-assets-audit.cjs >/dev/null 2>&1; then
  ok "Muenba scream assets pass"
else
  bad "Muenba scream asset audit failed"
fi

echo "[76/76] Muenba scream loader audit"
if node tests/muenba-scream-loader-audit.cjs >/dev/null 2>&1; then
  ok "Muenba scream loader contracts pass"
else
  bad "Muenba scream loader audit failed"
fi

echo "[77/77] Muenba authored-scream behavior audit"
if node tests/muenba-authored-scream-behavior-audit.cjs >/dev/null 2>&1; then
  ok "Muenba authored-scream behavior contracts pass"
else
  bad "Muenba authored-scream behavior audit failed"
fi

echo "[78/78] Muenba visibility-audio audit"
if node tests/muenba-visibility-audio-audit.cjs >/dev/null 2>&1; then
  ok "Muenba visibility-audio contracts pass"
else
  bad "Muenba visibility-audio audit failed"
fi

echo "[79/79] Muenba popup-SFX audit"
if node tests/muenba-popup-sfx-audit.cjs >/dev/null 2>&1; then
  ok "Muenba popup-SFX contracts pass"
else
  bad "Muenba popup-SFX audit failed"
fi

echo "[80/80] Muenba scream loudness audit"
if node tests/muenba-scream-volume-audit.cjs >/dev/null 2>&1; then
  ok "Muenba scream loudness pass"
else
  bad "Muenba scream loudness audit failed"
fi

echo "[81/81] Grimmerglen Pass 8 audit"
if node tests/grimmerglen-pass8-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen room placement, pickup, typing, and cache contracts pass"
else
  bad "Grimmerglen Pass 8 audit failed"
fi

echo "[82/82] Grimmerglen Pass 9B audit"
if node tests/grimmerglen-pass9b-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen weekly introduction gating contracts pass"
else
  bad "Grimmerglen Pass 9B audit failed"
fi

echo "[83/83] Grimmerglen Pass 9C audit"
if node tests/grimmerglen-pass9c-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen help/tutorial/navigation contracts pass"
else
  bad "Grimmerglen Pass 9C audit failed"
fi

echo "[84/84] Grimmerglen Pass 9D audit"
if node tests/grimmerglen-pass9d-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen Marietta ordering, persistence, and weekly reset contracts pass"
else
  bad "Grimmerglen Pass 9D audit failed"
fi

echo "[85/85] Grimmerglen Pass 9E audit"
if node tests/grimmerglen-pass9e-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen weekly shortcut, world gate, and DEV coordinate contracts pass"
else
  bad "Grimmerglen Pass 9E audit failed"
fi

echo "[86/93] Grimmerglen Pass 9F memory-return audit"
if node tests/grimmerglen-pass9f-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen repeated-hint and final-memory replay contracts pass"
else
  bad "Grimmerglen Pass 9F memory-return audit failed"
fi

echo "[87/93] Grimmerglen Pass 9G pose and answer-order audit"
if node tests/grimmerglen-pass9g-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen waiting-pose and shuffled-answer contracts pass"
else
  bad "Grimmerglen Pass 9G pose and answer-order audit failed"
fi

echo "[88/93] Grimmerglen Pass 9H final-memory celebration audit"
if node tests/grimmerglen-pass9h-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen final celebration, replay, dance, and deferred-hint contracts pass"
else
  bad "Grimmerglen Pass 9H final-memory celebration audit failed"
fi

echo "[regression] Grimmerglen reload-state audit"
if node tests/grimmerglen-reload-state-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen accepted quests survive leave/reload and new weeks relock exits"
else
  bad "Grimmerglen reload-state audit failed"
fi

echo "[89/94] Grimmerglen Pass 9I leaf-vignette audit"
if node tests/grimmerglen-pass9i-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen denser small-leaf vignette and opacity-variation contracts pass"
else
  bad "Grimmerglen Pass 9I leaf-vignette audit failed"
fi

echo "[90/95] Grimmerglen Pass 9J mobile object visibility audit"
if node tests/grimmerglen-pass9j-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen mobile object viewport-safety contracts pass"
else
  bad "Grimmerglen Pass 9J mobile object visibility audit failed"
fi

echo "[90A/95] Grimmerglen Pass 1 mobile target audit"
if node tests/grimmerglen-pass1-mobile-target-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen small-device visual and touch-target contracts pass"
else
  bad "Grimmerglen Pass 1 mobile target audit failed"
fi

echo "[90B/95] Grimmerglen Pass 2 viewport audit"
if node tests/grimmerglen-pass2-viewport-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen visible-viewport sizing contracts pass"
else
  bad "Grimmerglen Pass 2 viewport audit failed"
fi

echo "[90C/95] Grimmerglen Pass 3 mobile-surface audit"
if node tests/grimmerglen-pass3-mobile-surface-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen compact popup and touch-surface contracts pass"
else
  bad "Grimmerglen Pass 3 mobile-surface audit failed"
fi

echo "[90D/95] Grimmerglen Pass 4 mobile-typing audit"
if node tests/grimmerglen-pass4-mobile-typing-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen mobile typing and keyboard contracts pass"
else
  bad "Grimmerglen Pass 4 mobile-typing audit failed"
fi

echo "[91/96] Grimmerglen Pass 10A release-entrance audit"
if node tests/grimmerglen-pass10a-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen live entrance, locked arrow, sparkle, and popup contracts pass"
else
  bad "Grimmerglen Pass 10A release-entrance audit failed"
fi

echo "[92/97] Grimmerglen Pass 10B profile-doorway audit"
if node tests/grimmerglen-pass10b-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen room_01 profile doorway and glowing G contracts pass"
else
  bad "Grimmerglen Pass 10B profile-doorway audit failed"
fi

echo "[93/98] Grimmerglen Pass 10C return-handoff audit"
if node tests/grimmerglen-pass10c-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen room_14 return-handoff contracts pass"
else
  bad "Grimmerglen Pass 10C return-handoff audit failed"
fi

echo "[weekly] Grimmerglen Pass 10D content/accessibility audit"
if node tests/grimmerglen-pass10d-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen typing furigana and Ticket station-content contracts pass"
else
  bad "Grimmerglen Pass 10D content/accessibility audit failed"
fi

echo "[weekly] Grimmerglen Pass 10E quest-visibility audit"
if node tests/grimmerglen-pass10e-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen quest-gated memories, final replay, and remaining-item cues pass"
else
  bad "Grimmerglen Pass 10E quest-visibility audit failed"
fi

echo "[weekly] Grimmerglen Pass 10F dance-lock audit"
if node tests/grimmerglen-pass10f-dance-lock-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen dance locks exits, return navigation, and profile doorway access"
else
  bad "Grimmerglen Pass 10F dance-lock audit failed"
fi

echo "[content] Grimmerglen Content Pass 1 audit"
if node tests/grimmerglen-content-pass1-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen Starter, Case, and Deep authoring records pass"
else
  bad "Grimmerglen Content Pass 1 audit failed"
fi

echo "[content] Grimmerglen Content Pass 2 wiring audit"
if node tests/grimmerglen-content-pass2-wiring-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen tiered content is wired to quest, replay, and profile surfaces"
else
  bad "Grimmerglen Content Pass 2 wiring audit failed"
fi

echo "[content] Grimmerglen Pass 3 difficulty audit"
if node tests/grimmerglen-pass3-difficulty-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen Starter, Case, and Deep difficulty progression is clear"
else
  bad "Grimmerglen Pass 3 difficulty audit failed"
fi

echo "[content] Grimmerglen Pass 4 QA audit"
if node tests/grimmerglen-pass4-qa-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen 24-tier content and answer matrix is clean"
else
  bad "Grimmerglen Pass 4 QA audit failed"
fi

echo "[content] Grimmerglen selector Pass 1 audit"
if node tests/grimmerglen-tier-selector-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen saved memory-tier selector is in the profile"
else
  bad "Grimmerglen selector Pass 1 audit failed"
fi

echo "[weekly] Grimmerglen tier-progress Pass 2 audit"
if node tests/grimmerglen-tier-progress-schema-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen Starter/Case/Deep weekly buckets migrate and reset safely"
else
  bad "Grimmerglen tier-progress Pass 2 audit failed"
fi

echo "[weekly] Grimmerglen tier-routing Pass 3 audit"
if node tests/grimmerglen-tier-routing-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen selected tier routes live content and weekly progress"
else
  bad "Grimmerglen tier-routing Pass 3 audit failed"
fi

echo "[weekly] Grimmerglen tier-profile Pass 4 audit"
if node tests/grimmerglen-tier-profile-state-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen profile shows independent weekly tier states"
else
  bad "Grimmerglen tier-profile Pass 4 audit failed"
fi

echo "[weekly] Grimmerglen tier-lifecycle Pass 5 audit"
if node tests/grimmerglen-tier-lifecycle-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen tier isolation survives reload and weekly rollover"
else
  bad "Grimmerglen tier-lifecycle Pass 5 audit failed"
fi

echo "[weekly] Grimmerglen tier-readiness Pass 6 audit"
if node tests/grimmerglen-tier-readiness-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen completed tiers recommend the next challenge without locking choice"
else
  bad "Grimmerglen tier-readiness Pass 6 audit failed"
fi

echo "[profile] Grimmerglen profile counters audit"
if node tests/grimmerglen-profile-counters-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen lifetime profile cards use plain running totals"
else
  bad "Grimmerglen profile counters audit failed"
fi

echo "[visual] Grimmerglen arrow glow audit"
if node tests/grimmerglen-arrow-glow-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen exit arrows use a stronger halo and crisp directional core"
else
  bad "Grimmerglen arrow glow audit failed"
fi

echo "[regression] Grimmerglen Pass 4 audit"
if node tests/grimmerglen-pass4-regression-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen counters, profile totals, weekly separation, and arrow glow remain intact"
else
  bad "Grimmerglen Pass 4 regression audit failed"
fi

echo "[lifetime] Grimmerglen lifetime counters audit"
if node tests/grimmerglen-lifetime-counters-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen lifetime counters migrate, increment, and survive weekly reset"
else
  bad "Grimmerglen lifetime counters audit failed"
fi

echo "[content] Grimmerglen memory-assistance audit"
if node tests/grimmerglen-memory-assistance-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen memory returns use full, partial, and hint-only assistance"
else
  bad "Grimmerglen memory-assistance audit failed"
fi

echo "[94/98] Grimmerglen navigation audit"
if node tests/grimmerglen-navigation-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen grid links, boundary arrows, and help-gated movement contracts pass"
else
  bad "Grimmerglen navigation audit failed"
fi

echo "[95/98] Calendar fifth-week audit"
if node tests/calendar-week-audit.cjs >/dev/null 2>&1; then
  ok "Calendar Sunday boundary and repeat-week occurrence contracts pass"
else
  bad "Calendar fifth-week audit failed"
fi

echo "[96/98] Weekly rollover audit"
if node tests/weekly-rollover-audit.cjs >/dev/null 2>&1; then
  ok "Occurrence-based weekly reset and permanent-state preservation pass"
else
  bad "Weekly rollover audit failed"
fi

echo "[97/98] Weekly occurrence consumer audit"
if node tests/weekly-occurrence-consumers-audit.cjs >/dev/null 2>&1; then
  ok "All weekly consumers distinguish repeated Week 4 occurrences"
else
  bad "Weekly occurrence consumer audit failed"
fi

echo "[98/98] Weekly boundary refresh audit"
if node tests/weekly-boundary-refresh-audit.cjs >/dev/null 2>&1; then
  ok "Live page-boundary rollover resets exactly once"
else
  bad "Weekly boundary refresh audit failed"
fi

echo "[weekly] Weekly replay schema audit"
if node tests/weekly-replay-schema-audit.cjs >/dev/null 2>&1; then
  ok "Occurrence-scoped world schema and lifetime preservation pass"
else
  bad "Weekly replay schema audit failed"
fi

echo "[weekly] Weekly live-refresh audit"
if node tests/weekly-live-refresh-audit.cjs >/dev/null 2>&1; then
  ok "Live weekly reset refresh contracts pass"
else
  bad "Weekly live-refresh audit failed"
fi

echo "[weekly] Utsuroba weekly replay audit"
if node tests/utsuroba-weekly-replay-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba weekly replay contracts pass"
else
  bad "Utsuroba weekly replay audit failed"
fi

echo "[weekly] Muenba weekly replay audit"
if node tests/muenba-weekly-replay-audit.cjs >/dev/null 2>&1; then
  ok "Muenba weekly replay contracts pass"
else
  bad "Muenba weekly replay audit failed"
fi

echo "[weekly] Muenba target recovery audit"
if node tests/muenba-target-recovery-audit.cjs >/dev/null 2>&1; then
  ok "Muenba accepted-hunt target recovery contracts pass"
else
  bad "Muenba target recovery audit failed"
fi

echo "[weekly] Muenba target consistency audit"
if node tests/muenba-target-consistency-audit.cjs >/dev/null 2>&1; then
  ok "Muenba Pass 6 target consistency contracts pass"
else
  bad "Muenba target consistency audit failed"
fi

echo "[weekly] Muenba profile weekly audit"
if node tests/muenba-profile-weekly-audit.cjs >/dev/null 2>&1; then
  ok "Muenba weekly versus lifetime profile labels pass"
else
  bad "Muenba profile weekly audit failed"
fi

echo "[profile] Muenba Pass A1 profile audit"
if node tests/muenba-profile-a1-audit.cjs >/dev/null 2>&1; then
  ok "Muenba compact case-record and spoiler-safe profile contracts pass"
else
  bad "Muenba Pass A1 profile audit failed"
fi

echo "[profile] Muenba Pass A2 profile audit"
if node tests/muenba-profile-a2-audit.cjs >/dev/null 2>&1; then
  ok "Muenba compact ghost-card and current-memory contracts pass"
else
  bad "Muenba Pass A2 profile audit failed"
fi

echo "[profile] Muenba Pass A3 profile audit"
if node tests/muenba-profile-a3-audit.cjs >/dev/null 2>&1; then
  ok "Muenba concise lifetime-stat and weekly-summary contracts pass"
else
  bad "Muenba Pass A3 profile audit failed"
fi

echo "[profile] Muenba world-access audit"
if node tests/muenba-profile-access-audit.cjs >/dev/null 2>&1; then
  ok "Muenba physical entrance, status, and Nuppi asset contracts pass"
else
  bad "Muenba world-access audit failed"
fi

echo "[popup] Muenba Pass B popup-shell audit"
if node tests/muenba-popup-b-audit.cjs >/dev/null 2>&1; then
  ok "Muenba single-scroll popup and responsive rhythm-shell contracts pass"
else
  bad "Muenba Pass B popup-shell audit failed"
fi

echo "[language] Muenba Pass C language-consistency audit"
if node tests/muenba-language-consistency-audit.cjs >/dev/null 2>&1; then
  ok "Muenba bilingual instructional and status contracts pass"
else
  bad "Muenba Pass C language-consistency audit failed"
fi

echo "[weekly] Muenba tier-routing audit"
if node tests/muenba-tier-routing-audit.cjs >/dev/null 2>&1; then
  ok "Muenba selected-tier completion and case routing pass"
else
  bad "Muenba tier-routing audit failed"
fi

echo "[weekly] Utsuroba profile weekly audit"
if node tests/utsuroba-profile-weekly-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba weekly versus lifetime profile labels pass"
else
  bad "Utsuroba profile weekly audit failed"
fi

echo "[weekly] Grimmerglen weekly replay audit"
if node tests/grimmerglen-weekly-replay-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen weekly replay contracts pass"
else
  bad "Grimmerglen weekly replay audit failed"
fi

echo "[weekly] Grimmerglen profile weekly audit"
if node tests/grimmerglen-profile-weekly-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen weekly versus lifetime profile labels pass"
else
  bad "Grimmerglen profile weekly audit failed"
fi

echo "[weekly] Sync weekly-world audit"
if node tests/sync-weekly-world-emptiness-audit.cjs >/dev/null 2>&1; then
  ok "Weekly world sync visibility contracts pass"
else
  bad "Sync weekly-world audit failed"
fi

echo "[service-worker] Pass 1 precache resilience audit"
if node tests/service-worker-precache-audit.cjs >/dev/null 2>&1; then
  ok "Service-worker install and runtime precache resilience contracts pass"
else
  bad "Service-worker Pass 1 precache resilience audit failed"
fi

echo "[service-worker] Pass 3 HTML/JavaScript coherence audit"
if node tests/service-worker-coherence-audit.cjs >/dev/null 2>&1; then
  ok "Service-worker JavaScript network-first coherence contracts pass"
else
  bad "Service-worker Pass 3 HTML/JavaScript coherence audit failed"
fi

echo "[transitions] Room-transition readiness audit"
if node tests/room-transition-readiness-audit.cjs >/dev/null 2>&1; then
  ok "Room-transition cache, decode-gate, and canvas-motion contracts pass"
else
  bad "Room-transition readiness audit failed"
fi

echo "[weekly] Utsuroba weekly ECHOES audit"
if node tests/utsuroba-weekly-echoes-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba lifetime/weekly ECHOES separation contracts pass"
else
  bad "Utsuroba weekly ECHOES audit failed"
fi

echo "[profile] Utsuroba physical-entry audit"
if node tests/utsuroba-profile-access-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba world gate, Karasuki route, status, and Kurobane asset contracts pass"
else
  bad "Utsuroba physical-entry profile audit failed"
fi

echo "[profile] Adventure-log Pass 1 fail-soft audit"
if node tests/adventure-log-fail-soft-audit.cjs >/dev/null 2>&1; then
  ok "Adventure-log weekly loading and error-state contracts pass"
else
  bad "Adventure-log Pass 1 fail-soft audit failed"
fi

echo "[grimmerglen/muenba] Pass 4 room memory-cache audit"
if node tests/room-memory-cache-audit.cjs >/dev/null 2>&1; then
  ok "Grimmerglen and Muenba room-cache contracts pass; Grimmerglen decode-gate contracts pass"
else
  bad "Pass 4 room memory-cache audit failed"
fi

echo "[performance] Pass 5 adaptive low-power audit"
if node tests/adaptive-low-power-audit.cjs >/dev/null 2>&1; then
  ok "Adaptive low-power, hidden-page, and static-overlay contracts pass"
else
  bad "Adaptive low-power, hidden-page, and static-overlay contracts failed"
fi

echo "[audio] Pass 4 deferred world-music audit"
if node tests/deferred-world-music-audit.cjs >/dev/null 2>&1; then
  ok "Karasuki, Utsuroba, and Happy House music-loading contracts pass"
else
  bad "Pass 4 deferred world-music audit failed"
fi

echo "[assets] Pass 3 weight audit"
if node tests/asset-weight-audit.cjs >/dev/null 2>&1; then
  ok "Unused masters, audio bitrates, and Grimmerglen room WebP weights pass"
else
  bad "Pass 3 asset-weight audit failed"
fi

echo "[profile/performance] Pass 6 hardening and budgets audit"
if node tests/pass6-hardening-budget-audit.cjs >/dev/null 2>&1; then
  ok "Profile fail-soft rendering, day-record repaint, and performance budgets pass"
else
  bad "Pass 6 profile/performance audit failed"
fi

echo "[performance] Shared runtime monitor audit"
if node tests/performance-runtime-audit.cjs >/dev/null 2>&1; then
  ok "Shared rolling monitor, 30fps low mode, overlay, and budget document contracts pass"
else
  bad "Shared performance runtime audit failed"
fi

echo "[performance] Wanderer decoded-image cache audit"
if node tests/karasuki-wanderer-cache-audit.cjs >/dev/null 2>&1 && node tests/karasuki-wanderer-cache.test.cjs >/dev/null 2>&1 && node tests/karasuki-wanderer-cache-traversal.test.cjs >/dev/null 2>&1 && node tests/adventure-performance.test.cjs >/dev/null 2>&1; then
  ok "Wanderer LRU protection/eviction and rolling performance tests pass"
else
  bad "Wanderer cache or shared performance tests failed"
fi

echo "[performance] Passes 6–7 image lifecycle audit"
if node tests/performance-image-lifecycle-audit.cjs >/dev/null 2>&1; then
  ok "Room-scoped Drifter and celebration-scoped dance image lifecycles pass"
else
  bad "Performance image lifecycle audit failed"
fi

echo "[performance] Pass 10 Maze shared-performance audit"
if node tests/maze-shared-performance-audit.cjs >/dev/null 2>&1; then
  ok "Maze shared rolling monitor, low-mode scheduler, and overlay contracts pass"
else
  bad "Maze shared-performance audit failed"
fi

echo "[assets] Performance asset-budget audit"
if node tests/performance-asset-budget-audit.cjs >/dev/null 2>&1; then
  ok "WebP container, alpha, character-size, and deployed-image payload budgets pass"
else
  bad "Performance asset-budget audit failed"
fi

# ── Summary ──────────────────────────────────────────────────
echo "───────────────────────────────────"
echo "✅ $PASS passed   ⚠️  $WARN warnings   ❌ $FAIL failed"
if [ $FAIL -gt 0 ]; then
  echo "🚫 DO NOT DEPLOY"
  exit 1
fi
echo "🚀 Safe to deploy"
exit 0
