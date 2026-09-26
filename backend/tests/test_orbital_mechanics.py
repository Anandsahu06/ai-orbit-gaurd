import math
import pytest
from datetime import datetime, timezone
from app.services.orbital_engine import (
    orbital_engine, datetime_to_jd_fr, gmst_from_jd,
    teme_to_ecef, ecef_to_geodetic, EARTH_RADIUS_KM
)
from app.services.data_ingestion.provider import NormalizedOrbitalRecord

def test_gmst_continuity():
    dt = datetime(2026, 3, 21, 12, 0, 0, tzinfo=timezone.utc)
    jd, fr = datetime_to_jd_fr(dt)
    gmst = gmst_from_jd(jd, fr)
    assert 0.0 <= gmst <= 2.0 * math.pi

def test_bowring_geodetic_equator():
    # Point on equator at prime meridian on Earth surface: x = 6378.137, y = 0, z = 0
    lat, lon, alt = ecef_to_geodetic(EARTH_RADIUS_KM, 0.0, 0.0)
    assert abs(lat) < 1e-4
    assert abs(lon) < 1e-4
    assert abs(alt) < 1e-3

def test_bowring_geodetic_north_pole():
    # Point at North Pole 500 km altitude
    b = EARTH_RADIUS_KM * (1.0 - (1.0 / 298.257223563))
    lat, lon, alt = ecef_to_geodetic(0.0, 0.0, b + 500.0)
    assert abs(lat - 90.0) < 1e-4
    assert abs(alt - 500.0) < 1e-3

def test_propagation_from_element():
    rec = NormalizedOrbitalRecord(
        norad_id=25544,
        name="ISS (ZARYA)",
        epoch=datetime(2026, 3, 21, 12, 0, 0, tzinfo=timezone.utc),
        mean_motion=15.498,
        eccentricity=0.00048,
        inclination=51.64,
        ra_of_asc_node=161.8,
        arg_of_pericenter=46.1,
        mean_anomaly=83.9,
        bstar=0.00025,
        tle_line1="1 25544U 98067A   26080.51862269  .00014389  00000-0  25841-3 0  9993",
        tle_line2="2 25544  51.6415 161.8344 0004867  46.1287  83.8942 15.49815049444738"
    )

    state = orbital_engine.propagate_element(rec, datetime(2026, 3, 21, 12, 30, 0, tzinfo=timezone.utc))
    assert state is not None
    assert 380.0 <= state["altitude_km"] <= 450.0  # Real ISS LEO altitude range
    assert 7.4 <= state["velocity_kms"] <= 7.9    # Real ISS orbital velocity range
    assert -52.0 <= state["latitude"] <= 52.0     # Maximum geodetic latitude bound by inclination
    assert state["origin"] == "SGP4 propagated orbital state"

def test_orbit_path_generation():
    rec = NormalizedOrbitalRecord(
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
    path = orbital_engine.generate_orbit_path(rec, duration_minutes=45.0, step_seconds=300)
    assert len(path) == 10
    assert "latitude" in path[0]
    assert "longitude" in path[0]
    assert "altitude_km" in path[0]
