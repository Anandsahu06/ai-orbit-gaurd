import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Body
from app.services.simulation_engine import simulation_engine
from app.models.schemas import ManeuverRequest, ManeuverSimulationResponse

router = APIRouter(prefix="/simulation", tags=["Avoidance Simulation"])
logger = logging.getLogger(__name__)

@router.post("", response_model=ManeuverSimulationResponse)
@router.post("/evaluate", response_model=ManeuverSimulationResponse)
def evaluate_avoidance_scenario(req: ManeuverRequest):
    """
    Evaluates baseline vs Scenario A vs Scenario B, plus the user-customized burn parameters.
    Returns comparison metrics: delta-V, resulting separation, updated ML risk score, and risk reduction.
    """
    result = simulation_engine.simulate_maneuver(
        conjunction_id=req.conjunction_id,
        custom_delta_v_ms=req.delta_v_ms,
        custom_direction=req.direction,
        custom_timing_hours=req.timing_offset_hours
    )
    if not result:
        raise HTTPException(status_code=404, detail="Conjunction event not found for simulation.")
    return result

@router.get("/scenarios/{conjunction_id}", response_model=ManeuverSimulationResponse)
def get_default_scenarios(conjunction_id: str):
    """
    Returns standard baseline vs Scenario A vs Scenario B evaluation for a conjunction.
    """
    result = simulation_engine.simulate_maneuver(conjunction_id=conjunction_id)
    if not result:
        raise HTTPException(status_code=404, detail="Conjunction event not found for simulation.")
    return result
