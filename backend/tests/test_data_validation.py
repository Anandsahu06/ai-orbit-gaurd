import pytest
from datetime import datetime, timezone
from app.services.data_ingestion.provider import NormalizedOrbitalRecord
from app.services.data_ingestion.validator import orbital_validator

def create_valid_record():
    return NormalizedOrbitalRecord(
        norad_id=25544,
        name="ISS",
        epoch=datetime(2026, 3, 21, 12, 0, 0, tzinfo=timezone.utc),
        mean_motion=15.5,
        eccentricity=0.0005,
        inclination=51.64,
        ra_of_asc_node=160.0,
        arg_of_pericenter=45.0,
        mean_anomaly=80.0,
        bstar=0.0001
    )

def test_valid_record_passes():
    rec = create_valid_record()
    is_valid, reason = orbital_validator.validate_record(rec)
    assert is_valid is True
    assert reason is None

def test_invalid_norad_id():
    rec = create_valid_record()
    rec.norad_id = -10
    is_valid, reason = orbital_validator.validate_record(rec)
    assert is_valid is False
    assert "Invalid NORAD ID" in reason

def test_invalid_eccentricity():
    rec = create_valid_record()
    rec.eccentricity = 1.05  # Hyperbolic, not closed Earth orbit
    is_valid, reason = orbital_validator.validate_record(rec)
    assert is_valid is False
    assert "eccentricity" in reason

def test_invalid_inclination():
    rec = create_valid_record()
    rec.inclination = 210.0  # Must be 0 to 180 degrees
    is_valid, reason = orbital_validator.validate_record(rec)
    assert is_valid is False
    assert "inclination" in reason

def test_invalid_mean_motion():
    rec = create_valid_record()
    rec.mean_motion = 0.0
    is_valid, reason = orbital_validator.validate_record(rec)
    assert is_valid is False
    assert "mean motion" in reason
