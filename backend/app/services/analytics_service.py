import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import SessionLocal
from app.models.db_models import Satellite, OrbitalElement, ConjunctionEvent, Alert
from app.services.data_ingestion.cache import ingestion_cache
from app.services.conjunction_engine import conjunction_engine, compute_apogee_perigee

logger = logging.getLogger(__name__)

class AnalyticsService:
    """
    Computes real-time dynamic Space Traffic Management analytics directly from the database.
    No hardcoded figures.
    """

    def get_comprehensive_analytics(self) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            # 1. Fleet breakdown
            total_satellites = db.query(func.count(Satellite.id)).scalar() or 0
            active_count = db.query(func.count(Satellite.id)).filter(Satellite.status == "ACTIVE").scalar() or 0
            debris_count = db.query(func.count(Satellite.id)).filter(
                (Satellite.object_type == "DEBRIS") | (Satellite.status == "DEBRIS")
            ).scalar() or 0
            inactive_count = total_satellites - active_count - debris_count
            if inactive_count < 0:
                inactive_count = 0

            # 2. Orbital Regimes (LEO, MEO, GEO) calculated from mean motion
            regimes = {"LEO": 0, "MEO": 0, "GEO": 0}
            elements = db.query(OrbitalElement).all()
            for el in elements:
                p_km, a_km = compute_apogee_perigee(el.mean_motion, el.eccentricity)
                avg_alt = (p_km + a_km) / 2.0
                if avg_alt < 2000:
                    regimes["LEO"] += 1
                elif avg_alt < 35786:
                    regimes["MEO"] += 1
                else:
                    regimes["GEO"] += 1

            # 3. Conjunctions & Risk distribution
            conjunctions = conjunction_engine.get_all()
            total_conjunctions = len(conjunctions)
            risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
            for c in conjunctions:
                risk_dist[c.risk_level] = risk_dist.get(c.risk_level, 0) + 1

            # 4. Critical and High risk list
            critical_events = [
                {
                    "id": c.id,
                    "title": f"Close Approach: {c.primary_name} vs {c.secondary_name}",
                    "miss_distance": f"{c.miss_distance_km:.2f} km",
                    "tca": c.tca,
                    "risk_level": c.risk_level,
                    "time_to_tca_hours": c.time_to_tca_hours
                }
                for c in conjunctions if c.risk_level in ["HIGH", "CRITICAL"]
            ]

            # 5. Data Freshness
            freshness = ingestion_cache.get_metadata()

            # 6. Altitude Bands
            altitude_bands = [
                {"band": "300-500 km (ISS / Low LEO)", "count": sum(1 for e in elements if 300 <= compute_apogee_perigee(e.mean_motion, e.eccentricity)[0] < 500)},
                {"band": "500-600 km (Starlink / Sun-Synch)", "count": sum(1 for e in elements if 500 <= compute_apogee_perigee(e.mean_motion, e.eccentricity)[0] < 600)},
                {"band": "600-800 km (Earth Observation)", "count": sum(1 for e in elements if 600 <= compute_apogee_perigee(e.mean_motion, e.eccentricity)[0] < 800)},
                {"band": "800+ km (Upper LEO / Debris Belts)", "count": sum(1 for e in elements if compute_apogee_perigee(e.mean_motion, e.eccentricity)[0] >= 800)},
            ]

            return {
                "generated_at": now.isoformat(),
                "fleet": {
                    "total": total_satellites,
                    "active": active_count,
                    "debris": debris_count,
                    "inactive": inactive_count
                },
                "fleet_status": {
                    "total": total_satellites,
                    "active": active_count,
                    "debris": debris_count,
                    "inactive": inactive_count
                },
                "risk_distribution": risk_dist,
                "regime_distribution": [
                    {"regime": k, "count": v} for k, v in regimes.items()
                ],
                "altitude_bands": altitude_bands,
                "conjunction_count": total_conjunctions,
                "critical_events": critical_events,
                "data_freshness": freshness,
                "origin": "SGP4_AND_CELESTRAK_DYNAMIC_DB"
            }
        finally:
            db.close()

analytics_service = AnalyticsService()
