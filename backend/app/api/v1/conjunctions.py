import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.conjunction_engine import conjunction_engine

router = APIRouter(prefix="/conjunctions", tags=["Conjunctions (v1)"])
logger = logging.getLogger(__name__)

@router.get("")
def list_conjunctions(
    risk_level: Optional[str] = Query(None, description="Filter by risk tier (LOW, MEDIUM, HIGH, CRITICAL)"),
    search: Optional[str] = Query(None, description="Search by object name or NORAD catalog number")
):
    """
    Returns screened orbital close approach events derived from SGP4 propagation.
    """
    events = conjunction_engine.get_all()
    filtered = []

    for ev in events:
        if risk_level and risk_level.upper() != "ALL":
            if ev.risk_level.upper() != risk_level.upper():
                continue

        if search:
            q = search.lower().strip()
            if (q not in ev.primary_name.lower() and
                q not in ev.secondary_name.lower() and
                q not in ev.primary_id and
                q not in ev.secondary_id):
                continue

        filtered.append({
            "id": ev.id,
            "primary_object": {
                "id": ev.primary_id,
                "name": ev.primary_name,
                "norad_id": int(ev.primary_id) if ev.primary_id.isdigit() else 0
            },
            "secondary_object": {
                "id": ev.secondary_id,
                "name": ev.secondary_name,
                "norad_id": int(ev.secondary_id) if ev.secondary_id.isdigit() else 0
            },
            "tca": ev.tca,
            "time_to_tca_hours": ev.time_to_tca_hours,
            "miss_distance_km": ev.miss_distance_km,
            "relative_velocity_kms": ev.relative_velocity_kms,
            "risk_score": ev.risk_score,
            "risk_level": ev.risk_level,
            "altitude_km": ev.altitude_km,
            "risk_factors": ev.risk_factors,
            "status": ev.status
        })

    return filtered

@router.get("/{conjunction_id}")
def get_conjunction(conjunction_id: str):
    """
    Returns full physical and analytical close-approach geometry for a conjunction.
    """
    ev = conjunction_engine.get_by_id(conjunction_id)
    if not ev:
        raise HTTPException(status_code=404, detail=f"Conjunction event {conjunction_id} not found.")

    return {
        "id": ev.id,
        "primary_object": {
            "id": ev.primary_id,
            "name": ev.primary_name,
            "norad_id": int(ev.primary_id) if ev.primary_id.isdigit() else 0
        },
        "secondary_object": {
            "id": ev.secondary_id,
            "name": ev.secondary_name,
            "norad_id": int(ev.secondary_id) if ev.secondary_id.isdigit() else 0
        },
        "tca": ev.tca,
        "time_to_tca_hours": ev.time_to_tca_hours,
        "miss_distance_km": ev.miss_distance_km,
        "relative_velocity_kms": ev.relative_velocity_kms,
        "risk_score": ev.risk_score,
        "risk_level": ev.risk_level,
        "altitude_km": ev.altitude_km,
        "risk_factors": ev.risk_factors,
        "status": ev.status
    }
