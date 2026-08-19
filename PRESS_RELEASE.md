# Bike Health Report: a shop-ready service report in 60 seconds

**Drop in the ride data you already have. Get a health score, a plain-language wear report, and a work order your local bike shop can act on - before you're stranded on the side of the road with a flat tire.**

## The problem

Bike maintenance apps make you do the maintenance before the maintenance: they
ask you to catalog every component — chain, cassette, tires, pads, bearings —
before they'll tell you anything useful. Most riders never finish the setup.
They fall back to a spreadsheet, a guess, or nothing at all, and find out about
a worn chain when it's already eaten a $120 cassette. The data that could have
warned them — every mile, every ride — was sitting in Strava the whole time.

## The solution

Bike Health Report turns that existing ride data into answers in three steps:

1. **Drop in your Strava export** — the `activities.csv` every Strava account
   can already download. No sign-up, no OAuth, no waiting.
2. **Answer a few quick questions** — what kind of bike, what conditions you ride in,
   and (if you happen to know) when the chain or tires were last replaced.
   "Not sure" is a fine answer.
3. **Get your report** — an overall health score and a card for every wearing
   component, sorted by urgency, each with the mileage evidence and a
   plain-language reason why it matters.

Wear estimates come from published service intervals, adjusted for your actual
mileage and riding conditions — wet-weather riding shortens component life, and
the report knows it.

## Why local bike shops win

The report's final step is the differentiator: a one-click **Shop Work Order** —
a printable checklist addressed to the mechanic, grouping what's likely due now
and what to check while the bike is in the stand, with the rider's mileage as
evidence and a notes line for the shop's own findings. Deferred maintenance
becomes a shop visit with a concrete parts list, instead of a vague "can you
look it over?" Riders get ahead of expensive failures; shops get customers who
walk in knowing what they need.

## What's next

- **Native iOS app with HealthKit and background sync** — your report stays
  current automatically, killing the upload step entirely.
- **Garmin and Wahoo export support** — the same 60-second report for riders
  who don't use Strava.
- **Shop-side view** — let a shop receive work orders ahead of the visit and
  have parts on the bench before the bike arrives.

---

*Bike Health Report runs in the browser. No account, no stored data — your
rides go in, your report comes out.*
