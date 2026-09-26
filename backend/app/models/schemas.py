from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
from datetime import datetime

class SatelliteObject(BaseModel):
    norad_id: str
    name: str
    object_type: str = "PAYLOAD"  # "PAYLOAD", "DEBRIS", "ROCKET BODY", "SPACE STATION"
    orbit_type: str = "LEO"      # "LEO", "MEO", "GEO", "SSO"
    tle_line1: str
    tle_line2: str
    epoch: str
    latitude: float
    longitude: float
    altitude_km: float
    velocity_kms: float
    inclination_deg: float
    period_min: float
    status: str = "ACTIVE"       # "ACTIVE", "INACTIVE", "DEBRIS"
    last_updated: str

class TrajectoryPoint(BaseModel):
    time: str
    lat: float
    lon: float
    alt_km: float
    x_km: float
    y_km: float
    z_km: float

class SatelliteTrajectory(BaseModel):
    norad_id: str
    name: str
    points: List[TrajectoryPoint]
    epoch: str

class ConjunctionEvent(BaseModel):
    id: str
    primary_id: str
    primary_name: str
    secondary_id: str
    secondary_name: str
    tca: str                         # UTC ISO timestamp
    miss_distance_km: float
    relative_velocity_kms: float
    time_to_tca_hours: float
    risk_score: float                # 0 - 100 prototype calibrated score
    risk_level: str                  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    risk_factors: List[str]          # Physical explainability factor breakdown
    altitude_km: float
    is_demo: bool = False
    status: str = "ACTIVE"

class ManeuverRequest(BaseModel):
    conjunction_id: str = "CONJ-2026-0104"
    delta_v_ms: float = 20.0         # meters per second
    direction: str = "RETROGRADE"    # "PROGRADE", "RETROGRADE", "RADIAL", "NORMAL"
    timing_offset_hours: float = 6.0 # hours prior to TCA

    @model_validator(mode='before')
    @classmethod
    def normalize_fields(cls, data: Any):
        if isinstance(data, dict):
            cid = data.get("conjunction_id") or data.get("conjunctionId") or data.get("id")
            if cid:
                data["conjunction_id"] = str(cid)
            dv = data.get("delta_v_ms") if data.get("delta_v_ms") is not None else data.get("deltaV")
            if dv is None and "delta_v" in data:
                dv = data.get("delta_v")
            if dv is not None:
                data["delta_v_ms"] = float(dv)
            dir_val = data.get("direction") or data.get("thrust_direction") or data.get("thrustDirection")
            if dir_val:
                data["direction"] = str(dir_val)
            lead = (
                data.get("timing_offset_hours")
                if data.get("timing_offset_hours") is not None
                else data.get("leadTime")
            )
            if lead is None:
                lead = (
                    data.get("execution_lead_hours")
                    or data.get("lead_time_hours")
                    or data.get("lead_time")
                    or data.get("timing_hours")
                )
            if lead is not None:
                data["timing_offset_hours"] = float(lead)
        return data

    model_config = {
        "populate_by_name": True,
        "extra": "ignore"
    }

class ScenarioComparisonItem(BaseModel):
    scenario_id: str
    name: str
    delta_v_ms: float
    delta_v_kms: float
    direction: str
    burn_time_before_tca_h: float
    miss_distance_km: float
    risk_score: float
    risk_level: str
    miss_distance_delta_km: float
    risk_reduction_pct: float
    description: str

class ManeuverSimulationResponse(BaseModel):
    conjunction_id: str
    primary_name: str
    secondary_name: str
    original_miss_distance_km: float
    original_risk_score: float
    original_risk_level: str
    tca: str
    scenarios: List[ScenarioComparisonItem]
    recommendation: str
    simulation_notes: str

class DashboardSummary(BaseModel):
    tracked_objects_count: int
    active_conjunctions_count: int
    high_risk_count: int
    critical_count: int
    active_alerts_count: int
    system_status: str = "System Ready"
    last_updated: str
    system_load: str = "Normal"
    screening_window_hours: float
    data_source_status: str = "Cached TLE"

class FleetStatusBreakdown(BaseModel):
    active: int
    inactive: int
    debris: int
    total: int

class AnalyticsSummary(BaseModel):
    fleet_status: FleetStatusBreakdown
    risk_distribution: Dict[str, int]
    anomaly_timeline: List[Dict[str, Any]]
    orbits_per_period: List[Dict[str, Any]]
    critical_events: List[Dict[str, Any]]
    screening_stats: Dict[str, Any]
