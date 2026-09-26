import pytest
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.db_models import Satellite, OrbitalElement
from app.repositories.satellite_repository import satellite_repo

def test_satellite_repository_operations():
    db = SessionLocal()
    try:
        # Check that satellites exist from initial seed
        satellites = satellite_repo.list_satellites(db, limit=50)
        assert len(satellites) > 0

        # Query ISS by NORAD ID
        iss = satellite_repo.get_by_norad_id(db, 25544)
        assert iss is not None
        assert iss.norad_id == 25544
        assert "ISS" in iss.name

        # Query latest orbital elements
        el = satellite_repo.get_latest_orbital_element(db, iss.id)
        assert el is not None
        assert el.mean_motion > 15.0
        assert el.inclination > 50.0

        # Test paired retrieval
        paired = satellite_repo.get_satellites_with_latest_elements(db, limit=10)
        assert len(paired) > 0
        assert paired[0][0].id == paired[0][1].satellite_id
    finally:
        db.close()
