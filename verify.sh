
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
echo "[1/6] Content JSON validity"
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
echo "[2/6] sw.js CORE_FILES exist on disk (addAll is all-or-nothing)"
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

# ── 3. Cache version constants in sync ───────────────────────
echo "[3/6] Cache version sync (pages/assets/decks)"
versions=$(grep -oE "booha-(pages|assets|decks)-[A-Za-z0-9-]+" sw.js \
           | sed -E 's/booha-(pages|assets|decks)-//' | sort -u)
vcount=$(echo "$versions" | grep -c .)
if [ "$vcount" -eq 1 ]; then
  ok "all three caches on version: $versions"
else
  bad "cache versions out of sync: $(echo $versions | tr '\n' ' ')"
fi

# ── 4. Cache bump reminder (needs git) ───────────────────────
echo "[4/6] Cache bump vs. changed files"
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
echo "[5/6] Leading-slash paths"
ls_hits=$(grep -rnE 'src="/[^/t]|href="/[^/t]' --include="*.html" . 2>/dev/null \
          | grep -v '/the-booha-adventure/' | head -5)
if [ -z "$ls_hits" ]; then
  ok "no bad leading-slash paths"
else
  bad "leading-slash paths found:"; echo "$ls_hits" | sed 's/^/       /'
fi

# ── 6. Script order: calendar.js before core stack ───────────
echo "[6/6] calendar.js loads before core stack"
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

# ── Summary ──────────────────────────────────────────────────
echo "───────────────────────────────────"
echo "✅ $PASS passed   ⚠️  $WARN warnings   ❌ $FAIL failed"
if [ $FAIL -gt 0 ]; then
  echo "🚫 DO NOT DEPLOY"
  exit 1
fi
echo "🚀 Safe to deploy"
exit 0
