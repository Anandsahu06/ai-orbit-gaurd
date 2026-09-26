import math
import logging
from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime, timezone, timedelta
import numpy as np
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import SessionLocal
from app.models.db_models import Satellite, OrbitalElement, ConjunctionEvent as DBConjunctionEvent
from app.models.schemas import ConjunctionEvent
from app.services.orbital_engine import (
    orbital_engine, datetime_to_jd_fr, EARTH_RADIUS_KM
)
from app.services.data_ingestion.provider import NormalizedOrbitalRecord

logger = logging.getLogger(__name__)

EARTH_MU = 398600.4418 # km^3 / s^2

def compute_apogee_perigee(mean_motion_rev_day: float, eccentricity: float) -> Tuple[float, float]:
    """
    Computes perigee and apogee altitudes (km) above spherical Earth.
    mean_motion: rev/day
    """
    n_rad_s = (mean_motion_rev_day * 2.0 * math.pi) / 86400.0
    a = (EARTH_MU / (n_rad_s ** 2)) ** (1.0 / 3.0)
    perigee_km = a * (1.0 - eccentricity) - EARTH_RADIUS_KM
    apogee_km = a * (1.0 + eccentricity) - EARTH_RADIUS_KM
    return perigee_km, apogee_km

def golden_section_tca_refinement(
    satrec_a,
    satrec_b,
    t_start: datetime,
    t_end: datetime,
    tolerance_seconds: float = 1.0
) -> Tuple[datetime, float, float]:
    """
    Refines Time of Closest Approach (TCA) using Golden-Section search between t_start and t_end.
    Returns: (refined_tca, miss_distance_km, relative_velocity_kms)
    """
    phi = (1.0 + math.sqrt(5.0)) / 2.0
    resphi = 2.0 - phi

    a_sec = 0.0
    b_sec = (t_end - t_start).total_seconds()

    def eval_separation(sec_offset: float) -> Tuple[float, float]:
        t = t_start + timedelta(seconds=sec_offset)
        jd, fr = datetime_to_jd_fr(t)
        e1, r1, v1 = satrec_a.sgp4(jd, fr)
        e2, r2, v2 = satrec_b.sgp4(jd, fr)
        if e1 != 0 or e2 != 0:
            return 999999.0, 0.0
        dx = r1[0] - r2[0]
        dy = r1[1] - r2[1]
        dz = r1[2] - r2[2]
        dist = math.sqrt(dx*dx + dy*dy + dz*dz)

        dvx = v1[0] - v2[0]
        dvy = v1[1] - v2[1]
        dvz = v1[2] - v2[2]
        rel_v = math.sqrt(dvx*dvx + dvy*dvy + dvz*dvz)
        return dist, rel_v

    c_sec = a_sec + resphi * (b_sec - a_sec)
    d_sec = b_sec - resphi * (b_sec - a_sec)
    fc, vc = eval_separation(c_sec)
    fd, vd = eval_separation(d_sec)

    while abs(b_sec - a_sec) > tolerance_seconds:
        if fc < fd:
            b_sec = d_sec
            d_sec = c_sec
            fd = fc
            c_sec = a_sec + resphi * (b_sec - a_sec)
            fc, vc = eval_separation(c_sec)
        else:
            a_sec = c_sec
            c_sec = d_sec
            fc = fd
            d_sec = b_sec - resphi * (b_sec - a_sec)
            fd, vd = eval_separation(d_sec)

    best_sec = (a_sec + b_sec) / 2.0
    final_dist, final_rel_v = eval_separation(best_sec)
    best_tca = t_start + timedelta(seconds=best_sec)
    return best_tca, round(final_dist, 4), round(final_rel_v, 3)

class ConjunctionEngine:
    """
    Computational Conjunction Screening Pipeline:
    1. Filter catalog by orbital altitude regime overlap (O(1) per pair).
    2. SGP4 trajectory propagation over screening horizon.
    3. Sampled minimum distance calculation.
    4. Golden-section TCA local refinement.
    5. Prototype Risk Score attribution.
    """

    def __init__(self):
        self._cached_conjunctions: List[ConjunctionEvent] = []
        self._last_screen_time: Optional[datetime] = None

    def screen_pair(
        self,
        sat_a: Satellite,
        el_a: OrbitalElement,
        sat_b: Satellite,
        el_b: OrbitalElement,
        start_time: datetime,
        window_hours: float,
        coarse_step_seconds: int,
        threshold_km: float
    ) -> Optional[Dict[str, Any]]:
        """
        Screens a single candidate pair across the evaluation window.
        """
        satrec_a = orbital_engine.get_satrec_for_element(el_a)
        satrec_b = orbital_engine.get_satrec_for_element(el_b)

        total_steps = int((window_hours * 3600) / coarse_step_seconds)
        min_dist = float("inf")
        min_step = -1

        for step in range(total_steps):
            sample_t = start_time + timedelta(seconds=step * coarse_step_seconds)
            jd, fr = datetime_to_jd_fr(sample_t)
            e1, r1, _ = satrec_a.sgp4(jd, fr)
            e2, r2, _ = satrec_b.sgp4(jd, fr)

            if e1 != 0 or e2 != 0:
                continue

            dx = r1[0] - r2[0]
            dy = r1[1] - r2[1]
            dz = r1[2] - r2[2]
            dist = math.sqrt(dx*dx + dy*dy + dz*dz)

            if dist < min_dist:
                min_dist = dist
                min_step = step

        if min_dist <= threshold_km and min_step >= 0:
            # Step bracket for refinement
            t_bracket_start = start_time + timedelta(seconds=max(0, (min_step - 1) * coarse_step_seconds))
            t_bracket_end = start_time + timedelta(seconds=min(total_steps * coarse_step_seconds, (min_step + 1) * coarse_step_seconds))

            refined_tca, refined_dist, rel_vel = golden_section_tca_refinement(
                satrec_a, satrec_b, t_bracket_start, t_bracket_end, tolerance_seconds=2.0
            )

            # Altitude of primary at TCA
            state_a = orbital_engine.propagate_element(el_a, refined_tca)
            alt_km = state_a["altitude_km"] if state_a else 550.0

            return {
                "tca": refined_tca,
                "sampled_tca": start_time + timedelta(seconds=min_step * coarse_step_seconds),
                "sampled_min_distance_km": round(min_dist, 2),
                "miss_distance_km": refined_dist,
                "relative_velocity_kms": rel_vel,
                "altitude_km": alt_km
            }

        return None

    def run_screening(
        self,
        threshold_km: Optional[float] = None,
        window_hours: Optional[float] = None
    ) -> List[ConjunctionEvent]:
        """
        Runs candidate conjunction screening across database orbital records.
        """
        from app.services.ml_risk_engine import ml_risk_engine
        from app.services.alerts.alert_service import alert_service

        thresh = threshold_km or settings.DEFAULT_SCREENING_THRESHOLD_KM
        win_h = window_hours or settings.DEFAULT_SCREENING_WINDOW_HOURS
        step_sec = settings.SCREENING_TIME_STEP_SECONDS
        now = datetime.now(timezone.utc)

        db = SessionLocal()
        events: List[ConjunctionEvent] = []

        try:
            # Query all satellites with latest elements
            satellites = db.query(Satellite).all()
            sat_elements: List[Tuple[Satellite, OrbitalElement, float, float]] = []

            for sat in satellites:
                el = db.query(OrbitalElement).filter(
                    OrbitalElement.satellite_id == sat.id
                ).order_by(OrbitalElement.epoch.desc()).first()
                if el:
                    p_km, a_km = compute_apogee_perigee(el.mean_motion, el.eccentricity)
                    sat_elements.append((sat, el, p_km, a_km))

            # Pairwise candidate screening with altitude regime filter
            candidate_pairs = []
            for i in range(len(sat_elements)):
                for j in range(i + 1, len(sat_elements)):
                    sat_a, el_a, p_a, a_a = sat_elements[i]
                    sat_b, el_b, p_b, a_b = sat_elements[j]

                    # Perigee/Apogee bounding box filter (with threshold buffer)
                    if not (a_a + thresh < p_b - thresh or a_b + thresh < p_a - thresh):
                        candidate_pairs.append((sat_a, el_a, sat_b, el_b))

            logger.info(f"Screening pipeline: {len(sat_elements)} objects, {len(candidate_pairs)} candidate pairs.")

            for sat_a, el_a, sat_b, el_b in candidate_pairs:
                res = self.screen_pair(sat_a, el_a, sat_b, el_b, now, win_h, step_sec, thresh)
                if res:
                    tca_dt = res["tca"]
                    time_to_tca_h = max(0.1, round((tca_dt - now).total_seconds() / 3600.0, 1))

                    score, level, factors = ml_risk_engine.compute_risk_score(
                        miss_distance_km=res["miss_distance_km"],
                        relative_velocity_kms=res["relative_velocity_kms"],
                        time_to_tca_hours=time_to_tca_h,
                        altitude_km=res["altitude_km"]
                    )

                    conj_id = f"CONJ-{sat_a.norad_id}-{sat_b.norad_id}"

                    # Upsert into database
                    db_conj = db.query(DBConjunctionEvent).filter(DBConjunctionEvent.id == conj_id).first()
                    if not db_conj:
                        db_conj = DBConjunctionEvent(
                            id=conj_id,
                            primary_satellite_id=sat_a.id,
                            secondary_satellite_id=sat_b.id,
                            tca=tca_dt,
                            miss_distance_km=res["miss_distance_km"],
                            relative_velocity_kms=res["relative_velocity_kms"],
                            risk_score=score,
                            risk_level=level,
                            source="SGP4_SCREENING",
                            calculation_timestamp=now,
                            status="OPEN"
                        )
                        db.add(db_conj)
                    else:
                        db_conj.tca = tca_dt
                        db_conj.miss_distance_km = res["miss_distance_km"]
                        db_conj.relative_velocity_kms = res["relative_velocity_kms"]
                        db_conj.risk_score = score
                        db_conj.risk_level = level
                        db_conj.calculation_timestamp = now

                    events.append(ConjunctionEvent(
                        id=conj_id,
                        primary_id=str(sat_a.norad_id),
                        primary_name=sat_a.name,
                        secondary_id=str(sat_b.norad_id),
                        secondary_name=sat_b.name,
                        tca=tca_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        miss_distance_km=res["miss_distance_km"],
                        relative_velocity_kms=res["relative_velocity_kms"],
                        time_to_tca_hours=time_to_tca_h,
                        risk_score=score,
                        risk_level=level,
                        risk_factors=factors,
                        altitude_km=res["altitude_km"],
                        is_demo=False,
                        status="ACTIVE"
                    ))

            # Include verified prototype demo conjunction if fallback allowed
            if settings.ENABLE_FALLBACK_DEMO_DATA:
                demo_tca = now + timedelta(hours=14, minutes=32)
                demo_score, demo_level, demo_factors = ml_risk_engine.compute_risk_score(
                    miss_distance_km=0.42,
                    relative_velocity_kms=11.84,
                    time_to_tca_hours=14.5,
                    altitude_km=542.0
                )
                events.insert(0, ConjunctionEvent(
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

            db.commit()

            # Trigger alert service for high/critical events
            alert_service.process_conjunction_alerts(db, events)

        finally:
            db.close()

        events.sort(key=lambda e: e.risk_score, reverse=True)
        self._cached_conjunctions = events
        self._last_screen_time = now
        return events

    def get_all(self) -> List[ConjunctionEvent]:
        if not self._cached_conjunctions:
            self.run_screening()
        return self._cached_conjunctions

    def get_by_id(self, event_id: str) -> Optional[ConjunctionEvent]:
        events = self.get_all()
        for ev in events:
            if ev.id == event_id:
                return ev
        return None

conjunction_engine = ConjunctionEngine()
