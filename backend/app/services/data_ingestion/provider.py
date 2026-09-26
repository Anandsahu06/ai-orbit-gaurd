from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Any

@dataclass
class NormalizedOrbitalRecord:
    norad_id: int
    name: str
    epoch: datetime
    mean_motion: float          # revolutions per day
    eccentricity: float         # 0 <= e < 1
    inclination: float          # degrees (0 to 180)
    ra_of_asc_node: float       # degrees (0 to 360)
    arg_of_pericenter: float    # degrees (0 to 360)
    mean_anomaly: float         # degrees (0 to 360)
    bstar: float                # drag term (1/Earth radii)
    international_designator: Optional[str] = None
    object_type: str = "PAYLOAD"
    country_owner: Optional[str] = None
    mean_motion_dot: float = 0.0
    mean_motion_ddot: float = 0.0
    tle_line1: Optional[str] = None
    tle_line2: Optional[str] = None
    source: str = "CELESTRAK"
    raw_format: str = "JSON_GP"
    fetched_at: Optional[datetime] = None

@dataclass
class ProviderHealth:
    provider_name: str
    is_healthy: bool
    status_code: int
    response_time_ms: float
    message: str

class OrbitalDataProvider(ABC):
    """
    Abstract base provider for orbital data ingestion.
    Designed for pluggable providers (CelesTrak, Space-Track, etc.).
    """

    @abstractmethod
    def fetch_group(self, group: str) -> List[NormalizedOrbitalRecord]:
        """Fetch all orbital records in a designated group."""
        pass

    @abstractmethod
    def fetch_object(self, norad_id: int) -> Optional[NormalizedOrbitalRecord]:
        """Fetch orbital elements for a single NORAD ID."""
        pass

    @abstractmethod
    def health_check(self) -> ProviderHealth:
        """Check provider connectivity and status."""
        pass
