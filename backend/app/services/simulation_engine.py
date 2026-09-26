import math
import logging
from typing import Dict, Any, List, Optional
from app.models.schemas import (
    ConjunctionEvent,
    ManeuverRequest,
    ScenarioComparisonItem,
    ManeuverSimulationResponse
)
from app.services.conjunction_engine import conjunction_engine
from app.services.ml_risk_engine import ml_risk_engine

logger = logging.getLogger(__name__)

EARTH_MU = 398600.4418 # km^3 / s^2

class SimulationEngine:
    def simulate_maneuver(
        self,
        conjunction_id: str,
        custom_delta_v_ms: Optional[float] = None,
        custom_direction: Optional[str] = None,
        custom_timing_hours: Optional[float] = None
    ) -> Optional[ManeuverSimulationResponse]:
        """
        Simulates hypothetical collision avoidance maneuvers for a conjunction event.
        Calculates resulting orbital separation, updated ML risk scores, and compares scenarios.
        """
        event = conjunction_engine.get_by_id(conjunction_id)
        if not event:
            # Fallback to the primary demo event if not found
            event = conjunction_engine.get_all()[0]

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

        # 2. Helper function to compute perturbed separation and risk
        def evaluate_burn(dv_ms: float, direction: str, lead_hours: float, name: str, scen_id: str, desc: str) -> ScenarioComparisonItem:
            dv_kms = dv_ms / 1000.0
            lead_sec = lead_hours * 3600.0

            # Orbital mechanics approximation for along-track secular displacement:
            # delta_s ≈ 3 * (delta_v / v_orb) * lead_sec * v_orb = 3 * delta_v * lead_sec
            if direction.upper() == "PROGRADE":
                disp_km = abs(3.0 * dv_kms * (lead_sec / 3600.0) * 1.95) # Prograde boost increases semi-major axis
            elif direction.upper() == "RETROGRADE":
                disp_km = abs(3.0 * dv_kms * (lead_sec / 3600.0) * 1.75) # Retrograde decreases semi-major axis
            elif direction.upper() in ["RADIAL", "RADIAL_OUT", "RADIAL_IN"]:
                disp_km = abs(dv_kms * (lead_sec / 3600.0) * 0.9)
            else: # NORMAL / OUT-OF-PLANE
                disp_km = abs(dv_kms * (lead_sec / 3600.0) * 0.75)

            # Updated separation at TCA (quadrature sum with original miss vector)
            new_dist = math.sqrt(base_dist**2 + disp_km**2)
            new_dist = round(max(0.1, new_dist), 2)

            # Re-evaluate with ML risk engine
            new_score, new_level, _ = ml_risk_engine.compute_risk_score(
                miss_distance_km=new_dist,
                relative_velocity_kms=base_vel,
                time_to_tca_hours=tca_h,
                altitude_km=alt
            )

            # Ensure smooth monotonic risk reduction
            reduction = max(0.0, min(100.0, round(((event.risk_score - new_score) / event.risk_score) * 100.0, 1)))

            return ScenarioComparisonItem(
                scenario_id=scen_id,
                name=name,
                delta_v_ms=round(dv_ms, 1),
                delta_v_kms=round(dv_kms, 4),
                direction=direction.upper(),
                burn_time_before_tca_h=round(lead_hours, 1),
                miss_distance_km=new_dist,
                risk_score=round(new_score, 1),
                risk_level=new_level,
                miss_distance_delta_km=round(new_dist - base_dist, 2),
                risk_reduction_pct=reduction,
                description=desc
            )

        # 3. Scenario A: Conservative Maneuver (20 m/s Retrograde, 6h before TCA)
        scenario_a = evaluate_burn(
            dv_ms=20.0,
            direction="RETROGRADE",
            lead_hours=min(6.0, tca_h * 0.5),
            name="Scenario A (Conservative)",
            scen_id="SCEN-A",
            desc="Hypothetical retrograde maneuver executed 6h prior to TCA. Low delta-V expenditure."
        )

        # 4. Scenario B: Nominal Avoidance Maneuver (40 m/s Prograde, 12h before TCA)
        scenario_b = evaluate_burn(
            dv_ms=40.0,
            direction="PROGRADE",
            lead_hours=min(12.0, tca_h * 0.8),
            name="Scenario B (Nominal)",
            scen_id="SCEN-B",
            desc="Hypothetical prograde maneuver increasing separation margin beyond the 4.0 km screening bubble."
        )

        scenarios = [baseline, scenario_a, scenario_b]

        # 5. Optional custom user scenario if requested
        if custom_delta_v_ms is not None:
            custom_dir = custom_direction or "RETROGRADE"
            custom_lead = custom_timing_hours if custom_timing_hours is not None else 6.0
            custom_scen = evaluate_burn(
                dv_ms=custom_delta_v_ms,
                direction=custom_dir,
                lead_hours=custom_lead,
                name=f"Custom ({custom_delta_v_ms:.1f} m/s {custom_dir})",
                scen_id="SCEN-CUSTOM",
                desc=f"User-configured burn of {custom_delta_v_ms:.1f} m/s ({custom_dir}) executed {custom_lead:.1f}h prior to TCA."
            )
            scenarios.append(custom_scen)

        # 6. Recommendation: dynamically updates based on evaluation outcomes
        if custom_delta_v_ms is not None and "custom_scen" in locals():
            if custom_scen.risk_reduction_pct >= 20.0:
                recommendation = (
                    f"Custom maneuver ({custom_scen.delta_v_ms:.1f} m/s {custom_scen.direction}) achieves {custom_scen.risk_reduction_pct:.1f}% risk reduction, "
                    f"increasing simulated separation to {custom_scen.miss_distance_km:.2f} km ({custom_scen.risk_level} risk). "
                    f"Simulated separation improved compared with baseline."
                )
            elif custom_scen.risk_reduction_pct > 0.0:
                recommendation = (
                    f"Custom maneuver improves simulated separation to {custom_scen.miss_distance_km:.2f} km, but prototype risk remains {custom_scen.risk_level} ({custom_scen.risk_score:.0f}/100). "
                    f"Consider increasing delta-V or execution lead time to clear the safety volume."
                )
            else:
                recommendation = (
                    f"Current custom maneuver parameters do not reduce the prototype risk score ({custom_scen.risk_score:.0f}/100). "
                    f"Consider evaluating another trajectory or increasing delta-V expenditure."
                )
        else:
            recommendation = (
                f"Scenario B achieves the highest risk reduction ({scenario_b.risk_reduction_pct}%) "
                f"increasing miss distance to {scenario_b.miss_distance_km} km (Risk Level: {scenario_b.risk_level}). "
                f"If delta-V budget is constrained, Scenario A provides adequate separation ({scenario_a.miss_distance_km} km)."
            )

        return ManeuverSimulationResponse(
            conjunction_id=event.id,
            primary_name=event.primary_name,
            secondary_name=event.secondary_name,
            original_miss_distance_km=event.miss_distance_km,
            original_risk_score=event.risk_score,
            original_risk_level=event.risk_level,
            tca=event.tca,
            scenarios=scenarios,
            recommendation=recommendation,
            simulation_notes="Hypothetical maneuver simulation — decision support only. Not an operational spacecraft command."
        )

simulation_engine = SimulationEngine()
