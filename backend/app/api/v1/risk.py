import logging
from fastapi import APIRouter, HTTPException
from app.services.conjunction_engine import conjunction_engine
from app.services.ml_risk_engine import ml_risk_engine

router = APIRouter(prefix="/risk", tags=["Risk Assessment (v1)"])
logger = logging.getLogger(__name__)

@router.get("/{conjunction_id}")
def get_risk_assessment(conjunction_id: str):
    """
    Returns explainable risk assessment for a conjunction event.
    Combines analytical scoring and Random Forest machine learning classification.
    """
    event = conjunction_engine.get_by_id(conjunction_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Conjunction event {conjunction_id} not found.")

    assessment = ml_risk_engine.get_full_assessment(
        conjunction_id=event.id,
        miss_distance_km=event.miss_distance_km,
        relative_velocity_kms=event.relative_velocity_kms,
        time_to_tca_hours=event.time_to_tca_hours,
        altitude_km=event.altitude_km
    )

    return assessment
