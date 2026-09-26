import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Path
from app.models.schemas import ManeuverRequest, ManeuverSimulationResponse
from app.services.simulation_engine import simulation_engine

router = APIRouter(prefix="/simulations", tags=["Simulations (v1)"])
logger = logging.getLogger(__name__)

@router.post("", response_model=ManeuverSimulationResponse)
def run_simulation(req: ManeuverRequest):
    """
    Simulates a hypothetical collision avoidance maneuver.
    Physics-inspired prototype simulation. Not certified for flight dynamics execution.
    """
    res = simulation_engine.simulate_maneuver(
        conjunction_id=req.conjunction_id,
        custom_delta_v_ms=req.delta_v_ms,
        custom_direction=req.direction,
        custom_timing_hours=req.timing_offset_hours
    )
    if not res:
        raise HTTPException(status_code=404, detail=f"Conjunction {req.conjunction_id} could not be simulated.")
    return res

@router.get("/{conjunction_id}", response_model=ManeuverSimulationResponse)
def get_simulation_scenarios(conjunction_id: str = Path(..., description="Target conjunction event ID")):
    """
    Retrieves baseline and standard preset avoidance maneuver scenarios for a conjunction.
    """
    res = simulation_engine.simulate_maneuver(conjunction_id=conjunction_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Simulation scenarios for {conjunction_id} not found.")
    return res
