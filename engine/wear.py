"""Wear table and pure per-component wear math.

Intervals and multipliers encode the product_spec.md wear table verbatim; the
explanation copy intentionally diverges from the spec's hooks — per product
direction it describes inspection cues (what worn looks/sounds like), not
just why the part matters. Scoring uses the midpoint
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
        "Check it with a $10 chain wear gauge — replace at 0.75% stretch. Skipping under hard pedaling means it's already eating your cassette.",
        baseline_key="chain",
    ),
    Component(
        "cassette", "Cassette", "miles", (4000, 6000), 0.75,
        "If a new chain skips under power, or the teeth look like shark fins, the cassette is done.",
    ),
    Component(
        "tires_rear", "Rear tire", "miles", (1500, 3000), 0.9,
        "Look for a squared-off center ridge, threads showing through, or flats coming more often than they used to.",
        baseline_key="tires",
    ),
    Component(
        "tires_front", "Front tire", "miles", (3000, 5000), 0.9,
        "Check for cracked, dry sidewalls and embedded glass — front grip is what holds you up in corners.",
        baseline_key="tires",
    ),
    Component(
        "brake_pads_rim", "Brake pads (rim)", "miles", (1500, 3000), 0.6,
        "Replace when the grooves in the pad face have worn smooth, or you hear grinding — embedded grit scores the rim itself.",
        bike_types=frozenset({ROAD}),
    ),
    Component(
        "brake_pads_disc", "Brake pads (disc)", "miles", (3000, 6000), 0.7,
        "Pull the wheel and sight the pads: under ~1.5 mm of material, or a metallic scrape when braking, means replace now.",
        bike_types=frozenset({GRAVEL, MTB}),
    ),
    Component(
        "bar_tape", "Bar tape", "months", (12, 12), None,
        "Shiny, torn, or slick-when-wet tape is due — and unwrapping is the only time your brake levers' cables get seen.",
        bike_types=DROP_BAR_BIKES,
    ),
    Component(
        "cables", "Cables & housing", "months", (12, 24), 0.8,
        "Shifting that stays sluggish after a barrel-adjuster tweak usually means corroded cables, not a bad derailleur.",
    ),
    Component(
        "chainrings", "Chainrings", "miles", (10000, 15000), None,
        "Shark-fin shaped teeth, or a chain that falls off the ring under load, mean the ring is worn out.",
    ),
    Component(
        "bottom_bracket", "Bottom bracket", "miles", (5000, 10000), 0.7,
        "Creaks or clicks from the crank area, or side-to-side play when you rock the crank arms by hand.",
    ),
    Component(
        "sealant", "Tubeless sealant", "months", (3, 4), None,
        "Shake the wheel and listen for sloshing — silence means it's dried out. Punctures that won't seal are the giveaway.",
        bike_types=TUBELESS_BIKES,
    ),
    Component(
        "safety_check", "Bike fit / safety check", "months", (12, 12), None,
        "Any new creak, rattle, brake rub, or numb hands you've been ignoring — a shop once-over catches what you can't.",
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
        # Full precision: status and health score derive from this, so display
        # rounding is the UI's job — rounding here made boundary cards contradict
        # their own color.
        "pct_used": pct_used,
        "status": status,
        "explanation": component.explanation,
    }


def components_for(bike_type: str) -> tuple[Component, ...]:
    if bike_type not in ALL_BIKES:
        raise ValueError(f"unknown bike type: {bike_type!r}")
    return tuple(c for c in WEAR_TABLE if bike_type in c.bike_types)
