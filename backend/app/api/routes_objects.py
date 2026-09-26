import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.tle_service import tle_service
from app.services.orbital_engine import orbital_engine
from app.models.schemas import SatelliteObject, SatelliteTrajectory

router = APIRouter(prefix="/objects", tags=["Orbital Objects"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[SatelliteObject])
def list_objects(
    query: Optional[str] = Query(None, description="Search by name or NORAD ID"),
    object_type: Optional[str] = Query(None, description="Filter by object type (PAYLOAD, DEBRIS, SPACE STATION)"),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Returns list of tracked orbital objects with real-time SGP4 propagated telemetry.
    """
    raw_objects = tle_service.get_all_objects()
    results: List[SatelliteObject] = []

    for obj in raw_objects:
        norad_id = str(obj["norad_id"])
        name = obj["name"]

        # Search filter
        if query:
            q = query.lower().strip()
            if q not in name.lower() and q not in norad_id:
                continue

        # Type filter
        if object_type and object_type != "ALL":
            if obj.get("object_type", "").upper() != object_type.upper():
                continue

        details = orbital_engine.get_satellite_details(norad_id)
        if details:
            results.append(details)

        if len(results) >= limit:
            break

    return results

@router.get("/{norad_id}", response_model=SatelliteObject)
def get_object_details(norad_id: str):
    """
    Returns telemetry and orbital parameters for a single satellite.
    """
    details = orbital_engine.get_satellite_details(norad_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"Satellite with NORAD ID {norad_id} not found.")
    return details

@router.get("/{norad_id}/trajectory", response_model=SatelliteTrajectory)
def get_object_trajectory(norad_id: str, points: int = Query(72, ge=24, le=180)):
    """
    Returns 1-orbit sampled trajectory points formatted for 3D Cesium visualization.
    """
    traj = orbital_engine.generate_orbit_trajectory(norad_id, num_points=points)
    if not traj:
        raise HTTPException(status_code=404, detail=f"Trajectory for NORAD ID {norad_id} could not be calculated.")
    return traj
