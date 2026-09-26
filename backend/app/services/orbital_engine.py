import math
import logging
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime, timezone, timedelta
import numpy as np
from sgp4.api import Satrec, WGS72, jday
from app.models.schemas import SatelliteObject, TrajectoryPoint, SatelliteTrajectory
from app.models.db_models import Satellite, OrbitalElement
from app.services.data_ingestion.provider import NormalizedOrbitalRecord

logger = logging.getLogger(__name__)

# WGS84 Reference Ellipsoid Parameters
EARTH_RADIUS_KM = 6378.137
FLATTENING = 1.0 / 298.257223563
EARTH_MU = 398600.4418 # km^3 / s^2

def compute_apogee_perigee(mean_motion_rev_day: float, eccentricity: float) -> Tuple[float, float]:
    """
    Computes perigee and apogee altitudes (km) above spherical Earth.
    mean_motion: rev/day
    """
    n_rad_s = (mean_motion_rev_day * 2.0 * math.pi) / 86400.0
    a = (EARTH_MU / (n_rad_s ** 2)) ** (1.0 / 3.0)
    perigee_km = a * (1.0 - eccentricity) - EARTH_RADIUS_KM
    apogee_km = a * (1.0 + eccentricity) - EARTH_RADIUS_KM
    return perigee_km, apogee_km


def datetime_to_jd_fr(dt: datetime) -> Tuple[float, float]:
    """
    Converts a UTC datetime object to Julian date and fraction.
    Handles timezone-aware and naive datetimes safely.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond * 1e-6)

def gmst_from_jd(jd: float, fr: float) -> float:
    """
    Calculates Greenwich Mean Sidereal Time (GMST) in radians from Julian Date and fraction.
    GMST rotates True Equator Mean Equinox (TEME) coordinates to Earth-Centered, Earth-Fixed (ECEF).
    """
    d = (jd - 2451545.0) + fr
    gmst_hours = 18.697374558 + 24.06570982441908 * d
    gmst_rad = (gmst_hours % 24.0) * (2.0 * math.pi / 24.0)
    return gmst_rad

def teme_to_ecef(r_teme: Tuple[float, float, float], gmst: float) -> Tuple[float, float, float]:
    """
    Rotates position vector from TEME inertial frame to ECEF rotating frame.
    x_ecef =  cos(θ) * x_teme + sin(θ) * y_teme
    y_ecef = -sin(θ) * x_teme + cos(θ) * y_teme
    z_ecef =  z_teme
    """
    x, y, z = r_teme
    cos_g = math.cos(gmst)
    sin_g = math.sin(gmst)
    x_ecef = cos_g * x + sin_g * y
    y_ecef = -sin_g * x + cos_g * y
    z_ecef = z
    return (x_ecef, y_ecef, z_ecef)

def teme_velocity_to_ecef(
    r_teme: Tuple[float, float, float],
    v_teme: Tuple[float, float, float],
    gmst: float
) -> Tuple[float, float, float]:
    """
    Transforms velocity vector from TEME to ECEF including Earth rotation Coriolis term (ω × r).
    Earth angular velocity ω_e ≈ 7.292115e-5 rad/s.
    """
    omega_e = 7.292115e-5 # rad/s
    x, y, z = r_teme
    vx, vy, vz = v_teme
    cos_g = math.cos(gmst)
    sin_g = math.sin(gmst)

    # Inertial velocity rotated to ECEF axes
    vx_rot = cos_g * vx + sin_g * vy
    vy_rot = -sin_g * vx + cos_g * vy
    vz_rot = vz

    # ECEF position
    x_ecef, y_ecef, z_ecef = teme_to_ecef(r_teme, gmst)

    # Relative velocity in rotating frame: v_ecef = v_rot - (ω × r_ecef)
    vx_ecef = vx_rot + omega_e * y_ecef
    vy_ecef = vy_rot - omega_e * x_ecef
    vz_ecef = vz_rot

    return (vx_ecef, vy_ecef, vz_ecef)

def ecef_to_geodetic(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """
    Converts ECEF Cartesian coordinates (km) to Geodetic Latitude (deg),
    Longitude (deg), and Altitude (km) using Bowring's closed-form algorithm.
    Accurate to within millimeters for low Earth and geostationary orbits.
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

def satrec_from_orbital_element(el: Union[OrbitalElement, NormalizedOrbitalRecord]) -> Satrec:
    """
    Initializes an SGP4 Satrec object from an OrbitalElement model.
    Prefers standard TLE lines when available, or initializes from GP parameters.
    """
    tle1 = getattr(el, "tle_line1", None)
    tle2 = getattr(el, "tle_line2", None)

    if tle1 and tle2 and len(tle1) >= 68 and len(tle2) >= 68:
        try:
            return Satrec.twoline2rv(tle1, tle2)
        except Exception as e:
            logger.debug(f"twoline2rv failed ({e}), falling back to sgp4init.")

    # Direct initialization via sgp4init
    satrec = Satrec()
    epoch = el.epoch
    if epoch.tzinfo is None:
        epoch = epoch.replace(tzinfo=timezone.utc)

    # Days from 1949 Dec 31 00:00:00 UTC (SGP4 epoch basis)
    epoch_jd, epoch_fr = jday(epoch.year, epoch.month, epoch.day, epoch.hour, epoch.minute, epoch.second + epoch.microsecond * 1e-6)
    epoch_days = (epoch_jd - 2433281.5) + epoch_fr

    satnum = int(getattr(el, "norad_id", 0)) if hasattr(el, "norad_id") else 0
    bstar = float(getattr(el, "bstar", 0.0))
    ndot = float(getattr(el, "mean_motion_dot", 0.0)) / (1440.0 * 1440.0) # revs/min^2
    nddot = float(getattr(el, "mean_motion_ddot", 0.0)) / (1440.0 * 1440.0 * 1440.0)
    ecco = float(getattr(el, "eccentricity", 0.0))
    argpo = math.radians(float(getattr(el, "arg_of_pericenter", 0.0)))
    inclo = math.radians(float(getattr(el, "inclination", 0.0)))
    mo = math.radians(float(getattr(el, "mean_anomaly", 0.0)))
    no_kozai = float(getattr(el, "mean_motion", 15.0)) * (2.0 * math.pi / 1440.0) # rad/min
    nodeo = math.radians(float(getattr(el, "ra_of_asc_node", 0.0)))

    satrec.sgp4init(
        WGS72, 'i', satnum, epoch_days, bstar, ndot, nddot,
        ecco, argpo, inclo, mo, no_kozai, nodeo
    )
    return satrec

class OrbitalEngine:
    """
    SGP4 Propagator Engine and Geodetic Coordinate Transformation Pipeline.
    Strictly follows physical coordinate frame definitions:
    TEME (True Equator, Mean Equinox) -> ECEF (Earth-Centered, Earth-Fixed) -> WGS84 Geodetic.
    """

    def __init__(self):
        self._satrec_cache: Dict[str, Satrec] = {}

    def get_satrec_for_element(self, element: Union[OrbitalElement, NormalizedOrbitalRecord]) -> Satrec:
        key = f"{getattr(element, 'satellite_id', getattr(element, 'norad_id', 'unknown'))}_{element.epoch.isoformat()}"
        if key not in self._satrec_cache:
            self._satrec_cache[key] = satrec_from_orbital_element(element)
        return self._satrec_cache[key]

    def propagate_element(
        self,
        element: Union[OrbitalElement, NormalizedOrbitalRecord],
        dt: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Propagates an orbital element set to a target UTC timestamp using SGP4.
        Returns complete state in TEME, ECEF, and WGS84 geodetic coordinates.
        """
        if dt is None:
            dt = datetime.now(timezone.utc)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        satrec = self.get_satrec_for_element(element)
        jd, fr = datetime_to_jd_fr(dt)
        e, r_teme, v_teme = satrec.sgp4(jd, fr)

        if e != 0:
            logger.debug(f"SGP4 propagation error code {e} for satellite.")
            return None

        gmst = gmst_from_jd(jd, fr)
        x_ecef, y_ecef, z_ecef = teme_to_ecef(r_teme, gmst)
        vx_ecef, vy_ecef, vz_ecef = teme_velocity_to_ecef(r_teme, v_teme, gmst)
        lat, lon, alt = ecef_to_geodetic(x_ecef, y_ecef, z_ecef)
        speed_kms = math.sqrt(v_teme[0]**2 + v_teme[1]**2 + v_teme[2]**2)

        return {
            "timestamp": dt.isoformat(),
            "frame": "WGS84",
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "altitude_km": round(alt, 2),
            "velocity_kms": round(speed_kms, 3),
            "x": round(x_ecef, 3),
            "y": round(y_ecef, 3),
            "z": round(z_ecef, 3),
            "vx": round(vx_ecef, 4),
            "vy": round(vy_ecef, 4),
            "vz": round(vz_ecef, 4),
            "origin": "SGP4 propagated orbital state",
            "teme_position": r_teme,
            "teme_velocity": v_teme
        }

    def generate_orbit_path(
        self,
        element: Union[OrbitalElement, NormalizedOrbitalRecord],
        start_time: Optional[datetime] = None,
        duration_minutes: float = 90.0,
        step_seconds: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Generates sampled orbital path points over a specified duration.
        """
        if start_time is None:
            start_time = datetime.now(timezone.utc)
        elif start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        satrec = self.get_satrec_for_element(element)
        total_seconds = max(60, int(duration_minutes * 60))
        step_seconds = max(10, step_seconds)
        num_steps = total_seconds // step_seconds

        points = []
        for i in range(num_steps + 1):
            sample_t = start_time + timedelta(seconds=i * step_seconds)
            jd, fr = datetime_to_jd_fr(sample_t)
            e, r_teme, _ = satrec.sgp4(jd, fr)
            if e == 0:
                gmst = gmst_from_jd(jd, fr)
                x_ecef, y_ecef, z_ecef = teme_to_ecef(r_teme, gmst)
                lat, lon, alt = ecef_to_geodetic(x_ecef, y_ecef, z_ecef)
                points.append({
                    "timestamp": sample_t.isoformat(),
                    "latitude": round(lat, 4),
                    "longitude": round(lon, 4),
                    "altitude_km": round(alt, 2),
                    "x": round(x_ecef, 2),
                    "y": round(y_ecef, 2),
                    "z": round(z_ecef, 2)
                })

        return points

    # --- Backward compatibility methods for existing routes & test suite ---
    def propagate_position(self, norad_id: str, dt: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        from app.services.tle_service import tle_service
        if dt is None:
            dt = datetime.now(timezone.utc)

        satrec = tle_service.get_satrec(norad_id)
        if not satrec:
            return None

        jd, fr = datetime_to_jd_fr(dt)
        e, r_teme, v_teme = satrec.sgp4(jd, fr)
        if e != 0:
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
        from app.services.tle_service import tle_service
        raw = tle_service.get_object(norad_id)
        if not raw:
            return None

        satrec = tle_service.get_satrec(norad_id)
        now = datetime.now(timezone.utc)
        prop = self.propagate_position(norad_id, now)

        inc_deg = round(math.degrees(satrec.inclo), 2) if satrec else 51.6
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
            tle_line1=raw.get("tle_line1", ""),
            tle_line2=raw.get("tle_line2", ""),
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
        from app.services.tle_service import tle_service
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
