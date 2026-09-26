import logging
from typing import List, Optional
from fastapi import APIRouter, Query
from app.services.alerts.alert_service import alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts (v1)"])
logger = logging.getLogger(__name__)

@router.get("")
def list_alerts(limit: int = Query(50, ge=1, le=200)):
    """
    Returns active and recent STM alerts with deduplication applied.
    """
    return alert_service.get_recent_alerts(limit=limit)
