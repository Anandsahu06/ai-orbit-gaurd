import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "OrbitalGuard AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    
    # Screening parameters (configurable for hackathon prototype)
    DEFAULT_SCREENING_THRESHOLD_KM: float = 25.0
    CRITICAL_RISK_THRESHOLD_KM: float = 2.0
    HIGH_RISK_THRESHOLD_KM: float = 5.0
    MEDIUM_RISK_THRESHOLD_KM: float = 12.0
    
    # Time window for conjunction screening in hours
    DEFAULT_SCREENING_WINDOW_HOURS: float = 48.0
    
    # Public TLE sources (CelesTrak)
    CELESTRAK_ACTIVE_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
    CELESTRAK_STATIONS_URL: str = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"
    
    # Demo Mode settings
    ENABLE_FALLBACK_DEMO_DATA: bool = True

settings = Settings()
