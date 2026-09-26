import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import SessionLocal
from app.models.db_models import Satellite, OrbitalElement
from app.services.data_ingestion.celestrak_provider import celestrak_provider
from app.services.data_ingestion.cache import ingestion_cache
from app.services.data_ingestion.provider import NormalizedOrbitalRecord

logger = logging.getLogger(__name__)

def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

class IngestionScheduler:
    """
    Coordinates orbital data ingestion from providers into the persistent database.
    Ensures orbital elements history is maintained and CelesTrak usage policy is respected.
    """

    def persist_records(self, db: Session, records: List[NormalizedOrbitalRecord]) -> int:
        """
        Persists a list of validated records into PostgreSQL/DB.
        Inserts new satellites if not existing, and appends orbital elements history.
        """
        count = 0
        now = datetime.now(timezone.utc)

        for rec in records:
            rec_epoch_utc = ensure_utc(rec.epoch)
            # 1. Lookup or create satellite
            sat = db.query(Satellite).filter(Satellite.norad_id == rec.norad_id).first()
            if not sat:
                sat = Satellite(
                    norad_id=rec.norad_id,
                    name=rec.name,
                    international_designator=rec.international_designator,
                    object_type=rec.object_type,
                    country_owner=rec.country_owner,
                    status="ACTIVE" if rec.object_type != "DEBRIS" else "DEBRIS",
                    created_at=now,
                    updated_at=now
                )
                db.add(sat)
                db.flush()
            else:
                # Update metadata if needed
                sat.name = rec.name
                sat.object_type = rec.object_type
                sat.updated_at = now

            # 2. Check if this epoch already exists to avoid redundant duplicate inserts
            existing_elements = db.query(OrbitalElement).filter(
                OrbitalElement.satellite_id == sat.id
            ).all()

            already_exists = any(
                ensure_utc(el.epoch) == rec_epoch_utc for el in existing_elements
            )

            if not already_exists:
                # Close out previous active element validity
                prev_el = db.query(OrbitalElement).filter(
                    OrbitalElement.satellite_id == sat.id,
                    OrbitalElement.valid_until.is_(None)
                ).order_by(OrbitalElement.epoch.desc()).first()

                if prev_el and ensure_utc(prev_el.epoch) < rec_epoch_utc:
                    prev_el.valid_until = rec_epoch_utc

                new_el = OrbitalElement(
                    satellite_id=sat.id,
                    source=rec.source,
                    format=rec.raw_format,
                    epoch=rec_epoch_utc,
                    tle_line1=rec.tle_line1,
                    tle_line2=rec.tle_line2,
                    mean_motion=rec.mean_motion,
                    eccentricity=rec.eccentricity,
                    inclination=rec.inclination,
                    ra_of_asc_node=rec.ra_of_asc_node,
                    arg_of_pericenter=rec.arg_of_pericenter,
                    mean_anomaly=rec.mean_anomaly,
                    bstar=rec.bstar,
                    fetched_at=now,
                    valid_from=rec_epoch_utc,
                    valid_until=None
                )
                db.add(new_el)
                count += 1

        db.commit()
        return count

    def run_ingestion_cycle(self, groups: Optional[List[str]] = None, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Executes an ingestion pass across configured orbital groups.
        """
        target_groups = groups or settings.celestrak_group_list
        logger.info(f"Starting orbital data ingestion pass for groups: {target_groups}")

        total_ingested = 0
        group_results = {}
        db = SessionLocal()

        try:
            for group in target_groups:
                # Fetch records from provider
                records = celestrak_provider.fetch_group(group)
                if records:
                    persisted = self.persist_records(db, records)
                    total_ingested += persisted
                    group_results[group] = {
                        "fetched": len(records),
                        "new_persisted": persisted,
                        "status": "SUCCESS"
                    }
                else:
                    group_results[group] = {
                        "fetched": 0,
                        "new_persisted": 0,
                        "status": "EMPTY_OR_UNAVAILABLE"
                    }
        finally:
            db.close()

        logger.info(f"Completed ingestion cycle. Persisted {total_ingested} new orbital element records.")
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "groups_processed": len(target_groups),
            "total_new_elements": total_ingested,
            "groups": group_results
        }

ingestion_scheduler = IngestionScheduler()
