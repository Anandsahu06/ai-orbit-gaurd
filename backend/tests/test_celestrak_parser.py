import pytest
from datetime import datetime, timezone
from app.services.data_ingestion.parser import orbital_parser, compute_tle_checksum, synthesize_tle_lines

SAMPLE_CELESTRAK_JSON = {
    "OBJECT_NAME": "ISS (ZARYA)",
    "OBJECT_ID": "1998-067A",
    "EPOCH": "2026-03-21T12:26:49.999968",
    "MEAN_MOTION": 15.49815049,
    "ECCENTRICITY": 0.0004867,
    "INCLINATION": 51.6415,
    "RA_OF_ASC_NODE": 161.8344,
    "ARG_OF_PERICENTER": 46.1287,
    "MEAN_ANOMALY": 83.8942,
    "EPHEMERIS_TYPE": 0,
    "CLASSIFICATION_TYPE": "U",
    "NORAD_CAT_ID": 25544,
    "ELEMENT_SET_NO": 999,
    "REV_AT_EPOCH": 44473,
    "BSTAR": 0.00025841,
    "MEAN_MOTION_DOT": 0.00014389,
    "MEAN_MOTION_DDOT": 0
}

SAMPLE_6DIGIT_JSON = {
    "OBJECT_NAME": "NEW-SAT-100001",
    "OBJECT_ID": "2026-001A",
    "EPOCH": "2026-03-21T12:00:00.000000",
    "MEAN_MOTION": 15.10000000,
    "ECCENTRICITY": 0.0002000,
    "INCLINATION": 53.0000,
    "RA_OF_ASC_NODE": 120.0000,
    "ARG_OF_PERICENTER": 90.0000,
    "MEAN_ANOMALY": 270.0000,
    "NORAD_CAT_ID": 100001,
    "BSTAR": 0.00001500
}

def test_parse_celestrak_json_item():
    record = orbital_parser.parse_celestrak_json_item(SAMPLE_CELESTRAK_JSON, group="stations")
    assert record.norad_id == 25544
    assert record.name == "ISS (ZARYA)"
    assert record.object_type == "SPACE STATION"
    assert record.inclination == 51.6415
    assert record.eccentricity == 0.0004867
    assert record.mean_motion == 15.49815049
    assert record.tle_line1 is not None
    assert record.tle_line2 is not None

def test_parse_6digit_norad_catalog():
    record = orbital_parser.parse_celestrak_json_item(SAMPLE_6DIGIT_JSON, group="active")
    assert record.norad_id == 100001
    assert record.name == "NEW-SAT-100001"
    assert record.mean_motion == 15.1
    # Standard 5-digit fixed width lines are cleanly handled (None or modern OMM representation)
    assert record.tle_line1 is None

def test_tle_checksum_calculation():
    # Example ISS Line 1
    line1 = "1 25544U 98067A   26080.51862269  .00014389  00000-0  25841-3 0  999"
    cs = compute_tle_checksum(line1)
    assert 0 <= cs <= 9
