#!/usr/bin/env bash
# Quality gate: wear-engine tests + frontend type-check/build + API smoke test.
# Run from the repo root: ./scripts/verify.sh
set -uo pipefail
cd "$(dirname "$0")/.."

# nvm-installed node isn't on the default PATH in non-interactive shells
if ! command -v npm >/dev/null && [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  . "$NVM_DIR/nvm.sh"
fi

fail=0

step() { printf '\n== %s ==\n' "$1"; }

step "pytest (wear engine)"
if [ -d tests ] && ls tests/test_*.py >/dev/null 2>&1; then
  python3 -m pytest tests/ -q || fail=1
else
  echo "no tests yet — skipping (M2 adds them)"
fi

step "frontend build (type-check + bundle)"
(cd frontend && npm run build --silent) || fail=1

step "API smoke test"
PORT=8123
lsof -ti ":$PORT" | xargs kill 2>/dev/null
python3 -m uvicorn api.index:app --port "$PORT" >/dev/null 2>&1 &
API_PID=$!
sleep 2
BODY='{"rides":[{"date":"2026-08-01","miles":25.5,"hours":1.7}],"bike_type":"road","conditions":"mixed"}'
RESP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "localhost:$PORT/api/report" \
  -H 'Content-Type: application/json' -d "$BODY")
kill "$API_PID" 2>/dev/null
if [ "$RESP" = "200" ]; then
  echo "POST /api/report -> 200 OK"
else
  echo "POST /api/report -> $RESP (expected 200)"
  fail=1
fi

printf '\n'
if [ "$fail" -eq 0 ]; then
  echo "VERIFY: ALL GREEN"
else
  echo "VERIFY: FAILED"
fi
exit "$fail"
