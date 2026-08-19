# Bike Health Report — Build Spec

**Target: ~2 hours of build time · Deliverable: working web link + press release/roadmap**

## One-liner

Bike maintenance apps make you catalog 40 components before they help you.
Bike Health Report gives you a shop-ready service report in 60 seconds from
the ride data you already have, and directs you to local bike shops so it's quick
and easy to get what components you need.

## Product definition

v0: A single-page web app. No accounts, no OAuth, no backend persistence.
v1: OAuth with Strava, rides are automatically imported from Strava so 
we can calculate mileage.  
v2: Future integrations with Garmin, RideWithGPS, etc.

**V0 Flow:**
1. User drops in their Strava export `activities.csv` (or clicks "Try with
   sample data").
2. User answers 3 questions: bike type (road / gravel / MTB), riding
   conditions (mostly dry / mixed / often wet), and optional "last replaced"
   dates or mileages for chain and tires ("not sure" is a valid answer —
   default to conservative estimates).
3. App renders a Bike Health Report: overall health score, component cards
   sorted by urgency (green / due soon / overdue), plain-language explanation
   per component.
4. One-click "Shop Work Order": a print/share-formatted service checklist the
   user hands to their local bike shop.

## Why this scope

- File upload instead of API integration: Strava's API access is tightening
  and Garmin requires developer-program approval. Every user can already
  download their own archive. We depend on nothing we don't control.
- The local-bike-shop angle needs zero shop integration in v1: the work
  order is a printable artifact.

## Build milestones

- **M1 — Scaffold (20 min):** React SPA, file-drop zone, Papaparse for CSV.
  Parse only distance / moving time / date / activity type / gear columns.
  Filter to rides. Ignore GPX blobs entirely.
- **M2 — Wear engine (30 min):** Pure functions over the wear table below.
  Inputs: total miles/hours since each component's baseline + condition
  multiplier. Output per component: miles used, interval, status, one-line
  explanation. Unit-testable, no UI dependency.
- **M3 — Report UI (30 min):** Health score header, urgency-sorted component
  cards, friendly copy. Mobile-first — John will open this on his phone.
- **M4 — Shop Work Order (20 min):** Print-styled checklist view. "Show this
  to your shop." This is the differentiator moment.
- **M5 — Polish (20 min):** Empty states, error handling for weird CSVs,
  **"Try with sample data" button (non-negotiable — the reviewer must be able
  to demo without owning a Strava account)**, favicon, name.

## Wear table (v1 data — encode as a constant)

| Component        | Interval (miles) | Interval (hours) | Wet-condition multiplier | Explanation hook |
|------------------|------------------|------------------|--------------------------|------------------|
| Chain            | 2,000–2,500      | —                | 0.7×                     | "A worn chain eats your cassette — a $20 part protecting a $120 one." |
| Cassette         | 4,000–6,000 (≈2 chains) | —          | 0.75×                    | "Usually replaced with your 2nd or 3rd chain." |
| Tires (rear)     | 1,500–3,000      | —                | 0.9×                     | "Rear wears ~2× faster than front. Check for squaring-off." |
| Tires (front)    | 3,000–5,000      | —                | 0.9×                     | — |
| Brake pads (rim) | 1,500–3,000      | —                | 0.6×                     | "Wet grit is sandpaper for pads." |
| Brake pads (disc)| 3,000–6,000      | —                | 0.7×                     | — |
| Bar tape         | —                | 12 months        | —                        | "Comfort + hidden cable inspection opportunity." |
| Cables/housing (mech.) | —          | 12–24 months     | 0.8×                     | — |
| Chainrings       | 10,000–15,000    | —                | —                        | — |
| Bottom bracket   | 5,000–10,000     | —                | 0.7×                     | "Creaking? It's earlier than you think." |
| Tubeless sealant | —                | 3–4 months       | —                        | "Dries out whether you ride or not." |
| Bike fit / safety check | —         | 12 months        | —                        | Ties into the LBS work order. |

Ranges: use the midpoint for scoring; show the range in the UI. Wet
multiplier applies to the interval (shortens it).

## Cutlines — v0 says NO to (roadmap says LATER to)

Garmin CSV parsing · Apple Health / HealthKit (this is the native-app v2
headline) · accounts & saved history · email reminders · multiple bikes ·
shop inventory or booking integration · component photo recognition.

## Press release skeleton (write after M3, before M5)

1. Headline: the 60-seconds promise.
2. Problem: setup tedium of incumbents; riders default to spreadsheets or
   neglect.
3. Solution + how it works (3 steps).
4. Why local shops win: the work order turns deferred maintenance into a
   shop visit.
5. Roadmap: (a) native iOS with HealthKit + background sync — kills the
   upload step entirely; (b) Garmin/Wahoo export support; (c) shop-side
   view: let a shop receive work orders and pre-order parts.

## Claude Code session notes

- Drop this file in the repo root; point Claude at it as the source of truth.
- Plan mode first: have Claude restate M1–M5 as its plan, approve, then
  execute milestone by milestone. Review at each M boundary.
- Deploy target: Vercel or Netlify (link in under 5 minutes; custom domain
  optional but a nice touch).
- Keep the wear engine in its own module with tests — if anything gets cut
  for time, cut UI polish, never correctness of the numbers.
- Keep the tech stack to things I'm familiar with.  I suggest some flavor of 
  Python, React for most/all of the webapp.