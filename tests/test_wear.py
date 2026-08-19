"""Wear-engine correctness tests — the never-cut item."""

import pytest

from engine import wear
from engine.report import build_report, miles_since, months_between


def get(key):
    return next(c for c in wear.WEAR_TABLE if c.key == key)


def ride(date, miles, hours=1.0):
    return {"date": date, "miles": miles, "hours": hours}


class TestWearTable:
    def test_spec_intervals_encoded_verbatim(self):
        assert get("chain").interval == (2000, 2500)
        assert get("cassette").interval == (4000, 6000)
        assert get("tires_rear").interval == (1500, 3000)
        assert get("tires_front").interval == (3000, 5000)
        assert get("brake_pads_rim").interval == (1500, 3000)
        assert get("brake_pads_disc").interval == (3000, 6000)
        assert get("bar_tape").interval == (12, 12)
        assert get("cables").interval == (12, 24)
        assert get("chainrings").interval == (10000, 15000)
        assert get("bottom_bracket").interval == (5000, 10000)
        assert get("sealant").interval == (3, 4)
        assert get("safety_check").interval == (12, 12)

    def test_spec_wet_multipliers_encoded_verbatim(self):
        assert get("chain").wet_multiplier == 0.7
        assert get("cassette").wet_multiplier == 0.75
        assert get("tires_rear").wet_multiplier == 0.9
        assert get("tires_front").wet_multiplier == 0.9
        assert get("brake_pads_rim").wet_multiplier == 0.6
        assert get("brake_pads_disc").wet_multiplier == 0.7
        assert get("cables").wet_multiplier == 0.8
        assert get("bottom_bracket").wet_multiplier == 0.7
        for key in ("bar_tape", "chainrings", "sealant", "safety_check"):
            assert get(key).wet_multiplier is None


class TestConditionMultiplier:
    def test_dry_is_identity(self):
        assert wear.condition_multiplier(get("chain"), wear.DRY) == 1.0

    def test_wet_uses_table_value(self):
        assert wear.condition_multiplier(get("chain"), wear.WET) == 0.7

    def test_mixed_is_halfway(self):
        assert wear.condition_multiplier(get("chain"), wear.MIXED) == pytest.approx(0.85)

    def test_no_multiplier_components_ignore_conditions(self):
        assert wear.condition_multiplier(get("sealant"), wear.WET) == 1.0

    def test_unknown_conditions_raise(self):
        with pytest.raises(ValueError):
            wear.condition_multiplier(get("chain"), "monsoon")

    def test_wet_shortens_interval(self):
        dry_lo, dry_hi = wear.effective_interval(get("chain"), wear.DRY)
        wet_lo, wet_hi = wear.effective_interval(get("chain"), wear.WET)
        assert (dry_lo, dry_hi) == (2000, 2500)
        assert (wet_lo, wet_hi) == (pytest.approx(1400), pytest.approx(1750))


class TestComponentStatus:
    def test_scoring_uses_midpoint(self):
        # chain dry midpoint = 2250
        result = wear.component_status(get("chain"), 2250, wear.DRY)
        assert result["pct_used"] == pytest.approx(1.0)
        assert result["status"] == wear.OVERDUE

    def test_range_shown_not_midpoint(self):
        result = wear.component_status(get("chain"), 100, wear.DRY)
        assert result["interval_lo"] == 2000
        assert result["interval_hi"] == 2500

    def test_green_below_threshold(self):
        # 2250 * 0.75 = 1687.5; just under stays green
        result = wear.component_status(get("chain"), 1687, wear.DRY)
        assert result["status"] == wear.GREEN

    def test_due_soon_at_threshold(self):
        result = wear.component_status(get("chain"), 1688, wear.DRY)
        assert result["status"] == wear.DUE_SOON

    def test_overdue_at_midpoint(self):
        result = wear.component_status(get("chain"), 2251, wear.DRY)
        assert result["status"] == wear.OVERDUE

    def test_wet_makes_same_miles_more_worn(self):
        dry = wear.component_status(get("chain"), 1600, wear.DRY)
        wet = wear.component_status(get("chain"), 1600, wear.WET)
        assert dry["status"] == wear.GREEN
        assert wet["status"] == wear.OVERDUE  # 1600 / (2250*0.7=1575) > 1

    def test_time_based_component(self):
        result = wear.component_status(get("sealant"), 3.5, wear.DRY)
        assert result["unit"] == "months"
        assert result["pct_used"] == pytest.approx(1.0)


class TestBikeTypeFiltering:
    def road(self):
        return {c.key for c in wear.components_for("road")}

    def test_road_gets_rim_pads_and_bar_tape_no_sealant(self):
        keys = self.road()
        assert "brake_pads_rim" in keys
        assert "brake_pads_disc" not in keys
        assert "bar_tape" in keys
        assert "sealant" not in keys

    def test_gravel_gets_disc_pads_bar_tape_and_sealant(self):
        keys = {c.key for c in wear.components_for("gravel")}
        assert "brake_pads_disc" in keys
        assert "brake_pads_rim" not in keys
        assert "bar_tape" in keys
        assert "sealant" in keys

    def test_mtb_gets_disc_pads_sealant_no_bar_tape(self):
        keys = {c.key for c in wear.components_for("mtb")}
        assert "brake_pads_disc" in keys
        assert "brake_pads_rim" not in keys
        assert "bar_tape" not in keys
        assert "sealant" in keys

    def test_unknown_bike_type_raises(self):
        with pytest.raises(ValueError):
            wear.components_for("recumbent")


class TestBaselines:
    RIDES = [
        ride("2026-01-01", 500),
        ride("2026-03-01", 500),
        ride("2026-06-01", 500),
    ]

    def test_miles_since_none_is_total(self):
        assert miles_since(self.RIDES, None) == 1500

    def test_miles_since_date_filters(self):
        assert miles_since(self.RIDES, "2026-02-01") == 1000

    def test_months_between(self):
        assert months_between("2026-01-01", "2026-01-31") == pytest.approx(30 / 30.44)

    def test_not_sure_default_is_conservative(self):
        report = build_report(self.RIDES, "road", "dry")
        chain = next(c for c in report["cards"] if c["key"] == "chain")
        assert chain["used"] == 1500  # full history

    def test_chain_miles_ago_baseline(self):
        report = build_report(
            self.RIDES, "road", "dry", baselines={"chain_miles_ago": 200}
        )
        chain = next(c for c in report["cards"] if c["key"] == "chain")
        assert chain["used"] == 200

    def test_chain_date_baseline(self):
        report = build_report(
            self.RIDES, "road", "dry", baselines={"chain_date": "2026-02-01"}
        )
        chain = next(c for c in report["cards"] if c["key"] == "chain")
        assert chain["used"] == 1000

    def test_tires_baseline_covers_both_tires(self):
        report = build_report(
            self.RIDES, "road", "dry", baselines={"tires_miles_ago": 300}
        )
        for key in ("tires_rear", "tires_front"):
            card = next(c for c in report["cards"] if c["key"] == key)
            assert card["used"] == 300

    def test_baseline_does_not_leak_to_other_components(self):
        report = build_report(
            self.RIDES, "road", "dry", baselines={"chain_miles_ago": 0}
        )
        cassette = next(c for c in report["cards"] if c["key"] == "cassette")
        assert cassette["used"] == 1500


class TestReport:
    RIDES = [ride("2025-06-01", 1000), ride("2026-06-01", 1000)]

    def test_cards_sorted_by_urgency(self):
        report = build_report(self.RIDES, "road", "dry")
        statuses = [c["status"] for c in report["cards"]]
        order = {"overdue": 0, "due_soon": 1, "green": 2}
        assert statuses == sorted(statuses, key=order.__getitem__)

    def test_within_status_sorted_by_pct_desc(self):
        report = build_report(self.RIDES, "road", "dry")
        for a, b in zip(report["cards"], report["cards"][1:]):
            if a["status"] == b["status"]:
                assert a["pct_used"] >= b["pct_used"]

    def test_time_components_use_history_span(self):
        report = build_report(self.RIDES, "road", "dry")
        tape = next(c for c in report["cards"] if c["key"] == "bar_tape")
        assert tape["used"] == pytest.approx(365 / 30.44, abs=0.1)

    def test_health_score_bounds(self):
        fresh = build_report([ride("2026-06-01", 10)], "road", "dry")
        assert 0 <= fresh["health_score"] <= 100
        assert fresh["health_score"] > 90
        thrashed = build_report(
            [ride("2015-01-01", 10000), ride("2026-06-01", 10000)], "road", "wet"
        )
        assert thrashed["health_score"] < 20

    def test_as_of_extends_time_wear(self):
        base = build_report(self.RIDES, "road", "dry")
        later = build_report(self.RIDES, "road", "dry", as_of="2027-06-01")
        tape_base = next(c for c in base["cards"] if c["key"] == "bar_tape")
        tape_later = next(c for c in later["cards"] if c["key"] == "bar_tape")
        assert tape_later["used"] > tape_base["used"]

    def test_empty_rides_raise(self):
        with pytest.raises(ValueError):
            build_report([], "road", "dry")

    def test_wet_lowers_score(self):
        dry = build_report(self.RIDES, "road", "dry")
        wet = build_report(self.RIDES, "road", "wet")
        assert wet["health_score"] < dry["health_score"]


class TestReviewFixes:
    """Regressions from the post-M2 code review."""

    def test_pct_used_full_precision_matches_status(self):
        # Raw ratio 1687/2250 rounds to 0.75 but must stay green (< 0.75).
        result = wear.component_status(get("chain"), 1687, wear.DRY)
        assert result["pct_used"] < 0.75
        assert result["status"] == wear.GREEN
        # Just under the midpoint must not round up to a "100% but due_soon" card.
        result = wear.component_status(get("chain"), 2249, wear.DRY)
        assert result["pct_used"] < 1.0
        assert result["status"] == wear.DUE_SOON

    def test_datetime_ride_dates_accepted_everywhere(self):
        rides = [
            ride("2026-01-01", 500),
            ride("2026-03-05T09:00:00", 500),
            ride("2026-06-01", 500),
        ]
        # No baselines: must not depend on which answers were given.
        report = build_report(rides, "road", "dry")
        assert report["first_ride"] == "2026-01-01"
        assert report["total_miles"] == 1500
        # Same data with a date baseline must behave identically.
        with_baseline = build_report(
            rides, "road", "dry", baselines={"chain_date": "2026-02-01"}
        )
        chain = next(c for c in with_baseline["cards"] if c["key"] == "chain")
        assert chain["used"] == 1000

    def test_bad_ride_date_fails_fast_regardless_of_answers(self):
        rides = [ride("not-a-date", 500)]
        with pytest.raises(ValueError):
            build_report(rides, "road", "dry")

    def test_bike_date_excludes_previous_bikes_rides(self):
        rides = [
            ride("2016-08-01", 10000),  # old bike
            ride("2026-06-01", 100),  # this bike
        ]
        report = build_report(
            rides, "road", "dry", baselines={"bike_date": "2026-01-01"}
        )
        assert report["total_miles"] == 100
        assert report["first_ride"] == "2026-06-01"
        # Time-based wear starts at the new bike's first ride, not 2016.
        tape = next(c for c in report["cards"] if c["key"] == "bar_tape")
        assert tape["used"] < 12

    def test_bike_date_after_all_rides_raises(self):
        with pytest.raises(ValueError):
            build_report(
                [ride("2026-01-01", 100)], "road", "dry",
                baselines={"bike_date": "2027-01-01"},
            )
