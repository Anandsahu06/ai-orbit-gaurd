import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.conjunction_engine import conjunction_engine
from app.models.schemas import ConjunctionEvent

router = APIRouter(prefix="/conjunctions", tags=["Conjunctions"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[ConjunctionEvent])
def list_conjunctions(
    risk_level: Optional[str] = Query(None, description="Filter by risk level (LOW, MEDIUM, HIGH, CRITICAL)"),
    search: Optional[str] = Query(None, description="Search by object name or ID")
):
    """
    Returns list of screened close approach conjunction events.
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
        filtered.append(ev)

    return filtered

@router.get("/{event_id}", response_model=ConjunctionEvent)
def get_conjunction_event(event_id: str):
    """
    Returns full details, TCA, physical parameters, and risk factors for a conjunction.
    """
    ev = conjunction_engine.get_by_id(event_id)
    if not ev:
        raise HTTPException(status_code=404, detail=f"Conjunction event {event_id} not found.")
    return ev
