import math
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
import numpy as np
from sgp4.api import Satrec, jday
from app.services.tle_service import tle_service
from app.models.schemas import SatelliteObject, TrajectoryPoint, SatelliteTrajectory

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6378.137
FLATTENING = 1.0 / 298.257223563

def datetime_to_jd_fr(dt: datetime) -> Tuple[float, float]:
    """Converts a UTC datetime object to Julian date and fraction."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond * 1e-6)

def gmst_from_jd(jd: float, fr: float) -> float:
    """Calculates Greenwich Mean Sidereal Time in radians from Julian Date."""
    d = (jd - 2451545.0) + fr
    gmst_hours = 18.697374558 + 24.06570982441908 * d
    gmst_rad = (gmst_hours % 24.0) * (2.0 * math.pi / 24.0)
    return gmst_rad

def teme_to_ecef(r_teme: Tuple[float, float, float], gmst: float) -> Tuple[float, float, float]:
    """Rotates position vector from TEME to ECEF coordinate frame."""
    x, y, z = r_teme
    cos_g = math.cos(gmst)
    sin_g = math.sin(gmst)
    x_ecef = cos_g * x + sin_g * y
    y_ecef = -sin_g * x + cos_g * y
    z_ecef = z
    return (x_ecef, y_ecef, z_ecef)

def ecef_to_geodetic(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """
    Converts ECEF Cartesian coordinates (km) to Geodetic Latitude (deg),
    Longitude (deg), and Altitude (km) using Bowring's closed-form algorithm.
    """
    a = EARTH_RADIUS_KM
    f = FLATTENING
    b = a * (1.0 - f)
    e2 = (a**2 - b**2) / (a**2)
    e_prime2 = (a**2 - b**2) / (b**2)

    p = math.sqrt(x**2 + y**2)
    if p < 1e-6:
        lat = 90.0 if z > 0 else -90.0
        lon = 0.0
        alt = abs(z) - b
        return lat, lon, alt

    theta = math.atan2(z * a, p * b)
    lat = math.atan2(
        z + e_prime2 * b * (math.sin(theta)**3),
        p - e2 * a * (math.cos(theta)**3)
    )
    lon = math.atan2(y, x)
    
    sin_lat = math.sin(lat)
    cos_lat = math.cos(lat)
    N = a / math.sqrt(1.0 - e2 * (sin_lat**2))
    alt = (p / cos_lat) - N

    lat_deg = math.degrees(lat)
    lon_deg = math.degrees(lon)
    return lat_deg, lon_deg, alt

class OrbitalEngine:
    def propagate_position(self, norad_id: str, dt: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        if dt is None:
            dt = datetime.now(timezone.utc)
        
        satrec = tle_service.get_satrec(norad_id)
        if not satrec:
            return None

        jd, fr = datetime_to_jd_fr(dt)
        e, r_teme, v_teme = satrec.sgp4(jd, fr)

        if e != 0:
            logger.warning(f"SGP4 error code {e} for NORAD ID {norad_id}")
            return None

        gmst = gmst_from_jd(jd, fr)
        x_ecef, y_ecef, z_ecef = teme_to_ecef(r_teme, gmst)
        lat, lon, alt = ecef_to_geodetic(x_ecef, y_ecef, z_ecef)

        speed_kms = math.sqrt(v_teme[0]**2 + v_teme[1]**2 + v_teme[2]**2)

        return {
            "dt": dt.isoformat(),
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "alt_km": round(alt, 2),
            "velocity_kms": round(speed_kms, 3),
            "x_ecef": round(x_ecef, 2),
            "y_ecef": round(y_ecef, 2),
            "z_ecef": round(z_ecef, 2),
            "r_teme": r_teme,
            "v_teme": v_teme
        }

    def get_satellite_details(self, norad_id: str) -> Optional[SatelliteObject]:
        raw = tle_service.get_object(norad_id)
        if not raw:
            return None

        satrec = tle_service.get_satrec(norad_id)
        now = datetime.now(timezone.utc)
        prop = self.propagate_position(norad_id, now)

        # Orbital parameters from satrec
        inc_deg = round(math.degrees(satrec.inclo), 2) if satrec else 51.6
        # Mean motion revs/day to period in minutes
        mean_motion = (satrec.no_kozai * 1440.0 / (2.0 * math.pi)) if satrec else 15.0
        period_min = round(1440.0 / mean_motion, 2) if mean_motion > 0 else 92.5

        lat = prop["lat"] if prop else 0.0
        lon = prop["lon"] if prop else 0.0
        alt = prop["alt_km"] if prop else 420.0
        vel = prop["velocity_kms"] if prop else 7.66

        return SatelliteObject(
            norad_id=str(raw["norad_id"]),
            name=raw["name"],
            object_type=raw.get("object_type", "PAYLOAD"),
            orbit_type=raw.get("orbit_type", "LEO"),
            tle_line1=raw["tle_line1"],
            tle_line2=raw["tle_line2"],
            epoch=now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            latitude=lat,
            longitude=lon,
            altitude_km=alt,
            velocity_kms=vel,
            inclination_deg=inc_deg,
            period_min=period_min,
            status=raw.get("status", "ACTIVE"),
            last_updated=now.isoformat()
        )

    def generate_orbit_trajectory(self, norad_id: str, num_points: int = 72) -> Optional[SatelliteTrajectory]:
        """
        Generates one full orbital period trajectory sampled at discrete points.
        Returns coordinates formatted for 3D Cesium visualization.
        """
        raw = tle_service.get_object(norad_id)
        satrec = tle_service.get_satrec(norad_id)
        if not raw or not satrec:
            return None

        now = datetime.now(timezone.utc)
        mean_motion = satrec.no_kozai * 1440.0 / (2.0 * math.pi)
        period_min = (1440.0 / mean_motion) if mean_motion > 0 else 92.0
        step_seconds = (period_min * 60.0) / num_points

        points: List[TrajectoryPoint] = []
        for i in range(num_points + 1):
            sample_time = now + timedelta(seconds=i * step_seconds)
            jd, fr = datetime_to_jd_fr(sample_time)
            e, r_teme, _ = satrec.sgp4(jd, fr)
            if e == 0:
                gmst = gmst_from_jd(jd, fr)
                x_ecef, y_ecef, z_ecef = teme_to_ecef(r_teme, gmst)
                lat, lon, alt = ecef_to_geodetic(x_ecef, y_ecef, z_ecef)
                points.append(TrajectoryPoint(
                    time=sample_time.isoformat(),
                    lat=round(lat, 4),
                    lon=round(lon, 4),
                    alt_km=round(alt, 2),
                    x_km=round(x_ecef, 2),
                    y_km=round(y_ecef, 2),
                    z_km=round(z_ecef, 2)
                ))

        return SatelliteTrajectory(
            norad_id=str(norad_id),
            name=raw["name"],
            points=points,
            epoch=now.isoformat()
        )

orbital_engine = OrbitalEngine()
