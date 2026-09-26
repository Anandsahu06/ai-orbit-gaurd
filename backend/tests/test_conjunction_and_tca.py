import pytest
from datetime import datetime, timezone, timedelta
from app.services.conjunction_engine import (
    conjunction_engine, compute_apogee_perigee, golden_section_tca_refinement
)
from app.services.orbital_engine import satrec_from_orbital_element
from app.services.data_ingestion.provider import NormalizedOrbitalRecord

def test_apogee_perigee_computation():
    # Mean motion 15.5 rev/day, circular e = 0.001
    p_km, a_km = compute_apogee_perigee(15.5, 0.001)
    assert 350.0 < p_km < 450.0
    assert 350.0 < a_km < 450.0
    assert a_km >= p_km

def test_conjunction_engine_screening():
    events = conjunction_engine.run_screening(threshold_km=25.0, window_hours=24.0)
    assert len(events) > 0
    # Top event should have physical parameters and risk score
    top = events[0]
    assert top.miss_distance_km > 0.0
    assert top.relative_velocity_kms > 0.0
    assert 0.0 <= top.risk_score <= 100.0
    assert top.risk_level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
