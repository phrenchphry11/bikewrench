---
name: verify
description: Run the project quality gate — wear-engine pytest, frontend type-check/build, and an API smoke test. Use at every milestone boundary and before closing any bd issue that touched code.
---

Run the quality gate script from the repo root:

```bash
./scripts/verify.sh
```

It runs three checks and prints `VERIFY: ALL GREEN` on success (exit 0):

1. `pytest tests/` — wear-engine unit tests (skipped with a note until M2 adds them)
2. `cd frontend && npm run build` — TypeScript type-check + production bundle
3. Boots `api.index:app` on port 8123 and POSTs a sample payload to `/api/report`, expecting 200

If any step fails, the script prints `VERIFY: FAILED` and exits non-zero. Fix the failure and re-run until green before closing the bd issue or reporting a milestone complete. Report the result (green or the failing step's output) to the user at each milestone gate.
