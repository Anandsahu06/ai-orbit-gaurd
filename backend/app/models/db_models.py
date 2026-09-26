import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Satellite(Base):
    __tablename__ = "satellites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    norad_id = Column(Integer, unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    international_designator = Column(String(64), nullable=True)
    object_type = Column(String(64), nullable=False, default="PAYLOAD")
    country_owner = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    orbital_elements = relationship("OrbitalElement", back_populates="satellite", cascade="all, delete-orphan", order_by="desc(OrbitalElement.epoch)")
    orbital_states = relationship("OrbitalState", back_populates="satellite", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Satellite(norad_id={self.norad_id}, name='{self.name}')>"


class OrbitalElement(Base):
    """
    Historical and current orbital elements for a satellite.
    Never discarded to maintain orbital parameter evolution history.
    """
    __tablename__ = "orbital_elements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    satellite_id = Column(Integer, ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(64), nullable=False, default="CELESTRAK")
    format = Column(String(32), nullable=False, default="JSON_GP")
    epoch = Column(DateTime(timezone=True), nullable=False, index=True)
    tle_line1 = Column(String(128), nullable=True)
    tle_line2 = Column(String(128), nullable=True)
    mean_motion = Column(Float, nullable=False)
    eccentricity = Column(Float, nullable=False)
    inclination = Column(Float, nullable=False)
    ra_of_asc_node = Column(Float, nullable=False)
    arg_of_pericenter = Column(Float, nullable=False)
    mean_anomaly = Column(Float, nullable=False)
    bstar = Column(Float, nullable=False, default=0.0)
    fetched_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)

    satellite = relationship("Satellite", back_populates="orbital_elements")

    __table_args__ = (
        Index("ix_orbital_elements_sat_epoch", "satellite_id", "epoch"),
    )


class OrbitalState(Base):
    """
    SGP4 propagated orbital state samples.
    Clearly marked as propagated calculation, not raw spacecraft telemetry.
    """
    __tablename__ = "orbital_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    satellite_id = Column(Integer, ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    frame = Column(String(32), nullable=False, default="WGS84")
    x = Column(Float, nullable=False)  # ECEF/TEME km
    y = Column(Float, nullable=False)
    z = Column(Float, nullable=False)
    vx = Column(Float, nullable=False) # km/s
    vy = Column(Float, nullable=False)
    vz = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)   # geodetic deg
    longitude = Column(Float, nullable=False)  # geodetic deg
    altitude_km = Column(Float, nullable=False)
    speed_kms = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    satellite = relationship("Satellite", back_populates="orbital_states")

    __table_args__ = (
        Index("ix_orbital_states_sat_ts", "satellite_id", "timestamp"),
    )


class ConjunctionEvent(Base):
    """
    Screened conjunction event between a primary satellite and a secondary object.
    """
    __tablename__ = "conjunction_events"

    id = Column(String(64), primary_key=True)
    primary_satellite_id = Column(Integer, ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False, index=True)
    secondary_satellite_id = Column(Integer, ForeignKey("satellites.id", ondelete="CASCADE"), nullable=False, index=True)
    tca = Column(DateTime(timezone=True), nullable=False, index=True)
    miss_distance_km = Column(Float, nullable=False)
    relative_velocity_kms = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(32), nullable=False, index=True) # LOW, MEDIUM, HIGH, CRITICAL
    source = Column(String(64), nullable=False, default="SGP4_SCREENING")
    calculation_timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    status = Column(String(32), nullable=False, default="OPEN") # OPEN, MONITORING, RESOLVED

    # Relationships
    primary_satellite = relationship("Satellite", foreign_keys=[primary_satellite_id])
    secondary_satellite = relationship("Satellite", foreign_keys=[secondary_satellite_id])
    risk_assessments = relationship("RiskAssessment", back_populates="conjunction", cascade="all, delete-orphan")
    simulations = relationship("SimulationRun", back_populates="conjunction", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="conjunction", cascade="all, delete-orphan")


class RiskAssessment(Base):
    """
    Detailed physical and ML-derived risk scoring record.
    """
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conjunction_id = Column(String(64), ForeignKey("conjunction_events.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(32), nullable=False)
    model_version = Column(String(64), nullable=False, default="v1.0.0-rf-prototype")
    scoring_method = Column(String(64), nullable=False, default="ANALYTICAL_AND_ML")
    features_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    conjunction = relationship("ConjunctionEvent", back_populates="risk_assessments")


class SimulationRun(Base):
    """
    Hypothetical avoidance maneuver simulation run.
    """
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conjunction_id = Column(String(64), ForeignKey("conjunction_events.id", ondelete="CASCADE"), nullable=False, index=True)
    delta_v_mps = Column(Float, nullable=False)
    direction = Column(String(32), nullable=False) # PROGRADE, RETROGRADE, RADIAL, NORMAL
    lead_time_hours = Column(Float, nullable=False)
    baseline_miss_distance_km = Column(Float, nullable=False)
    simulated_miss_distance_km = Column(Float, nullable=False)
    baseline_risk_score = Column(Float, nullable=False)
    simulated_risk_score = Column(Float, nullable=False)
    risk_reduction_percent = Column(Float, nullable=False)
    simulation_method = Column(String(64), nullable=False, default="PHYSICS_INSPIRED_PROTOTYPE")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    conjunction = relationship("ConjunctionEvent", back_populates="simulations")


class Alert(Base):
    """
    Generated STM operational notification with deduplication key.
    """
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, default=lambda: f"ALT-{uuid.uuid4().hex[:8].upper()}")
    conjunction_id = Column(String(64), ForeignKey("conjunction_events.id", ondelete="CASCADE"), nullable=True, index=True)
    severity = Column(String(32), nullable=False) # HIGH, MEDIUM, INFO
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    conjunction = relationship("ConjunctionEvent", back_populates="alerts")
