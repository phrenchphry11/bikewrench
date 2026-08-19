# Bike Health Report

A shop-ready bike service report in 60 seconds, from the ride data you already
have. Live at **https://bikewrench.vercel.app**.

Drop in a Strava export (or connect your Strava account), answer a few quick
questions, and get an overall health score, urgency-sorted component wear
cards with inspection cues, and a printable **Shop Work Order** to hand to
your local bike shop.

No accounts, no stored data: CSV parsing happens in the browser, Strava
tokens live only in your tab's sessionStorage, and the backend computes
reports statelessly.

## Documentation map

- `product_spec.md` — product source of truth (v0 scope and cutlines)
- `ROADMAP.md` — every milestone, its beads issue, and what's next
- `PRESS_RELEASE.md` — the product story
- `AGENTS.md` / `CLAUDE.md` — instructions for AI coding agents (beads
  workflow, conventions, quality gates)

## Development

```bash
# Backend (FastAPI, Python 3.11+)
pip install -r requirements.txt
uvicorn api.index:app --reload          # http://localhost:8000

# Frontend (Vite + React + TypeScript)
cd frontend
npm install
npm run dev                              # http://localhost:5173, proxies /api

# Quality gate — run before any commit that touches code
./scripts/verify.sh                      # pytest + vitest + build + API smoke
```

Issue tracking uses [beads](https://github.com/gastownhall/beads): `bd ready`
to find work, `bd prime` for the full workflow.

## Environment variables

Strava import is optional — without these the Connect button hides and the
CSV path still works:

| Variable | Where | Notes |
|---|---|---|
| `STRAVA_CLIENT_ID` | Vercel env / shell | Public app ID from strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | Vercel env / shell | Never commit or log; server-side only |

The Strava app's **Authorization Callback Domain** must match the domain the
frontend is served from (`localhost` is always allowed for dev).

## Architecture

- `frontend/` — SPA; parses `activities.csv` client-side (Papaparse) or pulls
  rides from the Strava API, then POSTs compact ride summaries to the backend
- `api/index.py` — FastAPI entrypoint; `POST /api/report` runs the wear
  engine; serves the built SPA on Vercel (single-function model)
- `api/strava.py` — OAuth code/token exchange (the only place the client
  secret is used)
- `engine/` — pure-Python wear engine encoding the spec's wear table;
  midpoint scoring, wet-condition multipliers, conservative defaults
- `tests/` + `frontend/src/**/*.test.ts` — pytest and vitest suites

Deploy: single Vercel project (`vercel --prod`); static frontend built by
`vercel.json`'s buildCommand, FastAPI mounted as the site-wide function.
