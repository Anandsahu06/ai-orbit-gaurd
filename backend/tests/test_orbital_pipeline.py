import pytest
from app.services.tle_service import tle_service
from app.services.orbital_engine import orbital_engine
from app.services.ml_risk_engine import ml_risk_engine
from app.services.conjunction_engine import conjunction_engine
from app.services.simulation_engine import simulation_engine

def test_tle_service_loads_objects():
    objects = tle_service.get_all_objects()
    assert len(objects) >= 5
    sat104 = tle_service.get_object("100104")
    assert sat104 is not None
    assert sat104["name"] == "SAT-104"

def test_orbital_propagation():
    prop = orbital_engine.propagate_position("25544") # ISS
    assert prop is not None
    assert "lat" in prop
    assert "lon" in prop
    assert -90.0 <= prop["lat"] <= 90.0
    assert -180.0 <= prop["lon"] <= 180.0
    assert 300.0 <= prop["alt_km"] <= 600.0
    assert 7.0 <= prop["velocity_kms"] <= 8.0

def test_trajectory_generation():
    traj = orbital_engine.generate_orbit_trajectory("100104", num_points=36)
    assert traj is not None
    assert len(traj.points) >= 36
    assert traj.points[0].alt_km > 300.0

def test_ml_risk_engine():
    # Critical test: miss distance 0.42 km, speed 11.8 km/s
    score, level, factors = ml_risk_engine.compute_risk_score(
        miss_distance_km=0.42,
        relative_velocity_kms=11.8,
        time_to_tca_hours=14.5
    )
    assert score >= 70.0
    assert level in ["HIGH", "CRITICAL"]
    assert len(factors) >= 3
    assert any("0.42" in f for f in factors)

def test_conjunction_screening():
    events = conjunction_engine.get_all()
    assert len(events) >= 1
    demo = events[0]
    assert demo.primary_name == "SAT-104"
    assert demo.secondary_name == "DEB-27"
    assert demo.miss_distance_km == 0.42

def test_simulation_engine():
    res = simulation_engine.simulate_maneuver(conjunction_id="CONJ-2026-0104")
    assert res is not None
    assert len(res.scenarios) == 3
    baseline = res.scenarios[0]
    scen_a = res.scenarios[1]
    scen_b = res.scenarios[2]
    
    # Verify miss distance increases after maneuver
    assert baseline.miss_distance_km < scen_a.miss_distance_km
    assert scen_a.miss_distance_km < scen_b.miss_distance_km
    # Verify risk score drops
    assert baseline.risk_score > scen_a.risk_score
    assert scen_a.risk_score > scen_b.risk_score
    assert scen_b.risk_reduction_pct > 0.0
