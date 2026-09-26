import pytest
from app.services.simulation_engine import simulation_engine
from app.services.conjunction_engine import conjunction_engine

def test_avoidance_simulation_scenarios():
    events = conjunction_engine.get_all()
    assert len(events) > 0
    test_id = events[0].id

    res = simulation_engine.simulate_maneuver(
        conjunction_id=test_id,
        custom_delta_v_ms=20.0,
        custom_direction="RETROGRADE",
        custom_timing_hours=6.0
    )

    assert res is not None
    assert len(res.scenarios) >= 3
    baseline = res.scenarios[0]
    assert baseline.delta_v_ms == 0.0
    assert baseline.scenario_id == "SCEN-0"

    # Verify that a custom maneuver increases miss distance and reduces risk
    custom = [s for s in res.scenarios if s.scenario_id == "SCEN-CUSTOM"]
    assert len(custom) == 1
    assert custom[0].miss_distance_km >= baseline.miss_distance_km
    assert custom[0].risk_reduction_pct >= 0.0
    assert "Physics-inspired prototype simulation" in res.simulation_notes
