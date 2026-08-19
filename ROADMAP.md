# Roadmap — Bike Health Report v0

Milestones from `product_spec.md` plus harness/deploy steps added during planning.
Live status is tracked in beads (`bd list`); each milestone maps to a bd issue.
A review pause with the user happens at **every** milestone boundary.

| # | Milestone | bd issue | Est. | Summary |
|---|-----------|----------|------|---------|
| M0 | Harness | — (done) | 10 min | git init, beads tracker, CLAUDE.md, .gitignore |
| M1 | Scaffold | `bikewrench-etr` | 20 min | Vite React TS app, CSV drop zone + Papaparse (date/type/distance/moving-time/gear only, rides only), FastAPI skeleton `POST /api/report` |
| M2 | Wear engine | `bikewrench-a6x` (P0) | 30 min | `engine/wear.py` WEAR_TABLE from spec + pure functions; midpoint scoring, wet multiplier shortens interval, conservative "not sure" defaults, bike-type filtering; pytest suite. **Never cut for time.** |
| M3 | Report UI | `bikewrench-3ke` | 30 min | 3-question form; health score header; urgency-sorted component cards (overdue → due soon → green) with ranges + plain-language explanations; mobile-first |
| M4 | Shop Work Order | `bikewrench-mj9` | 20 min | Print-styled checklist ("Show this to your shop"), `@media print` CSS, Print/Share button |
| — | Press release | `bikewrench-f1c` | — | `PRESS_RELEASE.md` per spec skeleton; written after M3, before M5 |
| M5 | Polish | `bikewrench-mlb` | 20 min | "Try with sample data" button (**non-negotiable**), friendly errors for weird CSVs, empty states, favicon, product name |
| — | Deploy | `bikewrench-1a2` | — | Vercel: static frontend + Python function, `/api/*` rewrite; verify live link end-to-end at phone viewport |

## Later (v1+ — out of scope for v0)

- **v1:** Strava OAuth, automatic ride import
- **v2:** Garmin / RideWithGPS / Wahoo integrations; native iOS with HealthKit + background sync; shop-side work-order view
- Explicit v0 cutlines (binding): Garmin CSV, HealthKit, accounts & saved history, email reminders, multiple bikes, shop inventory/booking integration, component photo recognition
