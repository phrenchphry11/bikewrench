# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Source of Truth

`product_spec.md` in the repo root is the product source of truth (Bike Health Report v0).
Its cutlines are binding: no Garmin CSV, no HealthKit, no accounts/history, no email
reminders, no multiple bikes, no shop integrations, no photo recognition, no Strava
OAuth in v0.

## Build & Test

```bash
pip install -r requirements.txt   # fastapi, uvicorn, pytest
pytest tests/                     # wear engine tests — must be green before UI work
uvicorn api.index:app --reload    # backend on :8000

cd frontend
npm install
npm run dev                       # Vite dev server, proxies /api → localhost:8000
npm run build                     # production build (also type-checks)
```

## Architecture Overview

- `frontend/` — Vite + React + TypeScript SPA. Parses the Strava `activities.csv`
  client-side with Papaparse (only date / type / distance / moving time / gear
  columns; GPX blobs ignored), then POSTs compact ride summaries to the API.
- `api/index.py` — FastAPI app (Vercel Python serverless entrypoint). `POST /api/report`
  takes `{rides, bikeType, conditions, baselines}` and returns the report JSON.
- `engine/` — pure-Python wear engine: `wear.py` (WEAR_TABLE constant from the spec's
  wear table + pure functions), `report.py` (health score, urgency-sorted cards).
  No I/O, fully unit-tested in `tests/`.
- Deploy: single Vercel project — static frontend build + Python function.

## Conventions & Patterns

- **Wear-engine correctness is never cut.** If time runs short, cut UI polish, never
  the numbers or their tests. Scoring uses the midpoint of each interval range; the UI
  shows the range; wet-condition multipliers shorten the interval.
- **Milestone review gates:** pause at every milestone boundary (M0–M5 and deploy),
  summarize what was built and how it was verified, and wait for the user's go-ahead.
- Track all work as bd issues; close an issue only after its verification step passes.
- No git remote is configured yet, so the beads "push to remote" session rule applies
  only once a remote exists; until then, committing locally completes a session.
- "Try with sample data" must always work — the reviewer demos without a Strava account.
