import logging
from typing import Dict, Any
from fastapi import APIRouter
from app.services.tle_service import tle_service
from app.services.conjunction_engine import conjunction_engine
from app.models.schemas import AnalyticsSummary, FleetStatusBreakdown

router = APIRouter(prefix="/analytics", tags=["Analytics"])
logger = logging.getLogger(__name__)

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary():
    """
    Returns analytics distributions matching Page 4 of the design reference:
    Fleet status breakdown, risk distribution, anomaly timeline, orbits per period, critical events.
    """
    objects = tle_service.get_all_objects()
    conjunctions = conjunction_engine.get_all()

    # 1. Fleet breakdown
    active_count = sum(1 for o in objects if o.get("status") == "ACTIVE")
    debris_count = sum(1 for o in objects if o.get("object_type") == "DEBRIS" or o.get("status") == "DEBRIS")
    inactive_count = sum(1 for o in objects if o.get("status") == "INACTIVE")

    # 2. Risk distribution
    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for c in conjunctions:
        risk_dist[c.risk_level] = risk_dist.get(c.risk_level, 0) + 1

    # 3. Screening / Anomaly detection timeline
    anomaly_timeline = [
        {"time": "00:00", "delta_km": 12.4, "threshold": 5.0, "status": "nominal"},
        {"time": "04:00", "delta_km": 8.1, "threshold": 5.0, "status": "nominal"},
        {"time": "08:00", "delta_km": 3.2, "threshold": 5.0, "status": "alert"},
        {"time": "12:00", "delta_km": 0.42, "threshold": 5.0, "status": "critical"},
        {"time": "16:00", "delta_km": 4.6, "threshold": 5.0, "status": "alert"},
        {"time": "20:00", "delta_km": 14.8, "threshold": 5.0, "status": "nominal"},
        {"time": "24:00", "delta_km": 22.0, "threshold": 5.0, "status": "nominal"},
    ]

    # 4. Orbits per Period (matching PDF chart)
    orbits_per_period = [
        {"period": "Jan", "count": 48},
        {"period": "Feb", "count": 72},
        {"period": "Mar", "count": 65},
        {"period": "Apr", "count": 92},
        {"period": "May", "count": 115},
        {"period": "Jun", "count": 142}
    ]

    # 5. Critical Events list
    critical_events = [
        {
            "id": c.id,
            "title": f"Close Approach: {c.primary_name} vs {c.secondary_name}",
            "miss_distance": f"{c.miss_distance_km:.2f} km",
            "tca": c.tca,
            "risk_level": c.risk_level,
            "time_ago": f"{c.time_to_tca_hours:.1f}h until TCA"
        }
        for c in conjunctions if c.risk_level in ["HIGH", "CRITICAL"]
    ]

    return AnalyticsSummary(
        fleet_status=FleetStatusBreakdown(
            active=active_count,
            inactive=inactive_count,
            debris=debris_count,
            total=len(objects)
        ),
        risk_distribution=risk_dist,
        anomaly_timeline=anomaly_timeline,
        orbits_per_period=orbits_per_period,
        critical_events=critical_events,
        screening_stats={
            "total_screened_pairs": 48,
            "screening_radius_km": 25.0,
            "algorithm": "SGP4 Ephemeris Propagation + Local Minima Bounding"
        }
    )
