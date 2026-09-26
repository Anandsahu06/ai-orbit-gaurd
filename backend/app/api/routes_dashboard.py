import logging
from datetime import datetime, timezone
from fastapi import APIRouter
from app.services.tle_service import tle_service
from app.services.conjunction_engine import conjunction_engine
from app.models.schemas import DashboardSummary
from app.core.config import settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary():
    """
    Returns high-level operational statistics and KPI counts.
    """
    objects = tle_service.get_all_objects()
    conjunctions = conjunction_engine.get_all()

    high_risk = sum(1 for c in conjunctions if c.risk_level in ["HIGH", "CRITICAL"])
    critical = sum(1 for c in conjunctions if c.risk_level == "CRITICAL")
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    data_status = "Connected · Public TLE" if tle_service._last_fetch_time is not None else "Cached TLE"

    return DashboardSummary(
        tracked_objects_count=len(objects),
        active_conjunctions_count=len(conjunctions),
        high_risk_count=high_risk,
        critical_count=critical,
        active_alerts_count=high_risk,
        system_status="System Ready",
        last_updated=now_str,
        system_load="Normal",
        screening_window_hours=settings.DEFAULT_SCREENING_WINDOW_HOURS,
        data_source_status=data_status
    )
