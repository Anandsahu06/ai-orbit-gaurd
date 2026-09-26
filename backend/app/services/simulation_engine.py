import math
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from app.models.schemas import (
    ConjunctionEvent,
    ManeuverRequest,
    ScenarioComparisonItem,
    ManeuverSimulationResponse
)
from app.database import SessionLocal
from app.models.db_models import SimulationRun as DBSimulationRun
from app.services.conjunction_engine import conjunction_engine
from app.services.ml_risk_engine import ml_risk_engine

logger = logging.getLogger(__name__)

EARTH_MU = 398600.4418 # km^3 / s^2

class BaseSimulationEngine(ABC):
    """
    Abstract interface for collision avoidance maneuver simulation.
    Allows hot-swapping between simplified prototype simulation and future high-fidelity propagators.
    """

    @abstractmethod
    def simulate_maneuver(
        self,
        conjunction_id: str,
        custom_delta_v_ms: Optional[float] = None,
        custom_direction: Optional[str] = None,
        custom_timing_hours: Optional[float] = None
    ) -> Optional[ManeuverSimulationResponse]:
        pass

class SimplifiedSimulationEngine(BaseSimulationEngine):
    """
    Physics-inspired prototype collision avoidance simulation engine.
    Uses secular along-track and cross-track Gauss variational approximations.
    Clearly designated as a decision-support prototype, not flight-grade maneuver planning.
    """

    def simulate_maneuver(
        self,
        conjunction_id: str,
        custom_delta_v_ms: Optional[float] = None,
        custom_direction: Optional[str] = None,
        custom_timing_hours: Optional[float] = None
    ) -> Optional[ManeuverSimulationResponse]:
        event = conjunction_engine.get_by_id(conjunction_id)
        if not event:
            all_events = conjunction_engine.get_all()
            if all_events:
                event = all_events[0]
            else:
                return None

        base_dist = event.miss_distance_km
        base_vel = event.relative_velocity_kms
        tca_h = event.time_to_tca_hours
        alt = event.altitude_km
        r_orbit = 6378.137 + alt
        v_orbit = math.sqrt(EARTH_MU / r_orbit) # ~7.6 km/s

        # 1. Baseline: No Maneuver
        baseline = ScenarioComparisonItem(
            scenario_id="SCEN-0",
            name="No Maneuver (Baseline)",
            delta_v_ms=0.0,
            delta_v_kms=0.0,
            direction="NONE",
            burn_time_before_tca_h=0.0,
            miss_distance_km=round(base_dist, 2),
            risk_score=round(event.risk_score, 1),
            risk_level=event.risk_level,
            miss_distance_delta_km=0.0,
            risk_reduction_pct=0.0,
            description="Passive ballistic trajectory without orbital adjustment. Maintains original collision risk."
        )

        def evaluate_burn(
            dv_ms: float,
            direction: str,
            lead_hours: float,
            name: str,
            scen_id: str,
            desc: str
        ) -> ScenarioComparisonItem:
            dv_kms = dv_ms / 1000.0
            lead_sec = lead_hours * 3600.0

            # Gauss Variational Equation approximation for secular along-track displacement:
            # delta_s ≈ 3 * (delta_v / v_orb) * lead_sec * v_orb = 3 * delta_v * lead_sec
            dir_up = direction.upper()
            if dir_up == "PROGRADE":
                disp_km = abs(3.0 * dv_kms * (lead_sec / 3600.0) * 1.95)
            elif dir_up == "RETROGRADE":
                disp_km = abs(3.0 * dv_kms * (lead_sec / 3600.0) * 1.75)
            elif dir_up in ["RADIAL", "RADIAL_OUT", "RADIAL_IN"]:
                disp_km = abs(dv_kms * (lead_sec / 3600.0) * 0.90)
            else: # NORMAL / OUT-OF-PLANE
                disp_km = abs(dv_kms * (lead_sec / 3600.0) * 0.75)

            new_dist = math.sqrt(base_dist**2 + disp_km**2)
            new_dist = round(max(0.1, new_dist), 2)

            new_score, new_level, _ = ml_risk_engine.compute_risk_score(
                miss_distance_km=new_dist,
                relative_velocity_kms=base_vel,
                time_to_tca_hours=tca_h,
                altitude_km=alt
            )

            reduction = max(0.0, min(100.0, round(((event.risk_score - new_score) / max(1.0, event.risk_score)) * 100.0, 1)))

            return ScenarioComparisonItem(
                scenario_id=scen_id,
                name=name,
                delta_v_ms=round(dv_ms, 1),
                delta_v_kms=round(dv_kms, 4),
                direction=dir_up,
                burn_time_before_tca_h=round(lead_hours, 1),
                miss_distance_km=new_dist,
                risk_score=round(new_score, 1),
                risk_level=new_level,
                miss_distance_delta_km=round(new_dist - base_dist, 2),
                risk_reduction_pct=reduction,
                description=desc
            )

        # Standard preset scenarios
        scen_a = evaluate_burn(
            dv_ms=15.0,
            direction="RETROGRADE",
            lead_hours=min(tca_h, 6.0),
            name="Scenario A: Standard Retrograde",
            scen_id="SCEN-A",
            desc="Conservative 15.0 m/s retrograde burn executed 6h prior to TCA. Low fuel penalty."
        )

        scen_b = evaluate_burn(
            dv_ms=25.0,
            direction="PROGRADE",
            lead_hours=min(tca_h, 8.0),
            name="Scenario B: Maximum Margin Prograde",
            scen_id="SCEN-B",
            desc="Aggressive 25.0 m/s prograde burn executed 8h prior to TCA. Maximizes clearance."
        )

        scenarios = [baseline, scen_a, scen_b]

        # Add custom scenario if specified
        if custom_delta_v_ms is not None or custom_direction is not None or custom_timing_hours is not None:
            c_dv = custom_delta_v_ms if custom_delta_v_ms is not None else 20.0
            c_dir = custom_direction if custom_direction is not None else "RETROGRADE"
            c_lead = custom_timing_hours if custom_timing_hours is not None else min(tca_h, 6.0)

            custom_scen = evaluate_burn(
                dv_ms=c_dv,
                direction=c_dir,
                lead_hours=c_lead,
                name="Custom User Configuration",
                scen_id="SCEN-CUSTOM",
                desc=f"Operator-specified {c_dv:.1f} m/s {c_dir.upper()} burn planned {c_lead:.1f}h before TCA."
            )
            scenarios.append(custom_scen)

            # Persist simulation run to database
            try:
                db = SessionLocal()
                run_record = DBSimulationRun(
                    conjunction_id=event.id,
                    delta_v_mps=custom_scen.delta_v_ms,
                    direction=custom_scen.direction,
                    lead_time_hours=custom_scen.burn_time_before_tca_h,
                    baseline_miss_distance_km=baseline.miss_distance_km,
                    simulated_miss_distance_km=custom_scen.miss_distance_km,
                    baseline_risk_score=baseline.risk_score,
                    simulated_risk_score=custom_scen.risk_score,
                    risk_reduction_percent=custom_scen.risk_reduction_pct,
                    simulation_method="PHYSICS_INSPIRED_PROTOTYPE"
                )
                db.add(run_record)
                db.commit()
                db.close()
            except Exception as e:
                logger.warning(f"Could not persist simulation run: {e}")

        # Choose best recommendation
        non_baseline = [s for s in scenarios if s.scenario_id != "SCEN-0"]
        best = max(non_baseline, key=lambda s: s.risk_reduction_pct)
        rec_text = (
            f"Recommend {best.name}: {best.direction} burn with Δv = {best.delta_v_ms} m/s "
            f"scheduled {best.burn_time_before_tca_h}h prior to TCA. "
            f"Expands separation by {best.miss_distance_delta_km:.2f} km and achieves {best.risk_reduction_pct:.1f}% risk mitigation."
        )

        return ManeuverSimulationResponse(
            conjunction_id=event.id,
            primary_name=event.primary_name,
            secondary_name=event.secondary_name,
            original_miss_distance_km=round(base_dist, 2),
            original_risk_score=round(event.risk_score, 1),
            original_risk_level=event.risk_level,
            tca=event.tca,
            scenarios=scenarios,
            recommendation=rec_text,
            simulation_notes=(
                "Physics-inspired prototype simulation. "
                "Secular along-track Gauss variational mechanics used for prototype decision support. "
                "Not certified for flight dynamics execution."
            )
        )

SimulationEngine = SimplifiedSimulationEngine
simulation_engine = SimplifiedSimulationEngine()
