import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Depends, Query
from pydantic import BaseModel
from app.core.config import settings
from app.services.data_ingestion.scheduler import ingestion_scheduler
from app.services.data_ingestion.celestrak_provider import celestrak_provider
from app.services.data_ingestion.cache import ingestion_cache
from app.services.conjunction_engine import conjunction_engine

router = APIRouter(prefix="/admin/data", tags=["Admin (Protected)"])
logger = logging.getLogger(__name__)

def verify_admin_key(x_admin_key: Optional[str] = Header(None)):
    if not x_admin_key or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Invalid or missing X-Admin-Key header."
        )
    return True

class RefreshRequest(BaseModel):
    groups: Optional[List[str]] = None
    force_refresh: bool = False

@router.post("/refresh", dependencies=[Depends(verify_admin_key)])
def trigger_data_refresh(body: Optional[RefreshRequest] = None):
    """
    Manually triggers an orbital data sync cycle from CelesTrak.
    Protected endpoint requiring administrative authentication.
    """
    groups = body.groups if body else None
    result = ingestion_scheduler.run_ingestion_cycle(groups=groups)
    # Re-run conjunction screening on updated dataset
    conjunction_engine.run_screening()
    return {
        "message": "Orbital data ingestion and screening cycle completed successfully.",
        "details": result
    }

@router.get("/status", dependencies=[Depends(verify_admin_key)])
def get_data_ingestion_status():
    """
    Returns upstream CelesTrak reachability, data freshness, and cache health.
    """
    health = celestrak_provider.health_check()
    meta = ingestion_cache.get_metadata()

    return {
        "upstream_provider": {
            "name": health.provider_name,
            "is_healthy": health.is_healthy,
            "status_code": health.status_code,
            "response_time_ms": health.response_time_ms,
            "message": health.message
        },
        "cache_and_freshness": meta,
        "configured_groups": settings.celestrak_group_list,
        "refresh_interval_hours": settings.DATA_REFRESH_INTERVAL_HOURS
    }
