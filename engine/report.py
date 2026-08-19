"""Assemble the full Bike Health Report from rides + answers. Pure, no I/O."""

from datetime import date

from engine import wear

DAYS_PER_MONTH = 30.44

_STATUS_ORDER = {wear.OVERDUE: 0, wear.DUE_SOON: 1, wear.GREEN: 2}


def _parse_date(s: str) -> date:
    return date.fromisoformat(s)


def miles_since(rides: list[dict], baseline_date: str | None) -> float:
    """Total ride miles on/after baseline_date (all miles if None)."""
    if baseline_date is None:
        return sum(r["miles"] for r in rides)
    cutoff = _parse_date(baseline_date)
    return sum(r["miles"] for r in rides if _parse_date(r["date"]) >= cutoff)


def months_between(start: str, end: str) -> float:
    return max((_parse_date(end) - _parse_date(start)).days, 0) / DAYS_PER_MONTH


def _miles_used(component: wear.Component, rides: list[dict], baselines: dict) -> float:
    """Miles on this component. User baselines apply to chain/tires; everything
    else conservatively assumes no replacement during the ride history."""
    if component.baseline_key:
        miles_ago = baselines.get(f"{component.baseline_key}_miles_ago")
        if miles_ago is not None:
            return float(miles_ago)
        baseline_date = baselines.get(f"{component.baseline_key}_date")
        if baseline_date is not None:
            return miles_since(rides, baseline_date)
    return miles_since(rides, None)


def build_report(
    rides: list[dict],
    bike_type: str,
    conditions: str,
    baselines: dict | None = None,
    as_of: str | None = None,
) -> dict:
    """rides: [{date: ISO str, miles: float, hours: float}], must be non-empty.

    baselines keys (all optional): chain_miles_ago, chain_date,
    tires_miles_ago, tires_date. Missing = "not sure" = conservative
    (component assumed as old as the whole ride history).
    """
    if not rides:
        raise ValueError("rides must be non-empty")
    baselines = baselines or {}

    first_ride = min(r["date"] for r in rides)
    last_ride = max(r["date"] for r in rides)
    now = as_of or last_ride
    total_miles = sum(r["miles"] for r in rides)
    history_months = months_between(first_ride, now)

    cards = []
    for component in wear.components_for(bike_type):
        if component.unit == "miles":
            used = _miles_used(component, rides, baselines)
        else:
            used = history_months
        cards.append(wear.component_status(component, used, conditions))

    cards.sort(key=lambda c: (_STATUS_ORDER[c["status"]], -c["pct_used"]))

    # Health per component: 1.0 fresh, 0.0 at/after the service point.
    health = [max(0.0, 1.0 - c["pct_used"]) for c in cards]
    score = round(100 * sum(health) / len(health))

    return {
        "health_score": score,
        "bike_type": bike_type,
        "conditions": conditions,
        "total_miles": round(total_miles, 1),
        "ride_count": len(rides),
        "first_ride": first_ride,
        "last_ride": last_ride,
        "cards": cards,
    }
