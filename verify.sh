
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
echo "[1/20] Content JSON validity"
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
echo "[2/20] sw.js CORE_FILES exist on disk (addAll is all-or-nothing)"
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
echo "[3/20] Independent cache version validation"
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
echo "[4/20] Cache bump vs. changed files"
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
echo "[5/20] Leading-slash paths"
ls_hits=$(grep -rnE 'src="/[^/t]|href="/[^/t]' --include="*.html" . 2>/dev/null \
          | grep -v '/the-booha-adventure/' | head -5)
if [ -z "$ls_hits" ]; then
  ok "no bad leading-slash paths"
else
  bad "leading-slash paths found:"; echo "$ls_hits" | sed 's/^/       /'
fi

# ── 6. Script order: calendar.js before core stack ───────────
echo "[6/20] calendar.js loads before core stack"
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
echo "[7/20] juku.json content checks"
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
echo "[8/20] Utsuroba episode audit"
if node tests/utsuroba-episode-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba episode data and answer contracts pass"
else
  bad "Utsuroba episode audit failed"
fi

echo "[9/20] Utsuroba resolver audit"
if node tests/utsuroba-resolver-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba Starter/Case/Deep runtime resolution contracts pass"
else
  bad "Utsuroba resolver audit failed"
fi

echo "[10/20] Utsuroba memory progress audit"
if node tests/utsuroba-memory-progress-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba Start/Fresh/Deep progress contracts pass"
else
  bad "Utsuroba memory progress audit failed"
fi

echo "[11/20] Utsuroba journal audit"
if node tests/utsuroba-journal-audit.cjs >/dev/null 2>&1; then
  ok "Utsuroba reading journal contracts pass"
else
  bad "Utsuroba journal audit failed"
fi

echo "[12/20] Muenba case audit"
if node tests/muenba-case-audit.cjs >/dev/null 2>&1; then
  ok "Muenba case order and English-only record contracts pass"
else
  bad "Muenba case audit failed"
fi

echo "[13/20] Muenba reading-lock audit"
if node tests/muenba-reading-lock-audit.cjs >/dev/null 2>&1; then
  ok "Muenba reading lock, review, penalty, and rhythm handoff contracts pass"
else
  bad "Muenba reading-lock audit failed"
fi

echo "[14/20] Muenba popup audit"
if node tests/muenba-popup-audit.cjs >/dev/null 2>&1; then
  ok "Muenba popup top anchoring and scroll-reset contracts pass"
else
  bad "Muenba popup audit failed"
fi

echo "[15/20] Muenba memory progress audit"
if node tests/muenba-memory-progress-audit.cjs >/dev/null 2>&1; then
  ok "Muenba memory migration and per-mode progress contracts pass"
else
  bad "Muenba memory progress audit failed"
fi

echo "[16/20] Muenba navigation audit"
if node tests/muenba-navigation-audit.cjs >/dev/null 2>&1; then
  ok "Muenba room entry and arrow reveal contracts pass"
else
  bad "Muenba navigation audit failed"
fi

echo "[17/20] Muenba ghost audit"
if node tests/muenba-ghost-audit.cjs >/dev/null 2>&1; then
  ok "Muenba ghost tension and carried-energy behavior pass"
else
  bad "Muenba ghost audit failed"
fi

echo "[18/20] Muenba audio audit"
if node tests/muenba-audio-audit.cjs >/dev/null 2>&1; then
  ok "Muenba audio assets and playback contracts pass"
else
  bad "Muenba audio audit failed"
fi

echo "[19/20] Feed Booha level audit"
if node tests/feed-level-audit.cjs >/dev/null 2>&1; then
  ok "Feed Booha geometry and timing guardrails pass"
else
  bad "Feed Booha level audit failed"
fi

# ── 10. Feed Booha playability simulation ───────────────────
echo "[20/20] Feed Booha playability simulation"
if node tests/feed-playability-audit.cjs >/dev/null 2>&1; then
  ok "Feed Booha has a simulated successful feed path for all 50 levels"
else
  bad "Feed Booha playability simulation failed"
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
