"""Wear table and pure per-component wear math.

Encodes the wear table from product_spec.md verbatim. Scoring uses the midpoint
of each interval range; the UI shows the range. The wet-condition multiplier
shortens the interval (dry = 1.0, wet = table value, mixed = halfway between).
No I/O anywhere in this module.
"""

from dataclasses import dataclass

# Bike types
ROAD = "road"
GRAVEL = "gravel"
MTB = "mtb"
ALL_BIKES = frozenset({ROAD, GRAVEL, MTB})
DROP_BAR_BIKES = frozenset({ROAD, GRAVEL})  # bar tape
TUBELESS_BIKES = frozenset({GRAVEL, MTB})  # tubeless sealant by default

# Conditions
DRY = "dry"
MIXED = "mixed"
WET = "wet"
CONDITIONS = (DRY, MIXED, WET)

# Statuses
GREEN = "green"
DUE_SOON = "due_soon"
OVERDUE = "overdue"

DUE_SOON_THRESHOLD = 0.75  # fraction of the (condition-adjusted) midpoint


@dataclass(frozen=True)
class Component:
    key: str
    label: str
    unit: str  # "miles" | "months"
    interval: tuple[float, float]  # (lo, hi); lo == hi for single-value intervals
    wet_multiplier: float | None  # None = conditions don't affect this part
    explanation: str
    bike_types: frozenset[str] = ALL_BIKES
    baseline_key: str | None = None  # user-suppliable "last replaced" baseline


# v0 assumption (no brake-type question in the 3-question flow):
# road bikes get rim-pad intervals, gravel/MTB get disc-pad intervals.
WEAR_TABLE: tuple[Component, ...] = (
    Component(
        "chain", "Chain", "miles", (2000, 2500), 0.7,
        "A worn chain eats your cassette — a $20 part protecting a $120 one.",
        baseline_key="chain",
    ),
    Component(
        "cassette", "Cassette", "miles", (4000, 6000), 0.75,
        "Usually replaced with your 2nd or 3rd chain.",
    ),
    Component(
        "tires_rear", "Rear tire", "miles", (1500, 3000), 0.9,
        "Rear wears ~2× faster than front. Check for squaring-off.",
        baseline_key="tires",
    ),
    Component(
        "tires_front", "Front tire", "miles", (3000, 5000), 0.9,
        "Front tires last roughly twice as long as rears.",
        baseline_key="tires",
    ),
    Component(
        "brake_pads_rim", "Brake pads (rim)", "miles", (1500, 3000), 0.6,
        "Wet grit is sandpaper for pads.",
        bike_types=frozenset({ROAD}),
    ),
    Component(
        "brake_pads_disc", "Brake pads (disc)", "miles", (3000, 6000), 0.7,
        "Disc pads wear faster in gritty, wet riding.",
        bike_types=frozenset({GRAVEL, MTB}),
    ),
    Component(
        "bar_tape", "Bar tape", "months", (12, 12), None,
        "Comfort + hidden cable inspection opportunity.",
        bike_types=DROP_BAR_BIKES,
    ),
    Component(
        "cables", "Cables & housing", "months", (12, 24), 0.8,
        "Sluggish shifting is usually cables, not the derailleur.",
    ),
    Component(
        "chainrings", "Chainrings", "miles", (10000, 15000), None,
        "Chainrings outlast several chains and cassettes.",
    ),
    Component(
        "bottom_bracket", "Bottom bracket", "miles", (5000, 10000), 0.7,
        "Creaking? It's earlier than you think.",
    ),
    Component(
        "sealant", "Tubeless sealant", "months", (3, 4), None,
        "Dries out whether you ride or not.",
        bike_types=TUBELESS_BIKES,
    ),
    Component(
        "safety_check", "Bike fit / safety check", "months", (12, 12), None,
        "An annual once-over at your local shop catches what you can't.",
    ),
)


def condition_multiplier(component: Component, conditions: str) -> float:
    """1.0 for dry, the table's wet multiplier for wet, halfway for mixed."""
    if conditions not in CONDITIONS:
        raise ValueError(f"unknown conditions: {conditions!r}")
    if component.wet_multiplier is None or conditions == DRY:
        return 1.0
    if conditions == WET:
        return component.wet_multiplier
    return (1.0 + component.wet_multiplier) / 2


def effective_interval(component: Component, conditions: str) -> tuple[float, float]:
    """Interval range shortened by the condition multiplier."""
    mult = condition_multiplier(component, conditions)
    lo, hi = component.interval
    return (lo * mult, hi * mult)


def component_status(component: Component, used: float, conditions: str) -> dict:
    """Wear assessment for one component.

    `used` is miles or months (matching component.unit) since the part's
    baseline. Scoring divides by the midpoint of the condition-adjusted range.
    """
    lo, hi = effective_interval(component, conditions)
    midpoint = (lo + hi) / 2
    pct_used = used / midpoint
    if pct_used >= 1.0:
        status = OVERDUE
    elif pct_used >= DUE_SOON_THRESHOLD:
        status = DUE_SOON
    else:
        status = GREEN
    return {
        "key": component.key,
        "label": component.label,
        "unit": component.unit,
        "used": round(used, 1),
        "interval_lo": round(lo),
        "interval_hi": round(hi),
        "pct_used": round(pct_used, 3),
        "status": status,
        "explanation": component.explanation,
    }


def components_for(bike_type: str) -> tuple[Component, ...]:
    if bike_type not in ALL_BIKES:
        raise ValueError(f"unknown bike type: {bike_type!r}")
    return tuple(c for c in WEAR_TABLE if bike_type in c.bike_types)
