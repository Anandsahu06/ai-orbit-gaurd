import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.repositories.satellite_repository import satellite_repo
from app.services.orbital_engine import orbital_engine
from app.services.data_ingestion.cache import ingestion_cache

router = APIRouter(prefix="/satellites", tags=["Satellites (v1)"])
logger = logging.getLogger(__name__)

@router.get("")
def list_satellites(
    query: Optional[str] = Query(None, description="Search by satellite name or NORAD catalog number"),
    object_type: Optional[str] = Query(None, description="Filter by object type (PAYLOAD, DEBRIS, SPACE STATION)"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Returns list of tracked orbital objects from public orbital catalogs with SGP4 propagated state.
    """
    satellites = satellite_repo.list_satellites(db, query=query, object_type=object_type, limit=limit)
    results = []
    now = datetime.now(timezone.utc)

    for sat in satellites:
        latest_el = satellite_repo.get_latest_orbital_element(db, sat.id)
        state = None
        data_age_h = None
        epoch_str = None

        if latest_el:
            state = orbital_engine.propagate_element(latest_el, now)
            epoch_dt = latest_el.epoch
            if epoch_dt.tzinfo is None:
                epoch_dt = epoch_dt.replace(tzinfo=timezone.utc)
            data_age_h = round((now - epoch_dt).total_seconds() / 3600.0, 2)
            epoch_str = epoch_dt.isoformat()

        results.append({
            "id": str(sat.norad_id),
            "norad_id": sat.norad_id,
            "name": sat.name,
            "object_type": sat.object_type,
            "international_designator": sat.international_designator,
            "country_owner": sat.country_owner,
            "status": sat.status,
            "source": latest_el.source if latest_el else "CELESTRAK",
            "epoch": epoch_str,
            "data_age_hours": data_age_h,
            "current_state": state
        })

    return results

@router.get("/{norad_id}")
def get_satellite(norad_id: int, db: Session = Depends(get_db)):
    """
    Returns detailed satellite metadata and current orbital parameters.
    """
    sat = satellite_repo.get_by_norad_id(db, norad_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite with NORAD ID {norad_id} not found in catalog.")

    latest_el = satellite_repo.get_latest_orbital_element(db, sat.id)
    now = datetime.now(timezone.utc)
    state = orbital_engine.propagate_element(latest_el, now) if latest_el else None

    return {
        "norad_id": sat.norad_id,
        "name": sat.name,
        "object_type": sat.object_type,
        "international_designator": sat.international_designator,
        "status": sat.status,
        "source": latest_el.source if latest_el else "CELESTRAK",
        "orbital_elements": {
            "epoch": latest_el.epoch.isoformat() if latest_el else None,
            "mean_motion": latest_el.mean_motion if latest_el else None,
            "eccentricity": latest_el.eccentricity if latest_el else None,
            "inclination": latest_el.inclination if latest_el else None,
            "ra_of_asc_node": latest_el.ra_of_asc_node if latest_el else None,
            "arg_of_pericenter": latest_el.arg_of_pericenter if latest_el else None,
            "mean_anomaly": latest_el.mean_anomaly if latest_el else None,
            "bstar": latest_el.bstar if latest_el else None
        } if latest_el else None,
        "current_state": state
    }

@router.get("/{norad_id}/state")
def get_satellite_state(
    norad_id: int,
    timestamp: Optional[str] = Query(None, description="Optional target UTC ISO timestamp for propagation"),
    db: Session = Depends(get_db)
):
    """
    Calculates SGP4 propagated orbital state at a specific timestamp.
    Coordinate frame: WGS84 Geodetic + ECEF Cartesian.
    """
    sat = satellite_repo.get_by_norad_id(db, norad_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite with NORAD ID {norad_id} not found.")

    latest_el = satellite_repo.get_latest_orbital_element(db, sat.id)
    if not latest_el:
        raise HTTPException(status_code=404, detail=f"No orbital elements available for satellite {norad_id}.")

    target_dt = datetime.now(timezone.utc)
    if timestamp:
        try:
            target_dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid timestamp format. Use ISO-8601 (e.g. 2026-03-21T12:00:00Z).")

    state = orbital_engine.propagate_element(latest_el, target_dt)
    if not state:
        raise HTTPException(status_code=500, detail="SGP4 propagation failed for the specified epoch.")

    return {
        "norad_id": sat.norad_id,
        "name": sat.name,
        **state
    }

@router.get("/{norad_id}/orbit")
def get_satellite_orbit_path(
    norad_id: int,
    start_time: Optional[str] = Query(None, description="Propagation start ISO timestamp (default: current UTC)"),
    duration_minutes: float = Query(90.0, ge=10.0, le=720.0, description="Propagation span in minutes"),
    step_seconds: int = Query(60, ge=10, le=600, description="Step resolution between orbit trajectory samples"),
    db: Session = Depends(get_db)
):
    """
    Generates high-precision SGP4 orbital path trajectory samples for frontend 3D globe visualization.
    Backend calculates, frontend visualizes.
    """
    sat = satellite_repo.get_by_norad_id(db, norad_id)
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite with NORAD ID {norad_id} not found.")

    latest_el = satellite_repo.get_latest_orbital_element(db, sat.id)
    if not latest_el:
        raise HTTPException(status_code=404, detail=f"No orbital elements available for satellite {norad_id}.")

    start_dt = datetime.now(timezone.utc)
    if start_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid start_time format. Use ISO-8601.")

    points = orbital_engine.generate_orbit_path(
        element=latest_el,
        start_time=start_dt,
        duration_minutes=duration_minutes,
        step_seconds=step_seconds
    )

    return {
        "norad_id": sat.norad_id,
        "name": sat.name,
        "start_time": start_dt.isoformat(),
        "duration_minutes": duration_minutes,
        "step_seconds": step_seconds,
        "point_count": len(points),
        "frame": "WGS84",
        "points": points
    }
