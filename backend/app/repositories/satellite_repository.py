import logging
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.db_models import Satellite, OrbitalElement

logger = logging.getLogger(__name__)

class SatelliteRepository:
    """
    Data access repository for Satellite and OrbitalElement entities.
    """

    @staticmethod
    def get_by_norad_id(db: Session, norad_id: int) -> Optional[Satellite]:
        return db.query(Satellite).filter(Satellite.norad_id == norad_id).first()

    @staticmethod
    def get_latest_orbital_element(db: Session, satellite_id: int) -> Optional[OrbitalElement]:
        return db.query(OrbitalElement).filter(
            OrbitalElement.satellite_id == satellite_id
        ).order_by(OrbitalElement.epoch.desc()).first()

    @staticmethod
    def list_satellites(
        db: Session,
        query: Optional[str] = None,
        object_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Satellite]:
        q = db.query(Satellite)
        if query:
            clean_q = query.strip()
            if clean_q.isdigit():
                q = q.filter(Satellite.norad_id == int(clean_q))
            else:
                q = q.filter(Satellite.name.ilike(f"%{clean_q}%"))

        if object_type and object_type.upper() != "ALL":
            q = q.filter(Satellite.object_type.ilike(f"%{object_type}%"))

        return q.order_by(Satellite.norad_id.asc()).limit(limit).all()

    @staticmethod
    def get_satellites_with_latest_elements(
        db: Session,
        limit: int = 200
    ) -> List[Tuple[Satellite, OrbitalElement]]:
        """
        Retrieves satellites paired with their most recent orbital element record.
        """
        satellites = db.query(Satellite).limit(limit).all()
        results = []
        for sat in satellites:
            latest_el = db.query(OrbitalElement).filter(
                OrbitalElement.satellite_id == sat.id
            ).order_by(OrbitalElement.epoch.desc()).first()
            if latest_el:
                results.append((sat, latest_el))
        return results

satellite_repo = SatelliteRepository()
