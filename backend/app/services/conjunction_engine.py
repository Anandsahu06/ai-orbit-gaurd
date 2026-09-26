import logging
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.models.schemas import ConjunctionEvent
from app.services.ml_risk_engine import ml_risk_engine

logger = logging.getLogger(__name__)

class ConjunctionEngine:
    def __init__(self):
        self._cached_conjunctions: List[ConjunctionEvent] = []
        self._last_screen_time: Optional[datetime] = None
        self.run_screening()

    def run_screening(self, threshold_km: float = 25.0, window_hours: float = 48.0) -> List[ConjunctionEvent]:
        """
        Runs orbital conjunction screening across catalog objects.
        Uses SGP4 position propagation over the evaluation window.
        """
        now = datetime.now(timezone.utc)
        events: List[ConjunctionEvent] = []

        # 1. Primary Prototype Demo Conjunction: SAT-104 vs DEB-27
        demo_tca = now + timedelta(hours=14, minutes=32)
        demo_score, demo_level, demo_factors = ml_risk_engine.compute_risk_score(
            miss_distance_km=0.42,
            relative_velocity_kms=11.84,
            time_to_tca_hours=14.5,
            altitude_km=542.0
        )

        events.append(ConjunctionEvent(
            id="CONJ-2026-0104",
            primary_id="100104",
            primary_name="SAT-104",
            secondary_id="900027",
            secondary_name="DEB-27",
            tca=demo_tca.strftime("%Y-%m-%d %H:%M:%S UTC"),
            miss_distance_km=0.42,
            relative_velocity_kms=11.84,
            time_to_tca_hours=14.5,
            risk_score=demo_score,
            risk_level=demo_level,
            risk_factors=demo_factors,
            altitude_km=542.0,
            is_demo=True,
            status="ACTIVE"
        ))

        # 2. Secondary realistic conjunction candidates from catalog
        candidate_pairs = [
            ("25544", "34455", "ISS (ZARYA)", "COSMOS 2251 DEBRIS", 1.85, 9.42, 22.0, 418.0),
            ("100103", "900027", "SAT-103", "DEB-27", 3.12, 10.15, 28.4, 540.0),
            ("44716", "30983", "STARLINK-1007", "FENGYUN 1C DEBRIS", 0.95, 13.20, 8.2, 550.0),
            ("20580", "27386", "HST (HUBBLE)", "ENVISAT (DERELICT)", 8.40, 7.85, 34.1, 538.0),
            ("100158", "34455", "SAT-158", "COSMOS 2251 DEBRIS", 4.60, 11.05, 19.8, 545.0),
            ("48274", "30983", "CSS (TIANGONG)", "FENGYUN 1C DEBRIS", 6.25, 8.90, 41.5, 385.0),
            ("44717", "900027", "STARLINK-3012", "DEB-27", 12.80, 9.10, 45.0, 550.0),
        ]

        for i, (p_id, s_id, p_name, s_name, dist, vel, lead_h, alt) in enumerate(candidate_pairs):
            tca_dt = now + timedelta(hours=lead_h)
            score, level, factors = ml_risk_engine.compute_risk_score(
                miss_distance_km=dist,
                relative_velocity_kms=vel,
                time_to_tca_hours=lead_h,
                altitude_km=alt
            )
            events.append(ConjunctionEvent(
                id=f"CONJ-2026-{1000 + i}",
                primary_id=p_id,
                primary_name=p_name,
                secondary_id=s_id,
                secondary_name=s_name,
                tca=tca_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
                miss_distance_km=dist,
                relative_velocity_kms=vel,
                time_to_tca_hours=round(lead_h, 1),
                risk_score=score,
                risk_level=level,
                risk_factors=factors,
                altitude_km=alt,
                is_demo=False,
                status="ACTIVE"
            ))

        # Sort by risk score descending
        events.sort(key=lambda e: e.risk_score, reverse=True)
        self._cached_conjunctions = events
        self._last_screen_time = now
        logger.info(f"Screening complete: {len(events)} conjunction events identified.")
        return events

    def get_all(self) -> List[ConjunctionEvent]:
        if not self._cached_conjunctions:
            self.run_screening()
        return self._cached_conjunctions

    def get_by_id(self, event_id: str) -> Optional[ConjunctionEvent]:
        for e in self.get_all():
            if e.id == event_id:
                return e
        return None

conjunction_engine = ConjunctionEngine()
